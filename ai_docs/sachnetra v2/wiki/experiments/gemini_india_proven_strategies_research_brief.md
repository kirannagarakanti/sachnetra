---
tags: [research, sachnetra, gemini, india-markets, strategies, operator-doc, deep-research]
source: [[sachnetra_research_playbook]], [[research_state_summary]], [[positioning_v2]], [[app_vision_2026]]
audience: Lijo (operator) + the Gemini agent he pastes this to
created: 2026-05-28
output_target: ai_docs/sachnetra v2/wiki/syntheses/india_proven_strategies_landscape.md
---

# Deep Research Brief — Proven Strategies for Indian Markets

> **Operator:** paste **this entire doc** into a new Gemini conversation first. Then say:
> *"Execute the research plan in §4. Use web search, academic papers, SEBI/NSE publications,
> practitioner blogs, and fund disclosures. Deliver the output in the exact format of §6.
> Save your final answer as a single markdown document."*
>
> **Purpose:** Build a decision-grade landscape map of **what actually works in Indian equity
> markets** — academically, practitioner-validated, and regulator-aware — then **filter it
> through SachNetra's existing data and experiment results** so we know which strategies are
> worth paper-trading next. This is **research synthesis**, not code, not backtesting.

---

## 1. What you (Gemini) are helping us do

**SachNetra** is an India-focused market intelligence pipeline. We collect filings, flows,
news, and macro data into PostgreSQL and run a disciplined research program (`Exp 1–13`) to
test whether our signals predict anything **out of sample**.

We are **not** asking you to invent strategies. We are asking you to do **deep research** on
what the literature and practitioner record say **works in India specifically** — then tell us:

1. Which strategies have **repeatable evidence** (academic + live-market)?
2. Which are **India-specific** vs generic global factors that happen to work here?
3. Which can SachNetra **realistically run** with our current/planned data (see §3)?
4. Which are **dead ends** we should stop considering (including ones our own experiments
   already killed — see §2)?

**Positioning context:** We are "be your own first customer" — prove signals on own capital
via paper trade → live trade. We are a 2-person shop. Strategies requiring HFT infra, 50-person
quant desk, or ₹10cr+ capital are out of scope unless you flag them as aspirational only.

---

## 2. What SachNetra has ALREADY tested (do not re-litigate without new evidence)

Load this as ground truth. Your job is to **situate** external strategy research relative
to these results — not contradict them without citing stronger India-specific evidence.

### 2.1 Confirmed in our own data (Exp 1–10, May 2026)

| Finding | Verdict | Implication for strategy map |
|---|---|---|
| FII net flow → next-day Nifty **direction** | ❌ DEAD (Exp 1) | "Trade tomorrow based on today's FII" is not a viable directional strategy at daily horizon |
| FII flow → same-day return | 🟡 coincident only (r≈0.035, R²≈0.1%) | Flow is a **context overlay**, not a leading signal |
| FII \|flow\| → next-day vol (OLS) | 🟡 supported but… | Unconditional vol asymmetry exists |
| FII \|flow\| incremental over GARCH(1,1) | ❌ NULL confirmed (Exp 7 + Exp 9) | Vol-forecast strategies using FII magnitude are **killed** once persistence is modeled |
| FII **outflow days** → higher next-day vol vs inflow | 🟡 survives leverage control (Exp 8) | **Risk overlay / position sizing** candidate, not directional alpha |
| NSE filing → newswire latency (large-cap) | 🟡 ~13 min median lead (Exp 4) | **Event-latency** edge is real but leads the *wire*, not necessarily *price* |
| Latency → tradable price move (large-cap intraday) | ⬜ inconclusive + suspect (Exp 10) | **Latency-vs-value squeeze**: long lead on low-impact events, short lead on high-impact |
| Corporate filing event study (Nifty-50) | ⬜ same-day pop +0.48%; per-category untestable | Category alpha (auditor change, pledge) is **promising but data-starved** |
| News sentiment → next-day direction | ⬜ coincident at n=16 days (Exp 3) | Sentiment as daily predictor is **unproven**; scorer has positivity bias |

### 2.2 In-flight / pre-registered (not yet run — treat as hypotheses, not facts)

| Track | Status | Strategy class |
|---|---|---|
| Exp 11 | Brief written; gated on V2-031b tagging coverage re-measure | Mid/small-cap filing latency + price impact |
| Exp 12 | Pre-registered; script ready | **Pairs trading / cointegration** (Nifty-50 same-sector) |
| Exp 13 | Pre-registered; script ready | **Hurst regime filter** (momentum vs mean-reversion timing) |

