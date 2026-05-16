# SachNetra — Cluster, Story, Entity Architecture
*Wiki / Syntheses — load this when working on V2-012 and beyond*

**Status**: Vision doc, not yet implemented. V2-012 ships cluster layer only. Threads and entity timelines are V2-013 / V2-014.
**Last updated**: 2026-05-15
**Authors**: Lijo + Claude (architecture conversation post-V2-011)

---

## Why This Doc Exists

SachNetra looks like a news aggregator. It is not (only) one. The public face is the news app; the internal face is a continuously-running **data factory** whose output feeds a quant trading system. The PostgreSQL `india_news_signals` table is the actual product. The UI is the cover.

This doc captures the data model that bridges both faces — how raw headlines become event cards for users *and* trading signals for the quant system, without duplicating work.

If you are an LLM loading this for context: read all of it. The architecture has three layers; none of them make sense in isolation.

---

## The Two Faces

| Face | Audience | Primitive | Optimization |
|---|---|---|---|
| Public news app | Indian readers | Curated event cards with timelines | Clarity, brevity, narrative |
| Internal data layer | Quant trading system | Entity-tagged evidence rows | Recall, structure, machine-readability |

Both faces are derived views on the same atomic data: the headline.

**Storage philosophy**: exhaustive. Every headline reaches PostgreSQL.
**Display philosophy**: curated. Only "important" stories surface to the UI (filtered by `selectTopStories` + market-moving logic).

This separation — store everything, show a fraction — is non-negotiable. The quant system needs the long tail; the user does not.

---

## The Four Data Primitives

Layered from atomic to abstract:

```
1. headline    →  raw news item, one row per (source, title)
2. cluster     →  same story across sources, Jaccard-grouped, lives 48h
3. thread      →  same event across days, entity-linked, lives until resolved
4. entity      →  thing the quant model trades on (company, ticker, sector, theme)
```

Each layer is a derived view of the layer below it. The cluster is the atom both UI and quant share.

### 1. Headline
- One row in `india_news_signals` per unique (`headline_hash`)
- Carries: title, source, link, publishedAt, sentiment, companies, sectors, tickers, event_type
- Atomic evidence. Never deduplicated, never merged.

### 2. Cluster
- A group of headlines about the same story, found via Jaccard similarity (≥ 0.5) over normalized title tokens
- Identified by `cluster_hash = sha256(normalize(primary_title))[:16]`
- Hash is **stable across re-runs** because it's derived from the primary title only, not from cluster membership
- 48-hour window: if `cluster_hash` already exists in PG with `scraped_at > NOW() - 48h`, skip re-enrichment
- One Groq call per *new* cluster per 10-min cycle → produces `ai_summary`, `ai_meaning`
- **What V2-012 ships.**

### 3. Thread (story_thread)
- A persistent event that lives across days. E.g. "Air India crash" = one thread, many clusters over many days
- A cluster joins an existing thread if entity overlap (≥ 2 matching companies/sectors) AND title-Jaccard ≥ 0.3 AND thread is open (`last_seen` within 7 days)
- No match → spawn a new thread
- Thread carries a *rolling* summary across all attached clusters; regenerated on every growth event
- Lifecycle: `developing` → `dormant` (no new clusters in 48h) → `resolved` (no new clusters in 7d)
- **What V2-013 ships.**

### 4. Entity
- The thing the quant model cares about: `RELIANCE`, `TATAMOTORS`, `SEBI`, `aviation`, `INDIA-PAKISTAN`
- Many entities per cluster. One entity per row in `entity_timeline`.
- Entity rows carry `thread_id` so the quant model gets narrative context alongside the signal.
- **What V2-014 ships.**

---

## The Timeline Question — Three Options Considered

The question: how do we represent "what happened with X over time"? Three options exist; we are choosing the third (combined).

### Option 1: Cluster-as-timeline (V2-012 status quo)
Each cluster is independent. Same story on Day 1 vs Day 2 vs Day 3 = three unrelated clusters.

- Cheapest, simplest
- Quant gets entity tags per cluster, can correlate via entity, but loses narrative continuity
- UI cannot show "this evolved from yesterday's story" without rebuilding it client-side
- **Not enough for the SachNetra product vision.**

### Option 2: Story-thread linking
Add `story_threads` above the cluster layer. Same event across days = one thread, many attached clusters.

- UI gets investigation-style event cards: "Air India crash" card grows hour-by-hour, day-by-day
- Quant gets thread-level features (event_count, status lifecycle, age) on top of entity signals
- Cost: one extra table + a linker (~100 lines mjs) + thread re-summarization on growth
- **The consumer face's killer feature.**

