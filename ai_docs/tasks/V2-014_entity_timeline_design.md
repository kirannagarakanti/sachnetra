# V2-014 Entity Timeline — Design Doc
*Pre-task design. NOT the executable task file. The task file gets written when build starts; this doc captures the decisions that will go into it.*

**Status**: Design locked, awaiting V2-013 to ship first
**Created**: 2026-05-16
**Depends on**: V2-013 complete (needs `story_threads` table + `thread_id` populated)
**Estimated build time**: 5–7 hours (including back-fill script)
**Architecture reference**: `ai_docs/sachnetra v2/wiki/syntheses/cluster_story_entity_architecture.md` (Layer 4)
**Strategic reference**: `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_quant_pivot.md` (Product B + C surface)
**Roadmap position**: Block 1, step 3 of `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_quant_roadmap.md`

---

## What this doc is

- A captured-design record so a future agent (or future-you) doesn't have to re-derive decisions
- The bridge between the architecture wiki (the "what") and the eventual task file (the "how")
- Companion to `V2-013_story_threads_design.md` — both layers ship together to form the quant query surface

## What this doc is NOT

- An executable task file
- The architecture spec (lives in `cluster_story_entity_architecture.md`)
- Strategy reasoning (lives in `sachnetra_quant_pivot.md`)

---

## What V2-014 ships in one paragraph

V2-013 grouped clusters into multi-day **threads** (Air India crash, Reliance earnings, etc.). V2-014 takes the same data and **fans it out by entity** — one row per (entity, cluster) pair — into a new `entity_timeline` table. Each row carries the `thread_id` so the quant system gets *narrative-tagged trading signals*: "TATA sentiment dropped to -0.42 in the last 6 hours, driven by the Air India crash thread." This is the layer the quant trading model actually consumes. Threads are for human investigation cards; entity timeline is for machine signal queries.

---

## The 6 Locked Decisions

### Decision 1 — Entity types: **companies + sectors + themes**
Three entity types ship in V1:

| Type | Source | Examples | Count est. |
|---|---|---|---|
| `company` | `market-taxonomy.json` → `nifty50_registry` (extended over time to Nifty 500) | `RELIANCE`, `TCS`, `HDFCBANK`, `AIR-INDIA` | ~50 → ~500 |
| `sector` | `market-taxonomy.json` → `sectors` | `banking`, `aviation`, `pharma`, `auto` | ~10–15 |
| `theme` | `market-taxonomy.json` → `themes` (NEW block) | `monsoon`, `INDIA-PAKISTAN`, `crude-shock`, `RBI-policy` | ~20 hand-curated |

**Why**: Companies give per-name signals. Sectors give industry-level rotation signals. Themes give macro narrative signals. Persons and places (politicians, cities) are excluded for V1 — too noisy without normalization. Themes are tradable narratives that move multiple tickers at once; skipping them loses the most-valuable India-specific signals (monsoon → CPI → rates → banks).

**Implementation hint**: Excluded entity types include named persons (Modi, Nadella), generic places (Delhi, Mumbai), and abstract nouns (economy, market). These can still appear in `india_news_signals.companies` / `sectors` / extracted entities for other purposes — they just don't become `entity_timeline` rows.

---

### Decision 2 — Sentiment source: **per-entity JSONB with cluster-primary fallback**
The order of preference for `entity_timeline.sentiment`:
1. If `india_news_signals.entity_sentiment` (JSONB, added in V2-011) contains an entry for this `entity_id` → use it
2. Else → use the cluster's primary row `sentiment_score`

A `sentiment_source` column ('entity_jsonb' or 'cluster_primary') is stored alongside as an audit trail so the quant model can downweight the fallback values when training.

**Why**: Per-entity sentiment is more accurate when we have it (some sentences are bullish on one company and bearish on another within the same headline). But not every entity gets a per-entity sentiment from the scoring chain. Falling back to cluster-primary keeps the row populated; the `sentiment_source` column lets downstream consumers tell the difference.

**Implementation hint**: When `entity_sentiment` JSONB is `NULL` or doesn't contain the key, fall back silently. Log `sentiment_source` distribution at end of each cron run so we can monitor coverage.

