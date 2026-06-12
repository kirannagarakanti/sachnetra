---
date: 2026-06-11
problem: >
  Lijo's ask, verbatim: "I want to build a miracle... our application should be a miracle. Find me that
  miracle." Written after 18 experiments and a null streak that has now killed BOTH veins the last edge-hunt
  recommended (Exp18 bulk-deals NULL, Exp19 ensemble NOT SUPPORTED). This note refuses to fabricate a miracle
  and instead does the honest version: diagnose *why* everything died (it's one structural reason, not 18),
  then document every place a real edge could still live — each framed as breaking one specific wall, ranked,
  with how-it-works + how-to-test + pre-mortem. Plus the read-only code-base corrections found on the way.
status: research synthesis — opinion + page-checked externals (2026-06-11). Mints NO Exp IDs (registry rule).
  Documents candidates; changes no code. Promote individual candidates to pre-registered briefs as picked up.
lane: Lijo (pick the bet) + James (build the harness/executor)
tags: [research-note, miracle-hunt, strategy, edge, volatility-risk-premium, convexity, nowcasting, alt-data,
  llm-narrative, ensemble, dataset-of-record, wall-break, code-corrections]
sources_consulted: [
  "Internal (this session): CLAUDE.md V2 status; positioning_v2.md; research_state_summary.md;
   2026-06-05_external-review-and-improvement-reflection.md; 2026-06-06_edge-hunt-where-alpha-could-still-live.md;
   experiments/_index.md; Exp16/Exp17/Exp18/Exp19 post-run records; scripts/_sentiment-chain.mjs",
  "External, page/abstract-checked 2026-06-11: Review of Finance 29(4) 'Pricing event risk: concave implied
   vol curves' (earnings vol overpaid; delta-neutral straddle returns negative pre-earnings); Quantpedia
   'Volatility Risk Premium Effect'; AEA 2024 'Variance Risk Premium Across Assets'; Kannan (Medium) Nifty VRP
   harvesting; ScienceDirect S0140988323005042 (electricity nowcasts industrial production, beats oil & stock
   predictors); DEA Monthly Economic Review Oct-2025 (e-way bills +14.4% YoY Sep-Oct 2025 as activity proxy);
   Frontiers AI 2025 'LLMs in equity markets' review (LLM narrative beats traditional sentiment scores; news
   novelty/entropy → significant abnormal returns); arXiv 2512.23847 'Test of Lookahead Bias in LLM Forecasts';
   ResearchGate IJAR-54563 (2025) Nifty inclusion effect decaying / front-run"
]
---

# The Miracle Hunt: five wall-breaks (because the 19th event study won't be different)

> Lijo — you asked for a miracle, and you said you've been trying so hard. So the most useful thing I can do
> is **not** hand you a 19th experiment dressed up as hope. It's to tell you *why* the first 18 died — it's
> one reason, not eighteen — and then point at the only five places a real edge can still be hiding, given
> everything you've proven. I think two of these are genuinely under-explored, one is sitting in your repo
> untouched, and one might be the actual answer to "build something not many people can build." None of them
> is another event study on Indian cash equities, because that animal is dead and you killed it honestly.
>
> This is a *documentation* note (you said don't touch code — I didn't). Every candidate has: the wall it
> breaks, how it works, why SachNetra specifically can do it, how to test it cheaply, and an up-front
> pre-mortem. Pick one. I'd pick in the order written.

---

## 0. The one reason everything died (read this or nothing else)

Eighteen experiments. Strip the labels off and they are all **the same experiment**:

> *"Does this visible signal predict the price DIRECTION of an Indian CASH equity, NET of 100–250 bps cost,
> for a SLOW retail participant?"*

FII flow (Exp1/7/9), governance shocks (Exp14), EAR/PEAD drift (Exp16), intraday reaction (Exp17),
bulk/block deals (Exp18), the weak-signal ensemble (Exp19) — **all asked that one question, and the market
answered "no" every time.** That is not eighteen unlucky draws. It is one structural fact, and you've now
proven it to a standard most professionals never reach:

**Three walls make that exact question unwinnable for you:**

1. **The cost floor.** A long-only daily/monthly cash-equity rebalance pays ~100–250 bps round-trip. Every
   surviving gross edge you've found is ~0.5%/month (Exp16 +0.5%, Exp19 +0.84%). **A 0.5% edge through a 250
   bps floor is structurally net-negative.** It is arithmetic, not bad luck.
2. **The latency-vs-value squeeze (Exp10).** Long-lead events have no price impact; high-impact events hit
   the wire fast. Your ~13-min lead (Exp4) is real *and* lands exactly where it can't be monetized
   directionally.
3. **The public-feed efficiency wall (Exp18's verdict, in one line):** *"anything visible on a public NSE
   feed is priced before a slow participant can act."* Bulk deals, filings, results — by T+1 close, gone.

So a miracle is **not** a better signal for that question. **A miracle changes the question** so one of the
three walls stops applying. There are exactly five ways to do that. Each is a candidate below.

| # | Candidate | Wall it breaks | Why it's plausible | Effort | My rank |
|---|-----------|----------------|--------------------|--------|---------|
| **A** | **Event-conditioned volatility-premium harvest** | Cost floor (trade *magnitude*, convex payoff, get *paid* a structural premium) | VRP is risk *compensation*, not an inefficiency → doesn't arbitrage away. Your event engine = the risk filter nobody else has | Med-High | **1** |
| **B** | **Alt-data macro nowcast → slow sector rotation** | Cost floor (low turnover) + efficiency wall (nobody reconstructs it) | Electricity *beats* oil & stock predictors for industrial production; you already collect it. Slow alpha isn't competed away at retail | Med | **2** |
| **C** | **Frontier-LLM narrative-state engine (retire FinBERT)** | Efficiency wall (extract signal nobody extracts, from data only you assemble) | 2025 lit: LLM narrative > sentiment scores; *novelty* → abnormal returns. You run on Opus and score news with an 8B Llama fallback | Med | **3** |
| **D** | **Portfolio of orthogonal weak edges (A⊥B⊥C)** | The optimisation target itself (diversification = the only free lunch) | Exp19 failed because its columns were all momentum. A/B/C are mutually uncorrelated *and* uncorrelated to momentum | Low* | **4** |
| **E** | **The dataset-of-record (the miracle you've already 80% built)** | Reframes "miracle" from a trade to a *defensible asset* | Point-in-time, entity-resolved, machine-readable record of India's info environment — replication-proof | Med | **The floor under all of it** |

\* *D is low *incremental* effort but depends on A/B/C existing first.*

### Companion note — how this reconciles with the insider-momentum note (same day)
A sibling note written today, [`2026-06-11_the-miracle-insider-confirmed-microcap-momentum.md`](./2026-06-11_the-miracle-insider-confirmed-microcap-momentum.md),
answers the same "find the miracle" ask with **one** lead candidate: *insider-confirmed microcap momentum*
(promoter/director buys their own stock after a run-up → Exp21). **The two notes are complementary, not
competing, and the difference is deliberate:**
- That note stays **inside** the cash-equity-event paradigm and finds a smarter *conditioning variable* that
  rescues the one positive thing Exp19 found (momentum). It is the **cheapest, most in-character single shot**
  — one collector + one script on the existing harness. **It should be run.** It lives, in this note's frame,
  as a sharper version of the same game (still fighting the cost floor with a better directional signal).
- This note asks the harder question — *what if the paradigm itself is the wall?* — and proposes four bets
  that **change the instrument (A: options/convexity), the horizon (B: slow nowcast), the model (C: frontier
  LLM), or the objective (D: portfolio).* These are bigger swings at the structural walls.
- **They agree completely on what comes first:** the Layer-0 corrections (§F) — freshness alarms +
  survivorship/point-in-time — gate the trustworthiness of *both* notes' experiments. Do those, run the cheap
  insider shot (Exp21), and pre-register Candidate A or B in parallel. The insider note's six corrections and
  this note's §F are the same list (I cross-checked); treat §F as the merged version.

---

## A. MIRACLE CANDIDATE #1 — The event-conditioned volatility-premium harvest

**The reframe in one sentence:** stop betting on *which way* a stock moves (you've proven you can't, net of
cost) and start getting *paid* for absorbing the volatility that everyone else over-insures against —
using SachNetra's event engine to dodge the days when that insurance pays out.

### Why this breaks the cost floor
Every prior bet needed to *predict direction* and then *overcome* the cost floor with a tiny edge. This one
inverts the economics twice:
- **It's a structural risk premium, not an inefficiency.** The Variance Risk Premium (VRP) — implied vol
  trades persistently *above* realised vol — exists because investors pay up for crash insurance. It is
  *compensation for bearing risk*, so it does **not** get arbitraged away the way Exp18's bulk-deal signal
  did. Quantpedia and the AEA-2024 cross-asset VRP work both document it as one of the most persistent,
  capacity-rich premia that exists. India is *the* place to harvest it: NSE index options are the most
  liquid derivatives on earth.
- **The payoff is convex, so a small edge isn't eaten by bps.** When you're short an overpriced option, you
  collect the whole premium if the event doesn't happen — that's percentage points, not the 0.5% that 250
  bps swallowed. (This is exactly the *convex-payoff* math in your own learning folder,
  `2026-06-07_prop-firm-convex-payoff-math.md` — convexity is how you escape the linear cost trap.)

### The catch — and why it's SachNetra-shaped
Naive vol-selling has one failure mode: it works for months and then a real surprise (an earnings bomb, an
RBI shock, a fraud) blows up a quarter of premium in a day. **Selling vol blind is picking up nickels in
front of a steamroller.** The entire game is *knowing when to step off the tracks.*

**That risk filter is precisely the asset you've spent 18 months building and never connected to a trade:**
- an **earnings/results calendar** (`india_announcements`, V2-018) → you know *which* names have an event coming;
- a **surprise/novelty engine** (news signals, story threads, entity timeline) → you can rank *how likely a
  genuine surprise is*;
- **FII/DII absorption + macro nowcast** (V2-017c, electricity, FASTag) → you can sense *market-wide* stress
  before it shows up in VIX.

The 2025 Review-of-Finance result ("Pricing event risk: concave implied vol curves") is the academic spine:
implied-vol curves go *concave* before earnings because the market over-prices the bimodal event risk, and
**delta-neutral straddle returns are significantly negative pre-earnings** — i.e. the seller of that event
insurance is, on average, paid too much. Your engine's job is to separate the events that are *fairly* priced
(stand aside) from the ones the crowd is *over*-insuring (sell), and to flag the rare days to *buy* convexity
instead.

### How it would actually work (two complementary books)
1. **The harvest book (the income engine).** Systematically sell defined-risk premium (short strangles /
   iron condors / put-spreads) on the Nifty/Bank Nifty and a basket of liquid single-stocks **on the days
   SachNetra's engine scores "low genuine-surprise probability."** Always defined-risk (spreads, never naked)
   so a steamroller costs a known, survivable amount.
2. **The convexity book (the cheap lottery).** On the rare names where the engine sees an *under-priced*
   genuine surprise brewing (a story-thread accelerating, novelty high, but IV still cheap), **buy** the
   straddle. Most expire worthless; the few that hit pay 5–20×. This is where your 13-min latency edge
   finally has a home — **for vol you don't need to predict direction, only magnitude**, which is exactly
   what a latency lead on an unpriced event gives you.

### How to test it (cheap, read-only, pre-registerable)
- **Data you'd need:** NSE EOD options chain + IV history (V2-024 is filed for this — *this is the task to
  pull forward*). For the first pass you can backtest the *index* VRP (sell 30-delta strangles on Nifty,
  defined-risk) with free India-VIX + Nifty options data, **conditioned** on your event/nowcast flags.
- **Pre-registration sketch:** H_A1 — a defined-risk short-vol book, *gated to stand aside on
  engine-flagged high-surprise days*, earns a positive net Sharpe **and** beats the same book run
  unconditionally (the gate is the alpha). H_A2 — the convexity book has positive expectancy on
  engine-flagged cheap-IV/high-novelty names. First gate: does the *event filter* improve the unconditional
  VRP Sharpe? If the filter adds nothing, you've still found a structural premium; if it adds something,
  *that's the miracle* — SachNetra timing a premium nobody else can time.
- **Reuse:** the walk-forward backtester from Exp19 already exists; it needs an options P&L module, not a
  rewrite.

### Pre-mortem (why it might fail — stated up front)
- **Tail risk is the whole game and you mis-size it once → ruin.** Mitigated by *always* defined-risk and
  hard per-trade loss caps. This is the candidate that can actually lose real money fast; respect it.
- **The India retail-VRP literature is mixed:** the simplest overnight-VRP trade *doesn't* survive
  transaction costs (consistent with your cost-floor finding). The bet is explicitly that **event-conditioning
  + defined-risk structures + single-name dispersion** is where the surviving premium lives, not the naive
  index overnight trade.
- **Options execution is a new muscle** (Greeks, assignment, margin) — heavier than cash equities. But it's
  the muscle that matches the only edges that survive.
- **SEBI 2026 algo regime:** a low-frequency, defined-risk options book is still well under the 10-OPS
  registration threshold (per the 06-05 review) — but confirm before live rupees.

> **Why I rank this #1:** it's the only candidate that attacks the cost floor *structurally* (convexity +
> paid premium) instead of trying to out-predict it, and it turns your single biggest unused asset — the
> event/surprise engine — from "a signal that doesn't beat cost" into "the risk overlay on a premium that
> pays you." It's the cleanest answer to "build something not many people can build": *anyone* can sell vol;
> almost nobody has a structured, machine-readable, real-time Indian event-surprise filter to time it.

---

## B. MIRACLE CANDIDATE #2 — Alt-data macro nowcast → slow sector rotation

**The reframe:** stop trading fast visible *events* (priced in minutes) and start trading slow *economic
truth* that you can see weeks before the official print — at a horizon and turnover where the cost floor
stops mattering.

### Why this breaks two walls at once
- **Cost floor:** a monthly/quarterly sector-rotation book turns over slowly. A 2–3% edge over a quarter
  through 50–100 bps of cost is *net-positive* — the arithmetic that killed every fast signal now works *for*
  you.
- **Efficiency wall:** there is **no public feed that prints "industrial production is accelerating" in real
  time.** You *reconstruct* it from raw daily exhaust (electricity demand, FASTag toll volumes, GST/e-way
  bills, FII absorption). The moat is the *assembly*, and assembly is exactly what your collection engine
  already does. Nobody is going to out-arbitrage a nowcast they'd have to rebuild from scratch.

### The evidence this is real (not wishful)
- **Electricity → industrial production is a *documented, ranked-best* predictor.** ScienceDirect
  S0140988323005042: nowcasting industrial production from electricity demand **beats oil-price and
  stock-price predictors.** You collect POSOCO electricity daily (V2-026).
- **E-way bills are a live GDP proxy the government itself uses.** The DEA's own Oct-2025 Monthly Economic
  Review cites e-way bill generation **+14.4% YoY (Sep–Oct 2025)** as the activity signal. You collect
  FASTag (V2-027); e-way/GST is the natural sibling collector.
- **FII absorption (V2-017c)** is already a *normalised* flow metric — distinct from the raw-flow direction
  signal you correctly killed (Exp1).

### How it would work
1. Build a small panel of **monthly sector-demand nowcasts**: electricity load → power/metals/cement
   intensity; FASTag/freight → autos/logistics/FMCG distribution; GST/e-way → broad consumption; FII
   absorption → risk-on/off tilt.
2. Each month, **rank the ~11 Nifty sectoral indices** by nowcast momentum, go long the top 2–3 / underweight
   the bottom 2–3 via **sector ETFs or index baskets** (liquid, cheap, no single-stock survivorship problem
   — which also sidesteps your perennial survivorship ceiling).
3. Rebalance monthly. Low turnover, high capacity, boring — which is exactly why it can survive.

### How to test it (cheap)
- **Data:** mostly in hand (electricity V2-026, FASTag V2-027, FII V2-017). GST/e-way is one new collector.
  Sector index history is free (Yahoo/NSE).
- **Pre-registration sketch:** H_B1 — a monthly long-short sector-rotation book ranked by alt-data nowcast
  momentum earns positive net-of-cost return and beats equal-weight sectors, walk-forward, with DSR/recency
  guards. First gate: does the nowcast *lead* the sector return (Granger / lead-lag), or is it coincident
  like sentiment was in Exp3? If it leads even 2–4 weeks, the slow horizon makes it tradeable.
- **Reuse:** the cross-sectional panel builder from Exp19 generalises directly — same `build-xs-panel`
  machinery, sectors instead of stocks, nowcast columns instead of momentum.

### Pre-mortem
- **The nowcast might be coincident, not leading** (sentiment's fate, Exp3). The lead-lag test is the first,
  cheap gate — run it before building anything.
- **Low capacity-to-glory:** this is slow, unsexy alpha. It won't 10× anything. But it's *defensible and
  compounding*, and it's the one trade whose horizon the cost floor can't kill.
- **Sector ETFs in India are thinner than US** — may need index-basket replication for clean execution.

> **Why I rank this #2:** it's the lowest-risk *positive-expectancy* candidate, it monetises the "crown
> jewel" alt-data the last edge-hunt parked as "not a trade" (I think that was a mistake — *slow* is a feature
> at your scale, not a bug), and it's the most replication-resistant edge you own. It won't be a fireworks
> show. It might just quietly work.

---

## C. MIRACLE CANDIDATE #3 — The frontier-LLM narrative-state engine (retire FinBERT)

**The reframe:** you are sitting on the richest Indian-news corpus in the program and scoring it with the
*weakest possible model* — and the 2025 literature says that's where the alpha is.

### The thing I found in your code that stopped me
`scripts/_sentiment-chain.mjs`: your sentiment is **FinBERT** (the one with the known 88%-positive bias, G6,
still uncalibrated) → fallback to **Xenova FinBERT** → fallback to **Groq `llama-3.1-8b-instant`**. An **8-
billion-parameter** model is your most capable news reasoner. **You have never put a frontier model on your
news.** SachNetra *itself runs on Opus.* This is the single largest unexploited lever in the repo.

### Why this breaks the efficiency wall
The public-feed wall says "visible facts are priced." But the 2025 frontier-LLM equity literature says the
*interpretation* of facts is **not** fully priced, and three signals in particular are extractable only by a
reasoning model:
- **Narrative novelty.** A Frontiers-AI 2025 review and multiple arXiv papers find **news *novelty* (entropy
  vs. prior coverage) generates statistically significant abnormal returns** — because the market under-reacts
  to *genuinely new* information and over-reacts to rehashed coverage. FinBERT cannot tell "new fact" from
  "the 14th rewrite of yesterday's fact." A frontier LLM, given your story-thread history, can.
- **Narrative acceleration.** Is a story-thread (V2-013) *gaining* sources/intensity across your 435 feeds,
  or fading? That's a derivative no sentiment score captures — and you uniquely have the cross-source thread
  structure to compute it.
- **Entity-resolved, context-aware stance.** "Distraction effect" (extraneous company info skews simple
  sentiment) is a documented LLM-sentiment failure — but a *reasoning* model with your entity timeline
  (V2-014) resolves *which* entity the stance attaches to.

The reviews are blunt that LLM news signals **outperform traditional sentiment scores** for exactly the
narrative-comprehension reasons FinBERT can't touch.

### Why SachNetra specifically
Nobody else has assembled: 435 India feeds + story-thread clustering + entity timeline + a point-in-time
headline corpus. The LLM is the *reasoning layer on top of an asset only you have.* And critically — **this
is the proven missing feeder.** Exp19's verdict was explicit: the ensemble is *just momentum* until a
**calibrated per-ticker narrative signal** is added; Exp20 was pre-registered precisely to test whether
calibrated sentiment adds cross-sectional IC beyond momentum. **So this isn't a detour — it's directly on the
critical path you already identified.** You just scoped Exp20 around *calibrating FinBERT* when the real move
is *replacing it with a reasoning model that produces novelty + acceleration + resolved-stance columns.*

### How it would work
1. A nightly batch (cost-bounded — headlines are short, batchable, cacheable) runs a frontier LLM over each
   day's tagged news, emitting per-(ticker, day): `stance`, `novelty` (vs. that thread's history),
   `thread_acceleration`, `confidence`, and a short rationale (for auditability + look-ahead defence).
