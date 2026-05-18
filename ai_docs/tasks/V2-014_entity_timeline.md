# Task V2-014 — Entity Timeline
*SachNetra V2 — Layer 4 of the cluster→thread→entity data model*

**Depends on**: V2-013 complete ✅ (`story_threads` table live; `_thread-linker.mjs` wired into `fetchSignals()`)
**Estimated time**: 5–7 hours (incl. back-fill script + unit tests)
**Design doc**: `ai_docs/tasks/V2-014_entity_timeline_design.md` (6 decisions + R1–R3 design refinements)
**Architecture reference**: `ai_docs/sachnetra v2/wiki/syntheses/cluster_story_entity_architecture.md` (Layer 4)
**Roadmap position**: Block 1, step 3 of `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_quant_roadmap.md`
**V1 or V2**: V2

---

## ⚠️ Read First — Locked Refinement Decisions (override the design doc on conflict)

The design doc lists 5 soft-spot refinements. All folded, but **R1 and R3 are
materially different from the design doc** after a codebase audit. These overrides
are the source of truth wherever they conflict with `V2-014_entity_timeline_design.md`.

### SR1 — Per-entity sentiment is dead today → fallback-only, documented
`india_news_signals.entity_sentiment JSONB` exists **only** in
`migrate-india-signals.mjs:31` DDL. **Nothing in the codebase ever writes it** —
verified: zero writes in `seed-india-signals.mjs`, `_sentiment-chain.mjs`, or anywhere
outside `ai_docs/`. V2-011 added the column but never wired population.

→ The design doc's "audit V2-011 key format / Refinement #1" is **void** — there are no
keys because there is no writer. Decision 2's per-entity branch is dead until a future
task populates the column.

**What this task does**: keep the **correct fallback cascade code** (check
`entity_sentiment->>key` → else cluster-primary `sentiment_score`) so the path is
future-proof, but **state plainly** that `sentiment_source` will be **100 %
`'cluster_primary'`** until that future task lands. Add a per-cron log of the
`sentiment_source` distribution so coverage becomes visible the moment population
ships. **Do not** build entity_sentiment population in this task (out of scope).

### SR2 — Composite primary key includes `entity_type`
PK is **`(entity_id, entity_type, cluster_hash)`** — in the schema **and** every
`ON CONFLICT` clause (fan-out + back-fill). Prevents the future theme/sector
`entity_id` collision (design soft-spot B).

### SR3 — source_count: columns for company/sector, cached regex for theme only
- **company / sector** `source_count` = read from the **pre-extracted persisted
  columns** (`nse_tickers` / `sectors`). **No fresh regex** for these — drift guard,
  same lesson as V2-013 D2.
- **theme** has no pre-extracted column and was never extracted before, so there is
  nothing to drift *from*. Theme `source_count` = keyword-regex over the cluster's
  headlines, **regex compiled once per theme at cron start and cached** (design R3).
- **Do NOT** add `themes TEXT[]` to `india_news_signals`. **Do NOT** modify the
  V2-012/V2-013 Tier 1 capture/persist path (`buildCaptureRow`/`persistSignals`).
  Accepted trade-off: themes are not directly queryable on `india_news_signals` —
  only via `entity_timeline`.

### SR4 — Back-fill iterates `DISTINCT cluster_hash`, not rows (design R4)
### SR5 — Fan-out batch-loads all run clusters in one query, in-memory group by `cluster_hash` (design R5)

### Other scope locks
- **Themes scope**: ship **only the 6 starter themes** (`monsoon`, `INDIA-PAKISTAN`,
  `RBI-policy`, `crude-shock`, `SEBI-action`, `FII-flow`). Expandable later from data.
- **RSS description enrichment**: **out of scope entirely.** Headline-only data. Note
  as a deferred separate task; do not touch the RSS/feed path.
- **Back-fill**: back-fill **all** `india_news_signals` history (Product C rationale).
  Pre-V2-013 rows keep `thread_id = NULL` (design soft-spot E — acceptable, queryable).
- **Prod-execution boundary**: agent writes code + read-only self-checks only. **Lijo
  runs migration / seed / back-fill against prod after review.**

---

## Context Manifest
*Read these BEFORE any code work. Skip the "Don't load" list to save tokens.*