### 2.3 Strategic findings you must incorporate

From [[latency_vs_value_tradeoff]]:

- On **large-caps**, high-impact events (Q4 results) have **short** wire leads (5–60 min).
- Low-impact events (small M&A, subsidiary changes) have **infinite** lead (no coverage) but
  **no price impact**.
- **Recommended escape:** mid/small-cap universe (Exp 11) OR NLP instant-read of filings (Option A).

From [[positioning_v2]] Gate 1 paper-trade criteria:

- Need **paper Sharpe ≥ 1.5 OOS** and **max drawdown < 15%** before live capital.
- Need at least **one regime change** observed during paper window.
- Transaction costs and STT matter — strategies with 5–10 bps edge are suspect.

---

## 3. SachNetra data assets (map strategies to what we can actually feed)

When scoring each strategy, tag which data we **have today**, **planned (V2 roadmap)**, or
**missing**.

### 3.1 Live in PostgreSQL (May 2026)

| Table / source | Content | History depth |
|---|---|---|
| `india_institutional_flows` | FII/DII daily net (₹ cr), cash segment | FII: Dec 2009–present (~3,965 rows); DII: sparse (collection gap) |
| `india_bourse_announcements` | NSE corp filings, classified category, `announced_at` | ~17k rows backfilled + rolling |
| `india_news_signals` | Headlines, sentiment, `nse_tickers`, `published_at` | Autonomous pipeline since May 2026 |
| `research_prices` | Daily OHLCV, Nifty 50 + ^NSEI | ~2009–present |
| `research_prices_intraday` | 5-min bars (Exp 10 subset) | Limited window, large-cap tagged names |

### 3.2 Planned / in-flight collectors (cite as "near-term")

| Task | Data | Strategy relevance |
|---|---|---|
| V2-017c | FII/DII **absorption ratio** (DII offsetting FPI selling) | Flow-regime / risk-on-off overlay |
| V2-024 | NSE options chain + OI, PCR | Vol / sentiment / positioning strategies |
| V2-030 | Bulk & block deals | Institutional footprint / momentum |
| V2-019 | RBI WSS (credit, deposits) | Macro regime / rate-sensitive sectors |
| V2-025 | Quarterly fundamentals | Factor models, quality/value |
| V2-031b | News ticker tagging hardening | Unblocks mid-cap event studies |

### 3.3 Known gaps (strategies blocked until fixed)

| Gap | Blocks |
|---|---|
| G1 — news ticker tagging was 1.7% (V2-031 shipped; re-measure pending) | Mid/small-cap news↔filing joins |
| G4 — `research_prices` Nifty-50 only | Single-stock event alpha beyond 50 names |
| G6 — sentiment positivity bias (~88% positive days) | Sentiment factor strategies |
| Survivorship — no delisted names in price DB | Auditor-resignation / blow-up alpha |

---

## 4. Deep research plan (execute in this order)

Use **whatever sources you need**: NSE/SEBI circulars, RBI bulletins, SSRN/NSE working papers,
CFA Institute India research, AMC whitepapers, quant blogs (QuantInsti, Marketcalls), fund
factsheets (Motilal Oswal, ICICI Pru factor funds), practitioner books (Indian editions),
Reddit r/IndiaInvestments / r/IndianStreetBets **only as anecdote tier**, not evidence tier.

**Evidence hierarchy (strict):**

1. **Tier A** — Peer-reviewed or NSE/SEBI-published study with India sample, OOS or live track record
2. **Tier B** — Reputable practitioner backtest with costs, or fund with 3+ year audited returns
3. **Tier C** — Indian market structure fact (STT change, expiry rules) that changes strategy economics
4. **Tier D** — Anecdote / social / influencer claim — cite but **do not** recommend

For each strategy class below, research **minimum 3 Tier A/B sources** where they exist.
If India-specific evidence is thin, say so explicitly and note whether global evidence
**plausibly transfers** and why/why not.

### Phase 1 — Market structure baseline (India is not US)

Research and document:

1. **Participant structure** — FPI/FII, DII (MF+insurance+PF), retail (demat growth, SIP),
   prop/HFT share. How does flow composition differ from developed markets?
2. **Trading mechanics** — T+1 settlement, STT (including Apr 2026 F&O STT hike), stamp duty,
   circuit limits, ASM/GSM surveillance, F&O lot sizes, weekly expiry consolidation.
