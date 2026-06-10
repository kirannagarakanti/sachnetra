---
tags: [problem-solving, news-ticker-tagging, gate, gold-set, entity-linking, multi-agent, G1, exp21]
status: DESIGN COMPLETE — execution pending (gold set not yet labelled)
authored_date: 2026-06-10
audience: Lijo + James + future Claude/Gemini sessions
source_conversation: multi-agent loop (Lijo ⇄ MiniMax/maxhermes ⇄ Claude Code)
related: [[project-exp21-latency]], [[project-g1-post-deploy-state]], [[project-g1-execution-plan]]
---

# Problem-Solving Log — News→Ticker Tagging: the Gate + Gold-Set decision

> **One-line conclusion:** Stop forcing a ticker onto every headline. Add a **gate** (is this headline
> about one specific company?) *before* the tagger, build it **heuristic-first**, and judge everything
> against a hand-labelled **gold set** (~1,000 headlines, two labels each). Design is done; the only thing
> that matters next is labelling that gold set.

---

## 1. How this was solved (the method, worth remembering)

This was solved by a **three-party loop**, not a single session:
- **Lijo** carried context between tools and made the calls.
- **MiniMax / `maxhermes`** (external deep-reasoning agent) supplied outside expertise — methods we wouldn't
  derive from inside the repo (gold-set strata, the gate idea, labeling protocol, the gate heuristic spec).
- **Claude Code** grounded every suggestion against the real codebase + strategy, and caught where the
  external advice assumed infrastructure or budget we don't have.

The pattern that worked: **external agent proposes method → Claude reality-checks against the repo → Lijo
decides.** Each correction below came from that check. Keep using this shape for design-heavy problems.

---

## 2. The problem (in detail)

SachNetra tags Indian financial-news headlines with the NSE ticker(s) they're about, so news can be joined
to a specific company (the join that powers Exp4/Exp21 latency work and the mid-cap event-arbitrage thesis).

**The tagger today** = `extractCompanies()` in `scripts/_india-market-keywords.mjs`: a **dictionary/alias
matcher** over `shared/nse-equity-master.json` (built by `scripts/build-equity-master.mjs` from NSE
`EQUITY_L.csv`). Word-boundary regex per alias; returns bare NSE symbols. **Headline-only** — sole call at
`scripts/seed-india-signals.mjs:329`, which writes `nse_tickers` at line 341. No NER, no fuzzy match, no body.

**Two failure modes, in tension:**
- **Precision:** many real company names are ordinary English words ("Titan", "Page", "Rain", "Dollar",
  "Urban") → false tags on unrelated headlines.
- **Recall:** misses a company when the headline spells the name differently (initials spacing, "&"/"and",
  Ltd/Limited, curly quotes, HTML entities) or when a small/mid-cap is under-represented in the alias list.

**The deeper realisation (the load-bearing one):** *most headlines aren't about a single company at all* —
they're macro / index / policy / sector / listicle stories (memory: ~95% non-company news). Forcing a ticker
onto those is the single biggest source of noise, and it's why the "≥20% tag rate" gate was the wrong
denominator.

---

## 3. The fixes already shipped (precision-first dictionary hardening)

These are in the codebase now (G1 / V2-031 line):
- **Decision 6(a) collision filter** — drops ambiguous bare/first-word forms (Reliance, Tata, Apollo) so they
  can't false-positive. (`applyCollisionFilter` in build-equity-master.mjs)
- **Decision 6(b) denylist_context** — common-word names (Lupin, Page, Hero, Britannia, Titan, Asian Paints)
  only tag when a finance context word is present.
- **Suffix-strip cascade** aliases (Ltd/Corp/Industries/…); `alias_proposal` overlay (Nifty + brand names).
- **V2-031b hardening** — drop risky bare symbols + positive alias overlays.
- **V2-031c** — supplemental drops (Rain, Dollar, Urban, NAVA); HTML-entity decode + curly-quote normalize on
  the match side.
- **G1 alias-form normalization** — leading-initial spacing, "&"↔"and", Ltd↔Limited variants, with FP guards
  (min-length, leading-initials-only, variant cap, collision-filter inheritance).
- **INTENTIONAL_MULTI_TAG** escape hatch — Tata Motors demerger → TMCV+TMPV; parent aliases L&T, SBI, HDFC.

**Limit that remains:** a headline-only dictionary cannot recognise companies it doesn't already know, or
that aren't named explicitly. That's the open problem this conversation addressed.

---

## 4. The new design — a two-stage pipeline

```
 OLD:  every headline ──► tagger        (forces a guess on everything; drowns in macro/index noise)

 NEW:  headline ──► GATE ──► tagger      (most headlines stop at the gate; only company news is tagged)
                     │
              "is this about ONE
               specific company?"
```

### 4.1 The GATE (NEW) — buildable heuristic-first
A rule cascade that decides **SPECIFIC vs EMPTY** before the tagger runs:
- **EMPTY rules** (fire first): listicle headers ("stocks to watch", "top picks", "Q3 results today: A,B,C"),
  macro/index/policy (Nifty, Sensex, RBI, repo, CPI, FII/DII, Union Budget), currency/commodity (rupee, crude,
  gold), sector-framing ("what it means for [sector]", "impact on", "broader", "may signal").
- **SPECIFIC rules**: Q-results, corporate actions (acquires/merger/FPO/board/appoints/dividend), order wins
  ("bags ₹X cr order"), forward-looking single-company actions, price action ("[Co] shares rise"), direct
  ticker mention.
