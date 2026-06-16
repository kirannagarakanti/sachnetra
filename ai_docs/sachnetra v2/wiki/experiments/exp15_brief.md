---
tags: [experiment, sachnetra, research, quant-finance, momentum, cross-sectional, risk-adjusted, mid-cap, pre-design-brief]
source: [[sachnetra_research_playbook]], [[india_proven_strategies_landscape]], [[Exp13]]
experiment_id: Exp15
status: BRIEF — pre-registration design phase
authored_date: 2026-06-04
audience: Lijo (founder/operator) + James + future Claude Code sessions
purpose: Define the research plan, mathematical framework, success thresholds, and diagnostic disciplines for testing Volatility-Adjusted Cross-Sectional Momentum on the Nifty Midcap 150 universe.
---

# Experiment 15 — Brief: Volatility-Adjusted Cross-Sectional Momentum on Nifty Midcap 150

## 1. Why this experiment, why now
Cross-sectional momentum is a historically robust equity anomaly in India (Tier A academic and empirical evidence, as noted in the *India Proven Strategies Landscape* §2.B). However, raw price momentum (e.g., 12-1 month return) is prone to severe "momentum crashes" when market regimes shift or when high-beta, spiky stocks experience sudden mean-reversion. 

By adjusting the momentum score inversely by historical volatility, we scale down exposure to spiky, high-idiosyncratic-risk stocks and tilt the portfolio toward stable, persistent trend leaders. Running this strategy on the Nifty Midcap 150 universe (rather than the highly efficient Nifty 50) offers a larger pool of informationally inefficient stocks, higher alpha potential, and better diversification, while avoiding the extreme liquidity and bid-ask spread issues of micro-caps.

---

## 2. Core Hypotheses
*   **H15a (Volatility-Adjusted Alpha Premium):** A cross-sectional momentum strategy that ranks stocks based on volatility-adjusted momentum scores ($S = R_{12,1} / \sigma_{20}$) outperforms standard price-momentum ($R_{12,1}$) and an equal-weighted benchmark of the Nifty Midcap 150 universe on both absolute and risk-adjusted (Sharpe) bases.
*   **H15b (Out-of-Sample Performance):** The long-only top-decile portfolio (top 15 stocks from the Nifty Midcap 150) achieves an out-of-sample Sharpe Ratio of $\ge 1.2$ and a Maximum Drawdown of $< 15\%$ after accounting for a 30 bps round-trip transaction cost (slippage, brokerage, and STT).
*   **H15c (Parsimony & Volatility Clustering):** The strategy passes the SachNetra diagnostic gates:
    *   **B1:** Theil's $U < 1.0$ against both the naive equal-weighted buy-and-hold benchmark and standard price-momentum.
    *   **B2:** Squared-residual Ljung-Box test does not exhibit significant volatility clustering in portfolio residuals, or a GARCH model is fitted to confirm parameter stability.
    *   **B3/B4:** Portfolio returns and constituent price series are verified for stationarity ($I(0)$) using ADF and KPSS tests prior to analysis.

---

## 3. Mathematical Framework & Method

### 3.1 Universe & Data Requirements
*   **Asset Universe:** Nifty Midcap 150 constituents defined in `shared/nifty-midcap150.json` (150 symbols).
*   **Benchmark:** Equal-weighted portfolio of the Nifty Midcap 150 universe, rebalanced monthly.
*   **Price Series:** Daily adjusted close prices ($AdjClose$) from `research_prices` (loaded via Yahoo Finance).
*   **Data Window:** 2009-01-01 to 2026-05-28.
*   **Validation Split:** 70% In-Sample (IS: 2009-01-01 to 2021-03-31) and 30% Out-of-Sample (OOS: 2021-04-01 to 2026-05-28).

### 3.2 Signal Computation
At each rebalancing date $T$ (first trading day of each month):
1.  **Raw Momentum ($R_{12,1}$):** Cumulative log return over the 12-month window ending 1 month ago (roughly 252 trading days to 21 trading days ago):
    $$R_{12,1,i} = \ln\left(\frac{P_{T-21, i}}{P_{T-252, i}}\right) = \sum_{t=T-252}^{T-21} r_{t,i}$$
    where $P_{t,i}$ is the adjusted close price of stock $i$ on day $t$, and $r_{t,i}$ is the daily log return.
