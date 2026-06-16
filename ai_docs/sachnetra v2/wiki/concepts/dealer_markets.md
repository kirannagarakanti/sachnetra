---
tags: [quant, market-microstructure, dealer-markets, game-theory, risk-management]
source: [[2026-06-04_ssrn-competition-and-learning-in-dealer-markets]]
last_updated: 2026-06-04
---
# Dealer Markets & Inventory Risk

**TL;DR:** Over-the-counter (OTC) decentralized financial markets where heterogeneous dealers supply liquidity by posting bid/ask quotes and directly manage inventory risk under game-theoretic competition.

## 1. Dealer Market Mechanics
- **Liquidity Provision:** Unlike centralized limit order books where buy and sell orders are automatically matched, dealer markets rely on designated intermediaries (dealers/market makers) to take the opposite side of trades.
- **Dynamic Spreads:** Under competitive regimes, dealer spreads naturally widen during high-volatility events to cover inventory risk, and narrow in low-volatility regimes.

## 2. Inventory Risk Management
- **Spread Skewing:** When a market maker accumulates a long inventory, they lower both their bid and ask prices (skewing the spread down) to discourage further buys and encourage sales.
- **Inventory Penalty ($\gamma$):** A parameter in execution models that penalizes holding positions away from a target inventory (usually zero). Higher penalty forces the agent to quote wider spreads or trade more aggressively to square off.
- **Volatility Scaling:** Inventory risk is a function of price volatility; when volatility spikes, the probability of a large adverse price move increases, forcing market makers to expand their spreads.

## 3. Mean-Field Games & Heterogeneous Competition
- **Multi-Agent Simplification:** Solves the curse of dimensionality in game theory by treating a massive group of individual competitors as a single continuous "mean field" or average population behavior.
- **Convergence to Nash Equilibrium:** Multi-agent reinforcement learning modeling demonstrates that when competing dealers have diverse inventory constraints, risk tolerances, and learning rates, the market converges to a stable, competitive Nash-Mean Field equilibrium rather than collusive pricing.

## Linked Nodes
- [[limit_order_book]]
- [[backtesting_methodology]]
