---
github_url: https://github.com/harshbokadia/fin-RiskLens
owner: harshbokadia
repo: fin-RiskLens
license: Unknown
language: Unknown
last_commit: Unknown
stars: 0
audience: professional
tags: [quant, portfolio-optimization, capm, nse, india-markets]
date_added: 2026-05-30
last_reviewed: 2026-05-30
status: documented
reviewed_by: gemini
---

# fin-RiskLens — Portfolio Optimization (MPT & CAPM) for NSE Stocks

> **Why Lijo added this**: To understand the mathematical implementation of Modern Portfolio Theory (MPT) and Capital Asset Pricing Model (CAPM) on Indian equities (NSE), which is critical for sizing/weighting positions when we backtest our sentiment signals in `scripts/research/`.

---

## TL;DR (3 bullets)

- A quantitative model to construct optimal portfolios from a 7-stock NSE universe + AAPL + GBP/INR.
- Computes both Tangency (max Sharpe) and Minimum Variance Portfolios, testing with and without short-selling constraints.
- Identifies whether a stock is "overweight" or "underweight" relative to its market capitalization benchmark using CAPM.

---

## ELI12 — what is this repo?

Imagine you have a basket of 7 Indian stocks. How do you decide what percentage of your money goes into each one? You don't want to just divide it evenly. This repository uses hardcore math (Modern Portfolio Theory) to find the exact percentages that give you the highest possible return for the lowest possible risk. It also compares these "mathematically perfect" weights against what everyone else is doing (the market cap weight) to see which stocks are currently a better or worse deal.

---

## Architecture snapshot

**Stack**: Primarily analytical (likely Excel Solver or Python based on the description of steps, though the repo is mostly documents/results).

**Key Operations**:
1. Compute daily log returns from adjusted close prices.
2. Build 7x7 (domestic) and 9x9 (international) covariance matrices.
3. Optimize weights for Target Return, Min Variance, and Max Sharpe.

---

## Best practices extracted

> Each row must cite repo file path(s). Generic advice without a path is not allowed.

| # | Practice | Repo location | Why it matters |
|---|---|---|---|
| 1 | Global Diversification Baseline | `README.md` | Adding just one US asset (AAPL) and currency pair (GBP/INR) dramatically shifts the efficient frontier, proving that purely domestic backtests often underestimate structural currency risk. |
| 2 | Constrained vs Unconstrained | `README.md` | Solving for Tangency/MVP *both* with and without short-selling constraints is vital, as Indian retail/HNI accounts face massive margin friction when trying to short hold over night. |

---

## Feature quality assessment

### Repo features rated

| Feature | Repo tier | Repo location | Why this tier |
|---|---|---|---|
| Optimization Math | Better | `README.md` | Solid textbook implementation of mean-variance optimization. |

### SachNetra today vs target

| Feature | SachNetra today | Repo reference | Target for us | Gap | Notes |
|---|---|---|---|---|---|
| Portfolio Construction | Poor | `scripts/research/` | Better | +2 | Currently, if our NLP finds 10 bullish stocks, our backtests just equal-weight them. We need MPT math to size them properly based on their historical covariance. |

---

## Best to have in SachNetra

| Priority | Feature | Target tier | Today tier | Source (repo path) | Owner lane | Verdict |
|---|---|---|---|---|---|---|
| P1 | Mean-Variance Position Sizing | Better | Poor | `README.md` | Lijo | Pursue |

---

## SachNetra comparison

| Practice / pattern | Repo does | SachNetra does | Gap | Recommendation |
|---|---|---|---|---|
| Position Sizing | Solves for Min Variance / Max Sharpe | Equal weights (1/N) | major | Implement a basic PyPortfolioOpt or scipy.optimize layer in our backtesting scripts to translate NLP signals into actual portfolio weights. |

---

## Improvement backlog

| # | Item | Owner lane | Effort | Verdict | Notes |
|---|---|---|---|---|---|
| 1 | Add Covariance Matrix generation to data pipeline | Lijo | M | Pursue | Before we can do MPT sizing, we need a worker that computes rolling 252-day covariance matrices for the Nifty 50/150 universes. |

---

## Wiki impact
- **Created**: `harshbokadia-fin-risklens.md`
- **Status after promote**: stays `documented`
