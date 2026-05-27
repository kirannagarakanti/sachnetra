---
date: 2026-05-26
source_url: https://youtube.com/watch?v=5PECqXrRbM0
source_type: video
duration: ~29m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, multivariate, linear-filter, wold-representation, varma, var, vma, autocovariance]
status: distilled
---

# Ep 34 — Some Specific Multivariate Time Series Models

> **Why Lijo watched this**: To learn how multivariate linear filters operate, study the Wold decomposition of vector processes, define the Vector Autoregressive Moving Average (VARMA) framework, and derive the stationarity, invertibility, and cross-covariance properties of Vector Moving Average (VMA) systems.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture bridges the gap between univariate ARMA theory and practical multivariate modeling. The first half (**3:30 to 11:10**) defines multivariate linear filters and their stability conditions. The second half (**11:15 to 21:55**) is critical: it defines the VAR, VMA, and VARMA models and shows how to determine their stationarity by evaluating the determinant of the AR matrix polynomial. Finally, **25:35 to 29:03** derives the autocovariance matrix structure of a VMA(1) process, demonstrating how the classic MA cut-off behavior translates to matrices.

---

## What this episode is actually about (ELI12)

If we want to build models that relate multiple time series together, we need to understand how "filters" process information. Imagine you have multiple inputs (like raw material costs, interest rates, and consumer confidence) and you run them through a system to get multiple outputs (like company sales and stock price). A **Linear Filter** is just a mathematical box that takes these inputs, weights them, and combines them to produce the outputs.

