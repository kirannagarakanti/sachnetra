---
date: 2026-06-12
problem: >
  The final artifact of the design session: the BUILD BLUEPRINT for the Mind (working name SachManas) —
  components, stack, the premise-retiring build order with a test gate per phase, the REPORT CARD (the
  pre-registered acceptance test that judges the Mind's information quality before any trading question),
  the pre-mortem, and role split. Consolidates the whole 2026-06-11→12 design thread. Per the Fresh-Eyes
  Protocol, THIS BLUEPRINT ITSELF must pass a context-free external review before Phase 2 begins.
status: BLUEPRINT v0 — design complete, build NOT started. Gates: (1) fresh-eyes review of this doc;
  (2) Phase-1 premise tests must pass before the spine is built. Mints no Exp ID (the report card claims
  the next free ID at pre-registration, per registry rules).
lane: Lijo (decisions, audits, prod runs) + James (build) + Claude (schemas, prompts, research harness)
tags: [blueprint, build-plan, news-brain, sachmanas, phases, gates, report-card, acceptance-test,
  premise-retiring, fresh-eyes, no-code-session]
sources_consulted: [
  "The full design thread (2026-06-11→12): miracle-hunt five wall-breaks; frontier-LLM news-brain design;
   economic-links deepening (CF 2008 read in full); architecture-and-reality-check (§2.6 political nexus,
   §2.7 multi-market, two-layer split, two clocks); what-it-does spec (factor nodes, 12 categories, agent
   roster, status schema); factor-node starter set (~55 nodes, 4-pass exposure bootstrap); body-text +
   cost envelope (own RSS reader; url_context fetcher; Groq/Gemini/Bedrock free stack; cap $500);
   _fresh-eyes-protocol.md",
  "Constraints carried: feedback_v2_prod_execution (Claude writes code + read-only checks; humans run prod);
   feedback_check_disk_before_prod_writes (check-db-space before large writes); CLAUDE.md (news pipeline is
   fire-and-forget — the Mind never touches it); registry rule (IDs minted at pre-registration only)"
]
---

# Build Blueprint — the Mind (SachManas) v0

> **Two hard gates before any real construction:** (1) this blueprint goes through the
> [Fresh-Eyes Protocol](./problem-solving/_fresh-eyes-protocol.md) — stripped brief, different model family,
> their frame first; (2) the Phase-1 premise tests (days of work, ~zero cost) must pass — **we do not build
> the cathedral before checking the ground holds.** Everything else here is sequenced so the biggest unknown
> dies first.

---

## 1. The system in one picture (settled by the design thread)

```
                       ┌──────────────────  THE MIND (separate app; reads SachNetra's DB, writes ONLY its own)
  RSS feeds ──► C1 Feed Reader (keeps descriptions)          FAST CLOCK (~10–20 min)
                    │
                    ▼
               C2 Router (keyword pre-filter → Groq free) ──► 12 categories · quarantine for noise
                    │
        ┌───────────┴──────────────┐
        ▼                          ▼
  company-news               world-news
        │                          │
        ▼                          ▼
   C4 Specialists (Gemini Flash) — read full text (+ url_context fetch when thin)
        │   emit STRUCTURED RECORDS (stance, novelty, surprise, confidence, rationale, model_id)
        ▼
   C3 GRAPH STORE  ◄── C5 Linker (edges: supplies/competes/patron-of/exposure; multi-evidence, confidence)
   (companies · people · ~55 factor nodes · typed edges · point-in-time history)
        │
        ▼
   C7 Status Assembly (computed: direct events + factor inheritance + ripple inflows)
        │                                          C6 Auditor (context-poor BY DESIGN):
        ▼                                             corroboration · rumor flag · no-news-move (leak) flag
   C8 Deep Pass (Claude via Bedrock, ~2% high-impact: bull/bear debate, ripple walk)
        │
        ▼
   INSIGHT STREAMS (§6 of the spec) ──► dashboard ──► research harness ──► (much later) Layer-2 RULES
                                                       SLOW CLOCK (per-rule, pre-registered, backtested)
```

Non-negotiables carried from the thread: **the agent extracts, a tested rule decides** · **two clocks** ·
**factor nodes, never world-news into company rows** · **every record carries `model_id` + `rationale`** ·
**point-in-time everything** · **the Mind never touches SachNetra's pipeline or tables.**

## 2. Component inventory + stack

| # | Component | What it is | Stack choice (boring on purpose) |
|---|---|---|---|
| C1 | Feed reader | Own RSS parser over the SachNetra feed universe, **keeping `description`/`content:encoded`** | Node.js (`.mjs`, mirrors existing seed-script idiom) on a Railway cron |
| C2 | Router | Free keyword pre-filter → Groq `llama-3.1-8b` classification into the 12 categories | Node + Groq (already integrated) |
| C3 | Graph store | nodes(companies/people/factors), edges(typed, weighted, confidence, evidence, first/last-seen), **append-only state history** | **Postgres tables, not a graph DB** — the graph is tiny (≈4k companies + 55 factors + edges); SQL keeps it queryable, backupable, team-skill-compatible. **Own database** (or at minimum own schema) — never the asset DB (disk incident memory) |
| C4 | Specialist agents | Per-category prompts → §3-of-spec structured record; Gemini Flash free tier; `url_context` for thin articles | Gemini API |
| C5 | Linker | Relation extraction (supply/compete/patron/exposure) from news + filings passes; multi-evidence + confidence; later: the reflection loop that decays never-firing edges | Gemini Flash (bulk) / batch jobs |
| C6 | Auditor | **Deliberately context-poor** (no specialist memory): source-corroboration counts, rumor/pump quarantine, **no-news-move flag** (price moved, nothing explains it) | Node + cheap model |
| C7 | Status assembly | Computed per-company status: direct events + Σ(factor state × exposure) + ripple inflows; full snapshot history | SQL views + a small assembler job |
| C8 | Deep pass | Multi-agent (bull/bear/risk-arbiter) on the ~2% flagged events | Claude via Bedrock credits |
| C9 | Storage & schema | The Mind's own Postgres: `articles`, `records`, `nodes`, `edges`, `node_states`, `company_status`, `insights`, `run_log` | Railway Postgres (separate instance) |
| C10 | Query surface | Read-only dashboard over C9 (factor dashboard, per-company status, insight feed) | Reuse the separate-dashboard pattern (Next.js reading PG) |
| C11 | Ops | Freshness alarm per loop · **daily cost circuit-breaker (~$25)** · model-version log · DB backup | Cron + the same alarm machinery Layer-0 adds to SachNetra |

## 3. Build order — premise-retiring phases, each with a gate

**The ordering rule: the thing most likely to kill the project gets tested first, at the lowest cost.**

### Phase 0 — Layer-0 preconditions (days; mostly SachNetra-side; both miracle notes demanded this)
Freshness alarms on every SachNetra collector · the **article-volume SQL count** (calibrates the §B cost
table) · start the survivorship/delisting log.
**Gate:** an artificially-staled feed fires an alarm within one cycle.

### Phase 1 — Premise tests BEFORE building anything (≈ a week, ≈ ₹0) ← the most important phase
| Test | Retires which unknown | Method |
|---|---|---|
| **P1a — the 20-pair drift gate** | *"Does the ripple premise hold in India at all?"* — the biggest unknown in the program | ~20 obvious, well-known listed 1-hop pairs (OEM↔supplier, refiner↔crude…); for each big news event on the head, did the linked name drift **post-publication**? Read-only script on `research_prices` + news we hold |
| **P1b — description audit** | *"Do our feeds actually deliver body text?"* | Parse 48h of the live feeds with a description-keeping parser; measure usable-text % per top-20 source |
| **P1c — url_context probe** | *"Can Gemini fetch Indian outlets?"* | url_context on 10 articles × top-10 sources; blocked-or-not table |
| **P1d — specialist quality probe** | *"Is Flash good enough for the structured record?"* | 100 tagged articles → §3-of-spec records via Gemini Flash; Lijo eyeballs 30; error taxonomy |
**Gate:** P1a shows *any* systematic post-publication drift → full speed ahead. P1a flat → **decision point
for Lijo**: the directional-ripple *trade* thesis is dead-on-arrival, but the insight engine / dataset-of-record
(Candidate E) value case stands — rescope or stop *before* a month of building. Either way the answer cost a week.

### Phase 1.5 — 🔍 FRESH-EYES GATE on this blueprint
Stripped brief (protocol §8) to a different model family; their frame first; reality-check pass; amend the
blueprint. **Phase 2 does not start until this has run.**

### Phase 2 — the reading spine (C1 + C2 + C9) (~1–2 weeks)
**Gate:** 1 week live · ≥95% of articles categorized · router precision ≥90% on a 100-article hand-check ·
cost ≈ $0 (Groq free tier).

### Phase 3 — world model v1 (C3 + ~30 factor nodes + mechanical exposure seeding) (~1–2 weeks)
**Gate:** factor states updating from real news; 20 sampled state-changes audited correct; point-in-time
query ("what did we believe on date X?") works.

### Phase 4 — specialists + status (C4 + C7) (~2 weeks)
**Gate:** structured-record audit (Lijo, 100 records: stance/novelty/rationale sane ≥80%) · `model_id` on
every row · status assembly reproduces the three worked examples from the spec (monsoon / raid / OEM-cut).

### Phase 5 — the graph earns edges (C5: news-history + filings passes) (~2 weeks)
**Gate:** 50-edge sample ≥80% precision (human-checked against known relationships) · scrambled-graph
falsification harness ready (shuffle edges → downstream signal must vanish).

### Phase 6 — Auditor + deep pass (C6 + C8) (~1–2 weeks)
**Gate:** rumor quarantine catching seeded junk · no-news-move flag firing on real cases · **2 weeks inside
the cost envelope with the circuit-breaker armed.**

### Phase 7 — THE REPORT CARD (§4 below) — the Mind's acceptance test
**Gate:** pre-registered pass bars met → only then Phase 8.

### Phase 8 — Layer-2 rule experiments (each its own pre-registered Exp)
CF customer-momentum long-leg (low-attention, pre-earnings window, centrality-weighted) · Tetlock
directional-novelty rule · political-nexus event rule · each through the full playbook gauntlet
(DSR, recency, concentration, net-of-250bps). **No paper trade before a rule passes; no live rupee before
`positioning_v2` Gate-1 conditions.**

## 4. The Report Card — the pre-registered acceptance test for the Mind itself

**The question (information quality, NOT profitability):** *does the Mind's status stream contain
information about future prices beyond chance and beyond plain momentum?* A trading rule is Layer-2's
question, later. This is "does the brain see anything real."

- **Setup:** a **held-out evaluation window** (≥1 month, untouched during build/tuning). For every
  (company, day): the Mind's `net_status` computed strictly from data timestamped ≤ that day (point-in-time
  graph; `model_id` constant across the window — one model per column per experiment).
