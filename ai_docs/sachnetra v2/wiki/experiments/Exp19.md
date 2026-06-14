---
tags: [experiment, sachnetra, research, quant-finance, ensemble, cross-sectional, information-coefficient, momentum, null, factor-model]
source: [[sachnetra_research_playbook]], [[exp19_brief]], [[Exp15]], [[Exp18]], [[2026-06-06_edge-hunt-where-alpha-could-still-live]], [[positioning_v2]]
experiment_id: Exp19
status: COMPLETE (v1) — ❌ NOT SUPPORTED, but the most "alive" cross-sectional read yet. Weak POSITIVE blend IC (+0.043, IR 0.26) — but it is **momentum-driven**, the SachNetra-unique columns (ear_drift, bulkdeal_intensity) add ≈nothing, and it does not clear cost. The harness (panel + walk-forward backtester) now exists.
authored_date: 2026-06-07 (brief) · run_date: 2026-06-07
verdict: ❌ NOT SUPPORTED on the primary spec — composite OOS IC +0.043 (IR 0.26, just under the 0.30 bar); gross ≈ +0.84%/mo but net −1.66%/mo at a (conservative, flat-turnover) 250 bps; the blend ≈ price-momentum alone (drop-momentum collapses IC 0.043→0.010; drop ear/deal barely moves it). The two SachNetra-unique columns do NOT yet add cross-sectional alpha beyond a vanilla momentum factor.
audience: Lijo, James, future Claude Code sessions
---

# Experiment 19 — IC-weighted, size-neutral, walk-forward cross-sectional ensemble (v1)

> **Pre-registration:** [[exp19_brief]] (§2 hypotheses, §3 method incl. the §3.7 ablation protocol, §4 gates).
> Post-run record. The methodological shift from edge-hunt §3, after five single-signal event-study nulls.

---

## 0. One-paragraph verdict

The first cross-sectional ensemble runs, fully powered (183 OOS monthly rebalances, 400-name midcap+smallcap
universe, 2011→2026) — and it is the **first non-negative cross-sectional read in the program**: composite
OOS Information Coefficient **+0.043 (IR 0.26)**, gross top-decile spread ≈ **+0.84%/month**. But it is
**❌ NOT SUPPORTED**: (a) the edge is **entirely price-momentum** — dropping momentum collapses the IC to
0.010, while dropping `ear_drift` or `bulkdeal_intensity` barely moves it (0.042 / 0.043), so the two
SachNetra-*unique* columns add ≈nothing cross-sectionally; (b) it does not clear cost (net −1.66%/mo at a
conservative flat-turnover 250 bps); (c) IR 0.26 is just under the 0.30 stability bar and DSR/ADF/KPSS fail.
This is **Exp15 redux** (midcap momentum — real but cost/drawdown-fragile) wearing an ensemble coat. **The
decisive reframe:** the ensemble bet now rests *entirely* on whether the **feeder columns** (per-ticker
sentiment via G6, latency via G1) add IC *beyond* momentum — because the unique columns available today do
not. The reusable asset (panel builder + walk-forward backtester) is built either way.

---

## A. Data reality (run 2026-06-07, read-only)

- **Panel** (`build-xs-panel.mjs` → `output/exp19/panel.csv`): **50,553 rows**, 209 monthly rebalance dates,
  400 names (Nifty Midcap-150 + Smallcap-250, 401/401 priced). Columns: `price_momentum` (12-1 skip-month),
  `ear_drift` (most-recent-results day-0 abnormal in [d−90,d)), `bulkdeal_intensity` (signed BUY−SELL value
  in [d−30,d) / ~month ADV), `log_adv` (size proxy), `band`, `fwd_ret` (21d). All as-of d, no look-ahead.
- **Column density:** momentum 50,553 (all rows) · ear events 5,785 · deal-active 1,674. **The two unique
  columns are sparse** (ear: announcements only 2024+; deals: 2021+ and most names have none in a 30-day
  window), so their cross-sectional IC history accrues late.
