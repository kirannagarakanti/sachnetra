# R09 — Antigravity Agent Instructions (copy-paste to agent)

**Your job:** Research only. **Do NOT implement code.**  
**Brief file:** `scratch/app_vision_research/R09_competitive_landscape_india_fintech.md`  
**Output folder:** `scratch/app_vision_research/output/R09/` (create if missing)  
**Date baseline:** May 2026 · cite sources with **as-of date**

---

## 0. Read these files FIRST (in order)

1. `scratch/app_vision_research/_quality_standards.md`
2. `scratch/app_vision_research/lijo_answers.md` — especially **§11** (do not compete with Bloomberg/Cogencis)
3. `scratch/app_vision_research/output/R03/R03_india_market_snapshot_2026-05.md` — fact baseline
4. `scratch/app_vision_research/output/R08/R08_positioning_memo.md` — persona rec (serious investor + swing; not terminal)
5. `scratch/app_vision_research/output/R08/R08_tooling_stacks.md` — what pros/retail already pay for
6. `scratch/app_vision_research/output/R04/R04_product_implications.md` — retail pain vs ET/MC
7. `scratch/app_vision_research/output/R06/R06_sachnetra_relevance.md` — Telegram gaps (outage, GMP)
8. `ai_docs/sachnetra v2/wiki/syntheses/app_vision_2026.md` §2–§5 — merged synthesis
9. `scratch/app_vision_research/R09_competitive_landscape_india_fintech.md` — task spec

**SachNetra today (honest row — verify on sachnetra.com, do not invent):**

| Capability | Status (May 2026) |
|---|---|
| India RSS news digest | Live (aggregator) |
| G1 headline ticker tags | Live (V2-031; hardening V2-031b) |
| Background `india_news_signals` | Live (PostgreSQL, cron) |
| FII/DII structured in UI | Partial / V2-017 pipeline |
| NSE corporate filings DB | V2-018 backfilled |
| Hindi UI | Not yet (V2-007) |
| Broker execution | **No** |
| Terminal charts / ticks | **No** |

**Hard rules:**

- **Exp 11:** out of scope.
- **Primary user still undecided** — map competitors to personas; do not lock product roadmap.
- **No paywalled claims** you cannot verify — mark `unverified` or skip.
- **Public sources only** for pricing/reviews (sites, app stores, Reddit, public pricing pages).
- Separate **facts** (pricing page, feature list) from **opinions** (Reddit rants).
- Do **not** recommend copying tip channels, GMP pumps, or Telegram signal products.

---

## 1. What you are answering

> **Who already ships pieces of "see India clearly" — and where is SachNetra differentiated, redundant, or should not compete?**

This brief **tests R08's positioning** against real products. Output must answer:

1. Who already wins on **news** vs **flows** vs **filings** vs **F&O tools**?
2. Where is **whitespace** for serious investor + swing trader (R08 primary/secondary)?
3. What is **overserved** (do not build — including Bloomberg/Cogencis terminal space per `lijo_answers.md` §11)?

---

## 2. Competitor tiers (do not mix them)

| Tier | Examples | SachNetra relationship |
|---|---|---|
| **A — News / digest** | Google News, Dailyhunt, Inshorts, ET Markets, Moneycontrol, Finshots | Direct overlap on headlines |
| **B — India market apps** | Trendlyne, TickerTape, smallcase, Sensibull, Opstra, Streak | Partial overlap (screener, tags, F&O) |
| **C — Global charting** | TradingView, Koyfin | Charting wedge; news secondary |
| **D — Terminals / pro** | Bloomberg, Cogencis, Refinitiv | **Do not compete** — note what they have; map who uses them |
| **E — Alt-data / B2B** | Sentiment vendors, filing scrapers, FII feed sellers | B2B thesis validation (R08 §4) |

Minimum **20 competitors** across tiers (≥8 in tier A, ≥6 in B, ≥3 in C/D/E combined).

---

## 3. Part A — News competitors (PRIMARY table)

**Deliverable:** `R09_news_competitors.csv`

**Required columns:**

