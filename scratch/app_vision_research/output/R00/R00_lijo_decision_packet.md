# R00 — Lijo Decision Packet

**Date Baseline:** May 27, 2026  
**Audience:** Lijo  
**Purpose:** Actionable, five-minute decision checklist for the product direction of SachNetra.

---

## Strategic Decisions Checklist

### [x] 1. Confirm Primary Persona
*   **Recommended Choice:** **Serious Fundamental Investor**
*   **Evidence:** Long-term domestic retail capital is highly resilient (monthly SIP flow at ₹31,115 Cr in April 2026 and DII net cash buying at +₹63,445 Cr MTD as of May 27, 2026), indicating a massive pool of savings moving away from speculation toward structured equity investing. *(R03 §2.4, R08 §1)*

### [x] 2. Confirm Secondary Persona
*   **Recommended Choice:** **Active Swing Trader (ex-F&O)**
*   **Evidence:** The April 1, 2026 regulatory changes (Futures STT raised to 0.05%, Options STT raised to 0.15% on premium, and weekly index expiry restrictions) are actively squeezing retail option margins and driving capital back into cash swing trading. *(R03 §2.5, R08 §1, R09 §1)*

### [x] 3. Accept Non-Goals List
*   **Recommended Choice:** Accept the non-goals (not a discount broker, not an investment terminal, not a tip/GMP channel, not F&O-first).
*   **Evidence:** SEBI is aggressively cracking down on unregistered Telegram advisor networks and micro-cap pump-and-dumps (e.g. Wealth Solitaire / desiwallstreet and Darshan Orna in May 2026), making retail advisory a severe regulatory and platform hazard. *(R06 §5, R08 §5, R09 §3)*

### [x] 4. Confirm Top 3 Features for Next Quarter
*   **Recommended Choice:**
    1.  **G1 Ticker NER Hardening:** Build zero-false-positive stoplists to clean up tags (V2-031b).
    2.  **Corporate Filings Ingest (Product A):** Extract direct exchange PDF announcements (V2-015).
    3.  **FII/DII Net Flow Absorption Ratio:** Display daily institutional flow balances (currently ~1.84 MTD).
*   **Evidence:** Quant desks and swing traders agree that news apps fail to provide clean, ad-free filings and flow metrics, and keyword-tagging false positives corrupt systematic backtesting. *(R04 §3, R08 §3 & §4, R09 §5)*

### [x] 5. Monetization Path [Lijo decides]
*   **Recommended Choice:** **Undecided** (Research B2B API feeds for fintechs/funds at ₹5,000–10,000/month as an alternative to enterprise-only feeds).
*   **Lijo (2026-05-28):** Marked — research B2B API path as primary monetization option; revisit after paper-trade log has ≥15 signals.
*   **Evidence:** Startups and quant desks face a steep pricing cliff between free, unreliable Yahoo scrapers and institutional exchange feeds costing ₹1.2L to ₹3L/year, validating the B2B developer feed option. *(R08 §4, R09 §2 & §5)*

### [x] 6. Hindi Language Strategy [Lijo decides]
*   **Recommended Choice:** **Vernacular Macro Explainers-Only First** (No full Hindi UI yet).
*   **Lijo (2026-05-28):** **Defer entirely to future** — no Hindi explainers or UI in next quarter. Revisit only after paper-alpha + B2B tracks have traction.
*   **Evidence:** Dailyhunt and Moneycontrol already dominate general Hindi news delivery, but specialized Hindi/Hinglish Telegram channels lead mainstream media in translating complex SEBI policy rules and WPI (8.30% in April 2026) vs. CPI (3.48% in April 2026) trends for retail. *(R06 §2, R09 §1)*

---

## Decisions Logged

**Date locked:** 2026-05-28
**Status:** All 6 items resolved.

- Personas (1, 2), non-goals (3), Q3 builds (4): confirmed as recommended.
- Monetization (5): B2B API path is the working hypothesis; revisit after paper-trade evidence.
- Hindi (6): **Deferred** — not in next quarter; no explainers, no UI.

**Unblocks:** James can now file V2-032 → V2-038 (R10 task list, minus any Hindi/translation work).
