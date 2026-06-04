---
date: 2026-06-04
source_url: https://quantocracy.com/
source_type: website
publication: Quantocracy
author: Quantocracy Community & Aggregator
publish_date: 2026-06-04
tags: [quant, blogs, resources, systematic-trading, algo-trading, backtesting, factor-investing]
status: raw
---

# Quantocracy: The Quantitative Trading Aggregator Ecosystem

> **Why Lijo read this**: What are the top blogs, websites, and resources aggregated by Quantocracy that we can use to develop trading strategies for SachNetra?

---

## TL;DR (3 bullets)

- Quantocracy is the premier "mashup" or curator website that aggregates only rigorous, empirical, and data-driven quantitative finance blogs.
- Key core resources include **Quantpedia** (trading anomalies database), **Alpha Architect** (factor and momentum research), and **Robot Wealth** (practical machine learning).
- The platform uses a community voting/click system to rank the most relevant and robust posts every 48 hours, filtering out noise and non-empirical content.

---

## ELI12 — what is this actually saying?

Imagine there are hundreds of scientists around the world writing diaries about their secret recipes for trading. Some recipes are bad, some are too complicated, and some are really good. Instead of checking every diary every day, you go to a noticeboard called Quantocracy. The board only displays the best recipes that other smart people have voted for. It helps us find where the best ideas are published so we can copy them.

---

## Glossary (new terms only)

- **Blogroll** — A list of links to other blogs or websites recommended by a blogger; Quantocracy's blogroll serves as the whitelist of approved, data-driven quant sites.
- **Quantpedia** — An online database that maps, analyzes, and categorizes hundreds of academic and empirical trading strategies/anomalies.
- **Factor Investing** — An investment strategy that chooses securities based on attributes (factors) associated with higher returns (e.g. value, momentum, low volatility).
- **Zorro Trader** — A specialized C/C++ automated trading and backtesting software platform, often discussed in developer-centric blogs.

---

## State of the market RIGHT NOW (per this source)

This source is **descriptive** (resource aggregator guide), but points to the current research landscape:

- **If true, then**: The most successful quantitative content is shifting away from simple indicators (like moving averages) toward systematic factor premiums, machine learning pipelines, and multi-asset class relative value.
- **Time horizon**: Ongoing, multi-year relevance.

---

## So what for SachNetra?

**Experiments to add/kill**:
- Add: Exp## — Implement a scraper for the Quantocracy RSS feed to extract the top-clicked links daily. Use a simple NLP model to categorize these links by topic (e.g., "microstructure", "crypto", "trend-following") to alert us of new ideas.
- N/A: Individual blog posts (need specific review first).

**Features to build**:
- **Quantocracy RSS Panel**: Add a feed panel to SachNetra's `finance` variant that displays the latest top-rated links from Quantocracy's RSS feed (`http://feeds.feedburner.com/Quantocracy`).

**Data to capture**:
- Quantocracy RSS XML feed.

**Pursue / Park / Kill** (pick exactly one):

- **Kill** — Re-triaged from Pursue (2026-06-04, Claude review). As written this is UI polish (explicitly on the V2 kill list) inside a sacred file (`src/config/variants/finance.ts` — DO NOT TOUCH per CLAUDE.md). Not a build. If you want the feed personally, it's a browser bookmark, not a SachNetra feature.

---

## Open questions (for next session)

- Does Quantocracy have an API, or do we have to parse their standard RSS/Atom feed?
- How frequently does the RSS feed update, and is it rate-limited?
- Which of the aggregated blogs (e.g., Alpha Architect vs. Quantpedia) should we prioritize for systematic commodity trading research?

---

## Wiki impact

> To be filled at the promote-to-wiki step.

- **Created**: [[quantocracy]], [[factor_investing]], [[quantpedia]]
- **Updated**: [[quant_reading_list]]
- **Logged in**: `wiki/log.md` on 2026-06-04
- **Status after promote**: `promoted_to_wiki`

---

## Source excerpt

### Key Resources and Blogs Aggregated by Quantocracy

#### 1. Alpha Architect (https://alphaarchitect.com/)
- **Focus**: Quantitative value and momentum investing, ETF construction, and behavioral finance.
- **Why it's useful**: High-quality, academically backed analysis of long-term factor performance.

#### 2. Quantpedia (https://quantpedia.com/)
- **Focus**: Algorithmic trading strategies, backtests, and academic anomalies.
- **Why it's useful**: Excellent starting point to find tested trading rules and strategy logic for various asset classes.

#### 3. Robot Wealth (https://robotwealth.com/)
- **Focus**: Data science, machine learning, and practical execution of algorithmic trading for retail traders.
- **Why it's useful**: Great coding tutorials (Python/R) and focus on trade execution, slippage, and walk-forward analysis.

#### 4. Better System Trader (https://bettersystemtrader.com/)
- **Focus**: Podcasts and interviews with professional, retail, and academic systematic traders.
- **Why it's useful**: Relatable stories and practical tips on risk management and research workflows.

#### 5. Financial Hacker (https://financial-hacker.com/)
- **Focus**: Coding trading systems, Zorro/C++ development, and systematic backtesting.
- **Why it's useful**: Very technical, focusing on the actual implementation details and pitfalls of backtesting.
