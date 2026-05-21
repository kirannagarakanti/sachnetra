---
tags: [synthesis, sachnetra, roadmap, quant-finance, execution, agent-context]
source: [[sachnetra_quant_pivot]], [[cluster_story_entity_architecture]]
last_updated: 2026-05-15
audience: future Claude Code sessions, Lijo, James
---

# SachNetra Quant Roadmap
*Execution layer — what to build next, in what order, with which dependencies. Load this when planning sprints, picking the next task, or onboarding a new agent.*

---

## Purpose & How To Use This Doc

This doc is the **execution counterpart** to two strategy docs:

| Doc | Layer | When to load |
|---|---|---|
| `[[sachnetra_quant_pivot]]` | Strategy — **why** we're building this and **what we'll be paid for** | When deciding business priorities, talking to potential customers, or making revenue trade-offs |
| `[[cluster_story_entity_architecture]]` | Architecture — the **data model** (headline → cluster → thread → entity) | When working on V2-012 / V2-013 / V2-014, or any feature that touches the data layer |
| `[[sachnetra_quant_roadmap]]` *(this doc)* | Execution — **what to build, in what order, with what effort** | When picking the next task, sequencing sprints, or estimating delivery |

**Future Claude agents loading this doc cold:**
1. Read this doc fully — it's the index to everything else
2. If working on a specific task, load the task file in `ai_docs/tasks/V2-XXX_*.md`
3. If the task touches the data model, also load `[[cluster_story_entity_architecture]]`
4. If the task affects revenue priorities, also load `[[sachnetra_quant_pivot]]`
5. Always respect `CLAUDE.md`'s sacred-files list — these rules override everything in this doc

---

## The Three-Doc System

```
sachnetra_quant_pivot.md          (strategy / why / revenue)
            ▲
            │ "this task earns revenue via Product A/B/C"
            │
sachnetra_quant_roadmap.md        (this doc — execution / when / who)
            │
            │ "this task uses the cluster/thread/entity model"
            ▼
cluster_story_entity_architecture.md  (architecture / how / schema)
            ▲
            │ "this primitive ships in task V2-XXX"
            │
ai_docs/tasks/V2-XXX_*.md         (the actual unit of work)
```

Tasks are the unit of work. The three syntheses give them context.

---

## Current State (2026-05-15)

### Complete ✅
| Task | What it shipped |
|---|---|
| V2-000 | Bootstrap, rules, sacred file list |
| V2-001 | Railway PostgreSQL, `india_news_signals` table, DDL runner |
| V2-002 | "Enrich Summary" — Groq summary on ✨ click, stored in Redis |
| V2-003 | Related Stories — Jaccard 0.15–0.35 |
| V2-006 | New Stories timeline pill |
| V2-011 | Headline storage, sentiment analysis research, market-moving auto-enrich queue |

### In flight 🚧
| Task | Status |
|---|---|
| **V2-012** Autonomous Pipeline | Spec finalized; implementation pending. See `ai_docs/tasks/V2-012_autonomous_pipeline.md`. Adds clusters, autonomous Railway RSS, `_classifier.mjs` port, 5 new columns including `thread_id` reserved for V2-013 |

### Roadmap-listed but not started
| Task | Why deferred / next action |
|---|---|
| V2-004 Feedback Buttons | Reframe as **Source Credibility Scoring** before starting (see "Original Plan Items" below) |
| V2-005 RSSHub on Railway | Government source feeds (PIB, MEA, MHA, NDMA). Independent build |
| V2-007 Hindi Language | **Strategic moat per pivot doc — consider promoting in priority order** |
| V2-008 WhatsApp Daily Brief | Distribution play; depends on V2-013 thread summaries being good |
| V2-009 State Liveability Score | BLOCKED — architect gate |
| V2-010 Landing Page | BLOCKED — needs 30 days usage data |

### Newly identified — not yet in `CLAUDE.md` task list
These came out of the 2026-05-15 architecture conversation + reconciliation with `sachnetra_quant_pivot.md`. They need to be formalized as task files and added to `CLAUDE.md`'s V2 Task Status block.

