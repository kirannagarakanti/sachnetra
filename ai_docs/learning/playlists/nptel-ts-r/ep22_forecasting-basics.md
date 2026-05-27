---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=xLT181rEvY8
source_type: video
duration: ~30m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, forecasting, MMSE, conditional-expectation, infinite-MA, random-shock]
status: distilled
---

# Ep 22 — Forecasting Basics and Minimum MSE Forecasts

> **Why Lijo watched this**: To clarify the distinction between estimation, prediction, and forecasting, and to understand the mathematical derivation of Minimum Mean Squared Error (MMSE) forecasts using conditional expectations.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This is the foundational lecture for the forecasting phase of the course. Watch **02:10 to 07:22** for the clear terminology breakdown (estimation vs. prediction vs. forecasting) with an AR(1) example. Then, watch **12:00 to 25:00** to master how the conditional expectation is evaluated on the infinite MA (random shock) form to yield the MMSE forecast and its error variance.

---

## What this episode is actually about (ELI12)

This video teaches how to make optimal guesses about the future. The professor explains three terms that people often confuse:
1. **Estimation**: Finding the unknown rules/settings of our system (like finding the slope $\phi$ of a trend line).
2. **Prediction**: Filling in missing values *inside* our history using those estimated rules.
3. **Forecasting**: Projecting values *outside* our history into the future where we have no observations.

To make the best forecast, we try to minimize our squared mistakes (Mean Squared Error). The mathematically optimal forecast is the "conditional expectation"—which means looking at all the history we have and calculating the mathematical average of what should happen next. 

Any future random shock that hasn't happened yet is assumed to average out to zero, while past shocks are treated as known facts.

---

## Key concepts introduced

- **Forecast Origin ($n$)** — The last time point for which we have observed data.
- **Lead Time / Horizon ($L$)** — The number of steps into the future we want to forecast (e.g., $L=1$ for tomorrow, $L=2$ for the day after).
- **Minimum Mean Squared Error (MMSE) Forecast** — The forecast $\hat{Y}_n(L)$ that minimizes $E[(Y_{n+L} - \hat{Y}_n(L))^2]$. It is equal to the conditional expectation: $E[Y_{n+L} \mid Y_n, \dots, Y_1]$.
- **Random Shock Form (Infinite MA)** — Re-writing an ARMA process as a weighted sum of infinite past white noise shocks: $Y_t = \mu + \sum_{j=0}^\infty \psi_j a_{t-j}$ (where $\psi_0 = 1$).
- **Forecast Error ($e_n(L)$)** — The difference between the actual future value and our forecast: $e_n(L) = Y_{n+L} - \hat{Y}_n(L)$.

---

## Terminology Breakdown (AR(1) Example)

For the process $Y_t = \phi Y_{t-1} + a_t$:

1. **Estimation**: Finding the coefficient $\hat{\phi}$ using historical sample data.
2. **Prediction**: Calculating in-sample values: $\hat{Y}_t = \hat{\phi} Y_{t-1}$.
3. **Forecasting**: Projecting out-of-sample: $\hat{Y}_n(1) = \hat{\phi} Y_n$.

*Note on Notation*: In forecasting literature, the raw white noise error terms in the model are written as $a_t$, reserving $e_n(L)$ exclusively to denote the out-of-sample **forecast error** at horizon $L$.

---

## Evaluating the MMSE Forecast

We write the future value $Y_{n+L}$ in its random shock form:
$$Y_{n+L} = \text{constant} + (a_{n+L} + \psi_1 a_{n+L-1} + \dots + \psi_{L-1} a_{n+1}) + (\psi_L a_n + \psi_{L+1} a_{n-1} + \dots)$$

Taking the conditional expectation $E[Y_{n+L} \mid Y_n, \dots, Y_1]$:
1. **Future Shocks** ($a_{n+j}$ for $j > 0$): Since they have not happened yet, they are independent of our history and their expected value is **zero** ($E[a_{n+j} \mid \text{history}] = 0$).
2. **Past/Current Shocks** ($a_{n-j}$ for $j \ge 0$): Since they have already occurred, they are fully determined by our history and their expected value is the **shock itself** ($E[a_{n-j} \mid \text{history}] = a_{n-j}$).

Thus, the optimal forecast is:
$$\hat{Y}_n(L) = \text{constant} + \psi_L a_n + \psi_{L+1} a_{n-1} + \dots$$

---

## Forecast Error Properties

Subtracting the forecast from the actual future value yields the forecast error:
$$e_n(L) = Y_{n+L} - \hat{Y}_n(L) = \sum_{j=0}^{L-1} \psi_j a_{n+L-j}$$

*   **Expected Error**: $E[e_n(L)] = 0$ (the forecast is unbiased).
*   **Error Variance**:
    $$\text{Var}(e_n(L)) = \sigma_a^2 \sum_{j=0}^{L-1} \psi_j^2$$
    As the lead time $L$ increases, the variance of our forecast error grows because we accumulate more unknown future shocks.

### Visual Walkthrough of Horizons
*   **One-Step-Ahead ($L=1$)**:
    *   Error: $e_n(1) = a_{n+1}$
    *   Variance: $\text{Var}(e_n(1)) = \sigma_a^2$
*   **Two-Step-Ahead ($L=2$)**:
    *   Error: $e_n(2) = a_{n+2} + \psi_1 a_{n+1}$
    *   Variance: $\text{Var}(e_n(2)) = \sigma_a^2(1 + \psi_1^2)$

---

## So what for SachNetra?

- **Experiments**: None. (Basic theoretical derivation).
- **Verdict**: **Pursue** — The definition of L-step-ahead forecast error variance is the exact mathematical foundation used to build confidence intervals (standard error bands) around forecast returns in event studies.

---

## Open questions

- How do we calculate the $\psi_j$ weights in practice for a complex $\text{ARMA}(p,q)$ model to compute the forecast variance? (They are calculated recursively from the $\phi$ and $\theta$ parameters, which we will likely see in the next lecture).
