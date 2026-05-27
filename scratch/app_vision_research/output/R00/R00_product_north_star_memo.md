# R00 — SachNetra Product North Star Memo

**Date Baseline:** May 27, 2026  
**Audience:** Lijo  
**Purpose:** Capstone product vision synthesizing deliverables R03–R09.

---

## 1. One-Paragraph North Star (May 2026 → 12 Months)

SachNetra is a clean, ad-free news aggregator and background data collector for smart Indian investors and swing traders. It gathers financial headlines, corporate filings, and economic reports in one place, groups duplicate stories together to remove feed clutter, and links them to the correct stock tickers. It is not a discount brokerage, it does not show real-time trading charts, and it does not provide stock tips or options trading advice. It runs background collectors to build a clean database of market events that we can later license to systematic funds.

---

## 2. Primary + Secondary Persona

*   **Primary Persona:** **Serious Fundamental Investor** — individuals and small team managers who require clean, ad-free, verified corporate disclosures, sector rotations, and institutional flow balances to make long-term capital allocation decisions.
*   **Secondary Persona:** **Active Swing Trader (ex-F&O)** — capital allocators migrating out of derivatives due to high transaction costs (the April 1, 2026 STT hike and weekly options constraints) who require high-precision company tagging and immediate filing alerts for cash equities.

*Alignment note:* This alignment explicitly agrees with the recommendations in `R08_positioning_memo.md` and competitor findings in `R09_whitespace_memo.md`.

---

## 3. Non-Goals (2026)

*   **Not a Discount Broker:** Will not build transaction pipelines, options trading sheets, or hold margin accounts.
*   **Not an Investment Terminal:** Will not try to replicate Bloomberg or Cogencis real-time price tick charts or multi-asset pricing panels.
*   **Not a Tips or Advisory Channel:** Will not publish crowdsourced buy/sell recommendations, stock-specific alerts, or Grey Market Premiums, preventing SEBI regulatory enforcement risks.
*   **Not an F&O-First Product:** Will not build options chains, Greeks trackers, or intraday scalping analytics.
*   **Not a Dailyhunt Clone:** Will not attempt a full regional language UI translation that directly competes with established vernacular news portals.

---

## 4. Three-Year Arc

| Year | Stage | Focus | *sachnetra_quant_pivot.md* Alignment | Recommendation / Challenge |
| :--- | :--- | :--- | :--- | :--- |
| **Year 1 (2026)** | **Collector** | Ingestion of RSS, direct exchange filings (Product A), and institutional flows. Background persistence in `india_news_signals` database. | Matches pivot (Build and collect, ₹0 revenue) | **Align:** Focus heavily on NER precision (V2-031b) and filing databases to establish data value before marketing. |
| **Year 2 (2027)** | **Validated Signals** | B2C ad-free tool validates G1 tagging accuracy. Build initial B2B developer API pilots (Product B) at ₹5k–10k/month. | Matches pivot (B2B pilots and API launch, ₹50k–10L/mo) | **Challenge:** Consumer ads are highly unviable; monetization should bypass consumer paywalls entirely, relying on developer API subscriptions and private pilots. |
| **Year 3 (2028)** | **B2B API & Licensing** | Scale B2B API feeds for quant prop desks and fintech startups. License the multi-year historical dataset (Product C) via Neudata. | Matches pivot (Dataset licensing, ₹50L+ deals) | **Align:** Quant desks will never use the B2C frontend. The database is the asset. Ensure data compliance (SEBI finfluencer rules) is audit-ready. |

---

## 5. Top 5 Features (Evidence-Ranked)

1.  **G1 Ticker NER Hardening:**
    *   *Why:* Essential for serious investors (UI navigation) and quant desks (backtesting). Keyword tags must achieve near-100% precision.
    *   *Brief:* R08 §3 & §6, R09 §1
    *   *Shipped:* **Partial** (V2-031b in-flight).
2.  **Corporate Filings Ingest (Product A):**
    *   *Why:* Immediate PDF extraction of auditor resignations and promoter pledge alerts gives a 1-3 hour lead time over editorial media.
    *   *Brief:* R04 §3, R08 §1, R09 §5
    *   *Shipped:* **No** (planned as V2-015).
3.  **FII/DII Net Flow Absorption Ratio:**
    *   *Why:* Raw daily institutional flow balances (currently ~1.84 MTD May 2026) act as a visual market stabilizer against foreign selling.
    *   *Brief:* R03 §2.4, R04 §1, R07 §3
    *   *Shipped:* **Partial** (V2-017 raw data collected).
