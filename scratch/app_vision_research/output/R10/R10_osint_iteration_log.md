# R10 — OSINT Iteration Log

This log documents the iterative search process, hypotheses tested, and gaps opened or closed during the monetization research for SachNetra.

---

## Iteration 1 (2026-05-28)
**Hypothesis:** There is a significant structural gap between Lijo’s personal monetization target (₹50k/month within 30 days) and his actual experience (never traded, does not know how to run SQL queries directly on PostgreSQL, no active broker accounts). Building a trading edge for Lijo is an aspirational long-term goal; the fastest path to monetization must leverage the existing DB assets (news, filings, flows) through B2B pilots or a highly structured, low-complexity paper-trading workflow.

**Searches run:** (Internal audit of `lijo_answers.md`, `R10_lijo_questionnaire.md`, `R10_lijo_context_note.md`, `CLAUDE.md`, and `V2_roadmap.md`)

**Findings:**
- Lijo has **never traded** cash equity, F&O, or mutual funds. He is a pure builder.
- The PostgreSQL database on Railway is active, accumulating `india_news_signals` (Task V2-011/V2-012) and `nse_bourse_announcements` (Task V2-018 with 17k+ rows).
- There is no user-facing interface for Lijo to view these signals as actionable trading prompts. He cannot query PostgreSQL directly to test an edge.
- The ingestion schema and pipeline are in active flux. Offering a stable 30-day historical data export for B2B pilots is currently impossible without breaking changes.
- **Gaps opened:**
  - `GAP-10-001` (No paper-trading execution log/journal)
  - `GAP-10-002` (No user-facing "Alpha Signals" dashboard / feed)
  - `GAP-10-003` (Lijo lacks direct PostgreSQL query capability / database client)
  - `GAP-10-004` (Unstable historical data schema - blocks selling frozen datasets)
  - `GAP-10-005` (Missing boilerplate contract/agreement for B2B pilot partnerships)
  - `GAP-10-006` (No automated sample CSV export scripts for sales outreach)
  - `GAP-10-007` (Lack of standard schemas and documentation for public APIs)
  - `GAP-10-008` (No SEBI compliant disclaimer / legal protection on the platform)
  - `GAP-10-009` (No watchlist or portfolio tracking in SPA)
  - `GAP-10-010` (No real-time push alerts on filings or sentiment spikes)
  - `GAP-10-011` (No FII/DII daily flow trend visualization on UI)
  - `GAP-10-012` (No clear rule-based trading signals defined - "What constitutes a trade?")
  - `GAP-10-013` (No walk-forward backtesting framework)
  - `GAP-10-014` (No ad-free premium tier or checkout path)
  - `GAP-10-015` (No sponsored newsletter/WhatsApp monetization setup)

**Gaps opened/closed:** Opened `GAP-10-001` through `GAP-10-015`.

**Next hypothesis:** The alternative data market in India is active, and established players (like Heckyl, Tijori, and Trendlyne) are monetizing data licensing and analytics. Identifying who buys their data, their price points, and their product offerings will reveal where SachNetra can find its first boutique B2B pilot partner within 4 weeks.

---

## Iteration 2 (2026-05-28)
**Hypothesis:** Large brokerages and institutional funds are buying data from Heckyl, Trendlyne, and Tijori. While we cannot compete with their multi-million dollar enterprise integrations, we can identify a whitespace in serving boutique hedge funds, quant developers, and premium substack/advisory publishers who need raw, programmatic sentiment/filings feeds but cannot afford enterprise contracts.

**Searches run:**
- `Heckyl Technologies sentiment API pricing India`
- `Heckyl Technologies clients integrations India broker terminal`
- `Tijori Finance API pricing subscription cost`
- `Zerodha Tijori investment partnership`
- `Trendlyne B2B API pricing data feeds`
- `"alternative data" India market pricing API`

