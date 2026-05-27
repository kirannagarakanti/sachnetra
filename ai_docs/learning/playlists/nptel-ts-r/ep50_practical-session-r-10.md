---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=KQq1scLbVSE
source_type: video
duration: ~28m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, volatility-modelling, r-lang, fgarch, rugarch, quantmod, garch-simulation, nya]
status: distilled
---

# Ep 50 — Practical Session in R · 10

> **Why Lijo watched this**: To review the hands-on simulation of ARCH(1), ARCH(2), GARCH(1,1), GARCH(2,1), and ARMA(1,2)+GARCH(1,1) processes, and to learn how to fit and forecast GARCH models on real-world equity data (NYSE Composite) using the `fGarch`, `rugarch`, and `quantmod` packages.

---

## ⏱ Worth watching? SKIP

Verdict: **SKIP**

This is an RStudio programming session where the presenter types and runs GARCH simulation and fitting scripts. You do not need to open the video because the complete code blocks, package workflows, and diagnostic interpretations have been fully documented below.

---

## What this episode is actually about (ELI12)

This practical session shows how to work with volatility models in R. It covers two main tasks:

1.  **Simulating Volatile Data**: We tell R the exact "rules of risk" (like intercept, shock reactiveness, and persistence coefficients) and have it generate artificial datasets for ARCH(1), ARCH(2), and GARCH(1,1). When we plot these, they show clear **volatility clustering**—clumps of highly volatile swings followed by quiet periods.
2.  **Fitting a GARCH Model to Real Stocks**: We fetch real daily price data for the NYSE Composite Index starting from 2020. 
    *   We convert the prices into daily returns (percentages).
    *   The return plot shows massive volatility spikes during the March 2020 Covid-19 crash.
    *   We fit a GARCH(1,1) model to this data. The model successfully extracts a daily "conditional standard deviation" (risk forecast) that tracks the market's swings, rising when the market panic occurs and decay-drifting lower when calm returns.
    *   Finally, we forecast this risk 10 days into the future.

---

## Complete R Script Workflow

Below is the complete R script covered in the session, incorporating syntax corrections for `fGarch` and `rugarch`:

### Scenario 1: Simulating ARCH and GARCH Processes

```R
# 1. Load Packages and Set Seed
library(fGarch)
library(rugarch)
library(quantmod)

set.seed(123)
n_obs <- 1000

# 2. Define Parameter Coefficients
omega_val <- 0.1
alpha1_val <- 0.5
alpha2_val <- 0.3
beta1_val <- 0.4

# -------------------------------------------------------------
# A. Simulating ARCH(1)
# -------------------------------------------------------------
spec_arch1 <- garchSpec(model = list(omega = omega_val, alpha = alpha1_val))
sim_arch1 <- garchSim(spec = spec_arch1, n = n_obs)
plot(sim_arch1, main = "Simulated ARCH(1) Process", col = "blue")

# -------------------------------------------------------------
# B. Simulating ARCH(2)
# -------------------------------------------------------------
spec_arch2 <- garchSpec(model = list(omega = omega_val, alpha = c(alpha1_val, alpha2_val)))
sim_arch2 <- garchSim(spec = spec_arch2, n = n_obs)
plot(sim_arch2, main = "Simulated ARCH(2) Process", col = "darkgreen")

# -------------------------------------------------------------
# C. Simulating GARCH(1,1)
# -------------------------------------------------------------
spec_garch11 <- garchSpec(model = list(omega = omega_val, alpha = alpha1_val, beta = beta1_val))
sim_garch11 <- garchSim(spec = spec_garch11, n = n_obs)
plot(sim_garch11, main = "Simulated GARCH(1,1) Process", col = "red")

# -------------------------------------------------------------
# D. Simulating GARCH(2,1)
# -------------------------------------------------------------
spec_garch21 <- garchSpec(model = list(omega = omega_val, alpha = c(alpha1_val, alpha2_val), beta = beta1_val))
sim_garch21 <- garchSim(spec = spec_garch21, n = n_obs)
plot(sim_garch21, main = "Simulated GARCH(2,1) Process", col = "darkred")

# -------------------------------------------------------------
# E. Simulating Joint ARMA(1,2) + GARCH(1,1)
# -------------------------------------------------------------
# ARMA coefficients: AR(1) = 0.7, MA(1) = -0.4, MA(2) = 0.3
spec_armagarch <- garchSpec(model = list(
  omega = omega_val, alpha = alpha1_val, beta = beta1_val,
  ar = 0.7, ma = c(-0.4, 0.3)
))
sim_armagarch <- garchSim(spec = spec_armagarch, n = n_obs)
plot(sim_armagarch, main = "Simulated ARMA(1,2) + GARCH(1,1) Process", col = "purple")
```

