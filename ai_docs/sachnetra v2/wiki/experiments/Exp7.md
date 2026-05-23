---
tags: [experiment, sachnetra, research, quant-finance, fii, garch, volatility, validation]
source: [[sachnetra_research_playbook]]
experiment_id: Exp7
status: COMPLETE (confirmed — self-test now passes; see §8)
run_date: 2026-05-22
verdict: ❌ NULL · |FII flow| adds NO incremental next-day volatility-forecast power over a plain GARCH(1,1) (γ≈0, LR=0.77 p=0.38, BIC worse, no OOS gain; outflow-only OOS worse) · this REINTERPRETS [[Exp6]] — its OLS vol signal was largely the volatility-clustering it could not control for · estimator validated (self-test recovers γ, LR=21 p<1e-5)
audience: Lijo, James, future Claude Code sessions
---

# Experiment 7 — GARCH-X: does |FII flow| beat a plain GARCH(1,1)?

> Part of the SachNetra quant research program. Method in `[[sachnetra_research_playbook]]`.
> The rigorous follow-up to [[Exp6]] (the "fit a GARCH-X" item named in Exp 6 §9). Script authored by
> a parallel Claude session; reviewed + run + written up here.

---

## 1. Hypothesis (written before looking)

**H7:** *`|FII net flow|` on day T carries **incremental** information about next-day ^NSEI volatility
**over and above** what a plain GARCH(1,1) already captures via volatility persistence — i.e. the
exogenous regressor `|flow_{T-1}|` in the GARCH variance equation has a **significant, positive**
coefficient (γ > 0).*

---

## 2. Why this experiment (what it fixes about Exp 6)

[[Exp6]] regressed `|return_T+1|` on `|flow_T|` (OLS) and found a real, OOS-robust next-day volatility
signal (outflow asymmetry +24%, p<0.001). **But OLS on |r| ignores that volatility clusters:**
yesterday's vol predicts today's. So Exp 6 could not tell whether `|flow|` adds anything *beyond* that
persistence — maybe big flows simply occur on already-turbulent days (the same-day coincidence Exp 6
also found). GARCH(1,1) models persistence explicitly (`α·ε² + β·σ²`); **GARCH-X adds `γ·|flow|`.** If
γ is significant *after* the GARCH terms soak up persistence, `|flow|` has genuine incremental value.
This is the single most important robustness check on Exp 6.

---

## 3. Method

Script: `scripts/research/exp7-garch-x-fii-volatility.mjs` (read-only; `--selftest` needs no DB).

- **Returns in percent** (`100·log_return`) for optimiser conditioning (standard practice).
- **Models** (Gaussian quasi-MLE, fit by derivative-free Nelder-Mead, multi-restart):
  - GARCH(1,1): `σ²_t = ω + α·ε²_{t-1} + β·σ²_{t-1}`
  - GARCH-X:    `σ²_t = ω + α·ε²_{t-1} + β·σ²_{t-1} + γ·x_{t-1}`, where `x = |FII net|` scaled to mean 1.