### Load (in order)
1. `CLAUDE.md` — auto-loaded; Sacred Files list
2. `.agents/rules/sachnetra-boundaries.md` — sacred files; note §3 V2 scope list is stale vs the quant track (V2-012/013 precedent — non-blocking)
3. `.agents/rules/sachnetra-patterns.md` — `runSeed()` shape, Railway cron contract
4. `ai_docs/tasks/V2-014_entity_timeline_design.md` — 6 decisions + design R1–R3 (behavior source of truth, **except SR1/SR3 above**)
5. `ai_docs/tasks/V2-013_story_threads.md` — companion layer; D2 entity-aggregation lesson, `_thread-linker.mjs` integration shape
6. **Code files** — see "Files To Open Before Starting"

### Don't load (not relevant — skip to keep context tight)
- `ai_docs/prep/*`, all `tasks/00*_*.md` — V1, archived
- `wiki/concepts/*`, `wiki/playbooks/*` — domain knowledge, not pipeline engineering
- `ai_docs/dev_templates/*` — task already generated
- RSS/feed code (`server/.../_feeds.ts`, `shared/rss-allowed-domains.json`) — RSS enrichment is out of scope

### Skill / template lineage
- Generated by: `/task` (`ai_docs/dev_templates/adapt_sprint_task.md`)
- Bugfix during execution: `/bugfix`
- Commit at end: `/git`

---

## Context — Current State

V2-013 ships: every 10-min cron, `fetchSignals()` does RSS → dedup → cluster → **Tier 1
capture** → **Tier 2 enrich** → **thread linking** (`_thread-linker.mjs`) → `buildDigest()`
→ `runSeed` publishes canonical + digest + threads Redis keys.

**Files in their current state:**
- `scripts/seed-india-signals.mjs` — `fetchSignals()` thread-linking block at lines
  586–616; `buildDigest()` at 618; `runSeed` `extraKeys` (digest + threads) at 646–649.
  `buildCaptureRow()` (325) builds `nse_tickers = companies.map(c=>c.ticker)`,
  `companies = companies.map(c=>c.name)`, `sectors` (lowercase keys) — **parallel arrays,
  same index**. `pgPool()` helper exists.
- `scripts/_thread-linker.mjs` — model for the new `_entity-fan-out.mjs` (Groq helper,
  D2 column aggregation, `[thread]`-prefixed logs). Fan-out needs **no Groq**.
- `scripts/_thread-linker.test.mjs` — model for the new test file (`node --test`,
  `node:test`, SQL-pattern mock pool).
- `scripts/migrate-india-signals.mjs` — single `DDL` string; `story_threads` +
  `fk_signals_thread` guard end at line 81. C1 idempotent pattern (`IF NOT EXISTS`).
- `scripts/_india-market-keywords.mjs` — `extractSectors()` (30) is the keyword-regex
  pattern to mirror for theme matching. **READ ONLY** (do not call from fan-out for
  company/sector counts — SR3/D2).
- `shared/market-taxonomy.json` — keys: `market_keywords`, `nifty50_registry` (47,
  `{aliases:[...], ticker}`), `sectors` (`{key: [keywords]}`), `event_types`,
  `systemic_keywords`, `common_entities`. **No `themes` block.**
- `india_news_signals.entity_sentiment JSONB` — exists in DDL only; **never written**
  anywhere (SR1).

No `entity_timeline` table exists. No back-fill script exists.

---

## What This Task Does

- Adds `entity_timeline` table (composite PK per SR2) + 3 indexes to
  `migrate-india-signals.mjs` (append to `DDL`, C1 idempotent; inline FK to
  `story_threads` — new table, no guarded `DO $$` needed)
- Adds a `themes` block (6 starter themes) to `shared/market-taxonomy.json`
- Creates `scripts/_entity-fan-out.mjs` — per-cluster fan-out: company/sector from
  persisted columns (SR3), theme via cached regex (SR3), sentiment fallback cascade
  always landing on `cluster_primary` (SR1), 0-entity skip + counters, batch-load (SR5)
- Wires fan-out into `fetchSignals()` **after** the V2-013 thread block, **before**
  `buildDigest()` — purely additive, **no `runSeed`/Redis change** (DB-only table)