3. **Liquidity segmentation** — Nifty 50 vs Midcap 150 vs smallcap; impact cost benchmarks;
   which strategies **require** top-decile liquidity?
4. **Regulatory constraints** — SEBI rules on algo trading, peak margin, position limits,
   insider trading on corporate announcements, PMS/AIF registration if managing outside money.
5. **Calendar effects** — Budget day, RBI MPC, expiry week, earnings season, monsoon/agri,
   US Fed spillover. Which are **statistically documented for India**?

**Deliverable subsection:** `## 1. India Market Structure Primer`

### Phase 2 — Strategy taxonomy (the core research)

For **each** strategy class, produce the row template from §6.2. Cover at minimum:

#### A. Passive / buy-and-hold (the baseline everything must beat)

- Nifty 50 / Nifty 500 / factor index SIP
- Gold + international diversification for INR investors
- Cost of active vs passive in India (expense ratios, STT drag)

#### B. Momentum / trend-following

- Cross-sectional momentum (12-1 month) on Nifty 500
- Time-series momentum on indices/sector indices
- **52-week high** / **52-week low** anomaly (India evidence)
- Sector rotation (business cycle, earnings momentum)
- **India-specific:** does momentum crash harder here? FII flow interaction?

#### C. Mean-reversion / pairs / stat-arb

- Pairs trading / cointegration (bank pairs, sector peers — HDFC/ICICI canonical)
- Short-term reversal (1-week, 1-month) on Nifty constituents
- RSI/Bollinger **on Indian indices** — does it work or die to costs?
- **Exp 12 relevance:** same-sector Nifty-50 cointegration

#### D. Event-driven / corporate actions

- Earnings announcement drift (PEAD) — India sample
- **Corporate filing categories:** auditor change/resignation, promoter pledge, board outcome,
  M&A, buyback, dividend surprise
- Bulk/block deal follow-through (V2-030)
- **SachNetra angle:** filing latency edge, NLP direction extraction from PDFs

#### E. Flow-based strategies

- FII/DII flow **contrarian** vs **trend** strategies (our Exp 1 killed simple daily direction)
- **Absorption ratio** (DII absorbing FPI selling) as regime indicator (V2-017c)
- FII derivative positioning vs cash (if literature exists)
- **Do NOT recommend** naive "FII sold → short Nifty tomorrow" without citing evidence
  that survives our Exp 1/7/9 null results

#### F. Volatility / options strategies

- India VIX trading, VIX mean-reversion
- PCR (put-call ratio) as contrarian indicator
- Short straddle / iron condor around expiry — **post-Apr 2026 STT regime**
- Realized vs implied vol arbitrage — retail feasibility?
- **Exp 6/8 angle:** FII outflow as vol-risk overlay (not GARCH-incremental per Exp 7/9)

#### G. Factor investing (Fama-French India)

- Value (P/B, P/E), quality, low-vol, size (small-cap premium), momentum factors
- NSE factor indices (NV20, Alpha Low-Vol, etc.) live performance
- Sector neutralization requirements

#### H. Macro / top-down

- RBI rate cycle → sector rotation (banks, NBFCs, realty)
- INR/USD → IT exporters vs domestic
- Crude oil → OMCs, paint, airlines
- CPI/WPI divergence (2026: WPI 8.3% vs CPI 3.5%) — documented trades?
- **Monsoon / rabi** — agri, FMCG, rural demand proxies

#### I. Alternative / alt-data (score feasibility for SachNetra)

- News sentiment / NLP (English + Hindi gap)
- Social sentiment (Reddit, Telegram, Twitter/X)
- Satellite, electricity (POSOCO), FASTag tolls — lead/lag evidence
- Insider/PIT disclosures

#### J. Intraday / scalping / HFT

- Document **honestly** if retail-viable after costs + STT + competition from prop/HFT
- Opening range breakout, VWAP reversion — India microstructure studies
- Flag as **likely out of scope** for SachNetra unless evidence is exceptional

#### K. Regime-switching / adaptive (links to Exp 13)

- Hurst / volatility regime filters
- Markov-switching, threshold AR
- **When** to run momentum vs mean-reversion in India

**Deliverable subsection:** `## 2. Strategy Landscape (one §2.x per class A–K)`

### Phase 3 — Cross-cutting filters (apply to every strategy)

For each strategy that survives Phase 2, score:

