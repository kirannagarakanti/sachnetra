# Task V2-017c — FII/DII Absorption Metrics (Railway PostgreSQL)

*SachNetra Adapt Sprint — derived metrics layer for the separate dashboard workspace*

**Depends on**: V2-017 **daily Moneycontrol cron LIVE in prod** — writing *both* FII and DII rows for the current month into `india_institutional_flows`. ⚠️ As of 2026-05-28 V2-017 is code-complete but its prod cron handoff is still unchecked (`CLAUDE.md`: "awaiting Lijo prod run"), and the table currently holds mostly V2-017b's FII-only NSDL backfill. This is a **hard precondition, not a satisfied dependency** — see the Precondition Gate section before deploying.
**Estimated time**: 1–2 h engineering + Lijo prod migration + dashboard wiring (separate repo)
**Dashboard**: [sachnetra-dashboard.vercel.app](https://sachnetra-dashboard.vercel.app/) — **separate workspace**, connects directly to Railway PostgreSQL
**V1 or V2**: V2 (quant data layer — derived metrics on top of V2-017)

---

## Context Manifest

*Read these BEFORE any code work. Skip the "Don't load" list.*

### Load (in order)

1. `CLAUDE.md` — verify Sacred Files (this task touches **none** of them)
2. `.agents/rules/sachnetra-boundaries.md` — V2 scope guard
3. `.agents/rules/sachnetra-patterns.md` — `runSeed()` + Railway cron conventions
4. **Parent task (do not re-derive collector architecture):**
   - `ai_docs/tasks/V2-017_fii_dii_flows.md` — Decisions 1–5, schema, cron model
   - `scripts/seed-india-flows.mjs` — daily upsert target
   - `scripts/migrate-india-signals.mjs` — DDL runner pattern
5. **Product definition (formula + interpretation only):**
   - `scratch/app_vision_research/output/R07/R07_product_implications.md` — tile spec § "FPI vs. DII Net Flow Absorption Ratio"
   - `ai_docs/sachnetra v2/wiki/syntheses/app_vision_2026.md` — §2.4 Flows (May 2026 baseline: FPI −₹34,469 cr, DII +₹63,445 cr → 1.84)

### Don't load

- `src/`, `api/`, `proto/`, `src/config/panels.ts`, `src/config/variants/*` — **no frontend work in this repo**
- Redis publish helpers for dashboard consumption — **not needed**
- Edge function patterns — dashboard reads PostgreSQL directly
- V2-017b internals — not a dependency (FII history depth is nice-to-have, not blocking)

### Skill / template lineage

- Architecture locked in conversation with Lijo (2026-05-28): view + table, no SachNetra app panel
- Bugfix during execution: `/bugfix`
- Commit at end: `/git` (Lijo request only)

---

## Locked Architecture Decision (DO NOT RE-DERIVE)

Lijo has a **separate dashboard workspace** at `sachnetra-dashboard.vercel.app` that connects **directly to Railway PostgreSQL** (same pattern as `india_news_signals`).

### Build in THIS repo (Railway side only)

| Artifact | Purpose |
|---|---|
| `india_flow_absorption_as_of(DATE)` **FUNCTION** | Single source of truth for the absorption **formula** — computes the MTD snapshot as-of any date |
| `india_flow_absorption_v1` **VIEW** | Thin wrapper: the function applied to the latest `flow_date` (live MTD) |
| `india_flow_metrics` **TABLE** | Daily materialized snapshot — **dashboard reads this** |
| `seed-india-flows.mjs` patch | After flow upsert → `INSERT … SELECT FROM view` into table |
| `backfill-india-flow-metrics.mjs` (NEW) | One-time idempotent history seed for trend chart |

### Do NOT build in this repo

```
❌ src/components/*Absorption*     — no Preact panel
❌ src/config/panels.ts              — no india variant panel
❌ api/india-flows.js                — no edge endpoint
❌ Redis key india:flows:absorption:v1 — dashboard does not use Redis
❌ Proto RPC                         — not needed
❌ Duplicate formula in JavaScript   — formula lives in ONE SQL function (india_flow_absorption_as_of) only
```

### Data flow

```
Moneycontrol scrape
  → seed-india-flows.mjs (Railway cron, ~19:30 IST)
  → india_institutional_flows (raw FII + DII daily rows)
  → india_flow_absorption_v1 (VIEW — computes live MTD)
  → india_flow_metrics (TABLE — one row per trading day, materialized by cron)
  → sachnetra-dashboard (separate repo) SELECTs from table
```

---

## What Absorption Means (Locked Formula)

**Concept:** How much domestic institutional buying (DII) offsets foreign selling (FPI/FII).

| Field | Definition |
|---|---|
| `mtd_fii_net` | Sum of FII `net` (₹ crore) for current calendar month through `as_of_date`, `segment='cash'` |
| `mtd_dii_net` | Sum of DII `net` (₹ crore), same window |
| `absorption_ratio` | `mtd_dii_net / ABS(mtd_fii_net)` **only when** `mtd_fii_net < 0` **and** `mtd_dii_net > 0`; else `NULL` |
| `status` | See status enum below |

**May 2026 reference:** DII +₹63,445 cr ÷ |FPI −₹34,469 cr| = **1.84**

**Interpretation:**

| `status` | Condition | Meaning |
|---|---|---|
| `absorbing` | ratio > 1.0 | Domestic buying fully offsets foreign selling |
| `partial` | 0 < ratio ≤ 1.0 | Some domestic support, not full offset |
| `fpi_buying` | `mtd_fii_net >= 0` | FPI net buying — ratio undefined (show N/A) |
| `no_domestic_support` | `mtd_dii_net <= 0` | No domestic bid — ratio undefined |
| `insufficient_data` | missing FII or DII MTD row | Collection gap — show warning |

**Threshold line for charts:** **1.0** = breakeven (DII buying equals FPI selling).

---

## Schema (Locked)

Append to `scripts/migrate-india-signals.mjs` `DDL` string (after the `india_institutional_flows` block). **Order matters: FUNCTION → VIEW → TABLE → INDEX.** The view calls the function, so the function must be defined first. The runner executes the whole `DDL` as a single `pool.query(DDL)`, and dollar-quoted bodies (`$$ … $$`) are safe there — the existing `DO $$ … $$` block in the same string proves it.

### Function — the formula lives HERE (single source of truth)

Computes the MTD absorption snapshot as-of **any** date, so both the live view and the one-time backfill call it. The formula is never duplicated in JS or in a second SQL statement.

```sql
CREATE OR REPLACE FUNCTION india_flow_absorption_as_of(p_as_of DATE)
RETURNS TABLE (
  as_of_date       DATE,
  month_start      DATE,
  mtd_fii_net      DECIMAL(14,2),
  mtd_dii_net      DECIMAL(14,2),
  trading_days_mtd SMALLINT,
  absorption_ratio DECIMAL(8,2),
  status           TEXT
)
LANGUAGE sql STABLE AS $$
  WITH mtd AS (
    SELECT
      i.investor_type,
      SUM(i.net) AS mtd_net,
      COUNT(*)::smallint AS trading_days
    FROM india_institutional_flows i
    WHERE i.segment = 'cash'
      AND p_as_of IS NOT NULL
      AND i.flow_date >= date_trunc('month', p_as_of)::date
      AND i.flow_date <= p_as_of
    GROUP BY i.investor_type
  )
  SELECT
    p_as_of AS as_of_date,
    date_trunc('month', p_as_of)::date AS month_start,
    fii.mtd_net AS mtd_fii_net,
    dii.mtd_net AS mtd_dii_net,
    LEAST(fii.trading_days, dii.trading_days) AS trading_days_mtd,
    CASE
      WHEN fii.mtd_net IS NULL OR dii.mtd_net IS NULL THEN NULL
      WHEN fii.mtd_net >= 0 THEN NULL
      WHEN dii.mtd_net <= 0 THEN NULL
      ELSE ROUND(dii.mtd_net / ABS(fii.mtd_net), 2)
    END AS absorption_ratio,
    CASE
      WHEN fii.mtd_net IS NULL OR dii.mtd_net IS NULL THEN 'insufficient_data'
      WHEN fii.mtd_net >= 0 THEN 'fpi_buying'
      WHEN dii.mtd_net <= 0 THEN 'no_domestic_support'
      WHEN dii.mtd_net / ABS(fii.mtd_net) > 1.0 THEN 'absorbing'
      ELSE 'partial'
    END AS status
  FROM (SELECT 1) _base
  LEFT JOIN mtd fii ON fii.investor_type = 'FII'
  LEFT JOIN mtd dii ON dii.investor_type = 'DII';
$$;
```

The `FROM (SELECT 1) _base LEFT JOIN …` keeps exactly one output row even when the month has no flows at all (empty `mtd` → one row of NULLs → `insufficient_data`). Passing `p_as_of = NULL` (empty table) yields one row with `as_of_date = NULL`, which the materialize/backfill steps filter out via `WHERE as_of_date IS NOT NULL`.

### View — thin wrapper over the function (live MTD)

```sql
CREATE OR REPLACE VIEW india_flow_absorption_v1 AS
SELECT * FROM india_flow_absorption_as_of(
  (SELECT MAX(flow_date) FROM india_institutional_flows WHERE segment = 'cash')
);
```

### Table — dashboard contract

```sql
CREATE TABLE IF NOT EXISTS india_flow_metrics (
  as_of_date       DATE PRIMARY KEY,
  month_start      DATE NOT NULL,
  mtd_fii_net      DECIMAL(14,2),
  mtd_dii_net      DECIMAL(14,2),
  absorption_ratio DECIMAL(8,2),          -- NULL when undefined
  status           TEXT NOT NULL,         -- enum above
  trading_days_mtd SMALLINT,
  computed_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flow_metrics_month
  ON india_flow_metrics (month_start, as_of_date DESC);
```

### Materialize SQL (daily cron — reads the view)

```sql
INSERT INTO india_flow_metrics
  (as_of_date, month_start, mtd_fii_net, mtd_dii_net,
   absorption_ratio, status, trading_days_mtd, computed_at)
SELECT
  as_of_date, month_start, mtd_fii_net, mtd_dii_net,
  absorption_ratio, status, trading_days_mtd, NOW()
FROM india_flow_absorption_v1
WHERE as_of_date IS NOT NULL
ON CONFLICT (as_of_date) DO UPDATE SET
  month_start = EXCLUDED.month_start,
  mtd_fii_net = EXCLUDED.mtd_fii_net,
  mtd_dii_net = EXCLUDED.mtd_dii_net,
  absorption_ratio = EXCLUDED.absorption_ratio,
  status = EXCLUDED.status,
  trading_days_mtd = EXCLUDED.trading_days_mtd,
  computed_at = NOW();
```

Add matching `console.log` lines in migrate runner (it prints these after the single `pool.query(DDL)` — match that existing pattern):
- `✓ Function created: india_flow_absorption_as_of`
- `✓ View created: india_flow_absorption_v1`
- `✓ Table created: india_flow_metrics`
- `✓ Index created: idx_flow_metrics_month`

---

## Pipeline Patch

Extend `scripts/seed-india-flows.mjs` to refresh the latest-date metric on every run.

```javascript
async function materializeFlowMetrics(pool) {
  await pool.query(MATERIALIZE_SQL); // INSERT … SELECT FROM india_flow_absorption_v1
}
```

**Placement matters.** `fetchFlows()` has **three return paths that hold an open pool** — the `NoFlowDataError` holiday return, the `fresh.length === 0` return, and the happy path after the upsert loop. A single call at the end of the happy path would skip the first two. So call it from the **`finally` block, wrapped in its own `try/catch`**:

- it then runs on holidays / no-new-rows days too (refreshing the latest `as_of_date`), and
- a metrics failure can never mask the seed's return value or the original scrape error.

The no-`connectionString` early return happens *before* the pool is created, so `finally` is never reached there — no extra guard needed, but null-check the pool if you prefer defensiveness.

> On an unchanged `as_of_date` the MTD is identical and the row already exists, so the refresh is a near-no-op (only `computed_at` moves). The `finally` placement matters mainly for the first cron run of a new month and to honour the "table is always current" contract.

Log line: `[flows] materialized metrics for YYYY-MM-DD (ratio=X.XX, status=absorbing)`. If the current month has no DII MTD row, additionally log `[flows] WARN: DII MTD missing for <month> — ratio will be insufficient_data` (per the Precondition Gate) — never silently emit a wrong ratio.

---

## Backfill Script (NEW)

`scripts/backfill-india-flow-metrics.mjs` — one-time, idempotent.

**Goal:** Populate `india_flow_metrics` for every distinct `flow_date` so the dashboard trend chart has whatever history exists. (Expect most historical rows to land as `insufficient_data` until forward DII collection accumulates — see Precondition Gate.)

**Approach (locked) — one set-based statement, reuses the canonical function (no JS date loop, no formula duplication):**

```sql
INSERT INTO india_flow_metrics
  (as_of_date, month_start, mtd_fii_net, mtd_dii_net,
   absorption_ratio, status, trading_days_mtd, computed_at)
SELECT
  a.as_of_date, a.month_start, a.mtd_fii_net, a.mtd_dii_net,
  a.absorption_ratio, a.status, a.trading_days_mtd, NOW()
FROM (
  SELECT DISTINCT flow_date
  FROM india_institutional_flows
  WHERE segment = 'cash'
) d
CROSS JOIN LATERAL india_flow_absorption_as_of(d.flow_date) a
WHERE a.as_of_date IS NOT NULL
ON CONFLICT (as_of_date) DO UPDATE SET
  month_start      = EXCLUDED.month_start,
  mtd_fii_net      = EXCLUDED.mtd_fii_net,
  mtd_dii_net      = EXCLUDED.mtd_dii_net,
  absorption_ratio = EXCLUDED.absorption_ratio,
  status           = EXCLUDED.status,
  trading_days_mtd = EXCLUDED.trading_days_mtd,
  computed_at      = NOW();
```

The script: `loadEnvFile()` → connect → run the statement above → log `[backfill-metrics] upserted N rows; range <min> → <max>`. The `LATERAL india_flow_absorption_as_of(d.flow_date)` call computes each historical MTD snapshot through the **same function** the live view uses — so the formula stays in exactly one place. Note the explicit column list in the `INSERT` (the function returns `trading_days_mtd` before `absorption_ratio`, but the table orders them the other way — name columns, don't rely on position).

**Exit contract:** exit 0 always; log + skip if the table/function is missing (migration not run).

**Known limitation:** the daily cron only refreshes the *latest* `as_of_date`. If a prior month's flows are later revised (e.g. an NSDL supersede), that month's already-materialized rows won't auto-recompute — re-run this backfill to refresh them.

---

## Dashboard Reference UI (FOR SEPARATE REPO — DO NOT BUILD HERE)

*This section is a **design contract** for Lijo / the dashboard agent. Include it so both repos stay aligned.*

### Placement on dashboard

Add a new row **below the existing KPI cards** (Today's News, Sentiment, Market Moving, High Threat) and **above** News Volume / Sentiment Trend charts — or as a **5th KPI card + companion chart** in the same row on wide screens.

Match existing dark theme: navy background (`~#0b1120`), blue accent (`~#3b82f6`), green positive / red negative, monospace numbers.

### Layout (desktop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SACHNETRA · market signal intelligence              updated 02:39 pm  ↻   │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Today's News] [Sentiment 7D] [Market Moving] [High Threat]  ← existing   │
├──────────────────────────────┬──────────────────────────────────────────────┤
│  INSTITUTIONAL FLOWS (MTD)   │  ABSORPTION TREND                            │
│  as of 27 May 2026           │  MTD ratio by trading day · threshold 1.0    │
│                              │                                              │
│  FPI (equity)   -34,469 cr   │  2.5 ┤                                       │
│                 ▼ foreign out  │  2.0 ┤                          ●──●         │
│                              │  1.5 ┤                     ●──●              │
│  DII (cash)     +63,445 cr   │  1.0 ┼─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (breakeven)│
│                 ▲ domestic   │  0.5 ┤              ●──●                     │
│                              │  0.0 ┤         ●──●                           │
│  ┌────────────────────────┐  │      └────┬────┬────┬────┬────┬────┬────     │
│  │ Absorption      1.84   │  │          21  22  23  24  25  26  27 May     │
│  │ ● Absorbing            │  │                                              │
│  │ DII offsetting FPI sell│  │  [1W] [1M] [3M] [6M]  ← same control style │
│  └────────────────────────┘  │                                              │
│  SIP context (optional foot) │  Hover tooltip: date, ratio, FPI MTD, DII MTD│
│  "Updated daily ~7:30 PM IST"│                                              │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

### KPI card spec (left panel)

| Element | Source column | Display |
|---|---|---|
| FPI MTD | `mtd_fii_net` | `−34,469 cr` — **red** if negative, green if positive |
| DII MTD | `mtd_dii_net` | `+63,445 cr` — **green** if positive, red if negative |
| Headline ratio | `absorption_ratio` | Large **`1.84`** — hide if NULL |
| Status pill | `status` | `absorbing` → green ● · `partial` → amber ● · `fpi_buying` / `insufficient_data` → grey "N/A" |
| Subtitle | derived | `absorbing`: "DII fully offsetting FPI selling" · `partial`: "Partial domestic support" · etc. |
| As-of | `as_of_date` | `as of 27 May 2026` |
| Footnote | static | `Updated daily after market close (~7:30 PM IST)` |

### Chart spec (right panel)

| Property | Value |
|---|---|
| Type | **Line chart** (single series: `absorption_ratio`) |
| X-axis | `as_of_date` (trading days only — no weekend gaps, use `category` axis or filter) |
| Y-axis | 0 to auto-max; always draw **horizontal dashed line at 1.0** (breakeven) |
| Default range | **1M** (current month MTD evolution) |
| Range toggles | `1W` · `1M` · `3M` · `6M` — match News Volume / Sentiment chart controls |
| NULL handling | Break the line (do not plot 0) when `status IN ('fpi_buying','no_domestic_support','insufficient_data')` |
| Tooltip | `{date} · Ratio {X.XX} · FPI {mtd_fii_net} cr · DII {mtd_dii_net} cr · {status}` |
| Color | Blue line (`#3b82f6`); threshold line grey dashed |

### Optional enhancement (v2 of dashboard — not blocking)

- **Dual bar chart** below the line: daily (not MTD) FII vs DII net bars from `india_institutional_flows` for last 30 sessions.
- **Month summary table:** final absorption ratio per completed month (last row per `month_start`).

### Dashboard SQL queries (copy-paste contract)

```sql
-- KPI card (latest)
SELECT as_of_date, month_start, mtd_fii_net, mtd_dii_net,
       absorption_ratio, status, trading_days_mtd, computed_at
FROM india_flow_metrics
ORDER BY as_of_date DESC
LIMIT 1;

-- Trend chart — current month MTD evolution
SELECT as_of_date, absorption_ratio, mtd_fii_net, mtd_dii_net, status
FROM india_flow_metrics
WHERE month_start = date_trunc('month', CURRENT_DATE)::date
ORDER BY as_of_date ASC;

-- Trend chart — rolling window (e.g. 3M)
SELECT as_of_date, absorption_ratio, mtd_fii_net, mtd_dii_net, status, month_start
FROM india_flow_metrics
WHERE as_of_date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY as_of_date ASC;
```

---

## Execution Checklist (Agent)

### Phase 0 — Precondition (do not skip)

- [ ] **0.1** Confirm with Lijo that V2-017's daily cron is **live in prod and writing both FII and DII** — run the Go/No-Go query in the Precondition Gate. If it fails, STOP: fix V2-017 first; the metric is meaningless without both sides.

### Phase 1 — DDL

- [ ] **1.1** Append **function → view → table → index** (in that order) to the `DDL` string in `scripts/migrate-india-signals.mjs`, after the `india_institutional_flows` block. The function MUST precede the view (the view calls it). The whole `DDL` runs as one `pool.query(DDL)`, so the `$$ … $$` function body is fine.
- [ ] **1.2** Add console.log confirmations (see Schema section)
- [ ] **1.3** Lijo runs `node scripts/migrate-india-signals.mjs` in prod — **agent does NOT run prod migration**

### Phase 2 — Cron materialization

- [ ] **2.1** Add `MATERIALIZE_SQL` constant to `scripts/seed-india-flows.mjs`
- [ ] **2.2** Call materialize after upsert block; log ratio + status
- [ ] **2.3** Static checks only — `npm run typecheck` + `npx biome check .` clean. **Do NOT run `seed-india-flows.mjs` locally**: it fires the Moneycontrol scrape (reserved for Lijo — V2-017 Decision 6) and writes to whatever `DATABASE_URL`/`DATABASE_PUBLIC_URL` resolves to (a documented env-drift hazard). The functional smoke (`SELECT * FROM india_flow_metrics LIMIT 1`) is a **Lijo prod step**.

### Phase 3 — Backfill

- [ ] **3.1** Create `scripts/backfill-india-flow-metrics.mjs` (idempotent, exit 0)
- [ ] **3.2** Document in task completion note: Lijo runs once after migration

### Phase 4 — Verification queries (include in PR / handoff)

```sql
-- View vs table consistency (must match on latest date)
SELECT v.*, m.absorption_ratio AS table_ratio
FROM india_flow_absorption_v1 v
LEFT JOIN india_flow_metrics m USING (as_of_date);

-- DII collection health (flag if < 20 rows in current month)
SELECT investor_type, COUNT(*)
FROM india_institutional_flows
WHERE flow_date >= date_trunc('month', CURRENT_DATE)
GROUP BY investor_type;
```

### Phase 5 — Handoff doc for dashboard repo

Add a short **`ai_docs/dashboard_contracts/india_flow_metrics.md`** (NEW) with:
- Table + column definitions
- The three SQL queries above
- UI reference (link to this task's Dashboard Reference UI section)
- Update cadence: daily ~19:30 IST after `seed-india-flows.mjs`

---

## Acceptance Criteria

- [ ] `india_flow_absorption_v1` view exists; formula matches locked definition
- [ ] `india_flow_metrics` table exists with index
- [ ] Daily cron materializes one row per latest `as_of_date` without duplicating formula in JS
- [ ] Backfill script populates historical rows for trend chart
- [ ] **Zero** changes under `src/`, `api/`, `proto/`
- [ ] View/table ratio matches May 2026 reference within rounding when prod data present (~1.84 if flows current)
- [ ] `insufficient_data` status emitted when DII rows missing for month
- [ ] Dashboard contract doc written for separate workspace
- [ ] Formula exists in exactly ONE place — the `india_flow_absorption_as_of` function; the view and the backfill both call it (no JS/SQL duplication)
- [ ] Precondition Gate query passed (both FII and DII present for current month) before the metric is trusted
- [ ] `npm run typecheck` 0 errors · `npx biome check .` 0 errors
- [ ] `CLAUDE.md` V2 Task Status updated: `V2-017c` line added on completion

---

## ⚠️ Precondition Gate (BLOCKER — verify before deploy)

This metric is only meaningful once V2-017's daily Moneycontrol cron is **live in prod and writing both FII and DII rows**. Two facts make this a gate, not a footnote:

1. **V2-017's prod cron is not yet confirmed running.** `CLAUDE.md` lists V2-017 as "CODE COMPLETE · awaiting Lijo prod run"; its completion-log handoff box is unchecked. Until Lijo runs the migration + registers the daily cron, no fresh flows land.
2. **History is FII-only.** `india_institutional_flows` today is dominated by V2-017b's NSDL backfill, which is **FPI/foreign-only** (~3,965 FII rows vs ~31 DII rows — `ai_docs/sachnetra v2/wiki/experiments/_data_gaps_backlog.md` G3). The ratio needs *both* sides, so every historical month resolves to `insufficient_data`.

**Go/No-Go query — Lijo runs before relying on the metric:**

```sql
SELECT investor_type, COUNT(*) AS rows_this_month, MAX(flow_date) AS latest
FROM india_institutional_flows
WHERE flow_date >= date_trunc('month', CURRENT_DATE)
GROUP BY investor_type;
```

PASS = both `FII` and `DII` present, with `latest` within the last 1–2 trading days. If `DII` is absent or `latest` is stale, the daily cron is not writing both sides — **fix V2-017 first; do not trust the ratio.**

**Expectation-setting:** on day one the KPI card shows a partial-month ratio only if the daily cron has already run several days this month; the **trend chart will be near-empty** until ~1–3 months of forward FII+DII collection accumulate (historical NSDL months are DII-null). The seed patch must log a warning (never silently compute) when the current month's DII MTD row is missing.

---

## Files To Touch

```
scripts/migrate-india-signals.mjs     — DDL: function + view + table + index
scripts/seed-india-flows.mjs          — materialize in finally (try/catch)
scripts/backfill-india-flow-metrics.mjs — NEW one-time backfill (LATERAL function)
ai_docs/dashboard_contracts/india_flow_metrics.md — NEW handoff for dashboard repo
CLAUDE.md                              — add V2-017c to V2 Task Status (on completion)
```

**Do not touch:** `src/**`, `api/**`, `proto/**`, variant configs, Redis helpers.

---

## Lijo Prod Steps (After Merge)

1. **Precondition** — run the Precondition Gate Go/No-Go query; confirm both FII and DII land for the current month. Fix V2-017's daily cron first if it fails.
2. `node scripts/migrate-india-signals.mjs`
3. `node scripts/backfill-india-flow-metrics.mjs`
4. Confirm the daily Railway cron for `seed-india-flows.mjs` is running (this is the V2-017 cron — V2-017c adds no new cron)
5. Run verification SQL (Phase 4) — view-vs-table consistency + DII health
6. Wire dashboard repo using `ai_docs/dashboard_contracts/india_flow_metrics.md`