Just as we decomposed a single time series into a sum of past random shocks (Wold's theorem), we can do the exact same thing for a group of time series. Any stationary group of time series can be represented as an infinite sum of past vector shocks. This is called the **Vector Wold Representation**.

Using this, we define the **VARMA** family:
- **Vector Autoregression (VAR)**: Today's values depend on yesterday's values of *all* series in the group.
- **Vector Moving Average (VMA)**: Today's values depend on today's and yesterday's random shocks across *all* series.
- **VARMA**: A combination of both.

We also show how a VMA(1) process has a very clean signature: its cross-covariance matrices drop to zero for any lag greater than 1. This means that shocks in one series only influence other series for exactly one day before their memory is completely wiped.

---

## Key concepts introduced

- **Multivariate Linear Filter** — A time-invariant system that maps an $R$-dimensional input vector series $X_t$ to a $K$-dimensional output vector series $Y_t$ using a sequence of matrix weights $\Psi_j$. Matters because it is the fundamental mathematical operator used to build multi-series models.
- **Causal / Physically Realizable Filter** — A filter where the output $Y_t$ depends only on current and past values of $X_t$ (i.e., $\Psi_j = 0$ for all $j < 0$). Matters because it ensures the model does not require future data to predict the present.
- **Stable Filter** — A filter where the sum of the norms of the weight matrices is finite ($\sum \|\Psi_j\| < \infty$). Matters because it guarantees that the output process has finite variance and remains stationary if the input is stationary.
- **Vector Wold Representation** — The theorem stating that any weakly stationary vector process can be written as an infinite Vector Moving Average (VMA($\infty$)) process driven by Vector White Noise. Matters because it justifies using VMA and VAR models as general approximations for stationary vector data.
- **VARMA($p, q$)** — Vector Autoregressive Moving Average process of order $p$ and $q$. Matters because it generalizes univariate ARMA, allowing feedback loops and cross-series lagged dependencies.
- **VMA Cut-off Property** — The property where the cross-covariance matrices $\Gamma(l)$ of a VMA($q$) process are exactly zero matrices for all lags $l > q$. Matters because it provides a clear visual diagnostic to identify VMA orders from sample cross-correlation plots.

---

## Mathematical Formulations & Properties

### 1. Multivariate Linear Filtering
Let $X_t$ be an $R \times 1$ input series and $Y_t$ be a $K \times 1$ output series:
$$Y_t = \sum_{j=-\infty}^{\infty} \Psi_j X_{t-j}$$
Where $\Psi_j$ are $K \times R$ coefficient matrices.
*   **Causality**: The filter is causal if $\Psi_j = 0$ for all $j < 0$, giving:
    $$Y_t = \sum_{j=0}^{\infty} \Psi_j X_{t-j}$$
*   **Stability**: The filter is stable if:
    $$\sum_{j=0}^{\infty} \|\Psi_j\| < \infty \quad \text{where } \|\Psi_j\| = \sqrt{\text{Tr}(\Psi_j^T \Psi_j)} \text{ (Frobenius norm)}$$
*   **Output Covariance**: If $X_t$ is stationary with covariance matrix $\Gamma_X(l)$, then the stationary output $Y_t$ has covariance matrix:
    $$\Gamma_Y(l) = \sum_{j=-\infty}^{\infty} \sum_{k=-\infty}^{\infty} \Psi_j \Gamma_X(l + j - k) \Psi_k^T$$

### 2. Multivariate Wold Representation
Any K-dimensional weakly stationary vector process $Y_t$ can be written as:
$$Y_t - \mu = \sum_{j=0}^{\infty} \Psi_j E_{t-j} = \Psi(B) E_t$$
Where:
- $E_t \sim \text{WN}(0, \Sigma)$ is $K \times 1$ vector white noise.
- $\Psi_0 = I_K$ (identity matrix).
- The coefficient matrices are square $K \times K$ and satisfy $\sum_{j=0}^{\infty} \|\Psi_j\|^2 < \infty$.
- $\Psi(B) = \sum_{j=0}^{\infty} \Psi_j B^j$ is the matrix backshift operator.

### 3. The VARMA($p, q$) Model
$$\Phi(B)(Y_t - \mu) = \Theta(B) E_t$$
Where:
- $\Phi(B) = I_K - \Phi_1 B - \dots - \Phi_p B^p$
- $\Theta(B) = I_K - \Theta_1 B - \dots - \Theta_q B^q$
- $\Phi_i, \Theta_j$ are $K \times K$ coefficient matrices.

#### Special Cases:
1.  **Vector Autoregression (VAR($p$))**: When $q=0$:
    $$(I_K - \Phi_1 B - \dots - \Phi_p B^p)(Y_t - \mu) = E_t$$
2.  **Vector Moving Average (VMA($q$))**: When $p=0$:
    $$Y_t - \mu = (I_K - \Theta_1 B - \dots - \Theta_q B^q) E_t$$

### 4. Stationarity Condition for VARMA
A VARMA process is stationary if the roots of the autoregressive determinant equation lie outside the unit circle:
$$\det(\Phi(z)) = 0 \implies |z| > 1$$
This ensures that the matrix inverse $\Phi(B)^{-1} = \frac{\text{adj}(\Phi(B))}{\det(\Phi(B))}$ is a stable filter, allowing the process to be written as a convergent VMA($\infty$):
$$Y_t - \mu = \Phi(B)^{-1} \Theta(B) E_t = \Psi(B) E_t$$

### 5. Invertibility Condition for VMA(1)
A VMA(1) process:
$$Y_t = E_t - \Theta_1 E_{t-1}$$
can be represented as an infinite-order VAR process (VAR($\infty$)):
$$Y_t = -\sum_{j=1}^{\infty} \Theta_1^j Y_{t-j} + E_t$$
This representation converges (and the process is invertible) if all eigenvalues of the matrix $\Theta_1$ lie inside the unit circle:
$$|\lambda_i(\Theta_1)| < 1 \quad \text{for all } i$$
Which is equivalent to $\det(I_K - \Theta_1 z) \ne 0$ for all $|z| \le 1$.

### 6. Autocovariance Matrix of a VMA(1) Process
For $Y_t = E_t + \Theta_1 E_{t-1}$ with $E_t \sim \text{WN}(0, \Sigma)$ and mean $\mu=0$:
$$\Gamma(l) = E[Y_t Y_{t+l}^T] = \begin{cases} \Sigma + \Theta_1 \Sigma \Theta_1^T & \text{if } l = 0 \\ \Sigma \Theta_1^T & \text{if } l = 1 \\ \Theta_1 \Sigma & \text{if } l = -1 \\ 0 & \text{if } |l| \ge 2 \end{cases}$$
The fact that $\Gamma(l) = 0$ for all $|l| \ge 2$ is the multivariate extension of the MA(1) ACF cut-off property.

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 26: Fitting and Inverting a Bivariate VMA(1) Model for Market Liquidity and Bid-Ask Spread** — Standardize daily order book liquidity depth and bid-ask spreads for a stock, modeling them as a 2x1 vector. Fit a VMA(1) model, check if the estimated $\hat{\Theta}_1$ matrix eigenvalues lie within the unit circle (ensuring invertibility), and compute the residuals to see if they match Vector White Noise.
- **Verdict**: **Pursue** — The VMA(1) model is highly appropriate for short-lived market microstructural variables (like bid-ask spreads and liquidity spikes) because they revert back to their mean almost immediately, and shocks do not persist past a single lag ($\Gamma(l) = 0$ for $l \ge 2$).

---

## Open questions

- How do we calculate the parameter matrices $\Phi_i$ and $\Theta_j$ in practice? What estimation methods (e.g., Conditional MLE, exact MLE) are standard for VARMA?
- How do we handle parameter identification issues in VARMA models (since different sets of polynomial matrices can yield the exact same autocovariance structure)? (This is known as the identification problem in VARMA, which often leads practitioners to prefer pure VAR models).