- Adds `[entity]` log line incl. `sentiment_source` distribution (SR1)
- Creates `scripts/backfill-entity-timeline.mjs` — chunked, idempotent, iterates
  `DISTINCT cluster_hash` (SR4), all history
- Unit tests for `_entity-fan-out.mjs`

**Out of scope** (do not build): entity_sentiment population, `themes TEXT[]` on
`india_news_signals`, RSS description enrichment, themes 7–20, retention job, any
frontend/UI, materialized views.

---

## Do Not Touch

Fan-out is **purely additive** to `fetchSignals()`. Do **not** alter
`drainEnrichQueue()`, Tier 1 `persistSignals()`/`buildCaptureRow()`, Tier 2 enrich,
the V2-013 thread-linking block (586–616), `buildDigest()`, or the `runSeed`
`extraKeys` (entity_timeline is **not** a Redis key). The only `fetchSignals()` edits:
(a) insert the fan-out call between the thread block and `buildDigest()`, (b) extend
the returned summary object with entity counters for the log line.

---

## Success Criteria

Per the V2 prod-execution boundary, the agent does code + read-only self-checks only;
**Lijo runs migration/seed/back-fill against prod after review.**

**Agent self-verifiable:**
- [ ] `npx biome check scripts/seed-india-signals.mjs scripts/_entity-fan-out.mjs scripts/backfill-entity-timeline.mjs scripts/migrate-india-signals.mjs scripts/_entity-fan-out.test.mjs` — 0 errors
- [ ] `npm run typecheck` — 0 errors
- [ ] `git diff scripts/seed-insights.mjs` empty (sacred)
- [ ] `git diff src/services/clustering.ts` empty
- [ ] `git diff src/config/variants/full.ts tech.ts finance.ts` empty
- [ ] `git diff server/worldmonitor/news/v1/_classifier.ts` empty
- [ ] `git diff scripts/_clustering.mjs` empty (V2-014 does not touch it)
- [ ] `git diff scripts/_thread-linker.mjs` empty (V2-013 linker untouched)
- [ ] `git diff` on `buildCaptureRow`/`persistSignals` shows **no change** (SR3 — capture path untouched)
- [ ] `themes` block has **exactly 6** entries; `entity_sentiment` is **not** written anywhere new
- [ ] Unit tests pass: theme keyword match, company/sector `source_count` from columns, theme `source_count` from cached regex, sentiment cascade always `cluster_primary` (SR1, given unpopulated `entity_sentiment`), 0-entity cluster skip (design R1), theme always `sentiment_source='cluster_primary'` (design R2), composite-PK `ON CONFLICT` idempotency (SR2)

**Lijo-verified against prod (after review):**
- [ ] `node scripts/migrate-india-signals.mjs` clean **twice** (`entity_timeline` + 3 indexes; composite PK; FK to `story_threads`)
- [ ] One cron run: `entity_timeline` rows written for clusters with entities; `[entity]` log shows `jsonb:0 | primary:N` (SR1) and a skipped-no-entities count
- [ ] Cron run twice on same RSS state: second run writes 0 new rows (composite-PK `ON CONFLICT DO NOTHING`)
- [ ] Theme rows: `sentiment_source = 'cluster_primary'` for **100 %** (design R2)
- [ ] 0-entity cluster: no rows, single summary log line (design R1)
- [ ] `node scripts/backfill-entity-timeline.mjs` runs clean on full history, idempotent on re-run, completes < 1h, progress logged per chunk
- [ ] Design-doc Query 1 (per-entity sentiment + driving threads) and Query 4 (entities by thread) return realistic rows

---

## Second-Order Impact

- **Affected consumers**: none break. No Redis key added/changed (`news:digest`,
  `news:threads` untouched). UI unaffected. `entity_timeline` is a new DB-only table.
- **Capture-path risk**: zero — SR3 forbids touching `buildCaptureRow`/`persistSignals`;
  company/sector counts read existing columns, themes use an isolated cached regex.
- **Sacred/seam risk**: `_clustering.mjs` and `_thread-linker.mjs` are **not touched**
  by V2-014 (unlike V2-013). No sacred-dependency bleed seam this task.
- **Groq cost**: **zero** — fan-out is pure DB + regex, no LLM calls.
- **Performance**: SR5 batch-load = one SELECT at cron start; in-memory group. Adds
  < 1s to a 10-min cron. Back-fill is one-time, chunked, off the cron path.
