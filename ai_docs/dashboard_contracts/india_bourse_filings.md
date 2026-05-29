# Dashboard Contract: India Bourse Filings (V2-018 Filings UI)

This document defines the schema, category taxonomy, queries, update cadence, and UI
expectations for surfacing the NSE corporate-announcement stream banked by V2-018.

The **separate dashboard repository** (`sachnetra-dashboard.vercel.app`) reads from
Railway PostgreSQL directly. This is a Lijo-facing analyst display, so it follows the
**metrics-layer pattern** (server-side SQL + this contract), NOT a Preact panel in the
public SachNetra SPA. See `memory/project_separate_dashboard.md`.

**Source data:** `india_bourse_announcements` (V2-018, COMPLETE — 17,322 rows backfilled
2026-05-22, forward growth via the hourly cron). Filings are append-only and immutable
once filed; nothing in this contract mutates the base table.

---

## Schema & Column Definitions

### Base table: `india_bourse_announcements`
*(Defined and owned by V2-018 — `scripts/migrate-india-signals.mjs`. Reproduced here for the dashboard; do not redefine.)*

One row per exchange filing. Primary key `(source, announcement_id)`, append-only.

| Column | SQL Type | Description |
|---|---|---|
| `source` | `TEXT` | Exchange provenance: `'nse'` (V1) \| `'bse'` (future). Part of PK. |
| `announcement_id` | `TEXT` | NSE `seq_id` — stable natural key. Part of PK. |
| `symbol` | `TEXT` | NSE trading symbol (e.g. `RELIANCE`). Nullable. |
| `company_name` | `TEXT` | Company name (NSE `sm_name`). |
| `isin` | `TEXT` | ISIN (NSE `sm_isin`). |
| `category` | `TEXT` | Free-text filing category (NSE `desc`, e.g. `Outcome of Board Meeting`). **Not a closed enum** — see taxonomy below. |
| `subject` | `TEXT` | Announcement detail / subject (NSE `attchmntText`). |
| `attachment_url` | `TEXT` | PDF URL on `nsearchives.nseindia.com` — the click-through + V2-015 OCR hook. Nullable. |
| `industry` | `TEXT` | Industry (NSE `smIndustry`). Nullable. |
| `has_xbrl` | `BOOLEAN` | XBRL attachment present. |
| `announced_at` | `TIMESTAMPTZ` | Filing timestamp, stored IST (`sort_date` + `+05:30`). **Primary sort/filter key.** |
| `created_at` | `TIMESTAMPTZ` | Row insert time. |

**Existing indexes** (sufficient for every query below — no new index needed):
- `idx_ann_announced (announced_at DESC)`
- `idx_ann_symbol_date (symbol, announced_at DESC)`
- `idx_ann_category_date (category, announced_at DESC)`

> **Timezone note:** `announced_at` is timezone-aware and offset `+05:30`. For "today / this
> week IST" filters, always normalise with `AT TIME ZONE 'Asia/Kolkata'` (queries below do
> this) — never compare a bare `CURRENT_DATE` (server UTC) against `announced_at`.

---

## Category Taxonomy (`category_group`)

`category` is **free text** (107 distinct values observed in the backfill), so the dashboard
should filter on a normalised group rather than raw strings. The mapping is heuristic and
**tunable** — `category` is the source of truth; `category_group` is a convenience layer.

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

The "high-alpha" set (`board_outcome`, `mna`, `takeover`, `credit_rating`, `management`)
mirrors the categories flagged in the V2-018 recon as most market-moving (and the future
V2-015 OCR priority). The dashboard's default filter should preselect these.

---

## Build (SachNetra repo) — one optional derived view

The only net-new SachNetra-repo work is a thin, read-only classification view so the
`category_group` logic lives **server-side** (reusable for the future B2B API path, per
`memory/project_v2_positioning.md`). It materialises nothing and is safe/idempotent.

Append to the `DDL` template string in `scripts/migrate-india-signals.mjs` (after the
`india_bourse_announcements` block). **Lijo runs the migration** (prod-execution boundary,
`memory/feedback_v2_prod_execution.md`) — the agent only writes the DDL + read-only checks.

