---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=qTWtVrKAntU
source_type: video
duration: ~28m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, R-lang, cointegration, causality, johansen-test, vecm, engle-granger, granger-causality, haugh-pierce-test]
status: distilled
---

# Ep 41 — Practical Session in R · 8

> **Why Lijo watched this**: To see the step-by-step implementation of cointegration tests (Johansen, Engle-Granger), Vector Error Correction Model (VECM) forecasting, and causality tests (Granger causality, Haugh-Pierce) in R using the `urca` and `vars` packages.

---

## ⏱ Worth watching? SKIP

Verdict: **SKIP**

This is an R practical session wrapping up Week 08. If you are coding in Python, you can skip this video. The entire R script, model conversions, diagnostics, and test interpretations on the `Canada` dataset are fully documented in the sections below.

---

## What this episode is actually about (ELI12)

This video is a hands-on coding tutorial in R that demonstrates how to implement the cointegration and causality concepts covered this week.

1.  **Macroeconomic Data (`Canada`)**: The instructor loads a dataset containing employment, productivity, real wages, and unemployment. Plotting the data reveals that employment, productivity, and wages are trending upwards, while unemployment rate displays cyclical patterns.
2.  **Unit Root Tests**: He runs Dickey-Fuller tests (ADF) on the levels of these variables. The tests fail to reject the unit root null hypothesis, confirming all variables are non-stationary ($I(1)$).
3.  **Johansen Cointegration Test**: He runs the multivariate Johansen test. The trace statistic rejects the rank $r=0$ and $r=1$ hypotheses but fails to reject $r=2$. This means there are exactly two independent cointegrating relationships (long-run leashes) among the four variables.
4.  **Forecasting with VECM**: To forecast, he converts the Johansen VECM representation into a standard VAR framework and projects 10 quarters out-of-sample.
5.  **Bivariate Cointegration**: He isolates just two variables (productivity and employment). He runs the Engle-Granger two-step test and a bivariate Johansen test. Both confirm that these two series, when isolated, are *not* cointegrated.
6.  **Causality Tests**:
    *   **Granger Causality**: He differences the series to make them stationary, fits a VAR model, and runs a Granger causality test to see if employment predicts productivity.
    *   **Haugh-Pierce Test**: He prewhitens the two series using ARIMA models, extracts the residuals, cross-correlates them, and computes a $Q$-statistic. The test fails to reject the null, indicating no significant causality.

---

## Key R Packages Used

- **`urca`** — The standard package for unit root and cointegration testing. It contains `ur.df()` for ADF tests and `ca.jo()` for Johansen cointegration tests.
- **`vars`** — Contains functions to convert VECM objects to VAR (`vec2var()`), forecast using VAR (`predict()`), and test Granger causality (`causality()`).

---

## Hands-On Diagnostic Workflow (R Script)