2.  **Idiosyncratic Volatility ($\sigma_{20}$):** Sample standard deviation of daily log returns over the last 20 trading days:
    $$\sigma_{20,i} = \sqrt{\frac{1}{19}\sum_{t=T-20}^{T-1} (r_{t,i} - \bar{r}_{20,i})^2}$$
3.  **Volatility-Adjusted Momentum Score ($S_i$):**
    $$S_i = \frac{R_{12,1,i}}{\sigma_{20,i}}$$

### 3.3 Portfolio Simulation
1.  **Ranking and Selection:** Rank all 150 stocks by $S_i$ in descending order. Select the top $N = 15$ stocks (top decile) for the long-only portfolio.
2.  **Weighting:** Equal-weighting ($w_i = 1/N = 1/15$) for selected constituents.
3.  **Holding Period:** Hold the selected stocks for exactly one month. Rebalance on the first trading day of the next month.
4.  **Transaction Costs:** Apply a 15 bps one-way (30 bps round-trip) cost on all traded volume at each rebalance to account for brokerage, STT (0.1% buy/sell on delivery), stamp duty, and exchange transaction fees.
    $$\text{Cost}_T = 0.0015 \times \sum_{i} |w_{i, T} - w_{i, T^-}|$$
    where $w_{i, T^-}$ is the pre-rebalance weight (adjusted for stock returns over the month).

---

## 4. Success Thresholds & Acceptance Gates

The strategy must pass the following quantitative thresholds to be approved for paper-trading (Gate 1):

| Metric | Target / Threshold | Diagnostic Gate | Description |
|---|---|---|---|
| **OOS Sharpe Ratio** | $\ge 1.2$ | — | Annualized Sharpe ratio on out-of-sample period (2021-04-01 to 2026-05-28). |
| **Max Drawdown** | $< 15\%$ | — | Peak-to-trough drop of portfolio equity curve. |
| **Theil's U** | $< 1.0$ | **B1** | Ratio of portfolio RMSE to the naive benchmark (equal-weighted midcap index). |
| **Ljung-Box (Raw)** | $p > 0.05$ | **B2** | No significant serial correlation in portfolio residuals (lag 10). |
| **Ljung-Box (Sq)** | $p > 0.05$ | **B2** | No significant volatility clustering in squared portfolio residuals (lag 10). |
| **Stationarity** | ADF $p < 0.05$ & KPSS $p > 0.05$ | **B3/B4** | Confirms portfolio returns and signal distributions are stationary. |
| **Deflated Sharpe (DSR)**| $\ge 1.0$ | — | Probability that the observed Sharpe ratio is not a result of multiple testing. |

---

## 5. Potential Traps & Caveats
1.  **Survivorship Bias (High Risk):** The constituent list `shared/nifty-midcap150.json` represents the *current* Nifty Midcap 150 universe as of 2026. Applying this list retrospectively back to 2009 introduces survivorship bias—stocks that went bankrupt, were delisted, or shrank out of the index are excluded. The backtest script must explicitly document this limit.
2.  **Liquidity & Impact Costs:** While the Nifty Midcap 150 has reasonable volume, executing monthly rebalances on 15 mid-cap stocks could face significant slippage, especially during periods of market stress. The 30 bps round-trip transaction cost is a floor; actual costs could be higher if portfolio size expands.
3.  **Missing Prices / Gaps:** Some stocks may have trading halts, corporate actions, or late listings. The script must require a minimum data density (e.g., at least 200 non-null trading days over the past 252 days) before calculating scores.
4.  **Short Leg Infeasibility:** Since overnight shorting in the cash segment is functionally impossible for retail in India (no active SLB market), the strategy is restricted to a **long-only** format.
5.  **Look-ahead Bias:** Rebalancing must use closing prices on day $T-1$ to execute trades at the open/close of day $T$, ensuring no future price information is leaked into the signal.

---

## 6. Execution Plan & Next Steps
1.  **Backtest Script:** Write `scripts/research/exp15-momentum-backtest.mjs` incorporating signal generation, portfolio loop, transaction costs, and diagnostic checks.
2.  **Diagnostics:** Perform stationarity checks on prices, calculate performance metrics, and output diagnostic statistics (Theil's U, Ljung-Box, ADF/KPSS).
3.  **Report Generation:** Write results to the console and save summary stats to `wiki/experiments/Exp15.md` (post-run pre-registration record) or local outputs.
4.  **Hypothesis Register:** Append H15a/H15b/H15c to the SachNetra Research Playbook.