- **Backtester** (`exp19-xs-ensemble.mjs`): walk-forward, OOS after a 12-rebalance warmup → **183 OOS dates**
  for the momentum-dense blend. (A v1 bug — gating OOS on *every* column being warm — first collapsed the
  blend to 11 OOS dates; fixed to gate on the *densest* column, sparse columns carry weight 0 until warm.)

## B. Results

Net = top-decile mean fwd-return − equal-weight benchmark − 250 bps (flat, per rebalance). `***` p<0.01.
Gross ≈ net + 2.5%.

| Model | OOS dates | OOS IC | IR | net spread/mo | t | gross/mo |
|---|---|---|---|---|---|---|
| **FULL BLEND** | 183 | **+0.043** | 0.26 | −1.66% | −6.20*** | ≈ +0.84% |
| price_momentum (single) | 183 | +0.041 | 0.25 | −1.68% | −6.21*** | ≈ +0.82% |
| ear_drift (single) | 11 | −0.007 | −0.09 | −2.66% | −7.70*** | — (sparse) |
| bulkdeal_intensity (single) | 43 | +0.015 | 0.12 | −2.42% | −5.79*** | ≈ +0.08% |
| drop price_momentum | 43 | **+0.010** | 0.09 | −2.28% | −6.44*** | the unique-only blend |
| drop ear_drift | 183 | +0.042 | 0.25 | −1.71% | −6.31*** | ≈ momentum |
| drop bulkdeal_intensity | 183 | +0.043 | 0.26 | −1.65% | −6.10*** | ≈ momentum |

Daily-series gates (FULL BLEND): Sharpe −1.59 · DSR 0.000 · **Theil's U 0.54 (PASS)** · ADF 0.31 (fail) ·
KPSS 3.70 (fail).

## C. Interpretation (decision-grade)

**Verdict: ❌ NOT SUPPORTED (v1) — but a *weak-positive*, momentum-driven, cost-fragile null, not a flat zero.**

- **H19a (blend has signal):** ⚠️ partially — composite OOS IC is **positive (+0.043)** and stable-ish, the
  first non-negative cross-sectional read in the program. But **IR 0.26 < 0.30** (just under the bar).
- **H19b (net of cost):** ❌ — gross ≈ +0.84%/mo is eaten by the 250 bps cost (net −1.66%). The familiar
  SachNetra squeeze, again — and the *same shape as [[Exp15]]* (vol-adj midcap momentum: real, Sharpe 1.85,
  rejected on drawdown/cost).