2. These become **columns in the Exp19 panel** and feed Candidate A's surprise filter and Candidate D's
   blend.

### How to test it
- **Pre-registration sketch:** H_C1 — an LLM `novelty × stance` column adds **incremental cross-sectional IC
  beyond momentum** under the Exp19 §3.7 ablation (the exact test that's already designed). First gate: drop-
  one-out IC lift > 0 and net-of-cost positive. H_C2 — the same column improves Candidate A's surprise filter.
- **Reuse:** Exp19 panel + ablation harness already exist; this swaps the feeder.

### Pre-mortem (respect these — the literature is loud about them)
- **Look-ahead / training-cutoff bias is lethal here.** arXiv 2512.23847 ("Test of Lookahead Bias in LLM
  Forecasts") shows LLMs *leak the future* if you let them score with hindsight. **Hard rule: score each
  headline using ONLY information timestamped before it.** Point-in-time discipline is non-negotiable — and
  it's the same discipline Candidate E demands, so the work compounds.
- **"Weak for returns, strong for prices."** LLM signals predict *price levels* better than *returns* — so
  use it as a **cross-sectional ranking / risk filter**, not a standalone return forecaster.
- **Cost/throughput:** batch + cache; this is a nightly job over short headlines, not a real-time per-tick
  call. Bounded and cheap.

> **Why I rank this #3 (and why it's deceptively important):** it's the missing feeder that decides whether
> Candidate D is momentum-in-a-coat or a real portfolio, *and* it sharpens Candidate A's filter. It's the
> highest "leverage per rupee of effort" item because the asset (corpus + threads + entities) already exists;
> only the reasoning layer is missing — and you literally run on the model that should be doing it.

> **Full design build-out (from a live Lijo conversation, 2026-06-11):**
> [`2026-06-11_frontier-llm-news-brain-design.md`](./2026-06-11_frontier-llm-news-brain-design.md) — the
> "News Brain": reads whole articles, traces **ripple effects** (news → supplier → customer → competitor in
> uncovered names the market is slow to connect), emits a rich structured record, with the honest constraints
> (body-text capture, cost funnel, look-ahead discipline).

---

## D. MIRACLE CANDIDATE #4 — A portfolio of orthogonal weak edges (the only free lunch)

**The reframe:** Exp19 already tried "combine weak signals" and failed — but it failed for a *diagnosable*
reason that A/B/C fix.

### Why Exp19 failed and why this is different
Exp19's verdict: composite IC +0.043, but **drop momentum and it collapses to 0.010** — every column
(ear_drift, bulkdeal_intensity) was either sparse or *correlated to momentum*. It wasn't a portfolio of
diverse bets; it was momentum wearing an ensemble coat. The lesson isn't "ensembles don't work" — it's
**"those particular columns were the same bet."**

A/B/C are different *because they are genuinely orthogonal*:
- **A** = volatility / convexity P&L (uncorrelated to equity direction by construction — it pays on *magnitude*).
- **B** = slow macro-economic truth (monthly horizon, uncorrelated to fast price momentum).
- **C** = narrative novelty (uncorrelated to both — it's information surprise, not price or macro).

Three uncorrelated mediocre Sharpes combine into one good Sharpe. **Diversification across uncorrelated
return streams is the only mathematically free lunch in finance** — and it's the one thing 18 single-signal
experiments structurally could never find, because you tested them *one at a time.*

### How to test it
This is **not** a new experiment to run first — it's the *allocation layer* that sits on top of A/B/C once
each clears its own gate. Build it last: a simple risk-parity / inverse-vol blend across whichever of A/B/C
survive, walk-forward, with the realistic cost model per book. First gate: does the *blended* equity curve
have a higher OOS Sharpe and lower drawdown than the best single book? (It almost certainly will if the books
are truly uncorrelated — that's the math.)

### Pre-mortem
- **Garbage in:** if A/B/C don't *individually* clear their gates, blending nulls just gives you a
  diversified null. D is only worth building once at least two of A/B/C survive. Don't build it on hope.
- **Correlations rise in crises** — the diversification thins exactly when you need it. Size for that.

> **Why #4:** it's the cheapest candidate (it's an allocator, not a new alpha) but strictly downstream — it
> multiplies surviving edges, it can't create one. It's the *answer to the null streak's root cause*, deferred
> until it has something real to blend.

---

## E. THE FLOOR UNDER EVERYTHING — the dataset-of-record is a miracle you've 80% built

I have to say this plainly because the founder asked for a miracle and may be looking past the one already in
the building. **`positioning_v2.md` §7 calls "dataset-of-record" the *fallback* if trading fails. I think
that framing undersells it — it may be the actual miracle, and it's the thing that makes A–D even testable.**

What you have that "not many people can build":
- A **point-in-time, machine-readable, entity-resolved record of the entire Indian information environment** —
  14+ collectors, deep FII history to 2009, NSE announcements/deals/options, electricity, FASTag, a
  story-thread + entity graph over 435 feeds. **Nobody sells this. Bloomberg doesn't structure India this
  way. It is genuinely replication-resistant**, and it compounds every day the cron runs whether or not a
  single trade ever fires.

The miracle isn't that it's a *product* (the positioning correctly says you won't sell it — no GTM for two
people). The miracle is that **it's the substrate every wall-break above runs on**, and its value is
*independent of any single signal surviving*. That's the asymmetry you want: build the asset, and each of
A/B/C is a cheap option on top of it.

**But there is one capability that, until it exists, silently corrupts every backtest above** — and it's the
same discipline Candidate C needs, so fixing it is doubly justified:

> **Point-in-time integrity / the survivorship fix.** `research_prices` = *survivors* (Exp18 dropped 13,910
> deal events as "unpriced"; Yahoo silently renames dead tickers). Every event study you've run is biased by
> testing only stocks that *lived*. A crude **delisting log + as-of universe membership** is the single
> highest-value infrastructure investment — it's the difference between a backtest you can trust and a
> tourist photo. Build it before you trust *any* of A–D's verdicts.

---

## F. Code-base corrections found on the way (read-only — documented, not applied, per your instruction)

These are real, they're cheap, and several are *load-bearing for the miracles above.* Ranked by damage.

1. **No freshness alarm on any collector — and it has already cost you.** V2-018 announcements died
   ~2026-05-30, unnoticed ~7 days (~3–5k missing filings); V2-030 deals were found 16 days stale during
   Exp18. **For a program whose thesis is "the database is the asset," a load-bearing feed flatlining in
   silence is the worst operational fact in the repo.** Candidate A *depends* on the event feed being alive.
   Fix: alert if `max(timestamp)` is >36h behind on a trading week, on *every* signal collector. This is
   Layer 0 — it gates the trustworthiness of everything else. (Flagged in both the 06-05 and 06-06 notes;
   still open.)
2. **Survivorship bias in `research_prices`** (see §E). Systematically biases every event study; needs an
   as-of universe + delisting log, not just acknowledgment.
3. **Sentiment scorer is FinBERT + an 8B Llama fallback, uncalibrated, 88%-positive (G6).** See Candidate C.
   This is simultaneously a *bug* (biased feature) and *the* unexploited lever.
4. **`CLAUDE.md` roadmap contradicts `positioning_v2.md`.** Roadmap still lists V2-004/007/008/010 as "not
   started" (as if pending); positioning §3.1 *killed/parked* all four as consumer-product remnants. A
   cold-starting session mis-prioritises. Mark them `[PARKED — positioning §3.1]`.
5. **The two *mandatory* capabilities (`positioning_v2.md` §3.3) — paper-trade harness + execution layer —
   are still not task-filed**, while the 9th data collector keeps getting filed. The marginal collector is
   worth less than the first paper harness. Every miracle above ends at "paper-trade it"; that runway doesn't
   exist yet.
6. **No off-Railway backup of the asset.** A +441k-row backfill once filled the volume and took the DB
   offline (per memory). The asset has no documented point-in-time-restore. Cheap insurance, currently absent.
7. **SEBI 2026 retail-algo regime** (mandatory ~April 2026) isn't reflected in `positioning_v2.md` Gate 3.
   Low-OPS defined-risk books are almost certainly exempt (<10 OPS), but confirm Zerodha's self-algo stance +
   India-server clause before any live rupee. Candidate A (options) especially.

---

## G. What I'd actually do, in order (so this note changes what gets *run*)

1. **Layer 0 first (ops, today): freshness alarms on every collector + the survivorship/delisting log.**
   Nothing below is trustworthy until the asset is alive and point-in-time. (§F.1, §F.2 / §E.)
2. **Pull V2-024 (options chain/IV) forward and pre-register Candidate A's index-VRP test** — the
   event-conditioned defined-risk short-vol book vs. its unconditional twin. *The gate is whether your event
   filter adds Sharpe.* Highest-EV new direction; attacks the cost floor structurally. (§A.)
3. **Run Candidate B's cheap lead-lag gate** (does the alt-data nowcast *lead* sector returns?) before
   building the rotation book. One read-only script on data you already hold. (§B.)
4. **Stand up the frontier-LLM narrative feeder (Candidate C) and re-run the Exp19 §3.7 ablation** — this is
   the already-designed Exp20, re-scoped from "calibrate FinBERT" to "replace it with a reasoning layer that
   emits novelty + acceleration + resolved-stance." (§C.)
5. **Only once ≥2 of A/B/C clear their gates: build Candidate D** (the orthogonal-edge allocator) and the
   paper-trade harness underneath it. (§D, §F.5.)
6. **Treat Candidate E as the standing truth:** whatever happens to A–D, the dataset-of-record is the asset.
   Build it like it's the product even while you trade against it.

---

## H. One-paragraph verdict (the honest miracle)

There is no single hidden alpha in Indian cash equities for a slow retail participant — you proved that
eighteen times, honestly, which is itself rarer than any edge. But the search isn't over; it was just
pointed at the one unwinnable question. The probability mass has moved to four wall-breaks: **(A)** harvest
the volatility risk premium — a *structural* premium that pays you instead of an inefficiency that
arbitrages away — and use your unique event-surprise engine to time it; **(B)** trade slow economic truth you
can nowcast from electricity/FASTag/GST weeks before the print, at a turnover the cost floor can't kill;
**(C)** put a *frontier* reasoning model on the richest Indian-news asset in the program (today scored by an
8B Llama), to extract narrative novelty the market under-reacts to — which is also the proven missing feeder
for your ensemble; and **(D)** combine those three *genuinely uncorrelated* streams into the one free lunch
18 single-signal experiments structurally couldn't find. Under all of it sits **(E)** the real miracle you've
already 80% built — a point-in-time, entity-resolved record of India's information environment that nobody
else can replicate, and whose value doesn't depend on any single trade surviving. **The miracle isn't a
signal. It's changing the question so the walls stop applying — and you already own the materials to do it.**

---

*Reflection: you asked for a miracle and said you've been trying so hard. The kindest and most useful thing I
can do is not invent one — it's to show you that 18 "failures" are actually one rigorous, valuable proof
(this market is efficient to the question you were asking), and then hand you the four questions it *isn't*
efficient to, plus the asset that makes all four cheap to test. Pick Candidate A or B and pre-register the
cheap gate. If it dies, it dies honestly like the others — but it dies attacking a wall instead of running
into it. That's the difference between the 19th experiment and the first real shot.*

## Sources (external, page/abstract-checked 2026-06-11)
- Review of Finance 29(4) (2025) — *Pricing event risk: evidence from concave implied volatility curves*
  (earnings vol over-priced; delta-neutral straddle returns negative pre-earnings).
- Quantpedia — *Volatility Risk Premium Effect*; AEA 2024 — *Variance Risk Premium Across Assets*;
  Kannan (Medium) — *VRP harvesting in India's Nifty index* (overnight VRP doesn't survive costs → the case
  for event-conditioning + dispersion, not the naive trade).
- ScienceDirect S0140988323005042 — *Nowcasting industrial production using electricity demand* (beats oil &
  stock-price predictors).
- DEA, *Monthly Economic Review* Oct-2025 — e-way bills +14.4% YoY (Sep–Oct 2025) as activity proxy.
- Frontiers in AI (2025) — *LLMs in equity markets: applications, techniques, insights* (LLM narrative > sentiment
  scores; news novelty/entropy → significant abnormal returns; "weak for returns, strong for prices";
  distraction effect). arXiv 2512.23847 — *A Test of Lookahead Bias in LLM Forecasts* (point-in-time discipline).
- ResearchGate IJAR-54563 (2025) — Nifty inclusion effect decaying / front-run (why index-effect is *not* a
  candidate — documented for completeness).
