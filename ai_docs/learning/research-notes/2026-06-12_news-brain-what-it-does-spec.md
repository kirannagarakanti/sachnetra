---
date: 2026-06-12
problem: >
  Design session (Lijo, explicit: "in this session we are not gonna build yet — we are gonna [define] what we
  want our application to do"). Inputs from Lijo: every-10-minute data on everything; split news into ~10+
  named, tagged categories (market-moving, politics, government schemes, …); each category goes to its
  respective specialist agent; when news hits, the agent writes to the tagged company's record and updates its
  status. His open confusion (the right question): "I don't know how it will work because we have components
  like politics, weather, seasons — everything affects a sector." This doc answers it: the FACTOR-NODE model —
  news about the world updates factor nodes ONCE; companies inherit through exposure edges; you never write
  weather into 4,000 company rows. Defines the taxonomy, agent roster, data model, status record, update flow
  with worked examples, why it's possible, and open questions. No code.
status: application spec (what-it-does, not how-to-build) — the requirements document for the separate
  multi-agent insight application. Successor conversation to the architecture-and-reality-check note.
lane: Lijo (owns the vision) + James (will own the build) + Claude (spec + later the research harness)
tags: [spec, design, news-brain, world-model, taxonomy, factor-nodes, exposure-edges, multi-agent, router,
  company-status, insight-streams, no-code-session]
sources_consulted: [
  "This conversation (2026-06-11→12): miracle-hunt → News Brain design → economic-links deepening →
   architecture-and-reality-check (§2.6 political nexus, §2.7 multi-market)",
  "Carried evidence: Cohen-Frazzini 2008 (economic links, read in full); Fisman 2001 (political connections
   ~25% of firm value); Madsen 2017 (low-attention links); Tetlock 2011 (novel vs stale); Menzly-Ozbas
   (cross-industry momentum); FinMem/TradingAgents (agent memory/roles); MiroFish (graph+agents shape, no
   backtesting = cautionary)"
]
---

# What the application does (the spec) — working name: **SachManas** (the Mind)

> SachNetra (सच्चनेत्र) is the **eye** — it sees and records. This application is the **mind** — it understands
> what the eye sees. (Working name only; Lijo names it.) This document defines WHAT it does. Build order,
> stack, and tasks come later, in the blueprint. Hard rule carried from the whole conversation: **the mind
> never trades.** It produces insight; separately pre-registered, backtested rules consume insight.

---

## 0. Mission, one sentence

**Every ~10 minutes, read everything India's news says, understand who and what it really affects — directly,
through supply chains, through political connections, through weather, policy, and commodities — and keep a
living, queryable "status" for every company, sector, and market force, with reasons attached.**

---

## 1. The core design decision (this answers Lijo's "how will it work" confusion)

Lijo's question: *"politics, weather, seasons… everything affects a sector — how does the agent write that
into company databases?"* The answer: **it doesn't. There are two kinds of targets, and only one of them is a
company.**

### Two kinds of news targets
1. **Company-level news** ("Tata Steel wins ₹2,000cr order", "promoter of X arrested") → written **directly to
   that company's record** as an event.
2. **World-level news** (monsoon deficit, election result, new PLI scheme, crude oil spike, war) → written
   **ONCE to a FACTOR NODE** — a thing in the world that many companies care about. Companies are connected to
   factor nodes by **exposure edges** ("this company is 30% sensitive to monsoon", "this company benefits from
   the defense scheme"). The company's status **inherits** the factor's state through the edge.

**You never write the weather into 4,000 company rows.** You update the `monsoon` node once; the graph already
knows who's plugged into it. A company's live status is *computed*: its own direct events + everything flowing
in through its edges (factors, suppliers/customers, political patrons, competitors).

> ELI-teen: a company's status is like your phone's battery-time estimate — nobody types it in; it's computed
> live from many sensors. The agents maintain the sensors (factor nodes + edges). The status assembles itself.

This is the professional pattern (factor models + knowledge graphs), it's why the system scales (one update
fans out to thousands of names for free), and it's why "everything affects everything" stops being scary:
**everything affects a small number of FACTORS; factors affect companies through explicit, confidence-scored
edges.**

---

## 2. The news taxonomy (Lijo asked: "please name them")

Twelve categories. Every article gets exactly one primary category (+ optional secondaries) from the tagger/
router, then goes to its specialist agent. Target write: factor node, company record, or both.

