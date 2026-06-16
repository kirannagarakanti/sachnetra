---
tags: [experiment, sachnetra, research, quant-finance, ensemble, cross-sectional, information-coefficient, multi-signal, factor-model, walk-forward, pre-design-brief]
source: [[sachnetra_research_playbook]], [[2026-06-06_edge-hunt-where-alpha-could-still-live]], [[Exp4]], [[Exp16]], [[Exp18]], [[positioning_v2]]
experiment_id: Exp19
status: COMPLETE (v1) — ran 2026-06-07. ❌ NOT SUPPORTED (weak momentum-only, cost-fragile; unique columns add ≈0). Harness built. Post-run record: [[Exp19]]. v2 = feeders (G6 sentiment, G1 latency) under the §3.7 ablation.
authored_date: 2026-06-07
audience: Lijo (founder/operator) + James + future Claude Code sessions
purpose: Pre-register the methodological shift the program has never tried — combine its many weak-but-independent signals into ONE IC-weighted, size/sector-neutral, walk-forward cross-sectional long-only model — per edge-hunt §3, after five single-signal event-study nulls (Exp14/16/17/17b/18).
registry_note: "Claims Exp19 (next free per _index.md). _index.md row + 'next free ID → Exp20' updated in the same change. The G6 sentiment-calibration test, previously slated for the next free ID, moves to Exp20 — it is also a FEEDER for this experiment (sentiment is one ensemble input)."
---

# Experiment 19 — Brief: IC-weighted, size/sector-neutral, walk-forward cross-sectional ensemble

## 1. Why this experiment, why now

The program has tested **18 signals one at a time and killed essentially all of them** — most recently the
five mid-cap event-study nulls ([[Exp14]] governance, [[Exp16]] EAR-drift, [[Exp17]]/17b intraday + SUE
surrogate, [[Exp18]] bulk deals). That losing streak is itself the finding:
[[2026-06-06_edge-hunt-where-alpha-could-still-live]] §3 argues the **probability mass has moved off
"find one strong signal" onto the method the program has never used** — *combine many weak, independent
signals into one cross-sectional ranking*, which is how data-broad shops (WorldQuant; AlphaForge arXiv
2406.18394; IC-dynamic-weighting 2508.18592) actually earn P&L.

**The reframe (the whole point):** stop asking *"does signal X beat cost on its own?"* (answered "no" 18
times) and ask *"does an **IC-weighted, size/sector-neutral, walk-forward cross-sectional blend** of our
6–8 weak signals produce a top-decile-minus-benchmark spread that survives 250 bps + DSR?"* — a **different
question** the program has never asked.

**This is half research, half infrastructure.** The deliverable is the un-built `positioning_v2 §3.3`
capability: a **cross-sectional panel** (one row per (stock, day), every signal a column) + a **walk-forward
backtester**. Whatever the verdict, the panel + harness is the reusable asset every future strategy needs.

---

## 2. Core hypotheses (written before looking)

- **H19a (blend has signal):** An IC-weighted composite of SachNetra's weak signals has a **positive,
  stable out-of-sample Information Coefficient** (rolling cross-sectional rank-correlation of composite vs
  forward return) materially above any single component's IC.
- **H19b (tradeable, net of cost):** A **long-only top-decile** book on the composite, size/sector-neutral,
  rebalanced, beats its size-matched benchmark **net of 250 bps** round-trip on a **walk-forward** basis,
  and clears a **Deflated Sharpe** penalty for the trials.
- **H19c (the blend beats its parts):** The composite's OOS IC / net spread exceeds the **best single
  component** — i.e. the ensemble adds value beyond just re-discovering one signal. (If the blend only works
  because of one column, this is really a single-signal result — report it as such.)

### Pre-registered success thresholds (no moving the goalposts)
| Outcome | Trigger |
|---|---|
| ✅ SUPPORTED | OOS composite IC > 0 and stable (IR = mean/sd of rolling IC ≥ ~0.3) **AND** long-only top-decile beats benchmark **net of 250 bps** on walk-forward **AND** DSR ≥ 0.95 **AND** composite beats best single component (H19c) |
| 🟡 PROMISING | Positive OOS IC + gross spread but fails net-of-cost or DSR; or works but is one-signal-driven (H19c fails) |
| ❌ NULL | OOS composite IC ≤ 0 or indistinguishable from zero; no net spread |
| 🚩 SUSPECT | Result driven by one signal / one sector / one short window (drop-component & sub-period checks fail) |

---

## 3. Method