---

### Scenario 2: Fitting Real Equity returns (NYSE Composite Index)

```R
# 1. Fetch NYSE Composite Index Data (^NYA) from Yahoo Finance
getSymbols("^NYA", src = "yahoo", from = "2020-01-01")

# 2. Extract Closing Prices and Calculate Log Returns
nya_close <- Cl(NYA)
nya_returns <- diff(log(nya_close)) * 100
nya_returns <- na.omit(nya_returns)

# 3. Plot NYSE returns (Exposes volatility clustering in March 2020)
plot(nya_returns, main = "NYSE Composite Daily Returns", col = "blue")

# -------------------------------------------------------------
# A. Specify and Fit a Pure GARCH(1,1) Model (No Mean Model)
# -------------------------------------------------------------
# sGARCH = standard GARCH model
garch11_spec <- ugarchspec(
  variance.model = list(model = "sGARCH", garchOrder = c(1, 1)),
  mean.model = list(armaOrder = c(0, 0), include.mean = TRUE),
  distribution.model = "norm"
)

garch11_fit <- ugarchfit(spec = garch11_spec, data = nya_returns)
print(garch11_fit) # Inspect coefficients: omega, alpha1, beta1

# Plot GARCH Fits (Option 1: Conditional SD vs. Absolute Returns)
plot(garch11_fit, which = 1)
# Plot GARCH Fits (Option 3: Standardized Residuals QQ-Plot)
plot(garch11_fit, which = 9)

# Forecast volatility 10 days ahead
garch11_fc <- ugarchforecast(garch11_fit, n.ahead = 10)
print(garch11_fc)
plot(garch11_fc, which = 3) # Plot forecasted conditional standard deviation

# -------------------------------------------------------------
# B. Specify and Fit a Joint ARMA(1,2) + GARCH(1,1) Model
# -------------------------------------------------------------
armagarch_spec <- ugarchspec(
  variance.model = list(model = "sGARCH", garchOrder = c(1, 1)),
  mean.model = list(armaOrder = c(1, 2), include.mean = TRUE),
  distribution.model = "norm"
)

armagarch_fit <- ugarchfit(spec = armagarch_spec, data = nya_returns)
print(armagarch_fit)
plot(armagarch_fit, which = 1)
```

---

## Diagnostic Workflows & Interpretations

1.  **Sizing the Persistence Term ($\alpha + \beta$)**:
    When looking at the GARCH(1,1) parameters in the printout of `print(garch11_fit)`:
    *   `alpha1` ($\alpha$) represents the volatility reaction to daily price shocks.
    *   `beta1` ($\beta$) represents the volatility persistence (the memory of yesterday's risk).
    *   In the NYSE Composite fit, $\alpha_1 + \beta_1$ is typically very close to 1 (e.g. $0.09 + 0.89 = 0.98$). This signifies high volatility persistence—if a shock hits the market today, the risk will remain elevated for several weeks (long memory).
2.  **Evaluating Fit Quality via Standardized Residuals**:
    After fitting the GARCH model, you must check the standardized residuals $\hat{\epsilon}_t = \hat{e}_t / \hat{\sigma}_t$:
    *   Run a Ljung-Box test on the squared standardized residuals. If the p-value is greater than 0.05, we fail to reject the null hypothesis of no remaining serial correlation. This confirms the GARCH model has successfully accounted for all conditional heteroscedasticity.
    *   Plotting a QQ-plot of the standardized residuals (Option 9 in `rugarch` plot menu) reveals whether the standard normal distribution assumption holds. In financial indices, the QQ-plot will show heavy deviations in the tails, suggesting that a Student's $t$ or GED distribution model (e.g., `distribution.model = "std"`) should be used instead of `"norm"`.

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 40: Systematic Evaluation of rugarch vs. arch Python Packages for Event-Driven Volatility Estimation** - Standardize a pipeline in Python using `arch.univariate` that mimics the `rugarch` workflow (`ugarchspec` $\to$ `ugarchfit`). Benchmark estimated GARCH(1,1) coefficients on post-filing return histories to confirm that Python's MLE optimization matches R's numerical output for the same daily input vectors.
- **Verdict**: **Pursue** - Standardizing the implementation between R-prototyping and Python-production ensures identical risk forecasts and prevents model mismatch during execution.

---

## Open questions

- How does changing the GARCH distribution parameter to `std` (Student's $t$) in `rugarch` affect the significance of the $\alpha$ and $\beta$ coefficients?
- In `ugarchforecast`, what is the mathematical decay rate of the forecasted variance as it reverts to the unconditional mean?
