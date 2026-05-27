---
tags: [synthesis, sachnetra, product, market-research, app-vision]
source: scratch/app_vision_research/ (R00–R09 Antigravity deliverables)
status: CORE COMPLETE — §1–§8 (R03–R00 + R10 founder); optional R01/R02/R05 remain
authored_date: 2026-05-27
audience: Lijo, James, future Claude Code sessions
---

# Application Vision 2026 (Synthesis)

> **Do not treat this doc as research.** It is the merge target after Lijo runs Antigravity briefs in `scratch/app_vision_research/`. Claude fills §2–§6 only from cited deliverables in `scratch/app_vision_research/output/`.

---

## 1. Locked posture (from Lijo, 2026-05-27)

- SachNetra today: **news aggregator + background data collection**.
- **Primary user (Lijo):** **Serious fundamental investor** (locked 2026-05-28 via `R00_lijo_decision_packet.md`); secondary = ex-F&O swing trader.
- **Direction:** Decision packet locked 2026-05-28. Monetization working hypothesis = **B2B API** (revisit after paper-trade log ≥15 signals). **Hindi deferred** entirely.
- **Exp 11:** unrelated to this synthesis.
- **Social research:** public Reddit + Telegram; en / hi / hinglish equal weight; product UI English-first until V2-007.

Full answers: `scratch/app_vision_research/lijo_answers.md`

---

## 2. India market facts baseline (May 2026)

*Source: `scratch/app_vision_research/output/R03/R03_india_market_snapshot_2026-05.md` (pass-2). Sector % from market press — refresh from niftyindices when needed.*

### 2.1 Regime

**Bifurcated, not uniform:** Nifty 50 large-cap **correcting** (-8.6% YTD, ~9% below Jan ATH); **mid-caps resilient** (Midcap 150 ~0.2% off 52w high). Label: *large-cap weak / cyclical-led breadth*.

### 2.2 Indices (27-May-2026 close)

| Index | Close | YTD / vs high |
|---|---|---|
| Nifty 50 | 23,907 | -8.6% YTD; -9.2% from ATH (26,331, 2-Jan-2026) |
| Nifty 500 | 22,986 | -3.9% YTD |
| Midcap 150 | 22,885 | ~flat vs 52w high |
| Smallcap 250 | 17,051 | -5.7% from 52w high |

### 2.3 Sector YTD (approx, May 2026)

| Leaders | Laggards |
|---|---|
| Metal ~+19%, Energy ~+17%, Pharma ~+10% | IT ~-24%, Auto ~-10%, Realty ~-10%, FMCG ~-9%, Bank ~-8% |

### 2.4 Flows — FII vs DII (May 2026 MTD)

| Participant | MTD (to 27-May) | Read |
|---|---|---|
| FPI equity | **~-₹34,469 cr** out | Foreign risk-off |
| DII cash | **~+₹63,445 cr** in | Domestic absorption |
| SIP (April) | **₹31,115 cr**/month | Retail structural bid |
| Equity MF (April) | **₹38,440 cr** in | |

Market held up by **local money fighting foreign selling** — central story for data collection priority.

### 2.5 Macro & derivatives temperature

| Indicator | Level | Note |
|---|---|---|
| RBI repo | 5.25%, neutral (Apr MPC) | Wait-and-watch on oil/West Asia |
| CPI / WPI (Apr) | 3.48% / **8.30%** | WPI spike = pass-through risk |
| USD/INR | ~95.6–96 | Weak rupee; FII headwind |
| REER | 90.96 (Apr) | 13-year low; export tailwind |
| India VIX | 14.98 (27-May) | Fear eased that session |
| Nifty PCR | 0.85 | Cautious; pinned 23.9–24k |

**Policy friction:** STT on F&O up from 1-Apr-2026; single weekly index expiry per exchange — retail speculation under pressure vs SIP channel.

### 2.6 Implications for SachNetra (facts only)

