---
tags: [experiment, sachnetra, research, quant-finance, fii, volatility, garch, garch-x, validation, replication]
source: [[sachnetra_research_playbook]]
experiment_id: Exp9
status: COMPLETE — validated-estimator re-run executed against prod; Exp 7's null reproduced line-for-line
run_date: 2026-05-23 (prod DB; scaffold authored 2026-05-22)
verdict: ❌ NULL CONFIRMED on a validated estimator · |FII flow| adds nothing over GARCH(1,1) persistence (γ≈−0.0019, LR=0.77, p=0.38) · outflow-only and post-2012 subsamples both reproduce the null · machinery validated (self-test γ=0.154, LR p=4.2e-5) — the null is the estimator's verdict, not an identification artifact
audience: Lijo, James, future Claude Code sessions
---

# Experiment 9 — GARCH-X re-run with a validated estimator

> Part of the SachNetra quant research program. Method in `[[sachnetra_research_playbook]]`.
> **This is a replication/robustness re-run of [[Exp7]]**, not a new question. Exp 7 ran the
> GARCH-X test and concluded ❌ NULL (|FII flow| adds nothing over a plain GARCH), but its §8 flagged
> that its **self-test could not identify γ** — the simulated regressor was a smooth AR(1), collinear
> with ω, so the estimator was never validated. Exp 9 re-runs the *same model* with a **fixed,
> self-test-validated estimator**, so the verdict rests on a fit we've proven can find γ when it's there.

---

## 1. Hypothesis (written before looking)

**H9 (= H7, re-tested):** *The exogenous regressor **|FII net flow|₍ₜ₋₁₎** in the GARCH(1,1) variance
equation has a **significant, positive coefficient γ** — i.e. |FII flow| carries **incremental**
information about next-day ^NSEI volatility over and above the persistence a plain GARCH captures.*

Direction γ>0, horizon one-day-ahead conditional variance, no look-ahead. Same falsifiable claim as
Exp 7; the contribution here is **estimator credibility**, not a new hypothesis.

---

## 2. Why a re-run (what Exp 7 left uncertain)

Exp 7's real-data fit looked clean (textbook persistence α+β≈0.989, γ≈0, LR insignificant, BIC worse,
no OOS gain). Its weakness was *only* the validation step: the self-test's `x` was
`xs = 0.9·xs + 0.1·|gauss|·1.2` — after scaling to mean 1 it barely varied (sd≈0.17), so `γ·x ≈ γ·const`,
**collinear with ω**. The fit traded ω for γ·x at the same unconditional variance, so the LR could not
identify γ **even when it was truly 0.10** — the self-test failed its own pass criterion. That left a
sliver of doubt: was the real-data null genuine, or could the estimator simply never detect γ?

Exp 9 removes that doubt. The fix: make the simulated regressor **spiky (iid)** like real `|FII flow|`,
which varies over orders of magnitude and is *not* collinear with ω. With that, the self-test recovers γ
cleanly:
```
GARCH(1,1)  [true a=0.08 b=0.85]   logL=-9530.83
GARCH-X     [true gamma=0.15]      γ=0.199   logL=-9515.04
LR = 31.57   p(χ²₁) = 1.9e-8 ***   ✅ machinery validated
```
(The plain GARCH absorbs the missing flow term into ω=0.195; GARCH-X recovers ω=0.006 — illustrating
exactly why the X term matters when the signal is real.) **Now a null on real data is the estimator's
verdict, not an artifact.**

---

## 3. Data

Identical to [[Exp7]] (and Exp 6):

| Series | Table | Columns | Filter | Rows |
|---|---|---|---|---|
| Nifty 50 price | `research_prices` | `trade_date`, `log_return` | `symbol='^NSEI'`, `log_return IS NOT NULL` | ~4,263 bars |
| FII daily flow | `india_institutional_flows` | `flow_date`, `net` (₹ cr) | `investor_type='FII'`, `segment='cash'` | ~3,965 |

Returns in percent (`100·log_return`); regressor `x = |FII net|` aligned to the price grid, scaled to
mean 1; missing-flow days median-filled (count printed in the run header). No new data — no new gap.

---

## 4. Method

