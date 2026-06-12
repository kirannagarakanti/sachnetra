---
tags: [problem-solving, fresh-eyes, brief, news-brain, blueprint-review, phase-1.5]
status: ROUND 1 OPEN — brief drafted, awaiting model responses (Lijo distributes to multiple models;
  Claude converses with each through Lijo; log lands back in this note)
authored_date: 2026-06-12
protocol: ./_fresh-eyes-protocol.md (this is its first official assignment — the blueprint review, Phase 1.5)
related: ../2026-06-12_news-brain-build-blueprint.md (the design under review — NOT shown to the models in round 1)
---

# Fresh-Eyes Round — the Mind blueprint review (Phase 1.5)

## How this round works (the loop Lijo proposed)
1. Lijo pastes the brief below **verbatim** to several different models (different families: Gemini, GPT,
   MiniMax/maxhermes, etc.). One conversation per model, kept separate.
2. Each model gives its **own uncontaminated frame first** (the brief demands this).
3. Lijo brings each full response back here, labeled (Model A, Model B…). Claude (context anchor) drafts
   the follow-up replies; Lijo carries them back. Multiple back-and-forth rounds per model.
4. Only after a model's own frame is fully committed does Lijo reveal our plan (Claude will prepare a
   de-jargonized blueprint summary for round 2 when the first responses are in).
5. At the end: Claude writes the kept/killed synthesis into this note — what survived the reality check,
   what changes the blueprint.

## Handler notes for Lijo (read before pasting)
- **Paste the brief exactly as written** — it's deliberately in plain human voice with no project names.
- If a model asks questions, **bring the questions to Claude** rather than improvising answers — one
  accidental design word ("factor nodes", "the agent never trades" is already in the brief deliberately,
  but e.g. "graph", "router", "report card") can contaminate the frame.
- Don't confirm or deny a model's guesses about our design in round 1, even with "yes we thought of that."
- Capture **full responses**, not summaries — the throwaway lines are often the valuable ones.

---

## THE BRIEF (paste everything below this line, verbatim)

Subject: how would you build this? (and then tear apart my plan)

I'm building something with a friend and I want an opinion from someone who has zero context on our
project. I'll describe the situation, you tell me how YOU would approach it. After that I'll show you our
actual plan and I want you to attack it. Please don't be polite, be right.

Background. We're a two person team in India. Over the last year we built a data collection system that
pulls in about 2,500 Indian news articles a day from around 70 sources (refreshed every 10 minutes), plus a
Postgres database with daily prices for about 400 mid and small cap NSE stocks going back to 2009, over
300k corporate announcements from the exchange, bulk and block deal records, FII/DII flow data, and some
unusual stuff like daily electricity demand and highway toll volumes. It all runs on cheap cron jobs. The
data is honestly the best thing we have.

We trade (will trade) our own small capital only. Long-only Indian equities. Realistic all-in round trip
cost for us is about 2.5%, which is brutal and has killed almost everything we tried.

