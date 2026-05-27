---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=7XbhC5wR6xQ
source_type: video
duration: ~28m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, volatility, arch-model, historical-volatility, leverage-effect, tower-property]
status: distilled
---

# Ep 47 — ARCH Models

> **Why Lijo watched this**: To study the limitations of Historical Volatility, understand the model building workflow for time-varying variance, examine the formal structure of the Autoregressive Conditional Heteroscedastic (ARCH) model, and derive the properties of the ARCH(1) process.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture covers the complete mathematical transition to ARCH models. Focus on **1:20 to 5:40** to understand the specific limitations of Historical Volatility (such as time-window sensitivity and backward-looking bias). The most critical section is **15:20 to 18:30**, which details the 4-step model-building workflow for conditional heteroscedasticity. Watch **20:00 to 26:10** for the mathematical derivation of the ARCH(1) properties, specifically how the Tower Property (Law of Iterated Expectations) is used to find its finite unconditional variance.

---

## What this episode is actually about (ELI12)

If you want to measure stock market risk, you can calculate **Historical Volatility** by simply finding the standard deviation of past returns over a window (like the last 20 or 100 days). But this has major flaws: it looks backward, it's highly sensitive to how many days you choose, and it treats a single outlier (like a one-day crash) as a permanent risk spike for the next 100 days.

To solve this, Robert Engle invented the **ARCH model** in 1982. Instead of treating volatility as a flat historical average, ARCH models it as a system with two levels:
1.  **The Shock ($e_t$)**: The daily surprise return (residual) is written as a combination of today's volatility and a random draw: $e_t = \sigma_t \epsilon_t$.
2.  **The Volatility Equation ($\sigma_t^2$)**: Today's variance is modeled like an Autoregressive (AR) process, depending on the squares of *yesterday's* actual surprises: $\sigma_t^2 = \alpha_0 + \alpha_1 e_{t-1}^2 + \dots$.

By connecting today's risk to yesterday's squared surprises, the model naturally captures **volatility clustering**—a big shock yesterday increases the risk forecast for today.

---

## Key Concepts Introduced

- **Historical Volatility (HV)** — A backward-looking measure of risk calculated as the annualized standard deviation of daily asset returns over a fixed rolling past window.
- **ARCH($m$) Model** — An Autoregressive Conditional Heteroscedastic model of order $m$ where the current conditional variance is modeled as a linear function of the past $m$ squared residuals.
- **Mean-Variance Joint Estimation** — A modeling framework where the conditional mean (e.g. ARIMA) and conditional variance (e.g. ARCH) are estimated simultaneously, typically via Maximum Likelihood Estimation (MLE).
- **ARCH Effects Test** — A statistical diagnostic check on residuals to see if they exhibit serial correlation in their squared values, which signifies time-varying variance.
- **Law of Iterated Expectations (Tower Property)** — A probability theorem stating that the unconditional expectation of a conditional expectation is the unconditional expectation itself: $E[X] = E[E[X \mid Y]]$.
- **Parameter Explosion** — A drawback of the ARCH model where capturing long-memory volatility requires a very high order $m$, resulting in too many parameters to estimate.

---

## Mathematical Formulations & Derivations

### 1. The Volatility Modeling Workflow
To build a complete model capturing both mean and variance dynamics:
1.  **Mean Modeling**: Fit an $\text{ARMA}(p,q)$ model to the returns $Y_t$ to remove serial correlation:
    $$Y_t = \mu_t + e_t$$
    $$\mu_t = \phi_0 + \sum_{i=1}^{p} \phi_i Y_{t-i} + \sum_{j=1}^{q} \theta_j e_{t-j}$$
2.  **ARCH Testing**: Test the extracted residuals $e_t$ for heteroscedasticity by checking if $e_t^2$ has serial correlation.
3.  **Joint Estimation**: Specify a conditional variance model $\sigma_t^2$ and estimate all coefficients ($\phi$, $\theta$, $\alpha$) jointly via Maximum Likelihood.
4.  **Diagnostics**: Standardize the residuals: $\hat{\epsilon}_t = \hat{e}_t / \hat{\sigma}_t$. Verify that $\hat{\epsilon}_t$ is I.I.D. white noise with no remaining ARCH effects.

