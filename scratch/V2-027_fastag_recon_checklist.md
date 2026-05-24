# V2-027 Recon Checklist — FASTag Toll Volumes (NHAI / IHMCL / NPCI)

*Handoff for the Gemini/Antigravity browser agent. Run probes in `scratch/`, capture raw
output + sample files. Claude transcribes the confirmed findings into the V2-027 task
file's Research Appendix — never runs these probes itself (`feedback_external_agent_recon`).*

---

## Tooling note (use what's best for research)

Gemini has **Skills + MCP connectors** in addition to the browser agent. **Use whichever
combination is most reliable for live-endpoint reconnaissance.** The objective is the
same regardless of tool: **confirmed raw payload samples saved to `scratch/`** (CSV /
JSON / PDF / HTML — whichever format the source publishes) + an exact field map. Don't
describe the report from memory — fetch the actual file live and save it.

---

## READ THIS FIRST — what V2-027 is, and how it relates to V2-026 / V2-018 / V2-030

V2-027 captures **FASTag toll-collection volumes and values** — the daily / monthly
electronic-toll receipts on Indian National Highways. This is a **goods-and-passenger
movement macro proxy**: FASTag transactions are a high-frequency activity gauge
(commercial-vehicle ↔ industrial output / freight; non-commercial ↔ retail mobility).
The roadmap rates it a "cheap win" alongside V2-026 (`sachnetra_quant_roadmap.md` Tier 6
— "FASTag Toll Volumes, ~2–3 h, goods-movement proxy / free"), to be built immediately
after V2-026 in the cheap-wins sequence.

- **FASTag** = electronic toll collection system on India's national highways (RFID
  tag on the windscreen, prepaid wallet, auto-debit at toll plaza).
- **Three publishing entities — confirm which one is the canonical machine-readable
  feed (CRITICAL — open question):**
  - **NHAI** (National Highways Authority of India) — owns the infrastructure;
    publishes press releases and PIB notes with monthly headline numbers.
  - **IHMCL** (Indian Highways Management Company Limited) — NHAI's wholly-owned
    subsidiary; runs the toll-management / FASTag programme operationally; publishes
    a dashboard / quarterly reports.
  - **NPCI** (National Payments Corporation of India) — issues / clears FASTag
    transactions via the National Electronic Toll Collection (NETC) network;
    publishes monthly **transaction count + value** statistics on its product page.
- **Two granularities likely exist:**
  - **National headline** (total daily/monthly transactions + GMV ₹ Cr) — broadly
    published, lowest friction. Lead candidate for V2-027.
  - **Plaza-level** (per-toll-plaza daily counts + receipts) — likely exists inside
    IHMCL's operational dashboard but may be gated / RTI-only. If publicly
    available, capture it; if not, document and **scope V2-027 to national only**.

The agent's job is to **pin down the canonical, machine-readable, free, daily-or-monthly
endpoint** — and only fall back to PDF / HTML scraping if no structured feed exists.

---

## Part A — Endpoints & access (confirm the canonical source)

### A1. Canonical host & landing page
- [x] Probe **all three candidate hosts** and report what each one publishes:
      - `https://www.npci.org.in/what-we-do/netc-fastag/product-statistics` (redirects to `https://www.npci.org.in/product/netc/product-statistics`).
        *Findings:* Serves dynamic React pages with F5 BIG-IP WAF client challenges. However, the underlying API endpoints under `/api/product-statistic/` are WAF-exempted and fully accessible via plain Node `fetch()`. It publishes both daily national totals and monthly national totals.
      - `https://ihmcl.co.in/etc-transaction-reports/`.
        *Findings:* Serves a list of reports. Only publishes PDF files and ZIP archives containing PDF files (e.g. `reuploadthevcwisemonthlyetcfastagreportonihmclwe.zip`). Contains plaza-level monthly statistics by vehicle category.
      - `https://nhai.gov.in/` / `https://pib.gov.in/` filtered to "FASTag".
        *Findings:* Serves press releases containing headline monthly numbers in raw prose.
      - **Any third candidate:**
        *Findings:* data.gov.in publishes FASTag datasets occasionally but requires registration/API keys and lags by several months.
