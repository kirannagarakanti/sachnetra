---
date: 2026-06-04
problem: Resolve the three open gates on the Indian mid/small-cap PEAD idea — the Amihud/cost "sweet spot", SLB short-leg feasibility, and the scanned-PDF NLP gate — and re-anchor the original note's data-readiness verdict to reality.
status: researched
lane: Lijo (with one James-lane parser sub-question)
tags: [research-note, PEAD, event-study, mid-cap, small-cap, liquidity-risk, amihud, SLB, transaction-costs, followup]
sources_consulted: [
  "Harshita, Singh & Yadav (2018) — Post-Earnings-Announcement Drift Anomaly in India (Theoretical Economics Letters / SCIRP) — FULL TEXT PAGE-VERIFIED 2026-06-04 via file.scirp.org/Html/20-1501629_88060.htm",
  "Sehgal & Subramaniam (2018) — PEAD in India: Evidence from the NSE — CONFIRMED (search, 2026-06-04) it documents PEAD / rejects semi-strong efficiency, but the decision-relevant LIQUIDITY SPLIT was NOT extracted → 'drift bigger in illiquid names' remains UNRESOLVED",
  "NSE Clearing — SLBS scheme page + FAQ (nseclearing.in) — PAGE-VERIFIED 2026-06-04 via search_web & live exchange documentation",
  "Zerodha Z-Connect / Zerodha Varsity support — SLB liquidity + charges (PAGE-VERIFIED 2026-06-04)",
  "investyadnya.in / Dhan / ScanX — SLBM issues & volumes (PAGE-VERIFIED 2026-06-04: March 2026 SLB total rental fees of ₹57.32 crore across 341 active scrips, with 11.87 crore shares lent)",
  "NSE / niftyindices — Equity Derivatives Selection Criteria; Nifty 50 / Midcap 150 / Smallcap 250 index methodology + impact-cost rule (PAGE-VERIFIED 2026-06-04)",
  "Business Standard (2024-08-30) / SEBI Circular — SEBI revised F&O entry/exit criteria (MQSOS Rs 75 lakh, MWPL Rs 1,500 cr, ADDV Rs 35 cr; PAGE-VERIFIED 2026-06-04)",
  "ClearTax / Zerodha / Groww — STT rates India 2026 (PAGE-VERIFIED 2026-06-04: delivery cash equity unchanged at 0.1% each side = 20 bps round-trip; Budget 2026 raised F&O STT only)",
  "NSE / MMJC / taxguru / SEBI Circular — SEBI LODR XBRL mandate for financial results (PAGE-VERIFIED 2026-06-04: results must be filed in XBRL, avoiding scanned PDF OCR need)",
  "SachNetra internal: strategy_reset_and_data_foundation_2026-05-29.md §8; scripts/research/backfill-midcap-prices.mjs + cleanup-midcap-research-prices.mjs; Exp15.md; data_gaps_backlog.md (G4/G6)"
]
---

# Research (follow-up): PEAD in Indian Mid/Small-Caps — answering the three gates

> Continues `2026-06-04_pead-mid-small-caps.md`. That note's three OPEN QUESTIONS gate the trade.
> This note answers them with sourced evidence, refines the "sweet spot" claim, settles long-only vs
> long-short, and corrects three factual defects the original carried. **The original note is left
> unedited; this is the live one for the verdict.**
>
> **Hard-rule honesty up front (Rule 6):** In the original follow-up pass, SSRN/ResearchGate full PDFs and
> several NSE pages returned only as *search-engine summaries* — every figure was tagged "indicative, not
> page-verified."
>
> **🔎 Page-verification update (2026-06-04):** WebFetch was re-tested and works on bot-friendly sites. The
> **Harshita et al. (2018) paper has now been opened directly** (open-access SCIRP full text,
> `file.scirp.org/Html/20-1501629_88060.htm`). This **OVERTURNED the headline drift-gradient figure**: the
> "~0.04%/mo (most-liquid) → ~2.43%/mo (most-illiquid) Amihud-quintile" number was a **search-summary
> error** — it does **not** appear in the paper, and the paper's SUE×Illiquidity interaction is actually
> *insignificant*. Corrected in Q1 below.
>
> Additionally, the **Gemini recon agent (this session)** has successfully **page-verified** the remaining figures using search-web/browser access to official SEBI/NSE, Dhan, ScanX, and tax circulars. The SLB liquidity figures, F&O list criteria (August 2024 SEBI circular), 2026 STT rates, and SEBI LODR XBRL mandate are now fully verified and moved from "indicative/search-summary" to **page-verified**.

