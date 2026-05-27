---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=exDMtT0Qjtw
source_type: video
duration: ~30m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, R-lang, smoothing, SMA, EMA, holt-method, holt-winters, forecasting]
status: distilled
---

# Ep 26 — Practical Session in R · 5

> **Why Lijo watched this**: To see the step-by-step R implementation of Simple Moving Average (SMA), Exponential Moving Average (EMA), Holt's double exponential smoothing, and Holt-Winters triple exponential smoothing on real temperature and air travel datasets.

---

## ⏱ Worth watching? SKIP

Verdict: **SKIP**

This is an R practical session. If you are coding in Python, you can skip this video entirely. The entire R script, dataset description, and diagnostic workflow are fully captured in the notes below.

---

## What this episode is actually about (ELI12)

This video is a hands-on coding tutorial in R that demonstrates how to clean, decompose, smooth, and forecast time series data. 

The professor walks through two datasets:
1.  **Nottingham Monthly Temperature (`nottem`)**: Decomposing a stable seasonal dataset to show that it has high seasonality but almost zero trend.
2.  **Monthly Air Passengers (`AirPassengers`)**: A challenging dataset with an upward trend, heavy seasonal waves, and a variance that grows over time.

He shows that:
*   A **Simple Moving Average (SMA)** or **Exponential Moving Average (EMA)** with large windows will smooth out the data, but cause the model to miss key peaks.
*   **Holt's Method** captures the trend but ignores the seasonal waves, resulting in a flat forecast line.
*   **Holt-Winters Method** on log-transformed data captures the trend, stabilizes the growing variance, and successfully projects the seasonal waves into the future.

---

## Key R Packages Used

- **`TTR` (Technical Trading Rules)** — For indicators like `SMA()` and `EMA()` commonly used in financial and trading applications.
- **`forecast`** — For generating forecasts (`forecast()`) and visualizing projections with confidence bands.

---

## Hands-On Diagnostic Workflow (R Script)

```R
# 1. Setup Environment
install.packages("TTR")
install.packages("forecast")
library(TTR)
library(forecast)

# ==========================================
# PART 1: Nottingham Temperature Dataset
# ==========================================
data(nottem) # Load Nottingham average monthly temperatures (1920-1939)
?nottem      # Look up documentation

# Decompose Nottingham series (STL: Seasonal and Trend decomposition using Loess)
nottem_stl <- stl(nottem, s.window="periodic")
plot(nottem_stl) 
# Diagnosis: Strong seasonality (sinusoidal peaks), flat trend (revolves within a tight band)

# ==========================================
# PART 2: Airline Passenger Dataset
# ==========================================
data(AirPassengers)
plot(AirPassengers) # Shows upward trend, seasonality, and increasing variance

# Decompose via classical methods (additive vs multiplicative)
decomp_add <- decompose(AirPassengers, type="additive")
decomp_mult <- decompose(AirPassengers, type="multiplicative")

# Extract seasonal components
decomp_add$seasonal

# Perform STL decomposition
air_stl <- stl(AirPassengers, s.window="periodic")
plot(air_stl)
# Diagnosis: Upward trend, strong seasonality, remainder variance increases at the end of the timeline

# ------------------------------------------
# Technique A: Simple Moving Average (SMA)
# ------------------------------------------
# Order K = 3
sma3 <- SMA(AirPassengers, n=3)
# Note: First 2 values will be NA due to lookback window
head(sma3) 

# Residual analysis (Actual - Fitted)
residuals_sma3 <- AirPassengers - sma3
plot(residuals_sma3) # Residuals revolve around 0 but show seasonality and heteroscedasticity

# Order K = 8
sma8 <- SMA(AirPassengers, n=8)
residuals_sma8 <- AirPassengers - sma8
plot(residuals_sma8) # Shows larger spikes and higher variance (lag error)

# ------------------------------------------
# Technique B: Exponential Moving Average (EMA)
# ------------------------------------------
ema3 <- EMA(AirPassengers, n=3)
ema8 <- EMA(AirPassengers, n=8)
ema12 <- EMA(AirPassengers, n=12)

plot(AirPassengers, col="black")
lines(ema3, col="red")   # Follows actual values closely
lines(ema8, col="blue")  # Smoother
lines(ema12, col="green") # Very smooth, highest lag

# ------------------------------------------
# Technique C: Double Exponential Smoothing (Holt's Method)
# ------------------------------------------
# Disable seasonal parameter (gamma = FALSE)
holt_fit <- HoltWinters(AirPassengers, gamma=FALSE)
holt_fit
# Output estimates: alpha = 1.0, beta = 0.0321, gamma = FALSE

# Forecast 24 months out
holt_forecast <- forecast(holt_fit, h=24)
plot(holt_forecast)
# Result: Forecast is a flat, straight line projecting the trend (fails to capture seasonal waves)

# ------------------------------------------
# Technique D: Triple Exponential Smoothing (Holt-Winters)
# ------------------------------------------
# Step 1: Log transform to stabilize the expanding variance (heteroscedasticity)
log_air <- log(AirPassengers)

# Step 2: Fit Holt-Winters (automatically estimates alpha, beta, gamma)
hw_fit <- HoltWinters(log_air)
hw_fit
# Output estimates: alpha = 0.3266, beta = 0.0057, gamma = 0.8206

# Step 3: Forecast 24 months out
hw_forecast <- forecast(hw_fit, h=24)
plot(hw_forecast)
# Result: Forecast captures both the upward trend and the seasonal waves perfectly
```

---

## So what for SachNetra?

- **Experiments**: None. (This is a standard implementation walk-through).
- **Verdict**: **Park** — While we are a Python-first project, the R script demonstrates a vital best-practice: **log-transforming** a time series to stabilize changing variance before applying a forecasting model (like Holt-Winters or ARIMA). We must ensure our Python pipeline handles variance transformation similarly.

---

## Open questions

- In Python's `statsmodels`, what is the equivalent of R's `HoltWinters()` function? (It is `statsmodels.tsa.holtwinters.ExponentialSmoothing`).
- How does Python's `ExponentialSmoothing` handle log transformations? Can it model multiplicative seasonality directly without manual logging? (Yes, by passing `seasonal='multiplicative'` and `trend='additive'` to the constructor).