---

### Decision 3 — `source_count` semantics: **entity-mention count, not cluster size**
`source_count` = number of headlines in the cluster that actually mention this specific entity. Not the total cluster size.

Example: Air India cluster has 8 headlines. 8 mention "Air India," 5 mention "Tata," 3 mention "Boeing." So:
- `(AIR-INDIA, abc123).source_count = 8`
- `(TATA, abc123).source_count = 5`
- `(BOEING, abc123).source_count = 3`

A separate `cluster_size` column stores the full cluster size (always 8 here) so a ratio is derivable.

**Why**: Truer signal. Entity-mention count is the actual evidence weight for that entity. Cluster-size context lets the quant model compute "what fraction of the story mentions this entity" (ratio of `source_count / cluster_size`), which is itself a feature.

**Implementation hint**: To compute, iterate cluster rows and case-insensitively check `headline` for the entity's aliases (from `market-taxonomy.json`). Cache per-entity regex compilation across the cron run.

---

### Decision 4 — Theme entities: **hand-curate ~20 themes in `market-taxonomy.json`**
V1 ships with a fixed list of ~20 high-value themes for India quant. Each theme is `{ name, keywords[], default_sectors[] }`. Theme extraction is keyword-based (same pattern as existing `sectors` block).

Starter theme list (curated, expandable):
- **macro**: `RBI-policy`, `inflation-shock`, `GDP-update`, `fiscal-deficit`, `monsoon`
- **geopolitical**: `INDIA-PAKISTAN`, `INDIA-CHINA`, `oil-shock`, `crude-spike`
- **regulatory**: `SEBI-action`, `RBI-action`, `GST-change`, `budget-event`
- **flows**: `FII-flow`, `DII-flow`, `IPO-cycle`
- **cross-asset**: `gold-rally`, `rupee-weakness`, `bond-yield-spike`

**Why**: Auto-extraction of themes via LLM is noisy and expensive at scale. Hand-curated themes are the lowest-risk start. ~20 themes covers the major India quant narratives. When we have 30 days of data, we'll know which themes fire most often and can extend the list (a future V2-014b refinement, not in scope).

**Implementation hint**: Themes block in `market-taxonomy.json` mirrors the `sectors` block structure. Theme extraction reuses the existing `_india-market-keywords.mjs` regex pattern.

---

### Decision 5 — Back-fill: **one-time job at deploy**
When V2-014 ships, write a `scripts/backfill-entity-timeline.mjs` that:
- Iterates `india_news_signals` in chunks of 1000 rows ordered by `scraped_at`
- For each cluster_hash, runs the fan-out logic
- Idempotent (`INSERT ... ON CONFLICT (entity_id, cluster_hash) DO NOTHING`)
- Logs progress every 10k rows
- Estimated ~30 min for current data volume

**Why**: The quant model NEEDS historical data to train. Skipping back-fill means losing 30+ days of accumulated data for no good reason. The script is cheap to write and idempotent (safe to re-run).

**Implementation hint**: Run back-fill *after* V2-013's `thread_id` back-fill (so historical entity_timeline rows carry correct `thread_id`). If V2-013 skipped its own back-fill (per its design doc, it currently leaves pre-V2-013 rows with `thread_id=NULL`), then V2-014's back-fill writes `thread_id=NULL` for those old rows too. That's fine — null thread_id means "evidence we have, narrative we don't." Still queryable.

---

### Decision 6 — Retention: **keep forever (V1)**
No retention policy in V1. All rows stay in `entity_timeline` indefinitely.

Storage math: ~500 clusters/day × ~7 entities each = ~3,500 rows/day = ~1.3M rows/year. Railway PostgreSQL handles this for 5+ years without breaking a sweat (rows are small: ~300 bytes each → ~400 MB/year).