### Option 3: Entity-centric timeline
The unit is the entity, not the story. Clusters fan out into `entity_timeline` rows, one per (entity, cluster).

- Quant query is direct: "TATA news in last 6h" = `SELECT * FROM entity_timeline WHERE entity_id='TATA'`
- Loses narrative coherence — entity rows don't naturally aggregate into event cards
- High storage growth (1 cluster → N entity rows)
- **The quant face's killer feature, weak as a UI primitive on its own.**

---

## The Combined Architecture (chosen)

Both threads and entity_timeline coexist. They are orthogonal derived views on the same cluster data, linked through `thread_id`.

```
india_news_signals    ← atomic evidence
       │
       │  cluster_hash, thread_id, companies[], tickers[], sectors[]
       ▼
   ┌──────┴──────┐
   ▼             ▼
story_threads  entity_timeline
(narrative)    (signal)
       ▲             ▲
       └─── thread_id ─── (key cross-link)
```

**The killer move is the `thread_id` on `entity_timeline`.** That single FK turns raw entity signals into narrative-tagged signals: the quant model sees "TATA sentiment dropped 15% driven by 2 threads: Air India crash + Tata Power Q4 results." Either layer alone gives you half the picture.

---

## Schema (Combined)

```sql
-- Layer 1: atomic evidence (extended from V2-012)
india_news_signals (
  id              UUID PK,
  headline_hash   TEXT UNIQUE NOT NULL,
  scraped_at      TIMESTAMPTZ NOT NULL,
  published_at    TIMESTAMPTZ,
  headline        TEXT NOT NULL,
  source_name     TEXT NOT NULL,
  article_url     TEXT,
  cluster_hash    TEXT,                              -- V2-012
  thread_id       UUID REFERENCES story_threads,     -- V2-013 (add nullable in V2-012 if possible)
  feed_bucket     TEXT,                              -- V2-012: politics/economy/technology/disaster
  event_category  TEXT,                              -- classifier output
  threat_level    TEXT,
  is_market_moving BOOLEAN,
  nse_tickers     TEXT[],
  sectors         TEXT[],
  companies       TEXT[],
  sentiment_score DECIMAL(5,4),
  sentiment_label TEXT,
  sentiment_model TEXT,
  relevance_class TEXT,
  event_type      TEXT,
  entity_sentiment JSONB,
  ai_summary      TEXT,                              -- V2-012, primary row only
  ai_meaning      TEXT                               -- V2-012, primary row only
);

-- Layer 2: narrative (V2-013)
story_threads (
  thread_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_title     TEXT NOT NULL,                    -- "Air India crash"
  thread_summary   TEXT,                             -- rolling cross-cluster synthesis
  first_seen       TIMESTAMPTZ NOT NULL,
  last_seen        TIMESTAMPTZ NOT NULL,
  status           TEXT NOT NULL,                    -- developing | dormant | resolved
  event_count      INT NOT NULL DEFAULT 0,           -- # of clusters attached
  entities         JSONB,                            -- {companies:[...], tickers:[...], sectors:[...]}
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_threads_status_last_seen ON story_threads (status, last_seen DESC);

-- Layer 3: quant signal (V2-014)
entity_timeline (
  entity_id      TEXT NOT NULL,                      -- 'TATA' / 'SEBI' / 'aviation'
  entity_type    TEXT NOT NULL,                      -- company | ticker | sector | theme
  cluster_hash   TEXT NOT NULL,
  thread_id      UUID REFERENCES story_threads,      -- narrative context for the signal
  observed_at    TIMESTAMPTZ NOT NULL,
  sentiment      DECIMAL(5,4),
  source_count   INT,
  PRIMARY KEY (entity_id, cluster_hash)
);
CREATE INDEX idx_entity_observed ON entity_timeline (entity_id, observed_at DESC);
CREATE INDEX idx_entity_thread ON entity_timeline (thread_id);
```

---

## Pipeline Flow (per 10-min cron run)

```
1. Drain Vercel ✨ enrichment queue                  [existing, V2-012]
2. Fetch RSS directly from Railway                   [V2-012]
3. Cluster headlines via Jaccard                     [V2-012]
4. For each NEW cluster (not seen in 48h):
     a. Run sentiment fallback chain                 [V2-011]
     b. Call Groq for ai_summary, ai_meaning         [V2-012]
     c. Try thread-link against open threads         [V2-013]
        - If match: attach, update thread.last_seen
        - If no match: create new thread
     d. Regenerate thread_summary (across attached clusters)  [V2-013]
     e. Explode cluster → entity_timeline rows       [V2-014]
5. Persist signals + threads + timeline atomically   [all phases]
6. Write Redis digest via runSeed extraKeys          [V2-012]
```

