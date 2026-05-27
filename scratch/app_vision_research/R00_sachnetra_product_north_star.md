# R00 — SachNetra Product North Star (Antigravity Brief)

*Maps external market reality → what the application **could** become. **Run last** — after R03, R04, R06, R07, R08, R09. Lijo has not defined a 9:00 IST wedge yet; today SachNetra = news aggregator + data collection.*

**Output folder:** `scratch/app_vision_research/output/R00/`  
**Agent handoff:** [`R00_antigravity_agent_instructions.md`](./R00_antigravity_agent_instructions.md) — copy-paste to Antigravity.

**Prerequisite:** R03–R09 complete; read `app_vision_2026.md` §2–§5.4 first.

---

## Tooling note

WebSearch, browser, GitHub, Reddit, LinkedIn, company blogs, Indian fintech press (Inc42, Entrackr, Mint Markets). Cite everything. Tag fact vs opinion.

---

## Part A — Who is the user?

Research personas that *actually exist* in India (not generic "trader"):

| Persona | Research questions |
|---|---|
| **Salariat retail** | SIP-only, no F&O; uses Groww/Zerodha for MF; reads Mint/ET for macro |
| **Active retail / day trader** | Options on Nifty/BankNifty; screen time; Telegram/YouTube influence |
| **HNWI / family office** | Private bankers, PMS, AIF; what data do they pay for? |
| **Sell-side / buyside analyst** | Terminal (Bloomberg/Refinitiv/local); what gaps on India mid-caps? |
| **Quant / systematic** | Prop, broker desk, alt-data vendor; latency, survivorship, corporate actions |
| **Founder-operator (Lijo)** | News clarity + quant proof — which persona is *primary* for v1 product? |

For each: **job to be done**, **current tools**, **willingness to pay**, **trust bar** (regulated vs influencer).

---

## Part B — Product archetypes (competitive mapping)

Survey what users already combine:

- **News aggregator** (Google News, Inshorts, Dailyhunt, SachNetra)
- **Market terminal lite** (TradingView, Sensibull, Opstra, TickerTape)
- **Broker app** (Kite, Groww, Angel One) — news tab, alerts
- **Alt-data / sentiment** (Koyfin, RavenPack analogs, Indian startups)
- **Research PDF / WhatsApp** (broker calls, informal groups)

Answer: *Where does SachNetra win without becoming a broker?*  
Reference internal thesis: consumer face + invisible data collection (`sachnetra_quant_pivot.md`).

---

## Part C — Feature tension matrix

Build a table of **pairs that trade off**:

| Tension | Example poles | Research: what do users tolerate? |
|---|---|---|
| Speed vs depth | headline vs 500-word explainer | |
| Free vs paid | ad-supported vs subscription | |
| Hindi vs English | regional trust vs quant audience | |
| Retail simplicity vs pro density | one chart vs 12 panels | |
| Open source vs moat | AGPL fork vs proprietary signals | |

---

## Part D — "See India clearly" — measurable promises

What would make a user say SachNetra is *better* (find evidence in reviews, Reddit, Twitter/X):

- Faster understanding of *why* Nifty moved today
- Less duplicate syndicated headlines (clustering — already shipped)
- Ticker/entity awareness on news (G1 — shipping/hardening)
- Filing → news lead time visibility (Exp 4/11 lane)
- Macro context (FII, RBI, oil, USDINR) in one pane

For each promise: find **3 external examples** of products that tried it and how users rated them.

---

## Part E — Synthesis deliverable

Write `R00_product_north_star_memo.md` with:

1. **Recommended primary persona** (one sentence) + secondary
2. **Non-goals** (what SachNetra should refuse to become in 2026)
3. **3-year arc**: collector → validated signals → B2B (align or challenge `sachnetra_quant_pivot.md`)
4. **Top 5 features** ranked by evidence, not aspiration
5. **Top 5 risks** (regulatory, precision, latency myth, competition)
6. **Open questions** for Lijo (bullet list)

---

## Status checklist

- [x] `R00_persona_matrix.csv`
- [x] `R00_archetype_map.md`
- [x] `R00_tension_matrix.csv`
- [x] `R00_measurable_promises.md`
- [x] `R00_product_north_star_memo.md`
- [x] `R00_lijo_decision_packet.md`
- [x] `research_log.md` + `_index.md` updated