| Task | What it ships | Why this exists |
|---|---|---|
| **V2-013** Story Threads | `story_threads` table + linker + thread summaries | Multi-day event continuity ("Air India crash" arc). Cluster_story_entity_architecture, Layer 3 |
| **V2-014** Entity Timeline | `entity_timeline` table + fan-out + quant query surface | Per-entity signal aggregation. Cluster_story_entity_architecture, Layer 4 |
| **V2-015** Corporate Filings Pipeline | NSE/BSE corp announcement scrape → OCR + LLM → events | Product A in pivot doc — *the highest-alpha source*. Auditor resignations, promoter pledging, board outcomes, SEBI penalties |
| **V2-016** B2B Sentiment API | Auth, rate limit, `/sentiment/company/:ticker` endpoint | Product B in pivot doc — the actual revenue surface |
| **V2-017** FII/DII Daily Flows | NSDL CSV scrape → PostgreSQL table | Free, daily, top-3 India signal |
| **V2-018** NSE Bourse Announcements | NSE XML feed → classifier → signals | Leads news by hours; pure free-tier alpha |
| **V2-019** RBI Weekly Statistical Supplement | PDF/CSV parse → macro table | System-level credit + deposit growth |
| **V2-020** BIS India Activation | Wire existing `get-bis-policy-rates.ts` handler to India queries | Handlers already exist; just connect |
| **V2-021** Reddit + YouTube Social Pilot | r/IndianStreetBets, r/IndiaInvestments, YouTube finance | Free, validates social pipeline before X spend |
| **V2-022** X Basic Tier — Verified India Handles | 10 hand-picked verified finance accounts via X API Basic | $100/mo; pilot social-as-peer-to-news |
| **V2-023** Telegram Channels (Legal-review gated) | Read-only bot on public finance channels | Where Indian retail conversation actually lives; SEBI risk |
| **V2-024** NSE Options Chain + OI | NSE option-chain endpoint → derivatives table | PCR, IV rank, OI change |
| **V2-025** Quarterly Fundamentals | Screener.in / NSE corp filings parse | Required for any factor model |
| **V2-026** POSOCO Electricity Daily | State-wise consumption | Demand proxy, free |
| **V2-027** FASTag Toll Volumes | NHAI publication | Goods movement proxy, free |
| **V2-028** Satellite Pilots | Sentinel-2 free → port congestion, factory smoke | Real edge, real complexity, paid eventually |
| **V2-029** Historical Dataset Packaging | 12-month export pipeline, schema docs | Product C in pivot doc — Neudata listing prep |

---

## Detailed Roadmap (Tiered)

### Tier 1 — Foundation completion
Make the data model layered before adding more sources. Sequencing here is non-negotiable: thread needs cluster, entity needs thread.

| Task | Effort | Dependencies | Ships in pivot doc as |
|---|---|---|---|
| V2-012 Autonomous Pipeline | 6–7 h | (in flight) | Foundation for Products A, B, C |
| V2-013 Story Threads | 8–12 h | V2-012 | Product B (richer thread-aware API) |
| V2-014 Entity Timeline | 4–6 h | V2-013 | Product B (per-entity signal query) |

### Tier 2 — Free India alpha sources (highest ROI)
All of these are free public data with massive alpha-per-build-hour. Should be the next batch after V2-014.

| Task | Effort | Dependencies | Alpha quality |
|---|---|---|---|
| V2-017 FII/DII Daily Flows | 1–2 h | None | Very high — institutional positioning |
| V2-018 NSE Bourse Announcements | 3–4 h | None | High — leads news |
| V2-015 Corporate Filings Pipeline | 20–30 h | V2-014 (entity_timeline target) | **Highest — promoter pledging, auditor changes** |
| V2-019 RBI WSS | 2 h | None | High — system credit growth |
| V2-020 BIS India Activation | 1 h | None | Medium — handlers already exist |

### Tier 3 — Productization (revenue path)
The schema and signals exist; now turn them into a sellable product.

| Task | Effort | Dependencies |
|---|---|---|
| V2-004 Source Credibility Scoring *(reframed)* | 6–8 h | V2-013 |
| V2-016 B2B Sentiment API | 15–20 h | V2-014, V2-015 |
| V2-007 Hindi Language | 12–16 h | V2-012 |
| V2-029 Historical Dataset Packaging | 8–10 h | 12 months of V2-012+ data accumulated |

### Tier 4 — Social signal layer
Cheap-to-test sources first; pay for X only after the free signals prove the pipeline.

| Task | Effort | Cost | Notes |
|---|---|---|---|
| V2-021 Reddit + YouTube Pilot | 6–8 h | Free | Reddit JSON endpoints; YouTube Data API free tier |
| V2-022 X Basic Tier | 4–6 h | $100/mo | 10 hand-picked verified handles only — don't try to cover everything |
| V2-023 Telegram Channels | 8–12 h | Free + legal review | SEBI risk; gate on legal review first |

### Tier 5 — Microstructure & fundamentals
Required eventually for any factor model. Not in the original pivot doc but flagged in 2026-05-15 conversation as a key gap.

| Task | Effort | Source |
|---|---|---|
| V2-024 NSE Options Chain + OI | 4–6 h | NSE option chain endpoint |
| V2-025 Quarterly Fundamentals | 16–24 h | Screener.in / NSE filings |

