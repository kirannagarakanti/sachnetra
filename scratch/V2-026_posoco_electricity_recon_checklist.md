# V2-026 Recon Checklist — POSOCO / GRID-INDIA Daily Electricity

*Handoff for the Gemini/Antigravity browser agent. Run probes in `scratch/`, capture raw
output + sample files. Claude transcribes the confirmed findings into the V2-026 task
file's Research Appendix — never runs these probes itself (`feedback_external_agent_recon`).*

---

## Tooling note (use what's best for research)

Gemini has **Skills + MCP connectors** in addition to the browser agent. **Use whichever
combination is most reliable for live-endpoint reconnaissance.** The objective is the same
regardless of tool: **confirmed raw payload samples saved to `scratch/`** (PDF and/or
CSV/JSON) + an exact field map. Don't describe the report from memory — fetch the actual
file live and save it.

---

## RECON STATUS — COMPLETE

All checkboxes below are checked. The Gemini agent has run the probes, saved the raw sample files in `scratch/`, and verified the payload shape and fields.

---

## READ THIS FIRST — what V2-026 is, and how it relates to V2-017/018/024/030

V2-026 captures **POSOCO / GRID-INDIA daily electricity demand and supply data** — the
daily Power Supply Position (PSP) report that records India's national + regional + state
electricity demand met, peak demand, energy requirement, and energy shortage. This is a
**demand-side macro proxy**: electricity consumption leads the Index of Industrial
Production (IIP) by weeks and serves as a high-frequency activity gauge for the Indian
economy. The roadmap rates it a "cheap win" (free daily PDF/CSV, ~2–3 h).

- **POSOCO** = Power System Operation Corporation Limited. **Renamed to "Grid Controller
  of India Limited" (GRID-INDIA) in 2022.** Canonical hostname is **`grid-india.in`**.
- **NLDC** = National Load Despatch Centre, the operating arm that publishes the daily
  reports. Reports appear under a React SPA document manager.
- **Two report streams** exist:
  - **Daily PSP report** — peak demand met, energy met, energy shortage (national +
    regional + state-wise).
  - **NLDC daily PSP archive** — historical files (PDFs and Excel files) going back years.
  **Both formats are offered.** Using the `.xls` Excel format is extremely stable and
  machine-readable.

---

## Part A — Endpoints & access (confirm the canonical source)

### A1. Canonical host & landing page
- [x] Confirm the live canonical hostname for POSOCO's daily reports.
      - Canonical main domain: `https://grid-india.in` (resolves to `150.107.103.38`)
      - Web API domain: `https://webapi.grid-india.in`
      - CDN Host (static file downloads): `https://webcdn.grid-india.in`
- [x] Find the "Daily Reports" / "PSP Reports" navigation entry.
      - Landing page: `https://grid-india.in/reports/daily-psp-report/`
      - Page details endpoint: POST to `https://webapi.grid-india.in/api/v1/page` with body `{"_source": "GRDW", "_relPath": "/reports/daily-psp-report"}`. Returns `FileType: "DAILY_PSP_REPORT"`.

### A2. Daily PSP report — today's file
- [x] Identify the latest published daily report. Record:
      - Latest XLS: `https://webcdn.grid-india.in/files/grdw/2026/05/23.05.26_NLDC_PSP_282.xls` (May 23, 2026 data, reported on May 24, 2026).
      - Latest PDF: `https://webcdn.grid-india.in/files/grdw/2026/05/23.05.26_NLDC_PSP_839.pdf`
      - File naming convention: `files/grdw/<yyyy>/<mm>/<dd>.<mm>.<yy>_NLDC_PSP_<random>.xls`. Since filenames include a randomized suffix, they are retrieved from the file index endpoint.
      - HTTP status: 200 OK. MIME types: `application/vnd.ms-excel` and `application/pdf`. Size: ~260-330 KB for XLS, ~1.6 MB for PDF.
      - Save → `scratch/posoco_psp_latest_2026.xls` and `scratch/posoco_psp_latest_2026.pdf`.
- [x] Confirm a plain Node `fetch()` (with a reasonable browser UA) is sufficient.
      - **IMPORTANT**: Grid-India subdomains use SSL certificates that trigger TLS connection errors in native Node.js fetch (due to self-signed / incomplete certificate chains). Native fetches must use an `https.Agent` with `rejectUnauthorized: false`. Alternatively, shell out to `curl.exe -k`. No cookie warm-up handshakes or JS execution is required.