4.  **Jaccard-Based Story Clustering:**
    *   *Why:* Removes the syndication echo chamber, grouping duplicate PTI reports so users only read unique commentary.
    *   *Brief:* R04 §2, R09 §5.4.2
    *   *Shipped:* **Yes** (live in script).
5.  **Hindi Macro/Policy Explainers:**
    *   *Why:* Addresses content gap in explaining complex regulatory changes (e.g. STT hikes, MPC) without full UI vernacular translation.
    *   *Brief:* R06 §2, R09 §1
    *   *Shipped:* **No** (postponed behind English UI).

---

## 6. Top 5 Risks

1.  **G1 Named Entity Recognition (NER) False Positives:** Incorrectly mapping generic words (like "IT" or "Capital") or tagging subsidiaries as parent firms corrupts systematic backtests and frustrates users.
2.  **Broker Bundling and Distribution Deficit:** Major discount brokers (Groww, Zerodha) are integrating news alerts and fundamentals (Tijori, Pulse) directly into the trading screen, cutting off external research traffic.
3.  **Regulatory Advisory Penalties (SEBI):** Regulatory actions against unregistered Telegram/WhatsApp advisory channels require strict UI guardrails; displaying social sentiment widgets may trigger compliance issues.
4.  **Distribution and SEO Costs:** Standing out in the crowded B2C market requires massive ad spend if relying on consumer installs; SachNetra must pivot B2B if ad-free.
5.  **Precision vs. Speed Latency Myth:** Retail traders believe they need sub-second feed latency, whereas SachNetra's value lies in deep structural context and direct filing extraction.

---

## 7. Open Questions for Lijo

*   **Confirm Primary Persona:** Do we commit to the **Serious Fundamental Investor** as primary and **Active Swing Trader** as secondary, deprioritizing casual retail and F&O speculators?
*   **Monetization Path [Lijo decides]:** Do we prioritize B2B developer API subscriptions (₹5,000 - ₹10,000/month) or consumer-tier Pro subscriptions (e.g. ₹999/year), or remain entirely free while building the historical database?
*   **Hindi UI vs. Vernacular Explainers [Lijo decides]:** Do we drop V2-007's full Hindi UI localized translation to avoid competing with Dailyhunt, focusing purely on English UI with Hindi macro/policy explainers?
*   **Outage Latency Tracker [Lijo decides]:** Do we build a social-scraper-based broker outage tile at 9:00 IST (candidate B2C wedge, medium effort) or focus strictly on core filings and flow metrics?
*   **9:00 IST Wedge Option Commitment [Lijo decides]:** Which components of the global queue and flow absorption metrics do we commit to the public roadmap, and which do we defer as research options?

---

## 8. 9:00 IST Wedge — Options, Not Commitment

| Option | Evidence | Incumbent Gap | Effort | Recommend? |
| :--- | :--- | :--- | :--- | :--- |
| **FII/DII Net Flow Absorption Ratio** | R03 flows, R04 wishes | Incumbents show EOD graphs only. SachNetra can display cumulative MTD ratio (1.84 in May 2026) as a morning index cushion metric. | Low | **Yes** |
| **Global Queue Tile** (Gift Nifty, Brent, USDINR) | R04 dashboard wishes | Incumbents (Moneycontrol, ET) show cluttered pages. SachNetra can show a single lightweight widget. Brent crude alerts trigger when price >$100. | Low | **Yes** |
| **Real-Time Broker Latency Status Scraper** | R04 outages, R06 "Desi Trader Voice" | Brokers show static pages. Mainstream media is 1-3 hours late. SachNetra scrapes Twitter/Telegram for platform-wide outages. | Medium | **Maybe** [Lijo decides] |
| **SME Grey Market Premium (GMP) Index** | R04 GMP wishes, R06 IPO channels | Unregulated blogs (Chittorgarh) own it. Serious SEBI advisory risk. | Low | **No** (Avoid) |

---

## 9. What We Will NOT Do in 2026

*   **Real-time charts and tickers:** Do not build TradingView integrations, option chains, or latency-sensitive intraday dashboards.
*   **Speculative Grey Market Premium (GMP) Trackers:** Do not scrape or display active SME IPO grey market margins due to regulatory and manipulation risks.
*   **Stock-specific Telegram tip integration:** Do not ingest or display individual stock calls or community sentiment vote widgets to avoid SEBI advisor associations.
*   **Broker execution / margin accounts:** Do not integrate transaction APIs or host trading portals.
