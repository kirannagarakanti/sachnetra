---
tags: [experiment, sachnetra, research, quant-finance, PEAD, event-study, mid-cap, long-only, pre-design-brief]
source: [[sachnetra_research_playbook]], [[Exp2]], [[Exp4]]
experiment_id: Exp16
status: BRIEF — pre-registration design phase · BLOCKED on G4 (midcap prices)
authored_date: 2026-06-04
audience: Lijo (founder/operator) + James + future Claude Code sessions
purpose: Pre-register the long-only mid-cap Post-Earnings-Announcement-Drift (PEAD) pilot so it can fire the moment G4 (midcap price backfill) lands. Built on the page-verified evidence in learning/research-notes/2026-06-04_pead-size-liquidity-resolution.md.
registry_note: "Claims Exp16 (next free per wiki/experiments/_index.md, where Exp15 is highest used). Registry row to be added when this brief is accepted — this file does not edit _index.md."
---

# Experiment 16 — Brief: Long-Only Mid-Cap PEAD via Day-0 Price-Reaction Proxy

## 1. Why this experiment, why now
Two independent SachNetra threads converge on a single tradeable shape:
- **Exp 4** proved a ~13-min filing-latency edge, but only on large-caps where the newswire is also fast
  (the "latency-vs-value squeeze"). The escape is mid/small-caps where the wire is slow.
- The **PEAD research thread** (`research-notes/2026-06-04_pead-*`) page-verified that earnings drift is
  real in India (~6%/64d, Nifty 500, survives controls) and **stronger in smaller, under-covered firms**
  (Harshita SUE×Size + Quantpedia global synthesis), and that **the long side carries most of the return**
  — so a long-only structure is both necessary (the SLB short-leg market is dead) and where the alpha is.

This experiment tests whether a **long-only** portfolio that buys mid-cap winners *after* a strong positive
earnings-day reaction earns drift that survives realistic mid-cap transaction costs.

> **Gating reality**: this CANNOT run today — `research_prices` is Nifty-50-only (47 symbols). Exp16 is
> **blocked on G4** (backfill Midcap-150 prices; see `research-notes/2026-06-04_g4-*` once written). This
> brief is the pre-registration so the work is ready to fire when G4 lands.

---

## 2. Core hypotheses (written before looking)
- **H16a (Drift exists, long-only):** A long-only portfolio of Nifty-Midcap-150 stocks that post a
  top-quintile **Earnings-Announcement Return (EAR)** on the result day earns a positive market-adjusted
  CAR over the following 5–15 trading days, exceeding an equal-weighted Midcap-150 benchmark.
- **H16b (Net of cost):** The CAR[+1..+H] exceeds a **100–250 bps round-trip cost floor** (impact + spread
  + 20 bps delivery STT) on the **liquid, F&O-eligible half** of the Midcap 150, and the net edge is
  **positive after** a Deflated Sharpe Ratio adjustment for the number of horizons/filters tried.
- **H16c (Recency — guards against decay):** The net edge holds in the **most recent sub-period** (last
  ~3 years), not just full-sample — because the India size anomaly is documented as *fading*
  (Sharma/Subramaniam/Sehgal 2021).

---

## 3. Method — market-adjusted long-only event study

### 3.1 Universe & data (all BLOCKED on G4)
- **Asset universe**: liquid half of `shared/nifty-midcap150.json` — restrict to names meeting an
  **impact-cost / F&O-eligibility liquidity filter** (proxy: Amihud illiquidity below the universe median,
  or membership in the F&O list). This deliberately drops the illiquid tail where cost > 300 bps eats the drift.
- **Events**: `india_bourse_announcements` rows categorized as financial results (V2-018 collector, live).
- **Prices**: daily adjusted close from `research_prices` — **requires G4** (Midcap-150 backfill).
- **Benchmark**: equal-weighted Midcap-150 (or ^NSEMID) market adjustment.
- **Window**: full sample + an explicit **last-36-months** recency slice (H16c).

### 3.2 Surprise proxy — no consensus DB needed (the key design choice)
We do **not** have analyst consensus estimates (SUE is Parked — needs a to-be-filed fundamentals collector).
Instead use the **Earnings-Announcement Return (EAR)** as the surprise proxy:
- EAR_i = market-adjusted abnormal return on the announcement day (Day 0), computed from `research_prices`
  using the close of T−1 → close of T0 (no look-ahead: the signal is fully formed at T0 close).