One LLM call per new cluster, plus one per thread that grew this cycle. Threads regenerate is cheap — cap the prompt at the last 10 clusters per thread to keep token cost flat.

---

## Worked Example — Air India Crash

**Tue 10:00** — 8 sources publish breaking news
- Clustered as `cluster_hash = abc123`, primary = "Air India flight crashes near Ahmedabad"
- No existing thread matches → spawn `thread_001` "Air India crash", `status=developing`
- ai_summary written
- 8 rows in `india_news_signals`, all carrying `cluster_hash=abc123, thread_id=001`
- entity_timeline rows written: (AIR-INDIA, abc123), (TATA, abc123), (BOEING-787, abc123), (DGCA, abc123)

**Tue 14:00** — 4 sources on "Crash investigation begins"
- New cluster `xyz789`, different primary title
- Entity overlap with thread_001 (`AIR-INDIA`, `DGCA`) + loose title Jaccard match → attach
- thread.last_seen updated, event_count → 2, thread_summary regenerated
- Entity rows for xyz789 carry `thread_id=001`

**Wed 09:00** — "DGCA black box analysis"
- Cluster `def456` → entity overlap → attach to thread_001 → event_count=3

**Thu 16:00** — "Air India families demand compensation"
- Cluster `mno222` → entity overlap (TATA, AIR-INDIA) → attach to thread_001 → event_count=4

**What UI gets:**
```
┌─ Air India crash ───────────────────── developing ─┐
│ Tata-owned Air India 787 crashed near Ahmedabad,    │
│ 232 aboard. DGCA launched probe; black box recovered│
│ Families calling for accountability.                 │
│                                                      │
│ Timeline:                                            │
│  Tue 10:00  Crash confirmed (8 sources)              │
│  Tue 14:00  DGCA probe opens (4 sources)             │
│  Wed 09:00  Black box analysis (6 sources)           │
│  Thu 16:00  Family compensation demands (3 sources)  │
│                                                      │
│ Affects: TATA, Boeing, Aviation sector               │
└──────────────────────────────────────────────────────┘
```

**What quant model gets:**
```sql
SELECT entity_id, COUNT(*) events, AVG(sentiment) sentiment,
       ARRAY_AGG(DISTINCT st.thread_title) threads
FROM entity_timeline et LEFT JOIN story_threads st USING (thread_id)
WHERE entity_id = 'TATA' AND observed_at > NOW() - INTERVAL '72 hours'
GROUP BY entity_id;
```
→ `TATA | 11 | -0.42 | {"Air India crash"}`

The quant model doesn't just see "TATA negative." It sees TATA negative *because of Air India crash*. The narrative IS a feature.

---

## Why The Combined View Is The Real Product

Things only the combination unlocks:

1. **Narrative-tagged trading signals.** Entity sentiment + driving thread names = far richer feature than sentiment alone.
2. **Cross-entity impact through threads.** "When Air India crash thread is active, what's the move across TATA, Boeing, aviation ETFs?" Single thread → multi-entity correlation.
3. **Thread lifecycle as a feature.** `developing → resolved` transition itself is a signal (news cycle fading).
4. **UI gets quant breadcrumbs for free.** Event cards show "Affects: TATA, Boeing" using `story_threads.entities`. Same data, two purposes.
5. **Backtestable narratives.** Replay any trading day: which threads were active, when did they emerge, how did each entity move with each thread? This is what makes the database the asset, not just a log.

---

## Cost Reality Check

- **Storage**: ~3× current footprint. Maybe 2.5k–5k rows/day across three tables. Railway PostgreSQL handles this comfortably for years.
- **Groq calls**: 1 per new cluster + 1 per grown thread per cycle. Often cheaper than V2-012 alone, because multiple new clusters often roll into one existing thread.
- **Linker complexity**: ~100 lines mjs. The real new code in V2-013.
- **Thread re-summarization prompt**: cap at last 10 clusters per thread to keep token cost flat over a thread's lifetime.

---

## Build Sequencing

