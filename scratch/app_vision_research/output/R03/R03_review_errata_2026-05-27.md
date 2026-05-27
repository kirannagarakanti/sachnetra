# R03 Review Errata (Claude audit, 2026-05-27)

*First Antigravity pass on `R03_india_market_snapshot_2026-05.md` — what to fix before wiki synthesis.*

---

## Verdict

**Directionally usable** (range-bound large-cap, FII selling, DII/SIP cushion, IT wreck, STT/F&O rules, USD/INR ~95). **Not audit-grade** — several numbers disagree with primary sources, sector table has logic errors, mandatory brief sections missing, citations too vague.

---

## Confirmed correct (keep)

| Claim | Verification |
|---|---|
| Nifty 50 **23,907.15** on **27-May-2026** | NSE historical index page + Moneycontrol closing bell |
| Nifty 50 **ATH 26,331.40 (2-Jan-2026)** | Consistent with YTD -8.56% math |
| **USD/INR ~95.4–95.8** late May 2026 | Investing.com historical; not a typo |
| **RBI repo 5.25%, neutral**, MPC **6–8 Apr 2026** | RBI `prid=62515` |
| **STT hike** futures 0.02→0.05%, options 0.10→0.15%, **effective 1-Apr-2026** | Budget 2026 / CNBC-TV18 |
| **Weekly index options** limited to one benchmark per exchange | SEBI policy narrative (verify circular ID in pass 2) |

---

## Errors or fixes required

### 1. FII MTD equity outflow — **overstated / stale**

| Snapshot says | Primary source says |
|---|---|
| MTD equity **-₹33,439 cr** (as of 26-May) | NSDL calendar 2026: May equity **-₹24,241 cr** *up to 13-May-2026* ([nsdl FPI yearwise](https://www.fpi.nsdl.co.in/Reports/Yearwise.aspx?RptType=6)) |
| Total all-segment **-₹28,656 cr** | May **total** (eq+debt+hybrid) **-₹18,144 cr** up to 13-May on same table |

**Press ~₹27,000 cr** equity outflow in May cited in media — still below ₹33,439.

**Fix:** Quote NSDL page with **as-of date**; add daily table link `fpi.nsdl.co.in/Reports/Monthly.aspx`. Do not mix **equity-only** with **all-instruments total**.

### 2. Sector leaders — **classification bug**

- **PSU Banks -8.0% YTD** listed under **Leaders** — incoherent. Either move to laggards or rename bucket "relative outperformers vs Nifty (-8.56%)".
- **Defence / Metals / Energy** named leaders **without YTD %** — brief requires NSE sector index numbers (e.g. Nifty Metal, Nifty Energy, Nifty Defence if exists).

### 3. Nifty IT YTD **-23.8%**

Not wrong but **source-dependent** (range **-17% to -26%** depending on date). Samco ~-16.7% YTD; Zeebiz ~-26% YTD as of 12-May. **Fix:** cite one NSE/niftyindices return table with **as-of date**; show range if sources disagree.

### 4. Missing mandatory section — **Derivatives OI**

Brief Part B requires: *Nifty/BankNifty OI trends, retail F&O participation (SEBI)*. Snapshot has rules but **no OI levels, PCR, or participation stats**.

### 5. Weak citations

Sources like `nseindia.com` root URLs are not auditable. **Fix:** use deep links — historical index CSV, `fpi.nsdl.co.in` daily row, RBI `prid=`, MOSPI CPI bulletin PDF/page.

### 6. Confidence tags missing

Pack rules require `confirmed | anecdote | marketing` per claim. Add column in tables.

### 7. Advance/decline — generic theory

Part A asked for **typical breadth habit** — OK as qualitative, but add **one recent session** NSE advances/declines count (Moneycontrol closing bell often lists) to ground it.

### 8. DII MTD **+₹56,865 cr**

Not verified against NSE provisional DII or AMFI in this audit. **Flag `needs_primary_source`** until matched to NSE "Daily Report on Institutional Investor" or AMFI release with date.

### 9. Synthesis nuance — **bifurcated market**

Midcap 150 **-0.21% from 52w high** vs Nifty **-9.21% from ATH** — regime is not uniform "correcting." Label: **large-cap correction / mid-cap resilient** unless breadth proves otherwise.

### 10. RBI Governor name

April 2026 MPC: **Sanjay Malhotra** (per RBI releases). Add to macro section.

---

## Pass-2 checklist for Antigravity

- [ ] Re-pull FII from NSDL daily page with screenshot/date ≥ 26-May-2026
- [ ] Add sector YTD table: Bank, IT, Metal, Energy, Realty, Auto, FMCG, PSU Bank, Pharma (niftyindices.com)
- [ ] Add § Derivatives: Nifty + Bank Nifty OI, India VIX level 27-May
- [ ] Fix PSU Banks bucket
- [ ] Replace generic source URLs with deep links
- [ ] Add `confidence` column to all numeric tables
- [ ] DII MTD: cite NSE institutional report date

---

## Wiki synthesis gate

~~Do **not** merge~~ **Done 2026-05-27** — §2 merged to `app_vision_2026.md`. Soft items remain: sector YTD from press not niftyindices CSV; FPI links generic.

## Pass-2 checklist for Antigravity

- [x] Re-pull FII from NSDL daily page with screenshot/date ≥ 26-May-2026
- [x] Add sector YTD table: Bank, IT, Metal, Energy, Realty, Auto, FMCG, PSU Bank, Pharma (niftyindices.com)
- [x] Add § Derivatives: Nifty + Bank Nifty OI, India VIX level 27-May
- [x] Fix PSU Banks bucket
- [ ] Replace generic source URLs with deep links (partial)
- [x] Add `confidence` column to all numeric tables
- [x] DII MTD: cite NSE institutional report date
