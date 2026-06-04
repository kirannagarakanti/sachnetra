---
tags: [experiment, sachnetra, research, quant-finance, momentum, cross-sectional, risk-adjusted, mid-cap, post-run-verdict]
source: [[exp15_brief]], [[sachnetra_research_playbook]], [[india_proven_strategies_landscape]]
experiment_id: Exp15
status: REJECTED — Strategy did not meet OOS criteria
completed_date: 2026-06-03
audience: Lijo (founder/operator) + James + future Claude Code sessions
---

# Experiment 15 — Volatility-Adjusted Cross-Sectional Momentum on Nifty Midcap 150

## 1. Executive Summary & Verdict

*   **Status:** REJECTED — Strategy did not meet OOS criteria
*   **In-Sample Period:** Start to 2021-04-01
*   **Out-of-Sample Period:** 2021-04-01 to 2026-05-28
*   **Verdict Details:**
    *   The Volatility-Adjusted Momentum strategy achieved an **OOS Sharpe Ratio of 1.85** (vs. benchmark 1.56 and raw momentum 1.83).
    *   The **Maximum Drawdown was 26.52%** (vs. target $< 15%$, benchmark 19.94%, raw momentum 27.10%).
    *   **Theil's U is 0.572** against the benchmark, passing the **B1** parsimony gate ($U < 1.0$).
    *   **DSR Probability is 98.87%** (with $N_{trials} = 10$), indicating high statistical confidence.

---

## 2. Performance Comparison Table

| Period | Metric | Strategy (Vol-Adj) | Raw Momentum | Benchmark (Equal-Weight) |
|---|---|---|---|---|
| **In-Sample** | Ann. Return | 33.09% | 34.24% | 21.04% |
| | Ann. Volatility | 17.54% | 19.49% | 16.61% |
| | Sharpe Ratio | 1.89 | 1.76 | 1.27 |
| | Max Drawdown | 39.05% | 41.21% | 36.59% |
| **Out-of-Sample** | Ann. Return | 38.58% | 43.77% | 26.33% |
| | Ann. Volatility | 20.81% | 23.86% | 16.86% |
| | Sharpe Ratio | 1.85 | 1.83 | 1.56 |
| | Max Drawdown | 26.52% | 27.10% | 19.94% |
| | Theil's U | 0.572 | 0.705 | 1.000 |
| **Full Sample** | Ann. Return | 34.82% | 37.25% | 22.71% |
| | Ann. Volatility | 18.63% | 20.97% | 16.68% |
| | Sharpe Ratio | 1.87 | 1.78 | 1.36 |
| | Max Drawdown | 39.05% | 41.21% | 36.59% |

---

## 3. Mandatory Diagnostics (B1 - B4 Rules)

### B1 — Theil's U Parsimony Gate
*   **Strategy OOS Theil's U:** **0.572**
*   **Raw Momentum OOS Theil's U:** **0.705**
*   *Verdict:* ✅ SUPPORTED — Strategy successfully beats the naive benchmark ($U < 1.0$).

### B2 — Residual Ljung-Box Test (Lag 10)
*   **Raw Residuals (OOS):** $Q = 9.36$, $p = 0.4989$ → ✅ PASS (no significant autocorrelation)
*   **Squared Residuals (OOS - Vol Clustering check):** $Q = 109.85$, $p = 0.0000$ → ❌ FAIL (no significant volatility clustering)
*   *Interpretation:* Significant volatility clustering remains in the residuals. The variance model could be further optimized (e.g. by incorporating GARCH volatility forecasts).

### B3 — Stationarity Check
*   **Strategy Daily Returns (ADF):** $tau = -42.07$ (5% critical value: -2.86) → **Stationary**
*   **Strategy Daily Returns (KPSS):** $stat = 0.055$ (5% critical value: 0.463) → **Stationary**
*   **Benchmark Daily Returns (ADF):** $tau = -40.94$ (5% critical value: -2.86) → **Stationary**
*   **Benchmark Daily Returns (KPSS):** $stat = 0.094$ (5% critical value: 0.463) → **Stationary**

### B4 — Regression Preflight & CAPM Parameters
*   **Preflight Stationarity Check:** ✅ PASS (both series stationary, regression is valid).
*   **CAPM Regression (OOS):**
    *   **Beta ($eta$):** **1.098**
    *   **Annualized Alpha ($alpha$):** **9.68%** (t-stat = 2.27, p = 0.0230)
    *   *Interpretation:* The strategy exhibits a beta of 1.10 and generates a statistically significant annualized alpha of 9.68% relative to the index.

---

## 4. Deflated Sharpe Ratio (DSR) Analysis (OOS)

*   **Observed Sharpe Ratio (OOS):** **1.854**
*   **Expected Max Sharpe Under Null ($SR_0$):** **0.787** (derived assuming $N_{trials} = 10$ parameter sweeps and cross-trial standard deviation $sigma_{SR} = 0.5$)
*   **Residual Skewness:** **-0.735**
*   **Residual Kurtosis:** **6.305**
*   **DSR Probability:** **98.87%**
*   *Verdict:* ✅ PASS — The strategy Sharpe ratio is statistically significant after correcting for data snooping ($DSR ge 95%$).

---

## 5. Method & Parameters
*   **Universe:** Nifty Midcap 150 (JSON list of 150 tickers).
*   **Signal formulation:** $S_i = ln(P_{i, T-21} / P_{i, T-252}) / sigma_{i, 20}$.
*   **Rebalancing frequency:** Monthly (first trading day of each month).
*   **Slippage/Fees deduction:** 15 	ext{ bps}$ one-way (30 	ext{ bps}$ round-trip) applied directly to rebalancing portfolio turnover.
*   **Holdings limit:** Top 15$ stocks, equally weighted.

---

## 6. Known Limitations & Biases
1.  **Survivorship Bias:** The constituent list used (`shared/nifty-midcap150.json`) is the list of midcap stocks as of 2026. Evaluating these stocks back to 2009 introduces survivorship bias, as stocks that were in the index historically but since delisted are not simulated.
2.  **Slippage on Thin Midcaps:** During highly volatile months, actual transaction costs on smaller midcap names may exceed the 30 	ext{ bps}$ round-trip floor.