- Rank events by EAR; **long the top quintile** (strong positive reaction = positive surprise proxy).
- Quantpedia's canonical PEAD uses the *intersection* of top-SUE and top-EAR quintiles; we can only do the
  EAR leg — a documented limitation (H-note below), partially mitigated by the trend filter.

### 3.3 Portfolio simulation
- **Entry**: buy at T+1 open (or T+1 close as a robustness variant) — strictly after the T0 signal.
- **Filter (value-trap guard)**: only enter names trading **above their 50-day moving average** at T0
  (medium-term uptrend), per the original candidate-3 design.
- **Weighting**: equal-weight the selected names.
- **Horizons (H)**: test {5, 10, 15} trading-day holds; report each (and count them as trials for DSR).
- **Costs**: apply a **100 bps and a 250 bps round-trip** scenario (bracketing the verified mid-cap cost
  band); STT 20 bps is inside that. Report net CAR under both.

---

## 4. Success thresholds & acceptance gates (Gate 1 → paper-trading)

| Metric | Threshold | Diagnostic | Notes |
|---|---|---|---|
| **Net CAR[+1..+H]** | **> 0 after 250 bps round-trip** for at least one H | — | gross must clear the realistic (not optimistic) cost floor |
| **Concentration check** | edge survives dropping **top-3 event days AND top-3 single events** | playbook B-gate | kills "one print made the result" |
| **Deflated Sharpe Ratio** | **DSR ≥ 0.95** | counts ALL horizons × filters × cost scenarios as trials N | the anti-overfit gate (per backtesting-best-practices note) |
| **Recency** | net edge **positive in the last-36-month slice** | H16c | guards against the fading size anomaly |
| **Theil's U** | **< 1.0** vs equal-weighted Midcap-150 benchmark | playbook B1 | beats naive hold |
| **Stationarity** | ADF p<0.05 & KPSS p>0.05 on the CAR series | playbook B3/B4 | |
| **Capacity sanity** | ≥ ~30 tradeable events/yr after the liquidity + trend filter | — | too few events = untradeable even if significant |

---

## 5. Potential traps & caveats
1. **G4 prerequisite (HARD BLOCKER)**: needs Midcap-150 prices in `research_prices`; prior backfill crashed
   the prod DB on disk-full. Sequence: grow volume → backfill with preflight → THEN Exp16.
2. **Survivorship bias**: `nifty-midcap150.json` is the *current* index; applying it back in time excludes
   demoted/delisted names. Document as a known ceiling; prefer the most recent window where it's least wrong.
3. **EAR-only proxy**: without SUE we capture the *price reaction*, not the *fundamental surprise* — EAR can
   be noise/overreaction (which mean-reverts, the opposite of drift). The trend filter + concentration check
   are the guards; if EAR-only fails, that's a real (not fixable-here) limitation, not a bug.
4. **Anomaly decay**: the India size anomaly is fading — hence the recency gate. A full-sample pass alone is
   not acceptance.
5. **Look-ahead**: signal uses T0 close; entry T+1. Never use post-T0 information in selection.
6. **Cost realism**: 30 bps (Exp15's midcap floor) is optimistic; the verified band is 100–250 bps. Accept
   only on the 250 bps scenario to be conservative.

---

## 6. Execution plan & next steps (all gated on G4)
1. **G4 first** (James/Lijo): grow Railway volume, backfill Midcap-150 into `research_prices` with disk
   preflight. (See the G4 backfill research note.)
2. **Script**: `scripts/research/exp16-midcap-pead.mjs` (read-only on prod; research lane).
3. **Compute** EAR per result event, apply liquidity + trend filters, simulate long-only holds at {5,10,15}d
   under 100/250 bps costs.
4. **Diagnostics**: concentration drop, DSR (log N trials!), recency slice, Theil's U, ADF/KPSS.
5. **Report**: write `wiki/experiments/Exp16.md` (post-run record); register the row in
   `wiki/experiments/_index.md`; append H16a/b/c to the research playbook.

---
*This brief is the pre-registered design only. It does not claim the edge exists — it specifies how we'd
prove or refute it on the day G4 unblocks midcap prices. Built on page-verified PEAD evidence
(`research-notes/2026-06-04_pead-size-liquidity-resolution.md`).*