**Why**: Historical data IS Product C (the dataset license). Throwing it away destroys revenue. Roll-up / cold storage are premature optimizations. Revisit only if storage cost becomes a real problem (it won't, for years).

**Implementation hint**: Add a `created_at TIMESTAMPTZ DEFAULT NOW()` column for forensics, but no retention cron job. When usage > 50% of Railway disk plan, revisit.

---

## Refinements (R1–R3 — all locked)

These address concrete edge cases in the naive design.

### R1 — Cluster with 0 entities: skip silently
If a cluster ends up with zero entities (rare — most clusters have at least a sector match), don't write any `entity_timeline` rows for it. The cluster is still persisted in `india_news_signals`; it's just not entity-queryable. Log a single line per cron run: `[entity-fan-out] N clusters had 0 entities (skipped)`.

### R2 — Theme sentiment uses cluster-primary (entity_sentiment JSONB never has themes)
Themes are abstract — the sentiment scoring chain doesn't produce per-theme sentiment. So for entity_type='theme' rows, sentiment ALWAYS comes from the cluster's primary `sentiment_score`. The `sentiment_source` column reads `'cluster_primary'` for all theme rows by definition.

### R3 — `source_count` regex caching across cron run
For each entity in `market-taxonomy.json`, compile its alias regex once at cron start. Reuse across all clusters in the run. Without caching, a 50-cluster cycle with 30 entities each would recompile ~1500 regexes. With caching, ~80 (one per entity).

---

## Pipeline Flow

Per 10-min cron run, V2-014 logic runs **after** V2-013 thread linking and **before** the Redis digest write:

```
INITIALIZE entity_regex_cache = new Map<entity_id, RegExp>()      # R3
SKIPPED_NO_ENTITIES = 0                                            # R1 counter

For each cluster processed in this cron run (new + grown):
  1. Load all rows from india_news_signals WHERE cluster_hash = X
     - primary_row = row with ai_summary NOT NULL (or first by scraped_at)
     - all_headlines = array of headline strings
     - cluster_size = count of rows
     - thread_id = primary_row.thread_id (may be NULL if cluster didn't link)

  2. Aggregate entities mentioned:
     - companies = UNION(all rows' companies arrays)
     - sectors   = UNION(all rows' sectors arrays)
     - themes    = scan all headlines against themes block in market-taxonomy.json

  3. If (companies + sectors + themes) is empty:
       SKIPPED_NO_ENTITIES += 1                                    # R1
       continue

  4. For each unique entity across all three types:
       a. entity_type = 'company' | 'sector' | 'theme'
       b. entity_id = canonical ID (from market-taxonomy.json registry / sectors / themes block)
       c. entity_name = human-readable name from taxonomy
       d. source_count = COUNT(headlines matching entity's alias regex)   # R3 (cached regex)
       e. sentiment:
            if entity_type='theme':                                # R2
                sentiment = primary_row.sentiment_score
                sentiment_source = 'cluster_primary'
            else if primary_row.entity_sentiment->>entity_id IS NOT NULL:
                sentiment = primary_row.entity_sentiment->>entity_id
                sentiment_source = 'entity_jsonb'
            else:
                sentiment = primary_row.sentiment_score
                sentiment_source = 'cluster_primary'
       f. observed_at = primary_row.scraped_at
       g. INSERT INTO entity_timeline (
              entity_id, entity_type, entity_name,
              cluster_hash, thread_id,
              observed_at, sentiment, sentiment_source,
              source_count, cluster_size
          ) ON CONFLICT (entity_id, cluster_hash) DO NOTHING

End cluster loop.

LOG: [entity-fan-out] N clusters → M entity rows
     | jsonb_sentiment: A | primary_fallback: B
     | skipped_no_entities: SKIPPED_NO_ENTITIES
```

---

## Schema (Locked)

```sql
CREATE TABLE entity_timeline (
  entity_id        TEXT NOT NULL,                            -- 'RELIANCE.NS' / 'banking' / 'monsoon'
  entity_type      TEXT NOT NULL,                            -- 'company' | 'sector' | 'theme'
  entity_name      TEXT NOT NULL,                            -- 'Reliance' / 'Banking' / 'Monsoon'
  cluster_hash     TEXT NOT NULL,
  thread_id        UUID REFERENCES story_threads(thread_id), -- nullable; narrative tag
  observed_at      TIMESTAMPTZ NOT NULL,
  sentiment        DECIMAL(5,4),
  sentiment_source TEXT NOT NULL,                            -- 'entity_jsonb' | 'cluster_primary'
  source_count     INT NOT NULL,                             -- headlines in cluster mentioning this entity
  cluster_size     INT NOT NULL,                             -- total headlines in cluster (for ratio)
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (entity_id, cluster_hash)
);

CREATE INDEX idx_entity_observed       ON entity_timeline (entity_id, observed_at DESC);
CREATE INDEX idx_entity_thread         ON entity_timeline (thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_entity_type_observed  ON entity_timeline (entity_type, observed_at DESC);
```

### `market-taxonomy.json` additions

Add a `themes` block alongside the existing `sectors` block:

```json
"themes": {
  "monsoon": {
    "name": "Monsoon",
    "keywords": ["monsoon", "imd", "rainfall", "deficient rainfall", "kharif", "rabi"],
    "default_sectors": ["agri", "fmcg"]
  },
  "INDIA-PAKISTAN": {
    "name": "India-Pakistan tensions",
    "keywords": ["pakistan", "islamabad", "loc", "line of control", "kashmir", "pok"],
    "default_sectors": ["defense"]
  },
  "RBI-policy": {
    "name": "RBI policy",
    "keywords": ["rbi policy", "monetary policy committee", "mpc", "repo rate", "reverse repo", "crr", "slr"],
    "default_sectors": ["banking"]
  },
  "crude-shock": {
    "name": "Crude oil shock",
    "keywords": ["brent", "wti", "opec", "crude oil", "oil price"],
    "default_sectors": ["energy"]
  },
  "SEBI-action": {
    "name": "SEBI enforcement",
    "keywords": ["sebi", "securities and exchange board", "market regulator"],
    "default_sectors": []
  },
  "FII-flow": {
    "name": "FII flows",
    "keywords": ["fii", "foreign institutional investor", "foreign portfolio investor", "fpi"],
    "default_sectors": []
  }
}
```

Starter list. ~20 total at V2-014 ship; expand based on observed coverage.

---

## Cost & Complexity Reality Check

| Item | Estimate |
|---|---|
| Storage | ~1.3M rows/year × ~300 bytes = ~400 MB/year. Trivial for Railway |
| Compute | Fan-out is pure DB + regex; no LLM calls. Adds < 1s to a 10-min cron |
| Code complexity | ~120 lines new mjs (`_entity-fan-out.mjs`) + ~80 lines back-fill script + ~30 line migration + themes block in JSON |
| Tests | Unit tests for: theme keyword matching, source_count regex, sentiment fallback cascade (R2), 0-entity cluster skip (R1) |
| Build estimate | **5–7 hours** (including ~1h for back-fill script and ~1h for tests) |

---

## What V2-014 Unlocks for Quant

The whole point of this task is queries like these become trivial:

### Query 1 — Per-entity sentiment with narrative context
```sql
SELECT
  et.entity_id,
  et.entity_name,
  COUNT(*) AS events,
  AVG(et.sentiment)::numeric(5,3) AS avg_sentiment,
  SUM(et.source_count) AS total_mentions,
  ARRAY_AGG(DISTINCT st.thread_title) FILTER (WHERE st.thread_title IS NOT NULL) AS driving_threads
FROM entity_timeline et
LEFT JOIN story_threads st USING (thread_id)
WHERE et.entity_id = 'TATAMOTORS.NS'
  AND et.observed_at > NOW() - INTERVAL '24 hours'
GROUP BY et.entity_id, et.entity_name;
```
Returns: ticker, event count, weighted sentiment, total mention volume, and which threads drove the activity.

### Query 2 — Sector rotation heatmap
```sql
SELECT
  entity_id AS sector,
  DATE_TRUNC('hour', observed_at) AS hour,
  AVG(sentiment) AS sentiment,
  COUNT(*) AS events
FROM entity_timeline
WHERE entity_type = 'sector'
  AND observed_at > NOW() - INTERVAL '7 days'
GROUP BY sector, hour
ORDER BY hour DESC, sector;
```
Hourly sentiment per sector — direct input to a sector rotation model.

### Query 3 — Theme activity dashboard
```sql
SELECT
  entity_id AS theme,
  COUNT(*) AS hits,
  AVG(sentiment) AS theme_sentiment,
  ARRAY_AGG(DISTINCT thread_id) AS related_threads
FROM entity_timeline
WHERE entity_type = 'theme'
  AND observed_at > NOW() - INTERVAL '24 hours'
GROUP BY theme
ORDER BY hits DESC;
```
"Which India macro narratives are firing today?" — direct input to a regime-detection model.

### Query 4 — Entities affected by a specific thread
```sql
SELECT DISTINCT et.entity_id, et.entity_name, et.entity_type
FROM entity_timeline et
WHERE et.thread_id = '<air-india-crash-thread>';
```
"Show me everything the Air India crash story touched" — UI breadcrumbs + cross-asset impact map for free.

---

## Open Questions for Build Time
*These don't need answers now. They get answered when the task file is written or during implementation.*

### Algorithmic
1. **Entity alias collision** — what if "Tata" alias appears in headline but the cluster's primary topic is Tata Motors specifically? The current taxonomy alias-list approach may produce false positives (assigns TATASTEEL to a Tata Motors story). Defer to a separate disambiguation task; V2-014 ships with current taxonomy behavior.
2. **Theme keyword overlap** — what if "rbi" matches both `RBI-policy` and `RBI-action` themes? Both rows get written (different entity_id). Probably fine; downstream can dedup.
3. **Multi-language entities (Hindi)** — when V2-007 ships Hindi feeds, do aliases need Hindi variants ("रिलायंस" for Reliance)? Out of scope for V2-014; revisit when V2-007 lands.
4. **Companies-as-themes ambiguity** — `RELIANCE-INDUSTRIES` and `RIL` map to the same canonical ID? Yes — taxonomy already handles via aliases. Single `entity_timeline` row per canonical ID per cluster.

### Implementation
5. **Where in cron does fan-out run?** After V2-013 thread linking completes, before Redis digest write. Same atomic block.
6. **Atomicity** — if fan-out fails partway through a cron, do we leave partial data? Use a single transaction per cluster. ON CONFLICT DO NOTHING makes re-runs safe.
7. **Back-fill ordering** — back-fill must run *after* V2-013's `thread_id` back-fill (if V2-013 added one). If V2-013 didn't back-fill, V2-014's back-fill leaves `thread_id=NULL` for pre-V2-013 rows. That's correct behavior.
8. **Back-fill chunk size** — 1000 rows per chunk. Tune up to 10k if Railway connection pool handles it.
9. **Logging shape** — extend `[rss] [cluster] [groq] [postgres] [thread]` prefixes with `[entity]`. Sample log: `[entity] 47 clusters → 312 entity rows | jsonb: 89 | primary: 223 | skipped(no-entities): 2`.

### Operational
10. **Health check** — should `health.js` flag "0 entity rows in last hour"? Lean: yes, same shape as existing seed-meta freshness checks.
11. **Index for cluster_hash lookups** — currently no index on `entity_timeline.cluster_hash` alone (PK is composite). Should we add one? Only if there's a query pattern that needs it. Defer.
12. **Materialized views for common quant queries** — e.g., a per-day-per-entity aggregate view. Premature; build only when read patterns are stable. Defer.

### Edge cases
13. **Cluster with 1 headline, 0 entities** — skipped per R1. Verify the cluster is still in `india_news_signals` (it is).
14. **Cluster where primary row sentiment is NULL** — falls back to entity_jsonb if present; if both NULL, row writes `sentiment=NULL`. Quant query should `WHERE sentiment IS NOT NULL`.
15. **Theme matched but no `default_sectors`** — fine, theme row stands alone.
16. **`entity_name` not in taxonomy** — should never happen if extraction matches taxonomy. If it does (e.g., a sector found in `sectors` array but not in canonical block), use the raw string and log a warning.

---

## Files That Will Be Touched (when the task is built)

**WRITE**:
- `scripts/migrate-india-signals.mjs` — add `entity_timeline` table + 3 indexes
- `scripts/_entity-fan-out.mjs` (NEW) — fan-out logic + regex cache (R3)
- `scripts/seed-india-signals.mjs` — wire fan-out into cron after V2-013 thread linking
- `scripts/backfill-entity-timeline.mjs` (NEW) — one-time back-fill script (chunked, idempotent)
- `shared/market-taxonomy.json` — add `themes` block with ~20 starter themes
- `scripts/_india-market-keywords.mjs` — add `extractThemes(headline)` helper

**READ ONLY**:
- `india_news_signals` table — read `entity_sentiment` JSONB, `companies`, `sectors`, `headline`, `sentiment_score`, `cluster_hash`, `thread_id`
- `story_threads` table — only via FK (no direct join in fan-out logic)
- `scripts/_clustering.mjs` — no changes needed
- `scripts/_classifier.mjs` — no changes needed

**NEVER OPEN**:
- `scripts/seed-insights.mjs` — sacred
- `src/services/clustering.ts` — SPA, separate system
- `src/config/variants/*.ts` — sacred
- `server/worldmonitor/news/v1/_classifier.ts` — TS source of truth

---

## Success Criteria (Preview — will become task-file checklist)

When V2-014 is "done":
- `entity_timeline` table exists with all 3 indexes
- `themes` block exists in `market-taxonomy.json` with ≥ 20 entries
- Running the cron writes entity_timeline rows correctly for new clusters
- A cluster with 0 entities is skipped silently and logged
- Theme rows ALWAYS have `sentiment_source = 'cluster_primary'` (R2 invariant)
- Per-cron log line shows `jsonb_sentiment` vs `cluster_primary` distribution
- Back-fill script runs cleanly on full historical data (idempotent, chunked, completes in < 1h)
- Query 1 (per-entity sentiment + driving threads) returns realistic rows after one cron cycle
- Query 4 (entities by thread) correctly returns all unique entities for a known thread
- `git diff scripts/seed-insights.mjs` is empty
- `git diff src/services/clustering.ts` is empty
- ~200 lines biome-clean mjs total; 0 typecheck errors

---

## Future Tasks This Unlocks

- **V2-016 B2B Sentiment API** — `GET /sentiment/company/HDFCBANK.NS?hours=24` becomes a single SQL query against `entity_timeline`
- **V2-008 WhatsApp Daily Brief** — top 5 entities by `source_count` today, with their driving threads
- **V2-029 Historical Dataset Packaging** — entity_timeline IS the licensable dataset for Product C
- **V2-021/022 Social signals** — `india_social_signals.thread_id` ties to story_threads; entity-level social rollup becomes a parallel entity_timeline query

---


  Soft spot A — entity_sentiment JSONB key format is undefined

  The decision says "if entity_sentiment->>entity_id IS NOT NULL → use it." But V2-011 wrote that column with some key  
  format and we never specified what it is. Is the key RELIANCE.NS? Reliance? reliance? RELIANCE? If our lookup uses the
   wrong format, we always miss → 100% fallback to cluster_primary, defeating the whole point.

  🚨 Refinement #1: Lock the contract. Audit V2-011's _sentiment-chain.mjs to see what keys it actually writes.
  Standardize on ticker form (RELIANCE.NS) for companies, lowercase singular for sectors/themes (banking, monsoon). If  
  V2-011 wrote differently, write a key-normalization step.

  Soft spot B — Entity ID collision across types

  PK is (entity_id, cluster_hash). If a future theme is entity_id = "banking-crisis" and a sector is entity_id =        
  "banking", they don't collide. But if someone adds a theme called banking later, it WILL collide with the sector row  
  for the same cluster.

  🚨 Refinement #2: Composite PK includes entity_type. Change PK from (entity_id, cluster_hash) to (entity_id,
  entity_type, cluster_hash). Two extra bytes per row; prevents an entire class of future bug.

  Soft spot C — source_count regex re-runs against headlines

  The naive approach re-runs entity regex against every headline at fan-out time. But V2-011/V2-012 already extracted   
  companies[] and sectors[] per row at insert time. Re-running regex risks drift: if extraction logic differs between   
  insert and fan-out, source_count is wrong.

  🚨 Refinement #3: Use pre-extracted columns for source_count. For each entity, source_count = COUNT(rows where entity 
  ∈ row.companies OR row.sectors). No fresh regex needed. But this requires adding themes TEXT[] to india_news_signals  
  so theme counting works the same way.

  Soft spot D — Back-fill iterates rows, not clusters

  The naive back-fill walks all rows. But fan-out is per-cluster. A cluster with 8 rows would trigger 8 redundant       
  fan-out runs (saved by ON CONFLICT, but still wasteful).

  🚨 Refinement #4: Back-fill iterates by DISTINCT cluster_hash, not by row. ~8× faster.

  Soft spot E — Old rows have NULL thread_id after deployment

  V2-014 back-fill writes entity_timeline rows for old clusters. But pre-V2-013 rows have thread_id = NULL. Old entity  
  rows can't be queried by thread context. Acceptable for V1 but worth knowing.

  ⚠️ Not a refinement — acknowledged limitation. Quant model treats NULL thread_id as "evidence without narrative."     
  Still queryable per entity.

  Soft spot F — Per-cluster N+1 query pattern

  The naive cron loads cluster rows one cluster at a time. 50 clusters = 50 SELECT queries. Trivial to batch: load all  
  rows for all clusters in one query at cron start.

  🚨 Refinement #5: Batch-load cluster rows. One query at cron start; in-memory grouping by cluster_hash. Cuts cron DB  
  latency by ~50ms.

  My recommended set to fold in

  ┌─────┬─────────────────────────────────────┬───────────────────────┬─────────────────────────────────────────────┐   
  │  #  │             Refinement              │         Cost          │                     Why                     │   
  ├─────┼─────────────────────────────────────┼───────────────────────┼─────────────────────────────────────────────┤   
  │     │                                     │ ~15 min audit + maybe │ Without this, sentiment fallback is the     │   
  │ R1  │ Lock entity_sentiment key format    │  a normalization      │ only path used. The whole "use per-entity   │   
  │     │                                     │ helper                │ sentiment when available" decision is dead  │   
  ├─────┼─────────────────────────────────────┼───────────────────────┼─────────────────────────────────────────────┤   
  │ R2  │ Composite PK with entity_type       │ 1-line schema change  │ Future-proof; prevents type-collision bugs  │   
  │     │                                     │                       │ that would be painful to debug later        │   
  ├─────┼─────────────────────────────────────┼───────────────────────┼─────────────────────────────────────────────┤   
  │     │ Use pre-extracted columns for       │ ~30 min, requires     │ Eliminates drift; faster; means themes are  │   
  │ R3  │ source_count + add themes TEXT[] to │ V2-012 schema patch   │ queryable directly without joining          │   
  │     │  india_news_signals                 │                       │ entity_timeline                             │   
  ├─────┼─────────────────────────────────────┼───────────────────────┼─────────────────────────────────────────────┤   
  │ R4  │ Back-fill iterates DISTINCT         │ 5-line change         │ Free perf win                               │   
  │     │ cluster_hash                        │                       │                                             │   
  ├─────┼─────────────────────────────────────┼───────────────────────┼─────────────────────────────────────────────┤   
  │ R5  │ Batch-load cluster rows in one      │ ~10 lines             │ Free perf win                               │   
  │     │ query                               │                       │                                             │   
  └─────┴─────────────────────────────────────┴───────────────────────┴─────────────────────────────────────────────┘   

  All five total maybe ~1.5 hours of build effort. All improve correctness or perf without changing the core design.    

  Want all 5 folded in, or a subset? My lean: all 5.

## Linked Docs

- `[[cluster_story_entity_architecture]]` — architecture (Layer 4 is this task)
- `[[sachnetra_quant_pivot]]` — strategy (Product B + C surface)
- `[[sachnetra_quant_roadmap]]` — sequencing (Block 1, step 3)
- `ai_docs/tasks/V2-013_story_threads_design.md` — companion design doc (Layer 3, ships first)
- `ai_docs/tasks/V2-012_autonomous_pipeline.md` — foundation task (Layer 2)
