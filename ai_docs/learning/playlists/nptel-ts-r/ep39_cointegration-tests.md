---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=DgBbh2M4raM
source_type: video
duration: ~28m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, cointegration, hypothesis-testing, engle-granger, johansen-test, ardl-bounds, crdw]
status: distilled
---

# Ep 39 — Co-integration Tests

> **Why Lijo watched this**: To compare the five main statistical tests for cointegration (Engle-Granger, Johansen, Phillips-Ouliaris, CRDW, and ARDL Bounds), understand their mathematical assumptions, and know when to apply each based on the number of variables and their integration orders.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture is a comprehensive catalog of cointegration tests. The first half (**6:13 to 10:45**) details the **Engle-Granger two-step test** and its residual-based unit root testing. The section from **10:50 to 15:15** is critical, explaining how the **Johansen test** handles multivariate systems using VECMs, trace statistics, and maximum eigenvalue statistics. Watch **21:22 to 24:58** for the **ARDL bounds test**, which is essential when analyzing mixed-integration systems (some $I(0)$ and some $I(1)$ series).

---

## What this episode is actually about (ELI12)

Once we suspect that multiple trending time series are tied together (cointegrated), we need a formal statistical test to prove it. This lecture introduces five different tests, each suited for different situations:

1.  **Engle-Granger Test**: The classic "two-step" test for exactly two variables. You regress one on the other, extract the residuals, and test if the residuals are stationary. If they are, the variables are cointegrated.
2.  **Johansen Test**: The heavyweight test for three or more variables. Instead of testing one pair at a time, it looks at the whole system simultaneously and tells you *how many* independent "rubber bands" (cointegration relationships) exist.
3.  **Phillips-Ouliaris Test**: A variation of the Engle-Granger test that is "robust"—meaning it still works even if the statistical errors are not normal or are correlated with themselves.
4.  **Durbin-Watson Test (CRDW)**: A quick cheat test. It looks at the correlation of the residuals from a levels regression. If the statistic is close to zero, it is a spurious regression; if it is high, the series are likely cointegrated.
5.  **ARDL Bounds Test**: The flexible test. Standard tests require all series to trend at the same speed ($I(1)$). But if you have a mix—some stable series ($I(0)$) and some trending series ($I(1)$)—the ARDL bounds test is the only one that works.

---

## Key Cointegration Tests Comparison

| Test | Best For | Mixed Integration? | Key Statistic | Null Hypothesis ($H_0$) |
|---|---|---|---|---|
| **Engle-Granger** | $K=2$ variables | No (requires all $I(1)$) | ADF $t$-statistic on residuals | No cointegration (residuals have unit root) |
| **Johansen** | $K \ge 3$ variables | No (requires all $I(1)$) | Trace & Max Eigenvalue stats | $r = r_0$ cointegrating relationships |
| **Phillips-Ouliaris** | Robust bivariate | No (requires all $I(1)$) | Phillips-Ouliaris Z-statistic | No cointegration |
| **CRDW** | Quick visual check | No (requires all $I(1)$) | Durbin-Watson $d$ | No cointegration ($d \approx 0$) |
| **ARDL Bounds** | Mixed variables | **Yes** (handles $I(0)$ and $I(1)$) | F-statistic on bounds | No long-run relationship |

---

## Mathematical Details of Key Tests

### 1. Engle-Granger Two-Step Test
Designed for bivariate ($K=2$) systems of $I(1)$ variables $Y_t$ and $X_t$.
*   **Step 1: Cointegrating Regression**
    Estimate the long-run relation via OLS:
    $$Y_t = \alpha + \beta X_t + \epsilon_t$$
    Extract the residuals: $\hat{\epsilon}_t = Y_t - \hat{\alpha} - \hat{\beta} X_t$.
*   **Step 2: Residual Unit Root Test**
    Run an ADF regression on $\hat{\epsilon}_t$ (without constant or trend):
    $$\Delta \hat{\epsilon}_t = \phi \hat{\epsilon}_{t-1} + \sum_{i=1}^p \psi_i \Delta \hat{\epsilon}_{t-i} + u_t$$
    Test $H_0: \phi = 0$ (unit root / no cointegration) vs. $H_1: \phi < 0$ (stationary / cointegrated). 
    *Note: Standard Dickey-Fuller critical values cannot be used because $\hat{\epsilon}_t$ is an estimated series. You must use Engle-Granger critical values.*

---

