# R09 — Whitespace & Positioning Memo

**Date Baseline:** May 27, 2026  
**Audience:** Lijo  
**Context:** Synthesis of market dynamics, user pain points, and competitor offerings to define SachNetra's strategic direction.

---

## 1. The Underserved User Cohorts

Our research (corroborating `R08_positioning_memo.md`) reveals two distinct cohorts that are currently neglected by mainstream Indian fintech:

### Primary: Serious / Fundamental Investors
*   **The Gap:** Serious long-term investors are ignored by retail brokers (who optimize for F&O volumes to generate brokerage) and are priced out of professional workstations like Bloomberg or Cogencis (costing ₹1.5L to ₹25L per year). 
*   **Competitor Failures:** Moneycontrol and ET Markets clutter their interfaces with penny stock tips, speculative technical levels, and intrusive pop-up ads. What these investors actually want is a clean, ad-free environment showing structured, verified corporate actions and macro indicators.

### Secondary: Active Cash Swing Traders (Ex-F&O Migrants)
*   **The Gap:** Due to the April 1, 2026 regulatory changes (Futures STT raised to 0.05%, Options STT raised to 0.15% on premium, and exchanges restricted to a single weekly index expiry), retail option day trading is contracting. F&O traders are actively migrating to cash swing trading. 
*   **Competitor Failures:** Swing traders require high-precision news tagging to quickly assess company-specific events. Existing apps use crude keyword matching, causing severe false positives. They also fail to provide real-time updates on corporate filings.

---

## 2. Underserved Data Types

SachNetra can establish a data advantage by prioritizing these three underserved datasets:

1.  **Precision Ticker Tagging on Exchange Filings:** A data feed linking news headlines and corporate announcements to specific stock tickers with near-100% precision (using strict stoplists to avoid tagging common words like "IT" or "Capital").
2.  **Raw Institutional Flows (No Editorial Narrative):** Mainstream media wraps FII/DII numbers in speculative stories ("market slips on profit booking"). Swing traders want raw transaction flow dynamics (such as the cumulative FPI-to-DII cash absorption ratio) to assess market support.
3.  **Hindi Macro & Policy Translation:** Vernacular channels on Telegram lead mainstream English portals in explaining complex SEBI regulations and inflation metrics (e.g., explaining why WPI is at 8.30% while CPI is at 3.48%). Providing clean Hindi explainers is a significant content gap.

---

## 3. Overserved Areas — Do NOT Build

To conserve resources and maintain focus, SachNetra must reinforce these three non-goals:

1.  **Real-Time Terminal Ticks & Professional Charts:** TradingView and retail brokers already offer world-class charting. Trying to compete here leads to massive data licensing fees and adds zero unique value.
2.  **F&O Option Chains & Greeks:** F&O day trading is a shrinking, unprofitable retail segment heavily constrained by SEBI. Do not build derivatives analysis tools.
3.  **GMP Tracker, Tip Channels, & Advisory:** Speculative Grey Market Premium (GMP) updates and crowdsourced "buy/sell" tips are prone to manipulation and carry severe SEBI regulatory risks. Keep these out of the core product.

---

## 4. The 9:00 IST Wedge Test

In `R04_product_implications.md`, we identified four features retail users wish they had at 9:00 IST to prepare for the market open. Here is how incumbents address them:

| Retail Wish (9:00 IST) | Who Ships It Today? | Gaps for SachNetra to Own |
| :--- | :--- | :--- |
| **FII/DII Absorption Ratio** | Trendlyne, TickerTape (EOD graphs only) | **Open:** A clean opening tile showing the cumulative flow ratio (currently ~1.84 MTD) as an index stability gauge. |
| **Global Queue Brief** | Moneycontrol, ET Markets (cluttered pages) | **Open:** A single, lightweight widget consolidating Gift Nifty, US Futures, Brent crude oil (>100 alert), and USD/INR. |
| **Real-Time Broker Latency Status** | **Nobody** (Brokers show static status pages; news portals report crashes 1–3 hours late) | **Open:** A social-scraper-based dashboard monitoring Zerodha/Groww system lag in real-time. |
| **SME Grey Market Premium (GMP)** | Unregulated blogs (Chittorgarh) | **Do Not Build:** High regulatory risk and thin-volume manipulation. |

---

## 5. Competitive Moat Hypothesis

If SachNetra continues running its V2 background data collectors, it can build a moat based on **data structure rather than UI features**:

1.  **The Structured Event Database:** By archiving years of precise ticker-tagged news, macro prints, and PDF filings in PostgreSQL, SachNetra creates a high-value dataset for systematic quant desks seeking to run backtests.
2.  **Low-Latency Filing Pipelines:** Bypassing editorial newsrooms to extract corporate disclosures (such as block deals, board meets, and shareholding shifts) directly from the exchange SFTP/scraping feeds.
3.  **Clean B2B API Distribution:** Avoiding consumer-facing distribution struggles (SEO, ad budgets) by selling clean, structured news sentiment and event feeds directly to fintechs and quant desks via REST APIs.

---

## 6. Strategic Risks

1.  **Distribution Deficit:** Incumbents (Moneycontrol, ET, Zerodha Kite) have massive user bases and dominant SEO. Releasing a standalone B2C app requires heavy marketing spend.
2.  **Ad Revenue Dependency:** Mainstream portals endure bad UI because they rely on ad revenue. If SachNetra remains ad-free, it must monetize through B2B data licensing to survive.
3.  **Broker Ecosystem Lock-In:** Brokers like Groww and Zerodha are increasingly bundling news and fundamentals (via Tijori) directly inside the execution screen, reducing the need for users to open external research apps.