```sql
-- V2-018 filings UI: read-only classification view. Maps free-text NSE `category`
-- to a normalised `category_group` + `is_high_alpha` flag for clean dashboard filtering.
-- Heuristic + tunable; `category` remains the source of truth. No materialization.
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

> The dashboard can also read the **base table directly** if the view is not yet migrated —
> every query below is given against the view but degrades to the raw table by dropping the
> `category_group` / `is_high_alpha` columns. The view is a convenience, not a hard dependency.

---

## Dashboard SQL Queries

Use these in the separate dashboard workspace to render UI components.

### Filings Feed (latest, paginated)
```sql
-- Reverse-chronological filing feed. Page with LIMIT/OFFSET (or keyset on announced_at).
SELECT announced_at, symbol, company_name, category, category_group, is_high_alpha,
       subject, attachment_url, has_xbrl, source
FROM india_bourse_filings_v1
ORDER BY announced_at DESC
LIMIT 50 OFFSET 0;
```

### Filings Feed — High-Alpha Default Filter
```sql
-- Default view: only the market-moving categories.
SELECT announced_at, symbol, company_name, category, category_group,
       subject, attachment_url
FROM india_bourse_filings_v1
WHERE is_high_alpha
ORDER BY announced_at DESC
LIMIT 50;
```

### Filings Feed — Filter by category group
```sql
-- Group filter chips (board_outcome | mna | takeover | credit_rating | management | ...).
SELECT announced_at, symbol, company_name, category, subject, attachment_url
FROM india_bourse_filings_v1
WHERE category_group = ANY ($1)        -- e.g. ARRAY['mna','takeover']
ORDER BY announced_at DESC
LIMIT 50;
```

### Symbol Drill-Down (one company's filing history)
```sql
-- Uses idx_ann_symbol_date.
SELECT announced_at, category, category_group, subject, attachment_url, has_xbrl
FROM india_bourse_filings_v1
WHERE symbol = $1                       -- e.g. 'RELIANCE'
ORDER BY announced_at DESC
LIMIT 100;
```

### KPI Card — Today's Filings (IST)
```sql
-- Count of filings filed so far today (IST), with the high-alpha subset.
SELECT
  COUNT(*)                              AS filings_today,
  COUNT(*) FILTER (WHERE is_high_alpha) AS high_alpha_today,
  MAX(announced_at)                     AS latest_filing
FROM india_bourse_filings_v1
WHERE (announced_at AT TIME ZONE 'Asia/Kolkata')::date
    = (now()        AT TIME ZONE 'Asia/Kolkata')::date;
```

### Trend Chart — Daily filing volume (rolling 30 days, IST)
```sql
SELECT (announced_at AT TIME ZONE 'Asia/Kolkata')::date AS filing_date,
       COUNT(*)                              AS total,
       COUNT(*) FILTER (WHERE is_high_alpha) AS high_alpha
FROM india_bourse_filings_v1
WHERE announced_at >= now() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 ASC;
```

### Category Breakdown (for a pie / bar over a window)
```sql
SELECT category_group, COUNT(*) AS n
FROM india_bourse_filings_v1
WHERE announced_at >= now() - INTERVAL '7 days'
GROUP BY category_group
ORDER BY n DESC;
```

---

## Lijo Prod Verification SQL
Read-only health checks to run directly on the production database.

### 1. Row count + freshness (collection health / Go-No-Go)
```sql
-- latest_filing should be < ~2 h old during market hours if the hourly cron is live.
SELECT COUNT(*)            AS total_rows,
       MIN(announced_at)   AS earliest,
       MAX(announced_at)   AS latest_filing,
       MAX(created_at)     AS last_insert
FROM india_bourse_announcements;
```

### 2. View vs base-table parity
```sql
-- Must be equal — the view filters/mutates nothing, only adds derived columns.
SELECT (SELECT COUNT(*) FROM india_bourse_announcements) AS base_rows,
       (SELECT COUNT(*) FROM india_bourse_filings_v1)    AS view_rows;
