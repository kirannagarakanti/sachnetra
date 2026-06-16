---
tags: [quant, execution, routing]
source: [[2026-06-04_ssrn-navigating-the-murky-world-of-hidden-liquidity]]
last_updated: 2026-06-04
---
# Smart Order Routing (SOR)

**TL;DR:** Algorithmic execution engines that automatically scan multiple exchanges and dark venues to route orders to the points of maximum liquidity and lowest execution cost.

## Functional Principles
- **Multi-Venue Execution:** Monitors fragmented market order books in real-time, executing trades across public exchanges and private dark pools.
- **Slippage Minimization:** Optimizes how child orders are split and routed to avoid moving market prices or alerting predatory HFT algos.
- **Hidden Liquidity Capture:** Integrates real-time iceberg detection classifiers to route orders directly to venues with estimated hidden resting volume, maximizing the fill rate of large blocks.

## Linked Nodes
- [[hidden_liquidity]]
- [[iceberg_orders]]
- [[limit_order_book]]
- [[backtesting_methodology]]
