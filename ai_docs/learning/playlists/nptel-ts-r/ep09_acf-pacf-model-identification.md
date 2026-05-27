---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=JbJjislNHFY&list=PLOzRYVm0a65e8s29NCmih-Aww81ax0A0H&index=9
source_type: video
duration: ~30m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, ACF, PACF, correlogram, AR1, model-identification, markov]
status: distilled
---

# Ep 09 — ACF, PACF, and Model Identification

> **Why Lijo watched this**: Learn the two diagnostic graphs (ACF and PACF) that tell you which ARIMA model to fit — the visual model-selection tools.

---

## ⏱ Worth watching? SKIP

The first 20 minutes is math deriving AR(1)'s mean and variance — useful to know the result but not the derivation. The key conceptual content is the ACF vs PACF distinction and the model-identification table, all captured below.

---

## What this episode is actually about (ELI12)

Two diagnostic graphs. That's the whole lecture. Everything else is the math supporting them.

---

## The ACF plot (Correlogram)

Autocorrelation at lag 1 = how much does today predict tomorrow?
Autocorrelation at lag 2 = how much does today predict 2 days from now?
Autocorrelation at lag K = how much does today predict K days from now?

**Plot all of those side by side** — x-axis is lag K, y-axis is correlation (-1 to +1). That's the correlogram, or ACF plot.

**White noise ACF**: one bar at lag 0 (correlation of anything with itself = 1.0), then flat zero for all other lags. The signature of pure randomness — nothing predicts anything else.

**Critical use**: After fitting any model, plot the ACF of the *residuals*. If it looks like white noise → model is complete. If bars still stick up at certain lags → the model missed structure at those lags. Residual ACF is the model diagnostic.

---

## The PACF plot (Partial Autocorrelation)

**Problem with plain ACF**: ACF at lag 3 is contaminated. Some of the correlation between today and 3 days ago is just because today→tomorrow→day after→day+3 form a chain. It's an indirect relationship.

**PACF removes the chain.** PACF at lag 3 = "how much does 3-days-ago directly predict today, *after removing the intermediate predictions through days 1 and 2*?"

Think of it as: does your grandfather's height predict your height, *controlling for the fact it already predicted your parent's height?* PACF isolates the direct channel with no middlemen.

Formally: `PACF(K) = Correlation(YT, YT-K | YT-1, YT-2, ..., YT-K+1)`

The vertical bar means "conditional on" — "given that we already know all the intermediate values."

---

## The model-identification table — memorise this

This is the entire point of studying ACF and PACF.

| ACF pattern | PACF pattern | Model to use |
|---|---|---|
| Cuts off sharply after lag q | Tails off gradually | → **MA(q)** |
| Tails off gradually | Cuts off sharply after lag p | → **AR(p)** |
| Both tail off gradually | Both tail off gradually | → **ARMA(p,q)** |
| Both flat (white noise) | Both flat | → No model; data is already random |

**Reading the graphs**: "cuts off" means the bars drop to zero and stay there. "Tails off" means bars decay slowly, getting smaller but never quite reaching zero.

This table is what practitioners use before fitting any ARIMA model. Look at the ACF and PACF plots of your differenced series, match the pattern to the table, pick p and q.

---

## Properties of ACF worth knowing

- **ρ(0) = 1** always — correlation of anything with itself is 1
- **ρ(K) = ρ(-K)** — symmetric around lag 0
- **|ρ(K)| ≤ 1** — all autocorrelations are bounded between -1 and +1
- **Non-uniqueness**: multiple non-normal processes can share the same ACF. The ACF alone doesn't uniquely identify the process unless you also assume normality.

---

## Sample ACF (the practical formula)

In practice you don't have the population ACF — you compute it from your observed data:

`R(K) = Σ[(Yt - Ȳ)(Yt+K - Ȳ)] / Σ[(Yt - Ȳ)²]`

This is just the sample correlation between the series and a lagged copy of itself. Software (Python, R) computes this automatically — `statsmodels.graphics.tsaplots.plot_acf()` in Python.

---

## Key math results (results only, skip the derivation)

**AR(1) model**: `YT = c + φ1·YT-1 + εT`

- Mean: `μ = c / (1 - φ1)` (assuming constant mean and |φ1| < 1)
- Variance: `σ²Y = σ²ε / (1 - φ1²)`
  - As φ1 → 1 (random walk): variance → ∞. This is why random walks are non-stationary.
  - Stronger AR coefficient = process variance amplifies the noise variance.

**Markov property of AR(1)**: Given yesterday's value, today's value is independent of all older history. Only the most recent state matters. AR(1) = Markov process with memory-1. AR(p) = Markov process with memory-p.

---

## Sample ACF vs Theoretical ACF

| | Theoretical ACF | Sample ACF |
|---|---|---|
| What it is | True population correlation at each lag | Estimated from your observed data |
| When you use it | Proving model properties mathematically | Diagnosing real data, checking residuals |
| In Python | Computed from model specification | `plot_acf(series)` from statsmodels |

---

## So what for SachNetra?

**The ACF/PACF diagnostic is the first step before fitting any ARIMA on our data:**

1. Take the abnormal return series around NSE filing events
2. Difference it if non-stationary (likely not needed for returns, but verify)
3. Plot ACF and PACF
4. Read the patterns → determine p and q for ARIMA
5. Fit the model, then plot residual ACF to confirm white noise residuals

**The Markov property insight**: If our event-driven returns follow AR(1), it means only yesterday's return matters — not anything from 2+ days ago. That directly validates (or invalidates) using a 1-day vs 5-day window.

**Experiments**:
- Diagnostic (not a full experiment): compute ACF/PACF on post-event abnormal returns for the top 3 filing categories. Document the lag at which autocorrelation drops to zero — that's the natural event window size.

**Verdict**: **Park** — the conceptual tools are now in hand. The PACF graph is the thing to look for in the next set of experiments.

---

## Open questions

- Ep 10 is "ACF and PACF for specific processes" — that's where the model-identification table gets illustrated with actual ACF shapes for AR, MA, and ARMA. High value.
- Python's `plot_acf()` and `plot_pacf()` from `statsmodels` are the direct implementation of everything in this lecture. Worth checking if SachNetra already uses these anywhere.
- The 95% confidence bands on ACF plots (the blue shaded region) tell you which lags have *statistically significant* autocorrelation. Lags inside the band = indistinguishable from white noise. This detail probably covered in a future lecture.
