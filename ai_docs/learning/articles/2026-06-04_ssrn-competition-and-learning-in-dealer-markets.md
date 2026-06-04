---
date: 2026-06-04
source_url: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4838181
source_type: academic_paper
publication: Social Science Research Network (SSRN)
author: Hanna Assayag, Alexander Barzykin, Rama Cont, and Wei Xiong
publish_date: 2024-05-18
tags: [quant, reinforcement-learning, market-making, nash-equilibrium, dealer-markets]
status: promoted_to_wiki
---

# Competition and Learning in Dealer Markets

> **Why Lijo read this**: How do autonomous AI-powered market-making agents compete in dealer markets, and does their presence lead to stable and efficient price formation?

---

## TL;DR (3 bullets)

- The paper models a decentralized dealer market where multiple autonomous, reinforcement learning (RL) based market-making agents compete.
- By integrating Nash equilibria and mean-field game theory, the authors show that dealer heterogeneity (different starting conditions, inventory constraints, and learning rates) prevents collusive pricing or systematic over-bidding.
- RL agents learn to automatically quote narrower spreads during low-volatility regimes and wider spreads during high-volatility regimes, ensuring self-organized market stability.

---

## ELI12 — what is this actually saying?

Imagine a market where the shopkeepers are all computer robots learning to buy and sell stuff. If all the robots are exactly the same, they might team up and overcharge you (collusion). But this paper shows that if the robots have different amounts of storage space, different speeds of learning, and different amounts of money, they will compete fiercely. They end up naturally charging very little when things are calm, but charging more when things get chaotic (to cover their risk). The system remains stable because they are different from one another.

---

## Glossary (new terms only)

- ...
- **Dealer Market** — A financial market structure (like OTC bonds or FX) where dealers act as market makers, posting bids and asks, and taking the other side of client trades.
- **Mean-Field Game Theory** — A mathematical framework used to study decision-making in large populations of small, interacting agents, approximating the population with a single average field.
- **Nash Equilibrium** — A stable state in game theory where no player has an incentive to unilaterally change their chosen strategy.
- **Inventory Risk** — The risk that a dealer/market maker holds a large amount of an asset whose price drops before they can sell it.

---

## State of the market RIGHT NOW (per this source)

This source is **descriptive/analytical** (theoretical modeling of multi-agent RL systems in OTC markets) rather than a direct trade signal.

- **If true, then**: Market simulations that assume uniform agent behaviors are deeply flawed. A diverse mix of agents is a necessary prerequisite for simulating realistic market stability and price formation.
- **Time horizon**: Structural, long-term market simulation design.

---

## So what for SachNetra?

**Experiments to add/kill**:
- Add: Exp## — Build a multi-agent simulation framework where multiple RL agents (e.g. Q-learning or PPO agents) compete in a simulated limit order book. Introduce different inventory penalty functions ($\gamma$) to test if the resulting bid-ask spreads match real NSE market width.
- N/A: No direct trading strategy to kill.

**Features to build**:
- **Market Simulator Component**: A simulation service in `src/services/` that can spawn N heterogeneous market-making agents to test how our execution algorithms perform against different types of competitors.

**Data to capture**:
- Historical order book spread width under different volatility levels to calibrate the simulation agents.

**Pursue / Park / Kill** (pick exactly one):

- **Park** — Re-triaged from Pursue (2026-06-04, Claude review). A multi-agent RL market simulator presupposes an execution algorithm to benchmark — we have none (EOD batch signals, no live execution). Heavy infra for a problem we don't have yet. Revisit only if/when execution slippage becomes a measured bottleneck on a live strategy.

---

## Open questions (for next session)

- What RL algorithms (Q-learning, DDPG, PPO) are best suited for modeling market maker behavior in low-latency environments?
- How do execution algorithms perform when competing against RL dealers compared to standard rules-based (Avellaneda-Stoikov) dealers?

---

## Wiki impact

- **Created**: [[dealer_markets]] (Consolidated with Mean-Field Games & Inventory Risk)
- **Updated**: [[backtesting_methodology]]
- **Logged in**: `wiki/log.md` on 2026-06-04
- **Status after promote**: `promoted_to_wiki`

---

## Source excerpt

### Paper Abstract (from SSRN #4838181)

"We study a model of decentralized dealer markets where multiple dealers learn to quote buy and sell prices using reinforcement learning in a game-theoretic framework. While literature shows that uniform reinforcement learning agents can learn to collude, we demonstrate that when dealers are heterogeneous in their risk aversion, inventory capacities, or learning parameters, the market converges to a competitive equilibrium resembling a Nash-Mean Field Game. The agents learn to manage their inventory risk by adjusting their bid-ask spreads dynamically in response to market volatility and transaction flow. Our results have policy implications for the oversight of algorithmic trading and the stability of OTC markets."