What we tried already: about 19 statistical experiments over the past months, done properly - pre-registered
hypotheses, placebo checks, out of sample windows, honest cost modeling. Nearly all failed. The consistent
lesson was that anything visible on a public feed is priced before a slow retail participant can act. Two
things survived. First, our pipeline sees corporate filings about 13 minutes before the newswires cover
them on large caps, and probably hours earlier on small caps, but our news-to-company tagging is too weak
to measure the small cap side yet (it's dictionary based, headline only, tags about 5% of articles).
Second, a fresh result from this week: we took 19 famous economically linked stock pairs - like a car maker
and a component supplier that depends on it, or a parent company and its listed subsidiary. After a 3
percent or bigger daily move in the prominent name, the linked name drifts in the same direction by roughly
1 percent over the following 20 trading days, measured above a random-date placebo baseline. At weekly
horizons the effect is mostly fake (generic sector momentum - the placebo caught it). The drift is strongest
where the supplier depends on a single customer, and in holding structures. It's weaker after 2022 but
still there.

What we want to build: an AI system that reads all this news continuously and maintains a live
understanding of which companies are affected by what - directly, and through connections: supply chains,
business group and promoter links, politics, weather, commodities, government schemes. The point is to
connect dots in less-watched companies before the market does. One thing we already decided and won't
change: the AI itself never makes trading decisions. It only produces structured, timestamped insights.
Trading rules are separate, boring, backtested things that may or may not consume those insights later.

Hard constraints: two people, Node.js and Postgres skills, AI budget between zero and 500 dollars a month
(we have free tiers and about 350 dollars in credits), no team of human labelers, and everything must be
reconstructible point-in-time so backtests can't cheat - this one is non negotiable, we've been burned by
look-ahead traps before. We don't currently store article body text, but the RSS feeds carry 1 to 3
paragraph descriptions we can start capturing.

My questions:

1. How would you architect this? Sketch whatever you want - components, data model, where the AI sits.
2. What would you build first, and what would you refuse to build until something else is proven?
3. Where do systems like this usually die? What failure would you bet on?
4. What's the cheapest test that would tell us we're wrong about the whole idea?
5. Anything in my description that sounds confused, or like I'm fooling myself?

Ask me anything about the data or constraints. But propose your own approach properly before asking to see
ours - I want your uncontaminated version first.

---

## Round-1 responses (append as they arrive)

### Model A — MiniMax (received 2026-06-12; full text in Lijo's MiniMax thread)

**Its frame (verbatim core):** *"The thing I think you're actually building is not 'an AI that reads news.'
It's a reconstructible corporate-relationship graph that happens to use an LLM as its ingestion pump…
If your architecture treats news as the product, you'll burn money."* Proposed 7 layers: raw append-only
store (+capture RSS descriptions "tonight") → canonical entities (~5–10k nodes, "not an LLM problem, a
data-engineering problem"; build from NSE/BSE lists + promoter data + manual business-group list) →
strict-JSON LLM extraction (cheap model, store prompt+response for audit) → relationship graph with
provenance + as-of on every edge → insight generation whose **schema literally forbids recommendation
language** → **separate deterministic rules engine, "No AI in this layer. Ever."** → dual eval
(point-in-time backtest + live shadow ledger that must agree).

**Build first:** entity canonicalization → pair backtest BEFORE any AI → extraction (month of dry-run vs
human spot-checks) → graph → insights. **Refuse:** LLM picking/ranking trades; ensembles; embeddings as
source of truth; graph enrichment from what the LLM "remembers" vs read.

**Death modes (its ranking):** 1) look-ahead creeping back ("make it physically impossible — every fact has
as_of, harness refuses newer"); 2) the pair edge too small vs costs; 3) entity-resolution drift; 4) cost
model honesty ("must survive 4%, not 2.5%"); 5) **"You become the model"** — temptation to read the graph
manually, stop backtesting, make calls that look like signal; 6) budget death (~$330/mo math; plan a
local-model pivot ~month 4).

**Kill test:** the pair backtest, point-in-time, net of costs, with controls we hadn't run: **30+ UNfamous
pairs**, inverted-pair (short) control, 5% trigger, T+5 exit, index-day exclusion, year slices; bar = net
Sharpe >~1.0 on a surviving sub-slice.

**"What sounds off" (its challenges):** famous pairs are the crowded end — *"the experiment you described
tests the wrong end of the distribution"*; 1% drift vs 2.5% cost doesn't work as a trade; "tagged 5%" is
the dictionary not the problem (claims 60–80% taggable — **factually wrong, see anchor notes**); 13-min
lead unexploitable on large caps and unmeasured where it matters; holding-structure drift is suspicious
(real intra-group revaluation vs fragile retail flow?); post-2022 weakening = racing against time?

**Its questions to us:** (1) famous-at-name vs famous-at-link in the 19 pairs? (2) is the 13-min lead
filing-vs-wire or feed-vs-wire?

**Anchor assessment (Claude):**
- **Convergent with our blueprint (validation):** graph-as-product; two-layer agent-extracts/rules-decide;
  strict schemas; as-of everything; entity layer first; cheap-model funnel; shadow ledger ≈ our report-card
  era. Independent reinvention by a context-free model = the design survives fresh eyes on shape.
- **New gifts to adopt:** (a) **"You become the model"** failure mode → add to blueprint pre-mortem;
  (b) **schema-forbids-recommendation-language** as a mechanical guard (upgrade over discipline);
  (c) **local-model pivot plan** for post-credits; (d) the P1a extensions (unfamous pairs, inverted control,
  index-day exclusion, T+5, 4% cost test) → P1a v2 run list; (e) "store prompt+response for audit".
- **It's wrong on:** the 5% tag rate (it's mostly the ~95% non-company-news DENOMINATOR, measured — not
  dictionary failure; its 60–80% estimate misreads the base rate); slightly strawmans us on 1%-vs-cost (we
  said gross-not-net ourselves).
- **Open question it sharpened:** holding-structure drift mechanism (mechanical NAV translation vs retail
  flow) — carried to the report-card era.

**Reply sent (drafted by Claude, carried by Lijo) — see chat log 2026-06-12:** answered its 2 questions
(pair-type split + per-pair results direction; filing-vs-wire definition), corrected the denominator fact,
acknowledged cost math agreement, committed to its P1a-v2 controls, and asked 4 uncontaminated follow-ups
(how to FIND unfamous pairs at scale in India; entity-resolution acceptance test without labelers; cheapest
"is this about a company" gate given the denominator; what data distinguishes holding-drift (a) vs (b)).
Plan reveal deferred to the message after.

