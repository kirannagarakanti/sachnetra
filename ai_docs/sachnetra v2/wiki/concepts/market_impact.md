---
tags: [quant, market-impact, cross-asset, execution, empirical-finance]
source: [[2026-06-04_ssrn-when-trading-one-asset-moves-another]]
last_updated: 2026-06-04
---
# Market Impact & Cross-Impact

**TL;DR:** The price change observed in a financial asset caused by the execution of a large metaorder in that asset (direct impact) or in a related asset (cross-impact).

## 1. Metaorders & Direct Impact
- **Slicing Large Orders:** Large block trades cannot be executed at once without causing prohibitive price jumps. Algorithms slice a parent order (metaorder) into small child orders over time.
- **Temporary vs. Permanent Impact:** Temporary impact represents short-term liquidity depletion which decays after execution stops. Permanent impact represents the permanent shift in price due to the trade's information content.

## 2. Square-Root Law of Market Impact
- **The Empirical Curve:** The price impact $I$ of a metaorder of volume $Q$ scales non-linearly with the square root of its size:
  $$I \approx Y \cdot \sigma \cdot \sqrt{\frac{Q}{V}}$$
  where $Y$ is a constant (typically $\approx 0.5$ to $0.7$), $\sigma$ is daily volatility, and $V$ is average daily volume.
- **Deceleration:** Impact increases rapidly for small sizes but slows down as size grows, reflecting the search for larger blocks of liquidity.

## 3. Cross-Impact Dynamics
- **Cross-Asset Spillover:** Executing a large buy order in Stock A (e.g. Reliance) pushes up the price of Stock B (e.g. Nifty futures or sector peers) due to correlation networks, index arbitrage, and shared liquidity.
- **Co-Optimization:** Factoring cross-impact parameters into execution models reduces transaction costs by 10%–15% compared to single-asset execution schedules.

## Linked Nodes
- [[portfolio_optimization]]
- [[limit_order_book]]
- [[backtesting_methodology]]