- **Schema**: new table + 3 indexes + 1 inline FK. ~1.3M rows/yr (~400 MB/yr) —
  trivial for Railway. No retention (Decision 6).
- **New env vars**: none.

---

## Schema — Source of Truth

`entity_timeline` is **new** → `CREATE TABLE IF NOT EXISTS` + inline FK is correct
(re-running is a no-op; no guarded `DO $$` needed because the table itself is new).
Append after the `fk_signals_thread` guard block (current `migrate-india-signals.mjs:81`).

```sql
CREATE TABLE IF NOT EXISTS entity_timeline (
  entity_id        TEXT NOT NULL,                            -- 'RELIANCE.NS' / 'banking' / 'monsoon'
  entity_type      TEXT NOT NULL,                            -- 'company' | 'sector' | 'theme'
  entity_name      TEXT NOT NULL,                            -- 'Reliance' / 'banking' / 'Monsoon'
  cluster_hash     TEXT NOT NULL,
  thread_id        UUID REFERENCES story_threads(thread_id), -- nullable; narrative tag
  observed_at      TIMESTAMPTZ NOT NULL,
  sentiment        DECIMAL(5,4),
  sentiment_source TEXT NOT NULL,                            -- 'entity_jsonb' | 'cluster_primary' (100% the latter until SR1 future task)
  source_count     INT NOT NULL,                             -- headlines in cluster mentioning this entity
  cluster_size     INT NOT NULL,                             -- total headlines in cluster (for ratio)
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (entity_id, entity_type, cluster_hash)         -- SR2: entity_type in PK
);
CREATE INDEX IF NOT EXISTS idx_entity_observed      ON entity_timeline (entity_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_thread        ON entity_timeline (thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entity_type_observed ON entity_timeline (entity_type, observed_at DESC);
```

`shared/market-taxonomy.json` — add a top-level `themes` block. Each theme is the
design doc's documented rich shape `{ name, keywords[], default_sectors[] }` (carries
`name` for `entity_name` and `default_sectors`); keyword matching reuses the
`extractSectors` regex technique. Exactly the 6 starters:

```json
"themes": {
  "monsoon":        { "name": "Monsoon",                "keywords": ["monsoon","imd","rainfall","deficient rainfall","kharif","rabi"], "default_sectors": ["agri","fmcg"] },
  "INDIA-PAKISTAN": { "name": "India-Pakistan tensions", "keywords": ["pakistan","islamabad","loc","line of control","kashmir","pok"],   "default_sectors": ["defense"] },
  "RBI-policy":     { "name": "RBI policy",              "keywords": ["rbi policy","monetary policy committee","mpc","repo rate","reverse repo","crr","slr"], "default_sectors": ["banking"] },
  "crude-shock":    { "name": "Crude oil shock",         "keywords": ["brent","wti","opec","crude oil","oil price"], "default_sectors": ["energy"] },
  "SEBI-action":    { "name": "SEBI enforcement",        "keywords": ["sebi","securities and exchange board","market regulator"], "default_sectors": [] },
  "FII-flow":       { "name": "FII flows",               "keywords": ["fii","foreign institutional investor","foreign portfolio investor","fpi"], "default_sectors": [] }
}
```

---

## Files To Open Before Starting

```
scripts/seed-india-signals.mjs        — fetchSignals() 540–653; thread block 586–616; buildCaptureRow 325; pgPool()  (read)
scripts/_thread-linker.mjs            — structure model for _entity-fan-out.mjs (Groq NOT needed for fan-out)  (read)
scripts/_thread-linker.test.mjs       — test-file model (node --test, mock pool)  (read)
scripts/migrate-india-signals.mjs     — append entity_timeline after line 81; C1 pattern  (write)
scripts/_india-market-keywords.mjs    — extractSectors() keyword-regex pattern to mirror for themes  (READ ONLY — do not call for company/sector counts, SR3)
shared/market-taxonomy.json           — sectors block shape; add themes block  (write)
scripts/_seed-utils.mjs               — loadSharedConfig(), pg pool helpers  (read)
ai_docs/tasks/V2-014_entity_timeline_design.md — pipeline flow + 6 decisions + Queries 1–4  (read; SR1/SR3 override it)
```

