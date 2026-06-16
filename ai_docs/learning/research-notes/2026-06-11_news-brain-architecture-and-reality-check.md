---
date: 2026-06-11
problem: >
  Lijo pushed back (correctly) on the "excited" framing — the question is "WILL THIS WORK," not whether it's
  exciting. He also proposed a concrete architecture: a SEPARATE multi-agent application (not bolted into the
  SachNetra news repo), where LLM agent(s) have access to the Railway DB, are triggered every ~10 min, hold
  per-company data, and "the agent decides what will happen" — referencing MiroFish
  (github.com/666ghj/MiroFish). This note (a) answers "will it work" honestly using the FULL Cohen-Frazzini
  paper Lijo supplied, and (b) evaluates and corrects the architecture. No code changes.
status: review + architecture eval — grounded in the primary source (CF 2008, read in full) + MiroFish repo.
  Opinion flagged as opinion. Mints no Exp ID.
lane: Lijo (decide) + James (build) + Claude (author task/research)
tags: [research-note, architecture, multi-agent, llm, will-it-work, cohen-frazzini, customer-momentum,
  long-only, short-leg, look-ahead-bias, mirofish, reality-check, candidate-c]
sources_consulted: [
  "Primary source, read IN FULL this session: Cohen & Frazzini (2006/2008) 'Economic Links and Predictable
   Returns' — ai_docs/learning/transcripts/Economic-Links-and-Predictable-Returns.md (Lijo-supplied)",
  "MiroFish repo (github.com/666ghj/MiroFish) — multi-agent simulation/forecasting engine, GraphRAG knowledge
   graph, persona agents w/ memory; NO backtesting / NO look-ahead handling (per repo)",
  "Internal: 2026-06-11_news-brain-deepened-economic-links-and-novelty.md; 2026-06-11_frontier-llm-news-brain-design.md;
   positioning_v2.md (long-only, SLB dead); project_separate_dashboard (separate app pattern);
   feedback_v2_prod_execution; CLAUDE.md (pipeline is fire-and-forget, must not delay digest)"
]
---

# News Brain: will it actually work, and is the architecture right?

> Lijo's correction is the right instinct, so this note answers in that register: **not "is it exciting" —
> "will it work, and what's the honest probability."** Two parts: (1) what the *full* Cohen-Frazzini paper
> actually says (now that I've read it, not a search summary) and what that means for SachNetra's *specific*
> situation; (2) a straight evaluation of the proposed architecture — what's right, and the one correction
> that matters most. No code changed.

---

## PART 1 — Will it work? (the honest read of the primary source)

I read the whole paper. Here are the **real** numbers and the parts that help *and* hurt SachNetra
specifically. I'm separating "the effect is real" (yes) from "it will work for us" (conditional — three
specific things decide it).

### 1.1 What the paper actually proves (corrected, exact)
- **The strategy:** each month, go **long** suppliers whose *customers* had the **highest** returns last
  month, **short** suppliers whose customers had the **lowest**. Rebalance **monthly**.
- **The return:** **1.45%/month** Fama-French alpha (t=3.61) ≈ **18.4%/yr**. After also controlling for the
  stock's own momentum: **1.37%/month** (t=3.12). Equal-weighted: **1.3%/month** (t=4.93). Robust, real,
  large. ✅
- **Mechanism:** investor **limited attention** → news about a linked firm diffuses **slowly** → predictable
  drift. The drift closes over **~a year**, and the supplier under-reacts by **~40%** (covers 60% of the move
  immediately, the rest over 6 months).
- **It's NOT industry momentum:** 78% of links are *cross-industry*, and it survives controls for own-momentum,
  industry momentum, lead-lag, and cross-industry momentum. ✅

### 1.2 The three things that decide whether it works FOR SACHNETRA (read these carefully)

**① The strongest half is the SHORT leg — and SachNetra is long-only. ⚠️ (the biggest issue)**
The paper is explicit: *"customer momentum returns are asymmetric: the returns of the long short portfolio
are largely driven by slow diffusion of **negative** news"* — because short-sale constraints stop bad news
from being priced. **The money is disproportionately in shorting suppliers whose customers got bad news.**
SachNetra's `positioning_v2` is **long-only** (SLB/borrow is dead for the names we'd trade). So a long-only
version captures the *weaker* leg. **This is the same wall that hurt mid-cap PEAD.** It doesn't kill the idea
— the long leg is still positive — but it means **expect materially less than 18%/yr long-only**, and the
first test must measure the *long-leg-only* return net of cost, not the headline long/short number. *Do not
quote 18%/yr as what we'd get.*