---

### 2. ARCH($m$) Mathematical Setup
The residual $e_t$ is formulated as:
$$e_t = \sigma_t \epsilon_t$$
Where:
- $\epsilon_t \sim \text{I.I.D.}$ with $E[\epsilon_t] = 0$ and $\text{Var}(\epsilon_t) = 1$.
- The conditional variance $\sigma_t^2 = \text{Var}(e_t \mid \mathcal{F}_{t-1})$ is:
  $$\sigma_t^2 = \alpha_0 + \alpha_1 e_{t-1}^2 + \alpha_2 e_{t-2}^2 + \dots + \alpha_m e_{t-m}^2$$
- Non-negativity constraints: $\alpha_0 > 0$, and $\alpha_i \ge 0$ for $i = 1, \dots, m$.

---

### 3. Derivation of ARCH(1) Properties
Consider the ARCH(1) process:
$$e_t = \sigma_t \epsilon_t, \quad \sigma_t^2 = \alpha_0 + \alpha_1 e_{t-1}^2$$

#### A. Unconditional Mean of Shocks ($e_t$)
Using the Tower Property:
$$E[e_t] = E\left[ E[e_t \mid \mathcal{F}_{t-1}] \right] = E\left[ E[\sigma_t \epsilon_t \mid \mathcal{F}_{t-1}] \right]$$
Since $\sigma_t$ is determined at time $t-1$ (it is $\mathcal{F}_{t-1}$-measurable):
$$E[e_t] = E\left[ \sigma_t E[\epsilon_t \mid \mathcal{F}_{t-1}] \right] = E[\sigma_t \cdot 0] = 0$$

#### B. Unconditional Variance of Shocks ($e_t$)
Since the mean $E[e_t] = 0$, the unconditional variance is $E[e_t^2]$:
$$\text{Var}(e_t) = E[e_t^2] = E\left[ E[e_t^2 \mid \mathcal{F}_{t-1}] \right] = E[\sigma_t^2]$$
Substitute the volatility equation:
$$E[e_t^2] = E[\alpha_0 + \alpha_1 e_{t-1}^2] = \alpha_0 + \alpha_1 E[e_{t-1}^2]$$
Assuming covariance stationarity, the unconditional variance is constant over time, so $E[e_t^2] = E[e_{t-1}^2] = V$:
$$V = \alpha_0 + \alpha_1 V \implies V(1 - \alpha_1) = \alpha_0 \implies \text{Var}(e_t) = \frac{\alpha_0}{1 - \alpha_1}$$
*   **Stationarity Condition**: This requires $0 \le \alpha_1 < 1$ for the unconditional variance to be finite and positive.

---

## Limitations of ARCH Models

1.  **Symmetric Volatility Response**: Because past shocks enter the variance equation as squares ($e_{t-i}^2$), positive shocks (price jumps) and negative shocks (price drops) of the same size have the identical expansionary effect on risk. This violates the empirical **leverage effect**.
2.  **Over-predicts Volatility**: The model is slow to adjust to isolated large shocks, causing it to over-predict risk for a long period after the shock.
3.  **High Parameter Dimensionality**: If the volatility memory is long, modeling it requires a very large $m$, leading to parameter explosion and numerical instability during MLE estimation.

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 37: ARCH(1) vs. Historical Volatility for Post-Event Position Sizing Optimization** - Implement a backtesting script that compares two risk management protocols for event-driven trading: one that sizes positions using standard 20-day historical volatility (HV), and another that uses a calibrated ARCH(1) model. Measure whether the ARCH(1) model reduces maximum drawdowns by reacting faster to post-event volatility spikes compared to the slow-decaying HV.
- **Verdict**: **Pursue** - ARCH(1) offers a theoretically superior, reactive way to adjust position sizing dynamically compared to static rolling windows.

---

## Open questions

- How do we test for the presence of ARCH effects formally using the Lagrange Multiplier (LM) test?
- How does the GARCH model solve the parameter explosion issue of ARCH by adding autoregressive terms to the variance itself?