**NEVER open for writing:**
```
scripts/seed-insights.mjs              — sacred
scripts/_clustering.mjs                — not in V2-014 scope
scripts/_thread-linker.mjs             — V2-013 linker, frozen
src/services/clustering.ts             — SPA, separate system
src/config/variants/full.ts|tech.ts|finance.ts — sacred
server/worldmonitor/news/v1/_classifier.ts — TS source of truth
```

---

## Pattern To Follow

### Append-only DDL (C1 idempotent)
Add the `entity_timeline` block to the **end** of the existing `DDL` template string
in `migrate-india-signals.mjs` (after the `fk_signals_thread` `DO $$ ... END $$;` at
line 81, before the closing backtick). Add matching `console.log('✓ ...')` lines next
to the existing ones. Do not restructure the file or the `india_news_signals` DDL.

### Company/sector source_count from columns (SR3 / D2 lesson)
`buildCaptureRow` persists, per row, parallel arrays at the **same index**:
`nse_tickers[i]` ↔ `companies[i]`. So for the cluster's batch-loaded rows:
- **company** entity: `entity_id = ticker` (from `nse_tickers`),
  `entity_name = companies[sameIndex]`, `source_count = count(rows whose nse_tickers
  contains that ticker)`. No registry re-lookup needed for the count.
- **sector** entity: `entity_id = entity_name = sector key` (e.g. `banking`),
  `source_count = count(rows whose sectors contains that key)`.
**No regex, no `extractCompanies`/`extractSectors` call** for these.

### Theme source_count via cached regex (SR3)
At cron start build `themeRegexCache: Map<themeKey, RegExp>` — one compiled regex per
theme (mirror the `extractSectors` join-and-escape technique). Per cluster, theme
`source_count = count(headlines matching the theme's cached regex)`;
`entity_id = themeKey`, `entity_name = theme.name`.

### Sentiment cascade (SR1 — always lands on cluster_primary today)
```
if entity_type === 'theme'                         → cluster_primary  (design R2)
else if primary_row.entity_sentiment?.[entity_id]  → entity_jsonb     (DEAD until SR1 future task — column never written)
else                                               → cluster_primary
```
Keep the `entity_jsonb` branch (future-proof) but expect 100 % `cluster_primary`.
`primary_row` = cluster row with `ai_summary IS NOT NULL`, else first by `scraped_at`.
Log `[entity] ... | jsonb:<A> | primary:<B> | skipped(no-entities):<S>`.

### Batch-load (SR5) + 0-entity skip (design R1)
One `SELECT * FROM india_news_signals WHERE cluster_hash = ANY($1)` for all run
clusters; group in memory by `cluster_hash`. If a cluster yields 0 entities across
company+sector+theme → increment `skipped` counter, `continue` (no rows).

### Back-fill iterates DISTINCT cluster_hash (SR4)
`SELECT DISTINCT cluster_hash FROM india_news_signals ORDER BY cluster_hash` (or by
min `scraped_at`), chunk of 1000, per chunk run the same fan-out logic,
`INSERT ... ON CONFLICT (entity_id, entity_type, cluster_hash) DO NOTHING`, log
progress per chunk. Re-runnable. Lijo runs it against prod after V2-013 thread
back-fill (if any); pre-V2-013 rows keep `thread_id = NULL` (acceptable).

---

## Implementation

> One phase at a time. Mark each `[x]` with a timestamp. Do not start a phase until
> the prior phase's checks pass.

### Phase 1: Schema migration (`migrate-india-signals.mjs`)
**Goal**: `entity_timeline` + 3 indexes, idempotent, appended.

- [ ] **1.1** Append the `entity_timeline` SQL block (schema above) to the end of the
  `DDL` string, after the `fk_signals_thread` `END $$;` (line 81). Composite PK per
  SR2. Inline FK to `story_threads` (new table — no guarded `DO $$`).
- [ ] **1.2** Add the matching `console.log('✓ Table created: entity_timeline')` +
  3 index log lines alongside the existing logs.
- [ ] **1.3** Self-check: re-read the file; PK is `(entity_id, entity_type, cluster_hash)`;
  all `CREATE`s use `IF NOT EXISTS`; existing DDL unchanged.