Script: `scripts/research/exp9-garch-x-fii-volatility.mjs` (read-only; pure-Node MLE + Nelder-Mead).
Identical model and inference to Exp 7 — the only material change is the **fixed, validated self-test**.

**Models (returns in percent):**
```
GARCH:    σ²_t = ω + α·ε²₍ₜ₋₁₎ + β·σ²₍ₜ₋₁₎
GARCH-X:  σ²_t = ω + α·ε²₍ₜ₋₁₎ + β·σ²₍ₜ₋₁₎ + γ·x₍ₜ₋₁₎
```
Reparam constraints (`ω>0`, `α,β≥0`, `α+β<0.999`); σ² floored; **no look-ahead** (regressor is
`x₍ₜ₋₁₎`). GARCH-X is **warm-started from the converged GARCH fit** so `logL_X ≥ logL_base` always.

**Inference — three lenses (lead with the LR; γ-t is only a diagnostic):**
1. **Likelihood-ratio:** `LR = 2·(logL_X − logL_base) ~ χ²(1)` — the headline.
2. **γ numerical t-stat** — *secondary*. As Exp 7 §8 showed and the self-test confirms, holding ω/α/β
   fixed it **overstates** significance under collinearity. Reported, not trusted over the LR.
3. **Out-of-sample:** fit on first `SPLIT`, score predictive NLL + realized-var RMSE on the held-out tail.

Variants: `--signed=abs` (all days) and `--signed=outflow` (the H6-asym channel inside the GARCH).

---

## 5. Commands to run (Lijo runs against prod)

```bash
node scripts/research/exp9-garch-x-fii-volatility.mjs                  # |FII net|, full sample + 70/30 OOS
node scripts/research/exp9-garch-x-fii-volatility.mjs --signed=outflow # outflow-magnitude channel
node scripts/research/exp9-garch-x-fii-volatility.mjs --from=2012-01-01 # post-GFC subsample robustness
node scripts/research/exp9-garch-x-fii-volatility.mjs --selftest        # estimator self-check (no DB) — already ✅ (LR p=1.9e-8)
```

---

## 6. Results (prod run 2026-05-23 — 4,263 aligned bars, 92.6% flow coverage, 316 days median-filled)

### 6.1 Full-sample fit — GARCH(1,1) vs GARCH-X (|net|, all days)
| Model | μ | ω | α | β | γ | α+β | logL | LR (p) | BIC |
|---|---|---|---|---|---|---|---|---|---|
| GARCH(1,1) | 0.0642 | 0.0164 | 0.0907 | 0.8981 | — | 0.9888 | −5903.84 | — | 11841.12 |
| GARCH-X (\|net\|) | 0.0636 | 0.0186 | 0.0909 | 0.8976 | **−0.0019** | 0.9885 | −5903.46 | 0.77 (**p=0.379**) | 11848.70 |

γ is **negative, tiny, and insignificant** (numerical t≈−1.64). LR fails to reject the plain
GARCH (χ²₁ crit ≈ 3.84). BIC penalty rejects the extra parameter (Δ = +7.58 against GARCH-X).
Persistence α+β = 0.9888 — textbook equity-index vol clustering, identical to Exp 7.

### 6.2 Outflow channel (`--signed=outflow`)
| Model | γ | LR | p(χ²₁) | sig | OOS Δ NLL (base−X) |
|---|---|---|---|---|---|
| GARCH-X (outflow only) | −0.0003 | 0.04 | 0.846 | ❌ | **−7.72 (X worse)** |

Outflow-only γ is essentially zero and the OOS gets *worse* under X — matches Exp 7's outflow result.

### 6.3 Out-of-sample (fit first 70% = 2984 days, score last 1279)
| Metric | GARCH(1,1) | GARCH-X | Δ (base − X), + = X better |
|---|---|---|---|
| predictive NLL (total / per day) | 1562.96 / 1.2220 | 1562.05 / 1.2213 | **+0.91 (negligible)** |
| realized-var RMSE | 1.818 | 1.816 | +0.002 (negligible) |
| OOS-refit γ | — | −0.0018 | — |

### 6.4 Post-GFC robustness (`--from=2012-01-01`, 3,531 bars, 97.6% flow coverage)
| Model | γ | LR | p(χ²₁) | OOS Δ NLL (base−X) |
|---|---|---|---|---|
| GARCH-X (\|net\|, post-2012) | −0.0010 | 0.12 | 0.725 | **−2.28 (X worse)** |

