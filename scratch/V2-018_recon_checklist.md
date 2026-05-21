# V2-018 Recon Checklist — NSE/BSE Bourse Announcements

## Part A — NSE Announcements (PRIMARY)

### A1. Endpoint confirmation
- **Base Endpoint**: `GET https://www.nseindia.com/api/corporate-announcements?index=equities` (Returns 200 OK, JSON array, typically latest 20 items)
- **Date Filter**: `&from_date=DD-MM-YYYY&to_date=DD-MM-YYYY` works perfectly. (Tested with `20-05-2026` to `21-05-2026`, returned 1811 items).
- **Symbol Filter**: `&symbol=RELIANCE` works perfectly. (Returned 3283 historical items).
- **Adjacent Feeds**:
  - `.../api/corporate-board-meetings?index=equities` (200 OK)
  - `.../api/corporates-corporateActions?index=equities` (200 OK)
  - `.../api/corporate-financial-results?index=equities` (404 Not Found)
- **Referer**: `https://www.nseindia.com/companies-listing/corporate-filings-announcements` (Standard warm-up on `https://www.nseindia.com/` is sufficient).

### A2. Handshake mechanics
- **Cookie Warm-up**: Works identical to FII/DII. `GET https://www.nseindia.com/` first, capture `set-cookie`, then pass to the API.
- **TLS/Browser**: Plain Node.js `fetch()` is sufficient with `User-Agent` and cookies. No headless browser required.

### A3. Payload shape
Sample saved in `scratch/nse_announcements_sample.json`.
- **Symbol/Company**: `symbol` (e.g. "RPSGVENT"), `sm_name` (e.g. "RPSG VENTURES LIMITED"), `sm_isin` (e.g. "INE425Y01011")
- **Announcement Subject**: `attchmntText` (e.g. "Company has informed the Exchange regarding Appointment...")
- **Category**: `desc` (e.g. "Outcome of Board Meeting", "Dividend")
- **Timestamp**: `an_dt` (e.g. "21-May-2026 19:55:12") and `sort_date` (e.g. "2026-05-21 19:55:12")
- **Attachment URL**: `attchmntFile` (e.g. "https://nsearchives.nseindia.com/corporate/...") - Critical for V2-015.
- **Dedupe Key**: `seq_id` (e.g. "106634628") provides a stable natural key.

### A4. Depth & volume
- **Volume**: ~900 announcements per weekday on average (2-day filter returned 1811 items).
- **Look-back**: Symbol filter returns thousands of records historically. Date filters can span at least a month.
- **Pagination**: None. It returns a single massive JSON array.

---

## Part B — BSE Announcements (SECONDARY)
- **Endpoint**: `GET https://api.bseindia.com/BseIndiaAPI/api/AnnGetData/w`
- **Headers**: Required `User-Agent`, `Referer: https://www.bseindia.com/`, `Origin: https://www.bseindia.com`.
- **Status**: The endpoint successfully accepts CORS/fetch requests (HTTP 200) but returns empty objects `{}` when tested with various date parameters (`YYYYMMDD`, `YYYY-MM-DD`). 
- **Recommendation**: BSE requires highly specific query parameters that tend to drift (e.g., `strCat=-1`, `strSearch=P`, `strType=C`, etc.). Given NSE's reliability and clean JSON, BSE should remain a stubbed secondary source.

---

## Part C — Classification fodder

**Distinct Categories Observed on NSE (from `desc` field):**
'Outcome of Board Meeting', 'Appointment', 'Press Release', 'Dividend', 'Change in Director(s)', 'Record Date', 'Analysts/Institutional Investor Meet/Con. Call Updates', 'Diversification/Disinvestment', 'Updates', 'Copy of Newspaper Publication', 'General Updates', 'ESOP/ESOS/ESPS', 'Amalgamation/Merger', 'Change in Management', 'Acquisition', 'Allotment of Securities', 'Change in Auditors', 'Issue of Securities', 'Change in Company Secretary/Compliance Officer', 'Action(s) taken or orders passed', 'Credit Rating', 'Disclosure under SEBI Takeover Regulations', 'Buyback'.

**High-Alpha Candidates for V2-015 (OCR):**
- `Outcome of Board Meeting`
- `Change in Director(s)`
- `Change in Auditors`
- `Acquisition` / `Amalgamation/Merger` / `Diversification/Disinvestment`
- `Credit Rating` (upgrades/downgrades)
- `Disclosure under SEBI Takeover Regulations` (SAST/pledging)

---

## Issues Flagged

1. **Anti-bot**: NSE actively monitors IPs. The warm-up loop is essential. If `401/403` is hit, script must automatically refresh session cookies.
2. **Field-name drift**: The NSE JSON mixes `snake_case`, `camelCase`, and `sm_` prefixes. The mappings provided in A3 are exact.
3. **Timezone**: `sort_date` is strictly IST. This is trustworthy for leading news alpha.
4. **Attachment URLs**: Hosted on `nsearchives.nseindia.com`. Directly fetchable, but might require the same session cookies if blocked.
5. **Dedupe**: `seq_id` is a perfect primary key. No need to hash fields.
6. **Empty days**: A weekend date filter will return `[]`. The ingest script must gracefully log and exit without errors.