- Aggregator news in a **flow- and sector-rotated** market — IT headlines ≠ metal/energy headlines.
- Collectors aligned with reality: **FII/DII**, macro, **G1 tickers**, filings (V2-030 bulk/block).
- No 9:00 IST product wedge yet — baseline for **R06 Telegram** and **R07 shocks** research.

---

## 3. What people are talking about (Telegram + Reddit — May 2026)

*Sources: `output/R06/`, `output/R04/`.*

**Headline:** Social chatter **matches R03 facts** on every major theme. **Telegram + Reddit agree** on IT fear, FII/DII tug-of-war, STT anger, oil/West Asia, PSU/metal rotation. ~85% noise if ingested raw. **Do not show tips or community temperature in product yet.**

### 3.1 Themes useful for SachNetra (high priority)

| Theme | Matches R03? | maps_to_signal | Why useful |
|---|---|---|---|
| IT crash / AI fear | Y | `sector: IT`, TCS/INFY/WIPRO | Fear narrative ahead of or alongside press; G1 + sentiment |
| Metal / energy / defence rotation | Y | `sector: metal, energy, defence` | HAL, BEL, NTPC chatter ≠ large-cap RSS weight |
| FII out / DII in / SIP | Y | flow macro tile | Mood vs our V2-017 data; educational framing |
| Oil / West Asia | Y | geopolitical, OMC tickers | Feeds R07; gap-down fear |
| STT + F&O rules Apr 2026 | Y | `event_type: regulation` | Hindi explainers lead English “impact” pieces |
| Hindi WPI vs CPI explainers | Y | `event_type: macro_commentary` | **Hindi lead** on margin/rates story |
| Adani / conglomerate | partial | `entity: adani` | Entity timeline, not headline index |
| Broker outages (expiry days) | partial | `event_type: infrastructure_outage` | **Telegram 1–3h before English press** (claimed) |

### 3.2 Themes low value or exclude

| Theme | Verdict | Reason |
|---|---|---|
| Nifty/BankNifty levels, PCR | Maybe | Duplicates OI data; high noise |
| SME IPO / GMP hype | Low | Speculative; useful only if we **collect GMP** |
| Single-stock tips / multibagger | **No** | Pump-and-dump; SEBI enforcement active |
| Pure news reposts (ET/Mint forwards) | **No** | Duplicate of SachNetra RSS |

### 3.3 Telegram before mainstream (incremental value)

1. **Broker app outages** on volatile sessions (e.g. expiry) — social complaints earlier than portals.
2. **SME IPO Grey Market Premium** — hourly in channels; press often weekly.
3. **Hindi/Hinglish policy impact** (STT, weekly expiry limits) — retail translation layer.

### 3.4 Data we do not collect but Telegram cares about

1. **GMP** for SME/mainboard IPOs  
2. **Sector hashtag / mention volume** (crowd rotation proxy)  
3. **Broker outage/latency** incidents  

### 3.5 Regulatory guardrail (SEBI 2023–2026)

Confirmed enforcement against Telegram unregistered advisory and pump-and-dump (`@bullrun2017`, `@Safebulls`, Professional Day Trading Institute, **Wealth Solitaire / desiwallstreet** May 2026, **Darshan Orna**). See `output/R06/R06_regulatory_facts.md`.

**Product rule:** Never surface stock-specific Telegram tips. Phase 2 social only with whitelist + NER scrub — **defer “community temperature” to later.**

### 3.6 Open decision (updated)

| Decision | R06 recommendation |
|---|---|
| Surface community temperature | **Later** — regulatory + noise risk |
| Hindi product priority | Evidence for **Hindi macro explainers** as content gap, not UI yet |
| New collectors | GMP, broker outage tracker = optional Tier 2; flows/macro already on roadmap |

*Audit note:* Social `t.me/s/` and Reddit thread URLs in deliverables are **thematic paraphrases** — verify live links before product citations.*

### 3.7 Reddit corroboration (R04)

**Subreddits that matter for India:**

