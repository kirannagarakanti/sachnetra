---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=cvvCkJSRYNc
source_type: video
duration: ~28m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, causality, granger-causality, hypothesis-testing, haugh-pierce-test, hsiaos-procedure, lag-selection]
status: distilled
---

# Ep 40 — Causality Tests

> **Why Lijo watched this**: To learn the statistical formulation of Granger Causality, understand the restrictions compared to physical causation, study the Haugh-Pierce residual prewhitening test, and review Hsiao's procedure for optimal lag selection.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture covers the essential tools for identifying lead-lag predictive structures in time series. The first 7 minutes (**2:19 to 7:15**) define Granger causality and emphasize the difference between correlation and causation. The section from **7:16 to 13:30** is crucial, showing the mathematical setup of **unrestricted vs. restricted OLS models** and their joint F-tests. Watch **19:29 to 25:15** for the **Haugh-Pierce test** (prewhitening individual series via ARIMA before cross-correlating residuals) and **25:50 to 28:05** for **Hsiao's procedure** using Final Prediction Error (FPE) for lag selection.

---

## What this episode is actually about (ELI12)

You have probably heard that "correlation does not equal causation." Just because two things move together (like the price of oil and the value of a currency) doesn't mean one causes the other. In time series, instead of looking for true, physical causation (which is very hard to prove), we look for **Granger Causality**—which is about **prediction**.

We say that variable $X$ "Granger-causes" variable $Y$ if knowing the past values of $X$ helps us predict the future of $Y$ better than just using the past values of $Y$ alone. 

To test this:
1.  We build a **Restricted Model**: We predict $Y$ today using only its own past values (yesterday, two days ago, etc.).
2.  We build an **Unrestricted Model**: We predict $Y$ today using its own past values *plus* the past values of $X$.
3.  We compare the two: If the Unrestricted Model makes significantly better predictions (tested using an F-test on the regression errors), then we say $X$ Granger-causes $Y$.

The lecture also introduces:
- **Haugh-Pierce Test**: A method where we first strip out all the internal memory of each series separately (using ARIMA models) so they look like pure white noise ("prewhitening"). Then, we cross-correlate their residuals to test for causality.
- **Hsiao's Procedure**: A step-by-step method that uses a mathematical score (Final Prediction Error) to find the perfect number of days to look back (lags) for both variables.

---

## Key Concepts Introduced

- **Granger Causality** — A predictive relationship where the history of one variable $X$ contains statistically significant information that improves the forecast of another variable $Y$ beyond using the history of $Y$ alone.
- **Unrestricted Model** — A regression model predicting $Y_t$ using lags of both $Y_t$ and $X_t$.
- **Restricted Model** — A regression model predicting $Y_t$ using lags of $Y_t$ only.
- **Prewhitening** — The process of fitting an ARIMA model to a time series and extracting its residuals to remove all autocorrelation. Matters because cross-correlations between raw series are often biased by internal autocorrelation; prewhitening ensures the cross-correlation measures genuine lead-lag causality.
- **Haugh-Pierce Test** — A residual-based causality test that computes a $\chi^2$ statistic on the squared cross-correlations of two prewhitened series.
- **Hsiao's Procedure** — A lag selection method that combines Akaike's Final Prediction Error (FPE) with Granger causality tests to systematically choose optimal lags for the dependent and independent variables.

---

## Mathematical Formulations

### 1. Granger Causality OLS Framework
To test if $X$ Granger-causes $Y$ up to lag $p$:
*   **Unrestricted Model**:
    $$Y_t = \alpha + \sum_{i=1}^p \beta_i Y_{t-i} + \sum_{j=1}^p \gamma_j X_{t-j} + \epsilon_{t, \text{unrestricted}}$$
*   **Restricted Model**:
    $$Y_t = \alpha + \sum_{i=1}^p \beta_i Y_{t-i} + \epsilon_{t, \text{restricted}}$$
*   **Hypotheses**:
    $$H_0: \gamma_1 = \gamma_2 = \dots = \gamma_p = 0 \quad (X \text{ does not Granger-cause } Y)$$
    $$H_1: \text{At least one } \gamma_j \ne 0 \quad (X \text{ Granger-causes } Y)$$
