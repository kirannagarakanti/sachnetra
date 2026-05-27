---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=8PdqJB-UYWw
source_type: video
duration: ~29m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, cointegration, error-correction-model, ecm, speed-of-adjustment, short-run-dynamics]
status: distilled
---

# Ep 38 — Co-integration and Error Correction Model

> **Why Lijo watched this**: To understand how the Error Correction Model (ECM) mathematically integrates short-run dynamics and long-run equilibrium relationships, and how to estimate the model using the Engle-Granger two-step procedure.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture connects cointegration theory to econometric modeling. Focus on **4:50 to 9:00** to understand the intuition of how ECM pulls diverging series back together. Watch **13:00 to 17:35** for the core mathematical formulation of the bivariate ECM, detailing the roles of the Speed of Adjustment ($\alpha$), the Error Correction Term (ECT), and the Short-term Coefficient ($\gamma$). Watch **19:00 to 22:00** for the step-by-step procedure to test, estimate, and fit an ECM.

---

## What this episode is actually about (ELI12)

Imagine a dog owner and a dog walking on a leash. The dog drifts left and right, sniffing bushes, while the owner walks in a straight line. In the short term, the distance between them stretches and shrinks (short-term deviation). But because they are connected by a leash (the cointegrating relationship), they cannot drift infinitely apart. In the long term, they travel in the exact same direction (long-run equilibrium).

If you only model their daily changes (by differencing the data), you lose the leash information completely. If you model their actual positions (without differencing), you violate statistical rules because they are non-stationary.

The **Error Correction Model (ECM)** solves this by modeling their changes, but throwing in a "correction leash" term. The model calculates the gap between the dog and owner yesterday. If the gap was large, the model applies a strong pull (using the **Speed of Adjustment** coefficient) to drag them back together today. In short, ECM is a formula that captures both the quick daily jumps (short-run dynamics) and the long-term correction pull (long-run equilibrium) in a mathematically safe way.

---

## Key Concepts Introduced

- **Error Correction Model (ECM)** — A stationary time series model that incorporates the first differences of cointegrated variables alongside a lagged error correction term to capture both short-run changes and long-run adjustment.
- **Error Correction Term (ECT)** — The lagged residual from the long-run cointegration regression ($Y_{t-1} - \beta X_{t-1}$), representing the degree of disequilibrium in the previous period. Matters because it is a stationary $I(0)$ variable that tells the model how far the system is from its equilibrium path.
- **Speed of Adjustment Coefficient ($\alpha$)** — The coefficient multiplying the ECT. It indicates how much of the disequilibrium from the previous period is corrected (wiped out) in the current period. Matters because it measures the system's resilience and convergence speed.
- **Short-term Coefficient ($\gamma$)** — The coefficient multiplying the contemporaneous first differences. Matters because it measures the immediate, direct impact of changes in the independent variable on the dependent variable, ignoring the long-run leash.

---

## Mathematical Formulations

### 1. Bivariate ECM Formulation
Let $X_t$ and $Y_t$ be non-stationary $I(1)$ processes that are cointegrated such that $Y_t - \beta X_t \sim I(0)$. 
The Error Correction Model (ECM) is formulated as:
$$\Delta Y_t = \alpha ( \beta X_{t-1} - Y_{t-1} ) + \gamma \Delta X_t + u_t$$
Where:
- $\Delta Y_t = Y_t - Y_{t-1}$ and $\Delta X_t = X_t - X_{t-1}$ are stationary $I(0)$ differences.
- $(\beta X_{t-1} - Y_{t-1})$ is the **Error Correction Term (ECT)**, which is stationary $I(0)$.
- $u_t$ is a stationary white noise error.
- **Duality of Variables**: Since all variables in this equation ($\Delta Y_t$, $\Delta X_t$, and the ECT) are stationary, standard OLS regression theory holds, and $t$-statistics are valid (no spurious regression).

---

### 2. Parameter Interpretation
1.  **Speed of Adjustment ($\alpha$)**:
    - Typically, if written in the form above, $\alpha > 0$ to ensure stability. If $Y_{t-1}$ is too high relative to its equilibrium level $\beta X_{t-1}$, then $(\beta X_{t-1} - Y_{t-1}) < 0$. A positive $\alpha$ forces $\Delta Y_t$ to be negative, dragging $Y_t$ back down toward the equilibrium.
    - If $\alpha = 0$, there is no error correction, and the variables are not cointegrated (the leash is broken).
    - The value of $\alpha$ represents the proportion of disequilibrium corrected in a single time step (e.g., $\alpha = 0.25$ means 25% of the deviation is corrected in the next period).
2.  **Short-run Dynamics ($\gamma$)**:
    - Captures the immediate shock transmission from $\Delta X_t$ to $\Delta Y_t$.

---

### 3. Step-by-Step Fitting Procedure (Engle-Granger Two-Step)
To fit an ECM on two series $X_t$ and $Y_t$:

1.  **Unit Root Testing**: Perform Augmented Dickey-Fuller (ADF) tests on $X_t$ and $Y_t$ to confirm both are $I(1)$ in levels and $I(0)$ in first differences.
2.  **Long-Run Regression**: Run OLS on the levels of the variables:
    $$Y_t = \beta X_t + e_t$$
    Save the estimated residuals: $\hat{e}_t = Y_t - \hat{\beta} X_t$.
3.  **Cointegration Test**: Run an ADF test on the residuals $\hat{e}_t$ (without constant or trend). If $\hat{e}_t$ is stationary $I(0)$, then $X_t$ and $Y_t$ are cointegrated.
4.  **Short-Run ECM Estimation**: Run OLS on the differenced equation, using the lagged residuals as the ECT:
    $$\Delta Y_t = -\alpha \hat{e}_{t-1} + \gamma \Delta X_t + u_t$$
    (Note: here, the negative sign is placed in front of $\alpha$ to match the standard convention $\hat{e}_{t-1} = Y_{t-1} - \hat{\beta} X_{t-1}$, meaning a positive $\alpha$ represents a correction).

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 29: Dynamic Portfolio Rebalancing via Engle-Granger Error Correction Models (ECM)** — Identify cointegrated stock pairs (e.g., HDFC Bank and ICICI Bank). Estimate the cointegrating vector $\hat{\beta}$ (long-run relationship) and fit the short-run ECM to estimate the Speed of Adjustment $\hat{\alpha}$. Use the estimated $\hat{\alpha}$ to optimize trade entry and exit timings: when the spread widens, enter trades only if the speed of adjustment $\hat{\alpha}$ is high enough to guarantee convergence within our holding-period horizon.
- **Verdict**: **Pursue** — The Speed of Adjustment ($\alpha$) is a critical metric for statistical arbitrage. It tells us how fast a spread converges, which translates directly to expected holding times and capital efficiency.

---

## Open questions

- How do we expand the bivariate ECM to a multivariate setting? (This leads to the Vector Error Correction Model, or VECM, which generalizes VAR models to handle cointegration).
- What if the relationship between the variables is non-linear? (Threshold Cointegration and Threshold VECM models are used when the correction only kicks in after deviations exceed a certain threshold).
