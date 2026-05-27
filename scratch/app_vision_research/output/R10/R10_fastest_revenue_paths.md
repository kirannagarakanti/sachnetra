# R10 — Fastest Revenue Paths

This document evaluates and ranks eight possible monetization paths for SachNetra. Each path is scored from 1 (lowest/worst) to 5 (highest/best) based on four metrics:
*   **Time to First ₹:** Speed of cash collection.
*   **Fits Lijo Skills:** Suitability for a builder/product founder with no trading history.
*   **Uses Existing DB:** Leverages already accumulated data assets.
*   **Regulatory Risk:** Safety from SEBI Research Analyst (RA) and advisory penalties (lower risk gets a higher score).

---

## Evaluation of Paths

### 1. Personal Trading Using Own Signals
*   **Description:** Lijo opens a trading account and trades cash equities using SachNetra's news sentiment and filing alerts.
*   **Scores:**
    *   Time to First ₹: **1/5** (requires learning curve, market exposure, and has high risk of initial capital loss).
    *   Fits Lijo Skills: **1/5** (Lijo has never traded; learning markets takes months).
    *   Uses Existing DB: **5/5** (directly dogfoods the product).
    *   Regulatory Risk: **5/5** (trading personal money is 100% legal and free from SEBI advisory rules).
*   **Weighted Verdict:** **2.0/5**. Highly aspirational but unviable as a 30-day revenue driver. Must be treated as a paper-only learning loop first.

---

### 2. B2B Pilot (One Fintech / Quant / Boutique Advisory)
*   **Description:** Exposing the PostgreSQL DB via API or CSV exports to a single paying data buyer (e.g. quant developer, financial newsletter writer, or small hedge fund) for a monthly trial fee (₹10,000–₹50,000).
*   **Scores:**
    *   Time to First ₹: **5/5** (can close a deal with cold calls/emails within 2–4 weeks).
    *   Fits Lijo Skills: **4/5** (sales outreach and product definition fit a founder-operator).
    *   Uses Existing DB: **5/5** (packages the 17k announcements + news signals already running).
    *   Regulatory Risk: **4/5** (selling raw data feeds / sentiment scores carries no SEBI advisory exposure, provided no trade execution advice is given).
*   **Weighted Verdict:** **4.5/5**. **RECOMMENDED PRIMARY PATH.**

---

### 3. Consumer Pro Tier
*   **Description:** Launching an ad-free premium version of the SachNetra website with exclusive widgets (FII/DII flow charts, direct filing alerts, watchlist filter).
*   **Scores:**
    *   Time to First ₹: **2/5** (requires billing integration, user authentication, and high retail traffic to convert).
    *   Fits Lijo Skills: **3/5** (requires significant UI/UX build-out from James).
    *   Uses Existing DB: **4/5** (requires displaying DB values on the frontend).
    *   Regulatory Risk: **3/5** (close to retail "advisory" optics if premium widgets look like trading signals).
*   **Weighted Verdict:** **3.0/5**. Defer until B2C user base is established and stable.

---

### 4. Sponsored Newsletter / WhatsApp Daily Brief (V2-008 Lane)
*   **Description:** Building a free daily market digest sent via WhatsApp or email (7:00 AM IST) and monetizing via sponsorships or ads.
*   **Scores:**
    *   Time to First ₹: **2/5** (requires scaling the subscriber base to >2,000 to attract sponsors).
    *   Fits Lijo Skills: **4/5** (editorial aggregation and marketing automation).
    *   Uses Existing DB: **4/5** (pulls top daily stories from the digest).
    *   Regulatory Risk: **4/5** (safe if it remains a factual news summary without buy/sell calls).
*   **Weighted Verdict:** **3.5/5**. Excellent secondary path to build brand distribution while B2B sales are closing.

---

