---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=NmrwUyI8Rz4
source_type: video
duration: ~30m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, multivariate, var, vma, yule-walker, cross-covariance, cross-correlation, applications]
status: distilled
---

# Ep 35 — Further Extensions and Use Cases

> **Why Lijo watched this**: To walk through a concrete numerical example of a bivariate VMA(1) model, understand the mathematical formulation and Yule-Walker equations for Vector Autoregressive (VAR) models, and review the practical applications of VARMA models across various industries.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture brings multivariate time series theory to life. The first 8 minutes (**2:09 to 8:15**) walk through a **numerical example of a bivariate VMA(1) process**, demonstrating how to compute the lag-0 and lag-1 cross-covariance matrices. Focus on **8:16 to 14:10** for the definition of the VAR($p$) process and the dual relationship where VAR($p$) models invert into VMA($\infty$) and vice versa. Watch **15:10 to 22:00** for the derivation of the **Vector Yule-Walker equations** (relating cross-covariance matrices across lags). The final section (**22:38 to 29:40**) summarizes use cases across finance, macroeconomics, supply chain, energy, healthcare, and climate science.

---

## What this episode is actually about (ELI12)

In this lecture, we look at a concrete example of two connected time series (like the stock price of Reliance and Adani) and model them using a Vector Moving Average (VMA(1)) model. By pluging in actual numbers for the matrix coefficients and the shock variances, we calculate how the two series co-vary with each other today and how a shock in one series ripples into the other tomorrow.

Then, we flip to the autoregressive side and introduce the **Vector Autoregressive (VAR)** model. In a VAR model, each variable's value today is a linear combination of its own past values and the past values of *every other* variable in the system. 

We highlight a beautiful mathematical duality:
- A VMA(1) model (which has a short memory of 1 lag) can be rewritten as an autoregressive model of infinite order (VAR($\infty$)).
- A VAR($p$) model (where today depends on a finite number of yesterdays) can be rewritten as a moving average model of infinite order (VMA($\infty$)).

We also show how to compute the cross-covariance matrices for a VAR process using the **Vector Yule-Walker equations**. Finally, we review how these models are used in the real world to predict everything from inventory stockouts and asset portfolios to electricity loads and hospital beds.

---

## Key concepts introduced

- **Bivariate Process** — A two-dimensional vector time series process ($K=2$), tracking two variables simultaneously. Matters because it is the simplest multivariate setup, useful for studying pairwise dependencies.
- **Vector Autoregression (VAR($p$))** — A model where a $K$-dimensional vector series $Y_t$ is regressed on $p$ of its own lagged vector values. Matters because it captures dynamic feedforward and feedback loops between multiple variables over time.
- **VAR Duality (VAR-VMA Interchangeability)** — The property where any stationary VAR($p$) process can be represented as an infinite-order moving average process (VMA($\infty$)), and any invertible VMA($q$) can be written as a VAR($\infty$). Matters because it allows analysts to choose the representation that is most parsimonious or easiest to estimate.
- **Vector Yule-Walker Equations** — A set of matrix equations relating the cross-covariance matrices $\Gamma(l)$ of a VAR($p$) process to its autoregressive matrix coefficients $\Phi_i$ and the error covariance matrix $\Sigma$. Matters because they provide a method to estimate VAR parameters from sample cross-covariances.

---

## Mathematical Formulations & Numerical Walkthrough

### 1. Bivariate VMA(1) Numerical Example
Consider a bivariate ($K=2$) vector moving average process:
$$Y_t = E_t - \Theta_1 E_{t-1}$$
With the coefficient matrix:
$$\Theta_1 = \begin{bmatrix} 0.2 & -0.4 \\ -0.2 & 0.6 \end{bmatrix}$$
And error covariance matrix:
$$\Sigma = E[E_t E_t^T] = \begin{bmatrix} 4 & 1 \\ 1 & 4 \end{bmatrix}$$

#### Covariance Matrix at Lag 0 ($\Gamma(0)$):
$$\Gamma(0) = \Sigma + \Theta_1 \Sigma \Theta_1^T$$
First, calculate $\Theta_1 \Sigma \Theta_1^T$:
$$\Theta_1 \Sigma = \begin{bmatrix} 0.2 & -0.4 \\ -0.2 & 0.6 \end{bmatrix} \begin{bmatrix} 4 & 1 \\ 1 & 4 \end{bmatrix} = \begin{bmatrix} 0.4 & -1.4 \\ -0.2 & 2.2 \end{bmatrix}$$
$$\Theta_1 \Sigma \Theta_1^T = \begin{bmatrix} 0.4 & -1.4 \\ -0.2 & 2.2 \end{bmatrix} \begin{bmatrix} 0.2 & -0.2 \\ -0.4 & 0.6 \end{bmatrix} = \begin{bmatrix} 0.64 & -0.92 \\ -0.92 & 1.36 \end{bmatrix}$$
Adding $\Sigma$:
$$\Gamma(0) = \begin{bmatrix} 4 & 1 \\ 1 & 4 \end{bmatrix} + \begin{bmatrix} 0.64 & -0.92 \\ -0.92 & 1.36 \end{bmatrix} = \begin{bmatrix} 4.64 & 0.08 \\ 0.08 & 5.36 \end{bmatrix}$$

