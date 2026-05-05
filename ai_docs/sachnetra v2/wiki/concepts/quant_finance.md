---
tags: [concept, quant-finance, alpha, signal, worldquant, ic, ir]
source: [[conversation.md]]
last_updated: 2026-05-05
---
# Quantitative Finance

**TL;DR:** Quant finance turns data signals into systematic trading rules — the core framework is IC × √Breadth = IR, and entity-aware news sentiment is a proven alpha signal for Indian markets (>40% price prediction improvement from headlines alone).

## The Fundamental Law (Grinold's Law)

```
IR = IC × √Breadth
```

- **IR** (Information Ratio): risk-adjusted return above benchmark (target: > 0.5)
- **IC** (Information Coefficient): correlation of your signal with future returns (0 = random, 1 = perfect; real-world: 0.05–0.15 is good)
- **Breadth**: number of independent bets per year
- Key insight: low IC is fine if Breadth is high — SachNetra covers 500+ companies × 365 days = massive breadth

## Alpha Signal Definition

- Alpha = return ABOVE the market benchmark
- A signal with IC = 0.10 sounds weak, but: IR = 0.10 × √500 = 2.24 (excellent)
- SachNetra's edge: high breadth (many stocks, many days) even with modest IC

## Sentiment as an Alpha Signal

Research confirmed (NSE 500 study, 2012–2017):
- Headline embedding → >40% improvement in price prediction
- Sentiment has significant impact at t=0 and t=-1 (same day and previous day)
- Transfer entropy: sentiment → price (causal), not price → sentiment
- Hybrid strategies achieved Sharpe ratios of 3.6–5.1

**The regression to run after 30 days of data:**
```
R_t = α + β₁S_t + β₂S_{t-1} + β₃σ_t + β₄V_t + ε
```
If β₁ or β₂ is statistically significant (p < 0.05) → confirmed Alpha.

## Entity-Aware vs Article-Level Sentiment

- **Wrong**: score the whole article → signal averages out, becomes noise
- **Right**: score per company mentioned in the article

Example: "RBI raises rates — good for deposits, bad for home loans"
- Article sentiment: ≈ 0 (neutral, cancels out)
- HDFCBANK.NS: +0.71 (bullish — deposits win)
- LICHSGFIN.NS: -0.68 (bearish — loan demand hurt)

Entity-aware is the critical differentiator between noise and alpha.

## News Classification Framework

### Relevance Class
- **Class A (Idiosyncratic)**: affects only one company — trade that company only
- **Class B (Systemic)**: affects entire market or sector — trade sector-wide

### Event Types (High Alpha Potential)
| Event | Signal Strength |
|---|---|
| Auditor resignation | Highest |
| Promoter pledge increase | High |
| Earnings beat/miss | High |
| RBI rate decision | High (Class B) |
| CEO/CFO change | Medium |
| M&A announcement | Medium |
| Regulatory penalty | Medium |

## WorldQuant Brain: The Target

- Platform where researchers submit Alpha expressions
- NOT a data marketplace — you write formulas against THEIR data
- Syntax: `rank(-sentiment_score) × group_neutralize(returns, sector)`
- Compensation: $2,000–8,000/quarter as Research Consultant if Alpha accepted
- Path: 6 months of SachNetra data → IC calculation → Brain registration → submit

## Sentiment Fields (WorldQuant Data Registry Mapping)

| WorldQuant Field | SachNetra Equivalent |
|---|---|
| `snt_social_value` | `company_daily_sentiment.weighted_score` |
| `snt_bullish` | `bullish_count × avg_bullish_score` |
| `snt_bearish` | `bearish_count × avg_bearish_score` |
| `snt_ratio` | `bullish_score / bearish_score` |
| `snt_buzz` | `article_count / 30day_average` |
| `snt_strength` | `avg |sentiment_score| of directional articles` |
| `snt_social_volume` | `raw article_count per company per day` |

## Point-in-Time Data (Critical)

- Three timestamps required on every article:
  1. `published_at` — when source published
  2. `scraped_at` — when SachNetra saw it (YOUR timestamp)
  3. `processed_at` — when AI finished
- Look-ahead bias: never use future information in backtests
- WorldQuant's "Why Use Delayed Data" lesson explains this exactly

## Key Datasets for Validation

- **SEntFiN 1.0**: 10,753 annotated Indian financial headlines, entity-aware, free on GitHub
- **NIFTY-LM**: decade of Indian financial news (2010–2023), available on HuggingFace
- **IN-FINews**: 3,348 classified Indian news articles

## Linked Nodes

- [[world_quant]]
- [[sachnetra_quant_pivot]]
- [[interest_rates]]
- [[bonds_and_yields]]
- [[reserve_bank_of_india]]
- [[compounding]]
