---
tags: [entity, quant-firm, worldquant, alpha, platform]
source: [[conversation.md]]
last_updated: 2026-05-05
---
# WorldQuant

**TL;DR:** WorldQuant is a global quant firm running a crowd-sourced Alpha research platform called WorldQuant Brain — you write formula-based signals using their data, they pay $2,000–8,000/quarter if your Alpha is accepted.

## What WorldQuant Is

- One of the world's largest quantitative hedge funds
- Founded by Igor Tulchinsky; runs billions in assets systematically
- Known for the "BRAIN" platform — open to external researchers worldwide
- Indian office active; expanding systematically in emerging markets

## WorldQuant Brain Platform

### What It Is (Critical Misunderstanding to Avoid)
- **NOT** a place to upload your dataset or sell data
- **NOT** a data marketplace
- **IS**: a simulator where you write Alpha expressions against THEIR pre-built data registry

### How It Works
1. Register at `brain.worldquant.com`
2. Access their data registry (pre-built sentiment, price, volume, fundamental fields)
3. Write Alpha expressions in their Python-like syntax
4. Platform backtests your Alpha against historical data
5. Scores: Sharpe, returns, turnover, correlation to existing Alphas
6. If accepted → earn $2,000–8,000/quarter as Research Consultant

### Alpha Expression Example
```python
# WorldQuant Brain syntax
alpha = rank(-snt_social_value)  # rank stocks by sentiment
mask = valid[k, :]               # exclude illiquid stocks
alpha[~mask] = nan
```

## Data Registry (Key Fields for SachNetra Strategy)

| Field | Description |
|---|---|
| `snt_social_value` | Weighted sentiment score (-1 to +1) |
| `snt_bullish` | Volume of positive mentions |
| `snt_bearish` | Volume of negative mentions |
| `snt_ratio` | Bullish/bearish ratio (time series rank is the Alpha) |
| `snt_buzz` | Attention spike vs historical average |
| `snt_strength` | Intensity of directional content |

## Key Courses to Watch (in This Order)

From WorldQuant Brain Learn portal:
1. Sentiment Data Overview & Data Fields (Lesson 0) — start here
2. Price Volume Data (Lesson 4) — baseline understanding
3. Fundamental Data & Base Data (Lesson 3)
4. Customer & Sentiment Data (Lesson 1) — format for SachNetra signals
5. Sentiment Data (Lesson 7) — advanced
6. Why Use Delayed Data (Lesson 12) — CRITICAL for point-in-time

## What SachNetra Provides That WorldQuant Doesn't Have

- Hindi-language news sentiment (regional language latency advantage)
- Indian government portal filings (NSE/BSE corporate announcements)
- State-level regional news (Marathi, Gujarati papers breaking local stories first)
- Community credibility scoring of Indian media sources
- All mapped to NSE/BSE tickers

## The Submission Strategy

```
April 2026   → Start storing data (PostgreSQL, three timestamps)
October 2026 → 6 months of structured data
             → First IC calculation
             → Register on WorldQuant Brain
November 2026 → Write first Alpha expression using Brain's data
              → Informed by IC patterns discovered in SachNetra data
Year 1        → Research Consultant status if Alpha accepted
```

## Linked Nodes

- [[quant_finance]]
- [[sachnetra_quant_pivot]]
- [[reserve_bank_of_india]]
