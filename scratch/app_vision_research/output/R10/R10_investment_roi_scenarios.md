# R10 — Investment ROI Scenarios

This document outlines three investment and execution scenarios for SachNetra over the next 90 days. Because Lijo is a builder learning the markets, these models avoid fantasy projections and focus on concrete time and capital trade-offs, aiming to hit the **₹50,000/month** working threshold.

---

## Baseline Cost & Resource Assumptions
*   **Infrastructure Cost (Current):** ~$30–$50/month (Railway hosting, PostgreSQL database, Upstash Redis, and HuggingFace API key).
*   **Lijo Time Budget:** 5–10 hours/week (focus on sales, documentation, and paper-trading).
*   **James Eng Time Budget:** 10–15 hours/week (focus on backend data pipeline stability and API outputs).

---

## Scenario A: P0 Only (Paper-Trading Loop Setup)
*   **Focus:** Proving the alpha edge on paper for Lijo's personal learning, with zero sales pressure.

| Parameter | Value / Description |
| :--- | :--- |
| **Invest (Capital)** | ₹0 additional cash (rely on existing server hosting) |
| **Invest (Time)** | Lijo: 5 hours/week · James: 5 hours (one-time setup for database spreadsheet export) |
| **Build Work** | Create the Google Sheets Paper Trading Journal; define three signal rules; connect database |
| **Expected Outcome** | **₹0 direct revenue**. However, Lijo establishes a repeatable trading routine and proves the statistical edge of news sentiment and filings on paper. |
| **Target Milestone** | 100% of SachNetra high-conviction signals logged over 30 days with verified T+1/T+5 outcomes. |
| **Risk / Margin of Safety** | **Extremely High Safety.** Zero financial risk, zero SEBI compliance risk. |

---

## Scenario B: P0 + B2B Pilot Outreach (Recommended 30-Day Path)
*   **Focus:** Securing one boutique financial client (quant developer, advisory group, premium newsletter writer) for a paid data pilot.

| Parameter | Value / Description |
| :--- | :--- |
| **Invest (Capital)** | ₹5,000/month (basic cold email tools, LinkedIn Premium, and contractual template) |
| **Invest (Time)** | Lijo: 10 hours/week (active cold outreach & sales calls) · James: 10 hours/week (maintaining schema stability & exports) |
| **Build Work** | Create a 7-day sample CSV; document the API/PostgreSQL schema; draft the Beta Data Partner Agreement; add SEBI disclaimers |
| **Expected Outcome** | **₹15,000 to ₹30,000/month** within 30–45 days. Scaling to ₹50,000/month within 90 days with 2 pilot partners. |
| **Target Milestone** | Close first paying pilot client within 30 days of campaign launch. |
| **Risk / Margin of Safety** | **Moderate.** High risk of cold sales rejection. The data feed must remain stable during the trial period, which increases engineering maintenance pressure. |

---

## Scenario C: P0 + Consumer Pro Tier Launch
*   **Focus:** Building a paid retail subscription tier (ad-free UI, custom watchlist filters, direct filing alerts).

| Parameter | Value / Description |
| :--- | :--- |
| **Invest (Capital)** | ₹15,000 (payment gateway compliance fees, user authentication setup, email server integrations) |
| **Invest (Time)** | Lijo: 10 hours/week · James: 25 hours/week for 8 weeks (high engineering load to build auth, payments, and UI) |
| **Build Work** | User login backend; Razorpay/Stripe checkout; watchlist UI panel; premium flow charts |
| **Expected Outcome** | **₹5,000 to ₹15,000/month** after 90 days (assumes converting 15–45 retail users at ₹330/month). |
| **Target Milestone** | Complete billing integration and acquire first 10 retail subscribers within 60 days. |
| **Risk / Margin of Safety** | **Low Safety / High Risk.** Requires significant developer time from James, diverting resources from the core database pipeline. Retail conversion is highly uncertain and subject to high churn. High risk of SEBI advisory optics if retail users trade based on premium alerts. |

---

## Strategic Verdict
*   **Scenario B (B2B Pilot)** represents the highest ROI path. It monetizes the *database asset* directly rather than relying on high-traffic retail subscriptions (Scenario C) or deferred revenue (Scenario A). It allows Lijo to act as a B2B product founder and lets James focus on backend data pipelines.