| # | Category | What's in it | Writes to | Agent |
|---|----------|--------------|-----------|-------|
| 1 | **Company events** | results/earnings, orders & contracts, M&A, capacity expansion, product launches, management changes, guidance | company records | Equities agent |
| 2 | **Insider & smart money** | promoter buys/sells, pledges, bulk/block deals, FII/DII flows, stake changes | company records (+ flow factor) | Smart-money agent |
| 3 | **Politics & power** | elections, politician health/arrest/raids, coalitions, party shifts, state politics | person nodes + political factor nodes → propagate to connected companies | Politics agent |
| 4 | **Government schemes & policy** | budgets, PLI schemes, subsidies, tariffs & duties, bans, GST changes, infra programs | policy factor nodes (one per scheme/policy) | Policy agent |
| 5 | **Regulators & courts** | SEBI/RBI/CCI/NCLT actions, court rulings, license grants/revocations, penalties | company records + regulatory factor nodes | Regulatory agent |
| 6 | **Macro & rates** | RBI MPC, inflation, GDP/IIP, trade data, INR, liquidity | macro factor nodes | Macro agent |
| 7 | **Commodities & energy** | crude, metals, coal, gold, power prices, OPEC, mining | commodity factor nodes (one per commodity) | Commodities agent |
| 8 | **Weather & seasons** | monsoon progress/deficit, heatwaves, floods, El Niño, harvest, festival seasons | weather/season factor nodes | Weather agent |
| 9 | **Global & geopolitics** | Fed, China, wars, sanctions, global crashes, supply-chain disruptions | global factor nodes | Global agent |
| 10 | **Sector & industry** | industry-wide news: monthly auto sales, telecom tariff wars, IT spending cycles, real-estate trends | sector factor nodes | Sector agent |
| 11 | **Incidents & disasters** | plant fires/accidents, shutdowns, cyberattacks, frauds/scams uncovered, strikes, recalls | company records (+ region factor if wide) | Incident agent |
| 12 | **Noise & promotion** | opinion pieces, tips/recommendations, suspected pump content, unverifiable single-source claims | quarantine (stored, flagged, never propagated) | Hygiene filter |

Notes: (a) categories 3–10 are mostly **factor-node writers** — that's the §1 insight in action; 1, 2, 11 are
mostly **company writers**; (b) category 12 exists so junk *provably* can't touch the graph; (c) the existing
SachNetra tag layer (G1) is the front door for all of it — its recall is still the gating investment.

## 3. The agent roster (the newsroom — settled in §2.7 of the architecture note)

**Specialist agents, ONE shared world.** Each specialist reads only its category stream, but reads/writes the
same single graph and the same per-entity memory (silos would sever the oil→airline, politician→company
edges — the whole point). Plus three cross-cutting roles:

- **Router** — classifies each article into the taxonomy (cheap/fast model; the funnel that makes frontier
  reasoning affordable).
- **Linker** — maintains the edges: extracts new relationships from text (supplies, competes, patron-of,
  exposure-to-factor), confidence-scores them, requires multi-source evidence, prunes edges whose predicted
  ripples never realize (the reflection loop).
- **Auditor** — the skeptic: rumor/pump checks (cat-12), source-corroboration counts, contradiction checks
  against memory, and the **no-news-move flag** (price moved, no news explains it → possible leak; both
  halves already in the DB).

## 4. The company status record (what "update the status" concretely is)

Per company, maintained live, fully timestamped (point-in-time queryable — what did we believe on date X):

```jsonc
{
  "symbol": "ESCORTS",
  "direct_events":      [ { "ts": "...", "type": "order_win", "direction": "+", "magnitude": "med",
                            "novelty": 0.8, "confidence": 0.9, "rationale": "...", "source_count": 4 } ],
  "factor_exposures":   [ { "factor": "monsoon", "weight": -0.6, "confidence": 0.8, "evidence": "rural tractor demand" },
                          { "factor": "steel_price", "weight": -0.3, "confidence": 0.7, "evidence": "input cost" } ],
  "link_edges":         [ { "to": "SUPPLIERX", "type": "customer-of", "conf": 0.7 },
                          { "to": "PERSON: <politician>", "type": "patron-link", "conf": 0.5 } ],
  "inherited_pressure": { "computed": "Σ factor_state × weight + ripple inflows", "value": -0.4, "as_of": "..." },
  "narrative":          { "thread_id": "...", "acceleration": "rising", "stale_vs_novel": "novel" },
  "net_status":         { "stance": "-0.3", "confidence": 0.6, "horizon": "weeks",
                          "rationale": "monsoon deficit (60% rural exposure) + steel input costs; offset by order win" },
  "last_updated": "..."
}
```

The **rationale strings are mandatory everywhere** — they're what make the system auditable, debuggable, and
defensible against look-ahead cheating.

## 5. The update flow, end to end (three worked examples)

