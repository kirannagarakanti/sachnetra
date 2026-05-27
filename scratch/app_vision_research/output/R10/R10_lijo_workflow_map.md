# R10 — Lijo Workflow Map

This document maps out the target workflow for Lijo as **User #1** of SachNetra. Because Lijo is a builder who has **never traded** and does not actively follow the markets daily, this workflow map contrasts his current posture as a founder-operator with the structured routine he needs to adopt to successfully **paper trade** SachNetra's signals and learn the markets.

---

## 1. Instruments
*   **Current State:** None (has never traded or invested in cash equity, intraday, F&O, mutual funds, or PMS).
*   **Target Paper-Trading Universe:** Cash Equity (Delivery) only on the Nifty 50 and key mid-cap stocks.
    *   *Why:* Intraday and F&O are highly leveraged, zero-sum, and subject to high transaction costs (STT increased as of April 1, 2026). Delivery-based cash swing trading is the safest way to prove a signal's edge without leverage or timing risk.
*   **Excluded Instruments:** Options, Futures, Commodity, Currency, and SME IPOs (GMP tracking is out of scope due to regulatory risks).

## 2. Brokers & Tools
*   **Current Daily Apps:** None (does not open Kite, Groww, or other trading apps).
*   **Target Setup:** 
    *   **Trading Interface:** A dummy trading terminal (e.g., Zerodha Kite Virtual/Paper Trading portal or a manual spreadsheet).
    *   **Data Desk:** SachNetra.com as the morning aggregator (9:00 IST) and evening audit desk.
    *   **Logging Tool:** A dedicated Google Sheet ("SachNetra Paper Trading Journal") for tracking signals, execution prices, and T+1/T+5 outcomes.

## 3. Decisions Per Week
*   **Current State:** 0 decisions.
*   **Target Paper-Trading Routine (3–5 decisions/week):**
    *   **Buy/Watch Trigger:** Driven entirely by high-conviction SachNetra signals (e.g., positive sentiment spikes > 0.8 on Nifty 50 names, or high-alpha corporate filings like promoter pledge reductions or auditor changes).
    *   **Execution Rule:** Open the paper-trading sheet at 9:15 AM or 3:15 PM, check for active alerts, and record a simulated market-order buy.
    *   **Sell/Exit Rule:** Auto-sell after a fixed time horizon (T+1 day or T+5 days) or when a negative sentiment spike occurs. No complex technical exit rules.

## 4. Data Consumed
*   **Target Core Data Inputs:**
    1.  **Corporate Filings Feed:** Real-time NSE/BSE company announcements (from PostgreSQL `nse_bourse_announcements` table).
    2.  **Bilingual News Sentiment:** Deduplicated news clusters with FinBERT sentiment scores (from PostgreSQL `india_news_signals`).
    3.  **Institutional Flow Balance:** Daily FII/DII net flows (from `fpi.nsdl.co.in` via Task V2-017/V2-017b).
*   **Excluded Inputs:** Heavy technical charting, real-time order book ticks, derivative chains, and Telegram/Reddit tips.

## 5. Friction Log (Why Lijo loses time or can't trade today)
*   **Friction 1: Direct Database Blindness.** Lijo does not know how to run PostgreSQL queries. When a new filing table (V2-018) or daily flow pipeline (V2-017) is completed, Lijo cannot inspect the data without James writing a script or exposing it to the UI.
*   **Friction 2: Inability to Log Signals.** When a signal fires (e.g., a major contract win announcement for HAL), there is no "Paper Trade This" button or Google Sheet sync. Lijo has to manually copy-paste headlines and tickers.
*   **Friction 3: Lack of Walk-Forward Verification.** Lijo has no historical feedback loop showing him: "If you bought every stock with a positive sentiment spike of >0.8 in the last 30 days, would you have made money?" This forces him to rely on blind trust.

## 6. SachNetra Today: What Works vs. What's Missing
*   **What Works:**
    *   **Syndication Deduplication:** Jaccard-based headline clustering (live on site) prevents news bloat.
    *   **Bilingual Sentiment Chain:** FinBERT + Xenova + Groq sentiment scoring pipeline is operational in the DB backend.
    *   **Announcements DB:** 17,000+ historical NSE announcements are stored and verified (V2-018).
*   **What is Missing (The Gaps):**
    *   **Signal Visualization Panel:** The consumer UI is just a list of news cards. It does not pull out the high-conviction "Signals" (e.g. sentiment score changes, filings matching high-alpha filters) into a separate workspace.
    *   **Watchlist/Portfolio Filter:** Cannot filter the news feed for specific stocks.
    *   **EOD Email Alerts:** Lijo must actively check the page; no push or email alert triggers when a key filing is indexed.
    *   **SEBI Regulatory Shield:** No footer disclaimers warning retail users that this is a data-only tool, creating legal liability.
