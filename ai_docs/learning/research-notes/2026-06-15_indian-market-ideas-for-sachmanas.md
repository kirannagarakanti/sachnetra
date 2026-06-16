---
date: 2026-06-15
type: synthesis (cross-input strategic read)
problem: >
  Lijo surfaced two external inputs and asked how they feed "our application" (SachManas, the Mind):
  (1) a podcast with Apoorva Sharma (Raj/RAAS Capital) on how money is actually made in Indian nano/micro-caps;
  (2) the ForThePeople.in repo (district-level civic-data aggregation platform). Brief: go through memory,
  connect both to the SachManas design, and say concretely what changes and what doesn't.
status: synthesis — feeds SachManas design (Phase 4+ features + factor-node sourcing); not a build task.
lane: Lijo (vision) + James (build) + Claude (synthesis)
inputs:
  - learning/videos/2026-06-15_apoorva-sharma-nano-cap-microcap-investing.md  (+ full transcript)
  - https://github.com/jayanthmb14/forthepeople  (ForThePeople.in — README-only; NOT yet code-reviewed)
governing_memory:
  - project_v2_positioning (own-capital; KILL consumer/B2B/SaaS)
  - latency_value_tradeoff + project_pead_midcap_finding (small-cap pivot is the escape)
  - project_strategy_reset (stop the treadmill; feed ONE proven strategy better data)
  - project_separate_dashboard (Lijo-facing display = SQL/dashboard contract, not Preact panels)
  - feedback_v2_prod_execution (Lijo runs anything against a DB; Claude writes code + read-only checks)
  - feedback_fresh_eyes_protocol (high-design-risk pieces get a context-free external review first)
tags: [synthesis, sachmanas, factor-nodes, political-nexus, promoter-signals, alt-data, india-public-data, consumer-trap]
---

# Indian-market ideas → SachManas (Apoorva Sharma + ForThePeople.in)

> One line: **both inputs point at the same place SachManas already aims — the public shadow of small-cap,
> political, and promoter information — and both come with a hard discipline line: build the data engine, not
> the consumer product, and don't pretend a model replaces human conviction.**

---

## 0. The frame (what these inputs are, and aren't)

SachManas (the Mind) reads everything India's news says every ~10 min, routes it, and maintains a living,
queryable **status per company / sector / market-force**, with **factor nodes** that fan out to companies
through **exposure/patron edges** (spec: [`2026-06-12_news-brain-what-it-does-spec.md`](./2026-06-12_news-brain-what-it-does-spec.md);
current build = the Phase-2 reading spine, [`../../tasks/SachManas-P2_reading-spine.md`](../../tasks/SachManas-P2_reading-spine.md)).

Neither input is a strategy to backtest. **Apoorva** is the best buy-side description we have of *why* that
design targets real money. **ForThePeople.in** is an architecture mirror + a **directory of Indian public-data
sources** for the factor layer. Both are **Park** (design inputs), not Pursue (roadmap changes) — see §4.

---

## 1. Input A — Apoorva Sharma → validates three pieces SachManas already designed

Full distillation: [`../videos/2026-06-15_apoorva-sharma-nano-cap-microcap-investing.md`](../videos/2026-06-15_apoorva-sharma-nano-cap-microcap-investing.md).
The mapping (practitioner words → spec component):

| Apoorva (transcript) | SachManas component | Use |
|---|---|---|
| Ch.15 "who funds the winning party → who garlands Amit Shah / greets Modi → which **listed company** he owns" | **Category 3** politics → person/political factor nodes → propagate to connected firms (= worked-example B; Fisman 2001 ≈ 25% of firm value) | The nexus is largely **public** (stages, airport receptions, who-stands-with-the-CM are photographed/reported) → the **Linker** can extract `patron-link` *candidate* edges from news. Highest-novelty, highest-risk edge. |
| Ch.16 "**promoter buying his own shares = confidence**" (he weights ~15%); buys before good news / sells before bad | **Category 2** insider & smart money (promoter buys/sells, pledges) + **V2-015** collector (SEBI PIT 7(2)/SAST/NSDL) + [[project_exp21_latency]] | Bake a **promoter-buyback event type** with buy=+/sell=− asymmetry into the Phase-4 record schema (extends the locked `ownership` event slot). |
| Ch.15 "125-cr income-tax notice withdrawn → stock 90→260 in 2 weeks"; "the powerful never show themselves" | **Category 5** regulators/courts → regulatory factor + company record; **no-news-move / leak flag** (spec §6.6) | Regulatory-resolution events as a record type; the leak flag is literally his "price moved, nobody explains it." |
| Ch.16 land+building+cash > market cap (**replacement-value gap**); promoter **10–15 yrs / cycles survived** | Company-record **features** (computable from balance sheet + listing date) | Cheap screens to add at Phase 4; not factor nodes. |
| "I don't want MF/PMS/AIF/FII in my picks — their entry = idea half-discounted" | FII/DII data (V2-017) used as a **crowding/exit (de-rating) flag**, not entry alpha | Consistent with FII flow failing to predict next-day direction (Exp 1/7/9). |

