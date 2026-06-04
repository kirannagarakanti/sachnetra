---
github_url: https://github.com/buzzsubash/algo_trading_strategies_india
owner: buzzsubash
repo: algo_trading_strategies_india
license: Unknown
language: Python
last_commit: Unknown
stars: ~0
audience: intermediate
tags: [algorithmic-trading, option-pricing, india-markets, quant]
date_added: 2026-05-30
last_reviewed: 2026-05-30
status: documented
reviewed_by: gemini
---

# algo_trading_strategies_india — Intraday Option Selling

> **Why Lijo added this**: To extract clean Python execution logic for intraday options selling (straddles, strangles, iron flies) via Zerodha's Kite Connect, which we can reference when building live execution bridges for SachNetra's `scripts/research/` signals.

---

## TL;DR (3 bullets)

- An open-source collection of Python scripts executing classic Indian market option selling strategies (e.g., the famous "09:20 Short Straddle").
- Supports Nifty 50, Bank Nifty, Fin Nifty, Midcap Nifty, and Sensex.
- Contains pre-built logic for hard stop-losses, trailing stops, and MTM (Mark-to-Market) target execution.

---

## ELI12 — what is this repo?

In the Indian stock market, a very popular way to make money is "option selling"—specifically, betting that the market won't move too crazily on the day options expire. This repository contains ready-to-run Python code that automatically logs into a broker (Zerodha), calculates the exact option contracts to sell at exactly 09:20 AM, places the orders, and then watches them all day. If the market goes against you, it automatically cuts the loss (Stop Loss). If it hits your profit target, it closes the trades (MTM Target).

---

## Architecture snapshot

**Stack**: Python, Zerodha Kite Connect API.

**Key Operations**:
- `short-straddle/` — Code to sell both ATM Call and Put options simultaneously (e.g., 09:20 strategy).
- `combined_premium/` — Code that manages stop-losses based on the total premium of both legs combined, rather than individual legs.

---

## Best practices extracted

> Each row must cite repo file path(s). Generic advice without a path is not allowed.

| # | Practice | Repo location | Why it matters |
|---|---|---|---|
| 1 | Combined Premium Stop Loss | `short-straddle/combined_premium/` | In volatile markets like Bank Nifty, individual leg stop-losses often get "hunted" by sudden spikes, causing premature exits. Managing risk on the combined premium of the straddle is mathematically superior. |
| 2 | MTM Target Execution | `README.md` | Rather than waiting for a specific price target on an option, hardcoding a portfolio-level Mark-to-Market (MTM) profit target ensures the script exits greedily when the overall daily goal is hit. |

---

## Feature quality assessment

### Repo features rated

| Feature | Repo tier | Repo location | Why this tier |
|---|---|---|---|
| Execution Logic | Good | `short-straddle/` | Standard, procedural Python scripts for Zerodha execution. |

### SachNetra today vs target

| Feature | SachNetra today | Repo reference | Target for us | Gap | Notes |
|---|---|---|---|---|---|
| Live Execution Bridge | Poor | N/A | Better | +2 | SachNetra currently only *generates* signals via NLP and backtests them. We have zero code to actually execute trades via Zerodha/AngelOne. |

---

## Best to have in SachNetra

| Priority | Feature | Target tier | Today tier | Source (repo path) | Owner lane | Verdict |
|---|---|---|---|---|---|---|
| P2 | Combined Premium Risk Logic | Better | Poor | `short-straddle/combined_premium/` | Lijo | Park |

---

## SachNetra comparison

| Practice / pattern | Repo does | SachNetra does | Gap | Recommendation |
|---|---|---|---|---|
| Options Strategy Execution | Hardcoded straddles | Nothing (Equities only) | major | Park — We are focused on extracting directional signals for Nifty 50/150 equities via NLP. Intraday option selling is a completely different (and highly crowded) alpha domain. |

---

## Improvement backlog

| # | Item | Owner lane | Effort | Verdict | Notes |
|---|---|---|---|---|---|
| 1 | Create a Zerodha execution adapter | Lijo | M | Park | We should reference these scripts if we ever decide to bridge our NLP signals into live trades, but live trading is currently out of scope for V1. |

---

## Wiki impact
- **Created**: `buzzsubash-algo-trading-strategies-india.md`
- **Status after promote**: stays `documented`