**② The headline result EXCLUDES microcaps, and the tradeable name is the small supplier.**
- They impose a **$5 minimum price** to "ensure returns are not driven by micro-cap illiquid securities." So
  the 18%/yr is *not* a microcap result — my earlier "concentrate in microcaps" was too loose.
- BUT the real lever is **attention**, not size: low common-mutual-fund-ownership ("high inattention") links
  earn **3.02%/month**; high-attention links earn **0.55%/month (insignificant)**. The spread is **2.48%/mo**.
  **The entire edge lives in low-attention links** — which *correlates* with small/uncovered names (SachNetra's
  zone) but the clean lever is *attention*, so we should measure attention directly (analyst coverage, fund
  ownership, news volume), not just market cap.
- The *customer* is usually **large** (>90th percentile — because the 10%-of-sales disclosure rule surfaces
  big customers); the **supplier you trade is smaller**. So the play is: *a big customer gets news → buy/sell
  the smaller, less-watched supplier.* Liquidity of the supplier is the binding constraint (and the cost
  floor lives here).

**③ It must be re-proven in India, on an LLM-built graph — two compounding unknowns.**
The 18%/yr is **US, 1980–2004**. Two things could differ: **(a)** India market efficiency in 2026 (decay —
though low-attention names decay slowest); **(b)** our graph is **LLM-extracted from text**, not Compustat
segment filings — so graph *quality* is a new error source the paper never had. A wrong/hallucinated edge
injects noise the original never faced. **The graph QA is part of the strategy, not a side task.**

### 1.3 Verdict on "will it work"
**The effect is one of the most robust in finance, and its mechanism is SachNetra's proven edge — so the prior
is genuinely good, better than anything else in the program.** But the honest expectation is **not** 18%/yr.
It's: *a positive, cost-survivable long-leg drift in low-attention Indian suppliers after big customer news*,
**if** (①) the long-only leg is still positive net of cost, (②) we target attention correctly and the
supplier is liquid enough, and (③) the India + LLM-graph version holds. **Those are three real "ifs," and
each has a cheap test before any big build.** This is a *pursue-and-test*, not a *it-works.* The difference
matters and Lijo is right to insist on it.

---

## PART 2 — The architecture (what's right, and the one correction)

Lijo's proposal: a **separate multi-agent app**, agents with **DB access**, **triggered every ~10 min**,
**per-company data**, where **"the agent decides what will happen"** (MiroFish-style). My evaluation,
point by point — mostly right, one critical fix.

### 2.1 ✅ Separate application — CORRECT, and for good reasons
Building this **outside** the SachNetra news repo is the right call, not a compromise:
- CLAUDE.md is firm that the news pipeline is **fire-and-forget and must never delay the digest**. A heavy
  multi-agent LLM system *cannot* live inside that cron. Separation protects the live site.
- It matches the **existing pattern**: `sachnetra-dashboard` is already a separate app that reads Railway PG
  directly (memory `project_separate_dashboard`). A separate "analyst" app that reads the same DB is
  consistent and clean.
- It keeps the expensive/experimental thing isolated from the asset. **Keep it a pure *reader* of the DB**
  (and writer to its *own* tables), never reaching into the seed pipeline's write path.

### 2.2 ✅ Agents + memory + graph (the MiroFish shape) — RIGHT for the EXTRACTION layer
MiroFish = a multi-agent **simulation/forecasting** engine: GraphRAG knowledge graph + persona agents with
long-term memory. That *shape* (graph + memory + multiple specialized agents) is exactly right for the part
of our system that **reads news and builds/maintains the firm-relationship graph and the per-company state**.
Good reference. Adopt: the knowledge-graph backbone, per-entity long-term memory, specialized agents
(extractor / linker / novelty-scorer / risk-checker).

### 2.3 ⚠️ "Triggered every 10 minutes" — RIGHT for ingestion, WRONG for trading (two clocks)
Separate the cadences, because they're different jobs:
- **Fast clock (~10 min): the ANALYST loop.** Read new news, resolve entities, update the graph, update each
  affected company's "state," score novelty, flag events. This *should* run continuously — it's keeping the
  picture current. ✅
