---
date: 2026-05-27
source_url: https://www.youtube.com/watch?v=Q0oZ7AiZvFQ
source_type: video
duration: ~28m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, nonlinear-models, setar-model, star-model, lstar, estar, transition-function]
status: distilled
---

# Ep 53 — Nonlinear Model Extensions

> **Why Lijo watched this**: To examine the theoretical extensions of the basic TAR model, specifically comparing the Self-Exciting TAR (SETAR) and Smooth Transition AR (STAR) models, and to study the mathematical formulations of Logistic (LSTAR) and Exponential (ESTAR) transition functions.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture covers the complete mathematical specifications for advanced regime-switching models. Focus on **2:50 to 6:20** for the high-level classifications of TAR extensions (SETAR, MTAR, and STAR). The most critical section is **9:45 to 16:30**, which details the mathematical structure of the STAR model and contrasts the Logistic (LSTAR) transition function with the Exponential (ESTAR) transition function. Watch **19:40 to 23:30** for the formal piecewise formulation of the SETAR model.

---

## What this episode is actually about (ELI12)

A basic Threshold Autoregressive (TAR) model allows a time series to switch rules when a variable crosses a line. This lecture covers how to make this idea much more powerful:

1.  **Self-Exciting TAR (SETAR)**: A model that switches rules based on its *own past values*. For example, "if the stock crashed yesterday, use the volatile rule today; otherwise, use the quiet rule." The model is "self-exciting" because it triggers its own state changes.
2.  **Momentum TAR (MTAR)**: A model that switches rules based on the *direction of movement* (momentum) rather than the absolute level. For example, "if prices are currently dropping (negative momentum), use the crash rule; if prices are rising, use the recovery rule."
3.  **Smooth Transition AR (STAR)**: Instead of jumping instantly between rules, the model glides smoothly using a transition function that outputs a value between 0 (Regime 1) and 1 (Regime 2).
    *   **Logistic STAR (LSTAR)**: Good for asymmetric shifts where the transition path from low-to-high is different from high-to-low (like an economic expansion turning into a recession).
    *   **Exponential STAR (ESTAR)**: Good for symmetric situations. The transition function depends on the squared distance from a middle target. If you are close to the target, the transition function is 0. If you drift too far in *either* direction (high or low), the function moves to 1 (like an exchange rate drifting too far from its official peg).

---

## Key Concepts Introduced

- **Self-Exciting TAR (SETAR)** — A threshold model where the threshold variable is a lagged observation of the series itself ($Y_{t-d}$), creating a self-referential switching system.
- **Momentum TAR (MTAR)** — A threshold model where the threshold variable is the first difference (momentum) of the series ($\Delta Y_{t-d}$), capturing changes in direction rather than levels.
- **Smooth Transition AR (STAR)** — A model class where the transition between regimes occurs gradually over a range of values governed by a continuous transition function.
- **LSTAR (Logistic STAR)** — A STAR model utilizing a logistic transition function, making it ideal for asymmetric, one-directional regime shifts.
- **ESTAR (Exponential STAR)** — A STAR model utilizing an exponential transition function, making it ideal for symmetric deviations from a central equilibrium.
- **Delay Parameter ($d$)** — The specific lag value of the time series ($t-d$) chosen to act as the threshold/transition variable.
- **Hansen's Test / Linearity Test** — A statistical test used to verify the presence of nonlinear regime switching against the null hypothesis of a simple linear AR process.

---

## Mathematical Formulations & Specifications

### 1. The STAR Model Structure
For a two-regime STAR model of order $p$ and delay $d$:
$$Y_t = \left(\phi_{1,0} + \sum_{i=1}^p \phi_{1,i} Y_{t-i}\right) + G(z_{t-d}; \gamma, c) \cdot \left(\psi_{2,0} + \sum_{i=1}^p \psi_{2,i} Y_{t-i}\right) + e_t$$
Where:
-   $\phi_{1,i}$ represents the AR parameters for the base regime.
-   $\psi_{2,i}$ represents the AR parameters for the second regime.
-   $G(z_{t-d}; \gamma, c) \in [0, 1]$ is the continuous transition function.

#### A. Logistic Transition Function (LSTAR)
$$G(z_{t-d}; \gamma, c) = \frac{1}{1 + e^{-\gamma (z_{t-d} - c)}}$$
*   As $z_{t-d} \to -\infty$, $G \to 0$ (entirely in Regime 1).
*   As $z_{t-d} \to +\infty$, $G \to 1$ (entirely in Regime 2).
*   *Application*: Asymmetric shifts (expansions vs. recessions).

#### B. Exponential Transition Function (ESTAR)
$$G(z_{t-d}; \gamma, c) = 1 - e^{-\gamma (z_{t-d} - c)^2}$$
*   When $z_{t-d} = c$, $G = 0$ (in Regime 1).
*   As $z_{t-d} \to \pm\infty$, $G \to 1$ (symmetrically approaches Regime 2 in both directions).
*   *Application*: Symmetric deviations around an equilibrium (e.g. transaction cost band modeling).

---

### 2. The SETAR Model Structure
For a two-regime SETAR model with different lag lengths ($P_1, P_2$) and delay $d$:

$$Y_t = \begin{cases}
      \phi_{1,0} + \phi_{1,1} Y_{t-1} + \dots + \phi_{1,P_1} Y_{t-P_1} + e_t & \text{if } Y_{t-d} \le \gamma \quad \text{(Regime 1)} \\
      \phi_{2,0} + \phi_{2,1} Y_{t-1} + \dots + \phi_{2,P_2} Y_{t-P_2} + e_t & \text{if } Y_{t-d} > \gamma \quad \text{(Regime 2)}
   \end{cases}$$

Where the threshold variable $Y_{t-d}$ is a lagged value of the series itself.

---

## Model Estimation Workflows

### STAR Model Building Steps
1.  **Specify Variable**: Identify the transition variable $z_{t-d}$.
2.  **Benchmark**: Fit a linear AR model as a baseline.
3.  **Linearity Test**: Run a Lagrange Multiplier (LM) test to reject linearity.
4.  **Function Selection**: Select LSTAR (asymmetric) or ESTAR (symmetric) based on theory.
5.  **Estimation**: Jointly estimate parameters ($\gamma, c, \phi, \psi$) using Nonlinear Least Squares (NLS).
6.  **Diagnostics**: Perform autocorrelation and heteroscedasticity checks on residuals.

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 43: ESTAR vs. Linear AR for Bid-Ask Spread Deviation Arbitrage Calibration** - Implement a cointegration-based spread trading strategy. Model the spread deviations using an ESTAR model (which assumes mean reversion is weak near equilibrium due to transaction costs, but becomes strong as deviations grow large). Measure whether the ESTAR-calibrated thresholds outperform a simple linear AR threshold in generating profitable execution signals.
- **Verdict**: **Pursue** - ESTAR is highly suited for modeling arbitrage spreads with transaction costs, where small deviations are ignored (quiet regime) but large deviations are rapidly arb-ed away (active regime).

---

## Open questions

- How do we handle parameter identification issues in STAR models when the slope parameter $\gamma$ is very large (approaching an abrupt step function)?
- Can we combine GARCH volatility structures with LSTAR mean models (LSTAR-GARCH) to model asymmetric returns and volatility simultaneously?
