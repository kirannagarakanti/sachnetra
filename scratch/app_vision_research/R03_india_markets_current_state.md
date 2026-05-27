# R03 — India Markets Current State (May 2026 Baseline)

*Facts-first snapshot: indices, flows, policy, retail participation, structural changes.*

**Output folder:** `scratch/app_vision_research/output/R03/`  
**As-of date:** record every number with **date + source URL**  
**Quality gate:** after Antigravity, Claude may publish `output/R03/R03_review_errata_*.md` — fix all **superseded** rows before wiki merge.

### Primary sources (use before blogs)

| Data | URL |
|---|---|
| Index closes | `https://www.nseindia.com/reports-indices-historical-index-data` |
| Sector YTD | `https://www.niftyindices.com/` → index returns |
| FPI daily/MTD | `https://www.fpi.nsdl.co.in/Reports/Monthly.aspx` + `Yearwise.aspx?RptType=6` |
| DII cash market | NSE daily institutional report (search "NSE FII DII trading activity") |
| RBI MPC | `https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=` (April 2026: 62515) |
| CPI/WPI | MOSPI press release pages |

**Ban:** citing `nseindia.com` or `nsdl.co.in` homepage without path. **Require:** `confidence` column on every numeric table.

---

## Part A — Index & breadth

- Nifty 50, Nifty 500, Midcap 150, Smallcap 250 — YTD, 1Y, ATH distance
- Advance/decline habit (typical daily breadth)
- Sector leaders/laggards YTD (NSE sector indices)

Sources: NSE, Moneycontrol, Trendlyne, TradingView — cross-check ≥2.

---

## Part B — Flows & positioning

- FII/FPI equity flows (daily + MTD) — NSDL/CDSL published data
- DII (mutual fund net) — AMFI
- SIP flows monthly
- Derivatives: Nifty/BankNifty OI trends, retail F&O participation stats (SEBI studies if any 2024–2026)

---

## Part C — Macro & policy (India)

- RBI repo rate, stance, last MPC summary bullets
- CPI/WPI latest prints
- INR vs USD (spot + REER if available)
- Fiscal: divestment, capex headlines
- Union Budget 2026–27 key market-moving items (if passed)

---

## Part D — Market structure changes (still relevant in 2026)

Document **rules** not opinions:

- T+1 settlement
- Peak margin / intraday leverage rules
- SEBI F&O restrictions (lot sizes, weekly contracts, eligibility)
- ASM/GSM lists growth
- Block/bulk deal disclosure (ties to V2-030 collector)

---

## Part E — Corporate actions & earnings season

- Current earnings season phase (if active)
- Major index reshuffles pending
- Large upcoming IPO/OFS calendar (top 10 by size)

---

## Part F — "Temperature check" synthesis

One-page memo:

- **Regime label**: risk-on / risk-off / range-bound (justify with 3 facts)
- **Retail mood** (pointer to R04/R06 — don't duplicate deep sentiment here)
- **Institutional mood** (FII/DII, broker notes if public)
- **Biggest 3 risks** next 90 days (fact-based)
- **Biggest 3 tailwinds**

**Deliverable:** `R03_india_market_snapshot_2026-05.md`

---

## Status checklist

- [x] A indices
- [x] B flows
- [x] C macro
- [x] D structure rules
- [x] E calendar
- [x] F synthesis memo
