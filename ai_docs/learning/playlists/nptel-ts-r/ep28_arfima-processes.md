---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=UDY0VtHWALM
source_type: video
duration: ~29m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, long-memory, ARFIMA, fractional-integration, autocovariance, ACF, sterlings-approximation]
status: distilled
---

# Ep 28 — ARFIMA Processes

> **Why Lijo watched this**: To master the mathematical formulation of Auto-Regressive Fractionally Integrated Moving Average (ARFIMA) models, understand fractional differencing via binomial expansions, and learn how the fractional integration parameter $d$ classifies memory types.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture builds the mathematical foundation of fractional integration. Watch **07:39 to 13:00** for the definition of fractionally integrated noise, the backshift operator notation, and the binomial expansion of $(1-B)^{-d}$. Watch **17:04 to 22:30** for the autocovariance and autocorrelation formulations, and how Stirling's approximation simplifies the Gamma functions to show hyperbolic decay. Watch **22:31 to 28:00** for the classification of memory states based on the fractional integration parameter $d$.

---

## What this episode is actually about (ELI12)

In standard models, we difference data using whole numbers. We either don't difference it ($d=0$, stationary), or we subtract yesterday's value once ($d=1$, non-stationary). But what if the truth lies in the middle? What if we could difference the data by a fraction, like $d = 0.25$?

This is what **ARFIMA** does. The "F" stands for **Fractional**. By allowing $d$ to be a decimal (like $0.3$), the model can handle a time series that has a long memory but is still stationary.

To difference by a fraction, we use a math trick called a binomial expansion. It translates the fractional difference into an infinite sum where past shocks are given weights that decay very slowly over time. 

By analyzing the size of $d$, we can classify the system's memory:
*   **$d = 0$**: Short memory (classic ARMA).
*   **$0 < d < 0.5$**: Long memory (the system is stationary, but changes linger for a long time).
*   **$d \ge 0.5$**: Strong memory but non-stationary (the changes linger forever and the system drifts).
*   **$d < 0$**: Intermediate memory (short-lived oscillations).

---

## Key concepts introduced

- **Fractional Integration ($d$)** — A modeling framework where the differencing parameter $d$ is a real number rather than an integer. Matters because it allows modeling long-memory dependencies without forcing the series into a non-stationary unit-root state.
- **Fractionally Integrated Noise (ARFIMA(0, d, 0))** — A baseline long-memory process with no autoregressive or moving average components, where the fractional differencing operator is applied directly to white noise.
- **Fractional Differencing Operator ($(1-B)^d$)** — The operator that differences a series by a fraction $d$. Expanded using the binomial series: $(1-B)^d = \sum_{j=0}^{\infty} (-1)^j \binom{d}{j} B^j$.
- **Gamma Function ($\Gamma(x)$)** — A continuous extension of the factorial function ($\Gamma(x) = (x-1)!$ for positive integers) used to define the coefficients of fractional differencing.
- **Stirling's Approximation** — An approximation for the Gamma function ($\Gamma(x) \approx \sqrt{2\pi} e^{-x} x^{x - 0.5}$ as $x \to \infty$) used to simplify the autocovariance and ACF equations for large lags.

---

## Mathematical Formulation

### 1. The ARFIMA(0, d, 0) Process
Let $Y_t$ be a fractionally integrated noise process:

$$(1 - B)^d Y_t = E_t$$

Where $B$ is the backshift operator ($B Y_t = Y_{t-1}$), $E_t$ is white noise with variance $\sigma_e^2$, and $d \in (-0.5, 0.5)$ is the fractional integration parameter.

### 2. Infinite Expansion representation
By inversion, $Y_t$ can be written as an infinite MA process:

$$Y_t = (1 - B)^{-d} E_t = \sum_{j=0}^{\infty} \eta_j E_{t-j}$$

Where the coefficients $\eta_j$ are defined using Gamma functions:

$$\eta_j = \frac{\Gamma(j + d)}{\Gamma(j + 1) \Gamma(d)}$$

Applying Stirling's approximation as lag $j \to \infty$, these weights decay hyperbolically:

$$\eta_j \approx \frac{j^{d-1}}{\Gamma(d)}$$

### 3. Autocovariance and Autocorrelation (ACF)
The autocovariance at lag $k$ is given by:

$$\gamma_k = \sigma_e^2 \frac{\Gamma(1 - 2d) \Gamma(k + d)}{\Gamma(1 - d) \Gamma(d) \Gamma(k - d + 1)}$$

The variance of the process ($k=0$) is:

$$\gamma_0 = \sigma_e^2 \frac{\Gamma(1 - 2d)}{\Gamma^2(1 - d)}$$

The autocorrelation ($\rho_k$) is:

$$\rho_k = \frac{\gamma_k}{\gamma_0} = \frac{\Gamma(1-d) \Gamma(k+d)}{\Gamma(d) \Gamma(k-d+1)}$$

Applying Stirling's approximation as lag $k \to \infty$:

$$\rho_k \approx \frac{\Gamma(1-d)}{\Gamma(d)} k^{2d-1}$$

This shows that for $0 < d < 0.5$, $\rho_k$ decays hyperbolically (power-law) at a rate of $k^{2d-1}$, which is much slower than the exponential decay of standard ARMA models.

---

## Memory Classification by Differencing Parameter ($d$)

The behavior of the ARFIMA(p, d, q) process is determined by the value of $d$:

| Value of $d$ | Memory Classification | Stationarity / Properties |
|---|---|---|
| **$d = 0$** | **Short Memory** | Stationary & Invertible (Classic ARMA). ACF decays exponentially. |
| **$d = 1$** | **Unit Root** | Non-stationary (Classic ARIMA). Requires integer differencing. |
| **$0 < d < 0.5$** | **Long Memory** | Stationary & Invertible. ACF decays slowly (hyperbolic). Sum of ACF is infinite ($\sum |\rho_k| = \infty$). |
| **$-0.5 < d < 0$** | **Intermediate Memory** | Stationary & Invertible. Negative autocorrelations. Sum of ACF is finite. |
| **$d \ge 0.5$** | **Strong Persistence** | **Non-stationary**. The process is still persistent but has infinite variance. |

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 21: Fractional Integration (ARFIMA) vs. Integer Differencing (ARIMA) for Volatility Baselines** — Standard volatility models (like GARCH) assume short-memory shocks. Fit an ARFIMA(0, d, 0) to log-realized volatility post-earnings announcements. Estimate $d$ to determine if the post-filing volatility is fractionally integrated. If $0 < d < 0.5$, use ARFIMA to forecast the decay of volatility spikes instead of standard integer differencing (which over-corrects) or simple ARMA (which decays too fast).
- **Verdict**: **Pursue** — Fractional differencing preserves the long-memory properties of volatility shocks better than integer differencing, which will lead to more accurate pricing of options or variance swaps post-events.

---

## Open questions

- How do we calculate the Hurst exponent ($H$) from the estimated $d$, and does $H = d + 0.5$ hold true for all financial volatility series? (Yes, mathematically for a fractionally integrated process, $H = d + 0.5$).
- How is the fractional integration parameter $d$ estimated from empirical data? (This will be covered in the next lecture on Hurst Exponent and ARFIMA estimation).