- **Slow clock (monthly, per the paper): the TRADING loop.** Cohen-Frazzini **rebalances monthly**; the drift
  plays out over months. Making *trading* decisions every 10 minutes would (a) explode turnover → the cost
  floor eats you, and (b) chase noise. **The trade decision is slow even though the reading is fast.** Don't
  conflate them.

### 2.4 ❌ "The agent decides what will happen" — THE correction that matters most
This is the seductive trap, and it's the one place the proposal needs to change. **The LLM agent should NOT
be the thing that predicts the price / decides the trade.** Why, concretely:

1. **It re-opens the unwinnable question.** "Agent decides what will happen to the price" *is* directional
   price forecasting — the exact thing that died 18 times. Dressing it in an agent doesn't change the
   economics; it hides them.
2. **You can't backtest a vibe.** An agent's free-form "I think X goes up" is not a reproducible time series.
   You cannot compute an honest Sharpe, DSR, or walk-forward on it. **MiroFish itself has *no backtesting and
   no look-ahead-bias handling*** (I checked the repo) — that's *fine* for its purpose (a "rehearsal lab" for
   humans) but it's exactly why you can't trust it with money. It's research-grade, not money-grade.
3. **Look-ahead bias is near-impossible to rule out.** A frontier model "deciding what will happen" about a
   2019 event may *already know* what happened (training data) — every backtest becomes a lie (arXiv 2512.23847).
4. **The literature says LLMs are weak at exactly this.** "LLM signals are weak for *returns*, strong for
   *facts/prices*." Let them do what they're good at (extract structure), not what they're bad at (predict
   returns).

**The correct division of labor (this is the fix):**
```
  LAYER 1 — the AGENT APP (fast, ~10 min):  the ANALYST, not the trader
     reads full articles → resolves entities → updates the firm-relationship GRAPH
     → per (company, event): {linked_firms, direction-of-impact, novelty, surprise, confidence, rationale}
     WRITES structured rows to its own DB tables.   (extraction = what LLMs are good at)
                                   │
                                   ▼
  LAYER 2 — the QUANT STRATEGY (slow, monthly):  the DECIDER
     reads Layer-1's structured rows → applies a PRE-REGISTERED, BACKTESTED rule
     (the Cohen-Frazzini customer-momentum rule, low-attention-targeted, long-leg,
      liquidity-filtered, net of 250 bps) → decides the trade.
     This layer is a deterministic, walk-forward-testable model. (decision = what stats are good at)
```
**The agent feeds the rule. The rule decides.** That keeps everything falsifiable — you can backtest Layer 2
honestly because Layer 1's outputs are timestamped structured data, not opinions. It also means the agent
*can* be a frontier model with full reasoning, because its job (extraction) is one where reasoning + look-ahead
discipline is checkable via the `rationale` field.

> One sentence: **use the agent to build the map and read the news; use a tested rule to place the bet.**
> MiroFish is a great template for Layer 1 and a cautionary tale for Layer 2.

### 2.5 ✅ Per-company data the agent maintains — RIGHT (this is the asset)
A living per-company "state" (recent events, graph neighbors, narrative momentum, novelty history) that the
agent keeps current is exactly the right artifact — it's the FinMem "layered memory" idea and it's the
moat (the India firm-graph + per-company state). Good. Just store it as **data Layer 2 can query**, not as
the agent's private reasoning.

### 2.6 ADDENDUM (same day) — Lijo's clarification of the 10-min loop + the political-nexus edge layer

**(a) The 10-min loop, clarified — Lijo was right, and we agree.** Lijo's pushback on §2.3: the every-10-min
trigger is the agent *reading and verifying* — e.g. corruption news about a person → the agent checks it
against what we already gathered (who the person is, their position, how much they matter to the company) and
assesses the impact; same for accidents, incidents, govt schemes. **That is exactly Layer 1 (the analyst),
and on that we have no disagreement** — my "half right" applied *only* to placing trades on that clock. One
refinement that makes both views compatible: **the clock belongs to the RULE, not the agent.** The agent has
one fast clock (read/verify/update every 10–20 min). Each Layer-2 strategy rule has its *own* clock — whatever
horizon its backtest validated: customer-momentum = monthly (CF 2008); a fraud/arrest/raid event-rule might be
days; an election rule is episodic. Fast reading, per-rule trading horizons, every rule pre-registered at its
own horizon.