- **No look-ahead:** the regressor entering `σ²_t` is `|flow_{t-1}|` (prior day's flow, known after that
  day's close). Same-day flow is never used.
- **Inference, three lenses:** (1) **Likelihood-ratio test** `LR = 2(logL_X − logL_base) ~ χ²₁` — the
  headline; (2) γ's numerical t-stat from NLL curvature (⚠ see §8 — unreliable); (3) **out-of-sample**:
  fit both on first 70%, roll the variance recursion through the held-out tail, compare predictive NLL
  + realized-variance RMSE.
- **Variants:** `--signed=abs` (all days) and `--signed=outflow` (|net| on outflow days only — the
  direct test of the H6-asym asymmetry).
- **Self-test:** simulates a known GARCH-X to check the estimator recovers γ (no DB).

---

## 4. Commands run

```bash
node scripts/research/exp7-garch-x-fii-volatility.mjs --selftest            # estimator check (no DB)
node scripts/research/exp7-garch-x-fii-volatility.mjs --restarts=15         # real data, |flow| all days
node scripts/research/exp7-garch-x-fii-volatility.mjs --signed=outflow --restarts=15
```
Data: 4,263 ^NSEI return-days; FII flow present on 3,947 (92.6%), 316 filled with the flow median.

---

## 5. Results (complete)

### 5.1 Full-sample fit + LR test
| Model | ω | α | β | γ | persistence α+β | logL | LR (p) |
|---|---|---|---|---|---|---|---|
| GARCH(1,1) | 0.0164 | 0.0907 | 0.8981 | — | **0.9888** | −5903.84 | — |
| GARCH-X (\|flow\|) | 0.0186 | 0.0909 | 0.8976 | **−0.0019** | 0.9885 | −5903.46 | **0.77 (0.38)** |
| GARCH-X (outflow) | 0.0167 | 0.0909 | 0.8979 | **−0.0003** | 0.9888 | −5903.82 | **0.04 (0.85)** |

γ is ~0 (even slightly negative); LR does not clear χ²₁ (3.84 @ 5%); BIC is **worse** for GARCH-X in
both specs (penalises the useless extra parameter).

### 5.2 Out-of-sample (fit first 70% = 2,984 days, score last 1,279)
| Spec | predictive NLL: GARCH | GARCH-X | Δ(base−X) | realized-var RMSE GARCH / X | OOS γ |
|---|---|---|---|---|---|
| \|flow\| all | 1562.96 | 1562.05 | **+0.91** (negligible) | 1.818 / 1.816 | −0.0018 |
| outflow-only | 1562.96 | 1570.68 | **−7.72** (X *worse*) | 1.818 / 1.825 | +0.0044 |

No meaningful OOS improvement on `|flow|`; the outflow-only GARCH-X is **worse** out-of-sample.

### 5.3 Self-test (simulated GARCH-X) — now PASSES after the fix
- **Original** (smooth AR(1) regressor, true γ=0.10): recovered γ≈0.064, **LR≈1 (p≈0.33)** while γ's
  own t≈8 — an internal contradiction caused by a flawed self-test, not the real-data fit (see §8).
- **Fixed** (parallel session: iid `|gauss|` regressor + warm-start optimiser, true γ=0.15):
  recovered **γ≈0.18, LR=21.0 (p≈4.5e-6 \*\*\*)**, γ t≈20 → ✅ machinery validated. The real-data
  result is **unchanged** by the better optimiser (γ=−0.0019, LR=0.77), so the null is now confirmed.

---

## 6. Interpretation

1. **Clean null: `|FII flow|` is not an incremental volatility forecaster.** Plain GARCH(1,1) has
   persistence α+β = **0.9888** (textbook for an equity index). Once that captures volatility
   clustering, adding `γ·|flow|` does nothing: γ≈0, LR insignificant, BIC worse, no OOS gain.

2. **This reinterprets [[Exp6]] — the key takeaway.** Exp 6's unconditional OLS finding
   (`|flow| → next-day vol`, outflows +24%) is still **true**, but it is **not incremental to GARCH**.
   Mechanism: big-flow days *cluster in already-turbulent regimes*, and the next day is volatile because
   **volatility is persistent**, not because of the flow. Exp 6 couldn't control for that; GARCH does,
   and the flow signal evaporates. *Exp 6's signal was largely the volatility-clustering it could not
   separate out.*

3. **The honest, sober consequence.** A practitioner who already runs a GARCH on prices (everyone does)
   gains **zero** from FII flow as a volatility input. The outflow asymmetry (H6-asym) is real as a
   *description* of regimes but not as an *incremental forecast*.

4. **Why this is good for the program, not bad.** Killing a promising result by controlling for the
   obvious confounder is exactly the discipline the playbook demands. Exp 6 → Exp 7 is the textbook
   "the signal didn't survive the proper control" arc — and we logged it instead of overselling Exp 6.

5. **Verdict: ❌ NULL** (medium-high confidence; see the §8 self-test caveat).

---

## 7. Caveats & limitations

- **Gaussian quasi-MLE.** Returns have fat tails; a Student-t GARCH would fit better, but the LR/OOS
  comparison between nested models is robust to this (both share the error law).
- **Linear exogenous term only.** `γ·|flow|` is linear-in-variance; a non-linear (e.g. threshold) flow
  effect isn't tested. Unlikely to rescue a γ this close to 0, but not ruled out.
- **GJR/leverage not separated.** A proper asymmetric GARCH (leverage term on negative *returns*) might
  overlap with the outflow effect; not modelled here. The outflow-only run already shows no incremental
  gain, so this is a refinement, not a likely reversal.
- **Median-fill of 7.4% missing flow days** mildly attenuates γ — but γ≈0, so immaterial here.

---

## 8. Self-test: was broken, now fixed and passing (RESOLVED)

The *original* self-test failed its own pass criterion — but the failure was in the self-test design,
not the real-data estimator. Diagnosis and resolution:

- **Original flaw — collinear regressor.** The simulated `x` was a smoothed AR(1)
  (`xs = 0.9·xs + 0.1·|gauss|·1.2`) → after scaling to mean 1 it barely varied (sd≈0.17). So
  `γ·x ≈ γ·constant`, **collinear with ω**: the GARCH-X fit just traded ω for γ·x at the same
  unconditional variance → LR couldn't identify γ even at a true 0.10. More restarts didn't help
  (confirmed) — collinearity, not convergence.
- **Fix (parallel session).** Self-test regressor changed to **iid `|gauss|`** (not persistent, so the
  GARCH β term can't re-absorb it) and the optimiser given a **warm start** (GARCH-X seeded at the base
  optimum with γ=0, so `logL_X ≥ logL_base` always). Result: γ recovered ≈0.18 (true 0.15),
  **LR=21.0 (p≈4.5e-6)** → ✅ validated. The real-data null is unchanged under the better optimiser.
- **Residual (now cosmetic): the γ t-stat is still univariate curvature** (holds ω,α,β fixed), so it can
  overstate significance under γ–ω collinearity. It mattered only in the broken self-test regime; on the
  real data the headline is the **LR test** (clearly null) and γ-t (−1.64) isn't load-bearing. A
  full inverse-Hessian SE would be tidier (§9 #2) but does not change H7.

**Confidence:** the null is confirmed — estimator validated by the passing self-test; LR + BIC + OOS
agree across both specs; real-data fit is textbook (persistence 0.989).

---

## 9. Action items

| # | Need | Status / Why | Owner |
|---|---|---|---|
| 1 | Fix the self-test DGP (identifiable regressor) + warm-start | ✅ **DONE** (parallel session): iid `|gauss|` regressor + warm-start optimiser → self-test passes (γ recovered, LR=21, p<1e-5). Estimator validated. | done 2026-05-22 |
| 2 | Full inverse-Hessian SE for γ (vs the univariate curvature t) | ⬜ optional/cosmetic now — only mattered under the broken self-test's collinearity; on real data the LR test is the headline and γ-t isn't load-bearing. Does not change H7. | parallel instance (if desired) |
| 3 | Student-t errors + GJR leverage term (**Exp 7b**) | ⬜ future Exp — cleaner fit; separates flow effect from return-leverage. A new experiment, not a fix to this script. | future Exp |

**No new data-collection gap** — Exp 7 ran on data we already own. Nothing for `_data_gaps_backlog.md`.

---

## 10. Outputs & artifacts
- **Hypothesis Register** (`[[sachnetra_research_playbook]]`): row **H7** logged 2026-05-22.
- **Code:** `scripts/research/exp7-garch-x-fii-volatility.mjs` (read-only; authored by parallel session).
- **Reused data:** `india_institutional_flows` (FII), `research_prices` (^NSEI). No new tables.

---

## 11. Reproducibility
Deterministic on real data given the DB snapshot (the self-test is not — it isn't seeded). Re-run: §4
commands. Flags: `--signed=abs|outflow`, `--split=`, `--restarts=`, `--from=`, `--to=`, `--selftest`.

---

## 12. Cross-experiment summary (state after Exp 7)

| Exp | Signal | Question | Verdict |
|---|---|---|---|
| 1 | FII daily flow | direction (mean) | ❌ no prediction; coincident only |
| 2 | NSE announcements | price reaction | ⬜ inconclusive (1 mo data) |
| 3 | News sentiment | direction (mean) | ⬜ inconclusive (16 days) |
| 4 | Bourse vs newswire | latency | 🟡 supported — **leads newswire** ~13min (gated) |
| 5 | Sentiment/FII tails | EVT co-occurrence | ⏸ deferred (data too young) |
| 6 | \|FII flow\| | volatility (unconditional) | 🟡 associated — but see Exp 7 |
| 7 | **\|FII flow\| in GARCH** | volatility (**incremental**) | **❌ adds nothing over GARCH** |

**The honest state after Exp 7:** the FII-volatility lead (Exp 6) does **not** survive the proper
control (Exp 7). Direction is coincident (Exp 1/3); the variance "signal" is just volatility-clustering;
announcements/sentiment are too young (Exp 2/3); EVT is deferred (Exp 5). **The only signal still
standing as genuinely *additive* is Exp 4 — latency (leads the newswire) — and it is tagging-gated.**
Consistent program thesis: SachNetra's edge, where one exists, is **timing/latency**, not forecasting.

---

## Changelog
| Date | Change |
|---|---|
| 2026-05-22 | Reviewed the parallel-authored GARCH-X script, ran self-test + real data (|flow| & outflow-only). Logged the ❌ null (γ≈0, LR=0.77, no OOS gain), the Exp 6 reinterpretation, and the self-test/γ-t weaknesses (collinearity) with fixes. Wrote H7. Script edits left to the authoring session. |