```

### 3. Classification coverage (how much falls through to `other`)
```sql
-- If `other` dominates, tune the taxonomy ILIKE patterns above.
SELECT category_group, COUNT(*) AS n,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM india_bourse_filings_v1
GROUP BY category_group
ORDER BY n DESC;
```

### 4. PDF capture rate
```sql
SELECT COUNT(*) FILTER (WHERE attachment_url IS NOT NULL) * 100.0 / COUNT(*) AS pdf_pct
FROM india_bourse_announcements;
```

---

## UI Reference Specifications

Dashboard repo renders, no styling owned here. Recommended layout for the filings view:

- **KPI strip:** "Filings today" + "High-alpha today" + "Latest filing" (relative time).
- **Filter chips:** category groups, with the **high-alpha set preselected by default**.
- **Feed/table:** `announced_at` (IST, relative + absolute on hover) · `symbol` · `company_name`
  · `category` (raw text, colour-keyed by `category_group`) · `subject` (truncated) · PDF link.
- **Symbol search box** → drill-down query.
- **Volume sparkline:** rolling 30-day daily filing count (high-alpha overlaid).
- Each row's PDF link opens `attachment_url` in a new tab. Show an XBRL badge when `has_xbrl`.
- Empty/weekend state: "No filings in this window" — never an error (matches V2-018 Decision 7).

Persona fit (`R00` packet): **fundamental investor** uses symbol drill-down + high-alpha
filter for diligence; **ex-F&O swing trader** uses the live today/30-day volume + board-outcome
/ M&A chips for event spotting.

---

## Pipeline Context & Constraints

- **Data owner:** V2-018 (`scripts/seed-india-announcements.mjs` + `_nse-announcements-source.mjs`).
  This contract adds only the read-only `india_bourse_filings_v1` view. No write path, no cron change.
- **Update cadence:** hourly Railway cron (`seed-india-announcements.mjs`, 2-day IST window,
  `ON CONFLICT DO NOTHING`). ⚠️ **Dependency:** the V2-018 completion log (2026-05-22) notes the
  hourly Railway cron is the **one remaining operational step**. Until Lijo creates it, the table
  is fresh only through the 2026-05-22 backfill (no forward growth). Verify with check #1 before
  trusting "today's filings".
- **Source = NSE only** in V1 (`source='nse'`). BSE is a documented stub (V2-018 Decision 5) —
  no `'bse'` rows will appear yet; the queries already include `source` for when it lands.
- **Immutability:** filings are append-only; rows never change after insert. No supersede/refresh
  logic — unlike `india_flow_metrics`, nothing here needs re-materialisation.
- **Prod-execution boundary:** Lijo runs `migrate-india-signals.mjs` (to create the view) against
  prod after review. The agent writes DDL + read-only verification SQL only.
- **Prod DB host for laptop scripts:** `trolley.proxy.rlw.net` (Railway public proxy), not the
  `*.railway.internal` host (won't resolve off-Railway).

---

## Success Criteria

- [ ] `india_bourse_filings_v1` view DDL appended to `scripts/migrate-india-signals.mjs`
      (`CREATE OR REPLACE VIEW`, idempotent), with a matching `console.log` confirmation line.
- [ ] `git diff` shows only `scripts/migrate-india-signals.mjs` touched — no `seed-*.mjs`,
      no `src/`, no `api/`, no variant files (sacred boundaries intact).
- [ ] `npm run typecheck` → 0 errors · `npx biome check .` → 0 errors.
- [ ] Lijo has run the migration against prod; verification check #2 shows `base_rows = view_rows`.
- [ ] Classification coverage (check #3) reviewed; `other` share acceptable or taxonomy tuned.
- [ ] Dashboard repo wired to the queries above (feed + high-alpha filter + symbol drill-down + KPI).
- [ ] (Operational) hourly cron confirmed live so the feed grows past the backfill date.

---

## Completion Log

- [ ] View DDL added to `migrate-india-signals.mjs`
- [ ] Typecheck 0 / Biome 0 / sacred diffs empty
- [ ] Handoff to Lijo: migration run against prod + parity verified
- [ ] Dashboard repo wired to filings queries
- [ ] Hourly cron confirmed (operational)
