# Task V2-027 — NPCI / NETC FASTag Toll Volumes (Daily + Monthly)

*SachNetra Adapt Sprint — quant data layer (alt-data goods-and-mobility proxy; "cheap win" #4 in the post-V2-030 sequencing per `sachnetra_quant_roadmap.md` 2026-05-22 execution refocus — paired sibling to V2-026 POSOCO electricity).*

**Depends on**: None (independent non-news source). Reuses the standard `pg.Pool` + `runSeed()` + JSON-`fetch()` shape from V2-018/V2-026/V2-030 — no new TLS dance, no warm-up.
**Estimated time**: 2–3 h (JSON parse + Indian-comma/non-breaking-space cleaner + monthly+daily dual-cadence walk are the only non-trivial bits; no new dependencies).
**Prep doc**: `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_quant_roadmap.md` (Tier 6 — "FASTag Toll Volumes, ~2–3 h, goods-movement proxy / free")
**V1 or V2**: V2 (quant data layer — V2-011 → V2-029 series; V2-027 is filed immediately after V2-026 and shares its sprint shape)

---

## Context Manifest
*Read these BEFORE any code work. Skip the "Don't load" list to save tokens.*

### Load (in order)
1. `CLAUDE.md` — auto-loaded; verify Sacred Files list (V2-027 touches NONE of them)
2. `.agents/rules/sachnetra-boundaries.md` — V2 scope guard; NPCI is a public-data API for a national-payments cooperative (RBI-promoted) and qualifies under the data-layer clarification
3. `.agents/rules/sachnetra-patterns.md` — `runSeed()` shape + Railway cron contract
4. `.agents/rules/sachnetra-context.md` — V2 Entry Points block (non-news collectors are independent)
5. **The sibling tasks — read as templates:**
   - `ai_docs/tasks/V2-026_posoco_electricity.md` — **the structural twin filed just before this one**: separate-cron / status-key / data-to-PostgreSQL / append-only `DO NOTHING` / chunked backfill / "ONE table + a `row_type` discriminator column" / read-only self-checks / Lijo-runs-prod. V2-027 mirrors this shape exactly. The differences: source is a clean public JSON API (NOT XLS); no TLS quirk; the cadence is dual (daily + monthly into one table); the backfill walks two separate axes.
   - `ai_docs/tasks/V2-030_nse_bulk_block_deals.md` — reference for the daily seed + chunked backfill cadence (`runSeed()` daily, `backfill-*.mjs` walked separately by Lijo).
   - `ai_docs/tasks/V2-018_nse_bourse_announcements.md` — for the `_*-upsert.mjs` batched-upsert pattern (V2-018 introduced it; V2-027 reuses the shape).
6. **The committed V2-018/V2-026/V2-030 implementation — copy the SHAPE, not source quirks:**
   - `scripts/_nse-announcements-source.mjs` — adapter SHAPE (fetch + normalize split). V2-027's "warm-up" is a no-op — NPCI's `/api/` path bypasses the WAF entirely (recon-confirmed).
   - `scripts/_announcements-upsert.mjs` — batched `INSERT … VALUES (…),(…) ON CONFLICT DO NOTHING` pattern. V2-027 copies this 1:1 (with different columns).
   - `scripts/seed-india-announcements.mjs` — `runSeed()` collector template.
   - `scripts/migrate-india-signals.mjs` — DDL is appended to the single template string; the V2-030 deals block ends at line 245 (just before the closing backtick on 246); the matching `console.log` lines end at line 298. V2-027's DDL appends after 245; V2-027's logs append after 298.
7. **Recon (already done — transcribe, don't re-run):**
   - `scratch/V2-027_fastag_recon_checklist.md` — confirmed hosts / endpoints / payload shape / dedup key / backfill floors / cadence / WAF-bypass-via-`/api/`. Full appendix transcribed below in §Research Appendix.
   - `scratch/fastag_latest.json` (monthly, March 2026), `scratch/fastag_latest_daily.json` (daily, May 2026 MTD), `scratch/fastag_2016_17.json` ... `scratch/fastag_2025_26.json` (10 fiscal years monthly), `scratch/fastag_daily_2021_june.json` / `_2023_january` / `_2024_june` / `_2025_december` / `_2026_march` / `_2026_may` (daily samples spanning 2021→2026). The parser must work across all of them (schema is confirmed 100% stable, but the `"NA"` / Indian-comma / non-breaking-space cases live in the historical samples — verify on them).
   - `scratch/parse_fastag_sample.js` — the **daily + monthly normalization blueprint**; copy the algorithm (the `monthMap` + `cleanNum` + `parseDailyDate` + `parseMonthlyDate` helpers).
8. **Code files** — see "Files To Open Before Starting"

### Don't load (not relevant — skip to keep context tight)
- `ai_docs/prep/*`, `ai_docs/SACHNETRA_BUILD_GUIDE.md` — V1-era, superseded
- `wiki/concepts/*`, `wiki/playbooks/*`, `cluster_story_entity_architecture.md` — V2-027 is non-news, non-cluster, pure ingestion (no thread/entity fan-out)
- `tasks/00*_*.md` — archived V1 tasks
- `scripts/seed-india-signals.mjs` internals, `_thread-linker.mjs`, `_entity-fan-out.mjs` — news pipeline, unrelated
- `src/`, `api/`, `src/config/variants/*` — no frontend/variant/edge work in this task
- The **dead-end recon scripts** in `scratch/`: every `test_npci_*`, `test_ihmcl_*`, `fetch_npci_playwright*`, `parse_ihmcl_links`, `extract_uploads`, `download_ihmcl_sample`, `extract_*pdf*`, `download_zip`, `list_zip_contents`, `download_monthly_etc`, `download_npci_page`, `download_npci_js*`, `parse_npci_scripts`, `parse_npci_tabs`, `parse_netc_*` probes are **reference-only**. The Playwright + IHMCL-PDF + tab-discovery dead ends taught us "NPCI `/api/` is the canonical path" — they are NOT a template for the seed. **Only `parse_fastag_sample.js` is the algorithm to port to `_npci-source.mjs`.**

### Skill / template lineage
- Generated by: `/task` skill (`ai_docs/dev_templates/adapt_sprint_task.md`)
- Source research: Gemini/Antigravity agent (artifacts in `scratch/`, 2026-05-24) — see §Research Appendix
- Bugfix during execution: `/bugfix` · Commit: `/git` · Summary: `/diff`

---

## Context — Current State

- **No FASTag / toll-volume data exists anywhere in the codebase.** Brand-new, independent, **non-news** source. Does NOT flow through `india_news_signals`, clustering, threads, entity timeline, Groq, or the Redis news digest.
- `scripts/_seed-utils.mjs` exports `loadEnvFile`, `getRedisCredentials`, `runSeed`, `CHROME_UA`, `sleep`. `seed-india-electricity.mjs` (V2-026, sibling sprint) and `seed-india-deals.mjs` (V2-030) are the closest reference consumers; their `_*-upsert.mjs` modules are the batched-upsert template.
- `scripts/migrate-india-signals.mjs` is the DDL runner; V2-012/013/014/017/018/019/020/024/030/026 (etc) all append to its single `DDL` template string. V2-027 appends one more `CREATE TABLE`.
- **No new dependency** — `node:fetch` is sufficient; no parser library needed (data is already JSON). No `xlsx`, no PDF library.
- `DATABASE_URL` / `DATABASE_PUBLIC_URL` already exist in `.env.local` + Railway — reused; **no new env var**.
- Source reconnaissance is **complete** (Gemini agent, 2026-05-24). Real JSON samples (10 monthly fiscal years 2016-17 → 2025-26 + 6 daily-month snapshots spanning Jun 2021 → May 2026) saved in `scratch/`. Throwaway recon, NOT shipped code.
- **No TLS dance, no warm-up, no cookie.** Recon confirmed the WAF (F5 BIG-IP) protects the HTML rendering path but exempts the underlying `/api/product-statistic/` JSON endpoints — a plain Node `fetch()` with a normal UA returns 200 + clean JSON. This is the **decisive** finding that takes V2-027 from "Playwright headless-browser job" to "2–3 h JSON walk".

## What This Task Does

- Adds `india_fastag_toll_volumes` table via `scripts/migrate-india-signals.mjs` (DDL only; Lijo runs the migration).
- Adds `scripts/_npci-source.mjs` (NEW) — adapter: `fetchMonthly(yearRange)` + `fetchDailyMonth({year, monthName})` (both hitting `webapi.npci.org.in/api/product-statistic/tab/detail`) + `parseMonthlyPayload(json)` + `parseDailyPayload(json)` + `cleanNum`/`parseDailyDate`/`parseMonthlyDate` helpers ported from `scratch/parse_fastag_sample.js`.
- Adds `scripts/_fastag-upsert.mjs` (NEW) — batched `INSERT … VALUES …, … ON CONFLICT (target_date, row_type) DO NOTHING` (copy of V2-018's `_announcements-upsert.mjs` shape, 6 columns).
- Adds `scripts/seed-india-fastag.mjs` (NEW) — a **daily** collector: fetch the current month's daily payload + the current fiscal year's monthly payload → parse both → upsert both into the one table.
- Adds `scripts/backfill-india-fastag.mjs` (NEW) — one-time idempotent walk: (a) every monthly fiscal-year payload from `2016-17` to current; (b) every daily-month payload from June 2021 to current. Both upserted via the same upsert helper.
- Registers a **separate daily** Railway cron at ~12:00 IST / 06:30 UTC (operational note for Lijo — not a code change). Slightly later than V2-026's 11:00 IST because NPCI's daily data has a deliberate D+3/D+4 publish lag — cron timing within the day doesn't matter much.

---

## The 11 Locked Decisions
*Resolved with Lijo (2026-05-24) after Gemini-agent source recon. Do not re-derive.*

### Decision 1 — Source: **NPCI `/api/product-statistic/` JSON (IHMCL PDF and PIB prose REJECTED)**
The pipeline uses two NPCI Strapi-CMS endpoints:

1. **Monthly aggregates (national)** — `GET https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-fas-tag-statistics&year_range=<YYYY-YY>&excel_type=monthly&page_no=1&page_size=20&locale=en` — returns up to 12 monthly rows for a fiscal year, each carrying `month` ("March-2026"), `no_of_banks_live_on_netc`, `tag_issuance_in_nos`, `volume_in_mn`, `amount_in_cr`.
2. **Daily aggregates (national)** — `GET https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-daily-statistics&year=<YYYY>&month=<MonthName>&excel_type=daily&page_no=1&page_size=50&locale=en` — returns the calendar month's daily rows plus a `Total` footer row. Each daily row: `npci_day` ("March 01, 2026"), `netc_volume_mn`, `netc_value_crores`.

**Why NPCI, not IHMCL or PIB — decisive (verified):**
- **IHMCL** publishes a `etc-transaction-reports/` page with **only PDFs and ZIP-of-PDFs** of per-plaza monthly statistics. Parsing them requires a brittle layout-aware PDF parser for ~1,200 plaza rows × 12 vehicle categories per month. **Rejected** — the build cost dwarfs the alpha at this stage.
- **NHAI / PIB press releases** restate the same NPCI headline numbers in prose form. **Rejected as primary** but **used as a cross-check** (the PIB release "March 2026 FASTag transactions of 36.38 Crore worth ₹7,193.25 Crore" matches our monthly NPCI payload byte-for-byte).
- **`data.gov.in`** mirrors NPCI but lags by months and requires a registered API key. **Rejected**.

V2-027 ingests **national-only** aggregates (Decision 4). Per-plaza data is a clean follow-up if the IHMCL PDF parse ever earns a sprint of its own — out of V2-027 scope.

### Decision 2 — Transport: **plain Node `fetch()` with `CHROME_UA`. NO warm-up, NO cookie, NO TLS quirk.**
Recon proved that the F5 BIG-IP WAF guards the HTML rendering path (`/what-we-do/...` and the Strapi-CMS asset bundle) but **exempts `/api/product-statistic/`**. A direct `fetch(URL, { headers: { 'User-Agent': CHROME_UA, Accept: 'application/json' }})` returns 200 + parsed JSON cleanly.

**Why this matters**: V2-026 needed a per-call undici `Agent({connect:{rejectUnauthorized:false}})` for grid-india's broken cert chain. **V2-027 needs nothing of the sort.** Do NOT import undici. Do NOT pass any dispatcher. Do NOT attempt Playwright (the recon dead-ends in `scratch/fetch_npci_playwright*.mjs` are a warning, not a template). If a future NPCI infra change ever returns a 403/503, the fix is to add the `CHROME_UA` `Origin` + `Referer` headers — NOT to escalate to a browser.

### Decision 3 — Cron model: **separate DAILY script + separate Railway cron**
`scripts/seed-india-fastag.mjs`, its own Railway cron, scheduled once daily at **≈12:00 IST (06:30 UTC)**. NPCI's daily data publishes **with a 3–4 day lag** (e.g. on May 24 the latest available day is May 20) — so cron timing within the day doesn't materially change what's captured; once-daily is sufficient.

**Why**: Once-daily cadence (matches V2-026 / V2-030). Separate cron = failure isolation (V2-017 Decision 2 / V2-018 Decision 2 / V2-026 Decision 3 / V2-030 Decision 2). `runSeed()` provides the distributed lock + freshness meta + exit-0 contract. Canonical Redis key is a *status* key only (`news:fastag:v1:india`) — data → PostgreSQL. Does NOT read `news:digest:v1:india:en`.

### Decision 4 — Storage: **one table `india_fastag_toll_volumes` + a `row_type` column**
Daily and monthly rows share a common shape (a single national time-series of `transaction_count` + `transaction_value_inr`) but the monthly rows carry two additional columns (`active_tags`, `live_banks`). Store both in ONE table with `row_type TEXT` discriminator (`'daily_national' | 'monthly_national'`). `active_tags` + `live_banks` are NULL for daily rows.

**Why**: same data point per (date, row_type) — splitting into `india_fastag_daily` + `india_fastag_monthly` would force every quant query to UNION. The discriminator keeps cross-cut queries (e.g. "sum-of-daily for March vs the monthly headline" sanity check) trivial. Mirrors V2-026's Section-A-vs-Section-C decision and V2-030's `deal_type` rationale.

### Decision 5 — Idempotency: **natural composite PK `(target_date, row_type)`; append-only `ON CONFLICT DO NOTHING`**
For daily: `target_date` = the calendar day (`'2026-03-01'`). For monthly: `target_date` = the **first of the month** (`'2026-03-01'` for "March-2026") — a deliberate convention so both row types live in the same `DATE` column without ambiguity.

**Verified collision-free** by the recon parser across all 10 monthly + 6 daily sample files (different month-end footers; no day/month confusion).

**Why append-only `DO NOTHING`, not supersede**: NPCI publishes reconciled cleared-transaction counts. Historical days/months are immutable in practice (no observed restatements across the 2016 → 2026 history). The incremental daily-month update only **adds new days** — existing days are unchanged, so the next day's cron run inserts the new day and harmlessly hits `DO NOTHING` on the days it already wrote. Same philosophy as V2-018/V2-026/V2-030. If NPCI ever does restate a number, the recovery path is a manual `DELETE` of the affected rows + a re-run — not a runtime `DO UPDATE` that risks silently overwriting prod values on a bad fetch.

### Decision 6 — Backfill floors: **monthly 2016-11-01, daily 2021-06-01.**
The NPCI API serves monthly data back to **November 2016** (verified — `scratch/fastag_2016_17.json` returns 5 records ending in Nov 2016). The earliest months (Nov 2016 → ~mid-2017) carry `"NA"` for `volume_in_mn` and `amount_in_cr` while still reporting `tag_issuance_in_nos` and `no_of_banks_live_on_netc` — capture them; the `"NA"` cleaner returns null (Decision 7), so the row inserts with NULL volume/value but real tag/bank counts.

Daily data goes back only to **June 2021** (verified). Pre-June-2021 daily-month queries return an empty `results` array; the backfill walks gracefully past them.

`scripts/backfill-india-fastag.mjs` walks two axes:
1. **Monthly axis**: every fiscal year from `"2016-17"` to the current fiscal year (e.g. `"2025-26"`). One API call per fiscal year (≤ 11 calls today).
2. **Daily axis**: every `(year, monthName)` pair from `(2021, "June")` to the current `(year, currentMonthName)`. One API call per month (~60 calls today).

~300 ms sleep between calls (politeness; the recon noted no rate-limit issues). Idempotent — safe to re-run.

### Decision 7 — Number/date cleaner (port `scratch/parse_fastag_sample.js`)
The payload has **three string-format quirks** to handle in `cleanNum(raw)`:

1. **Mixed comma conventions**: `tag_issuance_in_nos` appears as `"122,452,408"` (Western, 9-digit) in some rows AND `"12,12,03,946"` (Indian lakh/crore comma grouping) in others. **Stripping all commas works for both** (yields `122452408` and `121203946` respectively). The cleaner does `String(val).replace(/,/g, '')` — order-of-magnitude is preserved because Indian and Western comma grouping never changes the digit sequence, only the grouping.
2. **Non-breaking spaces**: some `amount_in_cr` values have trailing ` ` (`"7,046.40 "`). The cleaner strips those.
3. **`"NA"` placeholder**: pre-2017 monthly rows carry `"NA"` for unreported metrics. The cleaner returns `null` for `"NA"`, `""`, `"-"`, `null`, `undefined`.

```javascript
function cleanNum(val) {
  if (val == null || val === '' || val === 'NA' || val === '-') return null;
  const cleaned = String(val).replace(/,/g, '').replace(/ /g, '').trim();
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}
```

### Decision 8 — Unit conversion: **store raw count + raw INR, NOT million/crore.**
- `volume_in_mn` / `netc_volume_mn` reported in **Millions** of transactions → multiply by `1_000_000` and round to `BIGINT` for `transaction_count`.
- `amount_in_cr` / `netc_value_crores` reported in **Crores of ₹** (1 Cr = 10⁷ ₹) → multiply by `10_000_000` and store as `NUMERIC` for `transaction_value_inr`.

**Why store raw, not source units**: every downstream quant query becomes unit-ambiguous if we store "363.76" (is that million? crore? raw?). Storing `transaction_count = 363760000` (BIGINT raw) and `transaction_value_inr = 71932500000000` (NUMERIC raw ₹) makes `SELECT SUM(...)`, ratios, and cross-source comparisons (e.g. FII flows in ₹ Cr from V2-017) unambiguous at the SQL layer. Convert back to human units in the application layer if needed.

### Decision 9 — Date parsing: **TZ-safe components-to-date construction.**
NPCI date strings are timezone-naive prose (`"March 01, 2026"` for daily; `"March-2026"` for monthly). **Never** parse via `new Date(string)` — it would interpret as UTC and the IST-vs-UTC offset would shift the day around midnight. Parse the components (monthName + day + year) and assemble:

- Daily: `targetDate = \`${year}-${mm}-${dd}\`` where `mm = monthMap[monthName] + 1` zero-padded.
- Monthly: `targetDate = \`${year}-${mm}-01\`` (first of the month — Decision 5 convention).

`monthMap` accepts both full month names (`"March"`) and the three-letter prefixes (`"Mar"`) for safety. Implemented exactly as in `scratch/parse_fastag_sample.js` lines 4–8.

### Decision 10 — Footer-row skip: **drop daily rows where `npci_day === 'Total'` OR `isTotal === true`.**
The daily payload's `results` array ends with a Total row carrying the calendar-month aggregate (e.g. `{npci_day: "Total", netc_volume_mn: "363.76", netc_value_crores: "7193.25", isTotal: true}`). The parser must skip it — otherwise we'd insert a phantom row with a non-parseable date and inflate the database by ~30 rows-worth of double-counting if anything ever SUMs over `row_type='daily_national'`.

The skip check uses **both** signals (`npci_day === 'Total'` OR `isTotal === true`) because NPCI populates them inconsistently across years (some early-2022 payloads have `isTotal` missing).

### Decision 11 — Scope: **pure ingestion — NO entity_timeline fan-out, NO state-keyword coupling, NO plaza-level data.**
V2-027 only stores raw rows in `india_fastag_toll_volumes`. It does NOT write to `entity_timeline`, `india_news_signals`, threads, the Redis news digest, or `shared/market-taxonomy.json`. National-only — plaza-level IHMCL PDF parse is **explicitly out of scope** (Decision 1) and would be a separate `V2-027b` if ever warranted.

### Decision 12 — Prod-execution boundary
Per `memory/feedback_v2_prod_execution.md`: this task delivers **code + DDL + read-only self-checks only**. **Lijo runs** `migrate-india-signals.mjs`, the daily seed, and the backfill against prod after review. The agent does NOT run the parser or migration against prod, does NOT create/run `scratch/` probes (Gemini agent's job). **James implements** from this file.

---

## Schema (Locked)

Append to the `DDL` template string in `scripts/migrate-india-signals.mjs` (after the V2-030 deals block — line 245, immediately before the closing backtick on line 246) + matching `console.log` lines (after line 298):

```sql
-- V2-027 NPCI / NETC FASTag national toll volumes (daily + monthly). Independent
-- non-news source: no FK to other tables (Decision 11). One table for both
-- cadences via row_type (Decision 4). Natural composite PK — no surrogate hash
-- (Decision 5). Append-only ON CONFLICT DO NOTHING — NPCI reports are
-- immutable in practice; incremental daily updates only add new days.
CREATE TABLE IF NOT EXISTS india_fastag_toll_volumes (
  target_date            DATE NOT NULL,        -- daily: the day; monthly: 1st of month (Decision 5)
  row_type               TEXT NOT NULL,        -- 'daily_national' | 'monthly_national'
  transaction_count      BIGINT,               -- raw count = volume_in_mn × 1e6 (Decision 8)
  transaction_value_inr  NUMERIC,              -- raw ₹ = amount_in_cr × 1e7 (Decision 8)
  active_tags            BIGINT,               -- monthly only; tag_issuance_in_nos cleaned (Decision 7)
  live_banks             INTEGER,              -- monthly only; no_of_banks_live_on_netc
  source                 TEXT NOT NULL DEFAULT 'npci',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (target_date, row_type)
);
CREATE INDEX IF NOT EXISTS idx_fastag_date          ON india_fastag_toll_volumes (target_date DESC);
CREATE INDEX IF NOT EXISTS idx_fastag_row_type_date ON india_fastag_toll_volumes (row_type, target_date DESC);
```

Upsert shape (daily + backfill):
```sql
INSERT INTO india_fastag_toll_volumes
  (target_date, row_type, transaction_count, transaction_value_inr, active_tags, live_banks)
VALUES ($1,$2,$3,$4,$5,$6)
ON CONFLICT (target_date, row_type) DO NOTHING;
```

---

## Pipeline Flow

```
Daily Railway cron (≈06:30 UTC) → runSeed('india','fastag','news:fastag:v1:india', fetchFastag)

fetchFastag():
  1. now = todayIST
  2. dailyJson   = fetchDailyMonth({year: now.year, monthName: now.monthName})    [Decision 1]
  3. monthlyJson = fetchMonthly(fiscalYearRangeFor(now))                          [Decision 1]
  4. dailyRows   = parseDailyPayload(dailyJson)
       - skip rows where npci_day==='Total' OR isTotal===true                     [Decision 10]
       - per row → cleanNum(volume_in_mn)*1e6 → transaction_count                 [Decisions 7, 8]
       -            cleanNum(amount_in_cr)*1e7 → transaction_value_inr            [Decisions 7, 8]
       -            parseDailyDate(npci_day) → target_date                        [Decision 9]
       -            row_type='daily_national', active_tags=null, live_banks=null  [Decision 4]
  5. monthlyRows = parseMonthlyPayload(monthlyJson)
       - per row → same cleanNum + unit conversion for volume/amount              [Decisions 7, 8]
       -            cleanNum(tag_issuance_in_nos) → active_tags                   [Decisions 7]
       -            cleanNum(no_of_banks_live_on_netc) → live_banks               [Decision 7]
       -            parseMonthlyDate(month) → target_date (= 1st of that month)   [Decisions 5, 9]
       -            row_type='monthly_national'                                   [Decision 4]
  6. rows = dailyRows.concat(monthlyRows)
  7. upsertFastag(pool, rows) → batched INSERT … ON CONFLICT (…) DO NOTHING       [Decision 5]
  8. return { fetched_daily: dailyRows.length, fetched_monthly: monthlyRows.length, written, target_date: now.iso } → runSeed → status key

backfill-india-fastag.mjs (one-time, Lijo runs):
  - MONTHLY axis (smaller, run first — Decision 6):
      for fyRange in fiscalYearsFrom('2016-17') to currentFY:
        monthlyJson = fetchMonthly(fyRange)
        rows = parseMonthlyPayload(monthlyJson)
        upsertFastag(pool, rows)
        sleep(300ms)
  - DAILY axis (larger; Decision 6):
      for (year, monthName) in monthsFrom(2021, 'June') to (currentYear, currentMonthName):
        dailyJson = fetchDailyMonth({year, monthName})
        rows = parseDailyPayload(dailyJson)
        upsertFastag(pool, rows)
        sleep(300ms)
  - log per-call inserted/skipped + grand totals; idempotent, safe to re-run.
```

---

## Research Appendix — Source Recon (Gemini agent, 2026-05-24)
*Confirmed from `scratch/` probes + 10 monthly fiscal-year JSON samples spanning 2016-17 → 2025-26 + 6 daily-month JSON samples spanning Jun 2021 → May 2026. All checklist items checked. Full detail in `scratch/V2-027_fastag_recon_checklist.md` §Part A–E.*

### Canonical hosts
- Main landing (HTML, WAF-protected): `https://www.npci.org.in/what-we-do/netc-fastag/product-statistics` (redirects to `/product/netc/product-statistics`).
- **Public JSON API (WAF-exempted)**: `https://www.npci.org.in/api/product-statistic/...` — this is the V2-027 entry point.
- Discovery aid: `https://www.npci.org.in/api/product-statistic/tabs?locale=en` returns the catalog of all NETC tabs. The two relevant tabs are `netc-fas-tag-statistics` (monthly) and `netc-daily-statistics` (daily).
- **NO TLS quirk**: standard Node `fetch()` with `CHROME_UA` works. **NO cookie warm-up.** **NO `Origin`/`Referer` required** (though adding them is harmless if a future infra change demands them).

### Endpoints
- **Monthly (per fiscal year)**: `GET https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-fas-tag-statistics&year_range=<YYYY-YY>&excel_type=monthly&page_no=1&page_size=20&locale=en`. Response: `{status:200, data:{table_headers:{...}, totalCount, results:[…]}}`. `results` carries up to 12 rows for the fiscal year (Apr-Mar; pre-2017 fiscal year may have fewer).
- **Daily (per calendar month)**: `GET https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-daily-statistics&year=<YYYY>&month=<MonthName>&excel_type=daily&page_no=1&page_size=50&locale=en`. Response: same envelope. `results` carries N daily rows (= days in month with data) + 1 `Total` footer row.
- Status: `200` MIME `application/json; charset=utf-8`. Body size: ~5–10 KB per call.

### Payload shape (confirmed stable across 2016 → 2026; no drift)
- **Monthly `results` row keys**: `month` ("March-2026"), `no_of_banks_live_on_netc` ("40"), `tag_issuance_in_nos` ("122,452,408" or "12,12,03,946"), `volume_in_mn` ("363.76" or "NA"), `amount_in_cr` ("7193.25" or "7,193.25" with optional trailing ` `).
- **Daily `results` row keys**: `npci_day` ("March 01, 2026" or "Total"), `row_number` (number or null), `month` ("March"), `year` ("2026"), `netc_volume_mn`, `netc_value_crores`. Footer row also carries `isTotal: true`.
- **Schema drift**: zero — diffed `fastag_2016_17.json` vs `fastag_2025_26.json`, keys are identical. Diffed `fastag_daily_2021_june.json` vs `fastag_daily_2026_may.json`, keys are identical.

### Field types & quirks
- `volume_in_mn` / `netc_volume_mn` in **Millions of transactions** → ×1e6 → raw `transaction_count` (Decision 8).
- `amount_in_cr` / `netc_value_crores` in **Crores of ₹** → ×1e7 → raw `transaction_value_inr` (Decision 8).
- **Indian comma format** (`"12,12,03,946"`) coexists with **Western** (`"122,452,408"`); strip all commas (Decision 7).
- **Trailing non-breaking spaces** appear on some `amount_in_cr` values (` `); strip (Decision 7).
- **`"NA"` placeholder** appears for pre-mid-2017 monthly metrics; return `null` (Decision 7).
- **TZ-naive prose dates** ("March 01, 2026" / "March-2026") — parse via components, not `new Date(string)` (Decision 9).
- **Footer row** in daily payloads (`npci_day==='Total'` OR `isTotal===true`); skip (Decision 10).

### Cadence
- **Daily**: updated incrementally with a **3–4 day lag** (e.g. on May 24, the latest available day is May 20). Reports published every calendar day including weekends/holidays (NPCI settles continuously).
- **Monthly**: published in the **1st week of the following calendar month** (e.g. March 2026 monthly row appeared 2026-04-28 per the sample's `createdAt`).
- **Collector cron**: daily ≈12:00 IST / 06:30 UTC.

### History depth (proven against the live API)
- Monthly: back to **November 2016** (10 fiscal years; ≤ 120 rows total).
- Daily: back to **June 2021** (~60 calendar months; ~1,800 rows total).
- **Total backfill volume**: < 2,000 rows. Tiny.

### Idempotency & dedup
- **No stable per-row source id** (the `id` field is a Strapi-CMS internal ID and could be revised).
- **Composite natural key `(target_date, row_type)`** — verified collision-free across all 10 monthly + 6 daily samples in `scratch/parse_fastag_sample.js`. Append-only `DO NOTHING` (Decision 5).

### Probe scripts (reference only — DO NOT model the seed on these)
- `scratch/parse_fastag_sample.js` — **the algorithm to port** (cleanNum + monthMap + parseDailyDate + parseMonthlyDate + per-row normalization).
- `scratch/save_npci_json.mjs`, `scratch/test_npci_api_direct.mjs` — prove the `/api/` path is WAF-exempt.
- `scratch/fetch_complete_history.mjs`, `scratch/fetch_daily_samples.mjs` — prove the backfill walks both axes successfully.
- `scratch/fetch_npci_playwright*.mjs`, `scratch/download_ihmcl_sample.mjs`, `scratch/extract_*pdf*` — **dead ends** (WAF-via-Playwright + IHMCL PDF + monthly-ETC PDF). Confirmed that IHMCL is PDF-only and NPCI HTML is WAF-protected; both led the recon to the JSON `/api/` endpoint as the canonical path.

---

## Success Criteria

This task is complete when ALL of the following are true:

- [ ] `india_fastag_toll_volumes` DDL added to `scripts/migrate-india-signals.mjs` (table + 2 indexes), idempotent (`IF NOT EXISTS`); matching `console.log` lines added in the existing block (after line 298 pattern).
- [ ] `scripts/_npci-source.mjs` exists — exports `fetchMonthly(yearRange)`, `fetchDailyMonth({year, monthName})`, `parseMonthlyPayload(json)`, `parseDailyPayload(json)`, `cleanNum(v)`, `parseDailyDate(s)`, `parseMonthlyDate(s)`, `fiscalYearRangeFor(date)`, `monthsBetween(startYear, startMonthIdx, endYear, endMonthIdx)`. **No undici import. No dispatcher. No `rejectUnauthorized:false` anywhere.**
- [ ] `scripts/_fastag-upsert.mjs` exists — batched `INSERT … VALUES …, … ON CONFLICT (target_date, row_type) DO NOTHING`. Modeled on `_announcements-upsert.mjs` (6 columns; batch size ~500). Exports `upsertFastag(pool, rows): Promise<number>` returning inserted count.
- [ ] `scripts/seed-india-fastag.mjs` exists, uses `runSeed()`, daily cadence; fetches today's `(year, monthName)` daily payload + today's fiscal year monthly payload; parses both; upserts both into the one table; exits 0 on every path (incl. "API 503" or "empty results").
- [ ] `scripts/backfill-india-fastag.mjs` exists — walks the **monthly axis** from `"2016-17"` to current FY first; then walks the **daily axis** from `(2021, "June")` to current month; ~300ms sleep between calls; logs per-call + grand totals; idempotent (`DO NOTHING`).
- [ ] `cleanNum` correctly handles all four quirky cases verified against the recon samples: `"122,452,408"` → `122452408`; `"12,12,03,946"` → `121203946`; `"7,046.40 "` → `7046.40`; `"NA"` → `null`.
- [ ] `parseDailyDate("March 01, 2026")` returns `"2026-03-01"` regardless of the host machine's timezone (assert via a unit-test-style log line on first run, OR by inspection).
- [ ] `parseMonthlyDate("March-2026")` returns `"2026-03-01"`.
- [ ] Daily-row parser **drops** both `npci_day==='Total'` AND `isTotal===true` rows; the daily-March-2026 sample yields exactly 31 rows (not 32).
- [ ] Unit conversion applied: `volume_in_mn=363.76` → `transaction_count=363760000` (BIGINT); `amount_in_cr=7193.25` → `transaction_value_inr=71932500000` (NUMERIC).
- [ ] Empty / "API returned empty results" path writes 0 rows, logs one line, exits 0.
- [ ] Does NOT read `news:digest:v1:india:en`; does NOT touch news pipeline / entity_timeline files (Decision 11). No `shared/market-taxonomy.json` changes. No plaza-level data anywhere.
- [ ] `git diff scripts/seed-insights.mjs` empty (sacred) · `git diff scripts/seed-india-signals.mjs` empty · `git diff scripts/seed-india-announcements.mjs` empty · `git diff scripts/seed-india-deals.mjs` empty · `git diff scripts/seed-india-electricity.mjs` empty · `git diff scripts/_grid-india-source.mjs` empty · `git diff scripts/_nse-announcements-source.mjs` empty · `git diff src/config/variants/*.ts` empty (sacred).
- [ ] `npm run typecheck` → 0 errors · `npx biome check .` → 0 errors.
- [ ] Lijo has run migration + first daily seed + backfill against prod (post-review; not done by agent).

---

## Second-Order Impact

- Affected consumers: **none** — new table, new scripts, no exported type/signature changes; nothing imports these yet.
- Performance: separate daily cron; 2 JSON API calls per run (~10 KB total). Zero impact on the 10-min news cron (decoupled).
- New dependency: **none** — native `fetch` + native `URLSearchParams` are sufficient.
- Variant bleed risk: **none** — no `src/`/`api/`/variant files touched.
- New env vars: **none** — reuses `DATABASE_URL` / `DATABASE_PUBLIC_URL`.
- **YELLOW**: a new **Railway cron schedule** (daily ≈06:30 UTC) — operational, Lijo. Note in completion log.
- **YELLOW**: dependency on NPCI's `/api/product-statistic/` path remaining WAF-exempt and the response envelope (`data.results[]`) remaining stable. Both have been stable from 2016 → 2026; if NPCI ever migrates to a new CMS, the task-file constants at the top of `_npci-source.mjs` localize the breakage to two lines.
- **YELLOW**: dependency on the field-key strings (`volume_in_mn`, `amount_in_cr`, `tag_issuance_in_nos`, `no_of_banks_live_on_netc`, `npci_day`, `netc_volume_mn`, `netc_value_crores`, `isTotal`). Isolate to documented constants at the top of `_npci-source.mjs` so a rename is a one-line fix.
- **RED-if-triggered**: if NPCI silently switches the unit on `volume_in_mn` from "Millions" to "raw count" (or `amount_in_cr` from "Crores" to "Lakh"), the parser will silently 1000×- or 10×-miscount. **A sanity-check on parse** — assert the most recent monthly `volume_in_mn` is between 1 and 1000 (i.e. 1 Mn–1 Bn transactions) and `amount_in_cr` is between 100 and 50000 — is a cheap guard. Add it. If it fails, log loudly and skip the upsert.

---

## Files To Open Before Starting

```
scripts/_seed-utils.mjs                  — runSeed() + CHROME_UA + loadEnvFile + sleep
scripts/_nse-announcements-source.mjs    — adapter SHAPE (not warm-up logic — V2-027 has none)
scripts/_announcements-upsert.mjs        — batched-upsert template to copy 1:1
scripts/seed-india-announcements.mjs     — runSeed() collector template
scripts/seed-india-deals.mjs             — V2-030 daily collector — closest cadence sibling
scripts/seed-india-electricity.mjs       — V2-026 daily collector — closest structural sibling (if shipped)
scripts/backfill-india-announcements.mjs — chunked backfill template
scripts/migrate-india-signals.mjs        — DDL runner; append after the V2-030 block (line 245)
scratch/parse_fastag_sample.js           — THE algorithm to port (cleanNum + date parsers + normalization)
scratch/fastag_latest.json               — March 2026 monthly sample (current FY tail)
scratch/fastag_latest_daily.json         — May 2026 daily MTD sample (incremental update behavior)
scratch/fastag_2016_17.json              — earliest monthly sample (5 records; "NA" placeholders)
scratch/fastag_daily_2021_june.json      — earliest daily sample (boundary)
scratch/fastag_daily_2026_march.json     — recent full daily month (31 days + footer)
scratch/V2-027_fastag_recon_checklist.md — full appendix
```

---

## Pattern To Follow

### `runSeed()` call shape (from `scripts/seed-india-announcements.mjs`):

```javascript
#!/usr/bin/env node
import { loadEnvFile, runSeed } from './_seed-utils.mjs';
loadEnvFile(import.meta.url);   // MUST be first

const CANONICAL_KEY = 'news:fastag:v1:india';   // STATUS key only — data → PostgreSQL
const CACHE_TTL = 86400;                         // daily

async function fetchFastag() { /* pipeline flow above; returns summary object */ }
function validate(d) { return typeof d === 'object' && d !== null; }

runSeed('india', 'fastag', CANONICAL_KEY, fetchFastag, {
  validateFn: validate, ttlSeconds: CACHE_TTL, sourceVersion: 'fastag-npci-json-v1',
}).catch((err) => { console.error('FATAL:', err.message || err); process.exit(0); });
```

Difference from the news cron: **no Redis read**, data target is PostgreSQL, status key is `news:fastag:v1:india`.

### External-fragility constants (top of `_npci-source.mjs`):

```javascript
import { CHROME_UA } from './_seed-utils.mjs';

// External-fragility constants — an NPCI CMS migration is a one-line fix here.
const NPCI_API_BASE       = 'https://www.npci.org.in/api/product-statistic/tab/detail';
const NPCI_TAB_MONTHLY    = 'netc-fas-tag-statistics';
const NPCI_TAB_DAILY      = 'netc-daily-statistics';
const NPCI_PRODUCT        = 'netc';
const NPCI_LOCALE         = 'en';
const NPCI_HEADERS        = { 'User-Agent': CHROME_UA, Accept: 'application/json' };

// Field-key constants — isolate so a NPCI rename is a one-line fix.
const FIELD = {
  MONTHLY_PERIOD : 'month',                    // "March-2026"
  MONTHLY_BANKS  : 'no_of_banks_live_on_netc', // "40"
  MONTHLY_TAGS   : 'tag_issuance_in_nos',      // "122,452,408" or "12,12,03,946"
  MONTHLY_VOLUME : 'volume_in_mn',             // "363.76" or "NA"
  MONTHLY_AMOUNT : 'amount_in_cr',             // "7193.25" or "7,046.40 "
  DAILY_DAY      : 'npci_day',                 // "March 01, 2026" or "Total"
  DAILY_VOLUME   : 'netc_volume_mn',
  DAILY_AMOUNT   : 'netc_value_crores',
  DAILY_IS_TOTAL : 'isTotal',
};
```

### Daily-payload parser (port from `scratch/parse_fastag_sample.js`):

```javascript
export function parseDailyPayload(json) {
  const results = json?.data?.results || [];
  const out = [];
  for (const row of results) {
    const dayLabel = row[FIELD.DAILY_DAY];
    if (!dayLabel) continue;
    if (String(dayLabel).trim().toLowerCase() === 'total') continue;   // Decision 10
    if (row[FIELD.DAILY_IS_TOTAL] === true) continue;                  // Decision 10

    const target_date = parseDailyDate(dayLabel);                      // Decision 9
    if (!target_date) continue;

    const volumeMn = cleanNum(row[FIELD.DAILY_VOLUME]);                // Decision 7
    const amountCr = cleanNum(row[FIELD.DAILY_AMOUNT]);

    out.push({
      target_date,
      row_type: 'daily_national',
      transaction_count:      volumeMn != null ? Math.round(volumeMn * 1_000_000) : null,  // Decision 8
      transaction_value_inr:  amountCr != null ? amountCr * 10_000_000 : null,             // Decision 8
      active_tags: null,                                                // monthly-only
      live_banks:  null,                                                // monthly-only
    });
  }
  return out;
}
```

### Cleaner + date helpers (port verbatim from `scratch/parse_fastag_sample.js`)

```javascript
const MONTH_MAP = {
  january:0, february:1, march:2, april:3, may:4, june:5,
  july:6, august:7, september:8, october:9, november:10, december:11,
  jan:0, feb:1, mar:2, apr:3, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11,
};

export function cleanNum(val) {                                        // Decision 7
  if (val == null || val === '' || val === 'NA' || val === '-') return null;
  const cleaned = String(val).replace(/,/g, '').replace(/ /g, '').trim();
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseDailyDate(npciDay) {                              // Decision 9
  if (!npciDay || String(npciDay).toLowerCase() === 'total') return null;
  const parts = String(npciDay).replace(',', '').split(/\s+/);
  if (parts.length < 3) return null;
  const m = MONTH_MAP[parts[0].toLowerCase()];
  const d = Number.parseInt(parts[1], 10);
  const y = Number.parseInt(parts[2], 10);
  if (m === undefined || Number.isNaN(d) || Number.isNaN(y)) return null;
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseMonthlyDate(monthStr) {                           // Decisions 5 + 9
  if (!monthStr) return null;
  const parts = String(monthStr).split('-');
  if (parts.length < 2) return null;
  const m = MONTH_MAP[parts[0].toLowerCase()];
  const y = Number.parseInt(parts[1], 10);
  if (m === undefined || Number.isNaN(y)) return null;
  return `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

export function fiscalYearRangeFor(date) {
  // Apr-pivot: month 4–12 → "<yyyy>-<yy+1>"; month 1–3 → "<yyyy-1>-<yy>"
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  if (m >= 4) return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  return `${y - 1}-${String(y % 100).padStart(2, '0')}`;
}
```

---

## Implementation

### Phase 1: Schema
**Goal**: `india_fastag_toll_volumes` exists in the DDL (Lijo runs migration).

- [ ] **Step 1.1** — Append the `CREATE TABLE IF NOT EXISTS india_fastag_toll_volumes (…)` + 2 indexes (see §Schema) to the `DDL` template string in `scripts/migrate-india-signals.mjs`, after the V2-030 deals block (line 245 — immediately before the closing backtick on line 246).
- [ ] **Step 1.2** — Add the matching `console.log('✓ Table created: india_fastag_toll_volumes')` + 2 `console.log('✓ Index created: idx_fastag_*')` lines in the success-log block (alongside the V2-030 `idx_deals_*` lines around line 295–298).
- [ ] **Step 1.3** — Do not change existing DDL, indexes, or `console.log` lines. Pure append.

### Phase 2: Source adapter
**Goal**: JSON fetcher + dual-payload parser + cleaner/date helpers.

- [ ] **Step 2.1** — Create `scripts/_npci-source.mjs`. Add the constants block (`NPCI_API_BASE`, `NPCI_TAB_*`, `NPCI_HEADERS`, `FIELD`). Export `MONTH_MAP`, `cleanNum`, `parseDailyDate`, `parseMonthlyDate`, `fiscalYearRangeFor` exactly as in §Pattern To Follow.
- [ ] **Step 2.2** — Implement `fetchMonthly(yearRange)`: construct the URL with `URLSearchParams` (`product_name=netc`, `tab_name=NPCI_TAB_MONTHLY`, `year_range`, `excel_type=monthly`, `page_no=1`, `page_size=20`, `locale=en`); `fetch(url, {headers: NPCI_HEADERS})`; on non-2xx → throw with the body for debuggability; return `await resp.json()`.
- [ ] **Step 2.3** — Implement `fetchDailyMonth({year, monthName})`: same pattern, `tab_name=NPCI_TAB_DAILY`, `year` + `month` query params, `page_size=50`.
- [ ] **Step 2.4** — Implement `parseDailyPayload(json)` exactly as in §Pattern To Follow (drops footer rows per Decision 10).
- [ ] **Step 2.5** — Implement `parseMonthlyPayload(json)`: mirror `parseDailyPayload` shape but populate `active_tags` (`cleanNum(tag_issuance_in_nos)` → rounded BIGINT) and `live_banks` (`cleanNum(no_of_banks_live_on_netc)` → rounded INTEGER); `target_date` via `parseMonthlyDate(month)`; `row_type='monthly_national'`.
- [ ] **Step 2.6** — Add a **sanity-check** function `sanityCheckMonthly(rows)` per §Second-Order Impact: assert the most recent (max `target_date`) row's `transaction_count` is between 1e6 and 1e9 AND `transaction_value_inr` is between 1e9 and 5e11. Log loudly + return false if it fails; the seed should then skip the upsert (defensive — Decision 8's unit-shift guard).
- [ ] **Step 2.7** — Add `monthsBetween(startYear, startMonthIdx, endYear, endMonthIdx)` helper returning `[{year, monthName}, …]` inclusive; used by the backfill.

### Phase 3: Upsert helper
**Goal**: batched idempotent insert.

- [ ] **Step 3.1** — Create `scripts/_fastag-upsert.mjs`. Copy the shape of `_announcements-upsert.mjs` 1:1 (JS-side dedupe + batch loop). 6 columns from §Schema, in the documented order. Batch size 500. JS dedup key: `${r.target_date}|${r.row_type}`. SQL: `ON CONFLICT (target_date, row_type) DO NOTHING`. Export `upsertFastag(pool, rows): Promise<number>` returning inserted count.

### Phase 4: Daily collector
**Goal**: `seed-india-fastag.mjs` daily, idempotent, exit-0 always.

- [ ] **Step 4.1** — Create `scripts/seed-india-fastag.mjs` using the Pattern To Follow. `fetchFastag()` flow per §Pipeline Flow steps 1–8. Use the standard `pg.Pool` with `ssl: { rejectUnauthorized: false }` (per V2-018; this is Railway PG, separate from any source-side TLS — and V2-027 has NO source-side TLS quirk). Run `sanityCheckMonthly(monthlyRows)` before upsert; on fail, log + return `{written:0, skipped:'sanity-fail'}`. "API returned `results:[]`" → log one line, return `{written:0}`. Fetch-fail or parse-fail → bubble to `runSeed`'s catch (graceful-fail to existing key TTL).

### Phase 5: Backfill
**Goal**: one-time chunked load (monthly axis 2016-11 → today; daily axis 2021-06 → today) (Lijo runs).

- [ ] **Step 5.1** — Create `scripts/backfill-india-fastag.mjs`. **Monthly axis first** (smaller, less risk; ~11 calls): walk `fiscalYearsFrom("2016-17")` to current FY, `fetchMonthly` → `parseMonthlyPayload` → `upsertFastag`. **Daily axis second** (~60 calls): walk `monthsBetween(2021, 'June', currentYear, currentMonthName)`, `fetchDailyMonth` → `parseDailyPayload` → `upsertFastag`. ~300ms sleep between calls. 1 retry on transient 5xx; log+skip the call after 2 fails (never fatal). Header comment: "one-time; Lijo runs against prod; safe to re-run; monthly floor is 2016-11-01, daily floor is 2021-06-01 per V2-027 Decision 6."

---

## Error Scenarios

| Symptom | Likely cause | Fix |
|---|---|---|
| `403 Forbidden` from NPCI on every call | NPCI changed WAF policy and `/api/` is no longer exempt | Add `Origin: https://www.npci.org.in` + `Referer: https://www.npci.org.in/product/netc/product-statistics` to `NPCI_HEADERS`. Do NOT escalate to Playwright in the daily seed. |
| Every row has `target_date` off by 1 day | Used `new Date("March 01, 2026")` (UTC interpretation) instead of components | Use `parseDailyDate` exactly as in §Pattern To Follow (Decision 9) |
| Monthly insert count is `~30%` lower than expected | Daily-row footer wasn't skipped and conflicted with a phantom `target_date` from a malformed `Total` parse | Confirm both `npci_day==='Total'` AND `isTotal===true` are checked (Decision 10) |
| `transaction_count` looks 1000× too small or 1000× too big | NPCI silently flipped the unit on `volume_in_mn` from "Millions" to "raw count" (or "Crores") | `sanityCheckMonthly` should have caught this — if it didn't, tighten its bounds. Manual DELETE of the bad rows + re-run after fix. |
| `cleanNum` returns NaN for `"7,046.40 "` | Trailing non-breaking-space wasn't stripped | Confirm `cleanNum` includes the `.replace(/ /g, '')` step (Decision 7) |
| Indian-comma `tag_issuance_in_nos` returns a wrong magnitude | Tried to apply locale-aware parsing instead of raw `.replace(/,/g, '')` | Strip ALL commas; the digit sequence is identical between Indian and Western grouping (Decision 7) |
| Pre-mid-2017 monthly rows insert with `transaction_count=null` and a real `active_tags` | Expected — those months published only the tag count, not volume/value (Decision 6/7) | Not an error |
| Backfill inserts 0 for `(year, monthName)` pairs before June 2021 | Expected — NPCI's daily endpoint returns empty `results` for those months (Decision 6) | Log "no daily rows for <year> <monthName>" and continue |
| Duplicate-key error from PG | Wrong PK columns or stale schema | PK is `(target_date, row_type)`; re-run the migration (Decision 5) |
| Cron overlap | Missing lock | `runSeed()` provides `seed-lock:india:fastag` — keep the wrapper |

---

## Environment Variables

| Variable | Where set | Purpose |
|---|---|---|
| `DATABASE_URL` / `DATABASE_PUBLIC_URL` | `.env.local` + Railway (already exist) | Railway PostgreSQL — reused, no new var |

No new environment variables. A new **Railway cron schedule** (daily ≈06:30 UTC) is an operational setup step for Lijo, not a repo change.

---

## Read vs Write

**WRITE only to:**
- `scripts/migrate-india-signals.mjs` (append DDL block only)
- `scripts/_npci-source.mjs` (NEW)
- `scripts/_fastag-upsert.mjs` (NEW)
- `scripts/seed-india-fastag.mjs` (NEW)
- `scripts/backfill-india-fastag.mjs` (NEW)

**READ for reference (never write):**
- `scripts/_seed-utils.mjs`, `scripts/_nse-announcements-source.mjs`, `scripts/_announcements-upsert.mjs`, `scripts/seed-india-announcements.mjs`, `scripts/seed-india-deals.mjs`, `scripts/seed-india-electricity.mjs` (V2-026 — if shipped), `scripts/backfill-india-announcements.mjs`, `scratch/*` recon files

**Never write to:**
- `scripts/seed-insights.mjs` — SACRED
- `scripts/seed-india-signals.mjs` — news pipeline, not this task
- `scripts/_nse-announcements-source.mjs` / `seed-india-announcements.mjs` — V2-018, not this task
- `scripts/seed-india-deals.mjs` / `_nse-deals-source.mjs` — V2-030, not this task
- `scripts/seed-india-electricity.mjs` / `_grid-india-source.mjs` — V2-026, not this task
- `src/config/variants/full.ts | tech.ts | finance.ts` — SACRED
- Anything in `src/`, `api/` — out of scope for this backend task
- `shared/market-taxonomy.json` — no state-keyword changes (Decision 11)

---

## Verify

```bash
npm run typecheck     # 0 errors
npx biome check .     # 0 errors
git diff scripts/seed-insights.mjs            # empty (sacred)
git diff scripts/seed-india-signals.mjs       # empty (not this task)
git diff scripts/seed-india-announcements.mjs # empty (V2-018, not this task)
git diff scripts/seed-india-deals.mjs         # empty (V2-030, not this task)
git diff scripts/seed-india-electricity.mjs   # empty (V2-026, not this task)
git diff scripts/_nse-announcements-source.mjs # empty
git diff scripts/_grid-india-source.mjs        # empty (V2-026, not this task)
git diff src/config/variants/                  # empty (sacred)
```

No browser/variant verification (backend-only task). Runtime validation of the parser/cron is **Lijo's**, against prod, post-review (Decision 12). Agent self-checks are read-only `git diff` + typecheck + biome only.

### If the parse misbehaves at Lijo's run

1. Confirm the API URL returns HTTP 200 + `application/json`. If 403/503 → see the WAF-policy-change row in Error Scenarios.
2. Confirm `json.data.results` is an array. If `null`/missing, NPCI may have wrapped the envelope differently — log the top-level keys.
3. Confirm `cleanNum("12,12,03,946")` returns `121203946` and `cleanNum("NA")` returns `null` (Decision 7).
4. Confirm `parseDailyDate("March 01, 2026")` returns `"2026-03-01"` on the host machine's timezone — set `TZ=America/Los_Angeles node -e '...'` as a one-shot to defend Decision 9.
5. Confirm the daily payload's footer row is dropped (March 2026 = 31 inserted rows, not 32).
6. Confirm `sanityCheckMonthly` passes on the latest payload — if it fails, NPCI may have changed units, do NOT just bump the bounds; investigate the source first.

---

## Completion Log

- [x] Research Appendix transcribed from Gemini agent output — 2026-05-24
- [ ] Phase 1 (schema DDL) complete
- [ ] Phase 2 (source adapter) complete
- [ ] Phase 3 (upsert helper) complete
- [ ] Phase 4 (daily collector) complete
- [ ] Phase 5 (backfill) complete
- [ ] Typecheck 0 / Biome 0
- [ ] Sacred-file diffs empty (seed-insights, seed-india-signals, seed-india-announcements, seed-india-deals, seed-india-electricity, _grid-india-source, variants/*)
- [ ] Handoff to Lijo: migration + first daily seed + backfill run against prod; Railway daily cron schedule (≈06:30 UTC) — pending Lijo
- [ ] CLAUDE.md V2 Task Status: add V2-027 → COMPLETE (after Lijo's prod run)
- [ ] **TASK V2-027 COMPLETE** ✅ — pending Lijo's prod run
