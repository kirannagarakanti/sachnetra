---
tags: [quant, backtesting, risk-management]
source: [[2026-06-04_ssrn-e-journal-mapping-guide]]
last_updated: 2026-06-04
---
# Backtesting Methodology

**TL;DR:** The systematic framework used to validate historical trading performance, incorporating realistic transaction costs, execution constraints, and regime classification filters.

## Core Rules for Indian Equities
- **STT and Fees:** Must model the high STT hikes (April 2026) on derivatives and delivery cash.
- **Slippage and Impact:** Incorporate non-linear slippage models like the square-root law of market impact to prevent overestimating returns for large orders.
- **Regime Conditioning:** Filter trades using GARCH volatility persistence or Hurst exponent estimators to prevent drawdowns during consolidation phases.
- **Short Constraints:** Account for overnight borrow restrictions on non-F&O cash equities.

## Linked Nodes
- [[square_root_law]]
- [[metaorders]]
- [[dealer_markets]]
- [[smart_order_routing]]
- [[ssrn_networks]]
- [[preprint_latency]]