### Tier 6 — Alternative data
Real edge but real complexity. Defer until Tiers 1–3 are shipped.

| Task | Effort | Source | Cost |
|---|---|---|---|
| V2-026 POSOCO Electricity | 2–3 h | POSOCO daily | Free |
| V2-027 FASTag Toll Volumes | 2–3 h | NHAI publication | Free |
| V2-028 Satellite Pilots | 40+ h | Sentinel-2 (free) → Planet Labs (paid) | Free → $$ |

### Tier 7 — Distribution
| Task | Effort | Dependencies |
|---|---|---|
| V2-008 WhatsApp Daily Brief | 8–12 h | V2-013 (good thread summaries) |
| V2-010 Landing Page | TBD | 30 days V2-012+ usage |

---

## Revenue Alignment

Each task feeds one of three products from `[[sachnetra_quant_pivot]]`.

### Product A — Corporate Filing Intelligence Feed
*Real-time NSE/BSE corp announcement events. ~$260–660/mo to run; sold to institutional clients.*

| Feeds | Tasks |
|---|---|
| Filing events | V2-015 |
| Institutional flows context | V2-017 |
| Announcement-as-event | V2-018 |
| Source credibility weighting | V2-004 |
| Entity-attribution | V2-014 |

**Earliest shippable Product A**: V2-014 + V2-015 + V2-017 + V2-018 + V2-004 = roughly 40–55 hours of work.

### Product B — Bilingual Sentiment Signal API
*Pricing ₹499–50,000/year. The core revenue surface.*

| Feeds | Tasks |
|---|---|
| Sentiment per ticker | V2-012, V2-013, V2-014 |
| Hindi sentiment (the moat) | V2-007 |
| API surface | V2-016 |
| Source-weighted scoring | V2-004 |
| Social signal augmentation | V2-021, V2-022 |

**Earliest shippable Product B**: V2-014 + V2-007 + V2-016 = roughly 35–45 hours.

### Product C — Historical Dataset
*$50K–500K one-time licenses via Neudata or direct. 12-month data accumulation prerequisite.*

| Feeds | Tasks |
|---|---|
| 12 months of cluster/thread/entity data | V2-012 → V2-014 must be live for 12 months |
| Export pipeline | V2-029 |
| Neudata listing | External (Lijo) |

**Earliest shippable Product C**: 12 months after V2-014 ships = mid-2027 at earliest.

---

## Priority Queue (recommended order)

Sequenced for maximum revenue-per-build-hour. Each block assumes the prior block is complete.

---

### ⟳ Execution refocus — 2026-05-22 (quant-data-only filter)

Lijo's directive: **build only what feeds the quant data layer; postpone or cut the rest.**
Current reality overrides the block order below where they conflict.

**Done / filed (free India alpha collectors — the database is the asset):**
- V2-017 FII/DII ✅ · V2-017b NSDL deep FII ✅
- V2-018 NSE Announcements · V2-019 RBI WSS · V2-020 BIS India Macro (SDMX) — **task-filed
  2026-05-22, awaiting James impl** (recon complete, all verified against Gemini scratch).

**V2-015 Corporate Filings (kingpin) — REFRAMED, not cut:** split into capture
(= V2-018, banks the filing PDFs now) + extraction (OCR/LLM = a **separate, postponed,
DB-connected application**, NOT a SachNetra-repo task). See `memory/project_v2015_ocr_decision.md`.

**Next quant-useful tasks (build in this order):**
1. **V2-024 NSE Options Chain + OI** — microstructure (PCR / IV / OI-change); free.
   ✅ **TASK FILED 2026-05-22** (`ai_docs/tasks/V2-024_nse_options_oi.md`). Recon found the
   live path is `option-chain-v3` (two-step, per-expiry) warmed on `/option-chain`; storage =
   **EOD aggregates in PostgreSQL only** (object-storage hybrid rejected as premature infra);
   live-only → no backfill.
2. NSE bulk/block deals — daily CSV, ~1–2 h, institutional footprints.
3. V2-026 POSOCO Electricity / V2-027 FASTag — alt-data demand proxies, ~2–3 h each.
4. V2-025 Quarterly Fundamentals — factor-model inputs; heavier (16–24 h), do after the cheap wins.

**Postponed / cut through the quant lens (serve product/distribution, not the model):**
- **Cut from the quant track:** V2-008 WhatsApp, V2-010 Landing (zero quant value).
- **Postponed:** V2-007 Hindi, V2-016 B2B API (revenue surfaces — revisit when data is rich);
  V2-021/022/023 Social (Reddit/X/Telegram — "nice-to-have, not load-bearing"; X also costs $/mo);
  V2-028 Satellite (40 h+); V2-004 Source Credibility (mild quant value, Block-3).

