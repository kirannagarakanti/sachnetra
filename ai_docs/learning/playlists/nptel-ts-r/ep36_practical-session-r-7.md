---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=cEbP7ljhQcg
source_type: video
duration: ~28m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, R-lang, multivariate, var, vma, varma, simulation, forecasting, diagnostics, canada-dataset]
status: distilled
---

# Ep 36 — Practical Session in R · 7

> **Why Lijo watched this**: To see the step-by-step implementation of multivariate time series modeling (VAR, VMA, and VARMA) in R, including simulation, parameter estimation, forecasting, residual diagnostics, and model selection on a real macroeconomic dataset.

---

## ⏱ Worth watching? SKIP

Verdict: **SKIP**

This is an R practical session. If you are coding in Python (using libraries like `statsmodels.tsa.api.VAR`), you can skip this video entirely. The complete R script, packages (`vars` and `MTS`), simulated workflow, diagnostics, and real-world Canada macro analysis are fully documented in the sections below.

---

## What this episode is actually about (ELI12)

This video is a hands-on coding session in R that demonstrates how to implement and compare different multivariate time series models.

1.  **Simulated Bivariate Data**: The instructor generates two independent random series from a normal distribution, then filters them with feedback coefficients to make them move together (creating a simulated bivariate dataset). 
2.  **Fitting Models on Simulated Data**:
    *   **VAR(2)**: Models today's values as depending on two days of past values.
    *   **VMA(2)**: Models today's values as depending on two days of past random shocks.
    *   **VARMA(1,1)**: Combines both, using one past value and one past shock.
    *   He projects forecasts 30 steps into the future for each model and plots them.
3.  **Diagnostic Checking**: He runs multi-series diagnostics on the residuals. Just like in the single-series case, the goal is to make sure the residuals look like random white noise with no leftover patterns. He plots the P-values of Ljung-Box tests for vector processes to confirm the model fits well.
4.  **Real-World Canada Macroeconomic Data**: He loads a famous dataset representing Canadian employment, production, wages, and unemployment. He fits a VAR(2) and a VARMA(1,1) model to the data, generates 10-step forecasts, and compares them using the **Akaike Information Criterion (AIC)**. The VAR(2) model achieves a lower AIC, proving it is the superior model for this macroeconomic data.

---

## Key R Packages Used

- **`vars`** — The standard R package for Vector Autoregression (VAR) modeling. Contains functions like `VAR()` for estimation, and `predict()` for forecasting.
- **`MTS`** — The "Multivariate Time Series" package by Ruey S. Tsay. Contains specialized functions for Vector Moving Average (`VMA()`), Vector ARMA (`vrma()`), Vector ARMA forecasting (`vrmaPred()`), and multivariate diagnostics (`MTSdiag()`).

---

## Hands-On Diagnostic Workflow (R Script)