### Phase 2: Themes block (`shared/market-taxonomy.json`)
**Goal**: 6 starter themes, valid JSON.

- [ ] **2.1** Add the top-level `themes` block (6 entries above). Trailing-comma-free,
  matches existing file indentation. No other key changed.

### Phase 3: `_entity-fan-out.mjs` (NEW) — fan-out logic
**Goal**: design doc Pipeline Flow with SR1/SR3/SR5 + design R1/R2 applied.

- [ ] **3.1** `loadSharedConfig('market-taxonomy.json')`; build `themeRegexCache`
  (one regex per theme, cached) and the company/sector helpers (column-based).
- [ ] **3.2** `fanOut(pool, clusters)` — batch-load all cluster rows in one query
  (SR5); group by `cluster_hash`. For each cluster: pick `primary_row`; aggregate
  company entities (ticker↔name from parallel columns), sector entities (keys),
  theme entities (cached regex over headlines). If 0 entities → `skipped++`, continue.
- [ ] **3.3** Per entity: `entity_id`/`entity_type`/`entity_name`, `source_count`
  (SR3 rules), `cluster_size`, `observed_at = primary_row.scraped_at`, sentiment
  cascade (SR1; theme always `cluster_primary` — design R2), tally
  `jsonb`/`primary` counters.
- [ ] **3.4** Batched `INSERT INTO entity_timeline (...) VALUES ... ON CONFLICT
  (entity_id, entity_type, cluster_hash) DO NOTHING` (SR2).
- [ ] **3.5** Return `{ clustersProcessed, entityRows, jsonbCount, primaryCount,
  skippedNoEntities }`. `[entity]`-prefixed log incl. `sentiment_source` distribution.

### Phase 4: Wire into `seed-india-signals.mjs`
**Goal**: fan-out runs after thread block, before digest; no Redis change.

- [ ] **4.1** `import { fanOut } from './_entity-fan-out.mjs'`.
- [ ] **4.2** In `fetchSignals()`, **after** the V2-013 thread block (ends ~616) and
  **before** `const digest = buildDigest(...)` (618): call `fanOut(...)` over this
  run's clusters (reuse a pg pool; mirror the thread block's pool handling).
- [ ] **4.3** Extend the returned summary object with entity counters; add the
  `[entity]` log line. **Do not** touch `drainEnrichQueue`/Tier 1/Tier 2/thread
  block/`buildDigest`/`runSeed` `extraKeys`.

### Phase 5: `backfill-entity-timeline.mjs` (NEW)
**Goal**: one-time, chunked, idempotent, all history.

- [ ] **5.1** `loadEnvFile` + pg `Pool` (mirror `migrate-india-signals.mjs` bootstrap).
- [ ] **5.2** Iterate `DISTINCT cluster_hash` (SR4) in chunks of 1000; per chunk run
  the shared fan-out logic (import from `_entity-fan-out.mjs` — single source of
  truth, no copy-paste); `ON CONFLICT ... DO NOTHING` (SR2). Log progress per chunk.
  `process.exit(0)` on completion.

### Phase 6: Unit tests (`_entity-fan-out.test.mjs`, NEW)
**Goal**: lock SR1/SR2/SR3 + design R1/R2 with fixtures (no DB/network).

- [ ] **6.1** `node --test`, mock pool (mirror `_thread-linker.test.mjs`). Cover:
  theme keyword match; company/sector `source_count` from columns; theme
  `source_count` from cached regex; sentiment cascade → always `cluster_primary`
  given unpopulated `entity_sentiment` (SR1); 0-entity cluster skipped + counted
  (design R1); theme always `sentiment_source='cluster_primary'` (design R2);
  composite-PK `ON CONFLICT` idempotency (SR2, re-run inserts 0).

### Phase 7: Verification & sacred-diff guard
- [ ] **7.1** `npm run typecheck` 0; `npx biome check` (touched files) 0.
- [ ] **7.2** All sacred/frozen `git diff` checks empty (see Success Criteria).
- [ ] **7.3** `git diff` confirms `buildCaptureRow`/`persistSignals`/thread block/
  `runSeed` `extraKeys` unchanged (purely additive).

---

## Error Scenarios