**The honest ceiling (Ch.13–14):** his returns also come from *creating* the catalyst (on-ground research,
raising growth capital, "how the theme gets created, that is our job") and from **conviction "no AI platform
will ever build"** (his words, while saying "Claude makes the model, ChatGPT does the research"). So SachManas
catches the **public shadow** of these signals faster/more completely than a human — it does **not** become
Apoorva. This is also why the spec's **firewall** (the 12-category tag is organisation, *never* a rule weight)
matters: it's the formal version of his "stop running behind the narrative."

**Net:** Apoorva changes **no** experiment and **no** build order — SachManas's spec already contains
categories 2/3/5, the factor-node model, the patron-link edge, and the leak flag. It *sharpens three Phase-4
features* and gives them a credibility anchor. **Park** (validation), re-open at Phase-4 record/entity design,
and route the patron-link edge through the **Fresh-Eyes/Kimi gate** before building (it's the real design risk).

---

## 2. Input B — ForThePeople.in → a source directory + an architecture mirror (and a trap)

[github.com/jayanthmb14/forthepeople](https://github.com/jayanthmb14/forthepeople) — aggregates 50+ Indian
government portals into clean **district-level dashboards** (29 modules, ~10 districts live, goal 780+).
**Inspected directly** (2026-06-15 shallow clone in `scratch/forthepeople`): the two source catalogues, the
`src/scraper/jobs/*` list, and its `CLAUDE.md`. (Not a full feature-by-feature Gemini review — but the parts
that matter to us, the data sources and the scraper shape, are read first-hand below.)

**2a. It mirrors our stack** (independent validation the collection-engine architecture is sound):
Next.js + **PostgreSQL (Neon) + Prisma** + **Upstash Redis** + **OpenRouter** (multi-provider AI fallback for
news classification) + **Railway 24/7 scrapers** + **Google News RSS + Cheerio** + Sentry/Plausible. One
transferable idea: its **OpenRouter multi-provider fallback** for classification vs SachManas's Groq-only
router — SachManas already owns the fallback-chain pattern (`_sentiment-chain.mjs`); worth mirroring for the
C2 router's cost-breaker so a Groq outage degrades gracefully instead of stalling the cron.

**2b. It is a verified directory of where Indian public data lives — this is the real value for us, and it's
better than expected.** The repo ships two pre-verified Government-of-India source catalogues (checked against
live portals April 2026):
- `docs/DATA-SOURCES.md` — demographics/Census/boundaries (low quant value).
- **`research/india-modules-coming-soon-sources-2026-04-25.md`** — the gold: 4 modules (National Economy,
  Parliament & Budget, Agriculture, Health) with **per-source URL, API availability %, refresh cadence, legal
  status (NDSAP), and scraping pitfalls.** Several rows are direct factor-node feeds or already-filed SachNetra
  tasks. **Preserved verbatim (MIT, attributed) at**
  [`../git-repos/forthepeople-india-gov-data-sources.md`](../git-repos/forthepeople-india-gov-data-sources.md).

High-value verified sources (mapped to our roadmap):

| Source (verified) | API? | SachNetra/SachManas use | Status with us |
|---|---|---|---|
| **MoSPI eSankhyiki** (esankhyiki.mospi.gov.in) — GDP/CPI/IIP/PLFS/ASI | **JSON API** | macro factor nodes (cat-6) | gap → **strong candidate; compare to V2-020 (BIS SDMX) — first-party may beat it** |
| **AGMARKNET daily mandi prices** via data.gov.in (resource `9ef84268-d588-465a-a308-a864a43d0070`) | **REST JSON + key** | commodity/agri node (cat-7) + rural-demand exposure | gap → cleanest public API in the whole set; candidate |
| **RBI WSS** (forex reserves, weekly) | PDF + DBIE CSV | macro/liquidity node | **= V2-019 (already task-filed)** — confirms source + exact URL |
| **RBI rates** (repo/CRR/SLR via DBIE) | partial CSV | macro node (cat-6) | gap → candidate |
| **SEBI Monthly Bulletin** — FII/FPI flows, NSE/BSE turnover, IPO data (~1-mo lag) | Excel/PDF | cross-check for V2-017 (FII/DII) + flow factor | overlaps V2-017; lagged, so reference-only |
| **IMD rainfall** (mausam.imd.gov.in subdivision/district) | HTML | **monsoon node (cat-8) — spec worked-example A** | gap → candidate. ⚠ **IMD locked the real-time AWS/ARG portal May 2025**; only subdivision summaries are public |
| **ECI results** (constituency URL templates) + **candidate affidavits** (assets/liabilities/criminal cases) | partial | political nodes (cat-3) + the §1 patron-link work | gap → candidate (affidavits are candidate-level, not the businessmen-behind-them) |
| Budget / Demands-for-Grants (indiabudget.gov.in); CAG audit reports | PDF | policy node (cat-4); regulatory node (cat-5) | gap → candidate |
| Electricity / power | — | energy node (cat-7) | **already** V2-026 (POSOCO) |

Health/Schools/Transport/Housing modules are **civic-consumer**, not quant — skip. **Key constraint to copy:**
ForThePeople is **gov-only** (`.gov.in/.nic.in/RBI`) and therefore *excludes* exchange data (it notes scraping
NSE/BSE directly violates exchange licensing, and falls back to the lagged SEBI Bulletin). **SachNetra is not
gov-only** — it already owns the market/company side (NSE announcements, bulk/block deals, FII/DII,
research_prices). So the clean division of labour: **mine these gov sources for the FACTOR layer (macro,
commodity, weather, policy, politics) where SachManas has gaps; keep our existing exchange/company collectors.**
Their **NDSAP + Copyright §52(1)(q)** legal write-up is a ready-made sourcing-legitimacy precedent.

**2c. The trap (the most important line in this note).** ForThePeople is a **consumer civic-transparency
product** — citizen dashboards, "vote for features," Razorpay supporter contributions. That is **exactly the
consumer remnant SachNetra killed** ([[project_v2_positioning]]: be your own first customer, *not*
B2B/consumer/SaaS). The discipline: **mine its data-source map for the factor/alt-data layer; do not build
citizen-facing district dashboards.** And per [[project_separate_dashboard]], any Lijo-facing display is a
SQL-metrics + dashboard-contract job, not a Preact product. Copying the *product* would re-open a killed lane;
copying the *sourcing* feeds the Mind.

---

## 3. What memory says governs all of this

- **Positioning** ([[project_v2_positioning]]): own-capital proof; kill consumer/B2B. → ForThePeople = sources,
  not a product to clone.
- **The escape route** ([[latency_value_tradeoff]] + [[project_pead_midcap_finding]]): small/mid-cap is where a
  slow public-data participant can still win. → Apoorva is the buy-side statement of exactly this.
- **Strategy reset** ([[project_strategy_reset]]): stop the experiment treadmill; feed ONE proven strategy
  better data. → Neither input is a new experiment; both are *better data/design* for the existing aim.
- **Prod-execution boundary** ([[feedback_v2_prod_execution]]): Claude writes code + read-only checks; Lijo
  runs anything against a DB. → Any new factor feed is a James-built collector on SachManas's **own** DB.
- **Fresh-eyes** ([[feedback_fresh_eyes_protocol]]): high-design-risk pieces get a context-free review first.
  → The patron-link edge (§1) is the textbook trigger.

---

## 4. What changes / what doesn't (the actionable bottom line)

**Doesn't change:** the experiment list, the SachManas build order, the Phase-2 spine (C1/C2/C9). Both inputs
are **Park**. SachManas already had the right categories and the factor-node model.

**Sharpens (queue for the right phase, don't act now):**
1. **Phase-4 record features** — promoter-buyback event (buy=+/sell=−), replacement-value-gap screen,
   promoter-tenure/cycles-survived. (Apoorva-anchored.)
2. **Factor-node starter set (open Q #1)** — add monsoon, crop/mandi, reservoir, district-capex, election as
   named nodes; **ForThePeople is the sourcing map** for several of them. Each new feed = one James-built cron
   on SachManas's own DB (check-db-space first; disk-incident memory).
3. **C2 router resilience** — mirror ForThePeople's multi-provider classifier fallback on the Groq router's
   cost-breaker.
4. **Patron-link edge (Phase-4, gated)** — the one genuinely novel/risky piece; **Fresh-Eyes gate before any
   build.**

**Explicitly do NOT:** build citizen district dashboards, add Razorpay/supporter monetization, or treat
Apoorva's return claims as evidence (he sells research products; survivorship-selected anecdote).

---

## 5. Follow-ups
- **Verified sources captured two ways**: §2b table = the distilled SachNetra-relevant subset; the **full GoI
  catalogue is now vendored in-repo** at [`../git-repos/forthepeople-india-gov-data-sources.md`](../git-repos/forthepeople-india-gov-data-sources.md)
  (verbatim, MIT-attributed) — safe from scratch cleanup.
- **Graduate the §2b feeds into the factor-node starter set** ([`2026-06-12_factor-node-starter-set.md`](./2026-06-12_factor-node-starter-set.md))
  when SachManas reaches Phase 3/4 (factor nodes): monsoon (IMD), commodity (AGMARKNET API), macro (eSankhyiki
  API), policy (budget/schemes), politics (ECI). Each = one James-built cron on SachManas's **own** DB.
- **Two existing-task reconciliations**: (a) **V2-019 RBI WSS** — confirmed source + exact URL; (b) **V2-020
  BIS macro (SDMX)** — evaluate MoSPI **eSankhyiki** (first-party JSON API) as a better/complementary feed before building.
- `jayanthmb14/forthepeople` is queued in [`../git-repos/_index.md`](../git-repos/_index.md) if a fuller
  code-review of its scraper engineering is wanted later (focus: scrapers, not consumer UI).
- Carry items §4.1–4.4 into SachManas Phase-4 design when the P2 gate passes.
