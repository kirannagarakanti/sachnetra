# R08 — Tooling Stacks: Professional vs. Retail

This document outlines the software and infrastructure layers utilized by professional/systematic market participants versus retail day traders in India in May 2026. It highlights the overlap with SachNetra's current capabilities and identifies key product gaps.

## Tooling Stack Comparison

| Layer | Professional / Systematic Stack | Retail / Day Trader Stack |
| :--- | :--- | :--- |
| **Charting** | - **TradingView Enterprise** ([tradingview.com](https://tradingview.com))<br>- **Bloomberg Terminal** ([bloomberg.com](https://bloomberg.com))<br>- **Custom Python Dashboards** (Matplotlib, Plotly, Streamlit) | - **TradingView Free/Pro** ([tradingview.com](https://tradingview.com))<br>- **Broker Integrations** (Kite ChartIQ/TradingView, Groww charts) |
| **News** | - **Bloomberg Terminal** ([bloomberg.com](https://bloomberg.com))<br>- **Reuters Eikon** ([eikon.thomsonreuters.com](https://eikon.thomsonreuters.com))<br>- **Direct Exchange Feeds** (NSE/BSE direct feeds)<br>- **Cogencis Workstation** | - **Moneycontrol Pro** ([moneycontrol.com](https://moneycontrol.com))<br>- **Economic Times** ([economictimes.indiatimes.com](https://economictimes.indiatimes.com))<br>- **Livemint** ([livemint.com](https://livemint.com))<br>- **Social Media** (Telegram, Twitter/X) |
| **Scanner** | - **Custom Python Scripts** using broker APIs (Kite Connect, SmartAPI)<br>- **Falcon** (institutional scanner)<br>- **Chartink Premium** ([chartink.com](https://chartink.com)) | - **Chartink Free** ([chartink.com](https://chartink.com))<br>- **Screener.in** ([screener.in](https://screener.in))<br>- **Trendlyne** ([trendlyne.com](https://trendlyne.com))<br>- **Tickertape** |
| **Backtest** | - **Python Libraries** (Backtrader, Zipline, PyAlgoTrade)<br>- **Blueshift** by QuantInsti ([blueshift.quantinsti.com](https://blueshift.quantinsti.com))<br>- **Custom tick databases** (PostgreSQL, ClickHouse) | - **Manual Backtesting** (scrolling historical charts)<br>- **TradingView Pine Script** (basic strategy tester) |
| **Execution** | - **Institutional Desks** (Kotak Securities, ICICI Securities, Motilal Oswal, IIFL)<br>- **Interactive Brokers API** ([interactivebrokers.co.in](https://www.interactivebrokers.co.in/))<br>- **Kite Connect API** (Zerodha) | - **Discount Broker Apps** (Zerodha Kite, Groww, Angel One, Dhan) |
| **Risk / Compliance** | - **Proprietary Risk Modules** (internal PMS/RMS)<br>- **Excel (VBA/Macros)** linked to live APIs<br>- **Dedicated Compliance desks** | - **Manual Excel/Google Sheets** tracking<br>- **Broker Built-in Displays** (margin calculators, portfolio screens) |

---

## SachNetra Overlap and Gaps

### 1. Current Overlap
*   **RSS News Ingestion:** SachNetra's core capability overlaps with the retail news layer, aggregating feeds from mainstream financial portals (Moneycontrol, Economic Times, Livemint, Business Standard) and displaying them in a unified interface.
*   **Basic Flow tracking:** SachNetra's planned integration of EOD FPI/DII net flows overlaps with the basic flow metrics that retail day traders track manually or via daily broker PDFs.

### 2. Gaps vs. Professional Stack
*   **Institutional Data Feeds:** Pros rely on direct exchange tick-by-tick data (Level 3 data) and direct corporate disclosures (bulk/block deals, exchange filing alerts). SachNetra is currently limited to high-level news headlines and EOD statistics.
*   **Backtesting & Algorithmic Infrastructure:** Systematic traders require high-frequency tick databases (such as custom PostgreSQL or ClickHouse setups) and Python execution runners. SachNetra has no backtesting engine or execution APIs.
*   **Unified Risk & Margin Tracking:** Pros utilize real-time risk management systems (RMS) that enforce stop-outs and position sizing dynamically. SachNetra does not integrate with brokers or track active trade positions.
*   **Named Entity Recognition (NER) Precision:** Pros require extreme precision when tagging entities in filings. Standard news aggregators often experience false positive rates (e.g. tagging common words like "IT" as a ticker) which pros find unusable. SachNetra's current G1 ticker tagging development aims to bridge this gap, but requires institutional-grade precision (no false positives).