### A3. Historical archive (backfill fork)
- [x] Probe the archive index.
      - Archive Index endpoint: POST to `https://webapi.grid-india.in/api/v1/file` with body `{"_source": "GRDW", "_type": "DAILY_PSP_REPORT", "_fileDate": "2026-27", "_month": "05"}`.
      - Available Period Years endpoint: POST to `https://webapi.grid-india.in/api/v1/file/get-period` with body `{"_source": "GRDW", "_fileType": "DAILY_PSP_REPORT"}`. Returns fiscal years back to `2013-14` (and `2010-11`).
      - Files downloaded: `scratch/posoco_psp_latest.xls` (May 15, 2025), `scratch/posoco_psp_2025_01_15.xls`, `scratch/posoco_psp_2024_06_15.xls`, and `scratch/posoco_psp_2023_01_15.xls`.
- [x] **If the URL pattern is date-derivable** or must be scraped:
      - The download URLs contain random numeric hashes (e.g. `23.05.26_NLDC_PSP_282.xls`). They are **not** purely date-derivable.
      - Backfill strategy must query the `https://webapi.grid-india.in/api/v1/file` endpoint month-by-month for each `PeriodYear` (e.g., `'2024-25'`) and `_month` (e.g., `'06'`) to harvest the file list, then download the XLS paths.
      - **TRANSITION BOUNDARY**: XLS spreadsheets are only available starting in **January 2023** (PeriodYear `'2022-23'`, Month `'01'`). Prior months are PDF-only. We recommend backfilling from **January 1, 2023** onwards using XLS.

### A4. Adjacent data (record if seen, don't build)
- [x] CEA reports: `https://cea.nic.in/` contains monthly power position statistics. Out of scope.
- [x] State SLDC sites: E.g., Maharashtra SLDC (`https://mahasldc.in/`), Southern Regional Load Despatch Centre (`https://srldc.in/`). Out of scope.

---

## Part B — Payload shape & field map (the core deliverable)

From the MOP_E sheet in the saved XLS samples:

### B1. If CSV/Excel exists (preferred path)
- [x] Header row — Sheet `MOP_E` has the Power Supply Position:
      - Row 19: `[null, null, 'Max.Demand', 'Shortage during', 'Energy Met', 'Drawal', 'OD(+)/UD(-)', 'Max', 'Energy']`
      - Row 20: `['Region', 'States', 'Met during the day (MW)', 'maximum Demand (MW)', '(MU)', 'Schedule\n(MU)', '(MU)', 'OD(+)/ UD(-) (MW)', 'Shortage (MU)']`
- [x] Number of data rows per day:
      - Section A: Rows 6-14 (NR, WR, SR, ER, NER, and TOTAL). Represents 5 region totals and 1 national total.
      - Section C: Rows 21-59 (36 states/entities in 2023, expanding to 38 in 2024, and 39 in 2025/2026).
- [x] Expected columns to confirm:
      - **target_date** — Derived by subtracting 1 day from the reporting date found in Row 3, Col 9 (format: `DD-MMM-YYYY`, e.g., `'24-May-2026'`). Formatted as `YYYY-MM-DD` (Assumed IST).
      - **row_type** — `'state'` (Section C leaves) | `'region_total'` (Section A regions) | `'national_total'` (Section A TOTAL)
      - **region** — `'NR'`, `'WR'`, `'SR'`, `'ER'`, `'NER'`, or `'All India'`. Derived using static mapping based on state name.
      - **entity_name** — State or entity name (Col B / Index 1) (e.g. `'Punjab'`, `'BALCO'`).
      - **max_demand_met_mw** — Col C / Index 2 (Max demand met during the day in MW).
      - **peak_demand_met_mw** — Only for region/national totals, extracted from Row 6 Col D-I (Demand met during Evening Peak hrs in MW). Null for states.
      - **peak_demand_shortage_mw** — Col D / Index 3 (Shortage during maximum demand in MW).
      - **energy_met_mu** — Col E / Index 4 (Energy Met in MU).
      - **drawal_schedule_mu** — Col F / Index 5 (Drawal Schedule in MU). Null for region/national.
      - **od_ud_mu** — Col G / Index 6 (Drawal OD(+)/UD(-) in MU). Null for region/national.
      - **max_od_ud_mw** — Col H / Index 7 (Max OD/UD in MW). In 2026, represented as a string range (e.g. `'778/ -819'`), previously a single number. Stored as text. Null for region/national.
      - **energy_shortage_mu** — Col I / Index 8 (Energy Shortage in MU).