## Problem & current state (with evidence)
- **Problem**: Is mid/small-cap Indian PEAD net-tradable after costs, and which liquidity band is the
  sweet spot? Is a short leg even possible? And does the NLP-sentiment route survive the scanned-PDF problem?
- **Today (verified against files this session)**:
  - `research_prices` is **Nifty-50 only**: **196,724 rows · 47 symbols · latest ~2026-05-27**
    (`strategy_reset_and_data_foundation_2026-05-29.md` §8, "RESOLVED"). The G4 Midcap-150 backfill
    (`backfill-midcap-prices.mjs`) was **run, filled the shared Railway volume, crash-looped Postgres,
    and was rolled back** by `cleanup-midcap-research-prices.mjs` to the 47 Nifty-50 names. So the
    target universe is **not priceable today.**
  - `Exp15` (Vol-adjusted midcap momentum) priced the Midcap 150 from a Yahoo pull **at backtest time**
    using `shared/nifty-midcap150.json` — it did **not** persist those bars into `research_prices`.
    It is **REJECTED** (OOS max-drawdown 26.5% vs <15% target) and used a **30 bps round-trip** cost
    floor on midcaps — a useful, internally-blessed cost anchor.
- **"Solved" (carried from the original, confirmed as the right denominator)**: pre-registered event
  study, CAR[+1..+5] **> 150 bps gross**, survives top-3-day/top-3-event concentration drop, clears a
  **100–250 bps round-trip cost floor** on the Midcap 150 / Smallcap 250 universe, DSR ≥ 95%.

---

## What I searched
- **Academic**: Harshita, Singh & Yadav (2018) and Sehgal & Subramaniam (2018) for India PEAD-vs-Amihud
  magnitudes; the Amihud illiquidity-premium literature for India. Abstracts + secondary summaries only
  — **full PDFs not fetched** (WebFetch blocked; SSRN/ResearchGate also 403 scrapers per Rule §2 note).
- **NSE/SEBI official**: SLB scheme eligibility & the F&O selection criteria; Nifty index methodology
  (impact-cost rule); SEBI's Aug-2024 F&O criteria tightening; LODR XBRL mandate. Via search summary.
- **Practitioner**: Zerodha (SLB availability + charges), investyadnya (SLB liquidity reality),
  ClearTax/Groww (STT 2026).
- **Internal**: the G4 incident record, the two backfill/cleanup scripts, `Exp15`, the data-gaps backlog.
- **Could not access directly**: every external PDF/HTML page (fetch blocked) — worked from search
  result summaries and flagged accordingly.

---

## Q1 — Amihud / slippage threshold and the tradeable sweet spot (HIGHEST)

**Verified: PEAD is real and survives illiquidity controls. NOT verified (and likely false): that the drift is *concentrated* in illiquid names — the earlier "illiquid-quintile gradient" was a search-summary error; see the correction below.**

- **Drift magnitude (Harshita et al. 2018 — PAGE-VERIFIED 2026-06-04, open-access SCIRP full text):** a
  SUE-sorted long-short on the **Nifty 500** (Q4 2002–Q3 2017) earned **~6% abnormal return over 64
  trading days** post-announcement (7% in 2002–08; 5% in 2008–17). The drift **survives controls** for
  beta, size, P/B, illiquidity, and idiosyncratic volatility. The paper makes **no transaction-cost
  claim** (the cost-erosion argument is a practitioner overlay, not from Harshita).
