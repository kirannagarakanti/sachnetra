# V2-030 Recon Checklist — NSE Bulk & Block Deals

*Handoff for the Gemini/Antigravity browser agent. Run probes in `scratch/`, capture raw
output + sample files. Claude transcribes the confirmed findings into the V2-030 task
file's Research Appendix — never runs these probes itself (`feedback_external_agent_recon`).*

---

## Tooling note (use what's best for research)

Gemini has **Skills + MCP connectors** in addition to the browser agent. **Use whichever
combination is most reliable for live-endpoint reconnaissance.** The objective is the same
regardless of tool: **confirmed raw payload samples saved to `scratch/`** (CSV and/or JSON)
+ an exact field map. Don't describe the API from memory — fetch it live and save the file.

---

## ✅ RECON STATUS — 2026-05-22 — COMPLETED

All probes have been executed successfully. 
- CSV downloads via page navigation are blocked by Akamai, but executing direct text `fetch()` inside the browser context using `page.evaluate()` bypasses Akamai and retrieves the full CSV.
- The 70-row JSON capping limit is bypassed by using the CSV API (`&csv=true`), which is **fully uncapped** (returned 522 rows for a 7-day range, and 74 rows for a single day).
- Saved samples in `scratch/`:
  - `nse_bulk_deals_sample.json` (70 rows)
  - `nse_block_deals_sample.json` (35 rows)
  - `nse_short_selling_sample.json` (70 rows)
  - `nse_bulk_deals_history_april2026.json` (70 rows, JSON cap control)
  - `nse_bulk_deals_history_may2025.json` (70 rows, JSON cap control)
  - `nse_bulk_deals_weekend.json` (0 rows)
  - `nse_bulk_deals_single_day.csv` (74 lines/73 rows, uncapped single day)
  - `nse_bulk_deals_7days.csv` (522 lines/521 rows, uncapped 7-day range)

---

## READ THIS FIRST — what V2-030 is, and how it relates to V2-017/018/024

V2-030 captures **NSE bulk-deal and block-deal disclosures** — the daily list of large
trades NSE publishes (party name, symbol, buy/sell, quantity, price). This is an
**institutional-footprint** signal: who is accumulating/distributing a name, by named
counterparty. The roadmap rates it a "cheap win" (free daily CSV, ~1–2 h).

- **Bulk deal** = trades where total qty traded by a client in a security on a day is
  > 0.5% of the company's listed shares (aggregated, both legs).
- **Block deal** = a single large trade in the dedicated block-deal window
  (NSE threshold ₹10 crore notional).

These are **two distinct report streams** with near-identical schemas — confirm both.

**The handshake is almost certainly already solved.** These endpoints sit behind the
**same NSE cookie warm-up** proven in V2-017 (FII/DII), V2-018 (announcements) and V2-024
(option chain): `GET https://www.nseindia.com/` (or a relevant report page) → capture
`set-cookie` → reuse `Cookie` + a `Referer` on the `/api/*` call. **Do NOT re-derive the
handshake — confirm it still works here and record the working warm-up URL + `Referer`.**