| Subreddit | Members (approx) | Quality | Use for SachNetra |
|---|---|---|---|
| r/IndiaInvestments | ~919k | 5/5 | SIP, macro, long-term — factual |
| r/IndianStreetBets | ~525k | 2.5/5 | Emotion, F&O, expiry — **temperature** |
| r/StockMarketIndia | ~209k | 3/5 | IPO buzz, portfolios, mid-caps |

**Telegram corroboration:** **Yes on all 8 weekly themes** (Apr–May 2026) — STT/F&O rage, broker outages, oil fear, WPI/CPI confusion, IT/AI bearish + PSU bullish, FII vs DII.

**8-week sentiment arc (Reddit):**

| Period | Mood | Driver |
|---|---|---|
| Early Apr | `regulatory_fear`, angry at brokers | STT + weekly expiry limits |
| Mid Apr | angry at brokers | Zerodha/Groww expiry glitches |
| Late Apr | bearish | West Asia, crude >$110 |
| Early May | confused | WPI 8.3% vs CPI 3.5% |
| Mid May | bearish IT / bullish PSU | AI layoffs, HAL/BEL FOMO |
| Late May | confused | FPI -₹34k vs DII +₹63k; Nifty ~24k |

**SachNetra brand:** zero Reddit mentions found.

### 3.8 What retail *wishes* they had at 9:00 IST (not committed product)

*From R04 — anecdote layer; Lijo posture remains “wedge not defined yet”.*

| Wish | Priority | Aligns with collectors? |
|---|---|---|
| FII/DII absorption ratio tile | **High** | V2-017 flows ✅ |
| Global queue (Gift Nifty, Brent, USD/INR) | High | partial macro |
| Broker outage health monitor | Medium | **not collected** |
| SME GMP index | Low | **not collected** |
| G1 ticker tags with **high precision** | **High** | V2-031/031b ✅ |

**News distrust drivers:** delayed outage reporting, post-hoc “profit booking” headlines, sponsored SME IPO hype → opportunity for **filings + flows + precise tagging**, not social tips.

---

## 4. Shock chronology since 2020

*Source: `scratch/app_vision_research/output/R07/`. Cross-links R03 (May 2026) and R06 (Telegram narratives).*

### 4.1 Episodes covered (EP01–EP09 + gap days)

| ID | Episode | Anchor | Nifty move (headline) |
|---|---|---|---|
| EP01 | COVID + lockdown | Mar 2020 | Bottom **7,635** (23-Mar); VIX >80 |
| EP02 | Russia–Ukraine | Feb 2022 | **-4.8%** day; Brent **$123** peak |
| EP03 | Fed hiking / EM risk-off | Sep 2022 | INR past **80**; FPI selling |
| EP04 | Adani–Hindenburg | Jan 2023 | Adani stocks -38–55%; PSU banks hit |
| EP05 | Israel–Hamas oil fear | Oct 2023 | Short oil spike; index consolidated |
| EP06 | Red Sea shipping | Dec 2023 | Freight spike; export logistics fear |
| EP07 | Election surprise | **4-Jun-2024** | **-5.93%** single day; PSU -16% |
| EP08 | US tariff rhetoric | Nov 2025 | Trade-war risk; USD strength |
| EP09 | **West Asia live** | Apr–May 2026 | Nifty ~24k range; FPI -₹34k MTD; DII +₹63k |

**Appendix:** Demonetization Nov 2016 — liquidity shock, **weak SIP cushion** then vs **₹31k cr/month** now.

### 4.2 Sector playbook (repeatable patterns)

| Shock type | Tends to win | Tends to lose |
|---|---|---|
| Crude spike | Metal, Energy, Coal | Auto, OMCs (margin squeeze) |
| Global risk-off | Pharma, FMCG | IT, Realty |
| Governance (Adani) | Defensives | Adani names, **PSU banks** (contagion fear) |
| War / supply chain | **Defence**, Energy | Auto, exporters |
| Political shock | FMCG, Pharma | PSU, Infra, Defence (day-of) |

