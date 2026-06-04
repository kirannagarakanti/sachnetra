---
date: 2026-06-04
source_url: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5046242
source_type: academic_paper
publication: Social Science Research Network (SSRN)
author: Natascha Hey, Iacopo Mastromatteo, and Johannes Muhle-Karbe
publish_date: 2025-01-15
tags: [quant, cross-impact, market-impact, execution-algorithms, portfolio-risk, square-root-law]
status: promoted_to_wiki
---

# When Trading One Asset Moves Another: Cross-Impact and the Square-Root Law

> **Why Lijo read this**: How does executing a trade in one asset affect the price of another asset, and how can we model this "cross-impact" to reduce transaction costs in multi-asset portfolios?

---

## TL;DR (3 bullets)

- The paper empirically analyzes "cross-impact" (spillover price impact from trading related assets) using a large proprietary dataset of metaorders from a major hedge fund.
- The authors demonstrate that cross-impact, like direct impact, scales according to a non-linear **square-root law** relative to the trade volume, rather than a linear relation.
- Factoring cross-impact into portfolio execution plans can reduce transaction costs by 10%–15% compared to executing each asset independently.

---

## ELI12 — what is this actually saying?

Imagine you go to a market to buy a huge amount of apples. Obviously, the price of apples goes up because you are buying so many. But because apples and pears are similar, your massive apple purchase also makes the price of pears go up, even though you didn't buy any pears! This is called **cross-impact**. This paper proves that this price jump doesn't scale in a straight line; instead, it scales using a mathematical curve called a "square root" (it jumps fast at the beginning and then slows down). If you plan your shopping for both fruits together, you can save a lot of money.

---

## Glossary (new terms only)

- **Cross-Impact** — The price change in one financial asset caused by the execution of a trade in a different, related asset.
- **Direct Impact** — The price change in an asset caused directly by trading that specific asset.
- **Metaorder** — A large order that is split into a series of smaller child orders to be executed over a period of time to minimize market impact.
- **Square-Root Law of Impact** — An empirical rule stating that the price impact of a metaorder is proportional to the square root of the size of the order relative to the daily volume.

---

## State of the market RIGHT NOW (per this source)

This source is **descriptive/predictive** of execution slippage:

- **If true, then**: Multi-asset trading systems that ignore cross-impact will systematically underestimate transaction costs, leading to sub-optimal execution schedules and over-trading in highly correlated sectors.
- **Time horizon**: Intra-day execution (hours to days).

---

## So what for SachNetra?

**Experiments to add/kill**:
- Add: Exp## — Measure the cross-impact of executing large trades in NIFTY index futures on the prices of major sector index futures (Bank Nifty, IT, etc.). Fit a square-root model to estimate the cross-impact coefficients ($\beta_{ij}$).
- N/A: No direct trading strategy to kill.

**Features to build**:
- **Cross-Impact Execution Optimizer**: Build a utility in the execution engine that coordinates the trade schedules of correlated assets (e.g., buying Reliance and Nifty Futures) to minimize combined market impact.

**Data to capture**:
- Intraday execution logs and Level-2 tick data during large executions to measure cross-asset price deviations.

**Pursue / Park / Kill** (pick exactly one):

- **Park** — Re-triaged from Pursue (2026-06-04, Claude review). Blocked on data + infrastructure we don't have: cross-impact measurement needs Level-2/tick data and a live execution engine, but SachNetra runs EOD `research_prices` with no order router. This is an institutional-desk tool, not a solo-EOD-trader build, and contradicts "be your own first customer." Testable only if/when we both have Level-2 feeds AND are executing real size through a routing stack.

---

## Open questions (for next session)

- Does cross-impact decay at the same rate as direct impact once execution stops, or is the decay faster?
- How do we separate true cross-impact from general market movement or shared macroeconomic signals?

---

## Wiki impact

- **Created**: [[market_impact]] (Consolidated with Metaorders, Cross-Impact & Square-Root Law), [[portfolio_optimization]]
- **Updated**: [[backtesting_methodology]]
- **Logged in**: `wiki/log.md` on 2026-06-04
- **Status after promote**: `promoted_to_wiki`

---

## Source excerpt

### Paper Abstract (from SSRN #5046242)

"We study the price impact of trading across multiple assets, a phenomenon known as cross-impact. Using a unique database of metaorders executed by a major hedge fund, we show that cross-impact is a significant driver of execution costs and is characterized by non-linearities. Specifically, the temporary cross-impact of a trade in asset $A$ on the price of asset $B$ scales with the square root of the volume of asset $A$, scaled by the daily volume of $B$. We develop a multi-asset market impact model incorporating these findings and show that co-optimizing the execution of a basket of correlated assets leads to substantial cost savings compared to traditional single-asset execution models."