| Task | Adds | Why this order |
|---|---|---|
| **V2-012** (now) | Cluster layer, autonomous Railway pipeline | Foundation — every later layer depends on stable cluster_hash + the autonomous data flow |
| **V2-013** (next) | `story_threads` table, linker, thread summaries, event card UI | Consumer-facing killer feature; proves entity-overlap linking works before quant depends on it |
| **V2-014** | `entity_timeline` table, derived from clusters + threads | Mostly mechanical fan-out; quant layer's input is now ready |

Reasoning for 2 before 3: Option 3's value depends on reliable entity extraction *and* thread linkage. Doing threads first proves the linker; then entity_timeline is a join + insert away.

---

## The One V2-012 Decision This Affects

**Add `thread_id UUID NULL` to `india_news_signals` in V2-012's Phase 1 migration.**

Two reasons:
1. Adding a nullable column to a small-ish table is free; adding it later when the table has millions of rows requires a long migration.
2. It signals architectural intent: every headline is evidence for some thread, even if that thread doesn't exist yet.

V2-012 will leave the column NULL. V2-013 starts populating it.

---

## Open Decisions (Not Yet Locked)

These are real questions that V2-013 will need to answer. Captured here so we don't re-derive them.

1. **Thread title generation.** When spawning a new thread, where does `thread_title` come from? Options: (a) the primary title of the first cluster, (b) Groq generates a short event name from the first cluster's ai_summary, (c) entity-driven ("Tata Motors Q4 2026"). My lean: (b) for cost reasons, with (c) as fallback.

2. **Thread dormancy & resolution.** When does `developing → dormant → resolved`? Time-based (48h / 7d) is easy but dumb. Better: track *velocity* — if news volume on this thread drops 80% from peak, dormant. If no clusters in 7d AND velocity was zero last 3d, resolved.

3. **Entity normalization.** `TATA` vs `Tata Motors` vs `Tata Sons` vs `TATAMOTORS` — same conceptual entity, different surface forms. We have a registry in `shared/market-taxonomy.json`; needs to be the canonical source for `entity_id`.

4. **Thread splits & merges.** What if two threads turn out to be the same story? Or one thread bifurcates (e.g., Air India crash thread spawns a sub-thread on Boeing 787 supply-chain concerns)? V1: ignore, allow duplicates. V2: manual merge tooling. V3: automatic detection.

5. **UI digest contract.** The current `news:digest:v1:india:en` Redis shape is per-cluster. V2-013 needs a parallel `news:threads:v1:india:en` (or extension) for event cards. Decision: separate key, separate writer, same cron run.

6. **Quant API.** How does the quant system consume `entity_timeline`? Direct PostgreSQL read? A new RPC? An hourly snapshot to S3? Defer until V2-014, but think about it before locking the schema.

---

## Glossary

| Term | Meaning |
|---|---|
| Headline | One news item, one row. Atomic evidence. |
| Cluster | A group of headlines about the same story, Jaccard-similar, 48h window. Identified by `cluster_hash`. |
| Thread | A persistent event across days. One thread, many clusters. Identified by `thread_id`. |
| Entity | A tradable or trackable thing: company, ticker, sector, theme. Identified by `entity_id`. |
| feed_bucket | Source-side category from `_india-feeds.mjs`: `politics`, `economy`, `technology`, `disaster`. |
| event_category | Classifier-output category from `_classifier.mjs`: `conflict`, `disaster`, `economic`, etc. |
| Primary row | Representative headline of a cluster — gets `ai_summary`, `ai_meaning`. |
| Secondary row | Non-primary headline in a cluster — gets `cluster_hash` + `feed_bucket` only. |
| Type A enrichment | User clicked ✨ on Vercel; payload carries pre-computed sentiment. Vercel pushes to Redis queue; Railway drains. |
| Type B enrichment | (Removed in V2-012.) Headline-only payload; Railway would have called Groq. Dead code, deleted. |

---

## Related Docs

- `ai_docs/tasks/V2-012_autonomous_pipeline.md` — the task that ships the cluster layer
- `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_quant_pivot.md` — strategy / why / revenue model (Products A, B, C)
- `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_quant_roadmap.md` — execution layer / task sequencing / effort estimates
- `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_sentiment_architecture.md` — why PG + Redis are written independently
- `ai_docs/sachnetra v2/wiki/syntheses/V2_001_implementation_context.md` — engineering standards inherited from V2-001
- `ai_docs/sachnetra v2/V2_roadmap.md` — original V2 sequencing (superseded by `sachnetra_quant_roadmap.md`)
- `CLAUDE.md` — sacred files, V2 mission, allowed commands
