---
date: 2026-06-12
problem: >
  Item 1 of the what-it-does spec's §9 agenda: name the FACTOR-NODE STARTER SET — the world-model's
  vocabulary. A factor node = one force in the world that moves many companies at once (monsoon, crude oil,
  an election, a government scheme); companies connect to it through confidence-scored exposure edges, so
  world-news is written ONCE and statuses inherit. This doc proposes the ~55-node starter set in 8 families,
  the node state schema, the lifecycle rules (nodes are born and retired), and the exposure-edge bootstrap
  (agenda item 2). Design only — no code.
status: design artifact — the proposed vocabulary, for Lijo to review/extend. Companion to
  2026-06-12_news-brain-what-it-does-spec.md (§1 factor-node model, §9 agenda).
lane: Lijo (approve/extend the list) + James (later: schema) + Claude (drafted)
tags: [spec, design, factor-nodes, world-model, taxonomy, exposure-edges, news-brain, sachmanas]
sources_consulted: [
  "Internal: 2026-06-12_news-brain-what-it-does-spec.md; CLAUDE.md collector inventory (which sensors already
   exist: POSOCO electricity, FASTag, FII/DII, NSE announcements/deals, RBI WSS filed, BIS macro filed);
   architecture-and-reality-check §2.6 (political nexus) §2.7 (multi-market)",
  "Carried evidence: Fisman 2001 (person-as-factor for connected firms); Menzly-Ozbas (cross-industry);
   electricity→IIP nowcasting (ScienceDirect, from miracle-hunt note); SEBI algo regime + GST/e-way activity
   data (DEA Monthly Economic Review)"
]
---

# The Factor-Node Starter Set — the world-model's vocabulary (v0 for review)

> A **factor node** is a force you can't buy shares in, but which moves the things you can. This is the
> proposed starter vocabulary: **~55 nodes in 8 families.** Rules of thumb used: (1) a node earns its place
> only if it moves **many** companies (one-company forces stay on the company record); (2) prefer **fewer,
> well-maintained** nodes over hundreds of stale ones; (3) nodes are **born and retired** (a scheme launches →
> node born; scheme lapses → node archived, history kept); (4) where SachNetra **already collects the sensor**
> (electricity, FASTag, FII/DII…), the node starts with hard data + news, not news alone — those are marked 📡.

---

## 0. Node state schema (what every node stores)

```jsonc
{
  "node_id": "monsoon",
  "family": "weather",
  "state": "deficient",            // node-specific vocabulary, small + fixed per node
  "direction": -1,                  // good(+1)/bad(-1)/neutral(0) for the median exposed firm
  "severity": 0.7,                  // 0–1
  "confidence": 0.85,               // how sure are we of the state itself
  "trend": "worsening",             // better | stable | worsening
  "horizon": "season",              // days | weeks | season | structural
  "as_of": "2026-06-12T10:40Z",
  "evidence": [ { "ts": "...", "source": "...", "summary": "IMD: 18% deficient central India" } ],
  "history": "append-only — point-in-time queryable (what did we believe on date X)"
}
```

---

## 1. WEATHER & SEASONS (7 nodes) — owner: Weather agent

| Node | What it tracks | Example exposed names/sectors |
|---|---|---|
| `monsoon` | IMD forecasts, onset, weekly progress, deficit % by region | tractors, agrochem, rural FMCG, hydro, MFIs |
| `heatwave_summer` | temperature anomalies, peak-power stress | power, beverages, ACs (+), construction labor (−) |
| `flood_events` | active floods by region | insurers (−), cement (post-event +), regional banks |
| `el_nino_la_nina` | ENSO state (slow, structural) | everything monsoon touches, 1 season ahead |
| `harvest_kharif` / `harvest_rabi` | sowing acreage, yield estimates, MSP procurement | agri-inputs, sugar, tractors, rural demand |
| `festival_season` | Diwali/Dussehra/regional demand windows (calendar + channel checks in news) | autos, consumer durables, jewellery, e-commerce |
| `wedding_season` | wedding-date density, gold demand | jewellery, hotels, apparel |

## 2. COMMODITIES & ENERGY (10 nodes) — owner: Commodities agent