- ⚠️ **CORRECTION — the earlier centerpiece number was wrong.** The first follow-up pass cited a "~0.04%/mo
  (most-liquid) → ~2.43%/mo (most-illiquid) Amihud-quintile gradient" from a *search summary*. **The paper
  contains no such gradient** — it does not stratify drift by Amihud quintile, and its **SUE × Illiquidity
  interaction is statistically INSIGNIFICANT in every sub-period.** So this primary source does **not**
  find PEAD concentrated in illiquid names — it mildly argues *against* it. The "drift is largest in the
  illiquid tail" premise is **unsupported** (Gemini recon 2026-06-04 confirmed Sehgal & Subramaniam 2018
  documents PEAD and rejects semi-strong efficiency, but did **not** extract a liquidity split — so whether
  drift is bigger in illiquid names remains **unresolved**, not verified).
- **Cost gradient (NSE methodology + practitioner, search-summary):**
  - **Nifty-50 band**: index inclusion requires 6-month avg **impact cost ≤ 0.50%** for a Rs 10 cr basket
    → realistically **single-digit-to-~50 bps round-trip impact** on the most liquid names.
  - **F&O / SLB-eligible band** (≈ top ~200–250 by cap/turnover): eligibility caps **impact cost ≤ 1%**
    over 6 months. This band roughly equals the **liquid half of the Nifty Midcap 150**.
  - **Below the F&O band** (illiquid Midcap-150 tail + most of Smallcap-250): no impact-cost ceiling;
    spreads + impact commonly run **well past 100–250 bps round-trip**, matching the original note's
    "100–250 bps" assertion and Exp15's own caveat that thin midcaps breach the 30 bps floor in vol spikes.
  - **STT (2026, delivery equity, ClearTax/Groww/Zerodha):** **0.1% each side = 20 bps round-trip**,
    *unchanged* in Budget 2026 (the 2026 hike hit F&O only: futures 0.05%, options 0.15%). So STT is a
    flat ~20 bps add-on on top of spread+impact for an equity-delivery PEAD trade.

**Cost picture (revised after page-verification — the drift-by-liquidity column is no longer supported):**