**(b) The political-nexus edges — Lijo's "the dots are all connected" is a documented, large effect.**
Page-checked this session:
- **Fisman (2001, AER — 3,000+ citations):** when bad news about Suharto's *health* broke, politically
  connected Indonesian firms dropped far more than unconnected ones — implying **up to ~25% of a connected
  firm's value comes from the political connection alone.** News about a *person* repricing *companies* is
  exactly Lijo's corruption-news → person → company chain, measured.
- **India-specific:** politically connected Indian firms **outperform non-connected peers** (panel across the
  2009/2014/2019 general elections); connected firms show the **highest volatility around elections**; and (US
  analogue) firms aligned with the election winner earn **~3% post-election abnormal returns.**
- **The twist that matters for us:** the literature also finds connected firms are **shielded from public
  fraud exposure** — scrutiny is suppressed *until* the politician falls. Which means when corruption news
  about the *politician* finally breaks, it is often the **first public signal** for the connected firm — a
  slow-diffusion setup tailor-made for the ripple engine (the market reprices the famous flagship names first, the
  second- and third-tier connected firms later).

**Design consequence:** the graph is **not just supply chains.** Nodes = companies **and people** (promoters,
directors, politicians, families); edges add **political-nexus types**: `patron-of`, `donor-link`,
`board-seat`, `family-tie`, `same-constituency/region`, `scheme-beneficiary`. A political shock (health,
arrest, raid, election result, scheme announcement) propagates through patronage edges exactly as a customer
shock propagates through supply edges. **Honest cautions:** (i) patronage edges are *inferences from text*,
not contracts — confidence-score them, require multi-source evidence, and weight below contractual edges;
(ii) the direct hit on a famous connected conglomerate is priced in minutes — the edge is, as always, the
**ripple to the less-watched connected names**; (iii) everything here trades on *public* news — no special
information, just connecting public dots faster.

**(c) "Build it to the fullest" — what fullest means.** The full build is not "a sentiment upgrade." It is
**the power map of Indian markets**: companies × people × politicians × regions × schemes × supply chains,
continuously maintained from text by the agent layer, with per-entity memory. That artifact *is* Candidate E
(the dataset-of-record moat) — valuable even if no single trading rule survives — and it's the substrate for
every rule that might. The trading rules (Layer 2) are then cheap experiments on top of it, killed or kept
one at a time, the way the program already works.

### 2.7 ADDENDUM (2026-06-12) — the multi-market expansion ("insights on every market")

Lijo's expansion of the vision, captured + evaluated:

**The claim:** every live market datum lives in news — commodities, energy, stocks, all of it. The system
should produce **insights across every market**, not just equities. The agent itself will not trade (✅ the
two-layer split is now accepted/locked). Build and test how well it performs first. A complete separate
application, more complicated than SachNetra itself. Possibly **separate agents per market** (Lijo flags he's
unsure on this).

**Evaluation — the core is right, with two corrections:**

1. **Multi-market is not scope creep — it's the natural shape of the causal graph.** Commodities and energy
   are *causally upstream* of equities: crude ↑ → paints (input cost), airlines (fuel), OMCs (margins);
   steel ↑ → auto OEMs; monsoon/agri news → FMCG rural demand, tractor makers; coal/power → smelters. These
   cross-asset ripples are among the best-documented in the cross-industry-momentum literature (Menzly-Ozbas
   lineage), and SachNetra already collects the energy layer (POSOCO electricity, V2-026). So commodities/
   energy enter the graph as **node types and edge types** (`input-cost-of`, `fuel-for`, `substitute-of`),
   not as separate products. **Near-term honesty:** the *trades* stay equities (positioning is long-only
   equities; MCX commodity trading is a different venue/instrument = a later fork). Commodity *news* feeds
   equity ripples; we don't trade commodities to start.

2. **"Separate agents per market" — specialists YES, silos NO (answering the open question).** The right
   topology is a **newsroom**: specialist analyst agents per domain (equities, commodities/energy, politics/
   policy, macro) with a router that sends each article to the right specialist(s) — **but ONE shared graph
   and ONE shared per-entity memory.** If each market gets its own agent *with its own world*, the
   cross-market edges (oil → airline) are severed — and those edges are the whole point. Specialist *reading*,
   unified *world-model*. (This matches the multi-agent lit: TradingAgents-style role specialization over a
   shared state.)