### 3.1 The cross-sectional panel (the core build)
One row per **(symbol, rebalance_date)** over the liquid universe (Amihud-liquid Midcap-150 + Smallcap-250,
the same liquid filter as Exp16/18). Columns = the candidate weak signals, **each known strictly as of the
rebalance date** (no look-ahead), plus the target `fwd_return_Hd`.

**Candidate signals (the weak-signal shelf — each a column):**
| Signal | Source table / experiment | Notes |
|---|---|---|
| `ear_drift` | results EAR proxy ([[Exp16]]) | weak (+0.5%) alone |
| `latency_flag` | bourse-leads-news ([[Exp4]]) | gated on G1 tagging recall; include where available |
| `oi_shift` / `iv_skew` | V2-024 options OI (EOD) | per-stock; where F&O coverage allows |
| `bulkdeal_intensity` | V2-030 ([[Exp18]]) | per-stock; signed (BUY−SELL) deal value / ADV over trailing window. Post-disclosure drift was null *alone*; test only as a cross-sectional tilt |
| `sentiment` (per-ticker) | `india_news_signals` (post-**G6**) | **feeder: needs Exp20/G6 + G1 tagging**; per-*ticker*, not the market aggregate |
| `narrative_momentum` | story-threads / entity-timeline | per-entity news-cluster intensity |
| `price_momentum` (control) | `research_prices` (12-1, skip-month) | a known factor — a baseline column, not a "SachNetra" claim |

> **⚠ Cross-sectional ≠ market-level (a correctness gate).** A column belongs in this blend only if it
> **varies across stocks on a given day.** **FII/DII absorption (V2-017c) is market-aggregate** — one number
> per day, identical for every stock (Exp1 §8: "FII flow is aggregate, not per-name") → **zero cross-sectional
> variance, CANNOT be a column.** It may serve only as a **market-regime overlay** (scale gross exposure
> up/down), not a stock selector — out of scope for the v1 cross-section. Same caution for market-aggregate
> daily sentiment: only the **per-ticker** form is admissible.

**Clean-and-available-now cross-sectional subset (v1):** `price_momentum`, `ear_drift`, `bulkdeal_intensity`
(all genuinely per-stock and derivable today). Add `sentiment` (per-ticker) after G6/G1 (Exp20), `oi_shift`
where F&O coverage allows, `narrative_momentum` once entity-linkage is confirmed. Document which columns are
live in each run.

### 3.2 Per-day signal processing (the four words, mechanized)
For each rebalance date, across the cross-section of stocks that day:
1. **Cross-sectional standardize** each signal → z-score (or rank) so columns are comparable.
2. **Size/sector-neutralize:** regress each standardized signal on `log(market-cap)` + sector dummies; keep
   the **residual**. Removes the "it's just small-caps / just IT" pseudo-edge (the PEAD size trap).
3. (composite assembled in 3.3)

### 3.3 IC-weighting, walk-forward (the anti-look-ahead core)
- **Information Coefficient (IC):** for each signal each period, the cross-sectional **Spearman rank
  correlation** between the signal and the realized `fwd_return`. A signal's quality = its mean IC; its
  reliability = **IR = mean(IC)/sd(IC)**.
- **Walk-forward weights:** at each rebalance, compute each signal's IC over a **trailing window using only
  past data**, set weight ∝ trailing IC (or IR; drop signals whose trailing IC ≤ 0). **Never** use
  current-or-future returns to set today's weights.
- **Composite score** = Σ wᵢ · neutralizedᵢ. Rank stocks by composite.

### 3.4 Portfolio & cost
- **Long-only top decile** (SLB short market is dead — [[positioning_v2]]); equal-weight (or score-weight as
  one variant). Hold to next rebalance ({weekly, monthly} tested).
- **Benchmark:** size-matched equal-weight basket (reuse the Exp18 band benchmark).
- **Costs:** 100 & 250 bps round-trip on turnover; **accept only on 250**.

### 3.5 Gates (the standard gauntlet + ensemble-specific)
Walk-forward OOS only · net-of-250bps top-decile spread · **DSR ≥ 0.95** (trials = signals×windows×holds×
weight-schemes — log N) · **Theil's U < 1** vs benchmark · ADF/KPSS on the equity curve · **drop-component
robustness** (re-run leaving each signal out — the result must not depend on one column = H19c) ·
**sub-period stability** (IC sign consistent across years) · capacity (turnover-feasible).

### 3.6 `--selftest`
Synthetic gate: build a panel where ONE planted column truly predicts `fwd_return` (+ noise columns) and
assert the harness (a) gives the real column the dominant IC weight, (b) recovers a positive OOS spread, and
(c) a pure-noise panel yields IC ≈ 0 / no spread. Validates the estimator before any prod run (Exp9/12/13/18
discipline).