| Filter | Question |
|---|---|
| **Edge size** | Net of STT + brokerage + slippage, is expected edge > 20 bps/trade? |
| **Capacity** | Max AUM before alpha decays (critical for mid/small-cap) |
| **Horizon fit** | Intraday / daily / weekly / monthly — matches our data refresh cadence? |
| **Data fit** | Uses §3 tables? Score: GREEN / YELLOW / RED |
| **Regime dependence** | Works in 2022 bear, 2023 rally, 2024 chop, 2025–26 FPI-outflow+DII-absorption? |
| **Implementation** | Zerodha Kite API feasible? Manual OK for paper trade? |
| **SachNetra conflict** | Contradicts Exp 1–10 nulls? If yes, needs extraordinary evidence |

**Deliverable subsection:** `## 3. Scoring Matrix`

### Phase 4 — Shortlist for SachNetra (the actionable output)

Rank **top 5 strategies** for a solo operator with:

- ₹1–5L eventual live capital
- Paper-trade first, 3-month minimum
- Existing SachNetra data as primary signal source
- No HFT, no 40-person engineering team

For each of the 5:

1. **One-paragraph thesis** — falsifiable, with direction and horizon
2. **Evidence summary** — Tier A/B citations
3. **SachNetra data mapping** — exact tables/features
4. **Experiment design sketch** — what Exp N would test it (hypothesis + pass/fail thresholds)
5. **Known kill conditions** — what result would abandon it
6. **Paper-trade rule draft** — plain English entry/exit/sizing

Also produce **bottom 5** — popular Indian retail strategies that **don't survive** evidence
or costs (e.g., "FII flow daily direction" — we already killed this).

**Deliverable subsections:** `## 4. Top 5 Recommendations` + `## 5. Bottom 5 (Avoid)`

### Phase 5 — Gap analysis

What **data or tooling** would unlock the next tier of strategies?

Map to SachNetra V2 roadmap tasks (V2-019, 024, 025, 030) and research gaps (G1–G6).

**Deliverable subsection:** `## 6. Data & Tooling Gaps`

---

## 5. India-specific constraints (mandatory — generic "quant finance" answers fail)

Your research **must** address these; they change which global strategies transfer:

| Constraint | Why it matters |
|---|---|
| **STT on F&O increased Apr 2026** | Short-gamma / high-turnover options strategies may be dead |
| **Single weekly index expiry** | Expiry-week dynamics changed; cite post-reform evidence only |
| **DII absorption of FPI selling (2024–2026 regime)** | Market held up on domestic flows — strategies assuming "FII out = market down" fail |
| **SIP structural bid (~₹31k cr/month Apr 2026)** | Supports large-cap floor; affects mean-reversion on index |
| **T+1 settlement** | Intraday cash equity strategies have different margin/credit profile |
| **ASM/GSM/T2T surveillance** | Shorting / mean-reversion on small-caps has frictions |
| **Rupee depreciation (~3–5%/yr)** | International ETF allocation is part of "passive" strategy |
| **Low retail short-selling** | Pairs/long-short asymmetric — most retail runs long-only |
| **Corporate announcement via NSE/BSE XML** | Event-driven edge is **speed-to-filing**, not speed-to-8K like US |
| **Finfluencer / tip fraud prevalence** | Separate **evidence-backed** from **popular** |

---

## 6. Required output format

Produce **one markdown document**. No PDF. No slide deck. Structure exactly:

```markdown
# India Proven Strategies — Research Landscape (Gemini synthesis)

**Research date:** YYYY-MM-DD
**Analyst:** Gemini Deep Research
**Scope:** Indian equity markets; retail-to-small-fund feasibility
**Evidence tiers used:** A/B/C/D per brief §4

---

## Executive Summary
(≤300 words: the 5 most important findings + the single best strategy for SachNetra today)

## 1. India Market Structure Primer
(Phase 1 deliverable)

## 2. Strategy Landscape

### 2.A Passive / buy-and-hold
| Strategy | Evidence tier | India-specific? | Net edge (est.) | Horizons | Key sources |
|---|---|---|---|---|---|
| ... | A/B/C/D | Yes/No/Partial | X bps/yr | daily/monthly | [1][2] |

**Verdict:** WORKS / WEAK / DEAD / UNPROVEN for India
**SachNetra data fit:** GREEN / YELLOW / RED
**Notes:** (incl. conflict with SachNetra Exp results if any)

(repeat for 2.B … 2.K)

## 3. Scoring Matrix
(sortable table: all strategies × filters from Phase 3)

## 4. Top 5 Recommendations for SachNetra
(numbered; each with thesis, evidence, data map, experiment sketch, kill conditions, paper-trade rule)

## 5. Bottom 5 — Popular but Avoid
(with evidence why)

## 6. Data & Tooling Gaps
(mapped to V2 tasks + G1–G6)

## 7. Bibliography
(numbered; every Tier A/B claim must have a citation)
- [1] Author, Title, Year, URL or DOI
```