- [x] Record for each: canonical URL, what it publishes (national vs plaza, daily vs monthly, count vs value), file format (CSV / JSON / PDF / HTML), update cadence.
  - **NPCI API (Monthly):** `https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-fas-tag-statistics&year_range=<year_range>&excel_type=monthly&locale=en`. National monthly volume (millions), value (crores), active tags, and live banks. JSON format. Monthly cadence.
  - **NPCI API (Daily):** `https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-daily-statistics&year=<year>&month=<month>&excel_type=daily&locale=en`. National daily volume (millions) and value (crores). JSON format. Incremental daily cadence (with a 3–4 day lag).
  - **IHMCL:** `https://ihmcl.co.in/etc-transaction-reports/`. Plaza-level monthly counts and values by vehicle category. PDF format. Monthly cadence.
- [x] **Decide and recommend ONE source as the V2-027 primary** based on:
      (a) structured-format availability, (b) cadence (daily > monthly), (c) history depth, (d) free + unauthenticated.
      *Recommendation:* **NPCI JSON API** is the recommended primary source. It provides both national daily and monthly aggregates directly in a clean, structured JSON format without authentication. It does not require any cookie warm-up (as the `/api/` path bypasses the WAF) and goes back to 2021 for daily data and 2016 for monthly data.

### A2. Latest published report — fetch a real sample
- [x] From the recommended primary source, fetch the **most recent published report**.
      Record:
      - Full URL (Monthly): `https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-fas-tag-statistics&year_range=2025-26&excel_type=monthly&page_no=1&page_size=20&locale=en`
      - Full URL (Daily): `https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-daily-statistics&year=2026&month=May&excel_type=daily&page_no=1&page_size=50&locale=en`
      - HTTP status: `200`
      - MIME type: `application/json; charset=utf-8`
      - File sizes: Monthly is ~7.1 KB, Daily is ~4.8 KB.
      - Save → `scratch/fastag_latest.json` (Monthly March 2026), `scratch/fastag_latest_daily.json` (Daily May 2026 MTD), and date-specific copies like `scratch/fastag_2026_05_24.json` and `scratch/fastag_daily_2026_may.json`.
- [x] Confirm whether a plain Node `fetch()` (with a reasonable browser UA) succeeds, OR whether the source requires:
      *Proved:* A plain Node `fetch()` succeeds directly for the API endpoints under `https://www.npci.org.in/api/` using a standard `User-Agent` header. No cookie warm-up, relaxed TLS, CSRF, or POST body is required.
- [x] If the source is an SPA / dashboard:
      *Proved:* Handled. The React app loads config from `https://www.npci.org.in/api/product-statistic/tabs?locale=en` and requests data from `/api/product-statistic/tab/detail`. These endpoints are direct GET requests. The JSON body response is saved to `scratch/fastag_latest.json` and `scratch/fastag_latest_daily.json`.

### A3. Historical archive (backfill fork)
- [x] **Probe the archive depth.** For the recommended primary source:
      - Walked back year-by-year using `fetch_complete_history.mjs` and saved historical payloads in `scratch/`.
      - **Monthly archive depth:** Goes back to `November-2016` (fiscal year `2016-17` has 5 records).
      - **Daily archive depth:** Goes back to calendar year `2021` (e.g. `2021` has `June-2021` daily data).
      - Saved samples: `scratch/fastag_2025_26.json`, `scratch/fastag_2024_25.json`, `scratch/fastag_2023_24.json`, `scratch/fastag_2022_23.json`, `scratch/fastag_2021_22.json`, `scratch/fastag_2020_21.json`, `scratch/fastag_2019_20.json`, `scratch/fastag_2018_19.json`, `scratch/fastag_2017_18.json`, `scratch/fastag_2016_17.json`, and multiple daily month JSONs.
- [x] **Format-shift boundary**: The NPCI API serves structured JSON consistently across all years. There is no format-shift boundary.
- [x] **Schema drift**: Diffed oldest and newest samples. The payload keys are 100% identical. No schema drift was detected.
  - Daily keys: `npci_day`, `row_number`, `month`, `year`, `netc_volume_mn`, `netc_value_crores`.
  - Monthly keys: `month`, `no_of_banks_live_on_netc`, `tag_issuance_in_nos`, `volume_in_mn`, `amount_in_cr`.

