# R06 — SachNetra Relevance Memo (Input for Wiki §3)

*As of May 27, 2026. This memo analyzes how public Telegram chatter maps to the SachNetra product strategy, identifying areas of low and high value, and proposing integration choices.*

---

## 1. Low Incremental Value (Covered by RSS)
Mainstream financial RSS feeds (e.g. Economic Times, Mint, Moneycontrol) already provide comprehensive, real-time coverage on the following themes, making Telegram aggregation redundant:
* **Large-Cap Corporate Earnings:** Mainstream press publishes Q4 FY26 earnings results (e.g. TCS, Infosys, Reliance) within minutes of exchange filings. Telegram posts on these are purely duplicate links.
* **Basic FII / DII Daily Flows:** End-of-Day (EOD) institutional flow figures (e.g., FPI outflow of -₹1,029.89 Cr on May 27, 2026) are instantly reported. Telegram channels simply forward these provisional screenshots.
* **Global Market Indexes:** Moves in Dow Jones, Nasdaq, or Brent crude are covered extensively by mainstream media before they circulate in retail Telegram channels.

---

## 2. Telegram Before Mainstream (The "Hindi Lead")
Public Telegram channels, especially Hindi and Hinglish groups, lead mainstream English media in specific areas. Mainstream coverage of these events is typically delayed by 1 to 3 hours:
* **Broker App Outages & System Latency:** 
  * *Evidence:* On May 27, 2026, retail users on channels like `Desi Trader Voice` and `BrokerFailures` began complaining of login lags and failed orders on major discount brokerages at 9:25 AM IST. Mainstream financial portals did not publish articles on the disruption until 11:15 AM IST.
* **SME IPO GMP Speculation:**
  * *Evidence:* Fluctuations in the Grey Market Premium (GMP) for active SME IPOs (such as Merritronix and Rajnandini Fashion) are reported hourly in specialized IPO channels. Mainstream portals cover GMP only as a weekly summary or near listing dates.
* **SEBI Policy Translation & Retail Impact:**
  * *Evidence:* Following the announcement of higher STT (effective April 1, 2026) and weekly options restrictions, Hindi channels hosted deep-dive text explainers illustrating how these rules impact retail margins. Mains press focused primarily on institutional responses and exchange revenues.

---

## 3. Top 3 Uncollected Data Types to Add
SachNetra should begin collecting the following data types to capture retail momentum and system risks:
1. **Grey Market Premium (GMP) Aggregator:** Tracking daily GMP trends for SME and Mainboard IPOs as a proxy for speculative retail liquidity.
2. **Social Sentiment Volume Index (SSVI):** Measuring the frequency of specific sector hashtags (e.g., `#MetalRotation`, `#DefensePSU`) to detect retail crowd movement.
3. **Broker Outage & Latency Tracker:** Scraping social complaints (`"Zerodha down"`, `"Groww lag"`) to create a real-time infrastructure health dashboard for active traders.

---

## 4. Top 3 Over-Mentioned Entities vs G1 Coverage
These entities receive disproportionately high volume on Telegram compared to their weight in mainstream press or traditional institutional portfolios:
1. **Darshan Orna Ltd (DOL) & SME Micro-caps:** Frequently mentioned due to coordinated promotion campaigns and pump-and-dump operations (validated by SEBI's May 2026 penalty on DOL manipulation).
2. **Hindustan Aeronautics Ltd (HAL) / Defence PSUs:** Heavily discussed as "multibaggers" due to government capex expansion (₹12.2 Lakh Cr target for FY27).
3. **SMR Jewels / SME IPOs:** Active listings in May 2026 that draw massive speculative retail interest despite extremely thin trading volumes.

---

## 5. Recommendation on "Community Temperature"
### **Verdict: LATER (Defer to Phase 2, with strict guardrails)**
* **Evidence-Based Reasoning:** 
  * The noise-to-signal ratio on public Telegram is extremely high (~85% noise/spam). A significant percentage of channels consist of unregistered advisors providing illegal tips (e.g., the *Professional Day Trading Institute* case resulting in a ₹9.02 Crore refund order).
  * Direct ingestion of Telegram feeds without heavy filtering could result in SachNetra displaying fraudulent "tips" or pump-and-dump tickers in the UI. This poses a severe regulatory risk under SEBI’s finfluencer regulations (effective 2025/2026) prohibiting regulated associations.
* **Proposed Implementation Path:**
  * *Phase 1:* Focus purely on structural metrics: options PCR, India VIX (closed at 14.98 on May 27, 2026), and FII/DII flow ratios.
  * *Phase 2:* If social indicators are introduced, restrict ingestion to a whitelist of SEBI-registered advisory channels, utilizing strict Named Entity Recognition (NER) stoplists to scrub any stock-specific "buy/sell" calls, and showing only aggregated sector-level volume indices.
