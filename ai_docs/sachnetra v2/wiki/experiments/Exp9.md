---
tags: [experiment, sachnetra, research, quant-finance, fii, volatility, garch, garch-x, validation, replication]
source: [[sachnetra_research_playbook]]
experiment_id: Exp9
status: SCAFFOLD — validated estimator built + self-test-passing; awaiting Lijo's prod run
run_date: not yet run against prod (scaffold authored 2026-05-22)
verdict: ⏳ PENDING RUN · validated-estimator RE-RUN of [[Exp7]]'s GARCH-X · goal = confirm (or overturn) Exp 7's ❌ NULL using a self-test that can actually identify γ
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

## 6. Results (PLACEHOLDER — fill from the prod run; nothing omitted)

### 6.1 Full-sample fit — GARCH(1,1) vs GARCH-X
| Model | μ | ω | α | β | γ | α+β | logL | LR (p) | BIC |
|---|---|---|---|---|---|---|---|---|---|
| GARCH(1,1) | _ | _ | _ | _ | — | _ | _ | — | _ |
| GARCH-X (|net|) | _ | _ | _ | _ | _ | _ | _ | _ | _ |

### 6.2 Outflow channel (`--signed=outflow`)
| Model | γ | LR | p(χ²₁) | sig |
|---|---|---|---|---|
| GARCH-X (outflow only) | _ | _ | _ | _ |

### 6.3 Out-of-sample (fit first 70%, score last 30%)
| Metric | GARCH(1,1) | GARCH-X | Δ (base − X), + = X better |
|---|---|---|---|
| predictive NLL (total / per day) | _ | _ | _ |
| realized-var RMSE | _ | _ | _ |
| OOS-refit γ | — | _ | — |

> **Prior (Exp 7's real-data numbers, for comparison):** γ≈−0.0019, LR=0.77 (p=0.38), BIC worse,
> OOS Δ≈+0.91 (negligible), outflow-only OOS *worse*. Exp 9 is expected to reproduce this null — now
> on a validated estimator. If Exp 9 instead shows a significant γ, that would mean Exp 7's null was
> the estimator failing to find a real effect — investigate immediately.

---

## 7. Interpretation (TO WRITE after the run — decision tree)

- **If γ≈0 / LR insignificant / no OOS gain (expected) →** ❌ NULL **confirmed on a validated
  estimator.** This *closes* the GARCH-X question opened by Exp 7 without the §8 caveat: |FII flow|
  genuinely adds nothing over GARCH persistence; Exp 6's OLS vol signal was the volatility-clustering
  it could not control for. Strong, clean null.
- **If γ>0 and LR significant AND it survives OOS →** 🟡/✅ Exp 7's null was an **estimator artifact**
  (the collinear self-test masked a real effect). This would *reinstate* Exp 6's volatility signal as
  incremental. Lower-probability given Exp 7's clean real-data convergence, but the whole point of the
  re-run is to be able to tell.

Report persistence `α+β` (expect ≈0.989 as in Exp 7).

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
| 1 | **Lijo runs §5 commands against prod**, fills §6, writes §7, logs H9 | the scaffold is validated but unrun; per [[feedback-v2-prod-execution]] Claude authors, Lijo runs | Lijo |
| 2 | Optional: seed the self-test RNG for byte-stable reproducibility | nicety; current recovery is already stable | research lane |
| 3 | Optional: Student-t + GJR leverage (Exp 7/9b) | cleaner tails; separates flow effect from return-leverage | future Exp |

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
| Question | GARCH-X: does |FII flow| beat plain GARCH? | **same** |
| Real-data run | ✅ done — ❌ NULL | ⏳ pending (expected to reproduce the null) |
| Self-test | ⚠️ smooth AR(1) `x`, collinear with ω — **could not identify γ** | ✅ spiky iid `x` — **recovers γ, LR p≈1.9e-8** |
| Status of the null | medium-high confidence (estimator unvalidated) | aims for **high confidence** (estimator validated) |

Exp 9 exists because the parallel-session Exp 7 reached the right answer with an unvalidated tool;
this re-run makes the null defensible. If both land null (expected), **Exp 7 + Exp 9 together** are the
program's definitive word that the FII-volatility relationship is not incremental to GARCH.

---

## Changelog
| Date | Change |
|---|---|
| 2026-05-22 | **Scaffold created** as a validated-estimator re-run of [[Exp7]]. Built `exp9-garch-x-fii-volatility.mjs` (Exp 7 script with the collinear smooth-AR(1) self-test replaced by a spiky iid regressor); **self-test now recovers γ cleanly** (LR p≈1.9e-8) where Exp 7's could not. Logged H9 (= H7 re-tested), the why-re-run rationale, method, and Exp 7's prior numbers as the comparison prior. Result tables are placeholders; verdict PENDING Lijo's prod run. No new data gap. |
