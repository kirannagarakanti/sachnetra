# Exp21 web-recon — bucketed analysis (Gemini 3.1 Pro, 2026-06-09)

Input: 52 MISS events (our feeds caught none). Gemini web-searched earliest public appearance.
Bucketing cross-references each event's earliest_outlet vs the live 69-feed india roster (_feeds.ts).
Summary (Gemini): 31 newsworthy / 21 routine; 24 of 31 newsworthy had press/aggregator coverage.

## Buckets

### A — an outlet WE ALREADY INGEST covered it → MATCHER MISSED IT (the real bug) (~11)
| event | ticker | covered by (in roster) | filing→press |
|---|---|---|---|
| 106658529 | BAJAJ-AUTO | Business Standard, Economic Times | GST appellate order |
| 106658512 | STANLEY | Economic Times | 5-subsidiary merger |
| 106658624 | JSWINFRA | ET Infra, Business Standard | **press −19 DAYS (pre-filing! anti-edge)** |
| 106658479 | GODREJPROP | Business Standard, Economic Times | ₹2,000cr Bengaluru launch |
| 106657787 | AMBER | Economic Times | NCLT merger order |
| 106657755 | LEMONTREE | Business Standard | Jaipur franchise |
| 106657418 | CANFINHOME | Business Standard, Moneycontrol, ET | ₹5,000cr fundraise + dividend |
| 106658561 | KNRCON | Business Standard | ₹235cr flyover LoA (+60min) |
| 106658412 | SKYGOLD | Business Standard | new CEO |
| 106658143 | WABAG | Business Standard | UAE sewage EPC order |
| 106656943 | KTKBANK | Times of India (Mangaluru) | TPP conf (borderline) |

⇒ **The dominant finding: BS/ET (which we ingest) covered these, but our ticker-tag matcher logged MISS.
The bottleneck is the MATCHER, not press coverage.**

### B — real outlet we DON'T ingest → ADDABLE SOURCE candidates (~5)
| event | ticker | earliest outlet (NOT in roster) |
|---|---|---|
| 106658417 | TTML | **Moneycontrol** ⭐ (top gap — major outlet, not in feeds) |
| 106657847/838 | NAUKRI | Adgully |
| 106658394 | KPIL | Outlook Business / NewsDrum (PTI) |
| 106657736 | OSWALPUMPS | Business Upturn |
| 106657368 | WAAREERTL | Free Press Journal (+ Saur Energy niche) |

### B(aggregator-only) — filing scrapers, NOT editorial, no head-start → do NOT add (~6)
WANBURY, PAKKA, VGL×2, GMRP&UI, ADVENZYMES — only on sahi.com / scanx.trade / whalesbook /
tradebrains / trendlyne (these re-echo the NSE filing instantly; carry no alpha).

### C — filing-only / no real press (~30)
21 routine (newsworthy:false: ESOP/share allotments, NCD private placements, Spurt-in-Volume exchange
notices, generic investor presentations) + IIFL (rating agencies only) + Persistent×2, KPIL-Eswatini-tax,
Jubilant-tax, Equitas-ESOP, Muthoot Cap/Microfin ratings (any_press_found:false).

## Addable-source shortlist (for the 3-file RSS allowlist)
1. **Moneycontrol** — #1 priority; absent from feeds; major retail-investor outlet; earliest on TTML.
2. **Business Upturn** — fast on small/mid-cap corporate actions.
3. **Free Press Journal** — covered Waaree order.
4. (niche) Adgully, Outlook Business — lower priority.
Skip all aggregators (sahi/scanx/whalesbook/tradebrains/trendlyne) — filing echoes.

## Latency reality
Where timestamps were extractable: filing→press = minutes-to-hours (KNRCON +60m, Waaree +178m, Info Edge
next-morning) OR negative (JSWINFRA −19 days). The raw-run 4.5–12h medians were inflated by the matcher
catching LATE coverage. Most events had no extractable web timestamp (BS/Moneycontrol 403'd).

## Verdict + next moves
- Head-start thesis **still unproven** — blocked by the matcher confound, not refuted.
- **Action 1 (highest leverage):** matcher v2 — match filings to news by COMPANY NAME in headline text,
  not just sparse ticker-tags. Recovers the ~11 bucket-A events → real latency measurement.
- **Action 2:** add Moneycontrol (+ Business Upturn, Free Press Journal) via the 3-file allowlist.
- **Action 3:** tighten the material filter (drop the 21 routine), then re-run Exp21 on the clean+matched set.
- Note the JSWINFRA pre-filing case: for some events the press beats the filing → no edge there.
