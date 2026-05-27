# R05 — Indian Quant Firms & Systematic Trading Landscape

*What professional quant in India is building, hiring for, publishing, and saying about local markets.*

**Output folder:** `scratch/app_vision_research/output/R05/`

---

## Part A — Firm inventory

Build a table (target ≥25 firms). Categories:

- **Prop / HFT** (Indian + India desk of global)
- **Quant mutual fund / PMS / AIF**
- **Broker quant** (i-bank algo, retail flow internalization)
- **Alt-data / analytics vendors** (Indian + selling into India)
- **Fintech with quant stack** (smallcase, Streak, etc.)

Columns: `firm, category, hq, AUM_or_scale_if_public, india_markets_traded, public_urls, data_signals_used`

Sources: LinkedIn jobs, company blogs, Inc42, Economic Times Markets, SEBI registered entities list.

---

## Part B — What they say about Indian markets

For **top 10** firms with public content (blog, interview, paper):

Extract quotes on:

- Liquidity / impact on mid-caps (directly relevant to Exp 11)
- Regulatory constraints (algo registration, co-location)
- Data gaps (filings, Hindi news, corporate actions)
- Edge decay ("retail flow", "news is fast now")
- FX / FII linkage

**Deliverable:** `R05_quotes_evidence.md` (each quote: speaker, date, URL, `fact` vs `opinion`)

---

## Part C — Hiring & skill signals

Scrape 20 recent job posts (Quant Analyst, Data Scientist, HFT Dev in India):

- Stack: Python, C++, kdb, Arctic, ClickHouse, etc.
- Domain: equities vs F&O vs FX
- **Implication**: what data infra they already have in-house (competitors to B2B SachNetra)

**Deliverable:** `R05_job_post_signals.csv`

---

## Part D — Academic & open research India

- IIT/ISI/IIM finance labs
- NSE working papers, RBI staff papers
- Indian authors on market microstructure (NSE, BSE)

**Deliverable:** `R05_academic_papers.md` (top 10, title + link + 2-line relevance)

---

## Part E — SachNetra B2B angle

From A–D: who would **buy** a news+filing+sentiment PostgreSQL feed?

- Rank 5 buyer personas
- What they'd pay for vs build
- Moat: Hindi, entity tagging, filing lead time

**Deliverable:** `R05_b2b_buyer_hypothesis.md`

---

## Status checklist

- [ ] A firm inventory
- [ ] B quotes
- [ ] C jobs
- [ ] D academic
- [ ] E B2B hypothesis