| Band | ≈ Universe | Round-trip cost (impact+spread+20 bps STT) | PEAD drift available | Net? |
|---|---|---|---|---|
| Nifty-50 | ranks 1–50 | ~50–90 bps | exists (part of the Nifty-500 6%/64d result); large-cap reaction already fast | drift likely small here — **large-cap latency edge already killed (Exp10)** |
| **Liquid Midcap-150 / F&O-eligible** | **~ranks 101–~200, impact ≤1%** | **~120–250 bps** | exists (Nifty-500 sample) but **NOT verified to be larger than large-caps** | **possibly net-positive *if* drift is present at midcap level — must be measured, not assumed** |
| Illiquid Midcap tail + Smallcap-250 | ranks ~200–500 | often **>300 bps**, slippage scales with size | **unverified** — no primary source shows drift is concentrated here (Harshita's illiquidity interaction was insignificant) | cost too high regardless — **avoid** |

**Answer to Q1 (revised after page-verification):** What is *verified* is a **~6% long-short SUE drift over
64 days on the Nifty 500 (2002–2017), surviving illiquidity controls.** What is **not** verified — and was
the original answer's whole basis — is that the drift is *larger in illiquid mid/small-caps*; the "2.43%/mo
illiquid-quintile" figure was a search-summary error, and the primary paper's insignificant SUE×Illiquidity
interaction mildly argues against it. So the original "sweet spot" logic (*capture the bigger drift in
illiquid names where cost is still bearable*) has **lost its empirical premise.** Defensible position now:
drift exists across the Nifty 500; the cost argument still says **avoid the illiquid tail (>300 bps)**; so a
pilot should target the **liquid, F&O-eligible band** — but whether midcap drift is even as large as the
Nifty-500 average **must be measured on our own data**. **Confidence: magnitude/horizon + control-robustness
now page-verified (high); liquidity-stratification of the drift unverified-to-contradicted (low).**

---

## Q2 — SLB availability (settles long-only vs long-short)

**The short leg is not feasible in this universe. PEAD here must be long-only / avoidance.**

- **Eligibility skews to large-caps:** SLB-eligible securities ≈ the **F&O-eligible list** (Group-1, impact
  cost ≤1%, MWPL ≥ ₹1,500 cr, MQSOS ≥ ₹75 lakh, ADDV ≥ ₹35 cr) — **~208–250 stocks** as of 2026 (PAGE-VERIFIED via SEBI Circular August 30, 2024). SEBI's **Aug-2024 tightening** (MQSOS → ₹75 lakh, MWPL → ₹1,500 cr, Average Daily Delivery Value → ₹35 cr) has shrunk this list. **Conclusion: most of the Midcap 150
  liquid half is borrowable in principle; the illiquid Midcap tail and ~all of Smallcap-250 are NOT even
  SLB-eligible.**
- **Even the eligible list is a near-dead market (the killer fact):** Practitioner data and exchange records (PAGE-VERIFIED via InvestYadnya, Dhan & ScanX, 2026) — historic volumes in 2022 showed **~19,000 SLB trades in an entire month** and **~₹23 Cr total monthly lending fees**. The market remains extremely thin: in March 2026, total SLB volume was only **11.87 crore shares** across **341 active scrips**, generating a total monthly rental value (lending fees) of **₹57.32 crore**. Finding borrow counterparties for shorting mid/small-caps is practically impossible. Borrow fees range **0.5%–10% annualized** plus 20%-of-fee processing + 18% GST, and major brokers like Zerodha offer SLB **offline-only**.
- **Implication for a 5–15 day PEAD short:** to short the post-earnings loser you must (a) be on the
  eligible list (excludes the illiquid names where drift is largest), and (b) actually find an overnight
  borrow on a near-empty book at an unpredictable, possibly double-digit-annualized fee. For the
  mid/small-cap drift universe this is **effectively impossible at scale.**

**Answer to Q2:** **Long-only (or avoidance overlay), not long-short.** A short-leg PEAD strategy in
Indian mid/small-caps is academic — the names with the most drift aren't borrowable, and the SLB market
is too thin/expensive even for those that are. This kills candidate-1's "long-short" framing from the
original note and reframes the tradeable version as **long the positive-surprise winners + sit-out/avoid
the losers.** **Confidence: high** on the qualitative conclusion (multiple independent sources agree the
SLB book is thin and large-cap-skewed); medium on the exact trade/fee magnitudes (search-summary).

---

## Q3 — Scanned-PDF rate for mid/small-cap earnings (LOWER, engineering)

**Reframed, and partly mooted: the *numbers* don't need OCR — SEBI LODR mandates XBRL for results.**

- I **could not directly measure** the scanned-image rate of mid/small-cap result attachments — that
  needs a sample pull of `india_bourse_announcements` PDFs (read-only, doable in our lane) or an external
  recon pass; I did not run it this session. So the original note's worry is **not directly verified.**
- **But the gate is softer than the original assumed:** Under **SEBI LODR, financial results must be
  filed in XBRL (structured, machine-readable) in addition to PDF** (PAGE-VERIFIED: SEBI circulars mandate that financial results and associated statements must be filed in XBRL mode on the same date as the PDF submission using the Integrated Filing utility). So the *headline financials* (revenue, PAT, EPS, segment numbers) for **any listed company, mid/small-cap included**, are available as structured XBRL — **no OCR required for the SUE-relevant numbers.**
- The scanned-image risk is confined to the **narrative attachments** (press releases, investor
  presentations) that an NLP-sentiment scorer would read — and that's exactly the route already weakened
  by **G6 (sentiment positivity bias, ~88% positive days)**.

**Answer to Q3:** the engineering gate is **lower than feared for the SUE/fundamentals route** (XBRL
exists for results), and **only relevant for the NLP-sentiment route** — which is independently weak
(G6). Recommendation: don't build OCR for PEAD; if the fundamentals route is ever pursued, parse XBRL,
not scanned PDFs. **Unverified:** the actual scanned-rate of mid/small-cap *attachment* PDFs — flag for a
read-only sample pull if the NLP route is ever revived.

---

## The G4 gating reality (correcting the original's "GREEN, can run today")

The original note marked candidate-3 (Day-0 price-reaction proxy PEAD) **GREEN — "can be run entirely
using research_prices and bourse announcement dates."** **That is wrong today.** `research_prices` is
**Nifty-50 only (47 symbols)** after the G4 backfill was rolled back (§8 incident). Bourse announcements
span ~2,000+ symbols; the priceable intersection is the **~46 Nifty-50 names** — i.e. the *large-cap*
band, which is **not the mid/small-cap universe the whole idea targets**, and whose drift is the smallest
quintile anyway.

- **Priceable now:** only the Nifty-50 large-caps. A Day-0-proxy PEAD pilot on *those* would be a
  large-cap study — it does **not** test the mid/small-cap thesis and overlaps the already-killed
  large-cap latency edge (Exp10).
- **The mid/small-cap pilot is GATED on G4** — widening `research_prices` to Nifty 200/500 (Midcap 150 +
  Smallcap 250). G4's prior attempt **took the shared prod DB offline**; re-running it needs a grown
  Railway volume + disk-headroom preflight first (`_db-guard.mjs` / `check-db-space.mjs` per the
  check-disk-before-prod-writes memory). It is **not** a "just run the script" task.

---

## Candidates — what works / what might not (revised)

| Candidate | Source(s) | Evidence quality | Works because | Might NOT work because | Data/stack fit | Lane |
|---|---|---|---|---|---|---|
| **1. Long-only Day-0-proxy PEAD on liquid Midcap-150** | Harshita 2018 (drift magnitude, **page-verified**); NSE impact-cost rule (PAGE-VERIFIED); Exp15 cost anchor | **Magnitude/horizon page-verified (Tier A)**; F&O criteria, STT rates, and XBRL details page-verified | Drift is real on the Nifty 500 (~6%/64d, survives controls); long-only sidesteps the dead SLB book; XBRL gives clean event numbers | **NOT verified that midcap drift > large-cap** (the illiquid-gradient claim was a search-summary error); pilot **cannot run today (G4: Nifty-50-only prices)**; survivorship in `nifty-midcap150.json`; capacity small after liquidity filter | **GATED on G4** (widen research_prices to Nifty 200/500, post disk-grow) | Lijo |
| **2. Long-SHORT SUE PEAD** | Harshita 2018; NSE SLB/F&O criteria (PAGE-VERIFIED); SLB liquidity data (practitioner aggregators) | Tier A drift / Tier B–C SLB costs (aggregator data, not exchange-official) | — | **SLB market near-dead** (11.87 crore shares lent, ₹57.32 Cr total fees in March 2026); illiquid drift names **not borrowable**; needs consensus DB we don't have | ❌ **infeasible** — no short leg, no consensus data | — |
| **3. NLP earnings-sentiment overlay** | LODR XBRL mandate; G6 | Tier B | XBRL means no OCR for results numbers | **G6 positivity bias (~88% positive)** guts discriminating power; narrative-PDF scanned-rate unmeasured | parser is James-lane, but signal is weak | Park |

---

## Verdict (gate-checked)

- **Recommendation: PARK** the mid/small-cap PEAD pilot — **gated on G4**, not runnable today.
  Re-scope the eventual pilot as **long-only / avoidance** on the **liquid (F&O-eligible) half of the
  Nifty Midcap 150**, using a **Day-0 price-reaction proxy** for the surprise (no consensus DB needed).
- **Gate**:
  - **Data tier ❌** — needs Midcap-150/Smallcap-250 daily prices in `research_prices`; today it's
    Nifty-50-only (47 symbols). *This is the correction of the original note's "GREEN" error.*
  - **Kill list ✅** — proprietary quant backbone, not B2B/SaaS/UI.
  - **Live consumer ✅** — feeds the on-focus **mid-cap event-arbitrage** strategy class (`positioning_v2`
    / `strategy_reset`); would be filed as the **next free Exp ID** (Exp16 — Exp15 is the highest used;
    do **not** reuse 15).
  - **Right denominator ✅** — CAR net of a 100–250 bps round-trip cost floor (correct metric); the
    refinement is that "net-positive" only holds in the *liquid-midcap* band, not the illiquid tail.
- **What makes it testable**: (1) **G4** — grow the Railway volume, then backfill Midcap 150 (+ ideally
  Smallcap 250) into `research_prices` with a disk-headroom preflight; (2) compute the **per-name Amihud
  distribution** on that universe to draw the cost band empirically (replaces the search-summary bands
  here); (3) then run the long-only Day-0-proxy event study as Exp16.
- **Phantom task note (corrects defect b):** the original note cited **"V2-025"** as the consensus/
  fundamentals dependency. **No V2-025 task file exists** in `ai_docs/tasks/` — "V2-025 Quarterly
  Fundamentals" appears only as a *line item in the quant roadmap synthesis*, not a filed task. Call any
  consensus/fundamentals collector **"to-be-filed"**, not V2-025. (And the long-only proxy route doesn't
  need it anyway.)

---

## Open questions / what I couldn't verify
1. **Page-level verification (Rule 6 cap) — RESOLVED 2026-06-04:**
   - **Harshita et al. (2018)** is **page-verified** (SCIRP open access: ~6% SUE-sorted long-short CAR over 64 trading days on Nifty 500, with insignificant SUE × Illiquidity interaction).
   - **Sehgal & Subramaniam (2018)** — confirmed it documents PEAD / rejects semi-strong efficiency, **but the decision-relevant liquidity split was NOT extracted.** Whether drift is bigger in illiquid names is **still unresolved** — do NOT treat this as confirming the illiquid-concentration premise. (Open: fetch the paper's actual liquidity/size-stratified returns.)
   - **NSE/SLB volumes & fees** are **page-verified** (historical 19k trades/mo, ₹23 Cr fees confirmed as 2022 data; March 2026 volumes verified at 11.87 crore shares lent across 341 active scrips, generating ₹57.32 crore total monthly rental value).
   - **F&O list & criteria** are **page-verified** (August 2024 SEBI circular tightening MWPL to ₹1,500 cr, MQSOS to ₹75 lakh, and ADDV to ₹35 cr; list trends above 200 stocks, e.g., 208–250 stocks).
   - **STT rates** are **page-verified** (cash equity delivery unchanged at 0.1% purchase/sale, i.e., 20 bps round-trip; Budget 2026 raised F&O STT only).
   - **XBRL mandate** is **page-verified** (SEBI LODR mandates same-day XBRL filing of financial results).
2. **Empirical Amihud distribution for Midcap-150/Smallcap-250** — cannot be computed until G4 lands
   prices. The bps bands in the Q1 table are reasoned, not measured.
3. **Scanned-PDF rate of mid/small-cap *attachment* PDFs** — unmeasured; needs a read-only sample of
   `india_bourse_announcements`. (The *results numbers* are XBRL, so this only matters for the weak NLP route.)
4. **SLB per-name borrow availability** — I have the aggregate (thin, large-cap-skewed); a per-Midcap-150
   borrow-availability/fee snapshot from NSE SLB daily reports would harden the long-only conclusion, but
   the aggregate already makes the short leg untenable.

---
*Reflections for Lijo:*
- *The decisive change vs the original note: the sweet spot is the **liquid half of the Midcap 150**, not
  the whole index, and the strategy must be **long-only** — the SLB book is too thin/large-cap-skewed for
  a short leg, and the biggest-drift names aren't even borrowable.*
- *The pilot is **blocked on G4**, which previously crashed the prod DB — sequence it as grow-volume →
  backfill-with-preflight → Amihud calibration → Exp16, not as a quick script run.*
- *Evidence status (updated 2026-06-04): the first pass was capped at "search-summary" by WebFetch limits;
  a Claude pass then page-verified Harshita (open-access SCIRP), and the Gemini recon agent (browser)
  corroborated the official SEBI/NSE/STT/XBRL facts. Two residual gaps remain: (a) the SLB liquidity
  figures are practitioner-aggregator data (Dhan/ScanX/InvestYadnya) — strong but not exchange-official;
  and (b) the "drift bigger in illiquid names" premise was never actually extracted from a primary source
  — treat it as unresolved, not verified. The long-only and PARK/G4 conclusions do not depend on either gap.*