- **Four pre-registered measurements:**
  1. **Lead-lag:** do status *changes* precede same-direction abnormal price moves (next 1–10 sessions) more
     often than a shuffled-dates null?
  2. **Cross-sectional IC:** rank-IC of stance vs forward returns, **with the Exp19 ablation as the judge**
     — does stance add IC *beyond the momentum column*? (The harness already exists; this is one more column.)
  3. **Big-mover audit:** for the window's 20 largest movers, did the Mind flag anything *before* the move —
     and with what lead-time distribution vs. a random-flag null?
  4. **Calibration:** confidence buckets vs realized hit-rate (a 0.8-confidence call should be right ~80%).
- **Falsifications built in:** scrambled-graph run (ripple signal must die) · shuffled-dates null ·
  momentum-only baseline.
- **Pass bars: locked at pre-registration** (the brief claims the **next free Exp ID** in the registry —
  not minted here, per registry rules). Direction of the bars, to be quantified in the brief: stance must
  add IC beyond momentum with stated significance; lead-lag and big-mover lead-times must beat their nulls;
  calibration monotone. **If it fails → the Mind is a beautiful librarian, not an analyst — Candidate-E value
  persists, Layer-2 does not proceed.** Honest either way.

## 5. Pre-mortem (what kills this, watched per phase)
1. **P1a flat** → the ripple premise dies in week one (that's the design working, not failing).
2. **Feed descriptions too thin** (P1b) → ~~lean harder on url_context~~ **SETTLED by P1c (2026-06-12):**
   the fetch spine is OUR OWN deterministic fetcher (HTTP GET → JSON-LD `articleBody`), free + zero LLM
   quota, covering 4/5 load-bearing sources incl. Moneycontrol (which bot-walls Google's url_context).
   url_context is a paid fallback only. Hindu BusinessLine (no JSON-LD) needs a small Readability fallback.
   See `research-notes/2026-06-12_p1c-fetch-probe-results.md`.
3. **Hallucinated edges** survive the Linker's evidence bar → Phase-5 gate catches it; fix = stricter
   multi-evidence, never "trade anyway."
4. **Cost runaway** → circuit-breaker (C11) trips at ~$25/day; funnel ratios re-tuned.
5. **Scope creep** — the 80-node cap, the 12-category cap, and "the agent never decides" are load-bearing;
   any change to them goes through fresh-eyes first.
6. **The market is faster than the literature** — possible; that's exactly what the report card measures
   before any rupee moves.

## 6. Who does what
- **James:** C1/C2/C9 spine, C11 ops, dashboard plumbing (his collector idiom throughout).
- **Claude:** schemas, prompts, the P1 probe scripts, the report-card harness (Exp19 reuse), task files per
  phase; **code + read-only checks only — humans run anything that touches prod** (standing boundary).
- **Lijo:** the Phase-1 decision, record audits (P1d, Phase-4/5 gates), the fresh-eyes loop, prod runs,
  the report-card pre-registration sign-off.

## 7. Immediate next actions (in order)
1. ~~Phase 0: alarms + volume count + delisting log~~ ✅ DONE 2026-06-12 (volume 2,569/day = 1.03×; alarm
   live, caught the research_prices stall; universe baseline 2,386 tickers).
2. ~~**P1a script** — the 20-pair drift gate~~ ✅ RUN 2026-06-12 — **GATE: ALIVE at the month horizon**
   (+1.22% t=4.0 vs placebo +0.24%; see p1a results note).
3. ~~Fresh-eyes review~~ ✅ RUN 2026-06-12 (MiniMax + Kimi, 3 rounds) → **Amendments v0.1 below.**
4. ~~P1b~~ ✅ (feeds thin → fetch load-bearing) · ~~P1c~~ ✅ (own-fetcher JSON-LD path wins) · ~~P1f~~ ✅
   (small-cap filing edge, modest+alive) · ~~P1d~~ ✅ 2026-06-12 (**specialist extraction PASS** — 90%
   two-grader, 0 hallucinations; two pre-build tickets: `ownership` event_type + nse-master listed gate).
   **Phase-1 probe gate effectively CLEARED.** Optional remaining: P1e (blinded-decoy) · P1a-v2 (unfamous
   pairs + controls) — not blockers.
5. **NEXT: Phase 2 — the reading spine.** Task filed: `ai_docs/tasks/SachManas-P2_reading-spine.md`
   (C1 own-RSS+JSON-LD reader · C2 firewall router · C9 own DB; gate = 1wk live, ≥95% categorized,
   router ≥90% on 100-article audit). Phase 3 world-model design goes through the Kimi fresh-eyes gate first.
5. Then Phase 2 (the spine), under the amended design.

---

## 8. AMENDMENTS v0.1 (2026-06-12, post fresh-eyes — full reasoning in
`problem-solving/2026-06-12_fresh-eyes-brief-news-brain.md` Kept/Killed synthesis)

1. **Factor nodes: build 8–10, not 55.** Crude, INR, repo rate, monsoon, 2–3 live schemes, election cycle.
   The 55-node list demotes to a vocabulary ceiling/backlog. **Node-addition bar:** an edge/node enters only
   if defensible in a 2-minute no-notes conversation (why it exists, why not priced, what kills it).
   **Exposure weights are seeded from rolling return correlations** (data-driven); the LLM annotates the
   *why*, never fabricates the weight. **Layer kill test at 2 months:** if no factor insight changed
   anything downstream, delete the layer. Factor updates are multi-target (one OPEC article may touch
   crude+INR+shipping).
2. **Two-class edge schema** (`edge_class ∈ {curated, llm_proposed}`): curated = weight 1.0, no auto-decay,
   human-only deletion, wins conflicts; llm_proposed = weight 0, earns by **prediction** — **decay is keyed
   to predictive success (linked-name price response), never to co-occurrence/firing.** Independence is
   operational: different source_type, or same type different time period. LLM evidence against a curated
   edge → `proposed_correction` queue for human review. **Linker graduation exam:** 20 frozen proposed
   edges, blind 6-month forward test, ≥60% survive net Sharpe>0.3.
3. **Acceptance test (Phase 7) hardened:** pre-registered tolerance band on the P1a reconstruction;
   **false-edge placebo floor** (<5% edge-proposal rate on random-date news); **temporal-stability slice**
   (must reproduce the post-2022 weakening, not smooth it); **cost-integrated Sharpe** as the final bar;
   decay-audit (modeled edge half-life ≈ empirical drift half-life).
4. **Layer-2 boundary hardening (Kimi's audit battery):** flat 4-field signal interface
   (company, trigger, relationship_type, confidence) — rules must execute identically on random/inverted
   signals; git-frozen rule covenant (90d live / 6mo paper); step-function sizing only; signal-only
   backtest published; **a parallel filings-only zero-AI paper rule runs alongside as the AI-off fallback**
   (answers "can you shut the AI off for a week?").
5. **Routing firewall:** 3 routing labels (company / factor:family / ignore). The 12-category taxonomy
   survives for corpus organization and factor-family dispatch, but **category labels may never enter the
   rules engine as weights.**
6. **URL-fetch gating:** trusted-source list, timeout/retry, paywall detector, per-source success tracker,
   daily fetch budget; fetch only if description <300 words AND routed company/factor AND trusted source.
7. **Auditor promoted to alpha stream:** the no-news-move flag auto-scans the announcements corpus
   (related-party, bulk/block, pledge events, prior 5d) and emits a structured, backtestable insight record
   — not a log line.
8. **Month-3 ops (new mandatory pre-Phase-2 items):** model-version pinning + frozen backtest pipeline;
   graph-topology as-of versioning (edges, not just facts); ONE codebase, backtest-as-a-mode; **risk
   envelope defined before any rule** (max position %, max positions, max sector, drawdown breaker, daily
   loss stop); **liquidity gate: ADV ≥ 5× intended position, spread measured per name** (the unfamous pairs
   are the illiquid ones — cost there is >2.5%); operations runbook (two-person bus-factor); monthly
   confidence-calibration check; `detected_at`/`market_at` populated for FILINGS (where the lead lives);
   shadow mode for rules; rejected-95% stored raw 90d then archived.
9. **New probes adopted:** P1e blinded-decoy headline test (20 real + 40 matched decoys, scored 0–5 blind,
   Mann-Whitney p<0.05); P1f small-cap filing edge (filings are keyed + prices exist = one SQL query);
   P1a-v2 (unfamous-pair candidate generator from announcements/annual-reports/credit-rating rationales +
   inverted-pair, index-day, T+5, 4%-cost controls + holding-structure (a)-revaluation vs (b)-retail-flow
   bucket split).

---

## 9. AMENDMENTS v0.2 (2026-06-12, fresh-eyes closing round — reasoning in the fresh-eyes log, Round 4)

1. **Exposure weights — the v0.1 correlation-seeding is OVERRIDDEN** (Kimi's catch: "correlation is not
   exposure" — the sign of past co-movement encodes the narrative of past shocks and flips through
   regimes). New rule: **direction/sign of every factor exposure comes from business structure** (segment
   reporting, input-cost disclosures, curated with evidence). Correlation is demoted to magnitude
   refinement and risk-clustering — never a directional signal. *If no fundamental evidence exists for an
   exposure, the factor edge doesn't exist.*
2. **Factor kill test: event-count probation replaces the 2-month calendar test.** A factor node is judged
   after **3–5 relevant events**, not N weeks (monsoon gets one event a year; repo gets ~6 MPC meetings).
   No events → probation continues indefinitely; probation nodes never feed anything downstream.
3. **The report card is SPLIT to protect the layer boundary** (Kimi: "the analyst acceptance test is
   secretly a trading test"). (i) *Information-quality acceptance* — tunable, iterate freely: ≥95% factual
   accuracy on audited records; the graph reconstructs the P1a pairs with correct lag structure;
   state-updates only after verified source publication times; calibration monotone. (ii) *The predictive
   exam* — pre-registered, **one-shot per frozen analyst version, never tuned against**: lead-lag vs
   shuffled null, IC-beyond-momentum, big-mover audit. A re-run requires a fresh held-out window and an
   incremented, logged trial count (DSR-style multiplicity honesty).
4. **No-news-move stream firewalled:** it auto-scans announcements for the filing-level explanation (v0.1
   §7) and emits structured records — but it is a **research/sentinel stream only**, not a rule input,
   until it passes its own pre-registered gauntlet.
5. **The Layer-2 risk envelope is adopted** (MiniMax's closing deliverable, recorded in full in the
   fresh-eyes log): 5%/8% position caps · 15–18/25 positions · 15% cash buffer · size = min(cap, 0.20×ADV20)
   · sector 25% / group 20% / pair 15% · pledge/microcap 3% caps · drawdown ladder −8%/−12%/−20% · daily
   1.5% / weekly 4% stops · spread <0.5% gate · 5d min / 60d max hold · no averaging down · weekly
   correlation purge. Goes into the runbook verbatim; calibrate against the first shadow backtest.
6. **Kimi's closing forecast logged as the standing falsification target:** *"first 6 months of paper
   flat-to-negative after costs, factor layer the culprit, endpoint = pairs + filings."* If the program ends
   up there, the fresh eyes called it — record either way.
