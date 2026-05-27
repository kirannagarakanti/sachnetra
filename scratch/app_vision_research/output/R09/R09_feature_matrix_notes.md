# R09 — Feature Matrix Notes & Analysis

**Date Baseline:** May 2026  
**Objective:** Contextualize the feature matrix and identify candidate product wedges for SachNetra.

---

## 1. Candidate Product Wedges (SachNetra "Yes" / Competitors "No" or "Partial")

These are the areas of unique advantage where SachNetra stands alone or represents one of the few providers, justifying the B2B data asset thesis or consumer positioning.

### Wedge 1: FinBERT Sentiment in DB
*   **The Matrix Cell:** Only **SachNetra** and **Heckyl** are marked `yes`. All consumer portals (Moneycontrol, ET, Google News) are `no`.
*   **Why It Matters:** Mainstream news platforms do not expose their underlying natural language processing (NLP) databases. Serious fundamental investors and quantitative analysts want structured sentiment feeds directly in their database environments to build and refine backtests. Exposing this via a PostgreSQL pipeline (`india_news_signals`) is a core differentiator.

### Wedge 2: Backtest / Event API
*   **The Matrix Cell:** **SachNetra**, **Bloomberg** (B-PIPE), and **Heckyl** are `yes`. All consumer portals are `no` (Trendlyne is `partial` because it only allows visual screeners, not raw database APIs).
*   **Why It Matters:** Systematic desks do not want a visual UI; they want structured API access to corporate action events mapped to historical tickers. Bloomberg and Heckyl lock this behind B2B paywalls costing lakhs per year. Providing a cost-effective, developer-friendly endpoint for structured event data is a wide-open market opportunity.

### Wedge 3: Real-Time Broker Outage Monitor
*   **The Matrix Cell:** **Everyone** (including SachNetra today) is `no`.
*   **Why It Matters:** This is a clear "nobody wins" whitespace. As noted in `R04_product_implications.md` and `R06_sachnetra_relevance.md`, retail users suffer from Zerodha and Groww connectivity lags during high-volatility sessions. Mainstream news takes 1–3 hours to report these outages. Implementing a social-scraper-based latency and outage dashboard represents a high-impact, low-cost B2C crowd puller.

### Wedge 4: Headline → Ticker Tags (G1 NER Pipeline)
*   **The Matrix Cell:** **SachNetra**, **Bloomberg**, and **Heckyl** are `yes` (or `partial` for others).
*   **Why It Matters:** Moneycontrol and ET Markets use basic keyword matching, resulting in severe false positives (e.g., tagging the word "IT" or "Capital" as stock symbols). Google News has no ticker mapping. SachNetra's G1/V2-031b pipeline aims for near-zero false positives, separating direct corporate filings from general sectoral commentary.

---

## 2. Footnotes & Annotations

1.  **India RSS multi-source digest:** Google News aggregates everything but lacks specialized financial filters. Finshots does not aggregate; they write one story a day. Zerodha Kite redirects news via Pulse. SachNetra aggregates 30+ sources ad-free.
2.  **FII/DII flow tile:** Moneycontrol and ET show EOD figures but wrap them in editorial narratives. Trendlyne and TickerTape show charts. SachNetra is building a raw flow ratio dashboard (provisional DII buying vs. FPI sales).
3.  **NSE filing PDF links:** Mainstream news portals rarely provide direct links to official PDF uploads on the exchanges, forcing users to search the NSE website manually. SachNetra links directly from the news item.
4.  **Sector rotation view:** TradingView and Trendlyne provide this visually. SachNetra's database structures it by mapping sector fields inside PostgreSQL, though the UI is currently partial.
5.  **Hindi content:** Moneycontrol, Dailyhunt, and ET have separate Hindi portals. SachNetra's backend processes Hindi/Hinglish (R06 vernacular lead), but the UI is English-only.
6.  **GMP / IPO grey market:** Standard news portals avoid hosting a live GMP index due to regulatory concerns (it is an unregulated market). GMP is tracked by specialized retail blogs (e.g., Chittorgarh) which are highly fragmented.
7.  **Real-time ticks:** Excluded from SachNetra as a non-goal (not a terminal).
8.  **STT/regulatory explainers:** Zerodha Varsity is the gold standard for education. Finshots explains policies in plain English. SachNetra currently has no educational tutorials.
9.  **WhatsApp brief:** Finshots runs a successful weekly summary. SachNetra's V2-008 roadmap plans a WhatsApp integration for automated daily digests.
