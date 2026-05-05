---
tags: [playbook, investing, sip, etf, india, personal-finance]
source: [[conversation.md]]
last_updated: 2026-05-05
---
# Personal Investing Playbook

**TL;DR:** For Indian retail investors, the edge is compounding over time via SIP in low-cost index ETFs — sentiment analysis makes this smarter by flagging macro events (RBI decisions, earnings) that inform entry/exit timing.

## The 3-Bucket Framework

Divide investable capital into three buckets by time horizon and risk:

| Bucket | Time Horizon | Instrument | Goal |
|---|---|---|---|
| 1. Emergency | 0–6 months | Liquid fund / FD | Safety (never invest this) |
| 2. Short-term | 6 months–3 years | Debt mutual funds, RD | Preserving purchasing power |
| 3. Long-term | 3+ years | Nifty 50 ETF, flexicap | Wealth compounding |

**Critical rule**: Never move Bucket 1 into Bucket 3 chasing returns. Each bucket has a distinct purpose.

## SIP (Systematic Investment Plan)

- Fixed amount invested on fixed date every month regardless of market level
- Forces discipline: removes emotion from timing decisions
- Automatically buys more units when markets fall (rupee cost averaging)
- Power example: ₹5,000/month at 12% CAGR for 20 years = ₹49.96 lakhs

## ETF vs Active Mutual Funds

| Factor | ETF (e.g., Nifty 50 ETF) | Active Fund |
|---|---|---|
| Expense ratio | 0.05–0.1% | 0.5–2.5% |
| Beats market? | No — IS the market | ~30% beat index over 10 years |
| Transparency | Full (you know what's in Nifty) | Partial (PM discretion) |
| Tax | Same as stocks | Same as stocks |
| **Recommendation** | **Primary vehicle** | Only for satellite allocation |

## How SachNetra Sentiment Improves This

The research-validated signal window (t=0 and t=-1) makes sentiment useful for:

1. **RBI decision days**: hold or reduce equity exposure before known-risk events
2. **Earnings season**: overweight/underweight sectors based on aggregate sentiment
3. **Corporate filing alerts**: auditor resignation in portfolio company → immediate review
4. **Sector rotation**: sector sentiment scores signal where to tilt

**Hybrid strategy from research**: `sentiment > 0.5 AND price above 50-day MA → BUY signal`
Sharpe ratio achieved: 3.6–5.1 in backtests (vs ~1.0 for buy-and-hold)

## Risk Management Rules

- Never more than 10% of portfolio in a single stock
- Large-cap (Nifty 50): core 60–70% of equity allocation
- Mid/small cap: 20–30% (higher alpha potential, higher volatility)
- International (US ETF): 10–15% for diversification against INR depreciation

## The INR Factor

- Rupee historically depreciates ~3–5% per year vs USD
- International ETFs give implicit dollar exposure
- If you earn and spend in INR: some dollar exposure protects against currency erosion

## What to Avoid (The Common Indian Investor Mistakes)

- Chasing last year's top-performing fund (mean reversion is real)
- Timing the market instead of time IN the market
- Holding too much in FDs in 2026 (real returns negative vs inflation)
- Listening to WhatsApp tips and celebrity-endorsed stocks
- Leveraged trading without understanding position sizing

## The Long Game Mindset

Quant funds target IC = 0.05–0.15. That sounds tiny. But:
- At IC = 0.10 with breadth = 500 stocks: IR = 0.10 × √500 = 2.24 (exceptional)
- Retail investors have breadth = 5–20 stocks: same IC = 0.45–1.0 IR

The edge for retail: **patience** and **compounding time**. Not market timing.

## Linked Nodes

- [[compounding]]
- [[interest_rates]]
- [[inflation]]
- [[bonds_and_yields]]
- [[quant_finance]]
- [[sachnetra_quant_pivot]]
- [[background_brain]]