**A. World-level news (the case that confused us — now clean):**
"IMD: monsoon 18% deficient in central India" → Router → cat-8 → **Weather agent** → updates ONE node:
`factor: monsoon_2026 {state: deficit, severity: 0.7, region: central}` → propagation marks every company
with a monsoon edge as dirty → statuses recompute (tractors −, agrochem mixed, rural-FMCG −, hydro −) →
insight stream emits: *"rural-demand cluster under pressure (12 names, top exposures listed, reasons attached)."*
**One write. Thousands of names updated. No agent ever touched a company row.**

**B. Politics → connected companies (Lijo's corruption chain):**
"ED raids Minister X" → Router → cat-3 → **Politics agent** → checks memory: who is X, what position, which
firms carry `patron-link` edges to X (Fisman: connections ≈ up to 25% of connected-firm value) → updates the
person node → propagates to connected firms A (famous) and B (small, unwatched) → Auditor notes B has had no
press at all → insight: *"first-public-signal risk on B"* — the slow-diffusion case the whole edge thesis
rests on.

**C. Company news → supply-chain ripple (Cohen-Frazzini):**
"Maruti cuts production guidance" → cat-1 → **Equities agent** → direct event on MARUTI → Linker's edges fan
out to component suppliers → low-attention liquid suppliers get ripple-negative flags with hop-count and
confidence → insight: *"3 suppliers with >20% revenue dependence, none yet covered by press."*

## 6. What comes out (the insight streams)

1. **Live company status** (per-name stance + reasons) — queryable, the dashboard view.
2. **Ripple alerts** — un-mentioned names affected through edges (the tradable-candidate stream).
3. **Factor dashboard** — current state of every world-force (monsoon, crude, election cycle, schemes…).
4. **Novel-vs-stale flags** (Tetlock: novel→drift, stale→reversal) on every event.
5. **First-public-signal alerts** — low-coverage names whose situation just changed.
6. **No-news-move flags** — leak detector (price moved, nothing explains it).
7. **The graph itself** — the India power-and-supply map: the moat/dataset-of-record, valuable regardless.

Consumers, strictly in this order: (i) Lijo's eyes (dashboard), (ii) the research harness — each stream gets
tested like Exp1–19 before anyone believes it, (iii) only-then, pre-registered Layer-2 trading rules.

## 7. Is it possible? (yes — every component has an existence proof)

| Component | Exists today as | Novelty for us |
|---|---|---|
| Category router | standard text classification (cheap model) | none — engineering |
| Specialist LLM agents + shared memory | FinMem / TradingAgents (published, benchmarked) | adaptation |
| LLM relation-extraction → knowledge graph | done at 130k-firm scale in China (arXiv 2605.27845) | doing it for India = the moat |
| Factor-exposure model | 50-year-old quant tech (factor models) | encoding exposures as LLM-extracted, scored edges |
| Propagation / graph traversal | ordinary graph computation | none |
| Per-company status + rationale | FinMem layered memory | schema discipline |
| The underlying alphas | CF 2008, Fisman 2001, Madsen 2017, Tetlock 2011 | re-proving them in India on OUR graph |

**No new science is required.** The risks are integration-scale engineering + four known hard parts:
**tagging recall (G1)** · **full-article body capture** (pipeline holds headlines today) · **graph quality**
(hallucinated edges — Linker discipline + multi-evidence) · **point-in-time integrity** (every belief
timestamped; never let today's graph answer yesterday's question).

## 8. Lijo's open questions, answered inline
- *"Am I on the right path?"* Yes — categories→specialists→per-company status is the right shape. The one
  correction is §1: world-news writes to **factor nodes**, not into companies; companies inherit via edges.
- *"Separate agents per market?"* Settled (arch-note §2.7): specialist agents, one shared graph.
- *"Is it possible?"* §7: yes — integration is the work, not invention. The four hard parts are named and all
  already on the program's books (G1, body capture, graph QA, point-in-time).

## 9. What's still open (the next design session's agenda)
1. **Name the factor-node starter set** (~30–50 nodes: monsoon, crude, steel, INR, repo rate, each live
   scheme, each election cycle…) — the world-model's vocabulary.
2. **Exposure bootstrap**: seed company→factor edges from sector membership + LLM pass over filings/news
   history, then let the Linker refine.
3. **Body-text capture decision** (fetch & extract vs. richest-available-feed-text for the start).
4. **Cost envelope**: frontier model on the routed ~5–10% — estimate the monthly bill, set the cap.
5. **The acceptance test for the Mind itself** (before any trading question): e.g., *on a held-out month,
   did status changes precede price moves more often than chance?* — the system's own report card.
6. Then: the **blueprint** (components, stack, premise-retiring build order, test gates) — the build document.
