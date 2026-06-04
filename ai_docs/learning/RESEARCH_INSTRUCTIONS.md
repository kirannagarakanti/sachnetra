---
tags: [learning, research-protocol, agent-instructions, deep-research, sachnetra]
audience: any agent (Claude / Gemini / future session) handed a problem or feature to research
created: 2026-06-04
status: standing
---

# Deep Research Instructions — Solving a Problem or Adding a Feature

> **Read this when**: Lijo (or a task) hands you a **problem to solve** or a **feature to add**, and the answer isn't already in our codebase or wiki. Your job is to research **across every relevant source** — git repos, academic papers, practitioner blogs, latest news, and our own code — figure out **what works and what won't for *us*****, and return an actionable recommendation.
>
> **This is problem-driven research.** It is the inverse of [`git-repos/GEMINI_BRIEF.md`](./git-repos/GEMINI_BRIEF.md) (which documents *one given repo*) and the [`articles/`](./articles/) templates (which distill *one given source*). Use those when Lijo hands you a source. Use **this** when Lijo hands you a *problem* and you have to go find the sources yourself.

---

## Standing context (do not re-derive)

Load [`README.md`](./README.md) first — it is the one-screen brief on SachNetra (V2 mission, what already works, sacred files, Lijo vs James lanes). Do **not** ask Lijo to re-explain the project. Key facts you must hold:

- **Data tier today** = EOD `research_prices`, RSS news, NSE/BSE APIs, Railway PostgreSQL. We do **not** have Level-2/tick order-book data or a live execution engine. Anything that needs those is **Park**, not Pursue.
- **Positioning** = "be your own first customer" — trade own capital, **not** B2B/SaaS/consumer. UI polish + variant features are on the kill list (`positioning_v2.md`).
- **One-strategy focus** = feed proven strategies better data; aim at ONE (mid-cap event arbitrage). Don't restart the experiment treadmill (`strategy_reset_*`).
- **What already works / is already killed** — read [`research_state_summary.md`](../sachnetra%20v2/wiki/syntheses/research_state_summary.md) before proposing anything, so you don't "rediscover" a dead idea (e.g. FII→direction prediction is killed; ~13min filing latency edge on large-caps is real).
- **Lanes**: James builds collectors (engineering); Lijo validates signals (research). Tag every recommendation with the lane it belongs to.

---

## The protocol — five phases

### Phase 0 — Frame the problem (do this before any searching)

Write these down first. If you can't, you're not ready to search.

1. **Problem statement** — one sentence. ("Our G1 news→ticker coverage is stuck at ~8%; how do we raise recall on mid/small-cap earnings?")
2. **Current state, with evidence** — what do we do today, and what does the measured number say? Cite a file/experiment, not a vibe. *Grep the codebase before claiming we don't have something* (see Hard Rule 1).
3. **Constraints** — data tier, stack (Node/TS, Railway PG, Redis, Vercel Edge), sacred files, cost, the lane.
4. **Definition of "solved"** — the metric and threshold that would close this. Check it's the *right* denominator (Hard Rule 4).
5. **Has this been tried?** — search our wiki `experiments/`, `syntheses/`, and the learning journal. If we already killed it, the job is "explain why it's dead," not "re-propose it."

### Phase 1 — Search broadly (every source type)

Cast wide first, then go deep on the 2–3 most promising leads. Use subagents (`Explore`, `general-purpose`) to fan out searches in parallel when breadth is large. **Specific instructions per source type are in the next section** — follow them, don't just google once.

Order of search (cheapest/highest-signal first):
1. **Our own codebase** — Grep/Glob/Read. Don't reinvent what exists.
2. **Our wiki + learning journal + experiments** — has this been answered or killed?
3. **GitHub repos** — working implementations of the pattern.
4. **Academic papers** (SSRN/arXiv) — preprints for the latency edge; the *method* and *limitations* sections matter most.
5. **Practitioner blogs** — Quantocracy ecosystem; real-world execution caveats academics skip.
6. **Latest news / current state** — regulatory changes (SEBI/NSE/RBI), data-source availability, anything dated that invalidates an older source.

### Phase 2 — Evaluate: what works vs what might not

Build a synthesis table. For each candidate solution:

