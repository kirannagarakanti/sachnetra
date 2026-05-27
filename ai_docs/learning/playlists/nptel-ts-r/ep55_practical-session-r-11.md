---
date: 2026-05-27
source_url: https://www.youtube.com/watch?v=rg63BKS8nwM
source_type: video
duration: ~27m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, nonlinear-models, r-lang, setar-model, tar-model, linearity-test, forecasting]
status: distilled
---

# Ep 55 — Practical Session in R · 11

> **Why Lijo watched this**: Skipped for visual learning (R-only session), but complete R script workflows, diagnostic procedures, and functions for SETAR, TAR, linearity tests (Keenan, Tsay), and forecasting on simulated, Nile flow, and Sunspot datasets have been fully documented here.

---

## ⏱ Worth watching? SKIP

Verdict: **SKIP**

This is an R practical session implementing nonlinear regime-switching models. Since SachNetra is Python-first, do not watch the video. All relevant R script chunks, packages, and workflows are extracted and documented below.

---

## What this episode is actually about (ELI12)

This practical session shows how to write R code to simulate and fit threshold models.
It covers:
1.  **Simulated Data**: Creating a two-regime self-exciting threshold (SETAR) process where the rules switch depending on whether yesterday's value was positive or negative. Then, we fit a TAR model to this simulated data and check the residuals to make sure they are clean white noise.
2.  **Nile River Data**: Checking if the flow of the Nile River has non-linear regimes. We run a linearity test to prove a 2-regime model is better than a simple linear model, search for the best threshold (which is a flow rate of 912), and use it to forecast future flow.
3.  **Sunspots Data**: Running formal tests (Keenan's and Tsay's tests) to verify that sunspot activity is non-linear, fitting a SETAR model, and plotting the forecasts alongside confidence intervals.

---

## Key concepts introduced

- **tsDyn Package** — The primary R package used for fitting threshold autoregressive (TAR), self-exciting threshold autoregressive (SETAR), and smooth transition autoregressive (STAR) models. Matters because it contains robust estimation, testing, and forecasting routines for regime-switching models.
- **setarTest()** — A function in `tsDyn` that performs a bootstrap-based linearity test against SETAR alternatives. Matters because it helps statistically justify using a nonlinear model over a simpler linear one.
- **selectSETAR()** — A grid-search parameter selection utility that evaluates different combinations of thresholds and delays based on AIC. Matters because it automates model identification for SETAR processes.
- **Keenan's Test** — A statistical test (implemented as `keenan.test()` in `TSA`) that checks for second-order nonlinearity in a time series. Matters because it provides a quick diagnostic check to reject linearity.
- **Tsay's Test** — A more general statistical test (implemented as `Tsay.test()` in `TSA`) that tests for quadratic nonlinearity, allowing for different lag structures. Matters because it acts as a robust check for regime-switching behaviors.

---

## R Workflow & Code Blocks

### 1. Environment & Package Loading
The following R packages are required for nonlinear time-series simulation, modeling, and diagnostics:
```r
# Install packages if not already installed:
# install.packages(c("TSA", "forecast", "quantmod", "tsDyn", "stats", "deSolve", "tseries", "tseriesChaos"))

library(TSA)          # For keenan.test, Tsay.test, tar models
library(forecast)     # For checkresiduals and forecasting utilities
library(quantmod)     # For downloading financial data
library(tsDyn)        # For setar, selectSETAR, and setarTest
library(stats)        # Core statistical tools
library(deSolve)      # ODE solvers
library(tseries)      # Time series utilities
library(tseriesChaos) # Nonlinear/chaos diagnostics (referred to as 'chaos' in video)

# Set seed for reproducibility of simulated data
set.seed(123)
```

---

### 2. Simulating a SETAR Process
A 500-observation, 2-regime Self-Exciting TAR (SETAR) process is simulated where the threshold variable is the first lag $Y_{t-1}$:
$$\text{Regime 1: } Y_t = 0.8 Y_{t-1} + e_t \quad \text{if } Y_{t-1} \le 0$$
$$\text{Regime 2: } Y_t = -0.5 Y_{t-1} + e_t \quad \text{if } Y_{t-1} > 0$$

```r
n <- 500
threshold_val <- 0
phi1 <- 0.8          # Regime 1 AR(1) parameter
phi2 <- -0.5         # Regime 2 AR(1) parameter
sigma <- 1.0         # Noise standard deviation

y <- numeric(n)
for (t in 2:n) {
  if (y[t-1] <= threshold_val) {
    y[t] <- phi1 * y[t-1] + rnorm(1, mean = 0, sd = sigma)
  } else {
    y[t] <- phi2 * y[t-1] + rnorm(1, mean = 0, sd = sigma)
  }
}

# Plot the simulated process with the threshold boundary
plot(y, type = "l", main = "Simulated SETAR Process", ylab = "Y_t", xlab = "Time")
abline(h = threshold_val, col = "red", lty = 2)
```

