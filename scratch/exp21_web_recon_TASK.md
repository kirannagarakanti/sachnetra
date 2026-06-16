# TASK: Web-recon — when did each NSE filing first reach the press?

**You are a research agent with web search + file-write access.** Do the task below and write one JSON
file. Read-only on the web; do not touch any database or code.

---

## Background (plain)
A quant system (SachNetra) collects Indian company filings from the NSE *and* news about them from RSS
feeds. We measured the gap between a filing and the first time our feeds carried matching news. For the 52
filings below, **our feeds caught NONE of them** ("MISS"). We need you to find out **why** — for each one,
did the news actually appear in the press, and if so, when and where?

This sorts each filing into one of three buckets (WE do the bucketing afterward — you just supply the facts):
- **Filing-only** — no press covered it (often because it's a routine, non-newsworthy filing).
- **We missed it** — a real outlet covered it that our system doesn't read → we may add that source.
- **Mis-tagged** — an outlet we *do* read covered it but our matcher failed.

---

## Your task — for EACH of the 52 events
Web-search the **earliest public appearance of that specific news** (search the company + the subject +
"June 2026"). Then record what you found.

### Output: write a JSON array to `scratch/exp21_web_findings.json`
One object per event, in this exact shape:

```json
{
  "event_id": "106658143",
  "newsworthy": true,
  "any_press_found": true,
  "earliest_public_appearance_ist": "2026-06-09 09:10",
  "earliest_outlet": "Moneycontrol",
  "earliest_url": "https://www.moneycontrol.com/news/...",
  "timestamp_evidence": "article byline reads 'June 09, 2026 / 09:10 AM IST'",
  "confidence": "high",
  "other_early_outlets": [
    { "outlet": "CNBC-TV18", "time_ist": "2026-06-09 09:25", "url": "https://..." }
  ],
  "notes": "order-win story; also on the company's own PR wire"
}
```

### Field rules
- **`newsworthy`** (true/false): is this a genuinely market-relevant event (results, order win, M&A,
  acquisition/divestment, fund-raising, credit-rating change, major appointment) — OR routine housekeeping
  that the press would naturally ignore (ESOP/share allotments of small lots, NCD private placements,
  "Spurt in Volume" exchange notices, generic investor presentations)? If routine, set `newsworthy:false`
  and you may skip deep searching (a quick check is fine).
- **`any_press_found`**: true only if a news outlet (not the NSE/BSE filing itself, not the company's own
  website) published a story about it.
- **`earliest_public_appearance_ist`**: "YYYY-MM-DD HH:MM" in IST.
- **`timestamp_evidence`**: **quote the actual timestamp text from the page.** No quotable time ⇒ set
  `confidence:"low"`.
- **`earliest_outlet` / `earliest_url`**: who published earliest, with the link.
- **`other_early_outlets`**: any OTHER outlets that covered it within a few hours (this is how we discover
  feeds worth adding) — outlet + time + url.
- **`confidence`**: high / medium / low.
- **`notes`**: paywalled? only on X/Twitter? press-wire only? regional outlet? etc.

### HARD RULES
1. **Never invent a timestamp.** Every time needs a URL + a quoted evidence snippet. No evidence → low
   confidence, or `any_press_found:false` if you genuinely find nothing.
2. Prioritise effort on the `newsworthy:true` events — those are the ones that matter. Mark the routine
   ones quickly and move on.
3. Do not fabricate URLs. If unsure, say so in `notes`.

---

## The 52 events

| # | event_id | ticker | tier | filing_time_ist | filing |
|---|----------|--------|------|-----------------|--------|
| 1 | 106658630 | DANGEE | large/other | 2026-06-09 15:01 | Board outcome — appointment of Company Secretary |
| 2 | 106658592 | VIKRAN | large/other | 2026-06-09 14:20 | Allotment of 40 NCDs |
| 3 | 106658555 | MEGASTAR | large/other | 2026-06-09 13:55 | Outcome of Board Meeting |
| 4 | 106658544 | WANBURY | large/other | 2026-06-09 13:38 | Press release — launch of new APIs |
| 5 | 106658529 | BAJAJ-AUTO | large/other | 2026-06-09 13:29 | Action(s) taken / orders passed |
| 6 | 106658522 | MUFIN | large/other | 2026-06-09 13:21 | Allotment of 100000 NCDs (private placement) |
| 7 | 106658512 | STANLEY | large/other | 2026-06-09 13:12 | Outcome of Board Meeting |
| 8 | 106658478 | MUTHOOTCAP | large/other | 2026-06-09 12:45 | Credit Rating |
| 9 | 106658477 | MUTHOOTMF | large/other | 2026-06-09 12:45 | Credit Rating |
| 10 | 106658441 | PAKKA | large/other | 2026-06-09 12:34 | Allotment — 2,720,000 shares (preferential issue) |
| 11 | 106658421 | BHAGERIA | large/other | 2026-06-09 12:26 | Spurt in Volume (exchange notice) |
| 12 | 106658399 | VGL | large/other | 2026-06-09 12:10 | Bagging/receiving of orders/contracts |
| 13 | 106658382 | VGL | large/other | 2026-06-09 11:57 | Press Release |
| 14 | 106658624 | JSWINFRA | mid | 2026-06-09 14:50 | Bagging/receiving of orders/contracts |
| 15 | 106658537 | ICICIPRULI | mid | 2026-06-09 13:35 | ESOP — allotment of 35,610 shares |
| 16 | 106658479 | GODREJPROP | mid | 2026-06-09 12:45 | Press Release |
| 17 | 106658437 | PERSISTENT | mid | 2026-06-09 12:30 | Press Release — industry award recognition |
| 18 | 106658416 | MARICO | mid | 2026-06-09 12:23 | ESOP — allotment of 54,734 shares |
| 19 | 106658363 | COFORGE | mid | 2026-06-09 11:41 | Press Release — wins Pega award |
| 20 | 106658287 | ICICIPRULI | mid | 2026-06-09 11:02 | Investor Presentation |
| 21 | 106657882 | PERSISTENT | mid | 2026-06-08 20:45 | Amalgamation/Merger (internal restructuring) |
| 22 | 106657862 | PERSISTENT | mid | 2026-06-08 20:08 | Outcome of Board Meeting |
| 23 | 106657847 | NAUKRI | mid | 2026-06-08 19:54 | Press Release — appoints Ms. Radha Rajappa |
| 24 | 106657838 | NAUKRI | mid | 2026-06-08 19:48 | Appointment — board meeting outcome |
| 25 | 106657408 | POWERINDIA | mid | 2026-06-08 13:58 | Investor Presentation (Hitachi Energy India) |
| 26 | 106657387 | HDBFS | mid | 2026-06-08 13:28 | Allotment of 50,500 NCDs |
| 27 | 106658417 | TTML | small | 2026-06-09 12:24 | Action(s) taken / orders passed |
| 28 | 106658394 | KPIL | small | 2026-06-09 12:05 | Outcome of Board Meeting |
| 29 | 106658278 | CCL | small | 2026-06-09 10:45 | Spurt in Volume (exchange notice) |
| 30 | 106657895 | KPIL | small | 2026-06-08 21:16 | Action(s) taken / orders passed |
| 31 | 106657815 | JUBLINGREA | small | 2026-06-08 19:25 | Action(s) taken / orders passed |
| 32 | 106657787 | AMBER | small | 2026-06-08 19:06 | Scheme of Arrangement — order received |
| 33 | 106657775 | IIFL | small | 2026-06-08 18:53 | Credit Rating |
| 34 | 106657755 | LEMONTREE | small | 2026-06-08 18:42 | Press Release — signed a franchise (new hotel) |
| 35 | 106657499 | CANFINHOME | small | 2026-06-08 16:17 | ESOP — allotment of 466 shares |
| 36 | 106657466 | TTML | small | 2026-06-08 15:40 | Spurt in Volume (exchange notice) |
| 37 | 106657418 | CANFINHOME | small | 2026-06-08 14:50 | Outcome of Board Meeting |
| 38 | 106657147 | RITES | small | 2026-06-08 10:19 | Spurt in Volume (exchange notice) |
| 39 | 106657007 | SYRMA | small | 2026-06-07 11:03 | Investor Presentation |
| 40 | 106658561 | KNRCON | micro | 2026-06-09 14:05 | Bagging/receiving of orders/contracts |
| 41 | 106658412 | SKYGOLD | micro | 2026-06-09 12:22 | Outcome of Board Meeting |
| 42 | 106658144 | APOLLO | micro | 2026-06-09 08:43 | Investor Presentation (Apollo Micro Systems) |
| 43 | 106658143 | WABAG | micro | 2026-06-09 08:28 | Order win — Ajman Sewage Biorefinery (GCC) |
| 44 | 106657930 | GMRP&UI | micro | 2026-06-08 22:43 | Sale/disposal — divest 26% stake in Portus Ventures |
| 45 | 106657736 | OSWALPUMPS | micro | 2026-06-08 18:32 | Acquisition |
| 46 | 106657422 | NETWORK18 | micro | 2026-06-08 14:59 | Spurt in Volume (exchange notice) |
| 47 | 106657368 | WAAREERTL | micro | 2026-06-08 12:56 | Bagging/receiving of orders/contracts |
| 48 | 106657366 | DCBBANK | micro | 2026-06-08 12:54 | Allotment — 24,000 shares (ESOP/ESPS) |
| 49 | 106657282 | EQUITASBNK | micro | 2026-06-08 12:10 | ESOP — allotment of 2,148,829 shares |
| 50 | 106657050 | TIPSMUSIC | micro | 2026-06-07 19:08 | Spurt in Volume (exchange notice) |
| 51 | 106656976 | ADVENZYMES | micro | 2026-06-06 20:43 | Acquisition — additional investment |
| 52 | 106656943 | KTKBANK | micro | 2026-06-06 18:45 | Press Release — third-party event |

---

## Deliverable
Output a **JSON array of 52 objects** (one per `event_id`), each with the fields above filled.

**IMPORTANT: paste the complete JSON array directly in your reply** (in a single ```json code block) so it
can be copied back into the analysis pipeline. Do NOT only write it to a file — the file may land in an
environment the requester can't access. If you also want to save a file, fine, but the reply MUST contain
the full JSON.

Then add a 5-line summary: how many were `newsworthy`, how many had press found, and which outlets showed
up most as the *earliest* source (so we know which feeds to consider adding).

If you must work in batches, that's fine — but **assemble and paste the FULL 52-event array at the end**,
not just per-batch fragments.
