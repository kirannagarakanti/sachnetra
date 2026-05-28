# V2-017c — Implementation Checklist for Gemini (composer agent)

**Source of truth:** `ai_docs/tasks/V2-017c_fii_dii_absorption_metrics.md` — read it in full first. This
checklist is the condensed execution order; the task file has the exact SQL/JS and the rationale.

**What you are building:** a Railway-side **derived-metrics layer** on top of the existing
`india_institutional_flows` table — one SQL function (the formula), a view, a materialized table,
a seed patch, and a one-time backfill. A *separate* dashboard repo reads the table directly. There is
**no frontend, no edge function, no Redis** in this task.

---

## Hard boundaries (do not cross)

- ✅ WRITE only: `scripts/migrate-india-signals.mjs`, `scripts/seed-india-flows.mjs`,
  `scripts/backfill-india-flow-metrics.mjs` (NEW), `ai_docs/dashboard_contracts/india_flow_metrics.md` (NEW),
  `CLAUDE.md` (V2 Task Status line only — Phase 6).
- ❌ NEVER touch: `src/**`, `api/**`, `proto/**`, `src/config/variants/*`, `scripts/seed-insights.mjs`,
  Redis helpers. No Preact panel, no `panels.ts`, no `api/india-flows.js`, no proto RPC.
- ❌ Do NOT run `node scripts/migrate-india-signals.mjs`, `node scripts/seed-india-flows.mjs`, or the
  backfill against any database. Those are **Lijo's prod steps**. Running the seed also fires the
  Moneycontrol scrape, which is reserved for Lijo (V2-017 Decision 6).
- ✅ You MAY run read-only static checks: `npm run typecheck`, `npx biome check .`.
- The formula must live in **exactly one place** — the `india_flow_absorption_as_of(DATE)` SQL function.
  Do not re-implement the ratio in JavaScript or in a second SQL statement.

---

## Phase 0 — Precondition (confirm with Lijo, do not skip)

