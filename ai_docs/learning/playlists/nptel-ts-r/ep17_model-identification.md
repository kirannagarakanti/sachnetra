---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=aRGAf_CXTw8
source_type: video
duration: ~31m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, model-identification, AIC, BIC, HQIC, SIACF]
status: distilled
---

# Ep 17 — Model Identification and Information Criteria

> **Why Lijo watched this**: To learn how to select optimal ARIMA orders ($p$ and $q$) using statistical information criteria (AIC, BIC, HQIC) instead of relying solely on ambiguous visual ACF/PACF plots.

---

## ⏱ Worth watching? WATCH

Verdict: **WATCH**

This lecture bridges the gap between visual diagnostics and formal mathematical model selection. Watch **12:20 to 17:10** to understand why visual ACF/PACF plots fail on messy real-world datasets and the need for parsimony. Then, focus on **19:00 to 29:00** for the mathematical comparison of Akaike Information Criterion (AIC) and Schwarz Bayesian Criterion (SBC/BIC) penalty structures.

---

## What this episode is actually about (ELI12)

When looking at a messy graph, it's hard to tell exactly how many past days of data (orders $p$ and $q$) our model needs to look at. If we look at too few days, our predictions are inaccurate. If we look at too many days, our model memorizes noise (overfitting) and fails on new data. 

To solve this, we use "information criteria"—which are like scorecard systems. They grade a model on how well it fits the data, but dock points (penalize it) for every extra day/parameter we add. The model with the best overall score (the lowest value) is the winner.

---

## Key concepts introduced

- **Principle of Parsimony** — The rule that if two models explain the data equally well, we should choose the simpler one (the one with fewer parameters).
- **Akaike Information Criterion (AIC)** — A model selection metric that balances goodness-of-fit against complexity. Formula: $\text{AIC} = n \ln(\hat{\sigma}_e^2) + 2m$ where $m$ is the parameter count.
- **Schwarz Bayesian Criterion (SBC / BIC)** — A model selection metric that penalizes additional parameters more severely than AIC for large datasets. Formula: $\text{BIC} = n \ln(\hat{\sigma}_e^2) + m \ln(n)$.
- **Hannan-Quinn Information Criterion (HQIC)** — An alternative model selection metric. Formula: $\text{HQIC} = n \ln(\hat{\sigma}_e^2) + 2m \ln(\ln n)$.
- **Sample Inverse Autocorrelation Function (SIACF)** — An advanced diagnostic tool calculated from the inverse model. Useful for detecting **over-differencing** and identifying seasonal model orders.

---

## AIC vs. BIC: The Penalty Showdown

Both metrics use the same base term representing the model's error (unexplained variance $\hat{\sigma}_e^2$), but they differ in how they penalize complexity ($m$ parameters for $n$ observations):

| Metric | Complexity Penalty | Behavior |
|---|---|---|
| **AIC** | $2m$ | Constant penalty of 2 per parameter. Tends to select slightly larger, overparameterized models as $n$ grows. |
| **BIC** | $m \ln(n)$ | Dynamic penalty depending on dataset size. For any dataset with $n \ge 8$ observations, $\ln(n) > 2$, making BIC penalize extra parameters much more heavily than AIC. Leads to simpler, more parsimonious models. |

---

## Model Selection Workflow (Box-Jenkins Step 1)

On clean simulated data, we identify models visually:
*   **AR(p)**: ACF tails off, PACF cuts off after lag $p$.
*   **MA(q)**: ACF cuts off after lag $q$, PACF tails off.
*   **ARMA(p,q)**: Both tail off.

On messy real-world data:
1. Plot ACF/PACF to find a neighborhood of potential orders (e.g., if plots suggest somewhere around $(2,2)$, select $(1,1), (2,1), (1,2), (2,2)$ as candidates).
2. Fit all candidate models.
3. Compute AIC and BIC for each model.
4. Select the model that minimizes the criteria (AIC is often preferred for short-term forecasting accuracy; BIC is preferred for identifying the true underlying physical process).

---

## So what for SachNetra?

- **Experiments**:
  - **Add Exp 13: AIC/BIC Automated Order Search (Auto-ARIMA)** — Implement a grid search in Python that fits $\text{ARIMA}(p,d,q)$ models for $p, q \in [0, 4]$ and selects the optimal order by minimizing BIC (to favor simpler, more robust models for financial returns).
- **Verdict**: **Pursue** — Information criteria (specifically BIC) are essential for programmatically selecting model orders in automated backtesting, replacing manual chart reading.

---

## Open questions

- In financial returns, does minimizing BIC lead to better out-of-sample trading performance than minimizing AIC? (AIC is typically better for forecasting but BIC is safer against overfitting in noisy regimes).
- How do we calculate SIACF in Python? (`statsmodels.tsa.stattools` does not have a direct inverse ACF function, so we would need to estimate it by fitting a high-order AR model and computing its ACF).
