---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=DRjybZLNFS4
source_type: video
duration: ~30m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, seasonality, SARIMA, differencing, multi-step-model]
status: distilled
---

# Ep 15 — Seasonality and the SARIMA Model

> **Why Lijo watched this**: To understand the mathematical formulation of the Seasonal ARIMA (SARIMA) model and how seasonal and non-seasonal components combine multiplicatively.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture formally defines the complete SARIMA equation. Skip the intro revision (first 4 minutes). Watch **04:33 to 12:01** for the three types of seasonality (deterministic, stationary-evolving, and random-walk-evolving) and **14:20 to 23:10** to understand the multiplicative backshift operators. 

---

## What this episode is actually about (ELI12)

If ARIMA is a tool that removes simple upward/downward trends, SARIMA is the upgrade that removes both trends AND repeating seasonal patterns (like quarterly or annual cycles) at the same time.

It does this by multiplying two different models together:
1. A **regular model** that looks at what happened yesterday or the day before ($t-1, t-2$).
2. A **seasonal model** that looks at what happened exactly one cycle ago (e.g., $t-12$ or $t-24$ for monthly data).

By separating these two forces, SARIMA can forecast data that is growing over the long term but still fluctuates predictably throughout the year.

---

## Key concepts introduced

- **Deterministic Seasonality** — A pattern where the seasonal component is exactly identical year-after-year ($S_t = S_{t-s}$). Matters because it can be modeled as a fixed seasonal constant.
- **Stationary-Evolving Seasonality** — A pattern where the seasonal component changes slightly over time, but fluctuates around a constant mean ($S_t = \mu_s + v_t$, where $v_t$ is stationary).
- **Non-Stationary/Random-Walk Seasonality** — A pattern where the seasonal component drifts randomly over time as a seasonal random walk ($S_t = S_{t-s} + v_t$). Matters because it requires seasonal differencing ($D \ge 1$) to achieve stationarity.
- **Multiplicative SARIMA Model** — A model that multiplies regular AR/MA lag operators by seasonal AR/MA lag operators to handle interactions between short-term noise and seasonal cycles. Written as $\text{SARIMA}(p, d, q) \times (P, D, Q)_s$.

---

## The Three Seasonality Types & How to Correct Them

No matter how seasonality behaves, applying appropriate **seasonal differencing** (subtracting the value from one full cycle ago) achieves stationarity:

$$\nabla_s Y_t = Y_t - Y_{t-s} = (1 - B^s)Y_t$$

Where:
*   $s = 12$ for monthly cycles (e.g., temperatures)
*   $s = 4$ for quarterly cycles (e.g., corporate filing volumes)
*   $s = 52$ for weekly cycles

---

## SARIMA Mathematical Formulation

To build a SARIMA model, we first difference the raw series $Y_t$ into a stationary series $Z_t$:

$$Z_t = \nabla^d \nabla_s^D Y_t = (1-B)^d (1-B^s)^D Y_t$$

Where:
*   $d$ = number of regular differences (removes trend)
*   $D$ = number of seasonal differences (removes seasonal drift)

Then, we fit the multiplicative autoregressive and moving average operators:

$$\Phi_P(B^s) \phi_p(B) Z_t = \Theta_Q(B^s) \theta_q(B) \varepsilon_t$$

Expanding the operators:
*   **Regular AR**: $\phi_p(B) = 1 - \phi_1 B - \dots - \phi_p B^p$
*   **Seasonal AR**: $\Phi_P(B^s) = 1 - \Phi_1 B^s - \dots - \Phi_P B^{P s}$
*   **Regular MA**: $\theta_q(B) = 1 + \theta_1 B + \dots + \theta_q B^q$
*   **Seasonal MA**: $\Theta_Q(B^s) = 1 + \Theta_1 B^s + \dots + \Theta_Q B^{Q s}$

---

## Pros and Cons of SARIMA

### Pros:
1. **Parsimony**: Uses relatively few parameters ($\phi, \Phi, \theta, \Theta$) to capture complex trend-and-seasonal structures, avoiding overfitting.
2. **Interpretability**: Distinctly separates short-term momentum (regular AR/MA) from long-term calendar patterns (seasonal AR/MA).

### Cons:
1. **Complexity in Parameter Estimation**: As orders ($p, q, P, Q$) increase, numerical optimization becomes highly non-linear and computationally expensive.
2. **Data-Hungry**: Requires a significant volume of historical data. For monthly seasonality ($s=12$), 3 years of data (only 3 complete cycles) is rarely enough to fit a robust model.

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 12: Quarterly Filing Volume Forecasting (SARIMA)** — Predict the weekly/monthly volume of corporate filings using a $\text{SARIMA}(p, 1, q) \times (P, 1, Q)_4$ model (or $_12$ for monthly). This serves as a dynamic baseline for finding "filing clusters" (unusually high volumes that signal market-wide events).
- **Verdict**: **Pursue** — Multiplicative SARIMA is the mathematically correct baseline model for forecasting seasonal corporate events (like earnings filing seasons).

---

## Open questions

- In Python's `statsmodels.tsa.statespace.sarimax.SARIMAX`, does the parameter estimation handle non-stationary seasonality reliably if we set $D=1$?
- How do the ACF and PACF plots look for a SARIMA process? (They exhibit spikes at seasonal lags, e.g., multiples of 12 or 4, which we will likely study in the next video).
