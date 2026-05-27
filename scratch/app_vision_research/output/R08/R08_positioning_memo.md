# R08 — SachNetra Positioning Memo

**Date:** May 27, 2026  
**Audience:** Lijo  
**Purpose:** Strategic analysis of SachNetra's target personas, product positioning, and feature prioritization based on the contrast between professional/systematic and retail trader cohorts.

---

## 1. Target Audience Recommendation (2026–2027)

### **Primary Target: Serious / Fundamental Investors** (Cohort A segment)
### **Secondary Target: Active Swing Traders** (Cohort B segment transitioning out of F&O)

### **Evidence-Based Rationale:**
*   **The Decline of Speculative Retail F&O:** Retail F&O day trading is undergoing a major contraction. The April 1, 2026 STT hike (futures to 0.05%, options to 0.15% on premium) and SEBI's weekly expiry restrictions (limiting exchanges to one index expiry per week) have significantly increased transaction costs. Retail option buyers are actively seeking to shift capital from F&O to cash swing trading due to margin constraints and increased failure rates (SEBI data shows ~91% of retail F&O traders lose money, with cumulative retail losses reaching ₹1.06 lakh crore in FY25). Unique retail trader counts fell from over 61 lakh to 42.7 lakh by Q4 FY25. B2C features targeted at speculative F&O day traders address a shrinking and unprofitable market.
*   **The Rise of Structural Domestic Inflows:** While foreign capital is risk-off (FPI equity MTD outflow of -₹34,469 cr as of May 27, 2026), domestic retail capital is highly resilient and structural. DIIs recorded a net buy of +₹63,445 cr MTD (as of May 27) driven by persistent monthly SIP flows (₹31,115 cr in April 2026). This indicates a massive pool of retail savings moving away from speculative day-trading toward structured, long-term equity investing. 
*   **The Unviable Pro Terminal Space:** High-end systematic/quant pros already pay for institutional terminals (Bloomberg, Reuters Eikon, Cogencis) and direct exchange tick data APIs. SachNetra cannot compete in this space in the near term.
*   **Positioning Verdict:** SachNetra should serve the **Serious Fundamental Investor** and **Active Swing Trader**. These users need clean, unmanipulated corporate filings, structural flow metrics (DII/FPI ratios), and high-precision ticker-tagged headlines without paying for a Bloomberg Terminal.

---

## 2. Features Pros Would Mock but Retail Loves

These features are highly popular among retail day traders but are viewed by systematic professionals as speculative noise or "dumb money" traps:
*   **Social Sentiment / "Community Temperature" Widgets:** B2C voting indicators showing whether the community is "Bullish" or "Bearish" on a stock.
*   **Grey Market Premium (GMP) Trackers:** Real-time updates on active SME IPO premiums (such as Merritronix or Rajnandini Fashion). Pros view these as highly manipulated, thin-volume pump-and-dump proxies.
*   **Intraday Chat Rooms / "Hot Ticker" Lists:** Feeds that display stocks showing sudden spikes in social media mention volume. Pros view this as lagging noise that induces FOMO.

---

## 3. Features Pros Need but Retail Ignores

These features are essential for institutional-grade workflows and systematic desks but are overlooked by casual retail participants:
*   **Zero-False-Positive Entity Disambiguation:** Ticker-tagging algorithms that maintain near-100% precision (e.g. ensuring the word "IT" is never tagged as a ticker, and distinguishing corporate parent announcements from subsidiaries).
*   **Direct PDF Corporate Filing Ingestion:** Instant extraction of exchange filings (such as bulk/block deal records, shareholding pattern shifts, and director exits) with links to official exchange PDF uploads.
*   **Granular Macro & Institutional Flow APIs:** Direct API endpoints providing structured access to NSDL FPI tables, provisional DII daily purchases, and currency REER indices.
*   **Historical Event-Tag Databases:** Structured logs matching regulatory shocks, corporate filings, and macro prints to specific tickers to facilitate quantitative backtesting.

---

## 4. B2B Data Asset Thesis Validation (`sachnetra_quant_pivot.md`)

The B2B data asset thesis proposed in the pivot document aligns closely with the needs of the systematic trading cohort:
*   **Quant Need for Event Data:** Systematic managers (e.g. Alok Jain, Nitesh Khandelwal) emphasize that trading edge in 2026 relies on rule-based execution. Having a clean, database-ready feed of corporate event signals (such as exchange filing timestamps mapped to tickers) is highly valuable for quantitative desks building backtests.
*   **The API Constraint:** Quant desks will **not** buy a visual news aggregator UI. They will buy a structured, low-latency API feed (JSON/CSV) that integrates directly into their PostgreSQL/ClickHouse databases.
*   **Accuracy as a Dealbreaker:** The dataset is only saleable if the Named Entity Recognition (NER) pipeline has near-zero false positives. If the data tags a macro commentary article as direct company filings, it corrupts the backtest.

---

## 5. Non-Goals Reinforced

To maintain focus and avoid regulatory/operational risks, SachNetra must reinforce these three non-goals:
1.  **Not a Discount Broker:** SachNetra will not build execution infrastructure or hold client margins, avoiding capital-intensive competition with incumbents (Zerodha, Groww, Angel One).
2.  **Not an Investment Terminal:** SachNetra will not attempt to replicate Bloomberg's charting or multi-asset pricing screens.
3.  **Not a Tips/Advisory Channel:** In alignment with SEBI's aggressive enforcement actions against unregistered advisory channels (such as the Wealth Solitaire / desiwallstreet fines in May 2026), SachNetra will never publish stock-specific "Buy/Sell" calls or crowdsourced tips.

---

## 6. G1 Ticker Tagging Relevance

*   **Pros vs. Retail Needs:** 
    *   **Pros** care about **precision and data structure**. They require ticker tags to be categorized hierarchically (separating direct company news like corporate filings from indirect sector commentary) and demand a zero-false-positive rate so it can be fed into automated trading scanners.
    *   **Retail** cares about **convenience and speed**. They want ticker tags as simple hyperlinks on headlines that open basic financial metrics, helping them quickly verify whether a breaking news story is relevant to their active watchlists.
*   **Product Action:** The G1 tagging pipeline must focus on high precision (using strict stoplists and entity disambiguation maps) rather than maximum recall.