- **Tie-break** (the hard part, resolved): listicle header at start = EMPTY even if a SPECIFIC pattern also
  matches, UNLESS exactly one company is named (then SPECIFIC); a *trailing* "in focus" tag does NOT override
  a real SPECIFIC event; sector-framing beats a single-company result.
- **Fall-through** = the genuinely ambiguous cases (group-level events "Adani Group stocks fall"; foreign
  unlisted counterparty; "brokerage view on X"; brand-name references) → **LOW confidence → default SPECIFIC**
  (let the tagger try; never silently drop a real company story).
- **Output:** `gate_decision`, `gate_confidence`, `gate_fired_rule` (debug), `gate_candidate_primary` (best-
  effort ticker the tagger should focus on).

Full v1 spec lives in the conversation transcript (the agent produced a one-page implementable spec with exact
keyword lists + a §6 engineer checklist + "the 30 labeling examples become the gate's unit tests").

### 4.2 Why heuristic, not ML (decided)
Rules are cheap, explainable, and good enough until measured. A LightGBM/encoder gate is **phase-2 only-if-it-
plateaus** on the gold set. Do not build feature schemas / training scripts before there are labels to feed.

---

## 5. The corrections Claude made to the external advice (so they're not re-litigated)

| # | External claim | Reality in our repo | Resolution |
|---|---|---|---|
| 1 | Mine aliases by PMI co-occurrence "in the same article" | **No article body exists** in the pipeline; corpus is headline-only | co-occurrence must be headline-only (weak) or use an EXTERNAL bodied corpus |
| 2 | "Add the lead paragraph as stage 2" | Same missing-body problem; it's a pipeline change, not a free add | parked as a separate go/no-go (bring body into pipeline?) |
| 3 | Gold set ~9,000 headlines = "one labeler-week" | 9,000 × 3 min ≈ **11 labeler-weeks**, and we have **one** labeler (Lijo) | right-sized to **~1,000** first cut (strata kept as proportions); grow to 3–5k in month 2 |
| 4 | Use `relevance_class` as the gate's "biggest leverage" upstream tie-breaker | `relevance_class ∈ {systemic, sector, idiosyncratic}` (not the assumed values) **and is computed FROM the tagger's own `extractCompanies()` output** → circular | drop it from the cascade; log it as a **post-hoc cross-check only** |
| 5 | Justify the gate on latency | dictionary match is cheap regex, **already runs on every headline** | justify the gate on **corpus precision**, not compute savings |
| 6 | Two-labeler κ / adjudication protocol | one-labeler shop | becomes a **self-consistency** pass (label → sleep → re-label → diff); keep κ section as "if/when a 2nd labeler exists" |

---

## 6. gate_label vs ticker_label (the two human labels in the gold set)

The gold set records **two labels per headline**, so one sheet scores both pipeline stages:
- **`gate_label`** = *Is this headline about one specific company?* → **SPECIFIC** | **EMPTY**. (Scores the gate.)
  - ≠ "does a company name appear" — "RBI rate hike: which banks (HDFC, ICICI, Axis) benefit?" names three
    banks but is **EMPTY** (the story is the RBI decision).
- **`ticker_label`** = *If SPECIFIC, which ticker(s)*, each tagged **PRIMARY** (the subject) or **MENTIONED**
  (named in passing). (Scores the tagger.)

The gold-set strata (~1,000): ~440 high-volume tickers, ~220 mid-cap, ~110 long-tail, ~200 empty/macro;
overlaid source-mix + time-mix; plus a separate **frozen canary** (~100–150 known-hard cases) for regression.
**Discipline that must not slip:** pick thresholds on a dev slice, **report on a held-out test slice**, never
the same data. A full SPECIFIC-vs-EMPTY labeling doc (PM-test rule + ~30 worked Indian-market examples +
anti-patterns + calibration set) was produced and is shippable to the labeler as-is.

---

## 7. Strategic framing (don't lose this)

- The gate/tagger track is **corpus hygiene**, valuable but **not on the critical path to the one bet**
  (mid-cap event arbitrage still needs matcher v2 + small-cap master coverage + BSE pre-2024 earnings history,
  per [[project-exp21-latency]] and [[project-pead-midcap-finding]]). Don't let a shiny gate displace those.
- **Design has outrun execution.** Four rounds of excellent design, **zero labelled rows**. The blocker is the
  gold set, full stop. No more design until it exists.

---

## 8. Next actions (decided)

1. **(Claude, this side)** Build the **stratified sampler** — read real `india_news_signals` rows, apply the
   six-strata caps, build the empty/macro pool by keyword, emit a labelling CSV with `gate_label` +
   `ticker_label` columns. Read-only research lane; Lijo runs it against prod, Claude doesn't touch prod.
2. **(Claude, optional now)** A **local gate-preview harness** (`scripts/research/gate-preview.mjs`) so we can
   watch headlines pass the gate + tagger locally before labelling — also seeds the gate's unit tests.
3. **(Lijo)** Label ~1,000 headlines (+ build canary in parallel from day 1). Do a 30–50 headline self-
   consistency dry-run first to surface instruction gaps.
4. **THEN** — and only then — tighten the gate (v2 spec with per-rule fire counts + precision/recall), and
   evaluate phase-2 ideas (ML gate, alias mining, body text) against measured gaps.

---
*Documented from the 2026-06-10 multi-agent problem-solving session. Design complete; gold-set labelling is
the gate to everything downstream.*
