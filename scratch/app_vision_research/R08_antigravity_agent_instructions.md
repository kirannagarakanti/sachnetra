# R08 — Antigravity Agent Instructions (copy-paste to agent)

**Your job:** Research only. **Do NOT implement code.**  
**Brief file:** `scratch/app_vision_research/R08_pro_vs_retail_trader_voice.md`  
**Output folder:** `scratch/app_vision_research/output/R08/` (create if missing)  
**Date baseline:** May 2026 · cite sources with **as-of date**

---

## 0. Read these files FIRST (in order)

1. `scratch/app_vision_research/_quality_standards.md`
2. `scratch/app_vision_research/lijo_answers.md`
3. `scratch/app_vision_research/output/R03/R03_india_market_snapshot_2026-05.md` — **fact baseline** (do not contradict)
4. `scratch/app_vision_research/output/R06/R06_sachnetra_relevance.md` — retail/Telegram posture
5. `scratch/app_vision_research/output/R04/R04_product_implications.md` — retail/Reddit posture
6. `ai_docs/sachnetra v2/wiki/syntheses/app_vision_2026.md` §2–§4 — merged synthesis so far
7. `scratch/app_vision_research/R08_pro_vs_retail_trader_voice.md` — your task spec

**Hard rules:**

- **Exp 11:** out of scope — do not mention experiment design.
- **SachNetra today:** news aggregator + background data collection; **primary user undecided**; **no 9:00 IST wedge committed** (retail *wishes* from R04 are anecdotes, not roadmap).
- **Do not** recommend Telegram tips, community temperature UI, or pump-and-dump channels.
- Separate **facts** (regulation, published data) from **opinions** (podcasts, Reddit, X).
- Every number needs **date + URL**. Tag `confidence`: `confirmed` | `anecdote` | `marketing` | `unverified`.

---

## 1. What you are answering

> **How do professional / systematic market participants in India talk about markets in 2026 — and how does that differ from day-trader / retail voices we already captured in R04/R06?**

Use R04/R06 as **retail baseline** — do not re-scrape Telegram. **Extend** with pro sources and a side-by-side comparison.

---

## 2. Define the two cohorts (do not blur them)

### Cohort A — **Professional / systematic** (target ≥15 cited voices)

Include only if **verifiable**:

| Source type | Examples to find |
|---|---|
| SEBI-registered Research Analysts | Public RA lists, broker strategy PDFs |
| CFA / fund managers on record | Interview, annual letter, conference |
| Prop / quant (India) | QuantInsti talks, LinkedIn posts with firm name, Inc42/ET profiles |
| Sell-side strategy | Motilal, ICICI Sec, Kotak, etc. **public** notes (not paywalled) |
| Educators with institutional credibility | Capitalmind (Deepak Shenoy), Finception, freefloat — not intraday tipsters |
| RBI / SEBI officials | Policy speeches only — `confirmed` |

**Exclude:** anonymous X gurus, paid Telegram, "guaranteed return" educators.

### Cohort B — **Retail / day trader** (target ≥10 cited voices)

Already partially done in R04 — **summarize**, add only if new:

| Source | Already in R04? |
|---|---|
| r/IndianStreetBets, r/StockMarketIndia | Yes — cite R04 paths |
| YouTube intraday educators (top 5 by India search) | Add if missing |
| Zerodha TradingQues / Kite community | Public threads only |

---

## 3. Question battery (PRIMARY deliverable)

Fill `R08_voice_comparison_table.md` — for **each row**, give:

- **Pro answer** (1–3 sentences) + **≥2 citations** (URL, date, speaker name)
- **Retail answer** (1–3 sentences) + **≥2 citations** (can point to `output/R04/` themes)
- **`aligns_with_r03`** (Y/N) — does pro view match May 2026 facts?
- **`confidence`**

| # | Question |
|---|---|
| 1 | Where does **edge** come from in Indian markets in 2026? |
| 2 | Is **Nifty F&O** zero-sum for retail after STT hike + weekly expiry limits? |
| 3 | Is **news** tradeable edge or noise? |
| 4 | **Mid-cap vs large-cap** — who has edge, who gets hurt? |
| 5 | Best **data source** they pay for / rely on? |
| 6 | Biggest **mistake** beginners make in India? |
| 7 | **FII out / DII in** — does it matter for strategy? |
| 8 | **IT sector -24% YTD** — structural or opportunity? |
| 9 | **Geopolitical / oil shocks** — how do pros hedge vs retail panic? |
| 10 | What do they think of **news aggregators** (Moneycontrol, ET, Google News)? |

