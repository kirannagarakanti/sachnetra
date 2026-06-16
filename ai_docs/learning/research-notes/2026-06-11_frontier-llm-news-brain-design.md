---
date: 2026-06-11
problem: >
  Lijo got excited about Candidate C (retire FinBERT, put a frontier reasoning model on the news) from the
  miracle-hunt note and started designing it live. This note CAPTURES that conversation and builds it out:
  the vision is a frontier-LLM "news brain" that (1) reads the WHOLE article not just the headline, (2) every
  ~10 min on the existing cron, (3) on tagged/structured news, and (4) traces RIPPLE EFFECTS — e.g. political
  news → market → a small regional company → the other companies that buy/use its product. Documents how it
  works, what it outputs, the honest constraints, and "what else" a smart reader could do. No code changes.
status: design note — captures a live design conversation + expands it. Opinion + grounded in the repo's real
  pipeline shape. Mints no Exp ID. Promote to a V2 task + a pre-registered experiment when picked up.
lane: Lijo (vision/decide) + James (build the collector/worker) + Claude (author task + research script)
tags: [research-note, design, llm, frontier-model, news-brain, finbert-replacement, ripple-effect,
  causal-graph, supply-chain, tagging, g1, sentiment, narrative, candidate-c]
sources_consulted: [
  "Internal: 2026-06-11_the-miracle-hunt-five-wall-breaks.md (Candidate C); scripts/_sentiment-chain.mjs
   (the FinBERT→Xenova→Groq-8B chain this replaces); CLAUDE.md architecture (seed-india-signals reads Redis
   digest every 10 min; sole ticker-tag write at :341); project_g1_execution_plan + project_g1_post_deploy_state
   (tagging is headline-only today; body text not in pipeline); cluster_story_entity_architecture (threads+entities)",
  "External (from the miracle-hunt note, page-checked 2026-06-11): Frontiers-AI 2025 'LLMs in equity markets'
   (LLM narrative beats sentiment scores; novelty/entropy → abnormal returns; 'weak for returns, strong for
   prices'; distraction effect); arXiv 2512.23847 'Test of Lookahead Bias in LLM Forecasts'"
]
---

# Design: the Frontier-LLM "News Brain" (Candidate C, fleshed out with Lijo's ripple idea)

> **This note documents a live design conversation (2026-06-11).** Lijo read the miracle-hunt note, landed on
> Candidate C, and started specifying it: *"finbert we can change that… the AI gets news in structure, we tag
> every news… sometimes political news affects Indian stock markets, affects small companies in the area,
> which affects other places where they use the product… an AI reads every 10 minutes… the AI can read the
> whole article."* That last bit — **the ripple effect** — is the heart of it, and it's the thing FinBERT
> physically cannot do. This note writes it up and answers his "come, what else." **It changes no code.**

---

## 1. ELI-teen — what we're building

Right now a dumb robot reads only the **headline** of each news story and says "happy 😀 / sad 😟." That's it.
It can't read the article, it can't think, and it definitely can't figure out *consequences*.

We replace it with a **smart AI that reads the whole article and thinks like an analyst.** For every story it
asks: *"Okay, this happened — so what? Who wins, who loses, and who ELSE gets hit two steps down the line?"*

Lijo's example, which is exactly the magic:
> A new government rule comes out (political news) → it hurts the steel industry → a *small* steel company in
> one state gets hit → but that small company is the main supplier to three other companies that *use* its
> steel → so *those three* are about to feel it too, even though the news never mentioned them.

A headline-reader sees "government rule, steel." **A thinking AI sees the whole chain of dominoes.** That
chain — predicting the 2nd and 3rd domino *before* the market connects the dots — is where the money could be,
because the market is slow to connect dots in small, uncovered companies (that's literally SachNetra's one
proven edge: being early in low-coverage names).

---

## 2. The three things Lijo specified (and why each matters)

| Lijo said | What it means technically | Why it matters |
|---|---|---|
| **"finbert we can change that"** | Replace the `FinBERT → Xenova → Groq-8B-Llama` chain in `_sentiment-chain.mjs` with a frontier reasoning model | FinBERT outputs one number (pos/neg) and is 88% positive-biased. A frontier model outputs *reasoning*: affected tickers, direction, magnitude, novelty, ripple targets |
| **"the AI gets news in structure, we tag every news"** | The **tag layer (G1)** runs first → AI receives news already linked to a company/sector | The AI needs to know *what a story is about* to reason about consequences. **G1 is the prerequisite, not optional** |
| **"the AI can read the whole article"** | Feed the AI the **full article body**, not just the headline | The ripple chain (supplier→customer) lives in paragraph 6, never the headline. **This is the biggest change** — see the honest constraint in §6 |
| **"reads every 10 minutes"** | Runs on the existing Railway cron cadence (the one `seed-india-signals.mjs` already uses) | No new infrastructure rhythm — it slots into the pipeline that already runs |

---

## 3. What the News Brain outputs for every article (the structured record)

Instead of FinBERT's single `score: 0.87`, the frontier model returns a rich, **auditable** JSON object per
article. This is the new asset — a *reasoned* row, not a *guessed* number:

```jsonc
{
  "primary_entities":   ["TATASTEEL"],          // who the story is literally about (from the tag layer)
  "event_type":         "regulation",            // earnings | M&A | regulation | management | macro | …
  "novelty":            0.9,                      // 0–1: is this GENUINELY new, or the 14th rewrite? (key!)
  "direct_impact": [
    { "ticker": "TATASTEEL", "direction": "negative", "magnitude": "high", "confidence": 0.8 }
  ],
  "ripple_impact": [                              // THE LIJO FEATURE — 2nd/3rd-order targets
    { "ticker": "MARUTI",  "direction": "negative", "via": "buys steel from affected supplier",
      "hops": 2, "confidence": 0.45 },
    { "ticker": "JSWSTEEL","direction": "positive", "via": "competitor gains share",
      "hops": 1, "confidence": 0.5 }
  ],
  "time_horizon":       "weeks",                  // does this matter today, this week, or this quarter?
  "is_pump_or_rumor":   false,                    // fake/promotional news filter
  "rationale":          "New export duty on steel raises input cost for auto OEMs; …",  // human-readable WHY
  "source_corroboration": 3                       // how many of our 435 feeds carry this story (real vs noise)
}
```

Every field is a thing FinBERT cannot produce. The two that don't exist *anywhere* in the program today are
**`ripple_impact`** (Lijo's idea) and **`novelty`** (the academically-proven alpha source).

---

## 4. THE killer feature — the ripple / causal graph (how it actually works)

The ripple effect needs one thing the AI can't invent per-article: a **map of who-is-connected-to-whom.** You
build that map once and keep it fresh, then let the AI walk it.

**Step 1 — Build a "relationship graph" of Indian companies (the map).**
A frontier model + your entity timeline (V2-014) extracts relationships from news over time:
- *supplies* (Company A sells parts to Company B)
- *competes-with* (A and B fight for the same market)
- *owns / subsidiary-of* (parent ↔ child)
- *same-sector / same-region* (move together)
- *customer-of* (A's revenue depends on B's spending)

This becomes a graph: nodes = companies, edges = relationships. **Nobody else has assembled this for India for
free.** It's the same "the moat is the assembly" point — and it's reusable forever.

**Step 2 — When news hits a company, propagate the shock along the edges.**
News hits TATASTEEL (direct). The AI walks one hop out: "who *buys* steel?" → auto OEMs (MARUTI, etc.) get a
*ripple-negative* flag. "Who *competes* with TATASTEEL?" → JSWSTEEL gets a *ripple-positive* flag. Two hops
out, smaller and lower-confidence. The further the domino, the lower the confidence — so you weight it down.

**Step 3 — The bet:** the market prices the *direct* hit fast (TATASTEEL drops in minutes). It prices the
*ripple* hit **slowly**, especially in small/uncovered names — because no analyst is sitting there connecting
"steel duty" to "this tiny auto-parts maker in Pune." **If SachNetra connects it first, that's the edge.** It's
the exact slow-diffusion mechanism behind the program's only proven signal (Exp4 latency).

> ⚠️ **Honesty flag:** the ripple bet is the most exciting *and* the most unproven. It must be tested like
> everything else (§7) — does a ripple-flagged stock actually drift in the predicted direction, net of cost,
> *after* the news is public? It might be that the market connects the dots faster than we think. We find out
> by measuring, not by believing.

---

## 5. "Come, what else" — more things a thinking reader can do

Lijo asked what else. Here's the menu, roughly best-first. Each is a column the News Brain could emit, and each
is impossible for FinBERT:

1. **Novelty / "is this actually new?"** — *(highest priority — it's the academically-proven one).* The market
   under-reacts to genuinely new facts and over-reacts to recycled ones. The AI compares a story to the story-
   thread's history and scores how much is new. **News novelty → significant abnormal returns** (2025 lit).
2. **Winner/loser pairs** — for almost every event there's a loser *and* a winner (one company's bad news is a
   competitor's good news). FinBERT only ever sees the one company named; the AI names the un-named winner.
3. **Surprise vs. expected** — "profit up 20%" is only good if the market expected 10%. Tie the article to the
   event calendar (V2-018) and ask: *is this above or below what was already priced in?* (This is also the
   exact filter Candidate A — the volatility play — needs.)
4. **Magnitude & horizon** — not just direction but *how big* and *how long*: a one-day blip vs. a structural
   multi-quarter change. Lets you size and time, not just pick.
5. **Rumor / pump-and-dump detector** — small-cap India is full of promotional "news." A reasoning model with
   source-corroboration ("only 1 sketchy site carries this") can flag likely manipulation and *avoid* it — a
   risk filter that protects the book.
6. **Management-tone / hedging detector** — read the actual quotes in the article; is management confident or
   evasive? Tone shifts in earnings commentary are a known soft signal FinBERT can't parse.
7. **Cross-source corroboration** — same story in 5 of your 435 feeds = real and big; 1 feed = noise. The AI
   counts and weights. (You uniquely have 435 feeds to corroborate against.)
8. **Auto-generated "why" for every signal** — the `rationale` field makes every trade *auditable* ("we're
   long X because of this article's chain"). Critical for trusting the system and for the look-ahead-bias
   defence (§6).

---

## 6. The honest constraints (what makes this hard — read before getting too excited)

1. **"Read the whole article" is the big lift.** Today the pipeline works on the **Redis news digest
   (headlines/summaries)** — per the G1 work, *full article body text doesn't exist in the pipeline yet.*
   To read whole articles you must first **capture the body** (RSS sometimes carries it; otherwise fetch the
   URL and extract the text). That's a real new collector/step, and some sources block scraping. **This is the
   #1 thing to scope before anything else.**
2. **Cost & speed of "every 10 minutes × whole articles × frontier model."** Reading every full article with a
   top model every 10 min could get expensive and slow. The fix is **a funnel**: the cheap tag layer (G1) +
   a gate decides *which* articles are market-relevant (most aren't), and only those go to the frontier model.
   Batch them. Cache. So it's "frontier model on the ~5% that matter," not "on everything." Bounded and
   affordable.
3. **Look-ahead bias is lethal (the academic warning).** If the AI scores an old article while "knowing" what
   happened next, every backtest is a lie (arXiv 2512.23847). **Hard rule: when scoring an article, the model
   gets ONLY information timestamped before that article.** The `rationale` field helps you audit that it
   didn't cheat.
4. **"Weak for returns, strong for prices."** The literature is blunt: LLM signals predict *price levels*
   better than *returns*. So use the News Brain as a **ranking / filter / risk overlay**, not a magic
   "this stock goes up 5%" oracle.
5. **The ripple graph can be wrong / hallucinated.** A frontier model can *invent* a supplier relationship.
   Mitigation: only keep relationships seen in *real text* across multiple articles, attach confidence, and
   weight ripple signals far below direct ones. Verify the graph against reality before trading on it.
6. **It doesn't escape the cost floor by itself.** This is a *better signal*, but a better directional signal
   still has to beat 100–250 bps (the wall that killed 18 experiments). That's why in the miracle-hunt note
   this is **Candidate C feeding Candidate A/D**, not a standalone trade. The News Brain's best home may be as
   the *surprise filter* for the volatility play (A) and a *column* in the portfolio (D) — where it doesn't
   have to predict direction alone.

---

## 7. How we'd prove it's actually good (not just cool)

Same discipline that killed the other 18 — that discipline is the program's real moat.

1. **Build the relationship graph + News Brain on a slice of history** (point-in-time, no cheating).
2. **Pre-register the test** (next free Exp ID): does a `novelty × direction` column, and separately a
   `ripple_impact` column, add **cross-sectional information beyond plain momentum**, net of 250 bps, under
   the Exp19 ablation? First cheap gate: do ripple-flagged stocks drift the predicted way *after* the news is
   public? If yes even a little → huge, because it's a brand-new, unique signal. If no → clean kill, we learn
   the market connects dots faster than we hoped.
3. **Reuse the Exp19 harness** (panel builder + walk-forward backtester already exist). This is a new *column*,
   not new infrastructure.

---

## 8. How it should fit the pipeline (the shape, not the code)

```
 every ~10 min (existing cron)
        │
   news digest (Redis)  ──►  TAG LAYER (G1)  ──►  is it market-relevant?  ──no──► store, skip brain
        │                    (which company?)          │ yes
        │                                               ▼
        │                                     fetch / load FULL ARTICLE BODY   ← new step (§6.1)
        │                                               ▼
        │                                     FRONTIER NEWS BRAIN (replaces FinBERT chain)
        │                                       reads whole article + thread history (point-in-time)
        │                                       emits the §3 structured record
        │                                               ▼
        │                                     walk the RELATIONSHIP GRAPH → ripple_impact (§4)
        │                                               ▼
        └────────────────────────────────►  store rich record → feeds: signals table,
                                             Exp19 panel column, Candidate A surprise filter
```

The tag layer is the funnel mouth; the frontier model is the brain; the graph is the memory; the structured
record is the output everything downstream consumes.

---

## 9. Verdict & next steps

**PURSUE — but in the right order, and as a *feeder*, not a lone trade.**

1. **Scope "capture the full article body"** (§6.1) — this is the true prerequisite and the part nobody's built.
   One recon task (what do our feeds actually carry? which sources are fetchable?).
2. **Lean on the tag layer (G1)** — it's already in flight (V2-031 family) and it's the funnel that makes the
   frontier model affordable. The News Brain is one more reason G1 is the highest-leverage infra.
3. **Prototype the News Brain on a small batch** — replace the FinBERT call with a frontier model on ~100
   tagged articles, full-text, and eyeball the §3 output + the ripple guesses. Cheap reality check before
   building anything big.
4. **Build the relationship graph** from the entity timeline you already have.
5. **Pre-register the experiment** (§7) and let it tell the truth, like the other 18.

**The one-paragraph why:** FinBERT reads headlines and guesses a mood. The News Brain reads whole articles and
reasons about *consequences* — who wins, who loses, what's genuinely new, and (Lijo's idea) which un-mentioned
companies are about to feel the ripple two dominoes down. That ripple, in small uncovered names the market is
slow to connect, sits exactly on top of SachNetra's only proven edge (being early in low-coverage news). It
won't beat the cost floor as a lone directional bet — but as the *surprise filter* for the volatility play and
a *column* in the portfolio, it could be the unique ingredient every other experiment was missing. We replace
the calculator with a brain — and then we test the brain as ruthlessly as we tested everything else.

---

## 10. Open questions for Lijo (close the loop)
- **Body text:** are you OK with a new step that fetches/extracts full article text (some sites block it), or
  should v1 run on the richest text the feeds already give us (often a 2–3 sentence summary)?
- **Cost appetite:** a frontier model on the filtered ~5% of articles every 10 min has a real monthly bill.
  Want me to estimate it before we commit, and set a hard budget cap?
- **Scope of v1:** start with **novelty + winner/loser + surprise** (proven, simpler) and add the **ripple
  graph** in v2? Or go straight for the ripple — the exciting-but-unproven part — first?