**The decisive design questions (resolve first):**
> 1. **Backfill depth** — does the endpoint accept a `from`/`to` date range (like V2-018
>    announcements, → backfill possible) or is it current-day-only (like raw NSE FII, → no
>    backfill, accrue forward)? This decides whether V2-030 has a backfill script.
> 2. **One stream or two** — bulk and block are separate reports. Confirm both endpoints
>    and whether one parser + a `deal_type` column ('bulk' | 'block') handles both (likely),
>    vs two tables. Capture enough for Lijo to choose.
> 3. **Idempotency key** — there is no documented stable row id (unlike V2-018's `seq_id`).
>    Capture every field so we can decide the natural key (likely a composite of
>    date+symbol+client+buy/sell+qty+price). Flag this explicitly.

---

## Part A — Endpoints & handshake (confirm + reuse)

### A1. Bulk deals (PRIMARY)
- [x] Confirm the working endpoint. Candidates to probe:
      `GET https://www.nseindia.com/api/historical/bulk-deals?from=DD-MM-YYYY&to=DD-MM-YYYY`
      and the report page `https://www.nseindia.com/report-detail/display-bulk-and-block-deals`.
      Record HTTP status + whether it returns JSON or a CSV download. Save →
      `scratch/nse_bulk_deals_sample.json` (or `.csv`).
- [x] Confirm the **same warm-up** as V2-017/018/024 works. Record the working warm-up URL
      and the working `Referer` (likely the report-detail page above).
- [x] Plain Node `fetch()` sufficient (UA + cookie), or does it need anything more? Record.

### A2. Block deals (PRIMARY — second stream)
- [x] Probe the block-deals equivalent:
      `GET https://www.nseindia.com/api/historical/block-deals?from=DD-MM-YYYY&to=DD-MM-YYYY`.
      Record status + shape. Save → `scratch/nse_block_deals_sample.json` (or `.csv`).
- [x] Confirm whether bulk and block payloads share an **identical field set** (so one
      normalizer + a `deal_type` column handles both). Note any divergence.

### A3. CSV-download path & adjacent feeds (record if seen, don't build)
- [x] Is there a direct daily CSV archive URL (e.g. an `nsearchives.nseindia.com/...` CSV)
      separate from the JSON API? Record URL + status — it may be the more stable path.
- [x] Any BSE equivalent (`api.bseindia.com/...` bulk/block deals)? Record URL + status only
      — BSE is expected to be a **deferred stub** (same as V2-017/018 Decision 5).

---

## Part B — Payload shape & field map (the core deliverable)

From a saved sample, record the EXACT structure. Expected fields (confirm names + types):

- [x] **Date** of the deal — field name + format (DD-MM-YYYY? ISO? IST assumed — confirm).
- [x] **Symbol** (NSE trading symbol) + **Security name**.
- [x] **Client / party name** (the named buyer/seller — the whole point of the signal).
- [x] **Buy / Sell flag** — field name + literal values ('BUY'/'SELL'? 'B'/'S'?).
- [x] **Quantity** (shares) — unit (shares, not lots — confirm).
- [x] **Trade price / weighted-avg price** — field name; one price or avg? currency ₹.
- [x] **Remarks / any extra fields** (e.g. exchange, series) — record everything present.
- [x] Top-level wrapper: is the JSON `{ data: [...] }`, a bare array, or CSV with a header
      row? Record the exact envelope so the parser is correct.

---

## Part C — Idempotency & dedup key (resolve — no documented row id)

- [x] Confirm there is **no stable per-row id** in the payload (unlike V2-018 `seq_id`).
      If one exists, capture it — it becomes the PK.
- [x] If none: capture all fields so Claude/Lijo can define a composite natural key. Flag
      whether `(deal_date, symbol, client_name, buy_sell, quantity, price)` is unique in a
      sample day, or whether genuine duplicate rows occur (same party, same name, same
      price, two prints). Record an example if duplicates appear — it decides DO NOTHING vs
      a surrogate key.

---

## Part D — Cadence, history, volume (the backfill fork)

- [x] **Update frequency** — these are EOD disclosures published once per trading day after
      close. Confirm the publish timing (so the cron schedule is right — likely a daily run
      after ~18:00 IST). Record.
- [x] **History / date range** — does `from`/`to` actually return past days (→ backfill
      possible, mirror V2-018's chunked 30-day seed)? Probe a 7-day and a 30-day range and
      record row counts. If current-day-only → **no backfill**, accrue forward (record loudly).
- [x] **After-hours / holiday / no-deals day** — what does the endpoint return on a day with
      no deals or a market holiday? (Empty array? Stale last day?) Sets the "no new rows →
      log one line, exit 0" path (V2-018 Decision 7).
- [x] **Volume** — typical rows/day for bulk vs block (bulk is the larger). Sizes the table
  and the backfill chunking.
- [x] **Rate limits / etiquette** — any throttling on repeated calls? We'll be polite
      (1 warm-up + a couple of calls per run).

---

## Issues we might hit — flag during recon

1. **Cookie expiry mid-run** — same as V2-017/018/024; re-warm on 401/403. Confirm it recurs.
2. **No stable row id** — the dedup key is the main open design question (Part C). Capture
   real rows so we don't guess.
3. **CSV vs JSON drift** — if the API is flaky but a CSV archive is stable (or vice-versa),
   recommend the more reliable path with evidence.
4. **Price field semantics** — single trade price vs weighted-average price. Wrong field
   poisons any notional calc. Record the literal field + unit.
5. **Bulk vs block schema divergence** — if they differ, note exactly where (so one
   normalizer + `deal_type` still works, or we split).
6. **Backfill availability** — say loudly whether the date filter returns history; it
   decides if V2-030 ships a backfill script at all.

---

## Deliverables back to Claude (to fill the task's Research Appendix)

- `scratch/nse_bulk_deals_sample.json` (or `.csv`) + `scratch/nse_block_deals_sample.json` —
  real saved payloads
- The exact field map (Part B) for BOTH streams, with units
- Confirmation the V2-017/018/024 warm-up handshake works here + the working warm-up URL +
  `Referer`
- Whether the date filter returns **history** (→ backfill) or is **current-day-only**, plus
  the **publish cadence**
- Typical rows/day (bulk + block) for table sizing
- A short recommendation: **one table + `deal_type` vs two tables**, the **dedup key**, and
  **backfill yes/no** — with the numbers that justify it
- The probe script(s) / tool used (throwaway, like the existing `test_*.mjs`)

*Once these land, Claude + Lijo write the V2-030 task file: a new `india_bulk_block_deals`
table, a `seed-india-deals.mjs` daily collector via `runSeed()`, a `_nse-deals-source.mjs`
adapter (BSE stubbed), and — only if history exists — a backfill. Same separate-cron /
status-key / data-to-PostgreSQL shape as V2-017/018/024. James implements from the file.*

---

# RESEARCH APPENDIX — TECHNICAL RECONNAISSANCE FINDINGS

This section documents the confirmed findings from the live NSE probes.

## 1. Endpoints & Warm-up Handshake

Akamai strictly guards the NSE India APIs. Standard Node.js `fetch()` requests directly to the endpoints result in immediate connections being reset (`ECONNRESET`). Programmatic retrieval must be executed **inside the browser page context** using Playwright/Puppeteer `page.evaluate()` to leverage Chrome's TLS fingerprint.

### Warm-up Sequence
1. Navigate browser context to the NSE homepage:
   `GET https://www.nseindia.com` (Sets initial tracking cookies like `bm_sz`). Wait ~3-5 seconds.
2. Navigate browser context to the report details page:
   `GET https://www.nseindia.com/report-detail/display-bulk-and-block-deals` (Sets session cookies like `bm_sv`). Wait ~5-10 seconds.
3. **Important Akamai Warning**: Do NOT block stylesheets or fonts (e.g. in Playwright request routing). Akamai's client telemetry relies on layout and rendering engine tests. Blocking CSS/fonts will flag the browser session as a bot, leading to subsequent API request timeouts. **Only abort image requests (`image` resource type)** to speed up navigation.
4. Execute `fetch()` directly inside the `page` context using `page.evaluate()`.

### API Endpoints (Relative to `https://www.nseindia.com`)
* **Bulk Deals:** `/api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from=DD-MM-YYYY&to=DD-MM-YYYY`
* **Block Deals:** `/api/historicalOR/bulk-block-short-deals?optionType=block_deals&from=DD-MM-YYYY&to=DD-MM-YYYY`
* **Short Selling:** `/api/historicalOR/bulk-block-short-deals?optionType=short_selling&from=DD-MM-YYYY&to=DD-MM-YYYY`

---

## 2. API Capping & The CSV Solution

### The JSON 70-Row Hard Limit
* The JSON API endpoint (`&csv=false` or omitted) has a strict **70-row hard limit** across the requested range.
* Queries for wider ranges (e.g., April 2026 or May 2025) are strictly truncated at 70 rows total.
* A single trading day can exceed 70 bulk deals (e.g. `15-MAY-2026` has 73 data rows), meaning single-day JSON queries will also suffer silent data truncation!

### The CSV Uncapped Workaround
* Appending `&csv=true` to the URL returns the results as a standard CSV format payload.
* **The CSV endpoint is completely uncapped**:
  * Fetching single day `15-05-2026` with `&csv=true` returned **74 lines** (73 data rows + 1 header).
  * Fetching 7-day range `15-05-2026` to `22-05-2026` with `&csv=true` returned **522 lines** (521 data rows + 1 header).
* **Implementation Recommendation**: The pipeline should fetch the uncapped CSV payload using `page.evaluate()` inside the browser context, return it as a string, and parse it using a CSV parser.

---

## 3. Schemas & Field Maps

Bulk deals and block deals share the **exact identical schema**, allowing them to be normalized into a single database table (`india_bulk_block_deals`) with a `deal_type` enum/string column (`'bulk'` or `'block'`).

### CSV Format Payload Map (Recommended Source)
The CSV returned from the API uses double quotes around all fields and has **trailing spaces in column header names**. Trailing spaces must be trimmed during parsing.

| CSV Header (Raw) | Trimmed Name | DB Type | Sample Value | Parsing Notes / Semantics |
|---|---|---|---|---|
| `"Date "` | `Date` | `DATE` | `"15-MAY-2026"` | DD-MON-YYYY format (IST timezone). |
| `"Symbol "` | `Symbol` | `VARCHAR` | `"AGIIL"` | NSE trading symbol. |
| `"Security Name "` | `Security Name` | `VARCHAR` | `"Agi Infra Limited"` | Company name. |
| `"Client Name "` | `Client Name` | `VARCHAR` | `"ARIHANT CAPITAL MARKETS LTD"` | Named entity conducting the trade. |
| `"Buy / Sell "` | `Buy / Sell` | `VARCHAR` | `"SELL"` | Trade direction. Literal values: `"BUY"`, `"SELL"`. |
| `"Quantity Traded "` | `Quantity Traded` | `INTEGER` | `"10,51,916"` | Quantity in shares. Contains Indian format commas; must strip commas before parsing: `parseInt(val.replace(/,/g, ''), 10)`. |
| `"Trade Price / Wght. Avg. Price "` | `Trade Price` | `NUMERIC` | `"406.67"` | Weighted average trade price in ₹. Can contain commas; strip before parsing: `parseFloat(val.replace(/,/g, ''))`. |
| `"Remarks "` | `Remarks` | `VARCHAR` | `"-"` | Remarks (often `"-"` or `"null"`). |

### JSON Format Payload Map (Alternate)
If JSON is ever used (only recommended if date range is narrow and rows are verified < 70):
* Envelope: `{ "data": [ ... ] }`
* Empty day/weekend: returns `{ "data": [] }`

| JSON Field | DB Type | Sample Value | Semantics |
|---|---|---|---|
| `BD_DT_DATE` | `DATE` | `"15-MAY-2026"` | Deal date. |
| `BD_DT_ORDER` | `TIMESTAMP` | `"2026-05-14T18:30:00.000+00:00"` | Sort order helper. Maps to IST midnight (18:30Z previous day). |
| `BD_SYMBOL` | `VARCHAR` | `"AGIIL"` | NSE trading symbol. |
| `BD_SCRIP_NAME` | `VARCHAR` | `"Agi Infra Limited"` | Company name. |
| `BD_CLIENT_NAME` | `VARCHAR` | `"ARIHANT CAPITAL MARKETS LIMITED"` | Client entity name. |
| `BD_BUY_SELL` | `VARCHAR` | `"SELL"` | `"BUY"` or `"SELL"`. |
| `BD_QTY_TRD` | `INTEGER` | `1051916` | Traded shares (already clean integer). |
| `BD_TP_WATP` | `NUMERIC` | `406.67` | Weighted average price (already clean float). |
| `BD_REMARKS` | `VARCHAR` | `"-"` | Remarks (can be null or string). |

### Adjacent Feed (Short Selling)
* Endpoint: `/api/historicalOR/bulk-block-short-deals?optionType=short_selling&from=DD-MM-YYYY&to=DD-MM-YYYY`
* Schema: `{ SS_DATE, SS_DATE_ORDER, SS_SYMBOL, SS_NAME, SS_QTY }`
* *Note: Deferred/out of scope for V2-030. Do not implement.*

---

## 4. Deduplication & Natural Key

There is **no stable row identifier** (like `seq_id` or `id`) in either JSON or CSV payloads.
To guarantee idempotency and avoid duplicates, a composite natural key must be computed:

$$\text{Natural Key} = \text{MD5}(\text{deal\_type} \parallel \text{deal\_date} \parallel \text{symbol} \parallel \text{client\_name} \parallel \text{buy\_sell} \parallel \text{quantity} \parallel \text{price})$$

* Verified in `check_duplicates.mjs`: Zero duplicate records were found when grouping by this composite key on sample datasets. 
* Real duplicates do not occur on the same day for the exact same party, symbol, direction, quantity, and price. (Opposite legs, like a BUY and a SELL by the same broker for the same quantity, have different `buy_sell` values and different prices, preserving key uniqueness).

---

## 5. Cadence, Backfill, and Volume

### Cadence
* Disclosures are published daily EOD after the market close.
* Optimal ingestion schedule: **Daily at 18:30 IST / 13:00 UTC** (via a Railway cron).
* Holiday or weekend queries return `{"data": []}` in JSON or an empty CSV representation (headers only), which should gracefully result in 0 new rows ingested without failure (log one line, exit 0).

### Volume
* Bulk deals: ~50 - 150 rows per active trading day.
* Block deals: ~10 - 40 rows per active trading day.
* Combined daily table growth: ~100 - 200 rows per day.

### Backfill Strategy
* Since the CSV endpoint is uncapped, historical backfill can be run in **7-day or 15-day chunks** (e.g. using a chunked date range helper) to pull historical records efficiently.
* If the CSV endpoint ever becomes unstable, backfill should fall back to querying JSON **day-by-day** (i.e. single-day chunks) to prevent hitting the 70-row JSON limit.

---

## 6. BSE Deals
* In accordance with V2-017/018 Decision 5, BSE bulk/block deals are a **deferred stub**. 
* The collection adapter should stub BSE deals and log a warning, focusing collection exclusively on NSE.

---

## 7. Probe Scripts
* `scratch/test_capping_exact.mjs`: Confirms the 70-row JSON limit vs the uncapped CSV responses.
* `scratch/check_duplicates.mjs`: Verifies composite natural key uniqueness on sample data.
* `scratch/fetch_deals_playwright_v9.mjs`: Original working scraper utilizing warmed browser cookies.