### A4. Adjacent data (record if seen, don't build)
- [x] **NPCI NETC product stats** — UPI, IMPS, NFS, CTS, and BHIM stats are served from the same `tabs?locale=en` category structure.
- [x] **MoRTH / Sarathi-Parivahan** — Vehicle-registration statistics were noted on external portals (like vahan.parivahan.gov.in) but are adjacent and out of scope.
- [x] **data.gov.in FASTag datasets** — Exist but updates are delayed.
- [x] **PIB press releases** — Contain monthly aggregates. March 2026 press release confirmed: 36.38 Crore (363.76 Mn) transactions worth ₹7,193.25 Crore (which matches the NPCI monthly JSON exactly).

---

## Part B — Payload shape & field map (the core deliverable)

### B1. If CSV / JSON / XLS exists (preferred path)
- [x] Header row / JSON schema — record exact field names and types.
  - **Daily results keys:**
    - `npci_day`: `string` (e.g. `"March 01, 2026"` or `"Total"`)
    - `row_number`: `number` or `null`
    - `month`: `string` (e.g. `"March"`)
    - `year`: `string` (e.g. `"2026"`)
    - `netc_volume_mn`: `string` (e.g. `"12.81"`)
    - `netc_value_crores`: `string` (e.g. `"254.4"`)
  - **Monthly results keys:**
    - `month`: `string` (e.g. `"March-2026"`)
    - `no_of_banks_live_on_netc`: `string` (e.g. `"40"`)
    - `tag_issuance_in_nos`: `string` (e.g. `"122,452,408"`)
    - `volume_in_mn`: `string` (e.g. `"363.76"`)
    - `amount_in_cr`: `string` (e.g. `"7193.25"`)
- [x] Number of data rows per report:
  - Daily report: `N` rows (where `N` is the number of days in the month + 1 footer total row, i.e., 29 to 32 rows).
  - Monthly report: `12` rows per fiscal year (or 5 for 2016-17).
- [x] **Expected columns to confirm** (national-only candidate schema):
  - **target_date** (derived): `DATE`
  - **row_type**: `TEXT` (`'daily_national'` or `'monthly_national'`)
  - **transaction_count**: `BIGINT` (derived raw count, e.g. `12810000`)
  - **transaction_value_inr**: `NUMERIC` (derived raw value, e.g. `2544000000`)
  - **active_tags**: `BIGINT` (tag issuance, monthly only)
  - **live_banks**: `INTEGER` (live bank count, monthly only)
- [x] Wrapper / footer rows that the parser must skip:
  - For daily, we must skip the footer row where `npci_day === 'Total'` or `isTotal === true`.
  - For monthly, no footer exists in the results array.

### B2. If PDF only (fallback path)
- [x] Visually inspect 2–3 PDF samples:
  - Not applicable. Direct JSON API exists, completely removing the need for a PDF parser.

### B3. Unit conventions (CRITICAL — wrong unit poisons the dataset)
- [x] **Transaction count**:
  - NPCI reports `volume_in_mn` / `netc_volume_mn` in **Millions** (e.g. `12.81` = 12.81 * 10^6 = 12,810,000). The parser converts to raw integer count.
- [x] **Transaction value**:
  - NPCI reports `amount_in_cr` / `netc_value_crores` in **Crores** of Rupees (e.g. `254.4` = 254.4 * 10^7 = 2,544,000,000 INR). The parser converts to raw INR decimal value.
- [x] **Time zone**:
  - IST throughout. Cutoff represents midnight IST.

---

## Part C — Idempotency & dedup key (resolve)

- [x] Confirm there is **no per-row id** in the report:
  - Confirmed. While Strapi results contain an `id` field, it's a CMS internal ID and could be revised.
- [x] **Test candidate composite keys** for uniqueness:
  - Unique composite PK: `(target_date, row_type)`. Since there is exactly one daily national total row per date and one monthly national total row per month, `(target_date, row_type)` is unique.
