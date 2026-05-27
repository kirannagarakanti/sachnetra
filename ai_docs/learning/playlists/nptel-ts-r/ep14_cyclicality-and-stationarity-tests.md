---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=huwuD5qJoCQ
source_type: video
duration: ~30m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, cyclicality, stationarity-tests, ADF, KPSS, PP, unit-root]
status: distilled
---

# Ep 14 — Cyclicality and Tests for Stationarity

> **Why Lijo watched this**: To learn the formal distinction between seasonality and cyclicality, understand how unit roots cause non-stationarity, and master the standard statistical tests (ADF, KPSS, PP) used to prove stationarity.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This is one of the most critical lectures in the series. It transitions from visual diagnostics to formal hypothesis testing. Focus on **16:23 to 23:14** for the mathematical proof of how a unit root creates a non-stationary process, and **24:14 to 30:04** for the breakdown of the ADF, KPSS, PP, and Variance Ratio tests.

---

## What this episode is actually about (ELI12)

Imagine you are looking at a line graph that goes up and down over time. 

If it goes up and down like clockwork every 12 months, that's **seasonality**. 
But if it goes up and down in long, irregular waves—taking anywhere from 2 to 10 years for one wave, with some peaks much higher than others—that's **cyclicality** (like business cycles or solar cycles).

To prove whether these waves are just temporary fluctuations or if they are permanently drifting away, we check for a **unit root**. A unit root is like a memory chip in the data that remembers every past shock forever. If a series has a unit root, it will drift randomly and never return to its average. We use statistical tests to check if this "memory" exists so we know if we need to difference the data.

---

## Key concepts introduced

- **Cyclicality (Cyclical Variations)** — Long-term, irregular, up-and-down movements in a time series that do **not** have a fixed frequency and typically last longer than a single year. Matters because it represents a distinct component from calendar-based seasonality.
- **Unit Root** — A condition in an autoregressive model where the characteristic equation $\Phi(B) = 0$ has a root exactly equal to 1. Matters because a unit root mathematically guarantees that the process is non-stationary, meaning shocks are permanent and the series has infinite long-term variance.
- **ADF (Augmented Dickey-Fuller) Test** — A hypothesis test where the null hypothesis ($H_0$) is that the series is non-stationary (has a unit root). Matters because it is the industry standard test to justify differencing ($d \ge 1$).
- **KPSS Test** — A hypothesis test where the null hypothesis ($H_0$) is that the series is stationary around a mean or trend. Matters because it acts as a "sanity check" complementary to the ADF test (reversing the null and alternative hypotheses).
- **PP (Phillips-Perron) Test** — A unit root test similar to ADF but modified to be robust against autocorrelation and heteroscedasticity (changing variance) in the residuals.
- **Variance Ratio Test** — A test that evaluates the random walk hypothesis by comparing multi-period return variances to single-period return variances. If the ratio is close to 1, the series behaves like a random walk (non-stationary).

---

## Seasonality vs. Cyclicality: The Diagnostic Guide

| Attribute | Seasonality | Cyclicality |
|---|---|---|
| **Frequency / Period** | Fixed, predictable, repeating within 1 year | Irregular, varying lengths, extending beyond 1 year |
| **Causes** | Calendar effects, weather seasons, holidays | Business cycles, macro factors, long-term cycles |
| **Magnitude** | Relatively consistent variance across peaks/troughs | Highly variable and unpredictable magnitudes |
| **Visual tools** | Seasonal plot, seasonal subseries plot | Run sequence plot over multi-year horizons |

---

## Visual Diagnostic: Individual Box Plots by Season
The professor introduces side-by-side box plots as a powerful seasonal diagnostic tool:
*   **Structure**: Plots calendar months (Jan–Dec) on the x-axis, with a box plot summarizing all years of data for each month.
*   **Value**: It reveals not just the mean (like a subseries plot), but the entire distribution—showing the median (Q2), spread (Q1 to Q3), skewness, and outliers for each season.

---

## Unit Root Math: Why a Root of 1 Destroys Stationarity

Consider an ARMA(2,1) process:
$$Y_t = 1.9 Y_{t-1} - 0.9 Y_{t-2} + \varepsilon_t - 0.5 \varepsilon_{t-1}$$

Using the backshift operator $B$:
$$(1 - 1.9B + 0.9B^2)Y_t = (1 - 0.5B)\varepsilon_t$$

We solve the characteristic equation for the AR polynomial:
$$1 - 1.9B + 0.9B^2 = 0$$

Factorizing this gives:
$$(1 - B)(1 - 0.9B) = 0 \implies \text{Roots are } B_1 = 1, B_2 = 1.11$$

Since $B_1 = 1$, we have a **unit root**. Because of the $(1-B)$ term, the model can be written as:
$$\nabla Y_t = 0.9 \nabla Y_{t-1} + \varepsilon_t - 0.5 \varepsilon_{t-1}$$

This means the *differenced* series is stationary, but the *original* series $Y_t$ is an ARIMA(1,1,1) stochastic trend. In the long run, $Y_t = Y_{t-1} + \text{shocks}$, meaning the mean changes over time and variance grows to infinity.

---

## Stationarity Tests Reference Table

| Test | Null Hypothesis ($H_0$) | Alt Hypothesis ($H_1$) | Reject $H_0$ Means | Robustness / Specialty |
|---|---|---|---|---|
| **ADF** | Non-Stationary (Unit Root) | Stationary | **Stationary** ✅ | Standard test; assumes homoscedastic errors. |
| **KPSS** | Stationary (Mean/Trend) | Non-Stationary | **Non-Stationary** ❌ | Reverses the null. Use in tandem with ADF to confirm. |
| **PP** | Non-Stationary (Unit Root) | Stationary | **Stationary** ✅ | Robust to heteroscedasticity and autocorrelation. |
| **Variance Ratio** | Random Walk (Non-Stationary) | Stationary | **Stationary** (Not RW) ✅ | Specifically tests if asset returns follow a random walk. |

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 11: Unit Root Diagnostic Pipeline** — Before running any statistical modeling on post-event returns or raw filing volumes, route the series through a dual test pipeline (**ADF + KPSS**). If ADF rejects the unit root and KPSS fails to reject non-stationarity, the series is verified stationary.
- **Verdict**: **Pursue** — The ADF/KPSS dual verification is critical for validating the stationarity assumption of abnormal returns before computing event-study statistics.

---

## Open questions

- In Python's `statsmodels`, how do we handle the fact that ADF (`adfuller`) and KPSS (`kpss`) have opposite null hypotheses? (We must write a wrapper that checks both: a series is clean if ADF p-value < 0.05 AND KPSS p-value > 0.05).
- If returns fail the PP test, does that indicate the presence of volatility clustering (GARCH effects) rather than a simple unit root?