**May 2026 (EP09)** matches R03: Metal/Energy/Defence up YTD; IT/Auto down.

### 4.3 Narrative vs price — what persisted

| Narrative at peak panic | Verdict |
|---|---|
| "COVID = multi-year earnings collapse" | Severity **fad**; digitization **persisted** |
| "Oil $150+ fiscal blowout" (2022) | Index impact **fad** (discounted Russian crude) |
| "Fed hikes drain EM forever" | Index **fad**; **FPI selling persisted** |
| "Adani = Lehman for Indian banks" | Systemic **fad**; governance vigilance **persisted** |
| "Coalition = capex stops" (Jun 2024) | **Fad** — budget capex continued (₹12.2L cr FY27) |
| "FII sell = Nifty crash" (May 2026) | Crash **fad** so far — **DII/SIP absorption persisted** |
| WPI pass-through / inflation | **Persisted risk** (WPI 8.3% Apr 2026) |

**Structural lesson for SachNetra:** Headlines overshoot; **domestic flows changed the transmission function** after ~2022. News product should show **flows + sector rotation**, not only index panic.

### 4.4 Product hooks (from R07_product_implications)

- **`event_type`:** `geopolitical_clash`, `oil_macro_shock`, `election_policy_shift`, `corp_governance_crisis`, etc.
- **`thread`:** e.g. `middle_east_crisis_2026`, `adani_hindenburg_crisis` (90-day clusters)
- **G1 priority tickers in shocks:** HAL, BEL, IOC/BPCL/HPCL, COALINDIA, TATASTEEL, SBIN, TCS/INFY
- **Macro tiles when regime active:** Brent (amber >$100), USDINR (warn >95), VIX, **DII/FPI absorption ratio** (May 2026 ≈ **1.84**)

*Soft audit: historical FPI daily rows in `R07_episode_prices.csv` use `niftyindices.com` as source tag — spot-check NSDL for any experiment use.*

---

## 5. Pro vs retail voices (R08)

*Source: `scratch/app_vision_research/output/R08/`. Retail baseline from R04/R06 — not re-scraped.*

### 5.1 Biggest disagreement (May 2026)

| Topic | Professionals | Retail |
|---|---|---|
| **F&O / edge** | Zero-sum for most; STT + rules make retail F&O **unviable** (SEBI, Varsity, fund managers) | Still angry but **shifting to cash swing**; expiry culture dying slowly |
| **News** | **Noise** — edge from filings, EOD flows, earnings | **Tradeable** but distrusts ET/MC; wants faster outage/flow truth |
| **Mid-caps** | **Defensive** — trim stretched small/mid premiums | **FOMO** — SME IPO, PSU/defence, metal rotation |
| **IT -24% YTD** | **Structural** AI/labor pressure | Split: panic vs "buy the dip" |
| **FII vs DII** | Absorption explains range-bound Nifty; focus domestic cyclicals | Anxiety if SIP stops; celebrates "SIP shield" |

**Agreement with R03:** Both cohorts cite FPI -₹34k / DII +₹63k; pros and R07 say index won't necessarily crash.

### 5.2 Evidence-based persona recommendation (not locked by Lijo)

| Tier | Persona | Why |
|---|---|---|
| **Primary** | Serious / fundamental investor | SIP structural; pros mock F&O; aligns with aggregator + filings + flows |
| **Secondary** | Active swing trader (ex-F&O) | Post-STT migration from options; needs tagged news + flows |
| **Deprioritize** | Intraday F&O speculator | Shrinking cohort; SEBI enforcement; misaligned with brand |

**Do not chase:** Bloomberg terminal users (pros already pay Cogencis/Bloomberg).

### 5.3 Feature split

| Pros need (retail ignores) | Retail wants (pros mock) |
|---|---|
| Zero-FP G1 tags + filing PDFs | GMP / SME IPO hype |
| Structured FPI/DII / REER data | Broker outage monitor |
| Event-tagged data for backtests (B2B API) | Community bullish/bearish widgets |

