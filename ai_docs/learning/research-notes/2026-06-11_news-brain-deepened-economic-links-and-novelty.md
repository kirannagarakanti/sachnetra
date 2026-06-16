---
date: 2026-06-11
problem: >
  "Dig deeper, read research papers, see what we can improve." Deepening the Frontier-LLM News Brain design
  (Candidate C + Lijo's ripple idea) against the actual academic literature. The headline finding: Lijo's
  "ripple effect" is not a hunch — it is one of the most robust documented cross-firm anomalies in finance
  (Cohen-Frazzini 2008, "Economic Links and Predictable Returns", >150 bps/month long-short alpha), it
  persists *because of* the exact mechanism SachNetra is built around (slow information diffusion in
  low-attention names), and modern LLM + graph methods now solve the one thing that historically blocked it
  (you couldn't build the firm-relationship graph — now an LLM builds it from text). This note grounds the
  design in 6 papers and lists the concrete upgrades. No code changes.
status: research synthesis — paper-grounded design deepening. Opinion + page/abstract-checked externals
  (2026-06-11). Mints no Exp ID. Companion to (and upgrades) the News Brain design note.
lane: Lijo (vision/decide) + James (build) + Claude (author task + research script)
tags: [research-note, design, llm, news-brain, economic-links, customer-momentum, supply-chain, ripple,
  network-centrality, news-novelty, tetlock, finmem, knowledge-graph, candidate-c, deepening]
sources_consulted: [
  "Internal: 2026-06-11_frontier-llm-news-brain-design.md; 2026-06-11_the-miracle-hunt-five-wall-breaks.md (C);
   _sentiment-chain.mjs; cluster_story_entity_architecture (threads+entities); project_g1_* (tagging)",
  "External, page/abstract-checked 2026-06-11:
   Cohen & Frazzini (2008) 'Economic Links and Predictable Returns', J. Finance — customer-supplier momentum,
     >150 bps/mo L/S alpha, ~monthly holding, mechanism = limited attention / slow diffusion;
   Menzly & Ozbas / 'Return Predictability Along the Supply Chain: The International Evidence' — holds across
     countries (incl. emerging);
   Madsen (2017) JAR 'Anticipated Earnings Announcements and the Customer-Supplier Anomaly' — predictability
     concentrates BEFORE the supplier's earnings; stronger for LOW-ATTENTION links;
   'Customer Momentum' (arXiv 2301.11394) + FactSet Insight — network-CENTRALITY weighting improves it; a
     graph-learning network-momentum strategy ~Sharpe 1.5, ~22%/yr vol-scaled 2000-2022;
   Tetlock (2011) 'All the News That's Fit to Reprint' — investors OVERREACT to STALE news (→ reversal) and
     UNDERREACT to NOVEL news (→ continuation); textual novelty measure;
   LLM supply-chain KG extraction: Tandfonline 2025 + arXiv 2408.07705 (zero-shot LLM builds supply-chain KG
     from text) + arXiv 2605.27845 (snippet-driven, 130,685 Chinese firms);
   LLM trading agents: FinMem (arXiv 2311.13743, layered memory + reflection + character), FinAgent
     (multimodal), TradingAgents (arXiv 2412.20138, multi-agent debate); arXiv 2512.23847 (look-ahead bias)"
]
---

# Deepening the News Brain: your ripple is a published anomaly — here's how to build it better than the textbook

> **The one-sentence finding that should make you sit up:** the "ripple effect" Lijo described — *news about
> company A should move company B because B buys from / competes with / supplies A* — is **Cohen & Frazzini
> (2008), "Economic Links and Predictable Returns,"** one of the most cited and robust cross-firm anomalies
> in all of finance: a long/short strategy on it earned **over 150 basis points per month** (~18%/yr), and it
> exists *only because* information diffuses **slowly** in names investors don't pay attention to. That is
> **literally SachNetra's proven edge (Exp4: early in low-coverage names) pointed at a published 18%/yr
> effect.** The reasons it's been hard to harvest are exactly the reasons a frontier LLM + your data now make
> it possible. This note reads the papers and lists the upgrades. **No code changed.**

---

## 0. TL;DR — the six papers and what each one changes about the design

| Paper (page/abstract-checked) | What it proves | What it changes in the News Brain |
|---|---|---|
| **Cohen & Frazzini 2008**, *Economic Links and Predictable Returns* (J. Finance) | Customer→supplier return momentum, **>150 bps/mo** L/S alpha, ~monthly hold; driven by **limited attention / slow diffusion** | The ripple is a **real, large anomaly** — promote it from "exciting but unproven" to "the lead feature." Aim the book at the documented effect, not a guess |
| **Menzly-Ozbas / "Supply Chain: International Evidence"** | The effect holds **across countries, incl. emerging markets** | Plausible in India (it's not a US-only artifact). Still must be tested on Indian data — but the prior is positive |
| **Madsen 2017** (JAR) | Predictability concentrates **BEFORE the linked firm's earnings**; strongest for **low-attention links** | **Time the ripple signal to the earnings calendar (V2-018 you own)** and **target low-coverage/microcap links** — exactly your zone |
| **"Customer Momentum" (arXiv 2301.11394) + FactSet** | Weighting by **network centrality** improves it; a graph-learning network-momentum book ≈ **Sharpe 1.5, 22%/yr** vol-scaled (2000-22) | Build a real **graph**, weight ripple by centrality, and consider multi-hop (1st–5th degree links carry signal) |
| **Tetlock 2011**, *All the News That's Fit to Reprint* | Investors **OVERREACT to STALE** news (→ reversal) and **UNDERREACT to NOVEL** news (→ continuation) | Make **novelty directional**: novel → trade *with* it (continuation); stale → *fade* it (reversal). A sign, not just a score |
| **LLM supply-chain KG papers** (Tandfonline 2025; arXiv 2408.07705; arXiv 2605.27845, 130k Chinese firms) + **FinMem/FinAgent/TradingAgents** | LLMs build firm-relationship graphs **from raw text**; layered-memory + reflection + multi-agent agents beat single-shot prompting | **Solves the historical blocker** (no Indian customer-supplier dataset → LLM builds it from your news). Adopt **layered memory + reflection** for the brain |

---

## 1. Why this is the most important thing in the whole miracle hunt

Re-read §0 row 1. Every other candidate in the miracle-hunt note is "plausible, go test it." **This one has a
published number an order of magnitude above the cost floor** *and* its persistence mechanism is the one thing
SachNetra has already proven it owns. The three facts line up almost too well:

1. **The effect is big.** >150 bps/month long-short (Cohen-Frazzini). Even after the honest haircuts (§5),
   that has real room above 100-250 bps cost — unlike the 0.5%/mo edges that died.
2. **The effect exists *because* of slow diffusion in low-attention names.** That is the exact academic phrasing
   of SachNetra's Exp4 latency edge and its small/uncovered-cap positioning. **You are not hoping the
   mechanism applies to you — you've measured that it does.**
3. **The historical blocker is now removed.** Cohen-Frazzini could only use Compustat "principal customer"
   disclosures — sparse, US-only, and *that scarcity is why the anomaly survived* (few people could map the
   links). **There is no equivalent customer-supplier dataset for India.** So historically you simply could
   not run this in India. **The 2024-25 LLM-knowledge-graph papers change that: an LLM reads news/filings/web
   text and *builds the relationship graph itself.*** The thing that made it impossible is now a frontier-LLM
   batch job — and the resulting India graph is a moat nobody else has.

> **This is the answer to "build something not many people can build."** Not the trade — *the graph.* A
> machine-built, continuously-updated map of who-supplies/competes/depends-on-whom across Indian listed +
> unlisted firms, extracted from your news corpus. Nobody has it for India. It's the asset under the trade.

---

## 2. The upgraded ripple design (better than the 2008 textbook)

Cohen-Frazzini propagate **returns** (wait for the customer's *price* to move, then buy the supplier next
month). SachNetra can do three things the textbook couldn't:

**Upgrade 1 — propagate the NEWS, not the lagged return.** Don't wait a month for the customer's price to
drift. The News Brain reads the *causal event itself* ("export duty on steel") and propagates the *expected*
impact to linked firms **the day the news breaks** — earlier in the diffusion curve. This is the latency edge
expressed through the link graph.

**Upgrade 2 — build the link graph from text with the LLM (the moat).**
```
news + filings + web snippets  ──►  LLM relation-extractor  ──►  india_firm_graph
   (your 435-feed corpus)            (zero-shot, per the KG papers)   nodes = firms (listed + unlisted suppliers)
                                                                      edges = supplies | competes | customer-of
                                                                              | owns | same-input | same-region
                                                                      each edge: confidence + evidence snippet + first/last-seen
```
Keep only edges seen in *real text*, multiple times, with a confidence score (anti-hallucination, §5).

**Upgrade 3 — weight + target the signal with what the papers found:**
- **Network centrality** (arXiv 2301.11394): a shock to a *high-betweenness* hub (it supplies many firms)
  ripples wider — weight those higher.
- **Low-attention targeting** (Madsen 2017): the alpha is **strongest where the linked firm has low analyst
  coverage / is a microcap.** Up-weight ripple signals into uncovered names; that's where the market is
  slowest and where SachNetra lives.
- **Earnings-window timing** (Madsen 2017): the predictability concentrates **right before the linked firm's
  earnings.** Cross it with your event calendar (V2-018): a ripple flag on a firm whose earnings is in N days
  is the highest-conviction version.
- **Hop decay**: 1-hop (direct supplier/competitor) strongest; 2–3 hops carry *some* signal (the papers test
  up to 5th degree) but weight them down hard.

**The conviction stack (what to actually trade):** `news event → LLM-extracted 1-hop link → linked firm is
low-coverage microcap → with earnings inside the window → centrality-weighted`. That specific cell is the
documented sweet spot, in the exact segment SachNetra is built for.

---

## 3. Make novelty *directional* (Tetlock 2011) — a free upgrade

The News Brain already plans a `novelty` score. Tetlock makes it a **trading rule with a sign**, which is far
more valuable than a number:
- **Novel news → investors UNDER-react → expect CONTINUATION.** Trade *with* the move; the drift is your friend.
- **Stale news (a rehash) → investors OVER-react → expect REVERSAL.** *Fade* the pop; it reverses next week.

So the brain should emit `novelty` **and** `staleness` (similarity to the thread's prior coverage), and the
downstream rule branches on it. This also protects you: without it, a book naively buys every "good news" pop —
including the stale rehashes that *reverse*. Tetlock says that's a systematic way to lose. The novelty sign
turns a vulnerability into an edge. (This is the same `novelty` field — now with a documented direction.)

---

## 4. Architecture upgrade — borrow from FinMem / FinAgent / TradingAgents

The 2024 LLM-agent papers show single-shot prompting is the weak version. Three upgrades that raise quality
and cut hallucination, mapped to what you already have:

1. **Layered memory per entity (FinMem).** Each firm/story-thread gets a memory of its prior news + the
   brain's prior reads. When new news arrives, retrieve the memory first. **This is how you compute novelty
   and narrative-acceleration correctly** — and you already have the substrate (story threads V2-013, entity
   timeline V2-014). FinMem's whole thesis is that layered memory beats flat prompting for trading.
2. **Reflection (FinMem/FinAgent).** Periodically the brain checks: *did my last read play out?* and updates.
   This is the anti-drift loop — it stops the brain repeating a wrong frame and is how it *learns* which link
   edges actually move prices (down-weight edges whose ripples never realise).
3. **Multi-agent debate for high-stakes events (TradingAgents).** For a big event, run a "bull analyst" and a
   "bear analyst" pass and a "risk manager" arbiter, instead of one opinion. Reduces one-sided hallucination
   and yields a calibrated confidence. Use it *only* on the filtered high-impact ~1% (cost discipline).

---

## 5. The honest caveats (the literature is loud — respect them or lose money)

1. **Turnover kills it if you're sloppy.** The customer-momentum literature is explicit: it needs **high
   turnover**, and **transaction costs can cannibalize the returns.** This is the *same cost-floor wall.* The
   mitigations are real but must be designed in: (a) target the **low-attention/microcap** links where the
   gross effect is biggest (Madsen) so there's room above cost; (b) trade the **highest-conviction cell** only
   (§2 stack) to cut turnover; (c) longer holds where the drift allows. **A broad, high-turnover version will
   die at 250 bps like everything else.** The bet is the *concentrated, targeted* version.
2. **Decay.** 2008 paper; attention has risen since (more quant, more coverage). The effect is likely *smaller*
   now — but it concentrates in **low-attention** names, which is precisely where decay is *slowest* (no one's
   arbitraging the Pune auto-parts maker). Recency-slice test is mandatory.
3. **Hallucinated edges.** An LLM will invent a supplier link. Mitigation: multi-evidence requirement,
   confidence threshold, the reflection loop that prunes edges whose ripples never realise, and **never trade
   a 1-name edge below confidence X.** Verify the graph against reality before trading on it.
4. **Look-ahead bias (arXiv 2512.23847).** Building the graph and scoring novelty must use **only information
   timestamped before** the trade date. The graph must be *as-of* (what did we know about the links *then*),
   not today's graph applied to the past. This is the subtlest and most dangerous bug; it makes a fake
   backtest look brilliant.
5. **India data scarcity cuts both ways.** No customer-supplier dataset = the moat (nobody else can do it) AND
   the risk (your LLM graph is the *only* source, so its quality *is* the strategy's quality). Budget real
   effort for graph QA.
6. **Still a feeder, in part.** The directional ripple book is the most "tradeable on its own" of the
   candidates — but it also makes a perfect **column for Candidate D** and a **surprise input for Candidate A**.
   Don't silo it.

---

## 6. Revised build order + how to test (paper-grounded)

1. **Scope full-article body capture** (the prereq from the design note — unchanged, still #1).
2. **Build the India firm-relationship graph from text** (LLM relation-extractor over the corpus, per the KG
   papers). *This is the new long-pole and the moat.* Start with 1-hop, high-confidence, listed names.
3. **Validate the graph** against any ground truth you can scrape (annual-report customer/segment mentions,
   known sector supply chains) before trusting it.
4. **Pre-register the experiment** (next free Exp ID): an event/return shock to firm A predicts a
   **post-public-disclosure** drift in linked firm B, **net of 250 bps**, **concentrated in low-coverage
   links** and **in the pre-earnings window** (Madsen), centrality-weighted. Falsification: scramble the
   graph edges → signal should vanish (proves it's the *links*, not just sector momentum). Reuse the Exp19
   harness as the panel/backtester.
5. **Add the directional-novelty rule (Tetlock)** as a second, cheap, independent test on the same harness.
6. **Layer memory + reflection (FinMem)** once the static version shows signal — it's an upgrade, not a
   prerequisite.

**First, cheapest gate (do before building the graph):** take ~20 recent big events on a firm with an
*obvious* public link (e.g. a large auto OEM and a known listed parts supplier) and eyeball — did the linked
firm drift *after* the news was public? If even the obvious 1-hop links show nothing post-disclosure, the
Indian market is faster than the prior suggests → cheap, early kill. If they drift → build the graph.

---

## 7. Verdict

**PURSUE — and this is now the strongest single thread in the entire program**, ahead of where Candidate C
sat an hour ago. Reasoning: it is the only idea that is simultaneously **(a)** backed by a published anomaly an
order of magnitude over the cost floor (Cohen-Frazzini >150 bps/mo), **(b)** persistent *because of* the exact
slow-diffusion-in-low-attention mechanism SachNetra has already proven it owns (Exp4 + microcap positioning),
and **(c)** newly buildable precisely because of the frontier-LLM-from-text method that didn't exist when the
anomaly was discovered — yielding a moat (the India firm-graph) that's valuable even if the trade underperforms.
The honest risks are real and all about **execution discipline** (turnover/cost, decay, hallucinated edges,
look-ahead) — not about whether the underlying effect exists. Build the body-text capture, build the graph
from text, test the obvious-links gate first, then pre-register the concentrated, low-attention,
earnings-windowed version. **Lijo's ripple was right; the literature has been calling it "economic links" for
17 years. We're just the first ones who can build the map for India.**

---

## 8. Open questions for Lijo
- **Graph scope for v1:** start with **only listed-to-listed 1-hop links** (cleanest, testable), or include
  the unlisted/private suppliers the LLM finds (richer, but unpriceable so only useful as context)?
- **Validation ground truth:** are you OK scraping annual-report "customer concentration"/segment disclosures
  to QA the LLM graph, or do we trust multi-source text agreement for v1?
- **Where this sits vs. the insider/Exp21 shot and Candidate A:** my read is this **becomes the lead**, with
  Candidate A (volatility) as the partner that gives it convex expression and the insider shot as the cheap
  parallel. Want me to re-rank the whole program around the economic-links graph and write the sequence?

## Sources (external, page/abstract-checked 2026-06-11)
- Cohen, L. & Frazzini, A. (2008). *Economic Links and Predictable Returns.* Journal of Finance 63(4). (>150 bps/mo L/S; limited attention.)
- *Return Predictability Along the Supply Chain: The International Evidence* (Menzly-Ozbas lineage; cross-country incl. emerging).
- Madsen, J. (2017). *Anticipated Earnings Announcements and the Customer–Supplier Anomaly.* Journal of Accounting Research 55(3). (Predictability before supplier earnings; stronger for low-attention links.)
- *Customer Momentum* (arXiv 2301.11394) + FactSet Insight, *Supply Chain Signals / Propagating Momentum Through Networks* (centrality weighting; network-momentum ≈ Sharpe 1.5, 22%/yr vol-scaled 2000-22).
- Tetlock, P. (2011). *All the News That's Fit to Reprint: Do Investors React to Stale Information?* RFS. (Overreaction to stale, underreaction to novel.)
- LLM supply-chain KG: Tandfonline (2025) *Enhancing supply chain visibility with KGs and LLMs*; arXiv 2408.07705; arXiv 2605.27845 (snippet-driven, 130,685 Chinese firms).
- LLM trading agents: FinMem (arXiv 2311.13743); FinAgent (multimodal); TradingAgents (arXiv 2412.20138). Look-ahead: arXiv 2512.23847.