| Candidate | Source(s) | Evidence quality | Works for us because… | Might NOT work because… | Data/stack fit | Lane |
|---|---|---|---|---|---|---|

- **"Evidence quality"** — peer-reviewed > preprint w/ data > blog w/ backtest > blog opinion > marketing. Rank it honestly.
- **"Might NOT work"** is mandatory and is the most valuable column. Apply skepticism defaults (next section). A candidate with an empty "might not work" cell means you didn't look hard enough.
- Separate **transferable patterns** from **non-transferable assumptions** (US data ≠ Indian market structure; institutional execution ≠ our EOD/retail reality).

### Phase 3 — Verdict (the gate)

Before writing **Pursue** for any candidate, it must clear ALL FOUR (same gate as the article/repo templates):

1. **Data tier** — buildable/testable on data we have *today*. Needs Level-2/tick/execution engine → **Park** with the gate named.
2. **Kill list** — not UI polish, not a sacred-variant feature, not B2B/SaaS/consumer → else **Kill**.
3. **Live consumer** — names a *currently active* experiment or task it moves. Don't cite a refuted/parked experiment as justification (verify it's alive first).
4. **Right denominator** — if the case leans on a metric/gate we've rejected (e.g. the 20% headline-coverage gate), re-anchor or **Park**.

Default to **Park**. "Interesting" is not a verdict — force exactly one of Pursue / Park / Kill, and for Pursue name the V2-### task (or "new task to file") and the lane.

### Phase 4 — Output + reflect

- **Where the output goes**:
  - If the research centered on **one source** → distill it into the matching template (`articles/TEMPLATE_RESEARCH.md`, `TEMPLATE_REFERENCE.md`, or `git-repos/TEMPLATE_REPO.md`).
  - If it synthesized **many sources around one problem** → write a **problem-research note** (template at the bottom of this file) in `ai_docs/learning/` and, if it changes the roadmap, link it from the relevant V2 task or wiki synthesis.
- **Promote to wiki** only if a genuinely new concept/entity/playbook emerged — per README §3. Most research notes stay in the journal.
- **Reflect** (non-skippable, per README §4): surface to Lijo (1) anything you're unsure about in the recommendation, and (2) any friction in this protocol worth fixing.

---

## Source-specific deep-research tactics

> The point of "deep research" is breadth across these, then depth on the best 2–3. Each source type has its own credibility traps.

### 1. Our own codebase (always first)
- **Tools**: Grep (content), Glob (files), Read. Use the path map in [`git-repos/README.md`](./git-repos/README.md) §"SachNetra surfaces".
- **Why first**: the #1 research error is recommending something we already have. Before writing "SachNetra has no X", grep for X and read the result.
- Check `scripts/`, `shared/`, `server/`, and `ai_docs/tasks/V2-*.md`.

### 2. Academic papers (SSRN, arXiv, Google Scholar)
- **Where**: SSRN FEN/ERN/ARN networks (market microstructure, quant methods, emerging markets, accounting/PEAD) — see the SSRN e-journal map in `articles/`. arXiv q-fin. Google Scholar for citation chains.
- **Latency edge**: prefer **preprints/working papers** — peer review lags 12–24 months. A 2025 SSRN preprint beats a 2023 published version of the same idea.
- **How to read fast**: Abstract → **Method** → **Results** → **Limitations/Robustness**. The limitations section tells you what won't transfer. Skim the math; extract the *mechanism* and the *data it was tested on*.
- **Credibility traps**: in-sample-only results; US/developed-market data that won't survive Indian microstructure; no transaction costs; tiny sample. Note the dataset and period every time.
- **Access**: SSRN/ResearchGate 403 scrapers, but the *same paper* is often fetchable via an open-access mirror (journal HTML, SCIRP, arXiv, author PDF) — search for it before settling for the abstract. If only the abstract is reachable, work from abstract + citations; route the rest to the Gemini recon agent. **Never invent a citation, DOI, author, or finding.** And **page-verify any number before it drives a verdict** — search-summary figures have been materially wrong (the PEAD "2.43%/mo illiquid gradient" did not exist in the paper).