*   **Test Statistic ($F$-test)**:
    $$F = \frac{(\text{SSR}_{\text{restricted}} - \text{SSR}_{\text{unrestricted}}) / p}{\text{SSR}_{\text{unrestricted}} / (T - 2p - 1)}$$
    Where $\text{SSR}$ is the Sum of Squared Residuals and $T$ is the sample size. Under $H_0$, $F \sim F(p, T - 2p - 1)$. If $F_{\text{calc}} > F_{\text{critical}}$, we reject $H_0$.

---

### 2. Core Assumptions
1.  **Stationarity**: Both $X_t$ and $Y_t$ must be stationary. Non-stationary data leads to spurious causality results.
2.  **No Cointegration (for VAR)**: If $X$ and $Y$ are cointegrated, the standard VAR Granger test is misspecified. You must use a Vector Error Correction Model (VECM), testing for:
    -   **Short-run causality** (joint $F$-test on differenced lags).
    -   **Long-run causality** ($t$-test on the Speed of Adjustment coefficient $\alpha$ of the lagged Error Correction Term).

---

### 3. The Haugh-Pierce Test
Used to test causality between two stationary series $X_t$ and $Y_t$ using cross-correlations of prewhitened residuals.
*   **Step 1: Prewhitening**
    Fit univariate ARIMA models to $X_t$ and $Y_t$ to obtain residuals $u_t$ and $v_t$, which are independent white noise processes.
*   **Step 2: Cross-Correlation**
    Compute the sample cross-correlation $\hat{\rho}_{uv}(k)$ at lag $k$:
    $$\hat{\rho}_{uv}(k) = \frac{\sum u_{t-k} v_t}{\sqrt{\sum u_t^2 \sum v_t^2}}$$
*   **Step 3: Q-Test Statistic**
    To test causality up to lag $K$:
    $$Q = T \sum_{k=1}^K \hat{\rho}_{uv}(k)^2$$
    Under $H_0$ (no causality), $Q \sim \chi^2(K)$ degrees of freedom. Reject $H_0$ if $Q_{\text{calc}}$ exceeds the critical value.

---

### 4. Hsiao's Procedure for Lag Selection
Instead of setting arbitrary symmetric lags $p$, Hsiao's procedure optimizes lag lengths step-by-step using the **Final Prediction Error (FPE)**:
$$\text{FPE}(p) = \frac{T + p + 1}{T - p - 1} \cdot \frac{\text{SSR}(p)}{T}$$
*   **Step 1**: Treat $Y_t$ as a univariate process. Fit AR($p$) models for $p=1, \dots, M$. Choose $p^*$ that minimizes $\text{FPE}(p)$.
*   **Step 2**: Fit bivariate models with the optimal $p^*$ lags of $Y_t$ and varying lags of $X_t$ (from $q=1, \dots, N$):
    $$Y_t = \alpha + \sum_{i=1}^{p^*} \beta_i Y_{t-i} + \sum_{j=1}^q \gamma_j X_{t-j} + \epsilon_t$$
    Compute $\text{FPE}(p^*, q)$ for each $q$. Choose $q^*$ that minimizes $\text{FPE}(p^*, q)$.
*   **Step 3**: Compare $\text{FPE}(p^*)$ and $\text{FPE}(p^*, q^*)$. If $\text{FPE}(p^*, q^*) < \text{FPE}(p^*)$, then $X$ Granger-causes $Y$ with the optimal lag structure $(p^*, q^*)$.

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 31: Lead-Lag Granger Causality Testing for Crypto Social Volume vs. Returns** — Gather daily social media sentiment/volume ($X_t$) and daily price returns ($Y_t$) for major crypto assets. Apply Hsiao's procedure to select the optimal lag lengths $p^*$ and $q^*$. Run the Granger causality $F$-test to determine if social volume Granger-causes price returns, or if returns Granger-cause social volume.
- **Verdict**: **Pursue** — Granger causality tests are standard tools for validating whether alternative data (like social media volume or search trends) contains genuine leading predictive information or simply reacts to price action after the fact.

---

## Open questions

- How do we implement Hsiao's procedure in Python? (Since there is no default utility in `statsmodels`, we must write a custom search loop that computes the univariate FPE, optimizes $p$, then runs the bivariate regression and computes the joint FPE to optimize $q$).
- How does Granger causality perform in high-frequency data where microstructural noise is present? (Microstructural noise and non-synchronous trading can lead to artificial lag structures; prewhitening is highly necessary to clean these effects).