**SachNetra fit:** News + PostgreSQL signals + **precision G1** + V2-017 flows — **not** tips, terminal, or broker.

### 5.4 Competitive landscape (R09)

*Source: `scratch/app_vision_research/output/R09/`. Review: `R09_review_notes_2026-05-27.md`.*

**Market structure:** No incumbent ships a single **ad-free, narrative-light, filing-linked, flow-aware** India stack. Offerings split across three layers:

| Layer | Who wins today | SachNetra stance |
|---|---|---|
| **News / digest** | Moneycontrol, ET Markets, Livemint, Google News | **Overlap** — cleaner UX + G1 precision target (V2-031b) |
| **Retail analytics / F&O** | Kite, Groww, Trendlyne, TickerTape, Sensibull, Opstra, TradingView | **Partial overlap** on news; **do not** own charts/F&O core |
| **Terminals / B2B data** | Bloomberg, Cogencis, Heckyl, NSDL/NSE official | **Do not compete** on ticks/latency (`lijo_answers.md` §11); **may** compete on mid-tier event API |

### 5.4.1 Top news-layer overlaps (direct)

| Competitor | Price hint (May 2026) | Pain vs SachNetra opportunity |
|---|---|---|
| **Moneycontrol** | MC Pro ~₹399/yr | Ads, bloat, weak tags — flows exist but buried in narrative |
| **ET Markets** | ET Prime ~₹2,599/yr | Paywall + clutter; post-hoc index explanations |
| **Trendlyne** | GuruQ ~₹2,090/yr | Screener-first; news secondary; no public event API |
| **Google News** | Free | No India ticker map; not trading-focused |
| **Finshots** | Free (insurance leads) | One story/day — not a live aggregator |

**SachNetra honest gaps (May 2026):** no Play Store app, no broker integration, FII/DII UI partial (V2-017), Hindi UI not shipped (V2-007), charts/ticks **by design** absent.

### 5.4.2 Feature matrix — where nobody wins

| Feature | Incumbents | SachNetra today | Verdict |
|---|---|---|---|
| **Broker outage / latency monitor** | All `no` | `no` | **Whitespace** (R04/R06) — social-led; medium priority |
| **GMP / IPO grey** | Blogs only | `no` | **Do not build** (SEBI risk; R08) |
| **F&O chain / Greeks** | Brokers + Sensibull/Opstra | `no` | **Overserved** — deprioritize |
| **Real-time ticks** | TV, brokers, terminals | `no` | **Overserved** — non-goal |
| **FinBERT in DB** | Consumer portals `no`; Heckyl B2B | **yes** (pipeline) | B2B wedge — not a consumer-facing widget yet |
| **Backtest / event API** | Bloomberg/Heckyl paywall | **yes** (roadmap) | B2B thesis validated; pricing **undecided** |
| **G1 headline tags** | MC/ET `partial` (keyword noise) | **yes** (hardening) | **Primary quality wedge** — precision = target, not proven 100% |

### 5.4.3 9:00 IST wedge test (from R04)

| Retail wish | Ships today? | SachNetra |
|---|---|---|
| FII/DII absorption ratio | Trendlyne, TickerTape (EOD charts) | **Open** — raw ratio tile (~1.84 MTD May 2026) |
| Global queue (Gift, Brent, USDINR) | MC, ET (cluttered) | **Open** — single lightweight widget |
| Broker outage truth | **Nobody** reliable | **Open** — optional; not core brand |
| SME GMP index | Unregulated blogs | **Do not build** |

### 5.4.4 R08 persona vs competitors

