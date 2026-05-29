# Task V2-018c — Filings UI (Dashboard Metrics Layer)

*SachNetra Adapt Sprint — derived display layer for the separate dashboard workspace*

**Depends on**: V2-018 collector **COMPLETE** — `india_bourse_announcements` exists, 17,322 rows backfilled 2026-05-22, 3 indexes, 100% PDF capture. ⚠️ Forward freshness depends on the V2-018 **hourly Railway cron**, which the V2-018 completion log lists as the one remaining operational step. The historical feed works immediately on the backfill; "today's filings" is meaningful only once the cron is live — see the Freshness Gate.
**Estimated time**: ~0.5–1 h engineering (one view) + Lijo prod migration + dashboard wiring (separate repo)
**Dashboard**: [sachnetra-dashboard.vercel.app](https://sachnetra-dashboard.vercel.app/) — **separate workspace**, connects directly to Railway PostgreSQL
**Contract doc**: `ai_docs/dashboard_contracts/india_bourse_filings.md` (already authored — the dashboard-repo handoff)
**V1 or V2**: V2 (quant data layer — display layer on top of V2-018)

---

## Context Manifest

*Read these BEFORE any code work. Skip the "Don't load" list.*

### Load (in order)

1. `CLAUDE.md` — verify Sacred Files (this task touches **none** of them)
2. `.agents/rules/sachnetra-boundaries.md` — V2 scope guard
3. `.agents/rules/sachnetra-patterns.md` — Railway cron + DDL-runner conventions
4. **Parent task (do not re-derive collector / schema):**
   - `ai_docs/tasks/V2-018_nse_bourse_announcements.md` — the collector, the locked `india_bourse_announcements` schema, the field map, category list
   - `scripts/migrate-india-signals.mjs` — DDL runner pattern (where the view is appended)
5. **Pattern precedent (the structural twin):**
   - `ai_docs/tasks/V2-017c_fii_dii_absorption_metrics.md` — the first metrics-layer task; same "view in this repo, dashboard reads PostgreSQL" architecture. **Note the divergence:** V2-018c needs only a VIEW — no function, no materialized table, no cron patch, no backfill (see Locked Architecture below).
   - `ai_docs/dashboard_contracts/india_bourse_filings.md` — the contract this task fulfils
6. **Product definition (personas / why these categories):**
   - `scratch/app_vision_research/output/R00/R00_lijo_decision_packet.md` — filings is a confirmed next-quarter top-3 build; personas = fundamental investor + ex-F&O swing trader

### Don't load

- `src/`, `api/`, `proto/`, `src/config/panels.ts`, `src/config/variants/*` — **no frontend work in this repo**
- Redis publish helpers / edge function patterns — dashboard reads PostgreSQL directly
- `scripts/seed-india-announcements.mjs` / `_nse-announcements-source.mjs` internals — V2-018 collector, **not touched here** (no cron patch needed — see below)
- News pipeline (`seed-india-signals.mjs`, threads, entity timeline) — unrelated, V2-018 is non-news

### Skill / template lineage

- Architecture: metrics-layer pattern locked with Lijo 2026-05-28 (R00 era); see `memory/project_separate_dashboard.md`
- Bugfix during execution: `/bugfix` · Commit at end: `/git` (Lijo request only)

---

## Locked Architecture Decision (DO NOT RE-DERIVE)

Lijo's **separate dashboard workspace** (`sachnetra-dashboard.vercel.app`) reads Railway
PostgreSQL directly. The filings UI is a Lijo-facing display → metrics-layer pattern, **not**
a Preact panel in the public SachNetra SPA.

### Build in THIS repo (Railway side only)

| Artifact | Purpose |
|---|---|
| `india_bourse_filings_v1` **VIEW** | Thin read-only classification layer over `india_bourse_announcements`: adds `category_group` + `is_high_alpha` derived from the free-text `category`. The dashboard reads this. |

That is the **entire** build. One `CREATE OR REPLACE VIEW`.

### Why this is lighter than V2-017c (the key divergence)

V2-017c needed a function + materialized table + daily cron patch + historical backfill because
**absorption is a computed time-series** — one MTD snapshot per trading day that must be
recomputed and stored daily. **Filings are different:** the rows are already collected, immutable
once filed, and fully indexed (`announced_at`, `symbol`, `category`). The dashboard just needs to
*read and group* them. So:

```
❌ NO function          — no per-date formula to centralise; the view's CASE is the only logic
❌ NO materialized table — base table is already append-only + indexed; nothing to snapshot
❌ NO seed-*.mjs patch   — V2-018's hourly cron already keeps the base table fresh; the view is live
❌ NO backfill script    — the 17,322 rows already exist; the view exposes them instantly
```

### Do NOT build in this repo

```
❌ src/components/*Filings*    — no Preact panel
❌ src/config/panels.ts          — no india variant panel
❌ api/india-filings.js          — no edge endpoint
❌ Redis key                     — dashboard does not use Redis for this
❌ Proto RPC                     — not needed
❌ Duplicate classification in JS — the CASE lives in ONE SQL view only
```

### Data flow

```
NSE corporate-announcements scrape
  → seed-india-announcements.mjs (V2-018 hourly Railway cron)
  → india_bourse_announcements (raw append-only filings)        ← already live, V2-018
  → india_bourse_filings_v1 (VIEW — adds category_group/is_high_alpha)   ← THIS TASK
  → sachnetra-dashboard (separate repo) SELECTs from the view
```

---

## Category Taxonomy (Locked)

`category` is **free text** (107 distinct values in the backfill), so the dashboard filters on a
normalised group. The mapping is heuristic + **tunable** — `category` stays the source of truth.

| `category_group` | Matches (ILIKE on `category`) | High-alpha? |
|---|---|---|
| `board_outcome` | `%board meeting%` | ✅ |
| `mna` | `%acquisition%`, `%amalgamation%`, `%merger%`, `%disinvestment%`, `%scheme of arrangement%` | ✅ |
| `takeover` | `%takeover%`, `%sast%`, `%pledge%` | ✅ |
| `credit_rating` | `%credit rating%` | ✅ |
| `management` | `%director%`, `%auditor%`, `%company secretary%`, `%compliance officer%`, `%change in management%` | ✅ |
| `capital_action` | `%allotment%`, `%issue of securities%`, `%buyback%`, `%esop%`, `%esps%`, `%record date%` | — |
| `dividend` | `%dividend%` | — |
| `results` | `%financial result%` | — |
| `disclosure` | `%press release%`, `%investor presentation%`, `%analyst%`, `%con. call%`, `%investor meet%`, `%newspaper%` | — |
| `other` | (no match above) | — |

High-alpha set (`board_outcome`, `mna`, `takeover`, `credit_rating`, `management`) mirrors the
V2-018 recon's most market-moving categories (and the future V2-015 OCR priority). It is the
dashboard's default filter.

---

## Schema (Locked)

Append to the `DDL` template string in `scripts/migrate-india-signals.mjs`, **after the
`india_bourse_announcements` block** (so the base table exists first). The runner executes the
whole `DDL` as one `pool.query(DDL)`; a `CREATE OR REPLACE VIEW` is safe there.

```sql
-- V2-018c filings UI: read-only classification view over V2-018's append-only table.
-- Maps free-text NSE `category` → normalised `category_group` + `is_high_alpha` flag for
-- clean dashboard filtering. Heuristic + tunable; `category` remains the source of truth.
-- No materialization, no formula function — the base table is already complete + indexed.
CREATE OR REPLACE VIEW india_bourse_filings_v1 AS
SELECT
  a.source, a.announcement_id, a.symbol, a.company_name, a.isin,
  a.category, a.subject, a.attachment_url, a.industry, a.has_xbrl,
  a.announced_at, a.created_at,
  CASE
    WHEN a.category ILIKE '%board meeting%'                                              THEN 'board_outcome'
    WHEN a.category ILIKE ANY (ARRAY['%acquisition%','%amalgamation%','%merger%','%disinvestment%','%scheme of arrangement%']) THEN 'mna'
    WHEN a.category ILIKE ANY (ARRAY['%takeover%','%sast%','%pledge%'])                  THEN 'takeover'
    WHEN a.category ILIKE '%credit rating%'                                              THEN 'credit_rating'
    WHEN a.category ILIKE ANY (ARRAY['%director%','%auditor%','%company secretary%','%compliance officer%','%change in management%']) THEN 'management'
    WHEN a.category ILIKE ANY (ARRAY['%allotment%','%issue of securities%','%buyback%','%esop%','%esps%','%record date%']) THEN 'capital_action'
    WHEN a.category ILIKE '%dividend%'                                                   THEN 'dividend'
    WHEN a.category ILIKE '%financial result%'                                           THEN 'results'
    WHEN a.category ILIKE ANY (ARRAY['%press release%','%investor presentation%','%analyst%','%con. call%','%investor meet%','%newspaper%']) THEN 'disclosure'
    ELSE 'other'
  END AS category_group,
  (a.category ILIKE ANY (ARRAY[
     '%board meeting%','%acquisition%','%amalgamation%','%merger%','%disinvestment%',
     '%scheme of arrangement%','%takeover%','%sast%','%pledge%','%credit rating%',
     '%director%','%auditor%','%company secretary%','%compliance officer%','%change in management%'
   ])) AS is_high_alpha
FROM india_bourse_announcements a;
```

Add a matching confirmation line in the migrate runner (match the existing pattern that prints
after the single `pool.query(DDL)`):
- `✓ View created: india_bourse_filings_v1`

> **Why a view, not a materialized view:** the base table is already indexed on the columns the
> dashboard sorts/filters by (`announced_at`, `symbol`, `category`), and the CASE is cheap per-row.
> A plain view stays live with zero refresh logic and never goes stale relative to the hourly cron.
> Revisit a materialized view only if dashboard query latency ever becomes a problem (it won't at
> this row count).

---

## Dashboard Reference UI (FOR SEPARATE REPO — DO NOT BUILD HERE)

*Design contract for Lijo / the dashboard agent. The full version lives in the contract doc;
summarised here so both repos stay aligned.*

- **KPI strip:** "Filings today" · "High-alpha today" · "Latest filing" (relative time).
- **Filter chips:** the `category_group` set, with the **high-alpha group preselected by default**.
- **Feed/table:** `announced_at` (IST, relative + absolute on hover) · `symbol` · `company_name`
  · `category` (raw text, colour-keyed by `category_group`) · `subject` (truncated) · PDF link
  (opens `attachment_url` in a new tab) · XBRL badge when `has_xbrl`.
- **Symbol search box** → company filing-history drill-down.
- **Volume sparkline:** rolling 30-day daily filing count, high-alpha overlaid.
- **Empty/weekend state:** "No filings in this window" — never an error (matches V2-018 Decision 7).
- **Theme:** match the existing dashboard dark theme (navy bg, blue accent, monospace numbers).

Persona fit (R00): the **fundamental investor** uses symbol drill-down + high-alpha filter for
diligence; the **ex-F&O swing trader** uses the live today/30-day volume + board-outcome / M&A
chips for event spotting.

### Dashboard SQL queries (copy-paste contract — full set in the contract doc)

```sql
-- Filings feed (latest, paginated)
SELECT announced_at, symbol, company_name, category, category_group, is_high_alpha,
       subject, attachment_url, has_xbrl, source
FROM india_bourse_filings_v1
ORDER BY announced_at DESC
LIMIT 50 OFFSET 0;

-- High-alpha default filter
SELECT announced_at, symbol, company_name, category, category_group, subject, attachment_url
FROM india_bourse_filings_v1
WHERE is_high_alpha
ORDER BY announced_at DESC
LIMIT 50;

-- Symbol drill-down
SELECT announced_at, category, category_group, subject, attachment_url, has_xbrl
FROM india_bourse_filings_v1
WHERE symbol = $1
ORDER BY announced_at DESC
LIMIT 100;

-- KPI: today's filings (IST — announced_at is +05:30-aware)
SELECT COUNT(*) AS filings_today,
       COUNT(*) FILTER (WHERE is_high_alpha) AS high_alpha_today,
       MAX(announced_at) AS latest_filing
FROM india_bourse_filings_v1
WHERE (announced_at AT TIME ZONE 'Asia/Kolkata')::date
    = (now()        AT TIME ZONE 'Asia/Kolkata')::date;

-- Trend: daily filing volume, rolling 30 days (IST)
SELECT (announced_at AT TIME ZONE 'Asia/Kolkata')::date AS filing_date,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE is_high_alpha) AS high_alpha
FROM india_bourse_filings_v1
WHERE announced_at >= now() - INTERVAL '30 days'
GROUP BY 1 ORDER BY 1 ASC;
```

---

## Execution Checklist (Agent)

### Phase 1 — DDL

- [ ] **1.1** Append the `CREATE OR REPLACE VIEW india_bourse_filings_v1` (Schema section) to the `DDL` string in `scripts/migrate-india-signals.mjs`, **after** the `india_bourse_announcements` block (the view references that table). Do not change existing DDL.
- [ ] **1.2** Add the `✓ View created: india_bourse_filings_v1` console.log confirmation line, matching the existing pattern.
- [ ] **1.3** Lijo runs `node scripts/migrate-india-signals.mjs` in prod — **agent does NOT run prod migration** (`memory/feedback_v2_prod_execution.md`).

### Phase 2 — Static checks (agent, local)

- [ ] **2.1** `npm run typecheck` → 0 errors · `npx biome check .` → 0 errors.
- [ ] **2.2** `git diff` shows ONLY `scripts/migrate-india-signals.mjs` touched. Confirm empty diffs for sacred / out-of-scope files (see Files To Touch). **Do NOT run any `seed-*.mjs` locally** (fires the NSE scrape + writes to whatever `DATABASE_URL` resolves to — Lijo's prod step).

### Phase 3 — Verification queries (Lijo runs in prod; include in handoff)

```sql
-- View vs base-table parity (must be equal — view filters/mutates nothing)
SELECT (SELECT COUNT(*) FROM india_bourse_announcements) AS base_rows,
       (SELECT COUNT(*) FROM india_bourse_filings_v1)    AS view_rows;

-- Classification coverage (tune taxonomy if `other` dominates)
SELECT category_group, COUNT(*) AS n,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM india_bourse_filings_v1
GROUP BY category_group ORDER BY n DESC;

-- Freshness (latest filing should be < ~2 h old in market hours IF the hourly cron is live)
SELECT COUNT(*) AS total_rows, MAX(announced_at) AS latest_filing, MAX(created_at) AS last_insert
FROM india_bourse_announcements;
```

### Phase 4 — Handoff

- [ ] **4.1** Contract doc `ai_docs/dashboard_contracts/india_bourse_filings.md` — **already authored** (this task only had to fulfil it). Confirm it matches the final view columns.
- [ ] **4.2** Dashboard repo wired to the queries above (feed + high-alpha filter + symbol drill-down + KPI + volume sparkline).

---

## Acceptance Criteria

- [ ] `india_bourse_filings_v1` view exists; `category_group` + `is_high_alpha` match the locked taxonomy
- [ ] Build is **view-only** — no function, no materialized table, no `seed-*.mjs` patch, no backfill script
- [ ] **Zero** changes under `src/`, `api/`, `proto/`, variant configs, `seed-*.mjs`
- [ ] View-vs-base-table parity: `base_rows = view_rows` (the view never drops/duplicates rows)
- [ ] Classification coverage reviewed; `other` share acceptable or taxonomy tuned
- [ ] Classification logic exists in exactly ONE place — the view's CASE (no JS/SQL duplication)
- [ ] `npm run typecheck` 0 errors · `npx biome check .` 0 errors
- [ ] Contract doc `india_bourse_filings.md` consistent with the shipped view
- [ ] `CLAUDE.md` V2 Task Status updated: `V2-018c` line added on completion

---

## ⚠️ Freshness Gate (verify before trusting "today's filings")

Unlike V2-017c (which had no usable data until forward collection), V2-018c's **historical feed
works immediately** — 17,322 rows are already in `india_bourse_announcements`. The only gated
surface is *live freshness*:

- The V2-018 completion log (2026-05-22) lists the **hourly Railway cron as the one remaining
  operational step**. If it was never created, the base table is frozen at the 2026-05-22 backfill
  and "Filings today" will read 0 every day.
- **Lijo check before relying on live tiles:** run the freshness query (Phase 3, query 3).
  PASS = `latest_filing` within the last ~2 hours during NSE market hours (and `last_insert`
  advancing hourly). If `latest_filing` is stuck at the backfill date, create/repair the V2-018
  hourly cron first — the historical feed, drill-down, and category breakdown all still work
  meanwhile.

---

## Files To Touch

```
scripts/migrate-india-signals.mjs                 — DDL: append CREATE OR REPLACE VIEW only
ai_docs/dashboard_contracts/india_bourse_filings.md — contract (ALREADY authored — verify only)
CLAUDE.md                                          — add V2-018c to V2 Task Status (on completion)
```

**Do not touch:** `src/**`, `api/**`, `proto/**`, variant configs, Redis helpers, any `seed-*.mjs`
(including `seed-india-announcements.mjs` — V2-018's cron already keeps the base table fresh).

---

## Lijo Prod Steps (After Merge)

1. `node scripts/migrate-india-signals.mjs` — creates the view.
2. Run the Phase 3 verification SQL — confirm `base_rows = view_rows` and review classification coverage.
3. **Freshness Gate** — run the freshness query; if `latest_filing` is stale, create/repair the
   V2-018 hourly Railway cron (this is the V2-018 operational step — V2-018c adds no new cron).
4. Wire the dashboard repo using `ai_docs/dashboard_contracts/india_bourse_filings.md`.
```
