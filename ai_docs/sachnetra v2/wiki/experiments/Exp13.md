---
tags: [experiment, sachnetra, research, quant-finance, hurst, rs-analysis, regime-detection, mean-reversion, momentum, pre-registered]
source: [[sachnetra_research_playbook]]
experiment_id: Exp13
status: COMPLETE
authored_date: 2026-05-28
run_date: 2026-05-28
verdict: 🟡 WEAK DRIFT
audience: Lijo, James, future Claude Code sessions
---

# Experiment 13 — Does Nifty drift between trending and mean-reverting regimes?

> Part of the SachNetra quant research program. Method philosophy in
> [[sachnetra_research_playbook]]. The cheap, decision-grade regime diagnostic from the
> NPTel follow-up checklist §C2. A **regime filter**, not a standalone edge: it gates
> *when* a momentum strategy vs a mean-reversion strategy (e.g. the [[Exp12]]
> cointegration pairs) is deployable.

Pre-registered: hypothesis, thresholds, interpretation locked in §1 / §5 / §9 before the run.

---

## 1. Hypothesis (locked before looking)

**H13:** *The rolling **Hurst exponent (H)** of Nifty (`^NSEI`) daily log returns — estimated
by Rescaled-Range (R/S) analysis on a rolling window — **drifts identifiably between
persistent (H>0.55) and anti-persistent (H<0.45) regimes** over the `research_prices`
history, rather than staying pinned at the random-walk value H≈0.5.*

**Why it's decision-grade either way** (NPTel §C2): a single number routes the next research
direction. If H drifts between regimes, a Hurst **pre-trade filter** (deploy momentum when
H>0.55, mean-reversion when H<0.45) is real, and Markov-switching state models (§D5) become a
candidate. If H is stuck at ~0.5, Nifty is efficient-market at this scale, momentum/
mean-reversion *timing* has no Hurst-detectable edge, and the regime-switching ML stuff is
premature even as a direction.

### Pre-registered success thresholds (no moving the goalposts)

| Outcome | Trigger |
|---|---|
| ✅ REGIMES DETECTED | rolling H spends **≥20%** of days >0.55 **AND** ≥20% of days <0.45 (both tails populated — genuine bimodal drift) |
| 🟡 WEAK DRIFT | H drifts but one regime dominates (the minority tail <20% of days) |
| ❌ NO DRIFT | H stays within [0.45, 0.55] for **≥80%** of days (pinned at random walk) |

---

## 2. Why this experiment

- **Cheapest decision-grade leverage** on the NPTel follow-up list (§C2): one R/S computation,
  rolling, on a series we already own. No tagging, no new data.
- **Gates other work.** It sits upstream of two things: a Hurst pre-trade filter for the
  [[Exp12]] pair-trade (only deploy mean-reversion when H<0.45), and the parked Markov-switching
  models (§D5 — "if C2 shows no regime drift, MS-AR has no signal to capture").
- **Parallel track**, same as Exp 12 — independent of the gated latency thesis (Exp 11).

---

## 3. Method (ep29 — Rescaled Range)

### 3.1 Data
`SELECT symbol, trade_date, adj_close FROM research_prices WHERE symbol = '^NSEI'`. Daily log
returns `r_t = ln(p_t / p_{t-1})`.

