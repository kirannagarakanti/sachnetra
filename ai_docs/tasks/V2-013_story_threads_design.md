# V2-013 Story Threads — Design Doc
*Pre-task design. NOT the executable task file. The task file gets written when build starts; this doc captures the decisions that will go into it.*

**Status**: Design locked, awaiting build
**Created**: 2026-05-16
**Depends on**: V2-012 complete
**Estimated build time**: 8–12 hours
**Architecture reference**: `ai_docs/sachnetra v2/wiki/syntheses/cluster_story_entity_architecture.md` (Layer 3)
**Strategic reference**: `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_quant_pivot.md` (Product B feature)
**Roadmap position**: Block 1, step 2 of `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_quant_roadmap.md`

---

## What this doc is

- A captured-design record so a future agent (or future-you) doesn't have to re-derive decisions
- The bridge between the architecture wiki (the "what") and the eventual task file (the "how")
- A parking lot for implementation questions that don't need answers now but will at build time

## What this doc is NOT

- An executable task file. There's no Phase 1, 2, 3 here yet — those get written when the build kicks off
- The architecture spec. Schema rationale lives in `cluster_story_entity_architecture.md`
- The strategy reasoning. Revenue + B2B context lives in `sachnetra_quant_pivot.md`

---

## What V2-013 ships in one paragraph

Adds a layer **above** the cluster: `story_threads`. When a new cluster appears, the system checks whether it belongs to an existing open story thread (entity overlap + loose title match + recent). If yes, attach. If no, spawn a new thread. Each thread carries a rolling AI summary that updates as the thread grows. UI gets investigation-style event cards: "Air India crash" lives as one card that grows over days with a timeline inside.

---

## The 6 Locked Decisions

### Decision 1 — Thread title generation: **Groq short name (with cascading fallback)**
When a new thread spawns, call Groq once with the primary cluster's title and ask for a short event name.

**Why**: Headlines are long ("Air India flight 178 crashes near Ahmedabad airport killing 232 on board"). The thread card needs a clean title ("Air India crash"). The AI cost is tiny — one extra call per *new* thread, not per cluster.

**Implementation hint**: Prompt should constrain to ≤6 words, no punctuation, present tense. Cache the result; never re-generate the title.

**Fallback chain (R5)** — on Groq failure, never truncate a long headline. Cascade:
1. Groq short name (preferred)
2. `${top_company.name} ${event_type}` → `"Air India disaster"` / `"Reliance earnings"` / `"SEBI regulation"`
3. `${top_company.name}` alone → `"Air India"`
4. `${event_type} event` → `"disaster event"` (last resort)

Never store a raw 80-char headline truncation as `thread_title`. UI quality matters.

---

### Decision 2 — Dormancy / resolution: **Time-based clock**
- `developing` → `dormant`: no new clusters attached for **48 hours**
- `dormant` → `resolved`: no new clusters attached for **7 days**
- `dormant` → `developing`: any new cluster attached → flip back

**Why**: Simple to implement, predictable. Velocity-based detection is smarter but premature; we have zero data on how Indian news stories actually decay. Revisit after 30 days of production data.

**Implementation hint**: Status transitions happen during the 10-min cron run, not in a separate scheduler. Check every open thread's `last_seen` against `NOW()`.

---

### Decision 3 — UI digest contract: **Separate Redis key**
Write threads to a new key: `news:threads:v1:india:en`. Existing `news:digest:v1:india:en` (the cluster digest) is unchanged.

**Why**: Failures stay isolated. If thread-writing breaks, the existing news cards keep working. Easier rollback. Frontend can adopt thread cards incrementally without touching the existing news rendering path.

**Implementation hint**: Use the same `runSeed` `extraKeys` pattern V2-012 introduced. The cron writes 3 keys per run: canonical signals, news digest, threads digest.

---

### Decision 4 — Re-summarization throttle: **At most once per hour AND once per cron run per thread**
When a thread grows, regenerate `thread_summary` only if BOTH conditions hold:
- `last_summary_at` is more than 1 hour old (the hourly throttle), AND
- The thread has not already been re-summarized in this cron cycle (the per-cycle batching from R6)