- [x] Wrapper / footer:
      - We can dynamically locate the start of Section C by finding the row containing `'C. Power Supply Position in States'`. Skip 2 sub-headers and parse until an empty row or `'D. Transnational'` is encountered. This makes parsing robust against shifting rows and new entity additions (like `RIL JAMNAGAR` in 2025).

### B2. If PDF only (fallback path)
- [x] Verified that PDF has a matching structure but XLS is fully available since Jan 2023, making PDF parsing unnecessary for the target backfill depth.

### B3. Unit conventions (critical — wrong unit poisons the dataset)
- [x] Confirm whether energy is in **MU** (Million Units = GWh).
      - Yes, energy met and energy shortage are in MU. (1 MU = $10^6$ kWh = 1 GWh).
- [x] Confirm whether peak demand is in **MW**.
      - Yes, peak demand met, peak shortage, and OD/UD limits are in MW.
- [x] Confirm whether shortage is reported as a **positive number**.
      - Yes, shortages are reported as positive numbers (e.g. `0.55` MU shortage).

---

## Part C — Idempotency & dedup key (resolve)

- [x] Confirm there is **no per-row id** in the report.
      - Verified. The data is government tabular spreadsheets.
- [x] Test the candidate composite key `(target_date, row_type, entity_name)` for uniqueness.
      - Verified. The key uniquely identifies each row without collision. State names and region codes are completely unique within their sections.
- [x] State grid regions roll-ups:
      - Section A contains the regional aggregates (row_type: `'region_total'`) and national aggregates (row_type: `'national_total'`).
      - Section C contains only the leaf states/entities (row_type: `'state'`).
      - There are no overlapping rows in Section C, and regions/national rows are clearly isolated in Section A.

---

## Part D — Cadence, history, volume (the backfill fork)

- [x] **Publish cadence**:
      - Daily reports are published on the morning of day $D+1$ for day $D$'s actual grid position.
      - Typical publish time is between **09:30 and 10:30 IST** (04:00 to 05:00 UTC).
      - Collector cron should run daily at **11:00 IST** (05:30 UTC) to capture the previous day's report.
- [x] **History depth**:
      - Available periods go back to 2013 on the Web API, but structured XLS format begins in **January 2023**.
      - XLS coverage is continuous and complete from January 2023 to the present.
- [x] **Weekend / holiday behaviour**:
      - Reports are published every day of the week, including Sundays and public holidays (the grid is monitored continuously). No missing days expected.
- [x] **Volume**:
      - Section A: 6 rows (5 regions + 1 national total).
      - Section C: 36-39 rows (depending on the year).
      - Total volume: **~42 to 45 rows per day**.
      - Annual volume: **~15,000 to 16,500 rows per year**. Highly compact dataset.
- [x] **Rate limits / etiquette**:
      - No severe rate limits. A small polite delay of 200ms between requests is recommended.

---

## Issues we might hit — flag during recon

1. **Node Native Fetch SSL Failures**: Grid-India servers reject standard TLS connections in Node due to strictness/certificate gaps. The collector must configure `{ agent: new https.Agent({ rejectUnauthorized: false }) }` or invoke `curl.exe -k`.
2. **State Entity Changes Over Time**: Between 2023 and 2026, state-level entries expanded from 36 to 39 entities (added `Railways_NR ISTS`, `Railways_ER ISTS`, and `RIL JAMNAGAR`). Dynamic parser logic using headers is required.
3. **OD Drawal Format Shift**: Column H / Col 7 (Max OD/UD in MW) transitioned in 2026 from a numeric column (e.g., `914`) to a string range (e.g., `'778/ -819'`). The database schema must define this column as `VARCHAR(50)`.
4. **Target Date vs Reporting Date**: The date in the file's reporting cell is the day *after* the actual electricity data (e.g. reported on May 24, covers May 23). The target date must be calculated as `Reporting Date - 1 day`.