---

**Block 1: Complete the data model (Tier 1)** — ~18–25 hours
1. V2-012 (in flight)
2. V2-013 Story Threads
3. V2-014 Entity Timeline

**Block 2: Free India alpha sources (Tier 2)** — ~30–45 hours
4. V2-017 FII/DII (1–2 h, do first — free quick win)
5. V2-018 NSE Bourse Announcements (3–4 h)
6. V2-019 RBI WSS (2 h)
7. V2-020 BIS India Activation (1 h)
8. V2-015 Corporate Filings Pipeline (20–30 h — the alpha kingpin)

**Block 3: Make it sellable (Tier 3)** — ~40–55 hours
9. V2-004 Source Credibility Scoring (reframed)
10. V2-007 Hindi Language
11. V2-016 B2B Sentiment API

**At end of Block 3 — first revenue moment** (per pivot doc Revenue Timeline: "Month 4-6 first B2B pilots").

**Block 4: Social signals (Tier 4)** — ~20–25 hours, optional
12. V2-021 Reddit + YouTube (free pilot first)
13. V2-022 X Basic (only if Reddit/YouTube proves value)
14. V2-023 Telegram (legal-gated)

**Block 5: Deepen the data (Tiers 5–6)** — ~70–90 hours
15. V2-024 Options Chain
16. V2-025 Quarterly Fundamentals
17. V2-026 Electricity, V2-027 FASTag
18. V2-028 Satellite (deferred — pilot only)

**Block 6: Productize for licensing (Tier 7)** — ~10–15 hours
19. V2-029 Historical Dataset Packaging (run continuously; first export at month 12)
20. V2-008 WhatsApp Brief, V2-010 Landing Page (when prereqs met)

Total to revenue-ready (Blocks 1–3): **~90–125 hours of focused work**. At Lijo's pace this is realistically 2–3 months part-time.

---

## WorldMonitor Data Inheritance — What's Already Wired Up

The fork brings substantial quant-relevant infrastructure for free. These do not need new tasks — they need *activation* for India queries. Reference for future agents: when a quant task seems to need "global macro" or "geopolitical risk" or "cross-asset correlation," check this list before building from scratch.

| Domain | Live script / handler | India activation status |
|---|---|---|
| Equity prices (Yahoo + Finnhub) | `seed-market-quotes.mjs` | Nifty 50 already covered via `market-taxonomy.json` |
| ETF flows | `seed-etf-flows.mjs` | BTC only; pattern reusable for `NIFTYBEES`, `GOLDBEES`, etc. |
| Commodities | `seed-commodity-quotes.mjs` | Live |
| Crypto + stablecoins | `seed-crypto-*.mjs` | Live (cross-asset correlation) |
| FRED macro (Fed funds, 10y2y, VIX, GDP, WTI, M2) | `seed-economy.mjs` | Live |
| BIS policy rates (incl. RBI) | `get-bis-policy-rates.ts` | Handler live; need India query wiring (V2-020) |
| World Bank India indicators | `seed-wb-indicators.mjs` | Live |
| EIA energy | `seed-economy.mjs` | Live |
| Prediction markets (Polymarket + Kalshi) | `seed-prediction-markets.mjs` | Live; some India-tagged markets |
| GDELT geopolitical tone | `seed-gdelt-intel.mjs` | Live; add India-specific queries |
| ACLED + UCDP conflict events | `seed-ucdp-events.mjs` | Live |
| Shipping rates (FRED) | `seed-supply-chain-trade.mjs` | Live; India is reporter `356` |
| Maritime navigational warnings | `seed-military-maritime-news.mjs` | Live |
| Submarine cable health | `seed-submarine-cables.mjs` | Live (IT outsourcing dependency) |
| Internet outages | `seed-internet-outages.mjs` | Live |
| Cyber threats | `seed-cyber-threats.mjs` | Live (IT services impact) |
| Climate anomalies | `seed-climate-anomalies.mjs` | Live (monsoon = CPI = RBI lever) |
| Fire detections | `seed-fire-detections.mjs` | Live (industrial fire = single-name event) |
| Natural events (USGS) | `seed-natural-events.mjs` | Live |
| Arxiv research papers | `seed-research.mjs` | Live (semiconductor/AI structural signals) |
| Military flights (ADS-B) | `seed-military-flights.mjs` | Live |
| Stock analysis / backtest | `analyze-stock.ts`, `backtest-stock.ts` | Live; pattern reusable for India tickers |

**Rule of thumb for agents**: before writing a new `seed-*.mjs`, search this list. If it exists, the question is "how do I activate it for India?" not "how do I build it?"

---

## Data Gaps for Serious India Quant

