---
tags: [experiment, sachnetra, research, quant-finance, fii, volatility, leverage-effect, confound, robustness, validation]
source: [[sachnetra_research_playbook]]
experiment_id: Exp8
status: COMPLETE
run_date: 2026-05-22
verdict: 🟡 SUPPORTED (robustness check on [[Exp6]]) · the FII-OUTFLOW → next-day-vol asymmetry is NOT merely the leverage effect · outflow coef survives the own-return control (t 6.99→5.83, shrinks only ~18%), holds within both up- and down-day strata, and out-of-sample on |r| (t=2.89) · leverage effect itself is real but modest · weakens OOS on the r² proxy
audience: Lijo, James, future Claude Code sessions
---

# Experiment 8 — Is the FII-outflow volatility asymmetry just the LEVERAGE EFFECT?

> Part of the SachNetra quant research program. Method in `[[sachnetra_research_playbook]]`.
> A **robustness / falsification test of [[Exp6]]** (FII outflow days → +24% next-day vol), run
> alongside [[Exp7]] (GARCH-X). Exp 7 and Exp 8 attack Exp 6's result from two *different* confound
> angles: Exp 7 controls for volatility **persistence**; Exp 8 controls for the market's own
> **return sign** (the leverage effect).

---

## 1. Hypotheses (written before looking)

- **H8a — leverage effect:** *A **negative** ^NSEI return on day T precedes **higher** volatility on
  T+1 than a positive return of the same size* — the classic equity leverage effect (down moves raise
  next-day vol). Direction: down-days → more next-day vol. Horizon: T+1.
- **H8b — the confound (the real point):** *Exp 6's headline — FII-**outflow** days precede ~+24%
  higher next-day vol than inflow days — may be the leverage effect in disguise, because outflow days
  are disproportionately **down** days.* **After controlling for the sign & size of day T's own
  return, does the outflow effect retain independent predictive content (coefficient stays positive &
  significant), or does it collapse (it was leverage all along)?**

Falsifiable both ways: if the outflow coefficient collapses to ~0 once own returns enter, Exp 6 is
re-framed as a leverage artefact; if it survives, Exp 6's risk signal is genuinely flow-driven.

---

## 2. Why this experiment

Exp 6's outflow asymmetry is the program's most **economically meaningful** result (the basis for a
potential *risk* product). Before it informs anything, it must survive the single most obvious
confound. Two facts make the confound plausible a priori: (1) FII selling clusters on down days; (2)
the equity leverage effect mechanically raises volatility *after* down days. An outflow→vol contrast
that ignores own returns could be double-counting that. This is the disciplined "kill your own result
before someone else does" step the playbook demands — and it complements [[Exp7]], which kills the
*magnitude* signal via GARCH persistence but says nothing about the *sign* asymmetry tested here.

---

## 3. Data

| Series | Table | Columns | Filter | Rows |
|---|---|---|---|---|
| FII daily flow | `india_institutional_flows` | `flow_date`, `net` (₹ cr) | `investor_type='FII'`, `segment='cash'` | ~3,965 |
| Nifty 50 price | `research_prices` | `trade_date`, `log_return` | `symbol='^NSEI'` | 4,264 bars (2009→2026-05-22) |

Aligned observations (flow day that is also a priced trading day with a forward window): **n=3,947**.
Reuses [[Exp1]]/[[Exp6]]'s no-look-ahead forward-window machinery (binary search over the real
trading calendar).

---

## 4. Method

Script: `scripts/research/exp8-leverage-confound.mjs` (read-only — SELECTs only).