- [x] Are reports ever **revised / restated** historically?
  - NPCI payment logs are reconciled daily and are immutable after publication. However, the daily month view for the current month is updated incrementally (with a 3–4 day lag). An `ON CONFLICT (target_date, row_type) DO UPDATE` or `DO NOTHING` is appropriate (using `DO UPDATE` for daily data in the current month is recommended to overwrite MTD updates, or simply fetching the current month and replacing it).

---

## Part D — Cadence, history, volume (the backfill fork)

- [x] **Publish cadence**:
  - Daily data is updated incrementally with a **3–4 day lag** (e.g., on May 24, data is available up to May 20).
  - Monthly data is published in the **1st week of the following month**.
  - Collector cron should run once daily (e.g. at 12:00 IST / 06:30 UTC).
- [x] **History depth**:
  - Daily statistics go back to calendar year **2021** (June 2021 is the earliest daily record).
  - Monthly statistics go back to calendar year **2016** (November 2016 is the earliest monthly record).
- [x] **Weekend / holiday behaviour**:
  - NPCI settles transactions continuously on all days including weekends and public holidays. Daily stats are published for every calendar day.
- [x] **Volume**:
  - Daily: ~365 rows per year. Total daily backfill (2021–2026) ≈ 1,800 rows.
  - Monthly: 12 rows per year. Total monthly backfill (2016–2026) ≈ 120 rows.
  - Extremely small volume, very low resource footprint.
- [x] **Rate limits / etiquette**:
  - Standard politeness delay of 300–500ms between year fetches during backfill. No rate limits encountered.
  - `robots.txt` allows scraping on `/api/`.

---

## Part E — Decision points the agent should flag (open questions for the task file)

1. **Which source is canonical?**
   *Answer:* **NPCI JSON API** is canonical. It bypasses WAF restrictions, returns clean structured JSON, covers both daily and monthly cadences, and requires no browser warm-up.
2. **National-only vs plaza-level?**
   *Answer:* **National-only** is recommended. Plaza-level data is only available from IHMCL as complex PDFs, whereas NPCI provides national aggregates directly via a stable JSON API.
3. **Daily vs monthly cadence?**
   *Answer:* We should ingest **BOTH**. The NPCI API exposes a `netc-daily-statistics` tab and a `netc-fas-tag-statistics` (monthly) tab. We can store both cadences in a single table with a `row_type` discriminator.
4. **One table or two?**
   *Answer:* **One table** (`india_fastag_toll_volumes`) with a `row_type` column (`'daily_national' | 'monthly_national'`) is recommended. This keeps queries clean and mirrors V2-026's POSOCO pattern.
5. **Backfill floor**
   *Answer:*
   - Daily backfill floor: **2021-06-01** (oldest daily data in API).
   - Monthly backfill floor: **2016-11-01** (oldest monthly data in API).
6. **Auth / TLS / cookie quirks**
   *Answer:* None. The `/api/` endpoints work with plain Node `fetch()` without cookies or relaxed TLS.

---

## Issues we might hit — flag during recon

1. **SPA dashboard WAF** — Bypassed by using the public `/api/` JSON endpoints directly instead of loading the HTML pages.
2. **Date parsing format** — The date strings (e.g., `"March 01, 2026"` and `"March-2026"`) must be parsed timezone-independently to prevent off-by-one errors.
3. **Number formatting** — Commas and non-breaking spaces (`\u00a0`) are present in string fields (e.g., `"12,12,03,946"` or `"7,046.40\u00a0"`). They must be stripped before parsing to floats.

---

## Deliverables

1. **Saved raw samples in `scratch/`**:
   - `scratch/fastag_latest.json` (Monthly March 2026)
   - `scratch/fastag_latest_daily.json` (Daily May 2026 MTD)
   - Historical monthly files back to 2016-17 (`scratch/fastag_2016_17.json` to `scratch/fastag_2025_26.json`)
   - Daily sample files (`scratch/fastag_daily_2026_march.json`, etc.)
2. **Parser script**:
   - `scratch/parse_fastag_sample.js` (demonstrates parsing both daily and monthly JSON into clean row objects).
