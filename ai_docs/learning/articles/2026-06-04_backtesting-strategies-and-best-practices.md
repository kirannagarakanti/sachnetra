---
date: 2026-06-04
source_url: https://quantnet.com/threads/backtesting-best-practices-and-pitfalls.8841/
source_type: research_summary
publication: QuantNet & Advances in Financial Machine Learning
author: QuantNet Community & Marcos Lopez de Prado
publish_date: 2026-06-04
tags: [quant, backtesting, machine-learning, statistics, overfitting, greeks, micro-structure]
status: raw
---

# Backtesting Strategies: Best Practices, Pitfalls, and Advanced Machine Learning Frameworks

> **Why Lijo read this**: How do we design and build backtesting pipelines for SachNetra that avoid common statistical traps and are robust enough to transition successfully to live trading?

---

## TL;DR (3 bullets)

- Standard backtesting is highly prone to **Look-Ahead Bias**, **Survivorship Bias**, and **Overfitting** (data snooping), which create an illusion of profitability.
- For Machine Learning models, standard cross-validation leaks information; Marcos Lopez de Prado's **Purging** and **Embargoing** techniques are mandatory to remove overlapping label leakage.
- The **Deflated Sharpe Ratio (DSR)** must be used to adjust performance downward to account for the number of trial configurations run during strategy development.

---

## ELI12 — what is this actually saying?

Imagine you are trying to guess who will win a football game. 
First, if you use a replay of a game you already watched to show your friends how "good" you are at predicting, that is **look-ahead bias** (cheating by using the future).
Second, if you only study the teams that made it to the finals and ignore all the teams that got knocked out early, that is **survivorship bias** (ignoring the losers).
Third, if you guess a million different times, one of those guesses will be right just by luck. If you brag about that one guess without admitting you guessed a million times, that is **overfitting**.
To fix this, we have to use special math. We delete the data around our test area so the model can't sneak peek at the answers (**purging** and **embargoing**), and we penalize our final score based on how many times we guessed (**Deflated Sharpe Ratio**).

---

## Glossary (new terms only)

- **Purging** — An ML data-splitting technique that removes training data whose outcomes overlap in time with the testing set, preventing look-ahead leakage.
- **Embargoing** — Discarding a set of training data immediately *after* the testing set to prevent leakage caused by serial correlation or multi-day market trends.
- **Deflated Sharpe Ratio (DSR)** — An adjusted Sharpe ratio that penalizes performance based on the number of backtest trials ran, the skewness/kurtosis of returns, and the track record length.
- **Data Snooping / P-Hacking** — The practice of testing many different parameters or models on the same data until a statistically significant pattern is found, which is likely just random noise.
- **Point-in-Time Data** — Historical data that represents exactly what was known at a specific timestamp, including historical index constituents and unadjusted values, to avoid retrospectively using future corporate actions.

---

## State of the market RIGHT NOW (per this source)

This source is **descriptive** (methodological framework) rather than predictive.

- **If true, then**: Most backtests published by retail algo-traders or basic software packages are overfitted "mirages" that will lose money live because they ignore execution costs, look-ahead leakage, and selection bias.
- **Falsifiable by**: Running a walk-forward optimization on any strategy using a high number of iterations and comparing the raw Sharpe ratio vs. the Deflated Sharpe ratio (DSR).
- **Time horizon**: Long-term research infrastructure.

---

## So what for SachNetra?

**Experiments to add/kill**:
- Add: Exp## — Implement a pipeline test comparing a standard Cross-Validation split vs. a Purged-and-Embargoed Cross-Validation split on our commodity momentum model. Measure the difference in out-of-sample performance decay.
- Kill: Exp## — Kill any strategy proposal that has a raw Sharpe Ratio > 2.0 unless it has been evaluated using a Deflated Sharpe Ratio (DSR) to account for parameter trials.

**Features to build**:
- **Backtest Validation Library**: Build a core module in SachNetra's research/scripts ecosystem to calculate:
  - Max Drawdown Duration
  - Deflated Sharpe Ratio
  - Information Ratio
  - Purged K-Fold Cross-Validation splits.

**Data to capture**:
- Exact transaction fees, slippage estimates, and borrow costs for NIFTY/Commodity instruments to model realistic execution costs.

**Pursue / Park / Kill** (pick exactly one):

- **Pursue (scoped)** — Do NOT build a full "Backtest Validation Library" yet. Extract only what Exp15 actually needs — Deflated Sharpe Ratio calc + purged/embargoed CV splits — into `scripts/research/`. Promote to a shared library only once a 2nd/3rd experiment reuses it (one strategy at a time — strategy reset 2026-05-29). Open gap to close: Exp15 must log every parameter configuration tested so the DSR's trial count (N) is a real number, not a guess.

---

## Open questions (for next session)

- How do we calculate the number of "trials" (N) accurately when we perform grid search on model parameters for DSR calculation?
- How much safety margin (embargo window) in terms of days is required for daily momentum models vs. intraday mean-reversion models?
- What Python packages (e.g., `scikit-portfolio` or `mlfinlab`) exist that implement purged cross-validation out of the box?

---

## Wiki impact

> To be filled at the promote-to-wiki step.

- **Created**: [[backtesting_methodology]], [[purged_cross_validation]], [[deflated_sharpe_ratio]]
- **Updated**: [[quant_reading_list]]
- **Logged in**: `wiki/log.md` on 2026-06-04
- **Status after promote**: `promoted_to_wiki`

---

## Source excerpt

### The Mechanics of Purging and Embargoing

```
Standard K-Fold Cross-Validation (Leaks Info):
[--- Train Fold 1 ---][--- Test Fold ---][--- Train Fold 2 ---]
                         ^^^^^^^^^^^^^ 
             Overlap at boundaries leaks future info!

Purged and Embargoed Cross-Validation:
[-- Train --][ PURGE ][--- Test ---][ EMBARGO ][-- Train --]
              ^^^^^^^                ^^^^^^^^^
              Removes                Removes post-test
              overlapping            serial correlation
              labels                 leakage
```

#### Mathematical formulation of Deflated Sharpe Ratio (DSR)

The Deflated Sharpe Ratio ($DSR$) is defined as the probability that the estimated Sharpe Ratio ($SR$) is greater than the true Sharpe Ratio ($SR_0$), given the number of independent trials $N$, the variance of the estimated Sharpe Ratios $\sigma_{SR}^2$, the skewness $\gamma_3$, and kurtosis $\gamma_4$ of the returns:

$$DSR = Z\left( \frac{(SR - SR_0)\sqrt{T-1}}{\sqrt{1 - \gamma_3 SR + \frac{\gamma_4 - 1}{4} SR^2}} \right)$$

Where $Z$ is the cumulative distribution function of a standard normal distribution, and $SR_0$ is the expected maximum Sharpe ratio under the null hypothesis (calculated using the Euler-Mascheroni constant and the number of trials $N$).

#### Checklist for a Valid Backtest

1. **Transaction Cost Modeling**: Did you include at least 1-2 ticks of slippage per side plus brokerage commissions and exchange fees?
2. **Point-In-Time Dataset**: Does your backtest include companies that went bankrupt during the period?
3. **Data Leakage Check**: Are features calculated using values only available *before* the transaction execution timestamp?
4. **Parameter Stability**: Does the strategy performance degrade smoothly when parameters are slightly tweaked, or does it drop off a cliff? (If it drops off a cliff, it is overfitted).