- **Target Y:** next-day volatility proxy — `|log_return_T+1|` (default) and `r²_T+1` (robustness).
- **Predictors known at close of T (no look-ahead — both flow and own return publish after T's close):**
  - `outflow_T` = 1 if FII `net < 0` (the exact variable Exp 6's asymmetry used);
  - `|r_T|` = own-move **size** (soaks up volatility persistence / the same-day coincidence);
  - `dn_T = max(−r_T, 0)` = **downside** magnitude (the leverage channel).
- **The two nested models (the heart of the test):**
  - **Model A** (Exp 6 reproduction): `vol_T+1 = a + b·outflow_T`
  - **Model B** (+ own-return controls): `vol_T+1 = a + b·outflow_T + c1·|r_T| + c2·dn_T`
  - Compare `b` and its t-stat A→B. Collapse ⇒ leverage confound; survival ⇒ independent flow content.
- **Stratified (model-free) control:** outflow-vs-inflow next-day vol **within down-only** and **within
  up-only** days. The same control, no functional-form assumption.
- **Validation:** 70/30 chronological split — re-fit Model B in-sample, check the outflow coef on the
  held-out tail.
- **Stats (pure Node, no deps):** multiple OLS via normal equations (Gauss-Jordan inverse), t-stats
  from `σ²·(XᵀX)⁻¹`; Welch two-sample t for the contrasts; normal-approx p. `*`<.10 `**`<.05 `***`<.01.
- **Estimator self-test (`--selftest`, no DB):** simulates two worlds — (i) outflow = pure down-day
  proxy with no independent effect, (ii) outflow with a genuine independent vol effect — and confirms
  Model B's control **collapses the confound** (t 70→−0.5) and **preserves the real signal** (t≈85).
  Validated before the live run.

---

## 5. Commands run

```bash
node scripts/research/exp8-leverage-confound.mjs --selftest   # estimator validation (no DB)
node scripts/research/exp8-leverage-confound.mjs              # |r| proxy (primary)
node scripts/research/exp8-leverage-confound.mjs --target=sq  # r² proxy (robustness)
```

---

## 6. Results (complete — nothing omitted)

### 6.1 Anchor — Exp 6's asymmetry reproduced (sanity check)
| | n | mean next-day vol |
|---|---|---|
| outflow days (net<0) | 1767 | **0.828%** |
| inflow days (net≥0) | 2180 | **0.662%** |

Difference +0.166% = **+25.0% higher**, Welch t=**6.74**, p<0.001 ***. Matches Exp 6's +24% headline —
the result we are stress-testing is reproduced on the aligned sample.

### 6.2 H8a — the leverage effect is real (but modest)
| | n | mean next-day vol |
|---|---|---|
| down days (r_T<0) | 1855 | 0.791% |
| up days (r_T≥0) | 2092 | 0.688% |

Difference +0.104%, Welch t=**4.38**, p<0.001 ***. Signed-return slope `vol_T+1 ~ r_T` = −3.74e-4,
t=**−3.29** *** (negative ⇒ leverage). **So the confounder genuinely exists** — down days do precede
more next-day vol.

### 6.3 Does the confound have a channel? — P(down | flow sign)
| | P(down day) |
|---|---|
| given **outflow** | **50.0%** |
| given **inflow** | **44.5%** |

Outflow days are more likely to be down days, but the gap is only **5.5pp** — the link is real but
**weak**. This already hints the confound can't explain a +25% effect on its own; §6.4 confirms it.

### 6.4 THE TEST — nested regressions (primary proxy, |r|)
| Model | b(outflow) | t | other coefs | R² |
|---|---|---|---|---|
| **A** `a + b·outflow` | 1.66e-3 | **6.99 \*\*\*** | — | 0.0122 |
| **B** `+ c1·\|r_T\| + c2·dn_T` | 1.36e-3 | **5.83 \*\*\*** | c1(\|r_T\|)=1.66e-3 t=8.18 *** · c2(downside)=4.32e-4 t=1.93 * | 0.0486 |

**The outflow coefficient shrinks only ~18%** (1.66e-3 → 1.36e-3) and **stays highly significant**
(t 6.99 → 5.83) when the own-return controls enter. The own-move **size** `|r_T|` is the strong
control (t=8.18); the pure **downside/leverage** term `dn_T` is only marginal (t=1.93).

### 6.5 Stratified (model-free) control — |r| proxy
| Stratum | outflow | inflow | diff | Welch t |
|---|---|---|---|---|
| **DOWN days only** | 0.885% (n=884) | 0.706% (n=971) | +0.179% | **5.16 \*\*\*** |
| **UP days only** | 0.771% (n=883) | 0.627% (n=1209) | +0.144% | **4.12 \*\*\*** |

The outflow→vol gap is present and significant **inside both** return-sign buckets — the cleanest
possible evidence that it is not merely a down-day effect.

### 6.6 Out-of-sample (Model B, |r|)
| sample | b(outflow) | t |
|---|---|---|
| in (first 70%, n=2762) | 1.78e-3 | **5.84 \*\*\*** |
| out (last 30%) | 9.74e-4 | **2.89 \*\*\*** |

Survives out-of-sample, though the coefficient roughly halves (weaker but still significant on recent
dates).

### 6.7 Robustness — squared-return proxy (r²)
| Model | b(outflow) | t | notes |
|---|---|---|---|
| A | 6.41e-5 | 4.68 *** | R²=0.0055 |
| B | 4.88e-5 | **3.62 \*\*\*** | shrinks ~24%; c1(\|r\|) t=11.34 ***; c2(downside) t=**−3.39** |
| stratified DOWN-only | — | **4.35 \*\*\*** | diff +0.006% |
| stratified UP-only | — | **2.48 \*\*** | diff +0.007% |
| OOS out-sample | 1.58e-5 | **1.49 (ns)** | full-sample survives, **OOS does not** |

On r² the outflow effect survives full-sample and in both strata, but **fails out-of-sample**
(t=1.49). The leverage term `c2` even flips negative here — an artefact of collinearity between
`|r_T|` and `dn_T` (downside ⊂ |r|; see §8). The honest read: the result is robust on |r|, **softer**
on r².

---

## 7. Interpretation

1. **Exp 6 is NOT merely the leverage effect — the headline survives.** After controlling for the
   sign and size of the market's own move, the FII-outflow coefficient shrinks only ~18% and stays
   significant (t=5.83), holds *within* both up- and down-day strata (t=4.12 / 5.16), and survives
   out-of-sample on the primary |r| proxy (t=2.89). FII outflow carries next-day-volatility
   information **beyond** the market's own down-move. The most economically meaningful result in the
   program passes its most obvious falsification test.

2. **The leverage effect is real but small, and the confound channel is weak.** Down days do precede
   higher vol (t=4.38), but outflow days are only 5.5pp more likely to be down days (50.0% vs 44.5%) —
   far too weak a link to manufacture a +25% effect. That is *why* the outflow coefficient barely
   moves when own returns are controlled.

3. **The own-move SIZE, not the leverage sign, is the real co-driver.** In Model B the strong control
   is `|r_T|` (t=8.18–11.34), not the downside term `dn_T` (marginal/sign-unstable). This is the
   *coincidence/persistence* channel — big-move days cluster — i.e. exactly what [[Exp7]]'s GARCH
   models head-on. Exp 8 confirms a single-lag version of that persistence is the main thing sharing
   variance with the outflow signal; the pure leverage *asymmetry* is secondary.

4. **Reconciling with [[Exp7]] (important — they do NOT contradict).** Exp 7 (GARCH-X) reportedly finds
   |FII flow| **magnitude** adds nothing once a **full multi-day GARCH persistence recursion** is
   modelled. Exp 8 finds the **outflow sign-asymmetry** survives a **single-lag own-return** control.
   These are different signals (magnitude vs sign) and different controls (full GARCH vs one-day |r_T|).
   Exp 8's persistence proxy is far weaker than Exp 7's, so **Exp 8 does not overturn Exp 7** — it
   bounds a *different* confound (leverage), and shows the outflow asymmetry isn't a leverage artefact.
   The unifying test is a **GARCH-X with an outflow dummy/sign term** (future Exp — §9).

5. **Verdict: 🟡 SUPPORTED (as a robustness check).** Exp 6's outflow asymmetry passes the leverage
   confound test. Caveat the r² OOS softness and the open question of whether it *also* survives full
   GARCH persistence (Exp 7 territory) — see §8/§9. Still a *risk* signal, not alpha, and economically
   modest (R² ≤ 0.05), exactly as Exp 6 framed it.

---

## 8. Caveats & limitations

- **`|r_T|` and `dn_T` are collinear by construction** (downside is the negative part of |r|). Their
  *individual* coefficients (c1, c2) are not cleanly separable — the downside coef even flips sign
  across proxies. **What is interpretable is the outflow coefficient after both are included** (the
  test), not the c1/c2 split. The stratified contrast (§6.5/§6.7) is the assumption-free backstop.
- **Single-lag persistence control only.** Exp 8 controls for *day-T's own return*, not the full
  volatility history. It therefore does **not** answer Exp 7's question (does the signal survive full
  GARCH persistence?). It answers a narrower one (is it the leverage effect?) — and only that.
- **r² proxy weakens out-of-sample** (t=1.49). The result is robust on |r| but not bulletproof; treat
  the magnitude as modest and the OOS as "holds on |r|, soft on r²."
- **Index-level, cash segment, provisional-superseded flows** — same scope caveats as [[Exp1]]/[[Exp6]].
- **Small R² (≤0.05).** A genuine but economically small relationship — the Exp 1 lesson applies: real
  ≠ large. Value is in the conditional contrasts, not forecast R².
- **p-values normal-approximated** — immaterial at n≈3,900.

---

## 9. Action items / what strengthens this

| # | Need | Why | Owner |
|---|---|---|---|
| 1 | **GARCH-X with an outflow dummy / signed term** (unify Exp 7 + Exp 8) | The clean test: does the outflow *sign asymmetry* survive **full** vol persistence, not just one lag? Resolves the Exp7-vs-Exp8 boundary. | future Exp (research lane) |
| 2 | Orthogonalize the leverage control (use signed `r_T` alone, or `r_T` + `r_T²`) | Removes the |r_T|/dn_T collinearity so the leverage channel is cleanly estimated | future Exp |
| 3 | Range-based vol proxy (Parkinson/Garman-Klass from the OHLC we already store) | Less noisy target than |r|/r²; would sharpen the OOS verdict | research lane (OHLC already in `research_prices`) |

**No new data-collection gap surfaced** — Exp 8 ran entirely on the clean FII + ^NSEI series we
already own. Nothing new for `_data_gaps_backlog.md` (same as Exp 6).

---

## 10. Outputs & artifacts

- **Hypothesis Register** (`[[sachnetra_research_playbook]]`): rows **H8, H8a** logged 2026-05-22.
- **Code:** `scripts/research/exp8-leverage-confound.mjs` (read-only; includes `--selftest`).
- **Reused data:** `india_institutional_flows` (FII), `research_prices` (^NSEI). No new tables.

---

## 11. Reproducibility

Deterministic given the same DB snapshot. Re-run: §5 commands. Flags: `--target=abs|sq`, `--horizon=N`,
`--investor=FII|DII`, `--segment=`, `--index=`, `--from=`, `--to=`, `--split=`, `--selftest`.

---

## 12. Cross-experiment summary (state after Exp 8)

| Exp | Signal | Question | Verdict | Leading? |
|---|---|---|---|---|
| 1 | FII daily flow | direction (mean) | ❌ no next-day prediction | coincident only |
| 2 | NSE announcements | price reaction | ⬜ inconclusive (1 mo data) | same-day pop |
| 3 | News sentiment | direction (mean) | ⬜ inconclusive (16 days) | coincident |
| 4 | Bourse vs newswire | latency | 🟡 supported (gated) | **leads newswire** ~13min |
| 5 | Sentiment/FII tails | EVT co-occurrence | ⏸ deferred (data too young) | — |
| 6 | \|FII flow\| | volatility (variance) | 🟡 supported, OOS-robust | **leads next-day vol; outflows→+24%** |
| 7 | \|FII flow\| vs GARCH | incremental over persistence | 🔻 magnitude signal dies under full GARCH persistence | (persistence absorbs it) |
| 8 | **FII outflow vs leverage** | **is Exp 6 just the leverage effect?** | **🟡 supported — survives the leverage control** | (robustness check, not a new signal) |

**The honest state after Exp 8:** Exp 6's outflow→vol asymmetry has now been pushed from two sides.
Exp 7 shows the **magnitude** signal is mostly volatility *persistence* (it dies under full GARCH).
Exp 8 shows the **outflow sign-asymmetry** is **not** the *leverage effect* (it survives the own-return
control). Both can be true: the asymmetry is real and not a leverage artefact, but how much of it
survives a *full* persistence model (vs the single lag tested here) is the open question Exp 7 raises
and a future GARCH-X-with-outflow-term must settle. The program's thesis is unchanged — SachNetra's
data informs *when/how much* the market moves (risk/vol/latency), not *which way*.

---

## Changelog
| Date | Change |
|---|---|
| 2026-05-22 | Initial complete write-up. Reproduced Exp 6's +25% outflow asymmetry (n=3947), confirmed a real-but-modest leverage effect (down-day +0.10%, t=4.38), showed the confound channel is weak (P(down\|outflow) 50.0% vs 44.5%), and ran the nested-regression + stratified + OOS controls. Verdict 🟡 SUPPORTED: the outflow coef shrinks only ~18% and stays significant (t=5.83), holds in both strata and OOS on \|r\| (t=2.89), softer on r² OOS (t=1.49). Reconciled with Exp 7 (different confound, no contradiction). Estimator self-test validated first. |
