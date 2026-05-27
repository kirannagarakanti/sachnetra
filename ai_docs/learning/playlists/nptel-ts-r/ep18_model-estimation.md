---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=03zDPbUpkpc
source_type: video
duration: ~30m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, model-estimation, Yule-Walker, MOM, MLE, OLS, ESACF, MINIC]
status: distilled
---

# Ep 18 — Model Estimation and Parameter Selection

> **Why Lijo watched this**: To understand the math behind parameter estimation (Method of Moments, Maximum Likelihood, and OLS) and learn how tools like ESACF and MINIC help identify order candidates.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture is divided into two sections. First, watch **02:50 to 08:35** to learn how ESACF (iterated least squares) and MINIC (combining AIC and BIC) programmatically identify optimal orders. Then, watch **11:40 to 21:00** for the mathematical derivation of Yule-Walker (Method of Moments) parameter estimation. The latter part on MLE and conditional least squares can be skimmed if you are already familiar with standard regression optimization.

---

## What this episode is actually about (ELI12)

Once we identify what kind of model we want (like an AR(1) model), we need to calculate the exact numbers (coefficients) to put in the formula. If our formula is $Y_t = \phi Y_{t-1} + \text{error}$, we need to find the best value for $\phi$.

This video shows three ways to calculate this number:
1. **Method of Moments (Yule-Walker)**: We look at the correlation of the data and match it directly to the math formulas. It's simple but only works well for pure AR models with lots of data.
2. **Maximum Likelihood (MLE)**: We assume the errors follow a normal distribution (bell curve) and use computer algorithms to find the coefficients that make the data we observed "most likely" to happen.
3. **Least Squares (OLS)**: We try to find the coefficients that minimize the squared difference between our model's predictions and actual historical values.

---

## Key concepts introduced

- **Extended Sample Autocorrelation Function (ESACF)** — A diagnostic tool that tentatively identifies ARMA orders by applying iterated least squares estimation to the AR parameters. Unlike standard ACF, it works for both stationary and non-stationary series.
- **Minimum Information Criterion (MINIC)** — An automated order selection method that generates a grid search of models, computes both AIC and BIC, and highlights the cells with the minimum values.
- **Yule-Walker Estimation (Method of Moments)** — An estimation method that matches population characteristics (like population variance and autocorrelation) directly to their sample equivalents.
- **Conditional Least Squares** — An optimization method that estimates coefficients by directly minimizing the sum of squared residuals, conditioned on starting values.

---

## Order Selection Tools: ESACF & MINIC

To avoid manual reading of messy ACF/PACF graphs:
*   **ESACF**: Estimates the AR part using least squares, filters out the AR effect, and then analyzes the remaining MA effect.
*   **MINIC Table**: Combines AIC and BIC into a matrix. 
    *   **Structure**: Columns represent MA orders, rows represent AR orders.
    *   **Selection**: The cell with the lowest value indicates the optimal order.
    *   *Example from the lecture*: The cell corresponding to $\text{AR}=1, \text{MA}=0$ returned the minimum value of $-0.03571$, identifying a pure $\text{AR}(1)$ process.

---

## Parameter Estimation Methods Compared

| Estimation Method | Math Logic | Pros | Cons |
|---|---|---|---|
| **Method of Moments (Yule-Walker)** | Equates population autocovariances to sample autocovariances: $\rho_1 = \phi \implies \hat{\phi} = \hat{\rho}_1$. | Very simple to compute; closed-form solutions. | Only works well for pure AR processes; requires very large sample sizes ($n$); inefficient. |
| **Maximum Likelihood (MLE)** | Assumes $\varepsilon_t \sim \text{IID } N(0, \sigma_e^2)$ and maximizes the joint probability density function of the errors. | Asymptotically unbiased, efficient, sufficient, and consistent. | Requires numerical optimization (e.g. Newton-Raphson); joint PDF of raw data is highly complex due to dependencies. |
| **Least Squares (OLS)** | Minimizes the Sum of Squared Errors: $\text{SSE} = \sum (Y_t - \phi Y_{t-1})^2$. | Direct optimization logic; matches classical regression. | Requires starting values (conditional on boundary assumptions). |

---

## Worked Example: Estimating AR(1) Parameters via MOM

For an $\text{AR}(1)$ process:
$$Y_t = \phi Y_{t-1} + \varepsilon_t$$

1. **Estimate $\phi$**:
   Since the theoretical correlation $\rho_1 = \phi$, the MOM estimator is simply the first sample lag correlation:
   $$\hat{\phi} = \hat{\rho}_1 = \frac{\sum (Y_t - \bar{Y})(Y_{t-1} - \bar{Y})}{\sum (Y_t - \bar{Y})^2}$$

2. **Estimate Error Variance $\sigma_e^2$**:
   The theoretical variance of an $\text{AR}(1)$ process is $\gamma_0 = \frac{\sigma_e^2}{1-\phi^2}$.
   Rearranging for the error variance:
   $$\hat{\sigma}_e^2 = \hat{\gamma}_0 (1 - \hat{\phi}^2)$$
   where $\hat{\gamma}_0$ is the sample variance.

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 14: Compare MOM vs. MLE Parameter Sensitivity** — When fitting $\text{AR}(1)$ to daily abnormal returns, compare the stability of $\hat{\phi}$ estimated via Yule-Walker vs. MLE. If MLE parameters exhibit lower out-of-sample variance, lock MLE as the default estimator.
- **Verdict**: **Pursue** — Standardize the parameter estimation method. Python's `statsmodels` uses MLE by default (via state space representation), which matches the most robust mathematical approach discussed in this lecture.

---

## Open questions

- In cases of extreme return outliers (common in corporate filing studies), does Least Squares (OLS) or MLE get skewed more easily than Method of Moments?
- Next step is Diagnostic Checking (residuals analysis). What specific tests (e.g. Ljung-Box test) will the professor introduce to verify that residual errors are white noise?
