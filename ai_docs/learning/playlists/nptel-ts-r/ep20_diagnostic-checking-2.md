---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=p1BoUhwkff0
source_type: video
duration: ~31m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, diagnostic-checking, heteroscedasticity, volatility-clustering, White-test, Breusch-Pagan, squared-residuals]
status: distilled
---

# Ep 20 — Diagnostic Checking · II (Heteroscedasticity and Volatility)

> **Why Lijo watched this**: To learn how to detect changing variance (heteroscedasticity) in model residuals, understand why squared residuals are used in diagnostics, and study formal tests (White's test, Breusch-Pagan) and remedies (GLS, ARCH/GARCH).

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This is the mathematical bridge to volatility modeling. Watch **06:46 to 14:15** to understand why we use the ACF/PACF of squared residuals ($\varepsilon_t^2$) instead of raw residuals to diagnose variance. Then, watch **17:30 to 25:40** for the setup of the artificial regressions in White's and Breusch-Pagan tests.

---

## What this episode is actually about (ELI12)

When checking our model's errors, we also have to make sure the size of the errors is stable. If our model makes small mistakes on Mondays but massive mistakes on Fridays, the variance is changing (called **heteroscedasticity**). 

Because the average error is zero, we look at the **squared errors** to measure this variance. If the variance is stable, the squared errors should look completely random and flat. If they have patterns (like clusters of large values), it means we have "volatility clustering." To model this properly, we can't use standard ARIMA anymore—we have to upgrade to models like ARCH or GARCH which model the variance itself.

---

## Key concepts introduced

- **Heteroscedasticity** — The condition where the variance of the error terms is not constant over time ($\text{Var}(\varepsilon_t) = \sigma_t^2$). Matters because it makes classical hypothesis testing (like t-tests) invalid.
- **Homoscedasticity** — The condition where the variance of the error terms remains constant over time ($\text{Var}(\varepsilon_t) = \sigma^2$).
- **Squared Residuals ($\varepsilon_t^2$)** — The mathematical representation of variance at time $t$ when the mean of the residuals is zero.
- **White's General Test** — A test for heteroscedasticity that regresses squared residuals on past levels, squared levels, and cross-product interaction terms.
- **Breusch-Pagan Test** — A simplified test for heteroscedasticity that regresses squared residuals on past time series levels without squared or interaction terms.
- **ARCH / GARCH Models** — Advanced models designed specifically to capture and forecast changing variance (volatility) over time.

---

## Why Diagnose Squared Residuals?

The key variance assumption is: $\text{Var}(\varepsilon_t) = \sigma^2$ (constant).
Since we assume the residual mean is zero ($E[\varepsilon_t] = 0$), the variance formula simplifies:
$$\text{Var}(\varepsilon_t) = E[\varepsilon_t^2] - (E[\varepsilon_t])^2 = E[\varepsilon_t^2]$$

Therefore, the **squared residual** $\varepsilon_t^2$ is the direct proxy for the variance at time $t$.
*   **If variance is constant**: The series of squared residuals $\varepsilon_t^2$ must behave like stationary white noise. The ACF and PACF plots of $\varepsilon_t^2$ should show no significant spikes (all spikes at lag $k \ge 1$ lie within the 95% confidence bands).
*   **If variance is changing**: The ACF/PACF of $\varepsilon_t^2$ will show significant spikes, signaling serial dependence in volatility (common in financial assets).

---

## Heteroscedasticity Tests Reference

### 1. White's General Test (Null: Homoscedasticity)
Constructs an artificial regression of squared residuals on past levels, squared levels, and cross-products:
$$\hat{\varepsilon}_t^2 = \alpha_0 + \sum_i \alpha_i Y_{t-i} + \sum_j \gamma_j Y_{t-j}^2 + \sum_{j \ne k} \delta_{jk} Y_{t-j}Y_{t-k} + u_t$$
Under the null, all slope coefficients are zero. The test statistic:
$$LM = n R^2 \sim \chi^2(m)$$
where $R^2$ is the coefficient of determination of the regression, and $m$ is the number of variables. Reject the null if $LM > \chi^2_{\text{crit}}$.

### 2. Breusch-Pagan Test (Null: Homoscedasticity)
Uses a simpler linear regression of squared residuals without squared or interaction terms:
$$\hat{\varepsilon}_t^2 = \alpha_0 + \alpha_1 Y_{t-1} + \dots + \alpha_m Y_{t-m} + u_t$$
Tests $H_0: \alpha_1 = \dots = \alpha_m = 0$. Statistic is $n R^2 \sim \chi^2(m)$.

---

## Consequences of Heteroscedasticity
If changing variance is left unaddressed:
1. **Estimates are unbiased but inefficient**: The estimated coefficients are correct on average, but they do not have the minimum possible variance.
2. **Invalid Hypothesis Tests**: The standard errors of the coefficients are biased. This means t-statistics and F-statistics are incorrect, rendering p-values and confidence intervals invalid.
3. **Remedies**:
   - Use **Weighted Least Squares (WLS)** or **Generalized Least Squares (GLS)**. WLS balances the variance by assigning large weights to small-variance residuals and small weights to large-variance residuals.
   - Implement **ARCH/GARCH** models to model the volatility explicitly (covered in later weeks).

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 16: Volatility Diagnostic Pipeline (Squared Residuals)** — After fitting ARIMA/SARIMA, run the **Ljung-Box test** directly on the **squared residuals** $\hat{\varepsilon}_t^2$ at lags 10 and 20. If rejected ($p < 0.05$), it confirms the presence of GARCH effects (volatility clustering), meaning we must transition from a homoscedastic ARIMA model to a GARCH framework to calculate accurate confidence intervals for abnormal returns.
- **Verdict**: **Pursue** — Visualizing and testing the ACF/PACF of squared residuals is the formal gateway to validating whether GARCH modeling is required for event study residuals.

---

## Open questions

- When studying earnings event periods, does the variance of residuals temporarily spike during the event window (event-induced variance)?
- How do we implement White's test or Breusch-Pagan test in Python? (`statsmodels.stats.diagnostic.het_breuschpagan` and `het_white` provide direct implementations for linear regression residuals, which can be adapted for ARIMA residuals).