| Symptom | Likely cause | Fix |
|---|---|---|
| Migration fails 2nd run: "relation already exists" | Missing `IF NOT EXISTS` on table/index | Use `CREATE TABLE/INDEX IF NOT EXISTS` |
| Theme + sector rows collide on PK | PK missing `entity_type` | SR2: PK `(entity_id, entity_type, cluster_hash)`, same in `ON CONFLICT` |
| `sentiment_source` is never `entity_jsonb` | Expected — `entity_sentiment` is never written (SR1) | Not a bug; documented until a future population task |
| company `source_count` drifts vs capture | Re-ran `extractCompanies` regex | SR3/D2: read `nse_tickers`/`sectors` columns, no regex for these |
| Theme never matches | Regex not built/cached, or themes block missing | Build `themeRegexCache` at start; verify Phase 2 JSON |
| Capture path diff non-empty | Touched `buildCaptureRow`/`persistSignals` | Revert — SR3 forbids capture-path edits |
| Redis digest/threads changed | Added an `extraKeys` entry | entity_timeline is DB-only; no `runSeed` change |
| 2nd cron run double-counts | `INSERT` missing `ON CONFLICT DO NOTHING` | Add composite-PK conflict clause |
| Back-fill slow / N rows per cluster | Iterating rows not clusters | SR4: `DISTINCT cluster_hash` |

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_PUBLIC_URL` | Railway (present) | PG pool |

No new env vars. **No Groq** (fan-out has no LLM calls). No Redis change.

---

## Read vs Write

**WRITE only to:**
- `scripts/migrate-india-signals.mjs` (append `entity_timeline` DDL)
- `shared/market-taxonomy.json` (add `themes` block, 6 entries)
- `scripts/_entity-fan-out.mjs` (NEW)
- `scripts/backfill-entity-timeline.mjs` (NEW)
- `scripts/seed-india-signals.mjs` (fan-out wiring + counters/log only)
- `scripts/_entity-fan-out.test.mjs` (NEW)

**READ for reference (never write):**
- `scripts/_thread-linker.mjs`, `scripts/_thread-linker.test.mjs`,
  `scripts/_india-market-keywords.mjs`, `scripts/_seed-utils.mjs`

**Never write to:**
- `scripts/seed-insights.mjs` · `scripts/_clustering.mjs` · `scripts/_thread-linker.mjs`
  · `src/services/clustering.ts` · `src/config/variants/full.ts|tech.ts|finance.ts`
  · `server/worldmonitor/news/v1/_classifier.ts`

---

## Verify (agent — read-only / self-runnable)

```bash
npm run typecheck
npx biome check scripts/seed-india-signals.mjs scripts/_entity-fan-out.mjs scripts/backfill-entity-timeline.mjs scripts/migrate-india-signals.mjs scripts/_entity-fan-out.test.mjs
node --test scripts/_entity-fan-out.test.mjs
git diff scripts/seed-insights.mjs            # empty
git diff scripts/_clustering.mjs              # empty
git diff scripts/_thread-linker.mjs           # empty
git diff src/services/clustering.ts           # empty
git diff src/config/variants/full.ts src/config/variants/tech.ts src/config/variants/finance.ts  # empty
git diff server/worldmonitor/news/v1/_classifier.ts  # empty
```

**Lijo runs against prod after review** (V2 prod-execution boundary):
`node scripts/migrate-india-signals.mjs` (×2), `node scripts/seed-india-signals.mjs`,
`node scripts/backfill-entity-timeline.mjs`, then the prod SQL/Redis spot-checks above.

---

## Completion Log

- [ ] Phase 1 — schema migration —
- [ ] Phase 2 — themes block (6) —
- [ ] Phase 3 — `_entity-fan-out.mjs` —
- [ ] Phase 4 — wired into `seed-india-signals.mjs` —
- [ ] Phase 5 — `backfill-entity-timeline.mjs` —
- [ ] Phase 6 — unit tests —
- [ ] Phase 7 — typecheck/biome 0 + sacred diffs empty —
- [ ] Lijo: migration ×2 + seed run + back-fill + prod spot-checks —
- [ ] Rules note: `.agents/rules/sachnetra-boundaries.md` §3 V2 scope list stale vs quant track (V2-012/013 precedent) — flagged, non-blocking, future `/update-template`
- [ ] **TASK V2-014 COMPLETE** ✅
```