**Why**: Cost cap on two axes. Air India-style thread might grow 12 times in 6 hours — re-summarizing each time is wasteful (the hour throttle handles this). And if 3 separate clusters attach to the same thread in a *single* 10-min cycle, only one Groq call should fire that cycle (the R6 batching handles this).

**Implementation hint**: Add `last_summary_at TIMESTAMPTZ` column to `story_threads`. Re-summary prompt should include only the **last 10 clusters** attached to the thread to keep token cost flat. Implement R6 by collecting "threads that grew this run" into a Set, then walking it once at the end of the cycle for re-summary calls.

---

### Decision 5 — Entity normalization: **Rich object form**
`story_threads.entities` JSONB stores objects, not strings:
```json
{
  "companies": [
    { "ticker": "RELIANCE.NS", "name": "Reliance", "sectors": ["energy"] }
  ],
  "sectors": ["aviation", "auto"],
  "tickers": ["TATAMOTORS.NS"]
}
```

**Why**: Trading systems need tickers; UI needs human names; analytics needs sectors. Storing all three at ingest cost (~30 extra bytes per row) is free; deriving them later isn't.

**Implementation hint**: Canonical IDs come from `shared/market-taxonomy.json` `nifty50_registry`. Anything outside the registry stores `{ ticker: null, name: "...", sectors: [...] }`.

---

### Decision 6 — Splits & merges: **Defer entirely**
V1 of V2-013 ships with no fix-it tools. Live with whatever mistakes the linker makes. Track them passively but don't build the merge admin.

**Why**: Don't build for hypothetical problems. We don't yet know how often the linker will misfire. After 30 days, look at the data; if it's > 5% wrong, build the admin tool. Probably less.

**Implementation hint**: Add `created_by TEXT DEFAULT 'auto'` column to `story_threads` so we can later distinguish auto-spawned from manually-merged.

---

## Linker Refinements (R1–R6 — all locked)

These refinements address concrete failure modes in the naive design. All six are folded into the algorithm below.

### R1 — Title-bag Jaccard (not thread-title Jaccard)
**Problem**: Naive design computes Jaccard between the new cluster's primary title and `thread_title`. But `thread_title` is the short Groq-generated name (3 tokens like `"air india crash"`). As the thread grows with more diverse cluster titles, new clusters fail to match because the denominator (union) grows while the intersection stays capped at 2–3 tokens. **Threading gets worse as the thread gets older.**

**Fix**: Compute Jaccard between the new cluster's primary title tokens and the **union of all primary cluster titles attached to the thread** (or the last 10 if the thread is huge). The thread's "title memory" accumulates, so matching power *grows* with the thread.

**Implementation**: SELECT primary_title from india_news_signals WHERE thread_id=X ORDER BY scraped_at DESC LIMIT 10. Tokenize + union. Cache in memory per cron run.

### R2 — Event-type guard
**Problem**: A cluster about `"Air India announces Q4 profit"` (event_type=`earnings`) can falsely match the `"Air India crash"` thread (event_type=`disaster`) because the entity overlap and title Jaccard both pass. Same entity, different event = different thread.

**Fix**: Before computing overlap and Jaccard, check `cluster.event_type` against `thread.dominant_event_type`. If they differ, skip the candidate entirely. This requires storing `dominant_event_type` on `story_threads` (recomputed when the thread grows).

**Implementation**: Add `dominant_event_type TEXT` column. When attaching: recompute as the mode (most-common) `event_type` across all attached clusters' primary rows.

### R3 — Tie-break by overlap count (not last_seen)
**Problem**: When 2+ threads match, picking by `last_seen` picks the most *recent* — which can be the wrong thread topically. Better signal: the thread with the *most* entity overlap is the better match.

**Fix**: Sort matching candidates by `weighted_overlap DESC, jaccard DESC, last_seen DESC`. Pick first.

**Implementation**: ~3 lines of sort logic in the linker.