What's NOT yet in the codebase, organized by what each unlocks. **Bold = highest-value gaps**. Each item maps to a task in the roadmap above (or should). Use this as the punch list when scoping new tasks.

### 1. Market microstructure (currently end-of-day only)

| Signal | Source | Cost | Maps to | Notes |
|---|---|---|---|---|
| Intraday OHLCV | NSE paid feed / Yahoo (1-min, 7-day window) | Free (limited) → paid | — | Yahoo limit makes this hard for serious quant |
| Options chain (puts/calls + Greeks) | NSE option-chain endpoint | Free (rate-limited) | V2-024 | NIFTY + BANKNIFTY priority |
| Open interest (change in OI) | NSE end-of-day | Free | V2-024 | The *delta* is the signal, not absolute |
| Futures | NSE | Free (EOD) | — | NIFTY/BANKNIFTY weekly + monthly, stock futures for Nifty 50 |
| Put-call ratio | Derived from options chain | Free | V2-024 | Classic contrarian indicator |
| Block deals / bulk deals | NSE daily CSV | Free | — | Plain CSV, easy parse |

### 2. **Fundamentals (huge gap — nothing here yet)**

| Data | What you get | Sources | Maps to |
|---|---|---|---|
| Quarterly results | Revenue, EBITDA, EPS, guidance | NSE/BSE corp filings, MoneyControl | V2-025 |
| Balance sheet ratios | P/E, P/B, ROE, debt/equity, current ratio | Screener.in (parseable), Tijori | V2-025 |
| Sell-side consensus | Forward EPS estimates, target prices | Trendlyne, Tickertape | V2-025 |
| Corp filings (raw) | Annual reports, prospectuses | NSE/BSE corp filings portal | V2-015 / V2-025 |

### 3. **Corporate actions & governance (huge gap)**

| Signal | Alpha quality | Frequency | Source | Maps to |
|---|---|---|---|---|
| **Auditor changes / resignations** | ★★★★★ (the kingpin signal — fraud risk) | Event-driven | NSE/BSE corp filings | V2-015 |
| **Insider/promoter transactions** | ★★★★★ (strongest leading signal in Indian equities) | Event-driven | SAST disclosures on NSE/BSE | V2-015 |
| **Promoter pledging changes** | ★★★★ (Adani-style red flag) | Event-driven | NSE/BSE pledge disclosures | V2-015 |
| **SEBI enforcement actions** | ★★★★ (debarments, penalties) | Event-driven | SEBI orders portal | V2-015 |
| Shareholding pattern | ★★★ (FII/DII/retail/promoter split per stock) | Quarterly | NSE/BSE quarterly filings | — |
| Dividends, splits, bonuses, buybacks | ★★ (corp action calendar) | Event-driven | NSE/BSE corp action page | — |

All of these flow into **Product A — Corporate Filings Pipeline**. The pivot doc calls this out as the highest-alpha source. V2-015 should land before any social signal work.

### 4. **Institutional flows (huge gap)**

| Signal | Frequency | Source | Cost | Maps to |
|---|---|---|---|---|
| **FII/DII daily flows** | Daily | NSDL CSV | Free | V2-017 (top-3 India signal) |
| Provisional FII data | Same-day intraday | NSE/BSE | Free | — |
| Mutual fund holdings | Monthly | AMFI disclosures | Free | — |
| SEBI bulk / block deals | Daily | NSE / BSE CSV | Free | — |

### 5. India macro (partial coverage exists, needs more depth)

| Indicator | Frequency | Source | What it tells us | Maps to |
|---|---|---|---|---|
| **RBI Weekly Statistical Supplement** | Weekly | RBI website | System credit + deposit growth, currency in circulation | V2-019 |
| GST collections | Monthly | GoI GST portal | Leads earnings; consumption proxy | — |
| IIP (Industrial Production) | Monthly | MoSPI | Manufacturing health | — |
| PMI Manufacturing + Services | Monthly | S&P Global | Forward-looking activity gauge | — |
| Trade balance + components | Monthly | Ministry of Commerce | FX pressure, sector winners | — |
| G-Sec yield curve (1y / 5y / 10y / 30y) | Daily | RBI / NSE | Rate expectations, duration risk | — |
| USD-INR forwards | Continuous | NSE / RBI | Implied FX expectations | — |
| MNREGA wages | Monthly | Rural Dev Ministry | Rural demand proxy | — |

### 6. Sector-specific demand signals (zero coverage today)