```R
# ==========================================
# PART 1: Package installation and loading
# ==========================================
install.packages("vars")
install.packages("MTS")

library(vars)
library(MTS)

# ==========================================
# PART 2: Simulating Bivariate Time Series
# ==========================================
set.seed(123) # Ensure reproducibility

# Define sample size
n_obs <- 200

# 1. Generate two independent normal white noise series
E1 <- rnorm(n_obs, mean = 0, sd = 1)
E2 <- rnorm(n_obs, mean = 0, sd = 1)

# 2. Filter E1 and E2 using recursive linear filters to induce cross-dependencies
y1 <- filter(E1, filter = c(0.5, -0.3), method = "recursive")
y2 <- filter(E2, filter = c(0.4, 0.2), method = "recursive")

# 3. Combine the series into a matrix and format as a Time Series object
sim_data <- cbind(y1, y2)
colnames(sim_data) <- c("series1", "series2")
sim_data_ts <- ts(sim_data)

# Visual check of the simulated bivariate paths
plot.ts(sim_data_ts, main = "Simulated Bivariate Time Series", col = c("black", "blue"))

# ==========================================
# PART 3: Fitting VAR, VMA, and VARMA Models
# ==========================================

# --- 1. Vector Autoregression (VAR) ---
# Fit a VAR(2) model on the simulated data
var_model <- VAR(sim_data_ts, p = 2)
summary(var_model) # Inspect coefficients, standard errors, and AIC/BIC

# Forecast 30 steps ahead using VAR(2)
var_forecast <- predict(var_model, n.ahead = 30)

# Plot actual series 1 and superimpose VAR forecasts (in red)
plot(sim_data[1:200, 1], xlim = c(1, 230), type = "l", main = "VAR(2) Forecast - Series 1")
lines(201:230, var_forecast$fcst$series1[, 1], col = "red", lwd = 2)

# --- 2. Vector Moving Average (VMA) ---
# Fit a VMA(2) model on the simulated data using the MTS package
vma_model <- VMA(sim_data_ts, q = 2)
summary(vma_model)

# --- 3. Vector ARMA (VARMA) ---
# Fit a VARMA(1, 1) model on the simulated data
varma_model <- vrma(sim_data_ts, p = 1, q = 1)
summary(varma_model)

# Forecast 30 steps ahead using VARMA(1, 1)
varma_forecast <- vrmaPred(varma_model, h = 30)

# Plot actual series 1 and superimpose VARMA forecasts (in red)
plot(sim_data[1:200, 1], xlim = c(1, 230), type = "l", main = "VARMA(1,1) Forecast - Series 1")
lines(201:230, varma_forecast$pred[, 1], col = "red", lwd = 2)

# --- 4. Multivariate Diagnostics ---
# Check residuals of the VARMA model using MTS diagnostic suite
# This generates residual plots and Ljung-Box P-value plots for cross-correlations
MTSdiag(varma_model)

# ==========================================
# PART 4: Real-World Data Application (Canada)
# ==========================================
# Load the macroeconomic 'Canada' dataset from the 'vars' package
# Series: e (employment), prod (labor productivity), rw (real wage), U (unemployment rate)
data(Canada)
plot(Canada, main = "Canada Macroeconomic Data")

# --- 1. Fit VAR(2) ---
var_canada <- VAR(Canada, p = 2)
summary(var_canada)

# Forecast 10 steps ahead using VAR(2)
var_fcst_canada <- predict(var_canada, n.ahead = 10)
plot(var_fcst_canada) # Displays forecasts for e, prod, rw, U with error bands

# --- 2. Fit VARMA(1, 1) ---
varma_canada <- vrma(Canada, p = 1, q = 1)
summary(varma_canada)

# Forecast 10 steps ahead using VARMA(1, 1)
varma_fcst_canada <- vrmaPred(varma_canada, h = 10)

# --- 3. Model Comparison ---
# AIC for VAR(2): -6.30 (lower is better)
# AIC for VARMA(1,1): higher
# Conclusion: VAR(2) is selected as the superior model for Canada macro dataset.
```

---

## So what for SachNetra?

- **Experiments**: None. (This is a standard implementation walk-through).
- **Verdict**: **Park** — The code provides the implementation template in R. For SachNetra (which is Python-centric), we should use `statsmodels.tsa.api.VAR` to fit Vector Autoregression models, and `statsmodels.tsa.statespace.varmax.VARMAX` for Vector ARMA models. The key architectural takeaway is to **always use multivariate Ljung-Box test statistics (like Hosking's M-statistic, plotted automatically by `MTSdiag()`)** rather than checking univariate residual ACFs individually.

---

## Open questions

- How does Python's `statsmodels` library handle diagnostics for VAR/VARMAX models? Does it have a direct equivalent to `MTSdiag()` (plotting multivariate residual cross-correlations)? (Yes, `statsmodels` provides `VARResults.plot_acorr()` and multivariate Portmanteau test stats like `is_white_noise()`).
- In VAR modeling of stock returns, how do we handle non-stationarity? (Usually, raw stock prices are $I(1)$ and are differenced to log-returns before fitting VAR; if they are co-integrated, we must use a Vector Error Correction Model, or VECM, instead of a standard VAR).
