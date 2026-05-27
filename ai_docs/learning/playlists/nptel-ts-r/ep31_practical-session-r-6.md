---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=FVngzSQj2UA
source_type: video
duration: ~30m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, R-lang, ARFIMA, simulation, fracdiff, forecast, kpss-test]
status: distilled
---

# Ep 31 — Practical Session in R · 6

> **Why Lijo watched this**: To see the step-by-step implementation of ARFIMA simulation, estimation, residual diagnostics, and forecasting in R, and to understand why ARFIMA fails on series with seasonal unit roots like AirPassengers.

---

## ⏱ Worth watching? SKIP

Verdict: **SKIP**

This is an R practical session. If you are coding in Python, you can skip this video entirely. The entire R script, simulation setup, and diagnostics are fully captured in the notes below.

---

## What this episode is actually about (ELI12)

This video is a hands-on coding tutorial in R that demonstrates how to work with **ARFIMA** (fractionally integrated) models. 

1.  **Simulated Long Memory**: The instructor creates a fake dataset with a known fractional difference of $d = 0.3$ and an ARMA structure. When he fits an ARFIMA model to this fake data, the math successfully guesses the original parameters ($\hat{d} \approx 0.28$). The residual check shows that the model captured all the memory, leaving behind pure random noise (stationary residuals).
2.  **Real Air Travel Data (`AirPassengers`)**: He tries to fit the same ARFIMA model to the air travel dataset. It fails. The residuals still show massive recurring spikes at seasonal intervals (lags 12, 24, 36), and the forecast is a flat line that completely misses the seasonal waves. 
    *   *The lesson*: If data has strong calendar-based seasonality, ARFIMA cannot model it correctly because seasonality forces the series to revert to a seasonal pattern, whereas ARFIMA assumes long-memory shocks decay slowly without calendar-based loops.

---

## Key R Packages Used

- **`fracdiff`** — The essential R package for fractional differencing, containing `fracdiff.sim()` to simulate ARFIMA paths and `fracdiff()` / `arfima()` to estimate the models.
- **`urca`** — For unit root and stationarity tests (specifically `ur.kpss()`).
- **`forecast`** — For generating forecasts (`forecast()`) and plotting projections with confidence bands.

---

## Hands-On Diagnostic Workflow (R Script)

```R
# 1. Setup Environment
install.packages("fracdiff")
install.packages("urca")
install.packages("forecast")
install.packages("tseries")

library(fracdiff)
library(urca)
library(forecast)
library(tseries)

# ==========================================
# PART 1: Simulated ARFIMA(1, d, 1) Series
# ==========================================
set.seed(123) # For reproducibility

# Set model parameters
n_obs <- 1000
d_param <- 0.3       # Fractional differencing parameter (0 < d < 0.5 -> stationary long memory)
ar_coeff <- 0.5      # AR(1) coefficient
ma_coeff <- 0.2      # MA(1) coefficient

# Simulate the process
arfima_sim <- fracdiff.sim(n=n_obs, d=d_param, ar=ar_coeff, ma=ma_coeff)
plot(arfima_sim$series) # Visual check

# Estimate parameters using the arfima() wrapper
arfima_model <- arfima(arfima_sim$series)
summary(arfima_model)
# Results: Estimated d = 0.2824 (very close to true 0.3), AR1 = 0.51, MA1 = 0.18

# Extract coefficients
coef(arfima_model)

# Residual Diagnostics
par(mfrow=c(1,2)) # Plot side-by-side
acf(residuals(arfima_model), main="ACF of Residuals")
pacf(residuals(arfima_model), main="PACF of Residuals")
# Result: No significant spikes, behaves like white noise.

# Formal Stationarity Test on Residuals (KPSS Test)
# H0: Series is stationary
# H1: Series is non-stationary
residuals_kpss <- ur.kpss(residuals(arfima_model))
summary(residuals_kpss)
# Result: Test statistic = 0.0461 (critical value at 5% = 0.463)
# Fail to reject H0 -> Residuals are stationary.

# Forecasting
par(mfrow=c(1,1)) # Reset window
arfima_forecast <- forecast(arfima_model, h=20)
plot(arfima_forecast) # Forecast decays slowly back to the mean (preserves long memory)

# Optional: Export fitted values
write.csv(data.frame(Time=1:1000, Fitted=arfima_model$fitted), 
          "arfima_simulated_data.csv", row.names=FALSE)


# ==========================================
# PART 2: Real AirPassengers Dataset
# ==========================================
data(AirPassengers)
Y <- AirPassengers

# Stationarity Test on Raw Data
summary(ur.kpss(Y)) 
# Test statistic = 2.739 (exceeds critical value 0.739) -> Non-stationary.

# Difference once and plot ACF/PACF
diff_Y <- diff(Y)
par(mfrow=c(1,2))
acf(diff_Y)
pacf(diff_Y)
# Result: Strong seasonal spikes at lags 12, 24, 36.

# Fit ARFIMA model on raw data
arfima_model_air <- arfima(Y)
summary(arfima_model_air)
# Results: Estimated d = 0.47, AR1, AR2, MA1 coefficients.

# Diagnostic checking on residuals
acf(residuals(arfima_model_air))
pacf(residuals(arfima_model_air))
# Result: Massive spikes remain at lags 12, 24, 36. Seasonality is NOT modeled.

# KPSS test on residuals
summary(ur.kpss(residuals(arfima_model_air)))
# Test statistic = 0.72 (exceeds 5% critical value of 0.463) -> Non-stationary residuals.

# Forecasting
par(mfrow=c(1,1))
forecast_air <- forecast(arfima_model_air, h=12)
plot(forecast_air)
# Result: Projections follow a flat trend line, completely missing the seasonal spikes.
```

---

## So what for SachNetra?

- **Experiments**: None. (This is a standard implementation walk-through).
- **Verdict**: **Park** — R's `fracdiff` package is the standard tool for fractional integration. In Python, the equivalent is `statsmodels.tsa.statespace.sarimax` (with integer differencing) or custom libraries like `fracdiff` (Python package). The key lesson is that **ARFIMA is completely inappropriate for seasonal series**; if seasonality exists, SARIMA or Holt-Winters must be used instead.

---

## Open questions

- How does Python's `fracdiff` package handle fractional differencing on pandas DataFrames?
- Is there a way to combine fractional integration and seasonal differencing (SARFIMA)? (Yes, SARFIMA models exist but are rarely implemented in standard packages due to extreme estimation complexity).