### 3.7 Incremental-value (ablation) protocol — pre-registered, for the v1↔v2 comparison

The program runs **v1 first (baseline, clean columns), then re-runs as feeders land** (G6 sentiment → Exp20;
G1 latency). Each feeder is judged by an **ablation against the prior run** — *not* by eyeballing whether the
new run "looks better." The rule, locked here before any result:

- **Hold everything fixed across versions** — same universe, same rebalance dates, same walk-forward splits,
  same gates, same cost. **Change only the one added column.** (A change in universe/window confounds the
  comparison; same-everything-except-one-column is the whole point of an ablation.)
- **Primary comparison metrics:** (a) OOS **composite IC** (mean + IR), and (b) **net top-decile spread
  @250bps** on walk-forward. Report v_new vs v_prev side by side.
- **A feeder "earns its column" only if BOTH hold:** (1) v_new beats v_prev on *both* metrics, **AND** (2) the
  added column's **drop-one-out contribution** is positive on walk-forward (re-run the new model without that
  column; the metric must fall). The two checks must agree — a column that helps the composite but has
  negative standalone drop-out contribution is a red flag (likely overfit interaction).
- **Decision tree off v1's verdict** (governs whether to spend on the G6 feeder at all):
  v1 ✅ → add sentiment to seek *better*; v1 🟡 (positive IC, fails cost) → **strongest case** for the feeder
  (one more independent column may clear 250 bps); v1 ❌ (composite IC ≤ 0) → a weak feeder rarely rescues a
  dead blend, but G6 is needed anyway for trustworthy sentiment use → one informed shot, judgment call.
- **Versioning:** each run stamps which columns were live (`--columns=`), the window, and the splits into the
  output, so any v1↔v2 diff is reproducible and auditable.

This makes "did sentiment add value?" a **measured, pre-registered delta**, not a post-hoc story.

---

## 4. Potential traps & caveats (locked in advance)

1. **Garbage-in:** an uncalibrated `sentiment` (G6, 88% positive) poisons the blend — include it **only after
   Exp20/G6**. Same for `latency` (gated on G1 recall).
2. **Correlated signals ≠ independent votes:** if signals secretly encode the same bet, averaging adds
   nothing. Report the signal **correlation matrix**; the drop-component check (H19c) guards this.
3. **Survivorship:** universe lists are today's membership applied back; the perennial ceiling (Exp14/16).
   Use the recency-valid window; a point-in-time universe is the real (out-of-scope) fix.
4. **Multiple-testing via the blend:** trying many weight schemes is itself overfitting — DSR counts ALL
   trials; walk-forward is mandatory (no full-sample IC weighting).
5. **Look-ahead in neutralization:** size/sector regression each day uses only that day's cross-section
   (contemporaneous X, never future return) — fine; weights use only past IC.
6. **Low base rate:** even a good ensemble IC (~0.05–0.08) is a *small* per-name edge — the value is in
   breadth (many names, many rebalances), so capacity/turnover realism matters as much as the spread.

---

## 5. Execution plan & next steps

1. **Build the panel builder** `scripts/research/build-xs-panel.mjs` (read-only; writes a `research_*` panel
   table or a parquet/CSV) — joins the signal sources on (symbol, date). *This is the reusable asset.*
2. **Build the backtester** `scripts/research/exp19-xs-ensemble.mjs` (read-only; `--selftest` first):
   standardize → neutralize → walk-forward IC-weight → top-decile long-only → gauntlet → CSV/HTML report.
3. **Run v1 with the clean-now subset** (ear_drift, fii_dii_absorption, bulkdeal_flag, price_momentum,
   narrative_momentum). Record verdict.
4. **Feeders that upgrade it:** **G6** (calibrate sentiment → Exp20) and **G1** (latency recall) each add a
   column; re-run as they land.
5. **Report** `wiki/experiments/Exp19.md`; append H19a–c to the playbook register.

> Sequencing note (per edge-hunt §5): this is the **highest-ceiling** lane and the most work. It runs after
> the cheap event-study shots are exhausted — which, after [[Exp18]], they now are. If it too fails honestly,
> the alt-data nowcasting moat (POSOCO/FASTag) becomes the dataset-of-record fallback ([[positioning_v2]] §7),
> which is a *strong* outcome, not a defeat.

---
*Pre-registered design only. It does not claim the ensemble works — it specifies how we'd prove or refute it,
walk-forward and net of cost, with the drop-component check ensuring "the blend beats its parts" rather than
re-discovering one signal. Built on [[2026-06-06_edge-hunt-where-alpha-could-still-live]] §3.*