3. **"Build to the fullest, not v1/v2" — right about quality, needs one amendment about order.** Steelmanned:
   design the FULL architecture up front so nothing is throwaway — agreed, that's how you avoid building a
   disposable prototype. **The amendment: full blueprint, staged validated construction.** The program's own
   18-null history is the proof: building everything before testing the load-bearing premise is how months
   get wasted. The premise under this whole system ("linked names drift *after* public news, in India") is
   testable in days (~20 obvious pairs) — that gate runs BEFORE the big build, not after. Build each component
   to full quality, in the order that retires the biggest unknowns first. Skyscraper rule: full blueprint,
   but the foundation is poured and load-tested before floor 30.

4. **One free insight type Lijo's framing unlocks — the REVERSE signal.** "Every market move lives in news"
   is *almost* true; some moves have **no news** (flow/positioning-driven). With prices + news in one system,
   the agent can flag **"price moved, NO news explains it"** — which is often *pre-news leakage* (somebody
   knows). That unexplained-move flag is itself a high-value insight stream (leak detector / early-warning),
   and nobody needs a new collector for it — both halves already exist in the DB.

**Net:** the vision lands as: *one causal world-model of Indian markets (multi-market nodes, cross-market
edges, specialist agents, shared memory), producing a continuous insight stream; trading rules are separate,
pre-registered consumers of that stream; tested before trusted; built at full quality in premise-retiring
order.* That is coherent, defensible, and bigger than SachNetra — correctly so.

---

## PART 3 — So, corrected, here's the system

1. **Separate app** (reads Railway PG, writes its own tables). ✅ as proposed.
2. **Layer 1 / Analyst (fast loop):** multi-agent + graph + per-company memory (MiroFish-shaped). Reads full
   articles, maintains the firm-relationship graph, emits **structured** per-event records. ✅ as proposed.
3. **Layer 2 / Strategy (slow loop):** a pre-registered, backtested **customer-momentum rule** on those
   records — **long-leg**, **low-attention-targeted**, **liquidity-filtered**, **net of cost**, **monthly**.
   ← *this replaces "the agent decides," and it's the change that makes the whole thing testable.*
4. **Validation before any money:** the three cheap "ifs" from Part 1 — (①) is the long-only leg positive net
   of cost? (②) does targeting low-attention/liquid suppliers help? (③) does it hold in India on the LLM
   graph? Plus the **scrambled-graph falsification** (shuffle the edges → signal must vanish, proving it's the
   *links* not sector drift).

---

## PART 4 — Verdict
- **Will it work?** The underlying effect is real and robust (CF 2008: ~18%/yr long/short, mechanism =
  slow diffusion in low-attention names = SachNetra's proven edge). **For SachNetra specifically it's a strong
  *pursue-and-test*, not a sure thing** — the long-only constraint removes the strongest (short) leg, it's
  untested in India, and the LLM graph adds a new quality risk. Honest expectation: a smaller-but-possibly-
  cost-surviving long-leg drift, *if* the three tests pass.
- **Is the architecture right?** **~80% yes.** Separate app ✅, agents+graph+memory ✅, fast ingestion loop ✅,
  per-company state ✅. **The one correction:** the **agent extracts, a tested rule decides** — never let the
  agent "decide what will happen" as the trade signal, because that's unbacktestable, look-ahead-prone, and
  the exact unwinnable question in disguise (MiroFish has no backtesting/look-ahead handling — proof of the
  risk). Two clocks: read fast, trade slow.

**You're not wrong — you're 80% right, and the 20% correction is the thing that keeps it honest enough to
trust with money.**

## Open questions for Lijo
- Agree to the **two-layer split** (agent extracts → rule decides)? If yes, I'll write it up as the build
  spec for the separate app + the Layer-2 experiment.
- For v1 graph: **listed↔listed only** (testable) and **long-leg only** (matches positioning), accepting the
  smaller expected return — or do you want to explore whether any borrow exists for a short sleeve later?
- Want me to **re-rank the program** with this economic-links system as the lead (paired with Candidate A for
  convex expression, insider/Exp21 as the cheap parallel) and write the sequence?