### 3. GitHub repos
- **Find**: WebSearch / GitHub search for the pattern + language; prefer repos with recent commits and real stars over abandoned demos.
- **Read**: README, `examples/`, the main entry points, and the specific module implementing the pattern. Map the architecture in ≤10 lines.
- **Clone for inspection** into `scratch/` only (never vendor into prod without a filed task). **`scratch/` is ephemeral** — if you cite a repo file, quote the relevant lines inline; a `file:///…/scratch/…` link will rot (this has already bitten us — dead links ≠ verified evidence).
- **Evaluate** with [`git-repos/FEATURE_RUBRIC.md`](./git-repos/FEATURE_RUBRIC.md) (Poor/Good/Better/Excellent). If it's worth a full writeup, use `TEMPLATE_REPO.md`.
- **Skepticism default**: "AI trading bot" / "stock price predictor" repos are Park/Kill until they show walk-forward + costs. Most fail OOS — cross-check against our research state.

### 4. Practitioner blogs & aggregators
- **Where**: Quantocracy (aggregator + blogroll), Alpha Architect (factors/momentum, academically grounded), Robot Wealth (execution/ML practicals), Financial Hacker (backtest pitfalls), Better System Trader (interviews). Indian-specific: Zerodha Varsity, NSE/SEBI circulars, Capitalmind.
- **Why**: blogs surface the execution caveats, slippage realities, and "this looked great in backtest and died live" stories that papers omit.
- **Credibility traps**: survivorship in the blog's own examples; no out-of-sample; affiliate/marketing posts. A blog with a reproducible backtest + code > a blog with a chart and a claim.

### 5. Latest news & current state (don't research a stale world)
- **Where**: WebSearch for recent (last 6–12 months) developments — SEBI/NSE/RBI regulatory changes, data-feed availability/pricing changes, STT/tax changes (these directly change feasibility), new datasets.
- **Why it matters**: a 2024 paper's data source may now be paywalled, deprecated, or regulated differently. The 2026 STT hike on F&O changes the cost model for any options strategy. Always sanity-check that the world the source assumes still exists.
- **Date everything** — note publish dates; flag when a source predates a change that invalidates it.

### Tools at your disposal

> **Claude Code:** Project settings (`.claude/settings.json`) allow WebSearch, WebFetch, writes under `ai_docs/learning/**` and `scratch/**`, and `git clone` into `scratch/`. Create the problem-research note early and update it as evidence lands — do not wait until the end of the session to write the file.

- **WebSearch** — reliable; use it to find sources and the right URLs.
- **WebFetch** — works on **most** sites (arXiv, Wikipedia, open-access journals like SCIRP/Theoretical Economics Letters, most blogs). It does **not** work on **anti-bot sites** — NSE/BSE, SEBI, SSRN-direct, ResearchGate all 403/time-out scrapers.
  - **Do NOT declare "WebFetch is blocked" from one failed fetch.** A timeout on `nseindia.com` means *that site* blocks bots, not that the tool is dead — test a clean URL (arXiv/Wikipedia) before concluding anything. (A subagent once mis-reported the whole tool as blocked after only trying NSE/SSRN.)
  - Many "blocked" papers have an **open-access mirror** that IS fetchable (journal HTML, SCIRP, author PDF, arXiv). Search for the mirror before giving up. *(Example: Harshita et al. 2018 PEAD-India is 403 on SSRN/ResearchGate but fully fetchable as SCIRP HTML — and the page-verified numbers differed materially from the search-summary.)*
  - For the anti-bot officials that have no mirror (NSE/SEBI live data), **route the fetch to the Gemini recon agent** (it has browser access and runs scrape recon in `scratch/`, per the external-agent-recon workflow). Don't fabricate the numbers; mark them "search-summary, route to recon" until verified.
- **Bash + git** — clone repos into `scratch/` for inspection (read-only intent; ephemeral).
- **Grep / Glob / Read** — the codebase and our docs.
- **Agent subagents** (`Explore`, `general-purpose`) — fan out parallel searches when breadth is large; have them return conclusions, not file dumps.

---

## Hard rules (the lessons that cost us)

