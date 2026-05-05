---
tags: [concept, finance, macro, rbi, banking]
source: [[conversation.md]]
last_updated: 2026-05-05
---
# Interest Rates

**TL;DR:** Interest rates set the price of money — RBI's repo rate decisions are Class B systemic signals that move the entire banking sector simultaneously.

## The Repo Rate (India)

- RBI's benchmark lending rate: 6.25% (as of April 2026, held for 3rd consecutive meeting)
- Repo rate = rate at which RBI lends to commercial banks overnight
- All other rates cascade from this: home loans, fixed deposits, personal loans

## Direction Effects

| Rate Direction | Who Benefits | Who Loses |
|---|---|---|
| RBI raises rates | HDFC Bank (deposits earn more) | LIC Housing Finance (home loans cost more) |
| RBI cuts rates | Home loan borrowers | Fixed deposit holders |
| Rates hold steady | Market stability | No directional trade |

## Critical Insight: Entity-Aware Sentiment

One RBI rate-hold article produces **conflicting sentiments** per company:
- `HDFCBANK.NS → sentiment: +0.71` (deposits benefit)
- `LICHSGFIN.NS → sentiment: -0.68` (loan demand hurt)

This is why article-level sentiment fails and per-entity sentiment is the edge.

## Classification for SachNetra

- **Event type**: `regulation` or `macro`
- **Relevance class**: B (systemic — affects ALL banking stocks)
- **Market moving**: YES — always full intelligence processing
- **Keywords to detect**: `repo rate`, `rbi`, `monetary policy`, `basis points`

## Signal Timing

- Rate decision day (t=0): immediate large move in banking stocks
- Day after (t=1): secondary effect on housing, auto, FMCG sectors
- Quantchics: "event-based signals, not just sentiment score" — rate decisions are the canonical event

## Linked Nodes

- [[inflation]]
- [[bonds_and_yields]]
- [[reserve_bank_of_india]]
- [[quant_finance]]
- [[sachnetra_quant_pivot]]
