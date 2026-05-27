---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=dtBSn016c2g
source_type: video
duration: ~29m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, multivariate, cross-covariance, cross-correlation, vector-white-noise, stationarity]
status: distilled
---

# Ep 33 — Cross-covariance and Cross-correlation

> **Why Lijo watched this**: To understand the mathematical definitions of cross-covariance and cross-correlation in vector processes, their stationarity requirements, their unique asymmetry properties, and the definition of a Vector White Noise process.

---

## ⏱ Worth watching? SKIM

Verdict: **SKIM**

This lecture is theoretical, formalizing notations and definitions. If you already understand random vectors, you can jump straight to **16:00 to 24:00**, which explains the **asymmetry of cross-covariance** ($\gamma_{ij}(l) = \gamma_{ji}(-l)$ or $\Gamma(l) = \Gamma(-l)^T$). This asymmetry is the most important concept in the lecture and a common source of bugs in multi-series analysis. Watch **26:00 to 29:05** for the definition and properties of Vector White Noise.

---

## What this episode is actually about (ELI12)

So far, we have analyzed how a single time series relates to its own past (autocovariance). But when dealing with multiple series, we want to know how one series relates to another series at different points in time. 

For instance, if the price of gold ($Y_{1t}$) changes today, does it affect the price of silver ($Y_{2t}$) two days from now? This lead-lag relationship is measured using **cross-covariance**.

Unlike a single series, where the correlation between today and two days ago is the same as the correlation between today and two days from now, direction matters when comparing *different* series. Gold leading silver by two days is completely different from silver leading gold by two days. Mathematically, if you look backward in time instead of forward, the roles of the two series swap. 

Lastly, the lecture defines **Vector White Noise**—the multivariate equivalent of random, unpredictable errors. In this process, each series is independently random over time, meaning they have no lead or lag effects on one another, although they are allowed to be correlated on the exact same day.

---

## Key concepts introduced

- **Stationary Multivariate Time Series** — A vector process $Y_t$ whose mean vector is constant and whose cross-covariance matrix at lag $l$ depends only on $l$ and not on time $t$. Matters because it ensures the statistical joint relationships between variables are stable over time, enabling reliable estimation.
- **Cross-Covariance Function ($\gamma_{ij}(l)$)** — The covariance between one variable $Y_{it}$ at time $t$ and another variable $Y_{jt}$ at a lagged time $t+l$. Matters because it measures lead-lag linear relationships between different time series.
- **Cross-Covariance Asymmetry** — The property where $\gamma_{ij}(l) = \gamma_{ji}(-l)$, meaning the cross-covariance is generally not symmetric under lag reversal. Matters because the order of variables and the sign of the lag dictate which series is leading and which is lagging.
- **Cross-Correlation Function (CCF)** — The standardized version of cross-covariance, scaled by the square root of the individual variances of the two series at lag 0. Matters because it bounds the relationship between $-1$ and $+1$, making comparison across different scales easy.
- **Vector White Noise** — A vector process of random shocks with a mean of zero, zero cross-covariance for all non-zero lags ($l \ne 0$), and a constant covariance matrix at lag 0. Matters because it represents the unpredictable innovation term in multivariate models like VAR or VMA.

---

## Mathematical Formulations & Properties

### 1. Stationary Multivariate Time Series
Let $Y_t = [Y_{1t}, Y_{2t}, \dots, Y_{Kt}]^T$ represent a $K$-dimensional vector time series.

$Y_t$ is **weakly stationary** (or second-order/covariance stationary) if:
1.  **Constant Mean Vector**:
    $$E[Y_t] = \mu = [\mu_1, \mu_2, \dots, \mu_K]^T \quad \text{(independent of } t\text{)}$$
2.  **Time-Invariant Cross-Covariance Matrix**:
    $$\Gamma(l) = E[(Y_t - \mu)(Y_{t+l} - \mu)^T]$$
    depends only on the lag $l$, and is independent of $t$.

### 2. Autocovariance vs. Cross-Covariance
*   **Autocovariance function** of a single series $Y_{it}$ within the vector:
    $$\gamma_{ii}(l) = \text{Cov}(Y_{it}, Y_{i,t+l}) = E[(Y_{it} - \mu_i)(Y_{i,t+l} - \mu_i)]$$
    Because it is a single series, it is symmetric: $\gamma_{ii}(l) = \gamma_{ii}(-l)$.