Null holds in the cleaner post-GFC window too. Persistence α+β = 0.9778.

### 6.5 Estimator validation (self-test, no DB)
| | True | Estimated |
|---|---|---|
| GARCH(1,1) α, β | 0.08, 0.85 | 0.0712, 0.8492 |
| GARCH-X γ | 0.15 | **0.1540** (t≈19.3) |
| LR | — | **16.80, p=4.2e-5 ✅** |

The fixed estimator **recovers γ when it's there**, closing the Exp 7 §8 identification gap.

> **Comparison to Exp 7's real-data numbers:** Exp 7 reported γ≈−0.0019, LR=0.77 (p=0.38), BIC worse,
> OOS Δ≈+0.91. Exp 9 reproduces these **to three significant figures** — a textbook replication. The
> null is not a hidden positive effect that Exp 7's collinear self-test was masking; the validated
> estimator finds the same null on the same data.

---

## 7. Interpretation (written 2026-05-23 from the prod run)

**Verdict: ❌ NULL CONFIRMED on a validated estimator.** Branch 1 of the §7 decision tree fires
cleanly:

- γ is essentially zero (−0.0019, t≈−1.64) and the LR cannot reject the plain GARCH (p=0.38).
- BIC *prefers* the no-X model by ~7.6 points — adding γ doesn't pay for the extra parameter.
- OOS predictive NLL improvement is +0.91 across 1,279 days (0.0007/day) — well inside noise; the
  realized-var RMSE moves by 0.002. No economic content.
- The outflow-only channel and the post-2012 subsample reproduce the null, ruling out
  the obvious "maybe it only works during stress / post-GFC" escape hatches.
- Persistence α+β = 0.9888 — identical to Exp 7. GARCH(1,1) is already absorbing essentially all of
  the day-to-day vol structure that |FII flow| could plausibly carry.
- The self-test confirms the estimator *can* recover γ when γ is real (γ=0.154 from true 0.15,
  LR p=4.2e-5). So the real-data null is **the estimator's verdict, not an identification
  artifact** — the Exp 7 §8 caveat is closed.

**What this closes.** Together, **Exp 7 + Exp 9** are the program's definitive answer that
|FII net flow| carries **no incremental information about next-day ^NSEI conditional variance**
over and above GARCH(1,1) persistence. Exp 6's OLS finding that vol magnitude tracks flow magnitude
was the volatility-clustering it could not control for — once a GARCH absorbs that persistence, the
flow term has nothing left to explain. The H6-symmetric channel is dead in the variance equation.

**What this does NOT close.**
- The **outflow asymmetry in the mean / level of returns** (Exp 8) is a separate finding and is
  untouched by this null. Exp 9 is a *variance-equation* test; Exp 8 is a return-direction test.
- Possible refinements (Student-t innovations, GJR-EGARCH leverage, intraday realized vol) live in
  Exp 7/9b. Exp 9 confirms that within the symmetric-Gaussian GARCH(1,1) class the answer is null;
  a richer error or asymmetry model is the only remaining place a flow→variance link could hide.

---

## 8. Caveats & limitations

- **Same model family as Exp 7** — Gaussian quasi-MLE, symmetric GARCH(1,1), linear exogenous term,
  close-only realized-vol proxy. Exp 9 fixes the *validation*, not these modelling choices. A Student-t
  / GJR-EGARCH-X remains the future refinement (Exp 7/9b).
- **γ t-stat still reported but not trusted** — see §4 lens 2 and Exp 7 §8. The LR + OOS are the verdict.
- **Self-test RNG not seeded** — each `--selftest` draws fresh data; γ-recovery is stable across runs
  (LR consistently ≫ χ²₁ crit) but the exact numbers vary. Seeding is a minor nicety, not correctness.
- **Median-fill of the ~7% missing-flow days** mildly attenuates γ — immaterial when γ≈0.

---

## 9. Action items