| R08 call | R09 verdict |
|---|---|
| Primary = serious / fundamental investor | **Holds** — MC/ET lack clean Morningstar-style India desk |
| Secondary = ex-F&O swing trader | **Holds** — STT/expiry migration; needs filing + precision tags |
| Deprioritize F&O day trader | **Holds** — Sensibull/Opstra own derivatives |
| Non-compete terminals | **Holds** — ₹1.5L–₹25L/yr desk tools |
| B2B event API | **Holds** — enterprise cliff; mid-tier API **research option only** |

**New risk (R09):** **Broker bundle** — Zerodha (Pulse + Tijori), Groww in-app news reduces need for external app unless SachNetra is **deeper** (flows, filings, structured DB).

### 5.4.5 Do-not-build (reinforced)

1. Terminal ticks / pro charting (TradingView + brokers)  
2. F&O analytics as **core** product  
3. GMP, tips, community temperature (R06/R08)  

**Moat hypothesis (if V2 collectors keep running):** structured PostgreSQL event history (news + filings + flows + sentiment) → consumer clarity **or** B2B API — distribution is the hard part, not ingestion.

---

## 6. Open decisions (Lijo — use decision packet)

*Source: `output/R00/R00_lijo_decision_packet.md`. Research recommends; only Lijo locks roadmap.*

| Decision | Research recommendation (R00) | Lijo status (2026-05-28) |
|---|---|---|
| Primary persona | **Serious fundamental investor** | [x] confirmed |
| Secondary persona | **Active swing trader (ex-F&O)**; quant/B2B = API buyer not B2C core | [x] confirmed |
| Non-goals (broker, terminal, tips, F&O-core, Dailyhunt clone) | Accept list | [x] confirmed |
| Top 3 next-quarter builds | G1 hardening (V2-031b); filing links near news (V2-018 DB); FII/DII absorption tile (V2-017) | [x] confirmed |
| 9:00 IST wedge | **Yes:** flow ratio + global queue · **Maybe:** outage scraper · **No:** GMP | [x] confirmed |
| Monetization | B2B API **option** ₹5–10k/mo; consumer Pro **option**; or stay free B2C | [x] **B2B API** path = working hypothesis; revisit after paper-trade log ≥15 signals |
| Hindi | Explainers-only first; defer full V2-007 UI | [x] **Deferred entirely** — no Hindi explainers or UI next quarter |
| Community temperature | Defer | Aligned R06/R08 |
| G1 precision | Critical — target not 100% until measured | Engineering (V2-031b) |

---

## 7. Product north star (R00 capstone)

*Source: `scratch/app_vision_research/output/R00/R00_product_north_star_memo.md`. Review: `R00_review_notes_2026-05-27.md`.*

### 7.1 North star (12 months, plain English)

SachNetra is a **clean, ad-free** India markets news site that **groups duplicate headlines**, **tags the right companies**, and **links to real exchange filings and flow data** — for **serious investors and swing traders**. It is **not** a broker, **not** Bloomberg, and **not** a tips app. The **database** (`india_news_signals`, filings, flows) is the long-term asset; the website is how people trust it.

### 7.2 Personas (evidence-ranked)

| Tier | Who | Fit (1–5) |
|---|---|---|
| **Primary** | Serious fundamental investor | 5 |
| **Secondary** | Active swing trader (ex-F&O) | 4 |
| **Secondary (B2B)** | Quant / systematic data buyer | 4 |
| Deprioritize | SIP-only salariat, F&O speculator | 1–2 |
| Non-target | Bloomberg / Cogencis desk | 1 |

### 7.3 Top 5 builds (next 12 months)

| Rank | Feature | Shipped? |
|---|---|---|
| 1 | G1 ticker NER hardening (V2-031b) | Partial |
| 2 | Filing alerts / PDF links near news (V2-018 data) | DB yes · UI partial |
| 3 | FII/DII absorption ratio tile (V2-017) | Data partial |
| 4 | Story clustering (dedupe) | **Yes** |
| 5 | Hindi macro explainers (not full UI) | No |

### 7.4 Three-year arc

