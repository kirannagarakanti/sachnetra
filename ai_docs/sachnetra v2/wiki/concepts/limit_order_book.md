---
tags: [quant, market-microstructure, order-types, execution]
source: [[2026-06-04_ssrn-navigating-the-murky-world-of-hidden-liquidity]]
last_updated: 2026-06-04
---
# Limit Order Book & Hidden Liquidity

**TL;DR:** The electronic record of outstanding buy and sell limit orders on an exchange, detailing visible Level-1/2/3 queue depths alongside hidden resting liquidity (icebergs, dark pools).

## 1. Limit Order Book (LOB) Hierarchy
- **Level 1:** Best bid and best ask prices (touch price) and their immediate sizes.
- **Level 2:** Complete grid showing sizes at various price levels away from the touch.
- **Level 3:** Queue-level details revealing individual order identifiers and sizes.
- **LOB Dynamics:** Price discovery, order cancellation rates, and spread stability.

## 2. Hidden Liquidity
- **Market Fragmentation:** In modern electronic markets, a substantial portion of resting liquidity (often exceeding 40%) is hidden from the public book to prevent front-running and execution slippage.
- **Venues:** Primary forms include iceberg orders on public exchanges and completely hidden matching orders in private dark pools.
- **Detection via Machine Learning:** Classifiers (such as XGBoost) can predict the presence of hidden size by monitoring the duration between trades, order book fill speeds, and trade size distribution anomalies.

## 3. Iceberg Orders
- **Display Slice:** Only a small display quantity is visible at the target price level in the Level-2 book.
- **Refresh Mechanism:** Once the visible slice is fully executed, the exchange automatically refreshes the public quantity from the hidden balance until the total order size is filled.
- **Microstructure Indicators:** Refills can be detected when a price level absorbs more volume than its visible depth or when time between successive executions drops.
- **Indian Market Execution:** Supported by major Indian exchanges (NSE and BSE) for cash equity and derivatives.

## Linked Nodes
- [[smart_order_routing]]
- [[dealer_markets]]
- [[backtesting_methodology]]
