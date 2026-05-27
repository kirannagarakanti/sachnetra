---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=OJ8M6XLJ3HM
source_type: video
duration: ~31m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, R-lang, diagnostic-checking, residuals, normality, Box-test, White-test, checkresiduals]
status: distilled
---

# Ep 21 — Practical Session in R · 4

> **Why Lijo watched this**: To see the step-by-step residual diagnostic testing pipeline implemented in R, including normality tests, Ljung-Box autocorrelation tests, squared residual ACF plots, White's heteroscedasticity test, and the checkresiduals shortcut.

---

## ⏱ Worth watching? SKIP

Verdict: **SKIP**

This is an R practical session. If you are coding in Python, you can skip this video. The entire R script, simulation details, and diagnostic outputs are fully documented below.

---

## What this episode is actually about (ELI12)

This video is a hands-on coding session that teaches how to run residual quality checks on a fitted model:
1. We simulate 10 vs. 1000 normal random numbers to show how larger samples look more symmetric and average out closer to zero.
2. We load the bank loan data and fit our ARIMA(0,2,1) model.
3. We extract the errors (residuals) and run them through our testing pipeline:
   - **Normality**: Shapiro-Wilk and Jarque-Bera tests confirm the errors follow a bell curve.
   - **Independence**: Box-Pierce and Ljung-Box tests confirm the errors have no serial correlation (no connection to past errors).
   - **Constant Variance**: White's test and the ACF of squared residuals confirm the size of the errors is stable.
4. We look at an R shortcut function `checkresiduals()` that runs all these checks and draws the plots in a single line of code.

---

## Hands-On Diagnostic Workflow (R Script)

```R
# 1. Setup Environment
library(tseries)
library(forecast)

# ==========================================
# PART 1: Gaussian White Noise Simulation
# ==========================================
# Small sample (n=10)
x_small <- rnorm(10, mean=0, sd=1)
hist(x_small) # Jagged, asymmetric, looks left-skewed
plot(x_small, type="l")
abline(h=mean(x_small), col="red") # Sample mean
abline(h=0, col="blue") # Theoretical mean (Large gap between red and blue lines)

# Large sample (n=1000)
x_large <- rnorm(1000, mean=0, sd=1)
hist(x_large) # Symmetric, bell-shaped density
plot(x_large, type="l")
abline(h=mean(x_large), col="red")
abline(h=0, col="blue") # Red and blue lines are virtually superimposed

# ==========================================
# PART 2: Diagnostic Checking (Bank Loan Data)
# ==========================================
# Ingest data and fit optimal ARIMA(0,2,1)
bank_case <- as.ts(scan("desktop/loans.txt"))
bank_fit <- Arima(bank_case, order=c(0, 2, 1)) # AIC = 26.1

# Extract residuals
res <- bank_fit$residuals

# 1. Visually check residuals
plot(res, type="l")
abline(h=0, col="blue") # Random fluctuations around 0, stable variance

# 2. Check Normality
hist(res) # Relatively symmetric histogram
shapiro.test(res) # P-value = 0.2337 (> 0.05) -> Fail to reject H0 (Normal)
jarque.bera.test(res) # P-value = 0.4571 (> 0.05) -> Fail to reject H0 (Normal)

# Normal QQ Plot
qqnorm(res)
qqline(res) # Points align on the diagonal line -> Normality holds

# Contrast with non-normal data (Chi-Squared sample)
x_chisq <- rchisq(100, df=4)
qqnorm(x_chisq)
qqline(x_chisq) # Extreme S-curve departures from diagonal -> Fails normality

# 3. Check Autocorrelation (Serial Correlation)
acf(res)  # Lags 1+ are inside 95% confidence bands
pacf(res) # Lags 1+ are inside 95% confidence bands

# Portmanteau Tests (Null: Residuals are independent)
box.test(res, lag=10, type="Box-Pierce") # P-value = 0.6278 -> Fail to reject H0 (Independent)
box.test(res, lag=10, type="Ljung-Box")  # P-value = 0.5188 -> Fail to reject H0 (Independent)

# 4. Check Heteroscedasticity (Constant Variance)
# Check ACF/PACF of squared residuals (proxy for variance)
acf(res^2)  # All lags inside 95% confidence bands
pacf(res^2) # All lags inside 95% confidence bands (Variance is stable)

# White's General Test (Null: Homoscedasticity)
white.test(res) # P-value = 0.8992 (> 0.05) -> Fail to reject H0 (Constant variance)

# ==========================================
# PART 3: The checkresiduals() Shortcut
# ==========================================
checkresiduals(bank_fit)
# In one line, this:
# - Plots the residual time series (top)
# - Plots the residual ACF (bottom-left)
# - Plots the residual histogram with normal overlay (bottom-right)
# - Prints Ljung-Box test results in the console
```

---

## So what for SachNetra?

- **Experiments**: None. (Implementation reference).
- **Verdict**: **Park** — The `checkresiduals()` function is highly convenient. In Python's `statsmodels`, we can replicate this exact visual layout using:
  - `model_fit.plot_diagnostics(figsize=(10, 8))` (which generates a time plot, histogram with normal overlay, QQ plot, and correlogram).
  - `statsmodels.stats.diagnostic.acorr_ljungbox(model_fit.resid, lags=[10], return_df=True)` (to replicate the portmanteau test output).

---

## Open questions

- Does Python's `plot_diagnostics` check for heteroscedasticity (e.g., via squared residual ACF or White's test)? (No, `plot_diagnostics` only displays raw residuals, so we must manually calculate and plot the ACF of `residuals**2` in our pipeline).