| Year | Stage | Focus |
|---|---|---|
| 2026 | Collector | RSS + filings + flows + precision G1 |
| 2027 | Validated signals | B2C trust + B2B API pilots (if Lijo chooses) |
| 2028 | B2B / dataset | License structured history (quant pivot) |

### 7.5 Do-not-build (2026)

Terminal ticks/charts · F&O chains/Greeks as core · GMP/tips/sentiment widgets · broker execution · full Hindi UI clone of Dailyhunt.

### 7.6 Top risks

NER false positives · broker bundling (Kite/Tijori) · SEBI advisory optics · ad-free distribution cost · retail latency myth (we sell clarity not ticks).

---

## 8. Founder monetization & paper-trade alpha (R10)

*Source: `scratch/app_vision_research/output/R10/`. Review: `R10_review_notes_2026-05-27.md`.*

**Lijo posture:** User #1 · **never live traded** · goal = **paper-trade SachNetra alpha signals** then real money · **₹50k/month** longer-term · sales calls OK · **no frozen 30-day DB export** (forward feed + 7-day sample only).

### 8.1 Two tracks (not either/or)

| Track | 30-day success | 90-day |
|---|---|---|
| **A — Paper alpha** | 3 signal rules written; Google Sheet journal; ≥15 logged signals with T+1/T+5 | ≥50 paper events; win-rate visible |
| **B — B2B pilot** | Disclaimer + sample CSV live; 15 prospects listed | First ₹15–30k/mo pilot (if outreach runs) |

**Cash fast:** B2B ranks higher for **₹50k**. **Learning fast:** paper track is mandatory — cannot sell “alpha” without a public paper log (`GAP-10-025`).

### 8.2 Top 5 gaps (execute first)

| Gap | Fix | Owner |
|---|---|---|
| GAP-10-012 | Define 3 signal playbooks (what = a trade) | Lijo |
| GAP-10-001 / 025 | Paper-trade Google Sheet + public benchmark log | Lijo |
| GAP-10-002 | Signals tab in SPA (proposed **V2-035**) | James |
| GAP-10-008 | SEBI non-advisory footer (proposed **V2-032**) | James |
| GAP-10-016 | 7-day sample CSV on site (proposed **V2-033**) | James |

### 8.3 Week 1–2 (from R10)

**Lijo:** Sheet journal · pick playbooks (e.g. material filing, sentiment spike, flow day) · optional Zerodha **paper** account · 15 B2B names if doing Track B.  
**James:** V2-032 disclaimer · V2-033 sample export · V2-034 DB visibility for Lijo (Sheets/Metabase).

### 8.4 B2B pitch (honest)

₹15–30k/mo · **forward feed** from contract date · **7-day point-in-time CSV** · data-only · no buy/sell calls.

### 8.5 Proposed V2 tasks (James to file)

V2-032 disclaimer · V2-033 sample CSV · V2-034 Lijo DB view · V2-035 Signals panel · V2-036 EOD email · V2-037 watchlist · V2-038 backups — *from R10_90_day_stack; not roadmap until filed.*

---

## 9. Research pack index

`scratch/app_vision_research/_index.md` — **R03–R00 + R10** complete; optional R01, R02, R05.

---

## Changelog

| Date | Change |
|---|---|
| 2026-05-27 | Stub created; Lijo answers recorded |
| 2026-05-27 | §2 filled from R03 pass-2; next research R06 |
| 2026-05-27 | §3 filled from R06; next R07 |
| 2026-05-27 | §4 filled from R07; next R04 |
| 2026-05-27 | §3.7–3.8 Reddit merged (R04); corroborates R06; next R08 |
| 2026-05-27 | §5 pro vs retail (R08); primary=serious investor rec; next R09 |
| 2026-05-27 | §5.4 competitors (R09); R08 persona holds; broker bundle risk; next R00 |
| 2026-05-27 | §7 north star (R00); decision packet for Lijo; core pack complete |
| 2026-05-27 | §8 R10 founder: paper alpha + B2B parallel; week 1–2 stack |
