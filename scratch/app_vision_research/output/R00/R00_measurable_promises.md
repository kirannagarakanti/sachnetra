# R00 — SachNetra Measurable Promises

**Date Baseline:** May 27, 2026  
**Context:** Product utility validation based on retail and professional user requirements gathered in R04 and R08.

---

## 1. Promises Table

| # | Promise | User Quote / Paraphrase | External Product That Tried | User Rating | SachNetra Status Today | Build Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Understand *why* Nifty moved without narrative spin | "Mainstream portals keep saying 'profit booking in IT' after a Nifty slip, when FPI net sales were ₹1,000 Cr+ and USD/INR spiked. I just want raw flow data, not post-hoc narrative spin." *(R04 §2)* | **Moneycontrol** (Markets section) | **Low-to-Medium:** Users find it helpful for basic levels but dislike clickbait and retrofitted explanations. | Flow data collected in DB (V2-017) but not integrated into a clean home UI tile yet. | **High** |
| **2** | Less duplicate syndicated headlines | "Opening financial apps is exhausting because the same PTI feed is republished 20 times across different sources, burying unique reporting." *(R04 §2)* | **Economic Times Markets** (cluttered layout) | **Low:** Severe screen fatigue due to ad banners and duplicate syndicated wire feeds. | **Shipped:** Jaccard-based story clustering (live in `scripts/_clustering.mjs`) solves duplication at scale. | **Complete** (Maintenance only) |
| **3** | Correct ticker on headline (G1 precision) | "I hate when a news app tags 'IT sector' or 'Capital goods' as direct company stock hyperlinks, or tags subsidiaries as parent tickers. False positives corrupt scanners." *(R08 §3 & §6)* | **Trendlyne / Moneycontrol** (keyword-tagging) | **Medium:** Helps retail general navigation, but users mock tagging errors like mapping 'IT' to tickers. | **In flight:** NER pipeline G1 hardening under V2-031b using stoplist and positive alias maps. | **High** |
| **4** | Filing visible near news (lead time) | "Filing updates on NSE/BSE happen instantly, but mainstream portals take hours to write articles about auditor exits or promoter pledging. I need the direct exchange PDF links immediately next to news." *(R04 §3 & R08 §1)* | **Screener.in / Tijori Finance** | **High:** Users love Screener's updates but it lacks a real-time news aggregator feed. | **Planned:** Corporate Filings Ingestion (Product A) under V2-015, currently unbuilt. | **High** |
| **5** | Macro + flows in one pane (FII/DII, oil, USDINR) | "To start the morning at 9:00 IST, I want a single global queue and flow dashboard showing Gift Nifty, Brent Crude warning levels, and institutional flow balance in one clean view." *(R04 §1)* | **Moneycontrol / ET Markets** (opening pages) | **Medium-Low:** Data is present but buried under advertisements and scrolling bloat. | **Partially implemented:** Raw FII/DII and macro data points collected but no unified morning UI widget exists. | **High** |

---

## 2. Evidence Citation & Alignment Notes

*   **Promise 1 & 5 (Institutional Flows as a Shield):** The May 27, 2026 baseline figures (FPI outflow of -₹34,469 cr MTD vs. DII cash buying of +₹63,445 cr MTD) highlight the structural domestic liquidity cushion. Displaying the daily FPI-to-DII absorption ratio (1.84) provides a factual, narrative-free indicator of index stability.
*   **Promise 3 (NER Hardening):** Pro comments in R08 emphasize that systematic scanners depend heavily on zero-false-positive tagging. Mistagging broad sectors or unrelated words corrupts automated scanners, which is why V2-031b focuses on strict precision.
*   **Promise 4 (Exchange Filing Advantage):** As highlighted in `sachnetra_quant_pivot.md`, corporate announcements on NSE/BSE (auditor resignations, pledge changes) offer a massive time advantage since the press takes hours to publish them.