### 2. Johansen Test (VECM Framework)
For a $K$-dimensional vector process $Y_t$, write the VAR($p$) in VECM form:
$$\Delta Y_t = \mu + \Pi Y_{t-1} + \sum_{i=1}^{p-1} \Gamma_i \Delta Y_{t-i} + E_t$$
Where $\Pi = \sum_{i=1}^p \Phi_i - I_K$. The rank of the matrix $\Pi$ (denoted $r$) represents the number of cointegrating vectors.
-   If $\text{rank}(\Pi) = 0$, there are no cointegrating relationships (VECM reduces to a VAR in differences).
-   If $\text{rank}(\Pi) = K$, all variables are stationary in levels ($I(0)$).
-   If $0 < \text{rank}(\Pi) = r < K$, there are $r$ cointegrating vectors, and $\Pi = \alpha \beta^T$, where $\beta$ is the $K \times r$ matrix of cointegrating vectors and $\alpha$ is the $K \times r$ matrix of adjustment speeds.

Johansen provides two statistics to test the rank $r$:
1.  **Trace Test**:
    $$\lambda_{\text{trace}}(r_0) = -T \sum_{i=r_0+1}^K \ln(1 - \hat{\lambda}_i)$$
    $H_0: r \le r_0$ cointegrating vectors vs. $H_1: r > r_0$.
2.  **Maximum Eigenvalue Test**:
    $$\lambda_{\text{max}}(r_0, r_0+1) = -T \ln(1 - \hat{\lambda}_{r_0+1})$$
    $H_0: r = r_0$ cointegrating vectors vs. $H_1: r = r_0 + 1$.

---

### 3. Cointegrating Regression Durbin-Watson (CRDW)
Run the levels regression $Y_t = \alpha + \beta X_t + \epsilon_t$ and compute the Durbin-Watson statistic on the residuals:
$$d = \frac{\sum (\hat{\epsilon}_t - \hat{\epsilon}_{t-1})^2}{\sum \hat{\epsilon}_t^2}$$
-   Under $H_0$ (no cointegration), the residuals are a random walk, meaning $\hat{\epsilon}_t \approx \hat{\epsilon}_{t-1} + u_t$, so $d \approx 0$.
-   Under $H_1$ (cointegration), the residuals are stationary $I(0)$, so $d$ is significantly greater than $0$ (typically $d > 0.38$ for $N=100$).

---

### 4. ARDL Bounds Test
Used when variables are a mix of $I(0)$ and $I(1)$. It estimates an unrestricted error correction model:
$$\Delta Y_t = \theta_0 + \theta_1 Y_{t-1} + \theta_2 X_{t-1} + \sum \omega_i \Delta Y_{t-i} + \sum \delta_j \Delta X_{t-j} + u_t$$
Test the joint null hypothesis that there is no long-run relationship:
$$H_0: \theta_1 = \theta_2 = 0$$
The F-statistic is compared against two sets of critical values (bounds) generated by Pesaran:
-   **Lower Bound**: Assumes all variables are $I(0)$.
-   **Upper Bound**: Assumes all variables are $I(1)$.
-   **Decision Rule**:
    -   If $F_{\text{calc}} > \text{Upper Bound}$, reject $H_0$ (cointegration exists).
    -   If $F_{\text{calc}} < \text{Lower Bound}$, fail to reject $H_0$ (no cointegration).
    -   If $\text{Lower Bound} < F_{\text{calc}} < \text{Upper Bound}$, the test is inconclusive.

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 30: Mixed-Frequency Cointegration via ARDL Bounds Testing for Macro Indicators and Asset Prices** — Regress weekly index returns ($I(0)$) on monthly macroeconomic indicators (like inflation rates, which are $I(1)$). Apply the ARDL bounds test to see if a significant long-run relationship exists despite the mixed integration levels. If confirmed, use the ARDL model to forecast index return movements.
- **Verdict**: **Pursue** — The ARDL Bounds test is a crucial tool because real-world trading data is rarely clean; stock returns are stationary $I(0)$ while macroeconomic fundamentals like interest rates, CPI, or GDP are non-stationary $I(1)$. This test allows us to link them together without losing information.

---

## Open questions

- How do we implement the Johansen and Engle-Granger tests in Python? (In Python, `statsmodels.tsa.stattools.coint` implements the Engle-Granger test, and `statsmodels.tsa.vector_ar.vecm.coint_johansen` implements Johansen's test).
- How do we calculate the critical values for the ARDL bounds test in Python? (The `statsmodels` library does not have a native ARDL bounds test utility; we may need to use a specialized library like `arch` or write a custom wrapper to check Pesaran's table bounds).