### Model B — Kimi (received 2026-06-12; full text in Lijo's Kimi thread)

**Its frame:** *"The intelligence is in the data lineage, not the model… you compete on structural coverage
and temporal honesty."* Centerpiece = ONE table, `company_event_queue`, with the **two-timestamp law**:
`detected_at` (when WE saw it) vs `market_at` (when the market could know it) + `upstream_event_id`
(causal chain — filing→tag→linked-name→price, walkable). Backtests only read `detected_at ≤ sim_date`.
Company graph = **STATIC, human-curated from filings, versioned valid_from/valid_to — "Not inferred by
AI… If you didn't read it in an annual report or confirmed filing, it doesn't exist in your graph."**
Detector cascade: local cheap classifier ("is this about a company", conf ≥0.9, ~$0) → batched LLM
relationship-expander over the curated graph (~$100–200/mo) → rule-based filing linker. NOT build: vector
DB, continuous embeddings, fine-tuned relation extraction, real-time streaming.

**Build order:** Phase 0 = body text + event queue + point-in-time "religion" (test by deliberately trying
to cheat) + hardcode ONLY the 19 pairs. Phase 1 = **prove the FILING edge first** (claims it's our real
edge; counterfactual perfect-tagging Sharpe; train small BERT). Phase 2 = the 19 pairs as a system — gate:
the pipeline must **RECONSTRUCT the known +1% drift honestly** (not predict — reconstruct), Sharpe >0.5
net → else stop. Phase 3 = expand graph **manually only**, one detector type at a time, each with own
backtest. Refuse until Phase 2 proven: general relation-extraction, multilingual, dashboards.

**Death modes:** #1 LLM-inferred garbage graph ("every new relationship must survive a placebo backtest");
#2 undetectable look-ahead (RSS delays/retro-updates — `detected_at` must be processing time); #3 the AI
budget becomes a research budget (cap $300/mo until Sharpe>0.5); #4 "connection ≠ edge"; #5 scaling before
unit economics ("if it doesn't work on 19, it won't work on 400").

**Kill test ($50, one weekend, MANUAL):** for the 19 pairs × 20 biggest head-moves: read the actual
headline from our archive that day — *"would a human, knowing the relationship, have predicted the drift?"*
If >30% no → the drift is post-hoc narrative / not captured in headlines / AI solves the wrong problem.

**"Confused/self-deceiving" challenges:** the filing edge is the real edge, AI-news-analysis is the
distraction; "'probably hours' is dangerous"; **"the AI never decides" is partly cosmetic** (the rule will
be a thin wrapper — make the signal backtestable and uncorrelated with momentum); **"the market is not
missing connections — your 2.5% cost IS the market pricing them"**; the public-feeds-are-priced lesson
conflicts with building a feed reader unless connections are non-obvious. **Bet:** real edge = filing speed
+ 19 pairs; build AI first → "a beautiful pipeline that loses money slowly."