| Sector | Signal | Source |
|---|---|---|
| Auto | Monthly wholesale + retail sales | SIAM, FADA |
| Banking | Credit growth, deposit growth, NPA | RBI WSS (V2-019) |
| IT | Hiring trends | Naukri JobSpeak index, LinkedIn API |
| FMCG | Two-wheeler sales (rural proxy) | SIAM |
| Pharma | USFDA Form 483 / warning letters | FDA |
| Cement / Steel | Capacity utilization, production | CMIE, industry bodies |
| Real estate | Property registrations | State govt portals |
| Aviation | Passenger traffic | DGCA monthly |

No single task captures these — each is its own ~2–4 hour build. Probably bundle 3–4 into a single "V2-031 Sector Demand Signals" task when the time comes.

### 7. Alternative data (where modern quants actually live)

| Data type | Source | Cost | India quant signal | Maps to |
|---|---|---|---|---|
| **Electricity consumption** | POSOCO state-wise daily | Free | Demand proxy, leads IIP | V2-026 |
| **FASTag toll volumes** | NHAI publication | Free | Goods movement proxy | V2-027 |
| **Satellite imagery** | Sentinel-2 (free) → Planet Labs (paid) | Free → $$ | Port congestion (JNPT, Mundra), DMart parking, factory smoke | V2-028 |
| GST e-way bills | GST portal | Free | Interstate goods movement | — |
| Web traffic | SimilarWeb | Paid | D-Mart online, Zomato, Nykaa, Policybazaar engagement | — |
| App installs / DAU | Sensor Tower, data.ai | Paid | Fintech app momentum (PayTM, PhonePe consumers) | — |
| Job postings | Naukri scrape, LinkedIn API | Free → paid | TCS hiring freeze = Q-ahead revenue warning | — |
| Google Trends | Google | Free | Search volume per ticker / scheme name (weak signal) | — |
| Pollution / mobility | CPCB, Google Mobility | Free (when published) | Activity recovery proxy | — |

### 8. Social signals (X / Twitter and beyond)
See dedicated "Social Data" section below for full treatment. Maps to V2-021, V2-022, V2-023.

### 9. News categories not yet covered

| Source | What you get | Format | Maps to |
|---|---|---|---|
| **NSE / BSE bourse announcements** | All corp filings (daily) | Machine-readable XML | V2-018 |
| SEBI filings | INVESTOR alerts, draft prospectuses, settlement orders | PDF | V2-015 |
| MCA filings (Registrar of Companies) | M&A activity, charge filings | Web scrape | — |
| NCLT orders | Insolvency proceedings (early warning on debt-laden names) | Court PDFs | — |

### 10. Politics & governance

| Event | Frequency | Quant relevance |
|---|---|---|
| State + general election outcomes | Periodic | Sector rotation (infra spending, populist schemes) |
| Budget speeches (line-item parsing) | Annual + interim | Direct sector winners / losers |
| Cabinet reshuffles, ministry changes | Event-driven | Policy direction signals |
| Supreme Court / High Court rulings | Event-driven | Industry-defining (telecom AGR, retro tax, Vodafone-Idea) |

### The honest assessment

WorldMonitor already gave SachNetra roughly **60% of a global-grade data pipeline for free**. The macro, geopolitical, supply chain, and cross-asset coverage is exceptional. The Indian-specific gaps — fundamentals, flows, insider data, microstructure — are real, but **most of the highest-value ones (FII/DII, insider transactions, promoter pledging, bourse announcements, NSDL data) are free** if you scrape NSE/BSE/RBI directly.

The narrative-tagged entity timeline from the cluster/thread/entity stack + free Indian regulatory data is, genuinely, the kernel of a real fund. X/Twitter is nice-to-have, not load-bearing.

**Budget check**: V2-012 → V2-014 + Tiers 2–3 in the roadmap above is ~120 hours of focused work and gives a differentiated India quant data layer for **under $200/mo in API costs**. That's the asset.

---

## Social Data — The X / Twitter Question

Captured here for posterity because it'll come up again.

### X API pricing reality (2026)
| Tier | $/month | Reads/month | Use case |
|---|---|---|---|
| Free | $0 | 100 | Useless |
| Basic | $100 | 10K | 5–10 hand-picked handles |
| Pro | $5,000 | 1M | Real quant-tier |
| Enterprise | $42K+ | unlimited | Bloomberg-level |

### Decision logged 2026-05-15
- **Do NOT pay for Pro tier yet.** ROI unproven.
- **Block 4 sequence**: free Reddit + YouTube → X Basic (10 handles) → re-evaluate.
- **What X is FOR**: verified India finance accounts breaking news (Sucheta Dalal, Anuj Singhal, Latha Venkatesh, CNBC TV18, ET Markets, Mint), regulator handles (SEBI, RBI, NSE, BSE), cashtag mention volume on a small set of top tickers.
- **What X is NOT for**: generic India sentiment (too noisy), retweet-as-signal (bot amplification), small-cap pump-dump detection (use Telegram for that).