**Findings:**
- **Heckyl Technologies** does not disclose pricing publicly. They operate a custom B2B enterprise sales model, integrating their *FIND (Financial Information Network and Data)* dashboard directly into terminals of large brokers (Motilal Oswal, Angel One, IIFL, Sharekhan, Religare). They process real-time news sentiment, derivatives, and filing events.
- **Tijori Finance** does not offer a public API. They focus on retail tools (Free, $4/mo, or $43/yr). However, **Zerodha invested US$5 million (approx ₹45 crore) in Tijori in November 2025** to scale their AI-powered tools (Concall Monitor, WhatsApp filing alerts) and power Kite's fundamental analysis backend. This highlights the enormous premium placed on structured, clean filing and transcript data.
- **Trendlyne** provides B2B APIs to major brokerages (IIFL Securities, ICICI Securities, HDFC Securities, 5Paisa, Kotak Securities, Motilal Oswal) under custom, long-term contracts.
- **Whitespace:** None of the major players offer self-serve, affordable API keys for boutique quant developers, indie researchers, or small advisory firms. Tijori has no public API; Trendlyne and Heckyl are gated behind enterprise sales forms.
- **Gaps opened:**
  - `GAP-10-016` (No point-in-time sample dataset for immediate download)
  - `GAP-10-017` (Missing outreach collateral showing data comparison vs. mainstream feeds)
  - `GAP-10-018` (No API sandbox / Swagger documentation page)
  - `GAP-10-019` (Lack of self-serve payment gateway for developer keys - Stripe/Razorpay)
  - `GAP-10-020` (No verification of sentiment accuracy vs. benchmark news feeds)
  - `GAP-10-021` (No corporate filings tagging precision metric)
  - `GAP-10-022` (No data-only affiliate partnership schema)

**Gaps opened/closed:** Opened `GAP-10-016` through `GAP-10-022`.

**Next hypothesis:** Lijo's trading goal must be paper-only to prevent capital loss and regulatory violations. If Lijo only has 20 hours/month to spend on this, we must build a lightweight paper-trading and journaling loop that sits inside the app and triggers signals when predefined criteria (e.g., specific filing alerts + sentiment spikes) are met, avoiding the complexity of live broker integrations.

---

## Iteration 3 (2026-05-28)
**Hypothesis:** A B2B paid pilot targeting boutique quant researchers is the fastest path to the ₹50k/month milestone, but it must sell a "forward feed + static sample" model because our historical dataset schema changes too often. For Lijo personally, the fastest path to "using the app to make/save money" is a rigid paper-trading spreadsheet log driven by the app's signal outputs, serving as a feedback loop to improve G1/V2-031b tagging.

**Searches run:**
- `SEBI registered research analyst sell subscription India rules`
- `solo quant sell historical news dataset India`

**Findings:**
- Under SEBI (Research Analysts) Regulations, 2014, making specific buy/sell recommendations or price targets to the public requires registration. However, providing raw sentiment scores, structured news aggregation, and automated corporate filing alerts to B2B clients or as an open database does not fall under investment advice, provided there are no directional trade calls or portfolio allocations.
- Selling datasets to B2B quants is legally classified as data licensing, not investment advice.
- Personal paper trading has zero regulatory requirements and serves as the perfect training ground for Lijo to learn the market regime (currently a bifurcated regime where Nifty 50 large-caps are correcting [-8.56% YTD] while mid-caps remain highly resilient [Nifty Midcap 150 -0.21% from ATH]).
- **Gaps opened:**
  - `GAP-10-023` (No automated email digest of daily filing triggers)
  - `GAP-10-024` (No SEBI regulatory firewall statement in B2B landing pages)
  - `GAP-10-025` (No benchmark trade log to demonstrate signal effectiveness)
  - `GAP-10-026` (No definition of event-driven regimes: e.g., "Auditor Resignation" plays)

**Gaps opened/closed:** Opened `GAP-10-023` through `GAP-10-026`.

---
