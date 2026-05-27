---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=8utlWb3ffSE
source_type: video
duration: ~27m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, volatility-modelling, conditional-variance, leverage-effect, heteroscedasticity, vix]
status: distilled
---

# Ep 46 — Stochastic Volatility Modelling

> **Why Lijo watched this**: To transition from mean-focused modeling (ARIMA) to variance-focused modeling, understand the difference between conditional and unconditional variance, learn the stylized facts of financial asset returns, and distinguish between different types of volatility.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture provides a foundational overview of volatility dynamics in financial time series. Focus on **2:00 to 5:30** to understand the fundamental shift from modeling the mean of a series to modeling its conditional variance. Watch **8:45 to 12:00** for an explanation of the core empirical properties of volatility (clustering, continuity, stationarity, and the leverage effect). The section from **14:50 to 16:20** is also crucial as it defines conditional vs. unconditional variance mathematically.

---

## What this episode is actually about (ELI12)

When we use standard forecasting models (like ARIMA), we are trying to predict the *average path* (the mean) of a stock price or return. We assume the *shaking* (the variance, or risk) around that path is constant and quiet. In reality, markets don't work that way.

Imagine you are driving a car:
-   **Mean Models (ARIMA)** tell you which direction the car is steering.
-   **Volatility Models** tell you how much the car is shaking due to the road surface.

Sometimes you are on a smooth highway, and the shaking is minimal. Other times, you hit a bumpy dirt road, and the car shakes violently. Furthermore, if you hit a pothole, the shaking doesn't stop instantly—it ripples and decays slowly. In finance, this pattern of high-shaking periods sticking together and low-shaking periods sticking together is called **volatility clustering**.

This lecture introduces the math of market shaking. We learn that:
1.  **Heteroscedasticity**: Market shaking (variance) changes over time.
2.  **Heavy Tails**: Extreme market crashes occur far more often than standard bell-curve math predicts.
3.  **Leverage Effect**: Bad news (prices dropping) shakes the market much harder than good news (prices rising).
4.  **Co-movements**: Volatility is contagious—when Bitcoin shakes, Ethereum shakes alongside it.

---

## Key Concepts Introduced

- **Conditional Mean** — The expected value of a time series at time $t$ given all past information. This is what models like ARIMA seek to forecast.
- **Conditional Variance** — The expected uncertainty (or variance) of a time series at time $t$ given its history. It varies dynamically based on the size of recent shocks.
- **Unconditional Variance** — The overall long-run variance of a series, which is assumed to be constant (time-invariant) over the entire time horizon.
- **Heteroscedasticity** — The statistical property of a time series having a non-constant variance over time.
- **Volatility Clustering** — The empirical fact that large shocks are followed by large shocks (of either sign) and small shocks by small shocks, leading to periods of prolonged high or low volatility.
- **Leverage Effect** — The phenomenon where negative price shocks (bad news) lead to a larger increase in future volatility than positive shocks of the same magnitude.
- **Leptokurtosis (Thick Tails)** — A probability distribution property showing fatter tails and higher peak than a standard normal distribution, meaning extreme outliers are much more common.
- **Co-movements / Volatility Spillovers** — The tendency for volatility to be positively correlated across different assets in the same market or across global markets.

---

## Mathematical Formulations

### 1. Conditional vs. Unconditional Variance
Let $\Omega_{t-1}$ represent the information set containing all historical values of the time series up to time $t-1$.

*   **Unconditional Variance (Time-Invariant)**:
    $$\text{Var}(X) = E\left[(X - E[X])^2\right] = \sigma^2$$
    This is constant and does not depend on the history or current state of the series.

*   **Conditional Variance (Time-Varying)**:
    $$\text{Var}(X_t \mid \Omega_{t-1}) = E\left[(X_t - E[X_t \mid \Omega_{t-1}])^2 \;\middle|\; \Omega_{t-1}\right] = \sigma_t^2$$
    This changes at each time step $t$ depending on the historical shock values in $\Omega_{t-1}$.

---

### 2. Stylized Facts of Asset Returns
If asset returns $r_t$ were independent and identically distributed (I.I.D.) normal variables, they would have flat volatility and thin tails. Real returns display:
1.  **Leptokurtosis**: The kurtosis of returns $K > 3$.
2.  **No Correlation in Returns, High Correlation in Squares**: While $r_t$ shows little to no serial correlation, $r_t^2$ (and $|r_t|$) shows high, persistent autocorrelation, demonstrating that volatility has memory.
3.  **Non-Trading Period Effect**: Volatility is typically higher on Mondays compared to other weekdays because information accumulates over the weekend while the market is closed.
4.  **Intraday U-Shape**: Volatility tends to be high near market open and market close, but low in the early afternoon.

---

## Classification of Volatility Types

| Volatility Type | How it is calculated | Key Use Case |
| :--- | :--- | :--- |
| **Historical Volatility** | Calculated as the standard deviation of returns over a rolling window of past historical prices. | Standard backward-looking risk assessment. |
| **Implied Volatility** | Backed out from option pricing models (e.g., Black-Scholes) using current option market prices. | Forward-looking measure representing the market's expectation of future risk. |
| **Realized Volatility** | Estimated by summing squared high-frequency (intraday) returns over a specified daily interval. | Capturing actual daily volatility without relying on daily close-to-close metrics. |
| **Model-Based Volatility** | Modeled using econometric equations that capture volatility clustering (e.g., ARCH, GARCH). | Forecasting future conditional variance and volatility clusters. |

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 36: Cross-Asset Volatility Clustering and Spillover Analysis in Earnings Filing Windows** - Model the conditional variance of stock returns around quarterly earnings announcements. Assess whether a large earnings shock in a sector leader triggers a volatility cluster that spills over to peers. Use the estimated decay rate of this conditional variance cluster to dynamic-size positions and scale option spreads post-announcement.
- **Verdict**: **Pursue** - Modeling conditional variance is essential for pricing and sizing trades around high-impact binary events, where standard homoscedastic models fail to account for expanding risk.

---

## Open questions

- How does the GARCH model mathematically relate past squared return shocks to current conditional variance?
- Can we use implied volatility indexes (like VIX) as exogenous variables ($X$) in GARCH models (GARCH-X) to improve volatility forecasts?