### Cheaper/free alternatives where the actual Indian retail conversation lives
| Source | Cost | Value |
|---|---|---|
| Reddit JSON | Free | r/IndianStreetBets (~hundreds of thousands of subs), r/IndiaInvestments |
| Telegram public channels | Free + legal | Where pump-dump and tips circulate (SEBI risk in publishing this) |
| YouTube Data API | Free tier | Pranjal Kamra, Asset Yogi, P R Sundar, CA Rachana Ranade — comments + titles |
| Google Trends | Free | Search volume per ticker — weak but free |
| StockTwits | Free API | Cashtags, US-skewed but some India |

### Schema for `india_social_signals` (when V2-021+ ship)
```sql
CREATE TABLE india_social_signals (
  social_hash    TEXT UNIQUE NOT NULL,
  source         TEXT NOT NULL,        -- 'twitter' | 'reddit' | 'telegram' | 'youtube'
  source_handle  TEXT,                 -- '@suchetadalal' | 'r/IndianStreetBets'
  posted_at      TIMESTAMPTZ NOT NULL,
  text           TEXT NOT NULL,
  url            TEXT,
  entities       TEXT[],
  cashtags       TEXT[],
  sentiment      DECIMAL(5,4),
  engagement     INT,
  is_verified    BOOLEAN,
  is_influencer  BOOLEAN,
  thread_id      UUID                  -- joins to story_threads (V2-013)
);
```

Social is a *peer* to news, not a replacement. Both feed the cluster → thread → entity stack.

---

## The Feature Stack (What the Quant Model Consumes)

This is the long-term shape of the data layer. Future agents working on V2-014+ should think of every new source as feeding this stack.

**Per ticker, per hour:**

| Category | Features | Source layer / task |
|---|---|---|
| News | cluster count, sentiment, story age, thread status (developing → resolved) | V2-012, V2-013 |
| Social | mention count, sentiment, influencer-weighted sentiment, anomaly score | V2-021, V2-022 |
| Price | return (1h, 1d, 5d), volatility, volume z-score | seed-market-quotes (live) |
| Microstructure | OI change, PCR, IV rank | V2-024 |
| Fundamentals | days-to-earnings, EPS revision direction, P/E z-score | V2-025 |
| Flows | FII net for the day, MF buying flag, promoter transaction last 30d, pledging change | V2-017, V2-015 |
| Macro | VIX, USD-INR, 10y yield, Brent | seed-economy (live) |
| Cross-asset | gold, BTC, S&P 500 overnight | seed-commodity-quotes, seed-crypto (live) |
| Event flags | monsoon anomaly, geopolitical risk score, filing event types | seed-climate-anomalies (live), V2-015 |

**Per thread (story-level):**

| Feature | What it captures |
|---|---|
| Cluster count + source diversity (HHI) | Breadth of coverage; HHI flags echo-chamber syndication |
| Thread age + status + velocity | Lifecycle position (`developing → dormant → resolved`) |
| Affected entities + sectors | Cross-asset impact map |
| Aggregate sentiment + sentiment trajectory | Direction + rate of change |
| Social engagement attached to thread | Retail attention multiplier |

The model trains on this; positions follow.

---

## Sacred Boundaries (Repeated From CLAUDE.md)

Future agents: these override anything else in this doc.

```
NEVER WRITE TO:
  src/config/variants/full.ts        — WorldMonitor live variant
  src/config/variants/tech.ts        — WorldMonitor tech variant
  src/config/variants/finance.ts     — WorldMonitor finance variant
  scripts/seed-insights.mjs          — Live news insights cron
  server/worldmonitor/news/v1/_classifier.ts  — TS source of truth; mjs port is the writable mirror
  src/services/clustering.ts         — SPA clustering, separate system
```

If a roadmap task seems to require touching these — stop, flag it to Lijo + James. The task is wrong, not the rules.

---

## Open Decisions (Parking Lot)

Issues that need a Lijo/James decision before the relevant block starts.

### Decisions for Block 2 (Free alpha sources)
- **V2-015 OCR provider**: Tesseract local vs. Google Vision API vs. Claude/GPT vision. Cost: free vs. $1.50/1k pages vs. ~$3/1k pages. Decision: defer until V2-015 task is opened.
- **V2-015 filing categorization taxonomy**: how granular? Just "auditor change | promoter pledge | board change | SEBI penalty | other" or finer? Decision: start coarse, refine after 100 filings observed.