*   **Cross-covariance function** between two distinct series $Y_{it}$ and $Y_{jt}$:
    $$\gamma_{ij}(l) = \text{Cov}(Y_{it}, Y_{j,t+l}) = E[(Y_{it} - \mu_i)(Y_{j,t+l} - \mu_j)]$$
    In general, $\gamma_{ij}(l) \ne \gamma_{ij}(-l)$. Instead, reversing the time lag swaps the indices:
    $$\gamma_{ij}(l) = \gamma_{ji}(-l)$$
*   **Matrix Representation**:
    $$\Gamma(l) = \begin{bmatrix} \gamma_{11}(l) & \gamma_{12}(l) & \dots & \gamma_{1K}(l) \\ \gamma_{21}(l) & \gamma_{22}(l) & \dots & \gamma_{2K}(l) \\ \vdots & \vdots & \ddots & \vdots \\ \gamma_{K1}(l) & \gamma_{K2}(l) & \dots & \gamma_{KK}(l) \end{bmatrix}$$
    Due to the asymmetry property, the covariance matrix at lag $l$ is the transpose of the matrix at lag $-l$:
    $$\Gamma(l) = \Gamma(-l)^T$$

### 3. Cross-Correlation Function (CCF)
The cross-correlation between $Y_{it}$ and $Y_{jt}$ at lag $l$ is:
$$\rho_{ij}(l) = \frac{\gamma_{ij}(l)}{\sqrt{\gamma_{ii}(0)\gamma_{jj}(0)}}$$
In matrix form:
$$R(l) = V^{-1/2} \Gamma(l) V^{-1/2}$$
Where $V$ is the diagonal matrix of contemporaneous variances:
$$V = \text{diag}(\gamma_{11}(0), \gamma_{22}(0), \dots, \gamma_{KK}(0))$$
Like cross-covariances, cross-correlations satisfy:
$$\rho_{ij}(l) = \rho_{ji}(-l) \quad \text{and} \quad R(l) = R(-l)^T$$

### 4. Vector White Noise Process
A vector process $E_t = [e_{1t}, e_{2t}, \dots, e_{Kt}]^T$ is a **Vector White Noise** process, denoted $E_t \sim \text{WN}(0, \Sigma)$, if:
1.  $E_t$ is stationary.
2.  $E[E_t] = 0$ (zero mean vector).
3.  The cross-covariance matrices satisfy:
    $$\Gamma(l) = \begin{cases} \Sigma & \text{if } l = 0 \\ 0 & \text{if } l \ne 0 \end{cases}$$
Where $\Sigma$ is a symmetric positive-definite $K \times K$ matrix. The off-diagonals of $\Sigma$ can be non-zero, allowing contemporaneous correlation between shock components at the exact same time step $t$, but there are no dynamic correlations across different time steps ($l \ne 0$).

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 25: Lead-Lag Cross-Correlation Analysis of Macro Filings vs. Volatility Spikes** — Compute the sample cross-correlation function (CCF) between daily volume of corporate regulatory filings (e.g., earnings releases) and subsequent equity index volatility spikes. Identify significant lags to determine if corporate filing activity acts as a leading indicator of volatility.
- **Verdict**: **Pursue** — Quantifying lead-lag relationships via CCF is critical. We must ensure we test whether filing volume leads volatility ($\rho_{\text{filing}, \text{volatility}}(l) > 0$ for $l > 0$) and correctly account for the asymmetry ($\rho_{\text{filing}, \text{volatility}}(l) \ne \rho_{\text{filing}, \text{volatility}}(-l)$).

---

## Open questions

- How do we estimate the sample cross-covariance matrix $\hat{\Gamma}(l)$ and sample cross-correlation matrix $\hat{R}(l)$ from a finite set of observations?
- How do we calculate the confidence intervals for the CCF to determine if a correlation value is statistically significant or just noise? (Usually, this is $\pm 2/\sqrt{T}$ under the assumption of independent series).
- How do we write a vector autoregressive model (VAR) using Vector White Noise as the innovation vector?