- [ ] Ask Lijo to confirm V2-017's daily Moneycontrol cron is **live in prod and writing both FII and
  DII** for the current month (Go/No-Go query is in the task file's Precondition Gate). If it isn't,
  **flag it in your handoff** — you can still ship the code, but the metric is meaningless until both
  sides land. Do not block the PR on this alone.

**Day-one expectation (tell Lijo):** KPI may show `insufficient_data` until the daily cron has run several
days this month with both FII+DII. The trend chart stays near-empty until ~1–3 months of forward collection
(historical NSDL rows are FII-only).

---

## Phase 1 — DDL (`scripts/migrate-india-signals.mjs`)

- [ ] Append to the `DDL` template string, **after** the `india_institutional_flows` block, in this exact
  order: **FUNCTION → VIEW → TABLE → INDEX**. The view calls the function, so the function comes first.
  (The whole `DDL` runs as a single `pool.query(DDL)`; the `$$ … $$` body is fine — an existing
  `DO $$ … $$` block in the same string proves it.)
  - `CREATE OR REPLACE FUNCTION india_flow_absorption_as_of(p_as_of DATE)` — copy verbatim from task file
  - `CREATE OR REPLACE VIEW india_flow_absorption_v1` — thin wrapper calling the function with the latest `flow_date`
  - `CREATE TABLE IF NOT EXISTS india_flow_metrics` + `CREATE INDEX IF NOT EXISTS idx_flow_metrics_month`
- [ ] Add the four `console.log('✓ …')` confirmation lines after `await pool.query(DDL)` (Function, View,
  Table, Index — match the existing log pattern in that file).

---

## Phase 2 — Daily materialize patch (`scripts/seed-india-flows.mjs`)

- [ ] Add a `MATERIALIZE_SQL` constant (the `INSERT … SELECT FROM india_flow_absorption_v1 … ON CONFLICT`
  from the task file).
- [ ] Add `async function materializeFlowMetrics(pool)` that runs `MATERIALIZE_SQL`.
- [ ] Call it from the **`finally` block of `fetchFlows()`, wrapped in its own `try/catch`** — NOT at the
  end of the happy path or "after the upsert block" only. `fetchFlows()` has three open-pool return paths
  (holiday `NoFlowDataError`, `fresh.length === 0`, happy path); `finally` covers all three and prevents
  a metrics failure from masking the seed result. (No pool exists on the no-`connectionString` early return,
  which returns before pool creation, so `finally` is never reached there — null-check `pool` if defensive.)
- [ ] Log `[flows] materialized metrics for <date> (ratio=…, status=…)`. If the current month has no DII
  MTD row, also log `[flows] WARN: DII MTD missing for <month> — ratio will be insufficient_data`.

---

## Phase 3 — Backfill (`scripts/backfill-india-flow-metrics.mjs`, NEW)

- [ ] Standalone script: `loadEnvFile(import.meta.url)` first → connect via `DATABASE_PUBLIC_URL ||
  DATABASE_URL` (same pattern as `migrate-india-signals.mjs`) → run the **single set-based statement**
  from the task file (`INSERT … SELECT … FROM (SELECT DISTINCT flow_date …) d CROSS JOIN LATERAL
  india_flow_absorption_as_of(d.flow_date) a … ON CONFLICT …`). No JS date loop, no formula in JS.
- [ ] Use the explicit `INSERT` column list (function returns `trading_days_mtd` before
  `absorption_ratio`; the table orders them the other way — name columns, don't rely on position).
- [ ] Log `[backfill-metrics] upserted N rows; range <min> → <max>`. Exit 0 always; log + skip if the
  table/function is missing (migration not run). Header comment: "one-time; Lijo runs against prod;
  safe to re-run."
- [ ] **Expectation:** backfill may upsert ~3,900+ rows; most historical rows will be `insufficient_data`
  (NSDL backfill is FII-only). That is normal — not a bug. Meaningful ratios appear only after forward
  DII collection accumulates.

**Known limitation (note in script header):** daily cron only refreshes the latest `as_of_date`. If prior
month flows are revised (e.g. NSDL supersede), re-run this backfill to refresh those rows.

---

## Phase 4 — Dashboard contract doc (`ai_docs/dashboard_contracts/india_flow_metrics.md`, NEW)

- [ ] Table + column definitions (`status` enum: `absorbing` · `partial` · `fpi_buying` ·
  `no_domestic_support` · `insufficient_data`).
- [ ] The three dashboard SQL queries (KPI latest, current-month trend, rolling window) — copy from task file.
- [ ] **Lijo prod verification SQL** (copy from task file Phase 4 — Lijo runs these, not you):
  - View vs table consistency on latest date
  - DII collection health for current month (go/no-go)
- [ ] Link to the task file's **Dashboard Reference UI** section (KPI card + line chart spec).
- [ ] Update cadence: daily ~19:30 IST after `seed-india-flows.mjs`.
- [ ] Day-one expectation note: trend chart near-empty until ~1–3 months of FII+DII forward collection.

---

## Phase 5 — Static verification (read-only)

- [ ] `npm run typecheck` → 0 errors
- [ ] `npx biome check .` → 0 errors
- [ ] `git diff` shows changes ONLY in the five allowed paths:
  `migrate-india-signals.mjs`, `seed-india-flows.mjs`, `backfill-india-flow-metrics.mjs`,
  `dashboard_contracts/india_flow_metrics.md`, `CLAUDE.md`. Confirm `src/`, `api/`, `proto/`,
  `scripts/seed-insights.mjs` are untouched.

---

## Phase 6 — Status + handoff

- [ ] Add a `V2-017c` line to the V2 Task Status block in `CLAUDE.md` (e.g.
  `V2-017c  FII/DII Absorption Metrics  [CODE COMPLETE ✅ — <date> · awaiting Lijo prod migration + backfill]`).
- [ ] Hand off the **Lijo Prod Steps** from the task file (in order):
  1. Precondition Gate Go/No-Go query (both FII + DII this month)
  2. `node scripts/migrate-india-signals.mjs`
  3. `node scripts/backfill-india-flow-metrics.mjs`
  4. Confirm V2-017 daily cron for `seed-india-flows.mjs` is running
  5. Run verification SQL (view vs table + DII health)
  6. Wire separate dashboard repo using `ai_docs/dashboard_contracts/india_flow_metrics.md`
- [ ] Do not run any prod steps yourself.

---

## What's yours vs Lijo's (one-liner)

- **Gemini writes:** the function/view/table DDL, the seed materialize patch (`finally` + try/catch), the
  backfill script, the dashboard contract doc (including verification SQL for Lijo), the CLAUDE.md line,
  and runs typecheck/biome.
- **Lijo runs (prod):** the Precondition gate query, the migration, the backfill, cron confirmation,
  verification SQL, and the separate dashboard repo build.