### R4 — Common-entity de-weighting
**Problem**: Some entities appear in nearly every story (`India`, `Modi`, `Delhi`, `Mumbai`). Overlap=2 on `{India, aviation}` is meaningless — almost every Indian news story has both. The linker would falsely link unrelated stories.

**Fix**: Maintain a `common_entities` stop-list. Entities on the list do not count toward the overlap threshold. The threshold (≥ 2) applies only to *meaningful* entities.

**Implementation**: Add `common_entities: ["india", "modi", "delhi", "mumbai", "government", "minister"]` to `shared/market-taxonomy.json`. Linker filters these before computing overlap. Easy to extend.

### R5 — Smarter Groq title fallback
**Problem**: On Groq failure, naive fallback is "truncate the headline to 80 chars" → `"Air India flight 178 crashes near Ahmedabad airport killing 232 on bo"`. Bad UI.

**Fix**: Cascade through entity-derived names (see Decision 1 fallback chain).

**Implementation**: Try Groq → `top_company + event_type` → `top_company` alone → `event_type event`. Never store truncated headlines.

### R6 — One re-summary call per thread per cron run
**Problem**: If 3 clusters attach to the same thread within a single 10-min cron cycle, the naive algorithm fires 3 Groq summary calls (each cluster's attach event sees `last_summary_at` >1h old at the moment of check).

**Fix**: Defer re-summary calls to the *end* of the cron run. Collect "threads that grew this run" into a Set. Walk the Set once. Each thread → at most one Groq call this cycle.

**Implementation**: In `fetchSignals()`, maintain `const grownThreads = new Set<string>()`. After all clusters are processed and persisted, iterate `grownThreads`, check the 1h throttle on each, fire one Groq call max per thread.

---

## How V2-013 Will Work — Pipeline Flow (with R1–R6 applied)

Per 10-min cron run, after V2-012's clusters are formed:

```
INITIALIZE grownThreads = new Set<thread_id>()                          # R6

For each NEW cluster (not seen in 48h):
  1. Compute cluster's entity set + tokenize primary title + read event_type

  2. Filter out common entities from cluster.entities                   # R4
     → weighted_entities = cluster.entities \ COMMON_ENTITIES

  3. Query open story_threads where:
        - status IN ('developing', 'dormant')
        - last_seen > NOW() - INTERVAL '7 days'

  4. For each candidate thread:
        a. if cluster.event_type ≠ thread.dominant_event_type           # R2
           AND cluster.event_type IS NOT NULL
           → skip this candidate
        b. weighted_overlap = | weighted_entities ∩ thread.entities |   # R4
        c. title_bag = tokenize(union of last 10 cluster titles
                                attached to this thread)                # R1
        d. jaccard = jaccard(cluster.title_tokens, title_bag)
        e. if weighted_overlap >= 2 AND jaccard >= 0.3 → candidate

  5. If multiple candidates → sort by:                                  # R3
        weighted_overlap DESC, jaccard DESC, last_seen DESC
     → pick first

  6. If 1+ match → attach cluster to thread:
        - UPDATE india_news_signals SET thread_id=X
          WHERE cluster_hash = this_cluster
        - UPDATE story_threads
          SET last_seen = NOW(),
              event_count = event_count + 1,
              dominant_event_type = recompute_mode(...)                 # R2
        - If status was 'dormant' → flip to 'developing'
        - grownThreads.add(thread_id)                                   # R6 (defer)

  7. If no match → spawn new thread:
        - title = try Groq → entity+event_type → entity → event_type    # R5
        - INSERT story_threads (
              first_seen=now, last_seen=now,
              status='developing', event_count=1,
              dominant_event_type = cluster.event_type,
              entities = cluster.entities (rich object form),
              thread_title = title,
              last_summary_at = NOW()
          )
        - UPDATE india_news_signals SET thread_id=newId
          WHERE cluster_hash = this_cluster
        - Generate initial thread_summary (1 Groq call)

END cluster loop.

# Status sweep (cheap, every cycle)
UPDATE story_threads SET status='dormant'
  WHERE status='developing' AND last_seen < NOW() - INTERVAL '48 hours';
UPDATE story_threads SET status='resolved'
  WHERE status='dormant'    AND last_seen < NOW() - INTERVAL '7 days';

# Batched re-summarization                                              # R6
For each thread_id IN grownThreads:
  - SELECT last_summary_at FROM story_threads WHERE thread_id=X
  - if NOW() - last_summary_at < 1 hour → skip
  - else:
       - Groq call with last 10 clusters of this thread → new summary
       - UPDATE story_threads SET thread_summary=new, last_summary_at=NOW()
       - At most ONE Groq call per thread this cycle

# Redis write
SELECT story_threads WHERE status='developing' OR last_seen > NOW() - 48h
Build JSON: { threads: [...], generatedAt: ISO }
runSeed extraKeys writes to news:threads:v1:india:en
```

---

## Schema (Locked)

```sql
CREATE TABLE story_threads (
  thread_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_title         TEXT NOT NULL,                      -- "Air India crash" (Decision 1, R5 fallback)
  thread_summary       TEXT,                               -- rolling cross-cluster synthesis
  first_seen           TIMESTAMPTZ NOT NULL,
  last_seen            TIMESTAMPTZ NOT NULL,
  last_summary_at      TIMESTAMPTZ,                        -- throttle (Decision 4 + R6)
  status               TEXT NOT NULL,                      -- 'developing' | 'dormant' | 'resolved'
  event_count          INT NOT NULL DEFAULT 0,
  dominant_event_type  TEXT,                               -- R2: mode(event_type) across attached clusters
  entities             JSONB,                              -- rich object (Decision 5)
  created_by           TEXT NOT NULL DEFAULT 'auto',       -- 'auto' or 'manual' (Decision 6)
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_threads_status_last_seen ON story_threads (status, last_seen DESC);
CREATE INDEX idx_threads_last_seen        ON story_threads (last_seen DESC);
CREATE INDEX idx_threads_event_type       ON story_threads (dominant_event_type, status);  -- R2

-- V2-012 already added india_news_signals.thread_id UUID NULL — V2-013 just populates it.
-- Promote to FK now that story_threads exists:
ALTER TABLE india_news_signals
  ADD CONSTRAINT fk_signals_thread
  FOREIGN KEY (thread_id) REFERENCES story_threads(thread_id);
```

**Common-entities stop-list (R4)** — add to `shared/market-taxonomy.json`:
```json
{
  "common_entities": [
    "india", "modi", "delhi", "mumbai", "bengaluru", "chennai", "kolkata",
    "government", "minister", "parliament", "lok sabha", "rajya sabha"
  ]
}
```
These entity tokens are filtered out before the overlap threshold check. They can still appear in extracted `entities` on individual rows — they just don't *count* toward the linker's overlap=2 threshold.

---

## Redis Digest Shape (`news:threads:v1:india:en`)

```json
{
  "threads": [
    {
      "thread_id": "8f3e...",
      "thread_title": "Air India crash",
      "thread_summary": "Tata-owned Air India 787 crashed near Ahmedabad...",
      "status": "developing",
      "first_seen": "2026-05-14T10:00:00.000Z",
      "last_seen": "2026-05-16T16:00:00.000Z",
      "event_count": 4,
      "entities": {
        "companies": [
          { "ticker": "TATAMOTORS.NS", "name": "Tata Motors", "sectors": ["auto"] }
        ],
        "sectors": ["aviation"],
        "tickers": ["TATAMOTORS.NS"]
      },
      "timeline": [
        { "scraped_at": "2026-05-14T10:00:00.000Z", "primary_title": "...", "source_count": 8 },
        { "scraped_at": "2026-05-14T14:00:00.000Z", "primary_title": "DGCA probe opens", "source_count": 4 },
        { "scraped_at": "2026-05-15T09:00:00.000Z", "primary_title": "Black box recovered", "source_count": 6 },
        { "scraped_at": "2026-05-16T16:00:00.000Z", "primary_title": "Families demand compensation", "source_count": 3 }
      ]
    }
  ],
  "generatedAt": "2026-05-16T16:10:00.000Z"
}
```

`timeline` is derived from joining `india_news_signals` (where `thread_id = X`) → group by `cluster_hash`, ordered by `scraped_at`.

---

## Cost & Complexity Reality Check

| Item | Estimate |
|---|---|
| Storage | ~50–100 active threads at any time. Negligible |
| Groq calls per cycle | 1 per new thread + at most 1 per grown thread per cycle (R6). Often *cheaper* than V2-012 since multiple clusters fold into one thread |
| Code complexity | ~200 lines new mjs (linker + status sweep + digest write + R1–R6 logic). ~30 line migration. +1 stop-list block in `market-taxonomy.json` |
| New tests | Linker logic — needs unit tests with fixture clusters covering: R1 title-bag growth, R2 event-type guard, R3 multi-match tie-break, R4 common-entity filter, R5 Groq fallback cascade, R6 single-call-per-cycle |
| Total build estimate | **10–14 hours** (up from 8–12; R1–R6 add ~2–3 hours) |

---

## Open Questions for Build Time
*These don't need answers now. They get answered when the task file is written or during implementation.*

### Algorithmic
1. **Entity overlap threshold** — locked at `>= 2`, but is that 2 from any entity bucket (companies + sectors + tickers all count) or 2 from the same bucket? Lean: any bucket counts. *After R4, "2" refers to non-common entities.*
2. **Title Jaccard tokenizer** — should use the same tokenizer as `_clustering.mjs` (with STOP_WORDS) to be consistent. R1 changes *what* gets tokenized (title-bag, not thread_title) but not *how*.
3. ~~**Multi-match tie-breaker**~~ — **RESOLVED by R3**: `weighted_overlap DESC, jaccard DESC, last_seen DESC, thread_id ASC` (final deterministic fallback).
4. **0-entity clusters** — what if a cluster has no extracted entities at all (rare)? Probably can't reach overlap=2 → always spawn new thread (with `dominant_event_type=NULL`). Lean: spawn new; track in logs for review.
5. **Cross-language matching** — if Hindi headlines arrive (V2-007), does the Jaccard tokenizer work? Probably needs language-aware normalization later. Out of scope for V2-013.
6. **Common-entities list growth (R4)** — start with the 12 entries proposed. Should we auto-derive more from frequency stats over 30 days? Lean: yes, V2-013b refinement.
7. **`dominant_event_type` recomputation (R2)** — when a thread has 50 attached clusters, recomputing the mode on every grow is fine performance-wise (it's just a GROUP BY on `thread_id`). But what about ties? Lean: alphabetical tie-break.

### Implementation
6. **Where in the cron does thread-linking happen?** Probably after `skipKnownClusters()` but before `persistSignals()`. Need to verify the V2-012 order.
7. **Back-fill for pre-V2-013 rows** — old `india_news_signals` rows have `thread_id = NULL`. Do we run a one-time back-fill job (try to attach old clusters to threads we'd create today)? Or leave them NULL forever? Lean: leave NULL. The data layer treats pre-V2-013 rows as "history we can't thread."
8. **Race conditions** — two parallel cron runs (shouldn't happen due to lock, but) both want to create the same thread? Use the existing `acquireLock` from `_seed-utils.mjs`.
9. **Re-summarization prompt cap** — "last 10 clusters per thread" was specified. What if a thread has fewer? Just use all of them. What about thread with 100+? Sample last 10 by `scraped_at DESC`.
10. ~~**What if Groq fails on a new thread spawn?**~~ — **RESOLVED by R5**: cascade Groq → entity+event_type → entity → event_type. Never store truncated headlines. No retry pass needed.

### UI / consumption
11. **Frontend backward compat** — current frontend reads `news:digest:v1:india:en`. Threads is a *new* key. Does the SachNetra frontend need to be updated in the same task, or shipped separately? Lean: V2-013 ships the data; UI work is V2-013b (small task).
12. **Thread card sorting in UI** — by `last_seen DESC`? By `event_count DESC`? By a score? Defer to UI task.
13. **Timeline truncation** — if a thread has 50 attached clusters, do we show all 50 in `timeline` or last N? Lean: cap at last 20 in the Redis payload; full list available via DB.

### Edge cases
14. **Thread that never grows past 1 cluster** — should we even consider this a "thread"? It's just a cluster wearing a name. Probably fine — many real news events are one-off.
15. **`last_summary_at` for a brand-new thread** — should we set it to `created_at`? Or `NULL`? Lean: set to `created_at`.
16. **What happens to `thread_id` on a manually-merged cluster?** N/A in V1 (Decision 6). When V2 admin tool ships, merging two threads → migrate child `india_news_signals.thread_id` from A to B, DELETE thread A.

### Operational
17. **Logging shape** — extend V2-012's `[rss] [cluster] [groq] [postgres]` log prefixes with `[thread]`. Log on every match, every spawn, every status transition.
18. **Health metric** — should we add a `health.js` check that flags "no new threads in 24h"? Lean: yes, similar to existing seed-meta freshness.
19. **Sacred file check** — confirm `git diff scripts/seed-insights.mjs` empty after V2-013. The clustering refactor from V2-012 already shows the pattern.

---

## Files That Will Be Touched (when the task is built)

**WRITE**:
- `scripts/migrate-india-signals.mjs` — add `story_threads` table DDL + FK constraint
- `scripts/_thread-linker.mjs` (NEW) — entity overlap + Jaccard + tie-break logic
- `scripts/seed-india-signals.mjs` — wire thread-linking into the cron sequence
- `scripts/_seed-utils.mjs` — possibly add helpers if Redis write pattern needs extension

**READ ONLY**:
- `scripts/_clustering.mjs` — to reuse its tokenizer for title Jaccard
- `scripts/_classifier.mjs` — entity tag conventions
- `shared/market-taxonomy.json` — canonical entity registry
- `ai_docs/sachnetra v2/wiki/syntheses/cluster_story_entity_architecture.md` — design source of truth

**NEVER OPEN**:
- `scripts/seed-insights.mjs` — sacred
- `src/services/clustering.ts` — SPA, separate system
- `src/config/variants/*.ts` — sacred
- `server/worldmonitor/news/v1/_classifier.ts` — TS source of truth

---

## Success Criteria (Preview — will become task-file checklist)

When V2-013 is "done":
- `story_threads` table exists, indexed, FK to `india_news_signals`
- Running the cron twice in a row on the same RSS state: second run attaches no new clusters but updates `last_seen` correctly
- Spawning a new thread succeeds even when Groq title-generation fails (falls back to truncated headline)
- After one cron run, `news:threads:v1:india:en` exists in Redis with valid JSON
- Status sweep correctly flips `developing → dormant` at 48h with no new clusters
- `git diff scripts/seed-insights.mjs` is empty
- ~100 lines of biome-clean mjs added; 0 typecheck errors
- One realistic worked example tested end-to-end: Air India crash fixture (3 days of fixture clusters) → 1 thread with 4 timeline entries

---

## Future Tasks This Unlocks

- **V2-014 Entity Timeline** — fan out `india_news_signals` → `entity_timeline` rows, each carrying `thread_id` (narrative tag for the quant signal)
- **V2-013b UI Event Cards** — frontend reads `news:threads:v1:india:en` and renders investigation-style cards
- **V2-016 B2B Sentiment API** — `/threads/active?since=X` endpoint becomes viable
- **V2-008 WhatsApp Daily Brief** — uses `thread_summary` for top 5 active threads of the day

---

## Linked Docs

- `[[cluster_story_entity_architecture]]` — architecture (Layer 3 is this task)
- `[[sachnetra_quant_pivot]]` — strategy (Product B feature)
- `[[sachnetra_quant_roadmap]]` — sequencing (Block 1, step 2)
- `ai_docs/tasks/V2-012_autonomous_pipeline.md` — the prior task this builds on