`product, tier, url, business_model, india_market_depth, entity_ticker_tagging, hindi_support, mobile_app, price_inr, primary_persona, pain_points_from_reviews, sachnetra_overlap, sachnetra_gap, confidence, source_url, as_of_date`

**Minimum rows:** 8 (include **SachNetra** as last row — honest, not marketing).

**Products to cover (add others if stronger in 2026):**

- Google News (India markets filter)
- Dailyhunt / NewsBytes finance
- Inshorts
- Economic Times Markets app
- Moneycontrol
- Trendlyne (news + screener)
- Finshots
- Livemint / BS apps if cited in R04

**Pain points method:**

- Find **≥2 public complaints each** for Moneycontrol + ET from Reddit (R04 themes OK) or Play Store reviews (quote + date).
- Tag `lang:` if Hindi review.
- Map pain to SachNetra field: `ticker`, `sector`, `flows`, `filing`, `latency`, `ads`.

**Deliverable:** `R09_news_pain_points.md` — 1 page synthesis of top 5 pains and whether SachNetra already fixes any.

---

## 4. Part B — Terminal / analytics competitors

**Deliverable:** `R09_analytics_competitors.csv`

**Columns:** `product, tier, url, core_wedge, india_equity, india_fno, news_integration_quality, price_hint, target_user, vs_sachnetra, confidence, source_url, as_of_date`

**Minimum rows:** 8 — must include:

TradingView, Sensibull, Opstra, TickerTape, Streak, smallcase, Kite (Zerodha) as **broker+news**, Groww, Trendlyne

**For each, answer in notes:**

- Is **news** core or bolt-on?
- Do they do **ticker tags on headlines**?
- Do they show **FII/DII** or only prices?

**Deliverable:** `R09_terminal_vs_aggregator.md` — short memo explaining **why SachNetra is not a terminal** (use `lijo_answers.md` §11 language — plain English OK).

---

## 5. Part C — Alt-data & quant vendors (India-facing)

**Deliverable:** `R09_vendor_landscape.csv`

**Columns:** `vendor, product, data_type, india_coverage, delivery_api, price_hint, buyer_persona, overlaps_sachnetra_db, confidence, source_url`

**Data types to hunt (≥1 vendor each if exists publicly):**

- News sentiment
- Web scraping / alt-data
- Structured NSE/BSE filings
- FII/DII / flow feeds
- Corporate actions / bulk-block

**Minimum rows:** 6 vendors (NSE official, NSDL FPI, broker research APIs, Indian startups, global with India — e.g. Accern, RavenPack if India mentioned).

**Do not** copy R05 quant-firms brief in depth — only **data products they sell**.

---

## 6. Part D — Feature overlap matrix (NEW — required)

**Deliverable:** `R09_feature_matrix.csv`

Rows = features. Columns = products (top 10–12 only). Cells: `yes` | `partial` | `no` | `n/a` + footnote in `R09_feature_matrix_notes.md`.

**Minimum feature rows (20):**

| Feature | Why it matters (R03–R08) |
|---|---|
| India RSS multi-source digest | Core aggregator |
| Headline → ticker tags (G1) | R04/R08 validated |
| FII/DII flow tile | R03/R04 high priority |
| NSE filing PDF links | R08 pro need |
| Bulk/block deals | V2-030 |
| Sector rotation view | R03 bifurcation |
| Hindi content | lijo_answers §4 |
| F&O chain / OI | Retail; pros say avoid as core |
| GMP / IPO grey market | Retail wants; pros mock |
| Broker outage monitor | R04/R06 |
| Community bullish/bearish | Defer per R06/R08 |
| Backtest / event API | B2B R08 |
| Real-time ticks | Terminal — **overserved for us** |
| STT/regulatory explainers | R03/R04 |
| Macro tiles (Brent, USDINR, VIX) | R07 |
| Story threads / related news | V2-013 |
| FinBERT sentiment in DB | V2 pipeline |
| WhatsApp brief | V2-008 future |
| Smallcase / portfolio | Different wedge |
| Google News personalization | Incumbent |

Highlight **≥3 cells** where only SachNetra (or nobody) is `yes` — these are candidate wedges (evidence only).

---

## 7. Part E — Whitespace & positioning (PRIMARY narrative)

