---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=6oaiHNnW5l4
source_type: video
duration: ~29m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, smoothing, holt-method, holt-winters, additive-seasonality, multiplicative-seasonality, parameter-estimation]
status: distilled
---

# Ep 25 — Double and Triple Exponential Smoothing (Holt-Winters)

> **Why Lijo watched this**: To learn how Holt's method (double exponential smoothing) models linear trends, how Holt-Winters (triple exponential smoothing) models both trends and seasonality, and the crucial distinction between additive and multiplicative seasonality.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This is an essential conceptual lecture. Watch **02:28 to 07:06** for the mathematical equations and parameters ($\alpha, \beta$) behind Holt's double exponential smoothing. Watch **07:07 to 14:00** for the progression to Holt-Winters triple exponential smoothing and its parameters ($\alpha, \beta, \gamma$). Watch **14:01 to 18:23** for the critical visual and conceptual differences between additive and multiplicative seasonality. Finally, watch **22:20 to 29:00** to see how ignoring seasonality in a trend-heavy series (Holt's) results in a flat linear forecast, whereas Holt-Winters successfully project seasonal waves.

---

## What this episode is actually about (ELI12)

If your data is not just flat and noisy, but is actually climbing over time, single exponential smoothing (EMA) fails because it is always "lagging behind" the trend. 

To fix this, we upgrade our model step-by-step:
1. **Double Exponential Smoothing (Holt's Method)**: We track two things instead of one: the level (smooth value) and the **trend** (the slope or rate of climb). We use a new parameter, $\beta$, to control how quickly the model adapts to slope changes. This is great for data with a clear trend but no seasonal waves.
2. **Triple Exponential Smoothing (Holt-Winters Method)**: If the data also has seasonal waves (like air travel peaking every December), we add a third component: **seasonality**. We use a third parameter, $\gamma$, to smooth out the seasonal effects.

### The Two Types of Seasonality
*   **Additive (Plus)**: The seasonal peak is a fixed amount. For example, if you sell exactly 100 extra toys every December, no matter if your business is small or large. The size of the seasonal waves stays the same over time.
*   **Multiplicative (Times)**: The seasonal peak is a percentage. For example, if your sales double every December. As your business grows, the size of the December spike gets larger and larger.

---

## Key concepts introduced

- **Double Exponential Smoothing (Holt's Method)** — An extension of exponential smoothing that incorporates a linear trend component using a trend-smoothing factor ($\beta$). Matters because it allows forecasting trend-based series without lagging.
- **Triple Exponential Smoothing (Holt-Winters)** — An extension that incorporates both trend and seasonal components using three smoothing factors ($\alpha, \beta, \gamma$). Matters because it can model and forecast series with complex, recurring seasonal cycles.
- **Additive Seasonality** — A model structure where seasonal fluctuations are added to the trend, meaning the magnitude of seasonal variations remains constant regardless of the trend level. Matters because it fits data with stable seasonal variance.
- **Multiplicative Seasonality** — A model structure where seasonal fluctuations are multiplied by the trend, meaning the magnitude of seasonal variations increases or decreases in proportion to the trend level. Matters because it fits most economic/financial data where variance scales with level.
- **Trend Smoothing Factor ($\beta$)** — The parameter controlling how quickly the model updates its estimate of the series' slope.
- **Seasonal Smoothing Factor ($\gamma$)** — The parameter controlling how quickly the model updates its seasonal indices.

---

## Mathematical Formulations

### 1. Double Exponential Smoothing (Holt's Method)
For series with trend but no seasonality:
*   **Level Equation**: 
    $$S_t = \alpha Y_t + (1 - \alpha)(S_{t-1} + B_{t-1})$$
*   **Trend Equation**: 
    $$B_t = \beta(S_t - S_{t-1}) + (1 - \beta)B_{t-1}$$
*   **$h$-Step-Ahead Forecast**: 
    $$\hat{Y}_{t+h} = S_t + h B_t$$

### 2. Triple Exponential Smoothing (Holt-Winters)
Let $L$ be the length of the seasonal cycle (e.g., $L=12$ for monthly).

#### Multiplicative Seasonal Model (Variance scales with level)
*   **Level**: 
    $$S_t = \alpha \frac{Y_t}{C_{t-L}} + (1 - \alpha)(S_{t-1} + B_{t-1})$$
*   **Trend**: 
    $$B_t = \beta(S_t - S_{t-1}) + (1 - \beta)B_{t-1}$$
*   **Seasonal**: 
    $$C_t = \gamma \frac{Y_t}{S_t} + (1 - \gamma)C_{t-L}$$
*   **$h$-Step-Ahead Forecast**: 
    $$\hat{Y}_{t+h} = (S_t + h B_t) C_{t-L+h}$$

#### Additive Seasonal Model (Constant variance)
*   **Level**: 
    $$S_t = \alpha(Y_t - C_{t-L}) + (1 - \alpha)(S_{t-1} + B_{t-1})$$
*   **Trend**: 
    $$B_t = \beta(S_t - S_{t-1}) + (1 - \beta)B_{t-1}$$
*   **Seasonal**: 
    $$C_t = \gamma(Y_t - S_{t-1} - B_{t-1}) + (1 - \gamma)C_{t-L}$$
*   **$h$-Step-Ahead Forecast**: 
    $$\hat{Y}_{t+h} = S_t + h B_t + C_{t-L+h}$$

---

## Empirical Case Study: Monthly Air Passengers

The historical air passenger dataset contains:
1. An upward linear trend.
2. A strong annual seasonal pattern ($L=12$).
3. **Changing variance** (the seasonal peaks grow larger as the baseline increases $\to$ Multiplicative seasonality).

### Holt's Method (Without Seasonality: `gamma = FALSE`)
*   **Estimates**: $\alpha = 1.0$, $\beta = 0.0321$, $\gamma = \text{FALSE}$.
*   **Result**: The model completely ignores seasonal peaks. The out-of-sample forecast is a flat, straight line projecting the upward trend.

### Holt-Winters Method (With Trend and Additive Seasonality)
*   **Estimates**: $\alpha = 0.3266$, $\beta = 0.0057$, $\gamma = 0.8206$.
*   **Result**: The out-of-sample forecast successfully projects seasonal waves that mimic historical peaks and troughs.

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 19: Holt-Winters Modeling for Volume & Liquidity Baselines** — Volume and bid-ask spreads around corporate events display both trend patterns (pre-event build-up) and seasonal intraday/weekly cycles. Implement a Holt-Winters multiplicative smoothing model (with intraday seasonality, e.g., $L=13$ for half-hour bars) to forecast baseline volume and detect volume spikes.
- **Verdict**: **Pursue** — Holt-Winters is highly suitable for volume/liquidity forecasting. Unlike asset prices, volume displays clear cyclical seasonality and its variance scales with the overall activity level (multiplicative), making this a robust detector for abnormal event-driven trading.

---

## Open questions

- How does Holt-Winters compare to Seasonal ARIMA (SARIMA) in terms of out-of-sample volume forecasting accuracy?
- Can Holt-Winters handle series with multiple seasonal cycles (e.g., daily and weekly cycles combined)? (Standard Holt-Winters handles only one cycle; for multiple cycles, we need TBATS or double seasonal Holt-Winters).
