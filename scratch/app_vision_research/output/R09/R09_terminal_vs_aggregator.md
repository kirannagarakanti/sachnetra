# R09 — Terminal vs. Aggregator: Positioning SachNetra

**Date Baseline:** May 2026  
**Audience:** Lijo  
**Reference Directive:** `lijo_answers.md` §11 (Do not compete with Bloomberg/Cogencis)

---

## 1. Defining the "Terminal" vs. the "Aggregator"

In the Indian fintech landscape, there is a fundamental dividing line between **trading terminals** and **news/data aggregators**. Attempting to cross this line in either direction leads to strategic failure.

### What is a "Terminal" (Bloomberg, Cogencis, Refinitiv)?
A terminal is a **super-expensive control room** for institutional finance professionals whose full-time job is managing capital. 
*   **The Cost:** Bloomberg costs ~$30,000/year (approx. ₹25,00,000/year); Cogencis Workstation is a customized B2B product costing upwards of ₹1,50,000/year per terminal. These fees are paid by employers, not the individual.
*   **The Features:** They require **everything, instantly**: tick-by-tick real-time data, instant exchange announcements (sub-second latency), professional charts, global macro sheets, and proprietary chat networks.
*   **The Friction:** Replicating this requires millions of dollars in exchange data licensing fees, massive engineering overhead for low-latency pipelines, and years of development to achieve complete coverage.

### What is SachNetra?
SachNetra is a **lightweight, ad-free news aggregator and background data collector**. It is not a control room; it is a **really good map + newspaper** for smart drivers who do not have a pit crew.
*   **The Cost:** Free (with future B2B API monetization options for clean datasets).
*   **The Features:** High-precision, zero-false-positive entity/ticker tagged headlines, daily institutional flow visualizers (FII vs. DII absorption), and structured access to official corporate filing PDFs.
*   **The Goal:** Serve smart individual investors and swing traders who want to "see India clearly" without paying for a terminal or being drowned in retail chat noise.

---

## 2. Why SachNetra Must NOT Compete in the Terminal Space

1.  **Enormous Exchange Data Costs:** Direct feeds from the NSE (Level 3 tick data) are tightly licensed. Delivering real-time ticks to B2C users would bleed capital without driving conversions.
2.  **Overserved Market:** Institutional traders already have Bloomberg, Reuters Eikon, or Cogencis. Retail day traders already have free TradingView charts integrated into their discount brokers (Zerodha Kite, Groww). Adding basic charts or ticks to SachNetra adds no unique value.
3.  **Core Competency Divergence:** Terminals focus on **speed and completeness** (every tick, every screen). SachNetra focuses on **clarity and structure** (ad-free reading, clean flows, and structured database-ready events).

---

## 3. Cohort Alignment: Terminal vs. SachNetra

| Metric | The Terminal User (Bloomberg/Cogencis) | The SachNetra User (Serious Investor / Swing) |
| :--- | :--- | :--- |
| **Primary Activity** | Executing high-frequency or large institutional blocks all day | Researching trends, tracking macro shifts, and managing capital |
| **Payment Source** | Corporate employer | Self-funded or small family office |
| **Latency Need** | Sub-millisecond (tick-by-tick) | Low-latency alerts (seconds to minutes for announcements) |
| **Core Information** | Live prices, order books, derivatives chains | **Precise corporate filings, ad-free news, clean institutional flows** |
| **SachNetra Value** | A side-snack for quick reading | **Their primary research and market context dashboard** |

---

## 4. One-Sentence Verdict

**Do not try to out-Bloomberg Bloomberg.** Instead, build the cleanest, ad-free India news aggregator and structured event database for serious investors and swing traders who want reliable market context, not a wall of flashing price screens.
