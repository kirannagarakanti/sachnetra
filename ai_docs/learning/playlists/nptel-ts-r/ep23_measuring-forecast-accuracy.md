---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=oKTCg8v_XXI
source_type: video
duration: ~30m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, forecasting, prediction-interval, parsimony, forecast-accuracy, MAE, MAPE, Theil-U]
status: distilled
---

# Ep 23 — Measuring Forecast Accuracy and Prediction Intervals

> **Why Lijo watched this**: To understand the asymptotic limitations of ARMA forecasts, learn how to calculate prediction intervals, evaluate the benefits of parsimony, and master forecast accuracy metrics including Theil's U.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture covers the practical limitations and diagnostic benchmarks of forecasting. Watch **01:41 to 04:20** for the critical explanation of why ARMA models revert to the mean in the long term. Then, focus on **11:23 to 16:00** for the concept of parsimony, and **18:14 to 29:20** for the comparison of error metrics (MSE, MAE, MAPE) and Theil's U statistics.

---

## What this episode is actually about (ELI12)

If you use a time series model (like ARIMA) to forecast far into the future, the model eventually loses its "memory" and just guesses the historical average (the mean). The further out you forecast, the wider your margin of error (the prediction interval) gets. Therefore, ARIMA models are only good for **short-term** guesses.

To measure how good a forecasting model is, we look at its errors (Actual minus Forecast). We calculate:
*   **Average Error (MSE / MAE)**: How far off we are on average.
*   **Systematic Bias (ME)**: Are we constantly guessing too high or too low?
*   **Relative Error (MAPE)**: How far off we are in percentage terms.

Finally, we compare our smart model against a "dumb guess" (the Naive Forecast, which assumes tomorrow will be exactly like today). We use a metric called **Theil's U**. If our model is worse than the naive guess (Theil's $U_2 > 1$), we should throw the model away.

---

## Key concepts introduced

- **Mean Reversion of Forecasts** — The property where the $L$-step-ahead forecast converges to the process mean ($\mu$) as lead time $L \to \infty$.
- **Error Variance Convergence** — The property where the forecast error variance converges to the overall variance of the process ($\gamma_0$) as lead time $L \to \infty$.
- **Prediction Interval (PI)** — An interval within which a future observation is expected to fall with a specified probability (e.g. 95%), accounting for both parameter uncertainty and future random shocks.
- **Naive Forecast** — A baseline forecast that assumes tomorrow's value will be exactly today's actual value ($F_{t+1} = A_t$).
- **Theil's U Statistics** — Standardized metrics used to compare a model's forecast accuracy against a naive forecast.

---

## Prediction Intervals (PI) Formulation

Assuming normally distributed forecast errors, a 95% prediction interval for the $L$-step-ahead value $Y_{n+L}$ is:

$$\hat{Y}_n(L) \pm 1.96 \times \text{SE}(e_n(L))$$

Where the standard error ($\text{SE}$) is the square root of the forecast error variance:
$$\text{SE}(e_n(L)) = \sigma_a \sqrt{\sum_{j=0}^{L-1} \psi_j^2}$$

### One-Step-Ahead ($L=1$) Simplified Interval
For one step ahead, $\psi_0 = 1$, so the interval is:
$$\hat{Y}_n(1) \pm 1.96 \sigma_a$$

---

## Forecast Accuracy Metrics Reference

Let $A_t$ be the actual value and $F_t$ be the forecast value for $t = 1, \dots, N$.

| Metric | Formula | What it Measures / Notes |
|---|---|---|
| **Mean Error (ME)** | $\frac{1}{N} \sum (A_t - F_t)$ | **Systematic Bias**. If $\text{ME} > 0$, the model systematically underforecasts. If $\text{ME} < 0$, it overforecasts. |
| **Mean Squared Error (MSE)** | $\frac{1}{N} \sum (A_t - F_t)^2$ | **Variance of errors**. Heavily penalizes large outlier errors due to squaring. |
| **Mean Absolute Error (MAE)** | $\frac{1}{N} \sum \|A_t - F_t\|$ | **Average error size**. Less sensitive to outliers than MSE. |
| **Mean Absolute Percentage Error (MAPE)** | $\frac{1}{N} \sum \|\frac{A_t - F_t}{A_t}\| \times 100$ | **Relative error**. Expresses accuracy as a percentage, making it easy to explain to non-technical users. |

---

## Benchmark Testing: Theil's U

We compare our model's performance to the **Naive Forecast** using Theil's $U_2$ statistic.

*   **$U_2 < 1$**: The model outperforms the naive guess (Good forecast).
*   **$U_2 = 1$**: The model is identical to a naive guess (No better than raw guessing).
*   **$U_2 > 1$**: The model is worse than a naive guess (The model is generating negative value and should be discarded).

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 17: Backtest Benchmarking via Theil's U** — When backtesting abnormal return forecasts, calculate Theil's $U_2$ against a naive forecast ($F_{t+1} = A_t$) and a zero-mean drift forecast ($F_{t+1} = 0$). Reject any ARIMA model that does not achieve $U_2 < 1$ out-of-sample.
- **Verdict**: **Pursue** — Theil's $U_2$ is a critical verification metric. In financial returns, beating a naive random walk or a zero-drift benchmark is notoriously difficult, making this the primary filter for strategy selection.

---

## Open questions

- Does Python's `statsmodels` provide Theil's U calculations out of the box? (No, we must implement a custom helper function to compute $U_1$ and $U_2$ from actual and forecast arrays).
- Next lecture is on Smoothing Techniques (SMA, EMA). How do these non-parametric models compare to ARIMA in terms of forecast accuracy?