| Node | What it tracks | Example exposures |
|---|---|---|
| `crude_oil` | Brent level/trend, OPEC actions | OMCs, paints, aviation, tyres, lubricants, chemicals |
| `natural_gas_lng` | spot LNG, domestic gas pricing | city gas, fertilizer, glass/ceramics |
| `coal` | domestic availability, import price | power, metals, cement |
| `power_price` 📡 | merchant rates + POSOCO demand (V2-026 collected) | gencos, discom-exposed lenders, smelters |
| `steel_price` | HRC/rebar, export duties | autos, capital goods, construction, pipes |
| `base_metals` | copper/aluminium/zinc | wires & cables, EVs, packaging |
| `gold_price` | INR gold | jewellery, gold-loan NBFCs |
| `agri_commodities` | sugar, cotton, palm oil, wheat | FMCG input costs, textiles, sugar mills |
| `cement_price` | regional cement prices | cement, infra, real estate |
| `chip_supply` | semiconductor availability/pricing | autos, electronics manufacturers |

## 3. MACRO & MONEY (9 nodes) — owner: Macro agent

| Node | What it tracks | Example exposures |
|---|---|---|
| `rbi_rate` | repo rate, MPC stance, commentary tone | banks, NBFCs, real estate, autos |
| `inflation_cpi` | CPI prints, food vs core | FMCG pricing power, RBI-path expectations |
| `growth_nowcast` 📡 | GDP/IIP prints **+ our own electricity/FASTag/GST nowcast** (the moat node) | broad cyclicals, capital goods |
| `inr_usd` | rupee level/trend, RBI intervention | IT (+ on weak ₹), importers (−), pharma |
| `liquidity_banking` | system liquidity, call rates | banks margin, NBFC funding |
| `credit_growth` | bank credit growth prints | lenders, consumption |
| `gst_eway_activity` 📡 | GST collections, e-way bill volumes (activity pulse) | logistics, broad demand |
| `fii_flow_regime` 📡 | risk-on/off from our FII/DII data (V2-017) — *regime*, not direction-prediction (Exp1 lesson) | high-beta, smallcaps breadth |
| `fiscal_stance` | deficit path, borrowing calendar | PSU banks (bond books), infra spend |

## 4. POLITICS & POWER (6 node types) — owner: Politics agent

| Node | What it tracks | Example exposures |
|---|---|---|
| `general_election_cycle` | national cycle phase, coalition stability | policy-sensitive sectors, PSUs, capex plays |
| `state_election_<state>` | per major state, born ~9 months before polls | state-concentrated firms, regional banks, liquor |
| `cabinet_policy_direction` | reshuffles, ministry priorities | ministry-linked sectors (rail, defense, telecom) |
| `person:<politician>` | **person nodes that function as factors** for their connected firms (health, legal, power shifts — the Fisman mechanism) | firms with `patron-link` edges |
| `center_state_relations` | disputes affecting state-heavy businesses | mining leases, power discoms, land projects |
| `farmer_labour_unrest` | protests, strikes, bandhs | agri policy plays, regional logistics |

## 5. POLICY & SCHEMES (one node per LIVE scheme; ~10 at start) — owner: Policy agent

Born when announced, retired when lapsed. Starter examples:

| Node | Exposures |
|---|---|
| `pli_electronics` · `pli_pharma` · `pli_auto` · `pli_solar` | the listed beneficiary cohorts of each |
| `infra_capex_program` (roads/rail/ports pipeline) | EPC, cement, steel, financiers |
| `defense_indigenization` | defense manufacturers, electronics |
| `ev_policy_fame` | EV OEMs, battery chain, charging infra |
| `gst_rate_changes` | rate-affected categories per change |
| `tariff_import_duty_<sector>` | born per duty action (steel duty, solar-cell duty…) |
| `psu_divestment` | candidate PSUs, strategic buyers |

## 6. REGULATORY REGIMES (4 nodes) — owner: Regulatory agent

| Node | What it tracks |
|---|---|
| `sebi_market_rules` | F&O restrictions, algo regime (the 2026 rules), disclosure norms |
| `rbi_banking_regime` | NPA norms, risk weights, NBFC rules |
| `environment_clearance_regime` | mining/project approvals climate |
| `court_landmark_cases` | sector-shaping litigation (telecom AGR-class events) |

