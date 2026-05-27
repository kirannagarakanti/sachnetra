# R10 — 90-Day Execution Stack

This document details the weekly execution roadmap for SachNetra. It sequences engineering builds, paper-trading activities, and B2B outreach tasks, explicitly mapping gaps to existing and proposed **V2 Task IDs**.

---

## 90-Day Timeline

| Week Band | Build Tasks | Sell / Trade Activities | Measure / Success Criteria |
| :--- | :--- | :--- | :--- |
| **Weeks 0–2** | <ul><li>**V2-032:** Add prominent SEBI non-advisory disclaimers to website footer (`GAP-10-008`).</li><li>**V2-033:** Export 7-day signal and filing sample to static CSV (`GAP-10-016`).</li><li>**V2-034:** Connect PostgreSQL to a simplified dashboard tool (e.g. Google Sheets connector or Metabase) (`GAP-10-003`).</li></ul> | <ul><li>Identify 15 target B2B prospects (boutique quant traders, financial substack writers, boutique advisories).</li><li>Draft 2-page B2B Beta Data Partner Agreement (`GAP-10-005`).</li><li>Lijo starts paper-trading journal by logging signals in Google Sheets (`GAP-10-001`).</li></ul> | <ul><li>0 errors on `seed-india-signals.mjs` runs.</li><li>100% of high-conviction signals logged daily.</li><li>Outreach pipeline populated with 15 qualified leads.</li></ul> |
| **Weeks 3–6** | <ul><li>**V2-035:** Build a "Signals" panel in the SPA, grouping high-sentiment news and material filings (V2-018) (`GAP-10-002`).</li><li>**V2-036:** Create a daily EOD email summary cron for filing triggers (`GAP-10-023`).</li><li>**V2-017 / V2-030:** Deploy and run FII/DII daily flows and bulk/block deals live on production cron.</li></ul> | <ul><li>Launch cold outreach campaign (LinkedIn + email) to the 15 B2B prospects, offering a free 7-day sample and a 30-day paid beta pilot (₹15,000).</li><li>Execute daily paper trades based on defined signal rules (`GAP-10-012`).</li></ul> | <ul><li>First warm response from B2B outreach.</li><li>Paper-trading journal tracks $\ge$ 15 trades with recorded prices.</li><li>Signals tab live on production.</li></ul> |
| **Weeks 7–12** | <ul><li>**V2-037:** Implement local-storage watchlists in the SPA (`GAP-10-009`).</li><li>**V2-008:** Launch the WhatsApp daily subscriber feed for retail lead generation (`GAP-10-015`).</li><li>**V2-038:** Set up automatic monthly backup scripts for signal tables (`GAP-10-004`).</li></ul> | <ul><li>Close first paying B2B pilot client (target ₹15,000–₹30,000/month).</li><li>Begin trial period delivery via forward API/CSV collection.</li><li>Review paper-trading P&L performance and refine rule limits.</li></ul> | <ul><li>First B2B pilot payment received.</li><li>Paper-trading journal reports win-rate and profit metrics over 50+ trades.</li><li>WhatsApp subscriber list reaches $\ge$ 100 users.</li></ul> |

---

## Top 3 P0 Gap Alignments

The top three P0 gaps blocking Lijo's goals are resolved by the following task sequence:

### 1. GAP-10-008 (SEBI Compliance / Disclaimer Void)
*   **Resolution Task:** **V2-032** (Add non-advisory footers and click-through legal agreements).
*   **Why it blocks:** We cannot pitch B2B developers or launch newsletters without exposing the brand to SEBI advisory enforcement. This must be fixed in Week 1.

### 2. GAP-10-002 (SPA lacks a dedicated Signals Tab)
*   **Resolution Task:** **V2-035** (Group news with sentiment scores >0.8/< -0.8 and raw NSE filings into a single "Signals" timeline).
*   **Why it blocks:** Lijo has to browse a general news timeline to find trading triggers. A dedicated feed accelerates workflow and serves as a visual demo for B2B buyers.

### 3. GAP-10-016 / GAP-10-006 (Missing sample data for sales outreach)
*   **Resolution Task:** **V2-033** (Automated script to dump the last 7 days of `india_news_signals` and `nse_bourse_announcements` into a downloadable CSV).
*   **Why it blocks:** We cannot start sales calls without immediately handing over a sample dataset for the prospect to review.
