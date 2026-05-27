---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=JWwgNgyKXSc
source_type: video
duration: ~31m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, R-lang, ARIMA, hands-on, adf-test, AIC]
status: distilled
---

# Ep 16 — Practical Session in R · 3

> **Why Lijo watched this**: To see the step-by-step implementation of the Box-Jenkins methodology in R, from loading data and visual/statistical stationarity testing to differencing, AIC-based order selection, and forecasting.

---

## ⏱ Worth watching? SKIP

Verdict: **SKIP**

This is an R practical session. If you are coding in Python, you can skip this video entirely. The entire R script, dataset description, and diagnostic workflow are fully captured in the notes below.

---

## What this episode is actually about (ELI12)

This video is a hands-on coding tutorial. The professor walks through how to:
1. Load 70 months of bank loan data.
2. Prove the data is non-stationary using graphs and a statistical test (ADF test).
3. Keep subtracting yesterday's values from today's values (differencing) until the data stops drifting. It takes two rounds of differencing to make it stationary.
4. Try different ARIMA models and pick the one with the lowest "error score" (AIC).
5. Forecast bank loan volumes 24 months into the future.

---

## Key R Packages Used

- **`tseries`** — Specifically for `adf.test()` to perform the Augmented Dickey-Fuller stationarity test.
- **`forecast`** — For the `Arima()` modeling function and the `forecast()` command to project future values.

---

## Hands-On Diagnostic Workflow (R Script)

```R
# 1. Setup Environment
install.packages("tseries")
install.packages("forecast")
library(tseries)
library(forecast)

# 2. Ingest Data (Commercial Bank real estate loans in billions of dollars)
bank_case <- as.ts(scan("desktop/loans.txt")) # 70 monthly observations

# 3. Visual Diagnosis
plot(bank_case) # Clear upward trend -> Non-stationary
acf(bank_case)  # All lags (0 to 10) significant -> Non-stationary
pacf(bank_case) # Cuts off after lag 1 (Warning: PACF alone would suggest stationarity; check both!)

# 4. Formal Hypothesis Testing (ADF Test)
# H0: Series is non-stationary (has unit root)
# H1: Series is stationary
adf.test(bank_case) 
# Result: P-value = 0.99 -> Fail to reject H0 (Confirming non-stationarity)

# 5. Iterative Differencing
# Round 1 difference
bank_case_D1 <- diff(bank_case)
adf.test(bank_case_D1)
# Result: P-value = 0.67 -> Still non-stationary

# Round 2 difference
bank_case_D2 <- diff(bank_case_D1)
adf.test(bank_case_D2)
# Result: P-value = 0.01157 -> Reject H0 (Stationary!)

# 6. Diagnostics of Stationary Series (bank_case_D2)
plot(bank_case_D2) # Stable mean around zero, stable variance
acf(bank_case_D2)  # Only lag 1 is significant, cuts off after lag 1 -> suggests MA(1)
pacf(bank_case_D2) # Cuts off -> suggests AR or MA order

# 7. Model Fitting & Order Selection via AIC
# Since we differenced twice, d = 2. We fit the model on raw data `bank_case` with d=2.
# Model A: ARIMA(0, 2, 1) [Pure MA(1) on twice-differenced data]
bank_fit <- Arima(bank_case, order=c(0, 2, 1))
# Output: AIC = 26.1 (MA coefficient = -0.37)

# Model B: ARIMA(1, 2, 1) [AR(1) + MA(1) on twice-differenced data]
bank_fit2 <- Arima(bank_case, order=c(1, 2, 1))
# Output: AIC = 27.9 

# Verdict: Choose ARIMA(0,2,1) because it has the lower AIC (26.1 < 27.9).

# 8. Forecasting
bank_forecast <- forecast(bank_fit, h=24) # Forecast 24 months in the future
plot(bank_forecast) # Generates plot with forecast line and grey confidence bands (80% and 95%)
```

---

## So what for SachNetra?

- **Experiments**: None. (This is a standard implementation walk-through).
- **Verdict**: **Park** — R-specific syntax is not required for our Python pipeline, but the recursive differencing process (`diff()` iteratively checked by `adf.test()`) is a design pattern we should replicate in our automated data preparation pipelines.

---

## Open questions

- In Python's `statsmodels.tsa.arima.model.ARIMA`, the parameter order works exactly the same: `ARIMA(data, order=(p, d, q))`. How does it estimate the parameters if there are missing values in the series?
- Is AIC always the best metric for model selection in finance, or does BIC (Bayesian Information Criterion) perform better by penalizing parameter count more strictly?