#### Covariance Matrix at Lag 1 ($\Gamma(1)$):
$$\Gamma(1) = -\Sigma \Theta_1^T = -\begin{bmatrix} 4 & 1 \\ 1 & 4 \end{bmatrix} \begin{bmatrix} 0.2 & -0.2 \\ -0.4 & 0.6 \end{bmatrix} = \begin{bmatrix} -0.4 & 0.2 \\ 1.4 & -2.2 \end{bmatrix}$$
For lags $|l| \ge 2$, the covariance matrices are zero: $\Gamma(l) = \begin{bmatrix} 0 & 0 \\ 0 & 0 \end{bmatrix}$.

---

### 2. The VAR($p$) Process
The vector autoregressive model of order $p$, VAR($p$), is defined as:
$$Y_t = \delta + \Phi_1 Y_{t-1} + \Phi_2 Y_{t-2} + \dots + \Phi_p Y_{t-p} + E_t$$
Where:
- $Y_t$ is a $K \times 1$ vector process.
- $\delta$ is a $K \times 1$ constant vector.
- $\Phi_i$ are $K \times K$ autoregressive coefficient matrices.
- $E_t \sim \text{WN}(0, \Sigma)$ is Vector White Noise.

In backshift operator notation:
$$\Phi(B) Y_t = \delta + E_t \quad \text{where } \Phi(B) = I_K - \Phi_1 B - \dots - \Phi_p B^p$$
Under stationarity, the mean vector is:
$$\mu = E[Y_t] = \Phi(1)^{-1} \delta = (I_K - \Phi_1 - \dots - \Phi_p)^{-1} \delta$$
Subtracting the mean vector throughout allows us to write:
$$(Y_t - \mu) = \Phi_1 (Y_{t-1} - \mu) + \Phi_2 (Y_{t-2} - \mu) + \dots + \Phi_p (Y_{t-p} - \mu) + E_t$$

---

### 3. Vector Yule-Walker Equations (for $\mu=0$)
For a stationary VAR($p$) process:
$$Y_t = \Phi_1 Y_{t-1} + \Phi_2 Y_{t-2} + \dots + \Phi_p Y_{t-p} + E_t$$
Multiplying by $Y_{t-l}^T$ and taking expectations yields the covariance relations:
*   **For Lag 0**:
    $$\Gamma(0) = \Phi_1 \Gamma(1)^T + \Phi_2 \Gamma(2)^T + \dots + \Phi_p \Gamma(p)^T + \Sigma$$
*   **For Lags $l \ge 1$**:
    $$\Gamma(l) = \Phi_1 \Gamma(l-1) + \Phi_2 \Gamma(l-2) + \dots + \Phi_p \Gamma(l-p)$$
These equations define the recursive structure of VAR covariances.

---

### 4. Autocorrelation Matrix ($R(l)$)
The autocorrelation matrix scales the covariance elements:
$$R(l) = V^{-1/2} \Gamma(l) V^{-1/2}$$
Where $V$ is the diagonal matrix of contemporaneous variances:
$$V = \text{diag}(\gamma_{11}(0), \gamma_{22}(0), \dots, \gamma_{KK}(0))$$
The $(i,j)$-th element of $R(l)$ is the cross-correlation:
$$\rho_{ij}(l) = \frac{\gamma_{ij}(l)}{\sqrt{\gamma_{ii}(0)\gamma_{jj}(0)}}$$

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 27: Evaluating Sector Spillover Shocks via Bivariate VAR(2) Modeling** — Fit a bivariate VAR(2) model on daily returns of a banking sector ETF ($Y_{1t}$) and a technology sector ETF ($Y_{2t}$). Solve the Yule-Walker equations to estimate the feedback coefficient matrices $\hat{\Phi}_1$ and $\hat{\Phi}_2$. Test if the off-diagonal elements are statistically significant to determine if technology returns lead banking returns or vice versa.
- **Verdict**: **Pursue** — Utilizing VAR(p) models allows us to model multiple sectors simultaneously and capture lead-lag transmissions (information spillovers) that univariate ARIMA models miss entirely.

---

## Open questions

- How do we select the lag order $p$ in a VAR model? (This is usually done using information criteria like AIC or BIC applied to the residual covariance matrix).
- How does Granger Causality relate to the off-diagonal matrices in a VAR model? (Granger causality tests if the lagged coefficients of one variable are jointly zero in the regression of another variable, which directly checks off-diagonal significance).