```R
# ==========================================
# PART 1: Loading Packages and Data
# ==========================================
library(urca)
library(vars)

# Load the Canada macroeconomic dataset
data(Canada)

# Convert to a formal quarterly time series object starting in 1980
Canada_ts <- ts(Canada, start = c(1980, 1), frequency = 4)

# Plot the four variables to visually check for trends and seasonality
plot.ts(Canada_ts[, 1:4], main = "Canada Macroeconomic Data")

# ==========================================
# PART 2: Unit Root Testing (ADF)
# ==========================================
# Run ADF test on Employment 'e' with a drift term, lag selected via AIC
adf_e <- ur.df(Canada_ts[, "e"], type = "drift", selectlags = "AIC")
summary(adf_e)
# Result: Test statistic absolute value is smaller than critical values. 
# We fail to reject H0 -> 'e' has a unit root (non-stationary, I(1)).

# ==========================================
# PART 3: Johansen Cointegration Test
# ==========================================
# Run Johansen trace test on all four variables
# K = 2 lags, ecdet = "none" (no intercept in cointegration)
jo_test <- ca.jo(Canada_ts, type = "trace", ecdet = "none", K = 2)
summary(jo_test)

# --- How to Interpret Johansen Trace Output ---
# Null Hypotheses:
# r = 0 (no cointegrating vectors): Test Stat = 115.84 > 1% Critical Value (54.46) -> Reject r=0.
# r <= 1 (at most 1 vector):       Test Stat = 32.76  > 5% Critical Value (29.68) -> Reject r<=1.
# r <= 2 (at most 2 vectors):     Test Stat = 17.39  < 5% Critical Value (15.41? No, 17.39 is less than critical value 20.04) -> Fail to reject.
# Conclusion: Cointegration rank r = 2. There are 2 cointegrating vectors.

# ==========================================
# PART 4: Forecasting with Vector Error Correction (VECM)
# ==========================================
# Convert the Johansen VECM representation into a VAR model using rank r=2
var_model <- vec2var(jo_test, r = 2)

# Generate 10-step-ahead (10 quarters) out-of-sample forecasts
vecm_forecast <- predict(var_model, n.ahead = 10)

# Plot forecasts with confidence intervals
# If R throws "margin too large" error, reset graphics parameters: par(mar=c(1,1,1,1))
plot(vecm_forecast)

# ==========================================
# PART 5: Bivariate Cointegration Tests (Engle-Granger)
# ==========================================
# Isolate Productivity (Y) and Employment (X)
Y <- Canada_ts[, "prod"]
X <- Canada_ts[, "e"]

# Step 1: Cointegrating Levels Regression
long_run_reg <- lm(Y ~ X)
residuals_lr <- residuals(long_run_reg)

# Step 2: Unit Root Test on Residuals (no constant or trend)
eg_test <- ur.df(residuals_lr, type = "none", selectlags = "AIC")
summary(eg_test)
# Result: Test statistic is not significant. 
# Residuals are non-stationary -> Y and X are NOT cointegrated.

# Bivariate Johansen confirmation
summary(ca.jo(cbind(Y, X), type = "trace", ecdet = "none", K = 2))
# Result: rank r = 0 (confirming no cointegration).

# ==========================================
# PART 6: Causality Testing
# ==========================================

# --- 1. Granger Causality via VAR ---
# First difference the data to make it stationary
diff_canada <- diff(Canada_ts)

# Fit a standard VAR(2) on differenced data
var_causality <- VAR(diff_canada, p = 2)

# Test if Employment (e) Granger-causes Productivity (prod)
causality_test <- causality(var_causality, cause = "e")
causality_test$Granger
# Result: Check F-statistic and P-value to determine significance.

# --- 2. Haugh-Pierce Test (Prewhitening) ---
# Fit univariate ARIMA models to productivity and employment to remove autocorrelation
arima_Y <- auto.arima(Y)
arima_X <- auto.arima(X)

# Extract residuals
res_Y <- residuals(arima_Y)
res_X <- residuals(arima_X)

# Compute the Cross-Correlation Function (CCF)
ccf_res <- ccf(res_X, res_Y, lag.max = 10, plot = TRUE)

# Calculate the Haugh-Pierce Q-statistic up to lag K=10
T_obs <- length(res_Y)
K_lags <- 10
q_stat <- T_obs * sum(ccf_res$acf[12:(12 + K_lags)]^2) # Extract positive lags
p_val <- 1 - pchisq(q_stat, df = K_lags)

print(paste("Q-statistic:", q_stat, "P-value:", p_val))
# Result: P-value = 0.32 > 0.05 -> Fail to reject H0. No causality exists.
```

---

## So what for SachNetra?

- **Experiments**: None. (This is a standard implementation walk-through).
- **Verdict**: **Park** — The code provides R templates for Jo-test (`ca.jo`), VECM-to-VAR conversion (`vec2var`), Granger-causality (`causality`), and Haugh-Pierce prewhitening. In Python, these map to:
  - Johansen test: `statsmodels.tsa.vector_ar.vecm.coint_johansen`
  - VECM fitting: `statsmodels.tsa.vector_ar.vecm.VECM`
  - Granger causality: `statsmodels.tsa.stattools.grangercausalitytests`
  - Prewhitening: Fit `SARIMAX` on individual columns, extract `.resid`, and compute `ccf()` from `statsmodels.tsa.stattools`.

---

## Open questions

- How does Johansen's test handle structural breaks in the data (like the 2008 financial crisis or COVID-19)? (Structural breaks skew the Johansen critical values, and standard tests will fail to find cointegration. Specialized tests like Gregory-Hansen or Johansen-Lütkepohl with shift dummies must be used instead).
- How do we handle VECM parameter restrictions (like placing zero restrictions on certain long-run cointegrating vectors) in Python? (In Python, `VECM.fit()` allows restricting the $\alpha$ and $\beta$ matrices to test specific economic hypotheses).