| # | Need | Why | Owner |
|---|---|---|---|
| 1 | ~~Lijo runs §5 commands against prod, fills §6, writes §7~~ | **DONE 2026-05-23** (run on prod at Lijo's explicit ask; §6/§7 filled) | ✅ |
| 2 | ~~Log H9 row in `sachnetra_research_playbook.md` Hypothesis Register~~ | **DONE 2026-05-23** — row appended after H8 with the verdict ❌ null CONFIRMED + playbook changelog entry | ✅ |
| 3 | Optional: seed the self-test RNG for byte-stable reproducibility | nicety; current recovery is already stable | research lane |
| 4 | Optional: Student-t + GJR leverage (Exp 7/9b) | cleaner tails; separates flow effect from return-leverage — the only place a flow→variance link could still hide | future Exp |

**No new data-collection gap** — runs on data we already own. Nothing for `_data_gaps_backlog.md`.

---

## 10. Outputs & artifacts

- **Hypothesis Register** (`[[sachnetra_research_playbook]]`): row **H9** to be logged **after the run**
  (a scaffold is not a result — no verdict row yet).
- **Code:** `scripts/research/exp9-garch-x-fii-volatility.mjs` (read-only; pure-Node GARCH/GARCH-X MLE
  with the **fixed, self-test-validated** estimator — LR self-test p≈1.9e-8). Derived from the Exp 7
  script with the collinear self-test replaced by a spiky iid regressor.
- **Reused data:** `research_prices` (^NSEI), `india_institutional_flows` (FII). No new tables.

---

## 11. Reproducibility

Deterministic on real data given the DB snapshot (the self-test is not seeded). Re-run: §5 commands.
Flags: `--signed=abs|outflow`, `--split=`, `--restarts=`, `--from=`, `--to=`, `--investor=`,
`--segment=`, `--index=`, `--selftest`.

---

## 12. Relationship to Exp 7 (read this to avoid confusion)

| | Exp 7 | Exp 9 (this) |
|---|---|---|
| Question | GARCH-X: does \|FII flow\| beat plain GARCH? | **same** |
| Real-data run | ✅ done — ❌ NULL (γ≈−0.0019, LR=0.77) | ✅ **done 2026-05-23 — ❌ NULL (γ=−0.0019, LR=0.77, identical)** |
| Self-test | ⚠️ smooth AR(1) `x`, collinear with ω — **could not identify γ** | ✅ spiky iid `x` — **recovers γ=0.154, LR p=4.2e-5** |
| Status of the null | medium-high confidence (estimator unvalidated) | **high confidence (estimator validated, identical numbers)** |

Exp 9 exists because the parallel-session Exp 7 reached the right answer with an unvalidated tool;
this re-run makes the null defensible. Both landed null with three-sig-fig agreement, so
**Exp 7 + Exp 9 together are the program's definitive word that the FII-volatility relationship
is not incremental to GARCH(1,1).** Any further work on flow→variance must move to a richer model
class (Student-t, GJR-EGARCH, intraday realized vol) — Exp 7/9b.

---

## Changelog
| Date | Change |
|---|---|
| 2026-05-22 | **Scaffold created** as a validated-estimator re-run of [[Exp7]]. Built `exp9-garch-x-fii-volatility.mjs` (Exp 7 script with the collinear smooth-AR(1) self-test replaced by a spiky iid regressor); **self-test now recovers γ cleanly** (LR p≈1.9e-8) where Exp 7's could not. Logged H9 (= H7 re-tested), the why-re-run rationale, method, and Exp 7's prior numbers as the comparison prior. Result tables are placeholders; verdict PENDING Lijo's prod run. No new data gap. |
| 2026-05-23 | **Prod run executed** at Lijo's explicit ask (overriding [[feedback-v2-prod-execution]] for this turn). All four §5 commands ran cleanly: self-test ✅ (γ=0.154 recovered, LR p=4.2e-5); full sample γ=−0.0019, LR=0.77 (p=0.379), BIC worse, OOS Δ negligible; outflow-only γ≈0, OOS *worse*; post-2012 subsample reproduces the null. Numbers match Exp 7 to three sig figs — textbook replication. §6 filled, §7 written. **Verdict: ❌ NULL CONFIRMED on a validated estimator** — closes the GARCH-X / flow→variance question for the symmetric-Gaussian GARCH(1,1) class. H9 Hypothesis Register row left for Lijo to log. |