- **H19c (blend beats its parts):** ❌ in spirit. Technically the full IC (0.043) edges the best single
  (momentum 0.041), but the **drop-one-out proves it is momentum**: remove momentum and IC collapses to
  0.010; remove either unique column and IC is unchanged. **`ear_drift` and `bulkdeal_intensity` add no
  cross-sectional alpha beyond momentum** (consistent with [[Exp16]]/[[Exp18]] killing them as standalone
  edges — they don't resurrect as cross-sectional factors either).

**Why this is the most useful null yet.** It cleanly separates two questions the program had conflated:
1. *Is there ANY weak cross-sectional signal here?* → **Yes — momentum** (IC ~0.04). Modest, cost-fragile,
   already known ([[Exp15]]).
2. *Does SachNetra's UNIQUE data add cross-sectional alpha beyond that?* → **Not from the columns available
   today** (ear, deal). The whole ensemble thesis (edge-hunt §3) lives or dies on the **feeders** — per-ticker
   **sentiment** (needs G6 calibration → Exp20) and **latency** (needs G1 recall). v1 is the baseline; those
   feeders are now *the* test, with the §3.7 ablation protocol ready to measure their incremental IC.

### Caveats (v1 — they would make a positive *less* negative, not flip the IC verdict)
- **Cost model is conservative:** flat 250 bps per rebalance assumes ~100% monthly turnover. A real top-decile
  momentum book turns over ~30–50%/mo, so true net is materially better than −1.66% — possibly near
  break-even. **The gross IC (+0.043) and IR (0.26) are the cleaner "is there signal" reads**, and they say
  *weak, momentum-only.* A **turnover-aware cost** is the obvious v1.1 refinement.
- **Sparse unique columns:** ear (11 effective) / deal (43) can't contribute much yet; their *standalone* ICs
  are ~0, but more history (deeper announcements; the deals backfill from [[Exp18]]) would give a fairer test.
- **Size-neutral, not yet sector-neutral:** v1 neutralizes on log-ADV + band dummies; no true sector map yet.
- **Survivorship:** today's index membership applied back — the perennial ceiling.

### Next steps
- **Record the v1 null** (this file + registry). The harness (`build-xs-panel.mjs` + `exp19-xs-ensemble.mjs`)
  is the durable deliverable — the `positioning_v2 §3.3` capability now exists.
- **v1.1 (cheap):** turnover-aware cost; add `oi_shift` (V2-024) as a fourth genuinely-independent column.
- **The real test (v2):** land the feeders and re-run under the §3.7 ablation — **Exp20/G6 per-ticker
  sentiment** first (most likely to be momentum-independent), then **G1 latency**. *If neither lifts IC
  beyond momentum, the cross-sectional lane reduces to "midcap momentum, cost-fragile" = [[Exp15]], and the
  edge-hunt §3 thesis is itself refuted* — at which point the alt-data nowcasting moat (dataset-of-record,
  [[positioning_v2]] §7) is the standing fallback.

---

## D. Artifacts
- `scripts/research/build-xs-panel.mjs` — panel builder (read-only; the reusable asset).
- `scripts/research/exp19-xs-ensemble.mjs` — walk-forward ensemble backtester (read-only; `--selftest` PASS).
- `scripts/research/output/exp19/panel.csv` · `exp19_summary.csv`.

## E. Changelog
| Date | Change |
|---|---|
| 2026-06-07 | Pre-registered ([[exp19_brief]], incl. §3.7 ablation protocol); claimed Exp19. Authored panel builder + walk-forward backtester; `--selftest` PASS (caught a net-spread-vs-IC pass-condition bug). |
| 2026-06-07 | **Ran v1 → ❌ NOT SUPPORTED.** Composite OOS IC +0.043 (IR 0.26), gross ≈ +0.84%/mo, net −1.66%@250bps; blend = momentum (drop-momentum → IC 0.010; ear/deal add ≈0). Fixed a warmup-gate bug that first collapsed the blend to 11 OOS dates (sparse ear_drift was gating; now the densest column gates, cold columns weight 0 → 183 OOS). Decisive reframe: the ensemble bet now rests on the feeders (G6 sentiment, G1 latency). Registry + brief updated. |

## F. H19 Hypothesis Register row (for the playbook)
```
| H19 | 2026-06-07 | IC-weighted size-neutral walk-forward cross-sectional blend of weak signals → positive net top-decile spread | output/exp19/panel.csv (price_momentum, ear_drift, bulkdeal_intensity; 400 midcap+smallcap; 183 OOS monthly) | cross-sectional z → log-ADV/band neutralize → trailing-IC weights (past-only) → top-decile long-only vs eqw bench; DSR/Theil/ADF/KPSS + drop-one-out | composite OOS IC +0.043 (IR 0.26), gross ≈+0.84%/mo, net −1.66%@250bps; blend≈momentum (drop-mom IC→0.010; ear/deal add ≈0) | conservative flat-turnover cost; sparse unique columns; size-only neutral; survivorship | ❌ NOT SUPPORTED — weak momentum-only, cost-fragile; unique columns add no cross-sectional alpha | v1.1 turnover-aware cost + oi_shift; v2 = feeders (G6 sentiment, G1 latency) under §3.7 ablation; else lane = Exp15 redux |
```