**Anchor assessment (Claude):**
- **Adopt:** (a) **two-timestamp schema** (`detected_at`/`market_at`) + `upstream_event_id` — crisper than
  our point-in-time prose; make it schema law in C9; (b) **the manual headline test → new probe P1e** —
  genuinely novel: P1a used price-defined events, deliberately agnostic to whether NEWS carried the cause;
  P1e tests the news-coverage link the Mind depends on; (c) **"reconstruct, don't predict"** as a Phase-4/7
  acceptance gate (pipeline must reproduce P1a's drift from its own records); (d) AI-spend cap tied to a
  backtest milestone; (e) "test point-in-time logic by deliberately trying to cheat."
- **It's wrong / lacks our evidence:** (a) "filing edge first" — we already ran the fast-capture test
  (Exp10/Exp17): day-0 filing reactions on tagged large caps are big but **fully priced by the same
  session's close**; the mechanical-speed edge is dead on the measurable side, which is exactly why we
  pivoted to slow diffusion. (b) It misread the 5%: **filings arrive company-keyed**; the tagging problem
  is the NEWS side. (c) "Pairs found because they drifted" — no: picked on link-fame before measuring;
  several picked pairs failed (diversified suppliers) — selection was on link-existence.
- **Open tension (vs Model A and our Linker):** Kimi = curated-only graph; MiniMax = LLM-extracted with
  provenance; us = LLM-proposed + multi-evidence + reflection-loop. Likely synthesis: **curated core
  (19→~50 from annual reports) + LLM-proposed expansion that must pass evidence + placebo gates.** To be
  settled in round 2 / blueprint amendment.
- **Sharpest line to keep:** *"Your 2.5% cost is the market telling you: we see it, but it's not worth
  trading after frictions."* The program's whole history in one sentence — and the reply: P1a's +1%/20d is
  measured ABOVE the day-0 pricing; whether it survives cost is precisely Layer-2's question, not assumed.

**Reply sent (drafted by Claude, carried by Lijo):** gave the Exp17 fact (large-cap filing reactions priced
by close), corrected the filings-are-keyed misread, defended pair-selection methodology (link-fame ex-ante,
failures observed), accepted the 5 gifts, asked 3 uncontaminated follow-ups (curation recipe + realistic
pairs/person-day for India's disclosure regime; classifier training data with no labelers; design the audit
that proves the AI isn't secretly the decision-maker) + hindsight-bias protocol for its own manual test.

### Round 2 — Model A (MiniMax) answers to our 4 follow-ups (2026-06-12)
1. **Unfamous-pair discovery:** candidate generator, not database — (a) annual-report LLM extraction
   (Business Overview / Risk Factors customer-concentration phrases; ~4,000 PDFs ≈ $80 one-time);
   (b) co-mention + linguistic cues over our own news archive; (c) **our 300k announcements corpus**
   (related-party, cross-holdings, schemes) — "highest-signal because point-in-time by construction" →
   500–2,000 candidate edges, backtest top 200. *"You don't need 30. You need 10 that pass — then the AI's
   job is to find 30 more like those 10."* Generator acceptance: hand-check 30 top-confidence pairs, ≥18 real.
2. **Entity-canonicalization acceptance without labelers:** known-answer precision set (≥75%),
   false-positive set (≤5%), idempotence/stability test, 1-hr/week spot audit. "Acceptance tests, not labels."
3. **Pipeline reorder:** YES — Gate A (hybrid dictionary→small-LLM tiebreaker, ~$15/mo) stops the 95%;
   LLM calls 75k→~8k/mo; **keep the rejected 95% as a background context store** for insight enrichment.
4. **Holding (a)-revaluation vs (b)-retail-flow:** split trigger events by
   `has_specific_corporate_event_in_±5d` (from announcements + bulk/block deals we hold) and compare bucket
   drifts; plus delivery-vs-traded volume ratio, pair-specific vs group-wide move, persistence past T+10.
   "A one-day test." → **queued as a P1a-v2 slice.**

### Round 2 — Model B (Kimi) answers to our follow-ups (2026-06-12)
1. **Phase-1 revision (after our corrections):** small-cap filing edge is measurable NOW without news
   tagging — filings are keyed + we have prices: bucket by time-of-day, post-filing returns vs matched
   placebo. "Zero AI budget and one SQL query." → **queued as probe P1f.**
2. **Hindsight-bias protocol for the manual test (P1e): the blinded-decoy design** — 20 real event
   headlines + 40 random-date decoys (same pairs, matched day-of-week/vol), shuffled by one person, scored
   0–5 by the other, reveal only at the end; Mann-Whitney U p<0.05. → **adopted as P1e's design.**
3. **India curation recipe:** ranked stack — our 300k announcements (schemes, shareholding patterns, RPT
   approvals, **credit-rating reports**, board outcomes) → annual reports (Ind AS 24 related-party note,
   MD&A, subsidiaries, secretarial audit) → DRHP/RHP risk factors → **ICRA/CRISIL/CARE rating rationales
   ("often the only place that states 'derives 40% of revenue from XYZ'")**. Throughput 8–20
   relationships/person-day; 2 people × 20 days ≈ **480 validated edges**. *"If you won't do 480 manual
   extractions, you don't actually believe in the curated-graph approach."*
4. **Classifier without labelers:** weak supervision from our ~44k dictionary-tagged positives;
   body-mention-but-untagged as hard negatives; dual-input DistilBERT; ONE round of self-training at
   conf>0.95; **the trick: classify MATERIALITY not aboutness — use our 300k filing headlines as free
   "material" positives.**
5. **The AI-boundary audit battery (answering our challenge):** substitution test (rule must execute
   identically on random/keyword/inverted signals), frozen-rule covenant (git-stamped, 90d live / 6mo
   paper), signal-only backtest (raw signal alone should LOSE; the rule's filters create tradability),
   adversarial split (one writes rule, other writes AI, frozen before meeting), 30-second explainability
   floor (no "the AI thinks…"), correlation ceiling on sizing, and the meta-test: **"can you shut off the
   AI for a week and still execute trades?"** → **adopt wholesale into Layer-2 governance.**

### Reveal sent (2026-06-12)
Both frames committed → de-jargonized blueprint revealed to both threads (same body, per-model attack
assignments). See chat log. Attack round open.

## Attack round (round 3, 2026-06-12) — both models attacked the revealed plan
*(Note: Kimi attacked WITHOUT the plan body — Lijo's paste omitted it — and still hit the main targets
from inference. MiniMax attacked with the full text.)*

**Convergent verdicts (both models, independently):**
1. **55 factor nodes is over-scoped for two people.** Kimi: "the number of relationships you can
   individually defend in a 2-minute conversation without notes" (≈15–25). MiniMax: "build 5, not 55…
   22,000 exposure weights to estimate, and the alpha lives entirely in those weights"; 2-month kill test
   (did the factor layer change anything downstream? if no, delete).
2. **The boring ops were missing and will bite at month 3:** graph-topology versioning (as-of on EDGES, not
   just facts), model-version pinning + frozen backtest pipeline, one-codebase/backtest-as-a-mode, position
   sizing & risk envelope BEFORE any rule, liquidity gate (ADV ≥ 5× position; "the tradable unfamous pairs
   are by definition the illiquid ones — your 2.5% is a LOW estimate there"), runbook, monthly confidence
   calibration, shadow mode for RULES not just analyst, 95%-reject storage policy.

**Kimi's sharpest hits:** (a) **"firing is not the same as predictive"** — our decay rule as worded would
key on co-occurrence; it must key on PREDICTIVE success (linked-name price response), else seasonal edges
never decay; (b) acceptance test lacked pre-registered error tolerance, false-edge placebo floor (<5% edge
rate on random-date news), temporal-stability slice (must reproduce the post-2022 weakening honestly), and
cost-integrated Sharpe; (c) boundary audit verdicts: substitution LIKELY FAIL (fix: flat 4-field signal
interface), frozen-rule PROBABLY FAIL (show the git hash), adversarial review FAIL ("two people who
designed it together — theatrical"), correlation ceiling LIKELY FAIL (fix: step-function sizing only),
**meta-test FAIL → fix: a parallel filings-only zero-AI paper rule as the AI-off fallback**; (d) the
LLM-edge graduation exam: 20 proposed edges frozen, blind 6-month forward test, ≥60% survive Sharpe>0.3.
(e) Run the small-cap filing SQL THIS WEEK (severity: critical).

**MiniMax's sharpest hits:** (a) won the edge debate with the **protected-class design**: `edge_class ∈
{curated, llm_proposed}` — curated = weight 1.0, no auto-decay, human-only deletion, wins conflicts;
llm_proposed = weight 0, earns by prediction, auto-decays; operational independence = different
source_type OR different time period; LLM evidence against a curated edge → `proposed_correction` queue,
human reviews ("don't let the LLM delete curated knowledge"); (b) **exposure weights from rolling return
correlation, not LLM fabrication** — data-driven, updates itself, "not a debate"; (c) routing needs 3
labels (company/factor/ignore), the 12 categories must NEVER become rule-engine weights ("hard-coded
priors"); (d) **the URL fetch is "the single highest-leverage capability in the plan"** but needs gating
(trusted-source list, paywall detector, per-source success tracker, daily cap); (e) **the no-news-move
auditor is a buried ALPHA stream, not an audit** — auto-scan announcements (RPT/deals/pledges, prior 5d)
and promote to structured insight; (f) single-target factor updates are fragile (OPEC article touches
crude+INR+shipping+fiscal+politics) — multi-target updates needed.

## KEPT / KILLED SYNTHESIS (the round's verdict — feeds blueprint amendment v0.1)

**KEPT (blueprint amendments):**
1. **Factor nodes: build 8–10, not 55** (crude, INR, repo, monsoon, 2–3 live schemes, election cycle); the
   55-list demotes to *vocabulary ceiling/backlog*; exposure weights **seeded from rolling correlations**,
   LLM annotates the why only; **2-month kill test** on the whole layer; multi-target factor updates.
2. **Two-class edge schema** (MiniMax's table, verbatim design) + **decay keyed to predictive success, not
   firing** (Kimi's catch) + operational independence definition + proposed_correction queue.
3. **Acceptance-test hardening:** pre-registered tolerance band on the reconstruction; false-edge placebo
   floor; temporal-stability slice; cost-integrated Sharpe final bar; decay-audit (edge half-life ≈
   empirical drift half-life).
4. **Boundary hardening:** flat 4-field signal interface; git-frozen rule covenant; step-function sizing
   only; **parallel filings-only zero-AI paper rule** as the shutoff fallback; LLM-edge graduation exam
   (20 frozen edges, 6-month blind forward test).
5. **Routing firewall:** 3 routing labels (company / factor:family / ignore); the 12-category taxonomy
   survives for corpus organization + factor-family dispatch but is firewalled from the rules engine.
6. **URL-fetch gating** per MiniMax's checklist. **Auditor promoted to alpha stream** (no-news-move →
   announcements auto-scan → structured insight).
7. **The month-3 ops list wholesale** (versioning, pinning, one-codebase, risk envelope, liquidity gate,
   runbook, calibration, filings-populated timestamps, rules shadow mode, reject-storage policy).
8. **New probes:** P1e (blinded-decoy headline test, Kimi's design), P1f (small-cap filing edge SQL — this
   week), P1a-v2 (unfamous pairs + inverted/index-day/T+5/4% controls + holding-(a)/(b) split).

**KILLED / REJECTED:**
- Kimi's *curated-only-forever* graph — rejected via MiniMax's protected-class argument (curated-only can't
  reach the unfamous pairs the whole thesis needs; precedence order solves the safety concern).
- Kimi's *paid third-party rule-writer* — parked on cost; mitigations adopted instead (published schema,
  frozen commits, substitution test).
- MiniMax's *collapse to 3 categories entirely* — partially rejected: 3 labels for ROUTING adopted, but
  factor-family dispatch needs the finer taxonomy; resolved by the rules-engine firewall.
- Kimi's *"factor nodes are a claim about how the world works… 15–25 max"* — accepted in spirit via the
  build-8-10 decision; the 2-minute-defense rule adopted as the node-addition bar going forward.

**The round's one-line lesson:** the fresh eyes didn't find the alpha — they found the *adult supervision*
(sizing, versioning, liquidity, runbooks) and the two places ambition outran verification (55 nodes,
decay-by-firing). Exactly what the protocol §0 predicted insiders can't see.

## Round 4 — closing responses (2026-06-12)

### Kimi's parting shot — three bets against the AMENDED design (all material)
1. **Correlation-seeded exposure weights (the amendment we took from MiniMax) — Kimi's #1 bet against:**
   *"Correlation is not exposure."* The sign of a return correlation encodes the narrative of PAST moves
   (crude-up-on-supply-shock vs crude-up-on-demand-boom have opposite sector implications); a rolling
   window erases that and will flip signs through regime changes. Predicts ≥2 factors trading the wrong
   direction within 6 months. **Fix: direction/sign must come from business structure (segment reporting,
   input-cost disclosures); "if you don't have that data, you don't have the factor node."**
   → **MODELS NOW DISAGREE** (MiniMax: correlation "is not a debate"; Kimi: correlation is the bug).
   **Anchor resolution: split the uses** — *sign/direction from fundamentals (curated, evidence-cited);
   correlation demoted to magnitude refinement and risk-clustering only, never a directional signal.*
2. **2-month calendar kill test is statistically meaningless for macro factors** (monsoon = 1 test/yr; repo
   = 1–2 MPC meetings). **Fix: event-count probation — a factor is judged after 3–5 relevant EVENTS, stays
   in probation indefinitely if none occur.** → adopted, replaces the calendar version.
3. **The analyst acceptance test is secretly a trading test:** if we TUNE the analyst to pass
   "status-changes-lead-price-moves," we've optimized it for alpha and the layer boundary is cosmetic —
   "the trading rule becomes a dummy that pulls triggers the analyst already aimed." Predicts: passes
   acceptance, rule profits 3 months, then dies (analyst overfit to the acceptance month).
   **Fix adopted: split the report card** — (i) *information-quality acceptance* (tunable: ≥95% factual
   accuracy on audited outputs, graph reconstructs the known pairs with correct lag structure, updates only
   after verified source publication times) vs (ii) *a one-shot FROZEN predictive exam* (pre-registered,
   run once per frozen analyst version, never tuned against; re-runs require a fresh held-out window and a
   logged trial count).
4. Smaller: the no-news-move auditor is "FOMO engineering" unless it carries direction. → resolved by
   MiniMax's earlier upgrade (auto-scan announcements for the filing-level explanation) **plus a firewall:
   it is a research/sentinel stream, not a rule input, until it passes its own gauntlet.**
5. Kimi's final forecast for the record: elegant build, pairs reconstruct, factor nodes beautiful in
   backtests, **first 6 months of paper flat-to-slightly-negative after costs; factor layer the culprit
   ("not because it's wrong — because it's unverifiable at your scale"); endpoint = trade the pairs +
   filings.** And the closing order: *"Go run the small-cap filing test. Everything else waits on that
   number."*

### MiniMax's closing deliverable — the position-sizing & risk envelope (adopted as Layer-2 risk annex)
Complete and concrete: 5% default / 8% ceiling per position · 15–18 target / 25 max positions · 15% cash
buffer (10% floor) · sizing = min(pct-cap, **0.20×ADV20**) · sector 25% / business-group 20% / pair 15%
caps · pledge>50% or mcap<₹500cr → 3% cap · drawdown ladder **−8% soft / −12% hard-stop+post-mortem /
−20% capital-preservation** · daily stop 1.5% / weekly 4% / no gain cap · spread <0.5% entry gate · min
hold 5d / max 60d re-justify · **no averaging down (hard rule)** · weekly pairwise-correlation check (>0.7
×2wk → close lower-conviction) · explicitly skips vol-targeting/Kelly/beta-hedging · calibration: ≥50% of
signals must clear the liquidity gate else the strategy is structurally constrained; envelope vs backtest
maxDD; loser-frequency tracking in shadow mode; quarterly recalibration.

**ROUND CLOSED.** Net effect on the program: blueprint v0.1 → **v0.2** (see blueprint §8 addendum). The
protocol's first run is complete: 2 models × 4 rounds, ~20 adopted changes, 1 design tension surfaced and
resolved, 2 probes ordered (P1f first — both models' final directive).

### Model C — Sarvam (Indian model, domain-consultant role, 2026-06-12; Lijo carried)
Used NOT for quant review but for India-local ground truth the foreign models lack. Four answers, three
genuinely actionable:
1. **Regional-language feed universe (new latency angle):** named outlets that cover small-cap
   results/promoter/plant news fast, often before English wires — Hindi: Business Bhaskar, Dainik Jagran,
   Amar Ujala, Hindustan · Gujarati: Divya Bhaskar, Sandesh · Marathi: Maharashtra Times, Lokmat · Tamil:
   Dinamalar, The Hindu Tamil · Telugu: Eenadu, Sakshi. Claims RSS exists for most. → **backlog probe:
   "regional-feed recon"** (verify feeds exist + carry timestamped company news) — a possible literal
   latency edge no English-only pipeline has. VERIFY before adopting (RSS claims may be confabulated).
2. **Supplier-customer sources — the best addition: INVESTOR PRESENTATIONS** ("Key Customers" slides,
   filed to the exchanges → likely already inside our 300k announcements corpus, searchable!) + ACMA vendor
   directories, brokerage channel-checks. → added to the P1a-v2 unfamous-pair generator source list,
   investor-presentations FIRST (highest precision, already in-house).
3. **Filing-type freshness (sharpens P1f's regex-dilution problem):** sequence = Board meeting → **Reg 30**
   (outcome summary, first signal) → **Reg 33** (detailed numbers); **newspaper-publication copies =
   stale duplicates** to EXCLUDE. ⚠ Sarvam's "Reg 32 = quarterly results" looks WRONG (Reg 32 is deviation
   in use of issue proceeds under LODR) — partially confabulated; verify category mapping against SEBI LODR
   before encoding. → P1f-v2: classify on Reg-33/30-equivalent categories, drop newspaper copies.
4. **Circuit bands:** confirmed mechanism — band-pinned days produce stair-step multi-day discovery; the
   close is meaningless when pinned; bands shown on NSE/BSE sites. **P1f implication, two-sided:**
   band-deferred discovery is GENUINE information drift (filing-caused) — but at a pinned band you often
   cannot get filled (buy queue at upper circuit), so band-driven drift is visible-but-rationed for a
   trader. → P1f-v2 slice: flag events whose day-0 |move| ≈ 5/10/20% (band-pinned proxy) and report drift
   with/without them.
**Net: Sarvam earns a standing role as the India-domain consultant in future rounds — pointers, not
authority; every specific claim verified before encoding.**

### Round 5 — Kimi's final word after the matched control (2026-06-12) — ROUND FORMALLY CLOSED

Kimi conceded the microstructure bet ("your magnitude-matched control killed my story cleanly… my
structural predictions were right; my economic conclusion was wrong — the good kind of wrong") and
**revised its forecast**:
- Filings upgrade from "weak prior" to **"a hard filter on direction + sizing moderator"** — the filing
  doesn't create trades, it **removes bad ones** ("a 2% move WITH a results filing → don't fade it; without
  → fade-able"). A calibrated binary switch that fires rarely and correctly.
- **The new strategic hypothesis (testable on data we already hold):** *"the 19 pairs may only work when
  the trigger move is filing-associated — pair drift without filing backing is placebo — endpoint = 6–8
  filing-conditioned pairs; smaller, cleaner, might actually survive costs."* → **P1a-v2 first cut: join
  p1a_events with the announcements corpus on (head symbol, event date ±1) and split pair drift by
  filing-backed vs not. One script, data in hand.**
- **Its full-revision conditions for the Jun–Nov confirmation (all go into the pre-registration):**
  (1) middle bucket holds ≥+0.4% incremental, t>4; (2) the band-pinned slice shows the signal concentrates
  on NON-circuit days (= extractable); (3) pre-registered pair×filing interaction: filing-backed pair
  triggers show ≈2× the drift of unbacked ones. Then it moves to *"modestly positive — a strategy that
  survives, not one that scales."*
- **Where its skepticism now lives:** fire-rate arithmetic — ~3 events/name/yr in the 1.5–4% bucket →
  maybe 30–50 pair-relevant trades/yr needing ~1.5% net each; *"the bridge from pulse to profit crosses
  the pair graph — your unproven layer."*
- Sign-off: *"Close clean. You've built something honest. The pre-registration will tell you if the
  honesty pays."*

### The interaction cut RAN (2026-06-12, `p1a-filing-interaction.mjs`) — KIMI'S HYPOTHESIS INVERTED
235 P1a pair events inside announcements coverage (≥2024-06), 15 heads. Backing rates: any-filing 181/235,
results-like 56/235. **Result: the drift lives in the UN-backed events:**
- Head moved ≥3% **WITH a filing** (n=181): linked-name drift ≈ **0** (−0.04%/+5d; +0.65%/+20d t=0.8).
  Results-backed (n=56): ≈0 as well.
- Head moved ≥3% with **NO filing** (n=54): **+1.05%/+5d (t=1.95) · +1.62%/+10d (t=2.0) · +2.76%/+20d
  (t=2.1).**
**Reading (probe-grade, low n, t≈2, multiple cuts — treat as hypothesis-generating):** when the head's move
has a PUBLIC cause, everyone can process the ripple → linked name priced fast → no drift. When the head
moves big with NO public filing — the move itself is the information (flows/leak/private) — the cause is
opaque, diffusion to the linked name is slow → the drift. **This inverts the conditioning rule Kimi
proposed ("trade filing-backed ripples") into: the prime ripple signal is the UN-NARRATED head move** — which
is precisely the Auditor's no-news-move stream (MiniMax's promoted alpha feature) crossed with the link
graph. Coheres with the program's whole history: public+watched = priced fast (18 nulls, Exp17/18);
opaque or unwatched = slow. No contradiction with P1f (that's OWN-name drift after own filings in illiquid
names; this is RIPPLE drift, fastest-priced when the cause is public). **Pre-registration consequence: the
Jun–Nov interaction test must be two-sided (backed vs unbacked, no presumed sign).** Reported back to Kimi.

### Round 6 — Kimi's response to the inversion (FINAL; thread closed by mutual agreement)
Full revision: **"filing-backed moves are efficiently priced… no-filing moves are the real signal — the
'someone knew' case your auditor flags is not a flag, it's the primary trading signal."** Revised endpoint:
**"3–5 pairs, no-filing trigger, illiquid linked name, structural link only (supplies/owns — not
exposed-to/same-sector)" — 20–40 events/yr, capacity under ₹50L — "a real strategy that survives, if the
numbers hold. That's fine. You're trading your own capital."** Still forecasts 6mo paper ≈ flat (one good
month, one block-deal ambush month). Two NEW dangers flagged (both adopted):
1. **Hindsight pair selection** — we discovered the no-filing pattern ON the 19 pairs; selecting future
   pairs by this pattern = selecting on the dependent variable. → pre-reg freezes the pair list (or a
   structural screen that doesn't use the signal) NOW.
2. **The unexplained-move mix** — no-filing moves blend insider info (drift+), block deals (no drift),
   pledge releases (drift−), MF rebalancing (random). → sub-filters required, and **we hold the data for
   them** (india_bulk_block_deals; pledge events in announcements) — the decomposition is buildable.
Its pre-reg spec (adopted into the draft): exact no-filing exclusion list + window; frozen pair eligibility;
direction rule + circuit-band handling; H: no-filing triggers > +0.8% incremental at 5d, t>2.0 vs matched
placebo; kill: no-filing drift negative OR filing-backed > no-filing. Sign-off: *"You followed the data
where it went, not where you wanted it to go. Close clean. The pre-registration is everything now."*

**FRESH-EYES ROUND 1 COMPLETE (6 rounds, 2 quant reviewers + 1 domain consultant).** Standing queue out of
the round: (1) pre-registration draft (Kimi freeze list + its 3 conditions + Reg-30/33 classification +
band slice), git-committed before the Jun–Nov window accumulates; (2) the pair×filing interaction cut;
(3) P1b/c/d probes; (4) P1e (Lijo's weekend, blinded-decoy design); (5) regional-feed recon (Sarvam list).
