---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=SNjNLBi-YA8
source_type: video
duration: ~29m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, long-memory, hurst-exponent, RS-analysis, fractional-integration, mean-reversion, momentum]
status: distilled
---

# Ep 29 — Hurst Exponent & R/S Analysis

> **Why Lijo watched this**: To learn the mechanical construction and estimation of the Hurst Exponent ($H$) via Rescaled Range (R/S) Analysis, and to understand how $H$ classifies time series into persistent (trending), anti-persistent (mean-reverting), or random walk regimes.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture provides the classic construction of R/S analysis and its regression formulation. Watch **04:41 to 08:24** for the step-by-step mathematical definition of mean-adjusted partial sums and the adjusted range. Watch **08:25 to 13:43** for the derivation of the log-linear regression model used to estimate $H$ as a slope coefficient. Finally, watch **13:44 to 17:22** and **26:15 to 28:58** for the visual and strategic implications of the $H$ boundaries ($H=0.5$, $H>0.5$, $H<0.5$) in stock markets.

---

## What this episode is actually about (ELI12)

The **Hurst Exponent ($H$)** is a single number between 0 and 1 that tells you whether a time series has a memory, and what kind of memory it is. It was originally created by a British hydrologist named Harold Hurst who was trying to design the perfect dam size on the Nile River by studying years of drought and flood cycles.

To calculate it, we use a method called **Rescaled Range (R/S) Analysis**:
1. Take a series of values and subtract their average to see their daily deviations.
2. Accumulate these deviations over time (partial sums).
3. Look at the peak and trough of these accumulated values, and subtract them to find the "adjusted range" (how far the series wandered from its average).
4. Divide this range by the standard deviation to scale it.
5. If we repeat this for different chunk sizes of the data and plot the results on a log-log chart, the slope of the line we get is the Hurst Exponent ($H$).

### The Three Regimes of $H$:
*   **$H = 0.5$ (The Random Walk)**: The series is completely random like a coin toss. Tomorrow's move is unpredictable.
*   **$0.5 < H < 1.0$ (The Trend/Momentum)**: The series has long memory and is persistent. If it went up yesterday, it is more likely to go up today. Shocks linger.
*   **$0 < H < 0.5$ (The Mean-Reverting rubber band)**: The series is anti-persistent. If it goes up today, it is highly likely to snap back down tomorrow.

---

## Key concepts introduced

- **Hurst Exponent ($H$)** — An index between 0 and 1 that measures the long-range dependence, persistence, or fractal memory of a time series. Matters because it identifies the underlying trading regime of an asset.
- **Rescaled Range (R/S) Analysis** — A statistical method used to calculate the Hurst exponent by analyzing the scale-dependent behavior of a series' range relative to its standard deviation.
- **Mean-Adjusted Partial Sums ($Z_t$)** — The cumulative sum of a series' deviations from its mean up to time $t$. Serves as the core input for calculating the range.
- **Adjusted Range ($R_N$)** — The difference between the maximum and minimum values of the mean-adjusted partial sums over a window of size $N$.
- **Fractional integration relationship** — The mapping between the Hurst exponent and the ARFIMA differencing parameter: $H = d + 0.5$. Matters because it connects physical range scaling to parametric time series modeling.

---

## Mathematical Formulation: Rescaled Range (R/S) Analysis

Let $Y_t$ ($t=1, \dots, N$) be a time series with mean $\bar{Y}_N$ and standard deviation $S_N$.

### Step 1: Cumulative Deviations (Partial Sums)
Calculate the mean-adjusted partial sums $Z_t$ for $t=1, \dots, N$:

$$Z_t = \sum_{i=1}^{t} (Y_i - \bar{Y}_N)$$

*Note*: By definition, the final sum $Z_N = 0$.

### Step 2: Adjusted Range
Calculate the maximum deviation minus the minimum deviation:

$$R_N = \max(Z_1, Z_2, \dots, Z_N) - \min(Z_1, Z_2, \dots, Z_N)$$

### Step 3: Rescaling
Divide the range by the sample standard deviation $S_N$ to obtain the rescaled range:

$$\text{R/S Ratio} = \frac{R_N}{S_N}$$

### Step 4: Hurst's Empirical Law
For large $N$, the expectation of the rescaled range scales as a power law:

$$E\left[\frac{R_N}{S_N}\right] \approx C N^H$$

Taking natural logs of both sides yields a linear regression equation:

$$\log\left(\frac{R_N}{S_N}\right) = \alpha + H \log(N)$$

Where $\alpha = \log(C)$ is the intercept, and $H$ is the OLS slope coefficient (Hurst exponent).

---

## Regime Classification & Strategic Implications

| Value of $H$ | Value of $d$ in ARFIMA | Series Characterization | Financial Implications & Trading Strategy |
|---|---|---|---|
| **$H = 0.5$** | $d = 0$ | **Random Walk / IID Noise** | Efficient Market. Price changes are independent. Grid trading/market making is appropriate; forecasting is useless. |
| **$0.5 < H < 1.0$** | $0 < d < 0.5$ | **Persistent / Long Memory** | **Trending Market**. Strong momentum. Positive returns tend to follow positive returns. Use **Trend-Following** (e.g. moving averages, break-out channels). |
| **$0 < H < 0.5$** | $-0.5 < d < 0$ | **Anti-Persistent** | **Mean Reverting**. High values are followed by low values. Use **Mean-Reversion Strategies** (e.g. pairs trading, RSI overbought/oversold, bollinger band fades). |
| **$H \ge 1.0$** | $d \ge 0.5$ | **Non-Stationary / Infinite Variance** | Highly persistent but unstable. Extreme risks, fat-tailed distribution of changes. |

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 22: Dynamic Regime Switching via Rolling Hurst Exponent** — Calculate a rolling Hurst exponent ($H$) on the returns of an asset (e.g., using a 60-day window). If $H > 0.55$, activate a momentum-based entry strategy (trend-following). If $H < 0.45$, switch the execution logic to a mean-reverting grid strategy (range-bound). If $0.45 \le H \le 0.55$, keep the execution in neutral (efficient market, trade only on large external events).
- **Verdict**: **Pursue** — The Hurst exponent provides a non-parametric, robust regime filter. Implementing it as a pre-trade filter will prevent momentum strategies from losing capital in choppy range-bound markets, and vice-versa.

---

## Open questions

- What is the minimum sample size $N$ required to get a stable OLS estimate of $H$ without noise distortion? (Typically, R/S analysis requires at least $N \ge 100$ to $250$ data points, otherwise small-sample bias inflates the estimate).
- Next lecture covers the estimation of ARFIMA models. How do parametric maximum likelihood estimators for $d$ compare to the non-parametric OLS R/S estimation of $H$?