### 6.1 Quality bar (we reject the deliverable if these fail)

1. **≥15 Tier A or B sources** with working URLs or DOI
2. **Every Top 5 strategy** maps to at least one SachNetra table in §3 or a named V2 task
3. **Explicit callouts** where India evidence **contradicts** US/Europe (don't assume transfer)
4. **FII flow directional strategies** must address Exp 1 null — if you recommend anyway, cite
   evidence that uses a **different specification** (horizon, segment, conditioning)
5. **Transaction costs** included in edge estimates — not gross returns
6. **No finfluencer tips** presented as strategies
7. **Honest "UNPROVEN"** labels where evidence is thin — better than false confidence

---

## 7. SachNetra context Gemini will miss without this brief

Include these in your synthesis; they are **not** common in generic quant literature:

1. **Latency-vs-value squeeze (Exp 10):** Being first to a filing ≠ tradable move on large-caps.
   Mid-cap pivot (Exp 11) is the thesis escape hatch.
2. **FII direction dead, outflow-vol asymmetry alive-but-not-GARCH-incremental:** Flow strategies
   must be reframed as **risk overlay**, not **directional forecast**.
3. **Absorption ratio (V2-017c):** May 2026 MTD DII +₹63k cr vs FPI −₹34k cr → ratio 1.84.
   This is a **regime descriptor** for 2025–26 — strategies must be conditioned on it.
4. **Bifurcated market (May 2026):** Nifty 50 −8.6% YTD; midcaps flat. Sector rotation is live
   (Metal +19%, IT −24%). Momentum/mean-reversion answers differ by universe.
5. **Positioning:** Paper-trade Sharpe ≥ 1.5 OOS before live. We need **regime-change survival**.
6. **Parallel research tracks already scoped:** Exp 12 (pairs), Exp 13 (Hurst) — your Top 5
   should say whether to **prioritize, defer, or kill** these vs alternatives you find.
7. **Primary user:** Serious fundamental investor; secondary ex-F&O swing trader — strategies
   should lean **fundamental + event + swing**, not scalp.

---

## 8. After Gemini returns

**Lijo:**

1. Save output to:
   `ai_docs/sachnetra v2/wiki/syntheses/india_proven_strategies_landscape.md`
2. Read §4 Top 5 — pick **one** strategy for pre-registration as `Exp 14` (or reprioritize
   Exp 11/12/13 if Gemini's evidence supports).
3. Append any new hypotheses to the Hypothesis Register in
   `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_research_playbook.md` — **failures too**.
4. If Gemini surfaces a strategy needing data we don't collect, append to
   `ai_docs/sachnetra v2/wiki/experiments/_data_gaps_backlog.md` (don't file a James task yet).

**Do NOT:**

- Treat Gemini output as validated alpha — it is a **literature map**, not OOS proof
- Skip the SachNetra experiment loop (hypothesis → script → OOS → register)
- Paste `.env` credentials or DB connection strings into Gemini

---

## 9. Optional follow-up prompts (if first pass is thin)

If Gemini's first answer lacks depth, paste these sequentially:

**Prompt B — Academic depth:**
> "Expand §2 with India-specific academic papers from SSRN, NSE Working Paper series, and
> RBI DRG studies. Minimum 10 additional Tier A sources with sample period and conclusion."

**Prompt C — Practitioner depth:**
> "Expand §2.F (options/vol) and §2.D (event-driven) with post-2024 evidence only. Include
> Apr 2026 STT impact on retail option sellers."

**Prompt D — SachNetra mapping:**
> "Re-score §4 Top 5 using ONLY data in §3 of the brief. Drop any strategy that needs data
> we won't have in 6 months."

---

## 10. What this brief is NOT for

- **Not** for running backtests (Claude authors `scripts/research/`; Lijo runs against prod)
- **Not** for stock tips or "buy X today"
- **Not** for replacing Exp 11/12/13 pre-registrations — it **informs** prioritization
- **Not** for consumer product features — this serves the quant / paper-trade lane only

Brief ends. Begin deep research.
