---
tags: [probe, results, bhavcopy, point-in-time-universe, survivorship, governance-signal, feasibility]
date: 2026-06-26
status: RESULTS — Probe 2 (external Gemini + Google-AI-mode recon) answered. VERDICT: the free survivorship-free
  point-in-time universe EXISTS. The honest case-control study is buildable on zero budget.
related: 2026-06-26_probe2-bhavcopy-PiT-universe-recon-brief.md, 2026-06-26_governance-blowup-PREREGISTRATION.md,
  [[project-pivot-governance-door]]
---

# Probe 2 — Bhavcopy PiT universe: FEASIBLE (free, survivorship-free)

## Verdict
**The load-bearing question is answered YES.** Free daily bhavcopy archives are immutable end-of-day snapshots —
never retroactively scrubbed — so delisted/blown-up names remain in the files for the dates they traded. Combined
with our in-house labels (Probe 1: 119 default-disclosure cos, 330 NCLT cos) + IBBI's clean CIN-keyed insolvency
sheets, the survivorship-free case-control study is buildable on zero budget. **Decision #2 (is the door walkable
without a paid universe?) → YES.**

## The verified blueprint (treat URLs as ~right, confirm exact path at implementation)
- **NSE bhavcopy** — back to ~2000s. Legacy (pre-2024-07): `archives.nseindia.com/content/historical/EQUITIES/
  {YYYY}/{MMM}/cm{DD}{MMM}{YYYY}bhav.csv.zip` (uppercase month, e.g. `cm02APR2018bhav.csv.zip`). Post-2024-07 UDiFF:
  `BhavCopy_NSE_CM_0_0_0_{YYYYMMDD}_F_0000.csv.zip`. **Needs the Akamai cookie warm-up → we already own `warmUpNSE()`
  in `scripts/_nse-announcements-source.mjs`** (the hoop is already solved in our codebase).
- **BSE bhavcopy** — back to ~2007, **low/no anti-bot friction**, and **covers far more small/micro names** (the
  population where blow-ups actually live). `bseindia.com/download/BhavCopy/Equity/EQ{DDMMYY}_CSV.ZIP`. → lean
  **BSE-first for breadth**.
- **MAKE-OR-BREAK spot-check PASSED:** DHFL verified present in the **2021-06-10** NSE bhavcopy (₹18.55, 1.76M vol),
  traded until 2021-06-14. Cox & Kings, Reliance Capital intact up to suspension. Dead names survive. ✅
- **Delisting reason (forced vs benign):** BSE classifies **Voluntary vs Compulsory** explicitly (superior); NSE via
  the compulsory-delisting public-notice feed + `archives.nseindia.com/content/equities/delisted.xlsx` (mapping only,
  no dates → pair with the notices feed). Lets us keep penal/forced exits and drop amalgamation/voluntary.
- **Insolvency = IBBI, NOT NCLT** (NCLT site = captcha/PDF hell). IBBI quarterly CIRP data sheets give Corporate
  Debtor + **CIN** + commencement date + outcome (Liquidated/Resolved/**Withdrawn**) → clean CIN-keyed PiT matching
  AND the §1 "not-withdrawn-within-90-days" filter is directly computable from the status column.
- **PiT sector + size:** bhavcopy has CLOSE but not shares outstanding → join the NSE daily market-cap companion file
  + a static ISIN/industry master for §2 matching. Free, just a SQL join.

## Anchor reality-check (Claude)
1. **The NSE scraping hoop is already solved** — `warmUpNSE()` exists and is battle-tested (V2-018 announcements run
   through it). So NSE bhavcopy is low marginal effort; BSE is trivial.
2. **Source credibility:** the first (Gemini) response is the trustworthy one — specific, verifiable (DHFL ₹18.55 /
   2021-06-10). The second (Google-AI-mode) had **garbled/placeholder URLs** (domain truncated, an implausible "1994"
   earliest date) — do NOT copy its URL strings; use the legacy pattern above and verify the first working date by
   actually pulling a few files.
3. **DISCIPLINE NOTE — do not build the bhavcopy ingester yet.** The bhavcopy PiT universe is for the **full automated
   case-control build**, which comes AFTER the cheap hand-trace passes. The 2-week hand-trace is MANUAL (~30 names
   looked up by hand) and needs none of this pipeline. Building the ingester now would be exactly the "polish the
   plumbing before proving the edge" trap the cold reads warned about. Bhavcopy ingester = a fast-follow IF the
   hand-trace shows separation, not a pre-req for it.
4. We will NOT outsource the collector — if/when built, it's our JS using `warmUpNSE()`, not the agent's Python.

## What this unblocks / next
- The pre-registration §2 universe + §6 control-matching are now **buildable for free** (post-hand-trace).
- **Immediate next is still the hand-trace** (manual; needs labels [have] + hand-collected pledge% [Probe-1b path]).
  Then the attack round. The bhavcopy build is staged behind a passing hand-trace.
