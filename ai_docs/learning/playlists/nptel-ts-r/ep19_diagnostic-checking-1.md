---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=lPwAl5cxodQ
source_type: video
duration: ~31m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, diagnostic-checking, residuals, normality, Jarque-Bera, Shapiro-Wilk, Ljung-Box, Box-Pierce, autocorrelation]
status: distilled
---

# Ep 19 — Diagnostic Checking · I (Normality and Serial Correlation)

> **Why Lijo watched this**: To learn the formal statistical checks used to validate model residuals—specifically for testing normality (Jarque-Bera, Shapiro-Wilk, QQ plots) and testing for independence/serial correlation (Box-Pierce, Ljung-Box, residual ACF).

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This is the standard quality-control guide for time series models. Watch **04:55 to 11:40** to understand why histograms can be misleading for small samples and how QQ plots operate. Then, watch **24:38 to 31:40** for the mathematical structure of the Box-Pierce and Ljung-Box tests and what to do if your model fails them.

---

## What this episode is actually about (ELI12)

After we build our forecasting model, we have to inspect its mistakes (called "residuals" or "errors"). If our model did a perfect job extracting all the patterns from the data, the errors left behind should look like pure, random noise.

This video shows how to run two types of inspections on the errors:
1. **The Bell-Curve Test (Normality)**: We check if the errors are spread out like a standard bell curve. We use histograms, diagonal dot plots (QQ plots), and statistical tests to verify this.
2. **The Connection Test (Serial Correlation)**: We check if today's error is secretly connected to yesterday's error. If they are connected, it means our model missed a pattern. If we fail this test, we must go back and add more days/parameters to our model to soak up that missing pattern.

---

## Key concepts introduced

- **Diagnostic Checking** — The process of validating a fitted model by checking if its residuals satisfy the assumptions of white noise (normally distributed, independent, constant variance).
- **Normal QQ Plot** — A visual check that plots the sample quantiles of the residuals against the theoretical quantiles of a standard normal distribution. If the residuals are normal, the points lie on a straight line.
- **Jarque-Bera (JB) Test** — A test that checks if the residuals' sample skewness ($S$) and excess kurtosis ($K-3$) are collectively equal to zero. Under the null, $JB \sim \chi^2(2)$.
- **Shapiro-Wilk Test** — A normality test based on ordered sample values (order statistics) and normal distribution covariances.
- **Box-Pierce & Ljung-Box Tests** — Portmanteau tests that evaluate whether a group of residual autocorrelations up to lag $h$ are collectively different from zero (detecting serial correlation).

---

## Normality Checking Reference

To test if residuals $\varepsilon_t$ follow a normal distribution $N(0, \sigma_e^2)$, we first standardize them: $\hat{\varepsilon}_t / \hat{\sigma}_e$.

### Visual Diagnostics
*   **Histogram**: Check for a symmetric, bell-shaped distribution. Note that small samples ($n=100$) can look skewed due to random noise; larger samples ($n=1000$) converge closer to symmetry via the Central Limit Theorem.
*   **Normal QQ Plot**: Plots theoretical normal quantiles on the x-axis and sample quantiles on the y-axis. 
    *   *Normality holds*: Points form a straight diagonal line.
    *   *Normality fails*: Points curve away from the diagonal line (common in the tails).

### Hypothesis Tests (Null: Data is Normal)
*   **Jarque-Bera Test**:
    $$JB = \frac{n}{6} \left( S^2 + \frac{(K-3)^2}{4} \right) \sim \chi^2(2)$$
    Reject $H_0$ if $JB$ exceeds critical chi-squared value (residuals are non-normal).
*   **Shapiro-Wilk Test**:
    Evaluates ordered values. Reject $H_0$ if test statistic $W$ is significantly small.

---

## Autocorrelation Checking (Independence)

If residuals are correlated with their past values, the model has failed to capture all linear dependencies.

### Visual Diagnostics
*   **Residual ACF Plot**: If the residuals are white noise, all lag spikes $k \ge 1$ must lie inside the 95% confidence bands (horizontal blue dashed lines). If consecutive lags show patterns (e.g. alternating sign waves or multiple spikes outside bands), serial correlation is present.

### Hypothesis Tests (Null: Residuals are Independent / White Noise)
*   **Box-Pierce Test**:
    $$Q = n \sum_{k=1}^h \hat{\rho}_k^2$$
*   **Ljung-Box Test** (Modified version, more robust for finite sample sizes):
    $$Q^* = n(n+2) \sum_{k=1}^h \frac{\hat{\rho}_k^2}{n-k}$$
    Under the null, the test statistics follow a $\chi^2(h - p - q)$ distribution. Reject $H_0$ if $Q^* > \chi^2_{\text{crit}}$ (residuals are correlated).

---

## The Remedy for Serial Correlation

If your residuals fail the Ljung-Box test:
1. **Abandon the current model**. The parameters are inefficient, and forecasts will be sub-optimal.
2. **Go back to Step 1 (Identification)**.
3. **Add lags to the AR or MA components** to absorb the remaining serial correlation (e.g., if you fit an $\text{ARMA}(1,2)$ and failed, try fitting an $\text{ARMA}(2,2)$ or $\text{ARMA}(1,3)$).
4. Re-estimate parameters and run the diagnostic checks again.

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 15: Post-ARIMA Quality Control Pipeline** — After fitting any ARIMA/SARIMA model to financial time series, automatically run the **Ljung-Box test** on the residuals at lags 10 and 20. If the null of independence is rejected ($p < 0.05$), flag the model as "inadequate" and automatically increment the AR/MA lag orders by 1 to re-fit.
- **Verdict**: **Pursue** — Residual diagnostic checking (especially Ljung-Box) is a critical guardrail to ensure that event-study return residuals are white noise before conducting significance tests.

---

## Open questions

- Financial returns are famous for having "fat tails" (high kurtosis). If our residuals reject Jarque-Bera normality but pass Ljung-Box independence, is the ARIMA model still valid? (Yes, ARIMA doesn't strictly require normal residuals for unbiased forecasts, but normality is required for standard confidence interval calculations).
- What is the third assumption test (changing variance)? How do we test for heteroscedasticity? (Likely covered in the next episode, Ep 20, introducing ARCH/GARCH diagnostic tests).
