---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=F2cfr1qhDY8
source_type: video
duration: ~28m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, smoothing, moving-average, SMA, EMA, parameter-optimization]
status: distilled
---

# Ep 24 — Smoothing Techniques (SMA, EMA)

> **Why Lijo watched this**: To understand how Simple Moving Average (SMA) and Exponential Moving Average (EMA) smooth out noise in a time series to reveal trends, and how to optimize the smoothing parameter alpha using MSE/RMSE.

---

## ⏱ Worth watching? SKIM

Verdict: **SKIM**

This lecture is a straightforward introduction to SMA and EMA. If you are already familiar with how simple and exponential moving averages work, you can skip the introduction and watch **11:42 to 19:50** for the comparison of SMA vs. EMA weighting structures, and **24:28 to 28:00** for the systematic grid-search approach to optimizing the smoothing parameter ($\alpha$).

---

## What this episode is actually about (ELI12)

Imagine a jagged stock price chart that jumps up and down like crazy every single day. The overall trend might be going up, but the day-to-day noise makes it hard to see. Smoothing is like dragging a soft brush over the jagged line to round off the sharp spikes, creating a smoother curve that reveals the true underlying trend.

We can do this in two primary ways:
1. **Simple Moving Average (SMA)**: Take the last few days (say 10 days) and average them equally. If you average over a small window (10 days), the line stays close to the price. If you average over a huge window (200 days), you get a very smooth line, but it reacts slowly (lags) to sudden changes.
2. **Exponential Moving Average (EMA)**: Instead of treating all past days equally, give the most weight to yesterday, slightly less to the day before, and exponentially less as you go back. This keeps the line responsive to recent events while still filtering out random noise.

To find the perfect balance (smoothing parameter $\alpha$), we run simulations using different values between 0 and 1, and pick the one that gives the lowest average squared error (MSE) compared to the actual data.

---

## Key concepts introduced

- **Smoothing** — The process of filtering out random fluctuations (noise) from time series data to make the underlying trend or pattern easier to see. Matters because it helps build cleaner and more responsive forecasting models.
- **Simple Moving Average (SMA)** — A smoothing method that computes the simple arithmetic mean of the last $K$ observations. Matters because it serves as the simplest baseline for trend-following and noise reduction.
- **Exponential Moving Average (EMA)** — A recursive smoothing method that assigns exponentially decaying weights to past observations. Matters because it prioritizes recent information, making it more responsive to shifts than SMA.
- **Smoothing Factor ($\alpha$)** — The weight parameter in EMA (between 0 and 1) that controls the trade-off between smoothing and responsiveness. Matters because tuning $\alpha$ allows custom configuration of model memory.
- **Smoothing Parameter Optimization** — The process of finding the optimal $\alpha$ by testing values from 0.1 to 0.99 and selecting the one that minimizes the mean squared error (MSE). Matters because it ensures the model is empirically tuned to the historical data.

---

## Mathematical Formulation

### Simple Moving Average (SMA)
For a window of size $K$:

$$S_t = \frac{1}{K} \sum_{i=0}^{K-1} Y_{t-i}$$

*   **Window Size ($K$)**: Larger $K$ yields smoother lines but introduces significant lag. Smaller $K$ tracks the actual price closely but retains noise.

### Exponential Moving Average (EMA)
Given a smoothing parameter $\alpha \in (0, 1]$:
*   **Starting value**: $S_0 = Y_0$
*   **Recursive formula**:

    $$S_t = \alpha Y_t + (1 - \alpha) S_{t-1}$$

*   **One-Step-Ahead Forecast**:

    $$\hat{Y}_{t+1} = S_t = \alpha Y_t + (1 - \alpha) \hat{Y}_t$$

*   **Expansion (Recursive Substitution)**:
    By expanding the recurrence relation, we see that the forecast is an exponentially weighted sum of all past observations:

    $$\hat{Y}_{t+1} = \alpha \sum_{j=0}^{t-1} (1-\alpha)^j Y_{t-j} + (1-\alpha)^t S_0$$

    This expansion mathematically proves that weights decay exponentially at a rate of $(1-\alpha)^j$ as we move further into the past.

### Optimization of $\alpha$
To avoid picking an arbitrary $\alpha$, evaluate the model across a grid search of $\alpha \in [0.1, 0.99]$:
1. Fit the EMA model for each candidate $\alpha$.
2. Calculate the Mean Squared Error (MSE) or Root Mean Squared Error (RMSE) of the forecasts.
3. Select the $\alpha$ that minimizes the error.

*Example*: For Google's historical stock price, the empirical optimal value was found to be $\alpha \approx 0.67$.

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 18: Adaptive EMA for Event Return Diagnostics** — Instead of a simple lookback window for estimating baseline returns around corporate filings, implement an EMA with an optimized $\alpha$ (using grid search on pre-event windows). This will provide a more responsive, noise-filtered estimation of expected returns compared to standard rolling means.
- **Verdict**: **Pursue** — Tuning $\alpha$ empirically rather than using static SMA windows (like a 20-day simple average) will reduce model lag and improve abnormal return signal estimation accuracy.

---

## Open questions

- How does double exponential smoothing (Holt's Method) handle trends, and can it capture local momentum changes in financial markets better than single EMA?
- Does Python's `statsmodels.tsa.api.SimpleExpSmoothing` automate the grid-search optimization of $\alpha$ out of the box? (Yes, it uses maximum likelihood or sum-of-squares optimization to estimate $\alpha$ automatically).