### Decisions for Block 3 (Productization)
- **V2-007 Hindi model**: FinBERT-Hindi (limited), IndicBERT, multilingual XLM-RoBERTa, or Groq with Hindi prompt? Decision: benchmark all four on 200 Hindi headlines before committing.
- **V2-016 API auth**: simple API keys vs. OAuth2 vs. JWT? Decision: API keys for v1 (₹499 tier doesn't justify OAuth complexity).
- **V2-016 billing integration**: Razorpay subscriptions or invoice-per-pilot? Decision: invoice-per-pilot for first 5 customers, then automate.
- **V2-004 credibility scoring algorithm**: simple thumbs ratio vs. EWMA-weighted vs. Bayesian smoothed? Decision: simple thumbs ratio for v1; revisit after 1000 votes collected.

### Decisions for Block 4 (Social)
- **V2-023 Telegram legal review**: SachNetra reading public channels = is this republication risk? Need lawyer opinion before V2-023 starts.
- **V2-022 X handle list**: who are the 10 handles? Need explicit Lijo curation list before task starts.

### Cross-cutting decisions
- **CLAUDE.md task list update**: should V2-013 through V2-029 be formally added to the V2 Task Status block in `CLAUDE.md`? Recommendation: yes, but in batches (only add what's been task-filed so the list reflects reality, not aspiration).
- **Task numbering gap**: V2-009 (State Liveability) and V2-010 (Landing Page) are blocked. Do new tasks reuse those numbers or extend past V2-010? Recommendation: extend past — never reuse numbers.

---

## Quick Reference for Future Agents

### When picking the next task to work on
1. Check `CLAUDE.md` V2 Task Status block for canonical status
2. Look at "Priority Queue" section above for sequencing rationale
3. If task file exists in `ai_docs/tasks/V2-XXX_*.md`, load it; that's source of truth for the task
4. If task doesn't exist yet, ask Lijo whether to create one via `/task` skill before starting

### When implementing a data-layer feature
1. Load `[[cluster_story_entity_architecture]]` for the schema model
2. Check `_seed-utils.mjs` for `runSeed()` pattern — every new cron uses this
3. Check the inheritance table above before building a new data source
4. New data tables: follow `india_news_signals` naming convention (`india_*_signals` or `india_*`)
5. New Redis keys: follow `news:*:v1:india:*` convention

### When considering API / B2B work
1. Load `[[sachnetra_quant_pivot]]` for the product definitions
2. Schema for sentiment API is documented there (`/sentiment/company/HDFCBANK.NS?hours=24`)
3. Auth + rate limit must come before any pricing tier launch

### When the user mentions "the quant system" or "the data layer"
- They mean the PostgreSQL + Redis stack
- They mean PRODUCT, not just a feature — every task should think about how it feeds Products A/B/C
- "The database is the asset" is the operating principle

---

## Memory File Pointers

For LLM session continuity:
- `memory/MEMORY.md` — index
- `memory/project_sachnetra.md` — project overview
- `memory/project_v2_pipeline_audit.md` — data flow audit + pending fixes
- `memory/project_cluster_story_entity_vision.md` — short version of architecture doc
- `memory/user_daniel.md` — Lijo's profile

---

## Linked Wiki Docs

- `[[sachnetra_quant_pivot]]` — strategy / why / revenue
- `[[cluster_story_entity_architecture]]` — data model / schema / pipeline
- `[[sachnetra_sentiment_architecture]]` — why PG + Redis are written independently
- `[[V2_001_implementation_context]]` — engineering standards from V2-001
- `[[quant_finance]]`, `[[world_quant]]`, `[[reserve_bank_of_india]]` — domain context (from pivot doc's linked nodes)

---

## Changelog

| Date | Change |
|---|---|
| 2026-05-15 | Initial doc. Synthesizes pivot doc (2026-05-05), architecture doc (2026-05-15), and WorldMonitor codebase inventory. |
| 2026-05-15 | Added "Data Gaps for Serious India Quant" section — 10-category breakdown of what's missing for India quant, with task mappings, sector-demand signals table, alternative-data inventory, and the honest assessment that WorldMonitor inheritance + free Indian regulatory data gets to ~60% of a fund-grade data layer for under $200/mo. |
| 2026-05-15 | Converted bulleted lists in data-gaps sections 1, 2, 3, 4, 5, 7, 9, 10 and the feature stack to tables for easier scanning. Tables now carry consistent columns (Signal/Source/Frequency/Cost/Maps to) so future agents can sort and filter by criterion. Alpha quality stars added to Section 3 (corporate actions) to make the kingpin signals visually obvious. |
| 2026-05-22 | Added "Execution refocus" block to the Priority Queue: quant-data-only filter. V2-018/019/020 task-filed; V2-015 reframed as a separate postponed OCR app (V2-018 banks the data); V2-024 Options Chain is next; Hindi/WhatsApp/Landing/social/satellite postponed-or-cut through the quant lens. |
