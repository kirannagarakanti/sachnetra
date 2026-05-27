---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=Wm7MlxDPWYY
source_type: video
duration: ~30m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, cointegration, spurious-regression, non-stationarity, pair-trading, equilibrium]
status: distilled
---

# Ep 37 — Co-integration - Introduction

> **Why Lijo watched this**: To understand the difference between spurious regression and genuine cointegration, learn the formal definition of cointegration vectors and ranks, and explore why cointegration is a powerful tool for asset pair trading.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This is the foundational lecture on cointegration. Focus on **1:40 to 3:35** for the intuitive example of spurious regression (ice cream sales vs. Virat Kohli's runs). Watch **5:40 to 9:30** to see how regressing two independent $I(1)$ random walks yields highly significant but completely false relationships. Finally, watch **9:31 to 16:50** for the mathematical construction of a common stochastic trend, proving how a linear combination of two $I(1)$ series can create a stationary $I(0)$ series (cointegration).

---

## What this episode is actually about (ELI12)

If you regress two completely unrelated growing trends on each other (like the sales of ice cream and the number of runs a cricket player scores), a standard statistical test might tell you they are highly related. This is called a **spurious (fake) regression**. In time series, if two variables are climbing or falling over time independently (they are "integrated of order 1," or $I(1)$), running a regression on them almost always results in a fake correlation because of their trends.

However, sometimes two trending series are actually tied together by an invisible rubber band because they share a **common stochastic trend**. For example, the stock price of HDFC Bank ($Y_t$) and ICICI Bank ($X_t$) both drift randomly over time. But because they belong to the same sector, they are driven by the same economic engine. 

Even though both stock prices are non-stationary on their own, if you calculate the difference between them (or a weighted combination like $Y_t - \beta X_t$), the trend disappears, and the resulting series is stationary ($I(0)$). The two stocks are **cointegrated**, the weights $\beta$ make up the **cointegration vector**, and the stationary combination represents their **long-run equilibrium**. If the rubber band stretches too far (short-term deviation), traders know the prices must eventually converge back to equilibrium.

---

## Key concepts introduced

- **Spurious Regression** — An artificial statistical relationship where two independent, non-stationary time series appear to be highly correlated with significant $t$-statistics and high $R^2$, despite having no logical connection.
- **$I(0)$ Process** — A stationary time series with a constant mean and variance that does not require differencing.
- **$I(1)$ Process** — A non-stationary time series containing a stochastic trend that becomes stationary ($I(0)$) after differencing once.
- **Cointegration** — A property where a linear combination of two or more non-stationary $I(1)$ variables is stationary ($I(0)$).
- **Common Stochastic Trend** — An underlying non-stationary random walk shared by multiple time series that drives their long-term co-movements.
- **Cointegration Vector ($\beta$)** — The set of weights that combines non-stationary variables to form a stationary series.
- **Cointegration Rank** — The number of linearly independent cointegration vectors in a multivariate system.

---

## Mathematical Formulations & Examples

### 1. Spurious Regression of Independent Random Walks
Let $X_t$ and $Y_t$ be independent random walks ($I(1)$ processes):
$$X_t = X_{t-1} + v_t \quad \text{where } v_t \sim \text{WN}(0, 1)$$
$$Y_t = Y_{t-1} + u_t \quad \text{where } u_t \sim \text{WN}(0, 1)$$
Even though $v_t$ and $u_t$ are independent, a standard OLS regression:
$$Y_t = \alpha + \beta X_t + e_t$$
often yields a highly statistically significant coefficient ($\hat{\beta}$) with an extremely small P-value ($< 2 \times 10^{-16}$) and a moderate to high $R^2$ (e.g., $56\%$). This is because the variance of $X_t$ and $Y_t$ grows with time, violating the assumptions of standard OLS and inflating $t$-statistics.

---

### 2. Common Stochastic Trend & Cointegration
Now, consider a shared random walk trend $i_t$:
$$i_t = i_{t-1} + w_t \quad \text{where } w_t \sim \text{WN}(0, 1) \quad (\text{so } i_t \text{ is } I(1))$$
Let $X_t$ and $Y_t$ be constructed as:
$$X_t = 6 i_t + v_t \quad \text{where } v_t \sim \text{WN}(0, 1)$$
$$Y_t = 6 i_t + u_t \quad \text{where } u_t \sim \text{WN}(0, 1)$$
*   **Individual Properties**: Both $X_t$ and $Y_t$ are $I(1)$ because they are driven by the non-stationary trend $i_t$.
*   **First-Difference Regression**: Differencing makes both series stationary. Regressing $\nabla Y_t$ on $\nabla X_t$ yields a very low $R^2 \approx 0$, showing that their day-to-day changes are uncorrelated.
*   **Cointegration Relationship**:
    Subtracting the two equations:
    $$Y_t - X_t = u_t - v_t$$
    Since $u_t$ and $v_t$ are stationary white noise processes, the combination $Y_t - X_t$ (or $Y_t - \frac{1}{6}X_t$ depending on coefficient scaling) is stationary ($I(0)$). 
    There exists a cointegration vector $\beta = [1, -1]^T$ (or $\beta = [1, -1/6]^T$) such that:
    $$\beta^T \begin{bmatrix} Y_t \\ X_t \end{bmatrix} \sim I(0)$$

---

### 3. General Multivariate Cointegration
A $K$-dimensional vector process $Y_t$ is cointegrated of order $D, C$, denoted $Y_t \sim \text{CI}(D, C)$, if:
1.  All components of $Y_t$ are integrated of order $D$ ($I(D)$).
2.  There exists a non-zero vector $\beta$ (the cointegration vector) such that the linear combination:
    $$Z_t = \beta^T Y_t \sim I(D - C) \quad \text{where } D \ge C > 0$$

In financial and macroeconomic applications, we almost exclusively focus on the case where $D=1$ and $C=1$. This means the individual variables are non-stationary $I(1)$ series, but their linear combination is stationary $I(0)$.

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 28: Cointegration and Pair Trading of Nifty Sectoral Indices** — Perform the Engle-Granger two-step cointegration test on pairs of sectoral indices (e.g., Nifty Bank and Nifty Financial Services). Estimate the cointegration vector $\beta$ and check if the residuals $e_t = Y_t - \hat{\beta} X_t$ are stationary ($I(0)$). Design a trading strategy that goes long the underperformer and short the outperformer when $e_t$ deviates beyond $\pm 2$ standard deviations from its mean, betting on convergence.
- **Verdict**: **Pursue** — Cointegration is the theoretical backbone of statistical arbitrage and pair trading. It allows us to trade non-stationary asset prices without falling into the trap of spurious correlation.

---

## Open questions

- How do we formally test for cointegration? (The next lectures will cover the Engle-Granger residual-based test and Johansen's likelihood ratio test).
- What happens if there are more than two variables? (With $K > 2$ variables, there can be multiple cointegration vectors. Johansen's test is required to determine the cointegration rank, as the Engle-Granger test can only find a single relationship).