---

## 4. Tooling stacks

**Deliverable:** `R08_tooling_stacks.md` + `R08_tooling_stacks.csv`

| Layer | Pro (examples + URLs) | Retail (examples + URLs) |
|---|---|---|
| Charting | | |
| News | | |
| Scanner | | |
| Backtest | | |
| Execution / broker | | |
| Risk / compliance | | |

Flag anything SachNetra **already overlaps** (RSS news) vs **gap** (Bloomberg, custom PostgreSQL, etc.).

---

## 5. Source inventories

**Deliverable:** `R08_pro_source_list.csv`  
Columns: `name, role, org, url, date, confidence, notes`

Minimum **15 rows** — mix RA, podcast, quant, broker strategy.

**Deliverable:** `R08_retail_source_list.csv`  
Minimum **10 rows** — can reference R04 thread URLs where retail already covered.

---

## 6. SachNetra positioning memo

**Deliverable:** `R08_positioning_memo.md`

Answer explicitly:

1. **Who should SachNetra serve first** in 2026–2027? (pro / retail / both / neither yet) — **evidence only**, recommend one primary + one secondary.
2. Features **pros would mock** but **retail loves** (from R04/R06 + your pro research).
3. Features **pros need** but **retail ignores**.
4. Does the **B2B data asset** thesis (`sachnetra_quant_pivot.md`) match what pros say they would buy?
5. **Non-goals** reinforced — broker? terminal? tip channel?
6. **G1 ticker tagging** — do pros care about headline entity tags vs retail?

Do **not** invent a marketing slogan. Lijo has **not** defined 9:00 IST wedge.

---

## 7. Data registry (required)

**Deliverable:** `R08_data_registry.csv`  
Every claim in Parts 3–6: `claim, value, as_of_date, confidence, source_url`

---

## 8. Suggested search queries

```
India registered research analyst market outlook 2026 site:sebi.gov.in OR broker PDF
Capitalmind podcast 2026 FII DII Indian markets
QuantInsti prop trading India edge 2025 2026
"Nifty F&O" retail zero sum STT 2026 India analyst
Indian fund manager IT sector AI disruption 2026 interview
sell side India equity strategy May 2026 PDF
Bloomberg vs Moneycontrol professional traders India
systematic trading India data vendor NSE filings
Deepak Shenoy FII outflow DII SIP 2026
```

---

## 9. Deliverables checklist (all required)

Save under `scratch/app_vision_research/output/R08/`:

- [ ] `R08_pro_source_list.csv`
- [ ] `R08_retail_source_list.csv`
- [ ] `R08_voice_comparison_table.md`
- [ ] `R08_tooling_stacks.md`
- [ ] `R08_tooling_stacks.csv`
- [ ] `R08_positioning_memo.md`
- [ ] `R08_data_registry.csv`

Then update:

- [ ] `scratch/app_vision_research/R08_pro_vs_retail_trader_voice.md` — tick §Status checklist
- [ ] `scratch/app_vision_research/research_log.md` — one-line verdict
- [ ] `scratch/app_vision_research/_index.md` — mark R08 `[x]`, set **R09** as NEXT

**Do not** edit `app_vision_2026.md` — Claude merges after review.

---

## 10. Quality gate before you finish

- [ ] Pro vs retail **never merged** into one voice
- [ ] At least **3 questions** where pro and retail **clearly disagree**
- [ ] R03 facts referenced where relevant (FII -₹34k, DII +₹63k, IT -24%, STT Apr 2026)
- [ ] No recommendation to ingest Telegram tips
- [ ] No Exp 11 content

---

## 11. One-paragraph summary for Lijo (end of walkthrough)

When done, write 5 bullets:

1. Biggest **pro vs retail** disagreement  
2. Recommended **primary user** for SachNetra (evidence-based)  
3. Top **3 product features** pros would value  
4. Top **3 features** retail would value  
5. What to run next: **R09 competitors**
