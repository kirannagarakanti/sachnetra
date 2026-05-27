# R04 — Product Implications Memo (Reddit Sentiment)

> [!NOTE]
> **Status:** Opinion Layer (Anecdote-based)
> This document synthesizes qualitative feedback and user discussions from target subreddits into actionable product recommendations for SachNetra's development roadmap.

---

## 1. The 9:00 IST Opening Dashboard
Retail traders opening an investment application at 9:00 IST seek a concise, objective summary of market drivers to prepare for the 9:15 IST opening bell. Subreddit analysis reveals four specific data views they wish they had:

* **FII/DII Net Investment Ratio:** Instead of reading generic articles, users want a clean visual representation of the institutional flow dynamics (e.g., FPI outflow vs. DII cash absorption). Knowing that DII flows serve as a "market shield" helps retail traders gauge index stability.
* **Global Queue Brief:** A single, consolidated tile showing Gift Nifty, SGX, US Futures, Brent crude oil spot price (with a color-coded warning alert if Brent is >$100), and the USD/INR spot rate.
* **Real-Time Broker Latency Status:** Due to recurring outages during high-volatility sessions (e.g., Zerodha and Groww connectivity lags), traders want a live health monitor showing the status and latency of major discount brokers. This helps them identify whether an app freeze is a personal connection issue or a platform-wide outage before executing orders.
* **SME Grey Market Premium (GMP) Index:** An aggregated, twice-daily updated tracker showing grey market premiums for active SME and mainboard IPOs, providing an objective proxy for listing-day speculation.

---

## 2. Drivers of News Distrust
Retail traders express significant distrust toward mainstream financial media. SachNetra can differentiate itself by avoiding these three key editorial pitfalls:

* **Delayed Outage Reporting:** Financial news portals frequently report broker system crashes hours after they have occurred and resolved. Retail traders rely on real-time community chatter (Reddit/Telegram) to verify outages. Delivering immediate, data-driven alerts on infrastructure failure will build high platform trust.
* **Post-Hoc Rationalization:** Headlines often attribute index movements to speculative reasons (e.g., "Nifty slips 1% due to profit booking in IT") when the move was driven by systemic FPI cash flow selling or currency adjustments. Retail traders prefer raw transaction flow metrics and corporate action timelines over retrofitted narratives.
* **PR and Sponsored Hype:** Media houses regularly publish promotional pieces for upcoming SME IPOs with weak financials, ignoring critical debt ratios or cash-flow red flags. Implementing an automated "red flag" alert on corporate filings will offer a trusted alternative to sponsored journalism.

---

## 3. Validation of G1 Ticker Tagging Direction
The G1 product direction of implementing automated **ticker tagging** on headlines is highly validated by retail feedback, with three specific constraints:

* **Strict Entity Disambiguation:** Users find it frustrating when common words are mistagged as tickers (e.g., tagging the word "IT" as a ticker or tagging "Capital" to random financial firms). The Named Entity Recognition (NER) pipeline must maintain high precision.
* **Tag Hierarchy (Direct vs. Indirect):** Traders want tags to differentiate between direct company news (e.g., corporate filings, earnings, executive exits) and indirect sector commentary (e.g., a macro analyst mentioning a sector's outlook).
* **Direct Links to Corporate Actions:** Tagged tickers should provide instant access to the company's exchange filing history (such as bulk/block deals or board meetings) rather than just redirecting to basic price charts.

---

## Strategic Recommendations for SachNetra

| Feature Area | User Need | Proposed Implementation | Priority |
| :--- | :--- | :--- | :--- |
| **Outage Tracker** | Real-time verification of broker failures | A user-reported latency monitor for Zerodha/Groww/Angel One | Medium |
| **Flow Visualizer** | Simple tracking of FII vs. DII dynamics | Daily DII/FPI cumulative absorption ratio tile | High |
| **SME GMP Aggregator**| Aggregated grey market data for active IPOs | Twice-daily scraped GMP index with risk warnings | Low |
| **NER Ticker Tags** | Contextual filtering of corporate news | Hierarchical tagging separating direct filings from news commentary | High |