### 3.2 R/S Hurst on a window (ep29 §Math)
For a window of returns `Y` (length n):
1. Mean-adjusted partial sums `Z_t = Σ_{i≤t}(Y_i − Ȳ)`.
2. Adjusted range `R = max(Z) − min(Z)`.
3. Rescaled range `R/S` where `S` = window std-dev.
4. Over sub-window sizes `m`, average `R/S` across non-overlapping chunks of size `m`; the OLS
   slope of `log(R/S)` on `log(m)` is **H** (Hurst's empirical law `E[R/S] ≈ C·m^H`).

### 3.3 Rolling estimate
Rolling **250-trading-day** window (default; `--window`). For each day from day 250 onward,
compute H on the trailing window → a time series `H_t`. Sub-window sizes are log-spaced from 10
to window/2 (ep29 open-Q: N≥100–250 needed to avoid small-sample inflation, so 250 is the floor).

### 3.4 Regime classification (ep29 table)
| H_t | Regime | Strategy implied |
|---|---|---|
| > 0.55 | persistent / trending | momentum / trend-following |
| 0.45–0.55 | random walk | efficient — trade only on external events |
| < 0.45 | anti-persistent | mean-reversion / pairs |

---

## 4. Commands

```bash
node scripts/research/exp13-hurst-regime.mjs --selftest   # synthetic, no DB
node scripts/research/exp13-hurst-regime.mjs              # full run (Lijo)
node scripts/research/exp13-hurst-regime.mjs --window=120
node scripts/research/exp13-hurst-regime.mjs --symbol=^NSEI --from=2012-01-01
```

Open `scripts/research/output/exp13/exp13_report.html` — rolling-H line with the 0.45/0.55
regime bands shaded.

---

## 5. Pre-registered interpretation rules

| Result | Verdict | Next step |
|---|---|---|
| ≥20% days >0.55 AND ≥20% days <0.45 | ✅ REGIMES DETECTED | Build a Hurst pre-trade filter for [[Exp12]] pair-trade; Markov-switching (§D5) becomes a candidate |
| Drifts but minority tail <20% | 🟡 WEAK DRIFT | Note the dominant regime; use H as a soft filter only |
| ≥80% days in [0.45, 0.55] | ❌ NO DRIFT | Nifty efficient at this scale. Park MS-AR (§D5). Don't time regimes off H. |

---

## 6. Data reality (run 2026-05-28)

| Fact | Value |
|---|---|
| Symbol | ^NSEI |
| Rolling-H window | 250 trading days |
| Rolling-H points | 4,014 |
| Date range | 2010-01-15 → 2026-05-22 |
| Source | `research_prices` daily adj_close (2009-01-01 → 2026-05-21; first 250 returns consumed by the initial window) |

## 7. Results (run 2026-05-28 — verbatim)

| Metric | Value |
|---|---|
| mean H | **0.571** |
| sd H | 0.046 |
| trending (H>0.55) | **66.0%** of days |
| random walk (0.45–0.55) | 33.9% of days |
| mean-reverting (H<0.45) | **0.1%** of days |

## 8. Interpretation (run 2026-05-28)

**Verdict per §5: 🟡 WEAK DRIFT.** The mean-reverting tail (0.1%) is far below the 20% needed
for REGIMES DETECTED; the neutral band (33.9%) is far below the 80% needed for NO DRIFT.

- **Nifty is a persistently trending index.** Mean H=0.571 and two-thirds of all days sit above
  0.55. Momentum/trend-following is the index's structural regime; it spends the rest of the time
  in the efficient (random-walk) band and **almost never** mean-reverts at the index level (0.1%).
- **The drift is one-sided, so H is a weak filter, not a regime switch.** H moves between
  "trending" and "efficient", but it does not toggle into a mean-reverting regime — so a
  Hurst-gated *mean-reversion* deploy switch has essentially nothing to switch on. As a *trend-on
  vs neutral* filter it has mild value.
- **R/S caveat (§9).** R/S is weak at detecting anti-persistence, so 0.1% is a floor, not a
  precise count — but the trending dominance (66%, the reliable tail) is robust to that weakness.
- **Cross-check with [[Exp12]]:** index Hurst shows near-zero mean-reversion, and the
  cointegration pairs drift OOS rather than snapping back. Both say **mean-reversion is not a
  near-term harvestable edge on this universe.**
- **Next step (§5 WEAK DRIFT row):** use H only as a soft trend-on filter; **park Markov-switching
  (§D5)** — a one-sided H with no mean-reverting regime gives MS-AR no second state to capture.
  H13 logged.

---

## 9. Caveats & traps

- **Small-sample bias.** R/S inflates H on short windows (ep29 open-Q). 250-day window is the
  floor; `--window=120` is offered but flagged as bias-prone — report both if used.
- **No p-value.** R/S Hurst is a descriptive point estimate, not a hypothesis test. The verdict
  is threshold-based on *how much time* H spends in each regime, not on significance.
- **Overlapping windows.** Consecutive rolling-H values share 249/250 of their data → the H_t
  series is heavily autocorrelated. Do not over-interpret day-to-day wiggles; read regimes as
  multi-month stretches.
- **Window-size sensitivity.** The H *level* depends on window length and sub-window grid.
  Cross-check with `--window` before trusting a borderline regime call.
- **Self-test gate.** `--selftest` asserts the estimator orders H(persistent) > H(random) >
  H(mean-reverting) and recovers H≈0.5 for white noise — a validated-estimator check (Exp 9
  discipline) that must pass before a real run is trusted.

---

## 10. Outputs

- `scripts/research/exp13-hurst-regime.mjs` (read-only; pure Node; Claude authors, Lijo runs).
- `scripts/research/output/exp13/exp13_report.html` (visual: rolling-H line + regime bands).
- `scripts/research/output/exp13/exp13_hurst_series.csv` (date, H, regime).
- Hypothesis Register row H13 in [[sachnetra_research_playbook]] post-run.

---

## 11. Next experiment

- **REGIMES DETECTED →** a Hurst pre-trade filter feeding [[Exp12]]; Markov-switching (§D5) candidate.
- **NO DRIFT →** park regime work; the parsimony call (NPTel §19.F) stands.
- This is the last item in the locked research queue before the playbook §B discipline upgrades.

---

## Changelog
| Date | Change |
|---|---|
| 2026-05-28 | Pre-registered. H13 (regime drift), thresholds (§5), R/S method (§3), caveats incl. small-sample bias + overlapping-window autocorrelation (§9). Parallel diagnostic track per NPTel §C2; script + visual report authored alongside; results pending Lijo's prod run. |