**Deliverable:** `R09_whitespace_memo.md`

Required sections:

1. **Underserved user** — tie to R08 primary (serious investor) + secondary (swing); cite competitor gaps
2. **Underserved data types** — e.g. precision ticker on filings, FII/DII without narrative, Hindi macro explainers
3. **Overserved — do not build** — terminal ticks, F&O chain for core product, GMP, tips, broker
4. **9:00 IST wedge test** — R04 wished features; which incumbents already do them? which are still open?
5. **Competitive moat hypothesis** — 3 bullets: what SachNetra could own if V2 collectors keep running (news + DB, not UI fluff)
6. **Risks** — where Moneycontrol/ET/Kite win on distribution; ad revenue; SEO

**Deliverable:** `R09_positioning_vs_r08.md` — table: R08 recommendation vs competitor reality (agree / conflict / open).

---

## 8. Part F — Data registry (required)

**Deliverable:** `R09_data_registry.csv`  
Every pricing claim, user count, or market share guess: `claim, value, as_of_date, confidence, source_url`

No market-share numbers without `anecdote` or `marketing` confidence.

---

## 9. Suggested search queries

```
Moneycontrol app review problems 2025 2026 Reddit India
Economic Times markets app vs Moneycontrol India trader
Trendlyne features ticker news tagging India
TickerTape vs Moneycontrol comparison India 2026
Sensibull Opstra India F&O retail tools pricing
smallcase vs direct equity India retail 2026
TradingView India markets news integration
Cogencis terminal India price broker
Bloomberg terminal India cost fund manager
NSE corporate filings API vendor India structured data
FII DII data feed India API retail app
Finshots vs Finology India finance news 2026
Google News India stock market personalization
Zerodha Kite news section features 2026
India market data vendor sentiment API pricing
```

Also search Hindi: `मनीकंट्रोल ऐप समीक्षा`, `शेयर बाजार न्यूज ऐप भारत`.

---

## 10. Deliverables checklist (all required)

Save under `scratch/app_vision_research/output/R09/`:

- [ ] `R09_news_competitors.csv`
- [ ] `R09_news_pain_points.md`
- [ ] `R09_analytics_competitors.csv`
- [ ] `R09_terminal_vs_aggregator.md`
- [ ] `R09_vendor_landscape.csv`
- [ ] `R09_feature_matrix.csv`
- [ ] `R09_feature_matrix_notes.md`
- [ ] `R09_whitespace_memo.md`
- [ ] `R09_positioning_vs_r08.md`
- [ ] `R09_data_registry.csv`

Then update:

- [ ] `scratch/app_vision_research/R09_competitive_landscape_india_fintech.md` — tick §Status checklist
- [ ] `scratch/app_vision_research/research_log.md` — one-line verdict
- [ ] `scratch/app_vision_research/_index.md` — mark R09 `[x]`, set **R00** as NEXT

**Do not** edit `app_vision_2026.md` — Claude merges after review.

---

## 11. Quality gate before you finish

- [ ] **≥20 competitors** with URLs and as-of dates
- [ ] SachNetra row is **honest** (gaps named: Hindi UI, flows UI, no terminal)
- [ ] **§11 non-compete** addressed in `R09_terminal_vs_aggregator.md` (Bloomberg/Cogencis = different league)
- [ ] **≥3 whitespace areas** backed by competitor `no`/`partial` in feature matrix
- [ ] **≥3 overserved areas** we should not build (terminal, tips, GMP as core)
- [ ] R04 9:00 IST wishes **mapped** to who already ships each feature
- [ ] No Exp 11; no Telegram tip channel recommendations
- [ ] Facts vs opinions separated; registry complete

---

## 12. One-paragraph summary for Lijo (end of walkthrough)

When done, write 5 bullets:

1. **Top 3 competitors** SachNetra actually overlaps with (news layer)  
2. **Top 3 whitespace** opportunities (data/feature nobody does well)  
3. **Top 3 do-not-build** areas (terminal, F&O core, tips/GMP)  
4. **Does R08 persona rec hold** after seeing competitor landscape? (Y/N + one line)  
5. What to run next: **R00 north star** (after R09)