1. **Verify code claims against the actual files.** Before "SachNetra has zero X", grep and read. (We shipped a review claiming "zero Unicode normalisation" when `normalizeQuotes()` already existed.)
2. **Dead `scratch/` links are not evidence.** Quote the lines inline. The repo you cloned may be gone next session.
3. **"Interesting" is not a verdict.** Force Pursue / Park / Kill. Default to Park.
4. **Anchor to the right metric.** Don't justify a Pursue with a gate we've already rejected as the wrong denominator. State the metric and why it's the right one.
5. **Don't cite a dead experiment as a live consumer.** Check the experiment's current status (refuted? parked? on-focus?) before "this unblocks Exp N".
6. **Never fabricate sources.** No invented citations, DOIs, authors, stats, or repo paths. If you couldn't fetch it, say "unverified — couldn't access" and cap your confidence.
7. **Separate transferable pattern from non-transferable assumption.** US data, institutional execution, and Level-2 strategies rarely transfer to our EOD/retail/Indian reality as-is.
8. **Respect the boundaries.** Sacred files (`src/config/variants/{full,tech,finance}.ts`, `scripts/seed-insights.mjs`) — never propose edits. Data-source recon is read-only; per our workflow, live scrape probes are run by the external recon agent in `scratch/`, not by you. Code + read-only self-checks only on prod pipeline tasks — Lijo runs prod migrations/seeds.
9. **One source rarely settles it.** Triangulate: a claim backed by a paper *and* a repo *and* a practitioner's live experience is worth more than three blogs repeating each other.
10. **Never invent an ID — verify it.** Before citing a `V2-###` task, confirm it exists in `CLAUDE.md` or `ai_docs/tasks/`; if it doesn't, write *"a to-be-filed <thing>"*, never a made-up number. Before referencing or proposing an experiment number, check the registry [`wiki/experiments/_index.md`](../sachnetra%20v2/wiki/experiments/_index.md) — **do not mint an `ExpNN` in a research note/article/review**; write *"next free Exp ID (ExpNN at time of writing)"* and let pre-registration claim it. (Three ID/task-number slips happened in one session before this rule existed: V2-019 and V2-025 phantom cites; Exp08/Exp15/Exp18 collisions.)
11. **Don't claim data readiness you didn't check.** "Runnable today on `research_prices`" requires confirming the *universe* actually covers your symbols. `research_prices` is Nifty-50-only until G4 widens it (see `_data_gaps_backlog.md`) — most mid/small-cap event studies are **gated on G4**, not ready now.

---

## Problem-research note — output template

> Use when the research synthesized multiple sources around one problem. Save as `ai_docs/learning/research-notes/YYYY-MM-DD_<problem-slug>.md` (create the folder if needed).

```markdown
---
date: YYYY-MM-DD
problem: <one-line problem statement>
status: researched
lane: James | Lijo | both
tags: [research-note, ...]
sources_consulted: [<repo>, <paper id>, <blog>, ...]
---

# Research: <problem>

## Problem & current state (with evidence)
- Problem: <one sentence>
- Today: <what we do; cite file/experiment + measured number>
- "Solved" = <metric + threshold; confirm it's the right denominator>

## What I searched
<source types hit + the 2-3 leads I went deep on; note anything I couldn't access>

## Candidates — what works / what might not
| Candidate | Source(s) | Evidence quality | Works because | Might NOT work because | Data/stack fit | Lane |
|---|---|---|---|---|---|---|

## Verdict (gate-checked)
- **Recommendation**: Pursue / Park / Kill — <the one chosen candidate or "none yet">
- Gate: data tier ✅/❌ · kill list ✅/❌ · live consumer ✅/❌ · right denominator ✅/❌
- If Pursue: V2-### task (or "to file") + owner lane + effort
- If Park: the gate/blocker + what makes it testable
- If Kill: which evidence/rule kills it

## Open questions / what I couldn't verify
- <…>
```

---

## Quality bar (self-check before returning)

- [ ] Phase 0 written — problem, evidence-backed current state, constraints, "solved" metric, prior-art check
- [ ] Searched ≥3 source types; went deep on the best 2–3
- [ ] Every code claim verified against an actual file (grepped, not assumed)
- [ ] Every external claim is from a source I actually fetched — no fabricated citations
- [ ] "Might not work" filled for every candidate
- [ ] Verdict gate applied; exactly one of Pursue / Park / Kill; lane tagged
- [ ] Transferable patterns separated from non-transferable assumptions
- [ ] No proposed edits to sacred files; respects read-only / prod-execution boundaries
- [ ] Reflected: surfaced uncertainties + any protocol friction to Lijo