## 7. GLOBAL & GEOPOLITICS (7 nodes) — owner: Global agent

| Node | Example exposures |
|---|---|
| `us_fed_path` | FII flows, IT, gold |
| `china_economy` | metals, chemicals (dumping), competing exporters |
| `global_risk_appetite` | smallcap breadth, FII regime |
| `conflict:<active>` (born per conflict; e.g. shipping-lane disruptions) | freight, oil, fertilizers |
| `us_india_trade` | tariff-exposed exporters (pharma, textiles, IT) |
| `global_tech_cycle` | IT services deal flow |
| `us_visa_policy` | IT services (H-1B), staffing |

## 8. SECTOR CYCLES (5 nodes) — owner: Sector agent

| Node | What it tracks |
|---|---|
| `auto_demand_cycle` | monthly sales/registrations, inventory |
| `real_estate_cycle` | launches, registrations, prices |
| `private_capex_cycle` | order books, capacity announcements |
| `rural_vs_urban_consumption` | the divergence FMCG results keep flagging |
| `it_spending_cycle` | deal wins, guidance tone across IT majors |

---

## 9. Exposure-edge bootstrap (agenda item 2, brief)

How companies get wired to nodes, in order of trust:
1. **Mechanical seed:** sector/industry membership → default edges with low confidence (every cement name →
   `coal`, `power_price`, `real_estate_cycle`).
2. **Filing pass:** LLM reads annual-report risk factors + segment data (the documents literally say "we are
   exposed to crude-derivative input costs") → upgrade/add edges with evidence + better weights.
3. **News-history pass:** LLM sweep over our archived headlines per company → catch edges filings miss
   (patron-links live here, never in filings).
4. **Reality check (the Linker's reflection loop):** edges whose factor moves are never followed by any
   response in the company's fundamentals/price get decayed; edges that keep "firing true" get reinforced.
   The graph **earns** its weights over time.

## 10. Maintenance rules (so the vocabulary stays honest)
- **Birth/retirement:** any agent can *propose* a node; it's created when ≥N independent sources discuss the
  force as market-relevant; retired (archived, history kept) when stale for a quarter.
- **Small fixed state vocabularies** per node (e.g. monsoon: surplus|normal|deficient) — no free-text states,
  or downstream rules can't consume them.
- **Every state change carries evidence** (the article(s) that caused it) — auditable, point-in-time.
- **Cap discipline:** if the list grows past ~80 live nodes, merge or retire — an unmaintained node is worse
  than no node.

## 11. Backlog — named by Lijo, parked for later gathering ("not now")

A running list of factors flagged as real but deliberately not in v0. Add here freely; promote into a family
when we're ready to maintain them:

- **`govt_tender_pipeline`** (Lijo, 2026-06-12) — government tendering *activity* per sector (roads, rail,
  defense, water): how much is being tendered, awarded, L1-pending. Big India-specific signal for EPC/infra/
  defense small-caps. **Note the split:** a specific company *winning* a tender = a **company event**
  (category 1 — and our NSE announcements collector already catches many); the *volume/direction of tendering*
  in a sector = this **factor node**. Data would come from tender portals (CPPP/GeM/state portals) — a new
  collector, hence parked.
- **`bond_yields_gsec`** (Lijo: "interest rates", 2026-06-12) — beyond the policy-rate node (`rbi_rate`, in
  v0): the 10-yr G-sec yield and curve shape (banks' treasury books, NBFC funding costs, equity-valuation
  discount rate), plus deposit/lending-rate transmission. Cheap to add (yields are public daily data); parked
  only for focus.
- *(add the next ones here — one line each, with who named it and when)*

## 12. For Lijo to decide (small, concrete)
1. Anything **missing** that you believe moves Indian markets? (You know forces I don't.)
2. Scheme granularity: one node per PLI scheme (proposed) vs one umbrella `pli_schemes` node?
3. Politician person-nodes from day one (proposed yes — it's your §2.6 thesis) or phase two?
4. Approve the ~55 as the v0 vocabulary → next agenda item: the body-text decision + the cost cap → then the
   Mind's acceptance test → then the build blueprint.