---

### 3. Fitting & Forecasting the Simulated TAR Model
We fit a threshold model to the simulated data using the `TSA` or `tsDyn` package and run diagnostics.
```r
# Fit TAR model using TSA package
# Syntax: tar(y, p1, p2, d, a)
# where p1 & p2 are AR orders, d is delay, a is threshold value
tar_model_sim <- TSA::tar(y, p1 = 1, p2 = 1, d = 1, a = threshold_val)
summary(tar_model_sim)

# Reset plotting layout to single panel
par(mfrow = c(1, 1))

# Diagnostic checks on residuals
forecast::checkresiduals(tar_model_sim)

# Generate 20-step ahead forecast
sim_forecast <- predict(tar_model_sim, n.ahead = 20)

# Plot forecast with confidence intervals
plot(sim_forecast, main = "TAR Model Forecasts (Simulated Data)")
```

---

### 4. Real Data Example: Nile River Flow (Change-Point & SETAR Selection)
The annual flow of the River Nile (1871-1970) exhibits a clear shift in level around 1898. We test for linearity and select a SETAR model.
```r
data(Nile)
nile_flow <- as.numeric(Nile)

# Basic Exploratory Data Analysis
summary(nile_flow)
hist(nile_flow, main = "Histogram of Nile Flow", xlab = "Annual Flow Volume")

# Linearity test against SETAR alternatives (using tsDyn)
# Null hypothesis: Process is linear. Alternately: SETAR(2) or SETAR(3)
nile_test <- tsDyn::setarTest(nile_flow, m = 3, nboot = 400)
print(nile_test)
# Output shows p-value < 0.1 for 1 vs 2 regimes (nonlinear 2-regime preferred)
# but p-value > 0.1 for 1 vs 3 regimes (3-regime model overfits)

# Grid search to select optimal SETAR parameters based on AIC
nile_select <- tsDyn::selectSETAR(nile_flow, m = 3, d = 2, steps = 1)
print(nile_select)
# The row with the lowest pulled AIC value yields: threshold = 912, delay = 2

# Fit the selected SETAR model
nile_setar <- tsDyn::setar(nile_flow, m = 3, d = 2, th = 912)
summary(nile_setar)
# Estimates parameters for low regime (L) and high regime (H) separately

# Forecast 10 steps ahead and extract values
nile_forecast <- predict(nile_setar, n.ahead = 10)
print(nile_forecast)
```

---

### 5. Real Data Example: Sunspot Activity (Linearity Tests & Fitting)
The annual sunspots dataset (`sunspot.year`) is checked with Keenan's and Tsay's tests and modeled with a TAR structure.
```r
data(sunspot.year)
plot.ts(sunspot.year, main = "Annual Sunspot Numbers")

# Linearity tests from the TSA package
keenan_res <- TSA::keenan.test(sunspot.year)
tsay_res <- TSA::Tsay.test(sunspot.year)

print(keenan_res$p.value) # Extremely small p-value: reject linearity
print(tsay_res$p.value)   # Extremely small p-value: reject linearity

# Grid search for parameters using aicm (AIC-based model selection loop)
# Assume lag structure search yields optimal parameters: p = 9, d = 9
sunspot_tar <- tsDyn::setar(sunspot.year, m = 9, d = 9, th = 120)

# Forecast and plot results
sunspot_pred <- predict(sunspot_tar, n.ahead = 10)
plot(sunspot_pred, main = "Sunspot Forecast using SETAR(9,9,120)")
```

---

## So what for SachNetra?

- **Experiments**:
  - **None.** This is a practical session replicating the theoretical models from previous episodes in R. The equivalent Python implementation using `statsmodels.tsa.regime_switching` or similar libraries would be used to validate experiments Exp 42 and Exp 43.
- **Verdict**: **Park** - R implementation code itself is not ported, but the testing workflows (e.g. Keenan's test for nonlinearity, grid search of thresholds via AIC/BIC, and bootstrap-based regime tests) are useful reference frameworks for Python translation.

---

## Open questions

- Does Python's `statsmodels` contain direct equivalents for Keenan's and Tsay's tests, or do we need to implement these F-tests manually using OLS residuals?
- How does the forecasting performance of SETAR/TAR compare when implemented in Python utilizing rolling windows?