### 5. Broker / Mutual Fund Affiliate Integrations
*   **Description:** Embedding Zerodha Publisher widgets or referral links on SachNetra news cards, earning a commission on account openings or trade volumes.
*   **Scores:**
    *   Time to First ₹: **2/5** (requires massive retail traffic; payout per lead is low).
    *   Fits Lijo Skills: **4/5** (simple API widget integration).
    *   Uses Existing DB: **1/5** (does not monetize the data asset, only traffic).
    *   Regulatory Risk: **3/5** (SEBI limits sharing brokerage fees with unregistered entities; affiliate marketing for brokers is heavily scrutinized).
*   **Weighted Verdict:** **2.5/5**. High regulatory friction and low yield for low-traffic sites.

---

### 6. Dataset Licensing (Neudata / Alt-Data Marketplaces)
*   **Description:** Formatting 12+ months of bilingual sentiment and filing history and listing it on global databases.
*   **Scores:**
    *   Time to First ₹: **1/5** (enterprise sales cycles take 6–12 months; requires deep historical backfills).
    *   Fits Lijo Skills: **3/5** (requires data formatting and relationship building).
    *   Uses Existing DB: **5/5** (monetizes the core asset directly).
    *   Regulatory Risk: **5/5** (data licensing is purely B2B and highly compliant).
*   **Weighted Verdict:** **3.5/5**. A great Year-2 target, but completely unviable for the 30-day timeline.

---

### 7. Consulting / Research Reports
*   **Description:** Writing custom industry research reports (e.g. "Geopolitical Shocks impact on Indian Defence Sector") as a paid analyst.
*   **Scores:**
    *   Time to First ₹: **3/5** (depends on personal branding).
    *   Fits Lijo Skills: **1/5** (Lijo has no market experience and cannot act as a public stock analyst).
    *   Uses Existing DB: **3/5** (requires manual analysis of DB trends).
    *   Regulatory Risk: **2/5** (high risk of triggering SEBI Research Analyst registration requirements).
*   **Weighted Verdict:** **2.2/5**. Non-viable for the founder's current skillset.

---

### 8. White-Label Data for Financial Media
*   **Description:** Licensing the Jaccard-deduplicated news feed and FinBERT sentiment engine to digital financial portals in India.
*   **Scores:**
    *   Time to First ₹: **3/5** (requires corporate business development).
    *   Fits Lijo Skills: **3/5** (B2B sales).
    *   Uses Existing DB: **5/5** (uses Jaccard and sentiment pipelines directly).
    *   Regulatory Risk: **5/5** (pure media tech feed, zero advisory risk).
*   **Weighted Verdict:** **4.0/5**. Good mid-term path but media portals are slow to pay and have low budgets.

---

## 90-Day Monetization Strategy

### Primary Path: B2B Pilot Partnership
*   **Goal:** Acquire **one** paying beta partner (a quant developer, small family office, or premium newsletter editor) to pay **₹15,000–₹30,000/month** for a 90-day trial of SachNetra data.
*   **Data Delivery Model:** To respect the changing schema, sell the pilot as a **Forward Feed** (real-time stream of news signals and filing alerts starting from the contract date, schema version 1.0) along with a **Point-in-Time 7-day static sample** for initial backtesting. Do *not* promise a historical 30-day database.
*   **Required Fixes (Gaps):**
    *   `GAP-10-005` (Beta Data Partner Agreement)
    *   `GAP-10-006` (Automated sample exporter)
    *   `GAP-10-007` (API schema documentation)
    *   `GAP-10-024` (SEBI regulatory firewall disclaimer)

### Backup Path: Factual Daily Market Digest (WhatsApp/Email)
*   **Goal:** Launch the WhatsApp daily brief (V2-008) containing deduplicated, event-tagged corporate filings.
*   **Monetization:** Sponsored placements or a simple ad-supported model.
*   **Required Fixes (Gaps):**
    *   `GAP-10-015` (WhatsApp subscription database setup)
    *   `GAP-10-023` (Daily filing EOD email summary template)
