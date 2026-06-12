---
date: 2026-06-12
problem: >
  P1a — the blueprint's Phase-1 premise gate, RUN. Question: does a big move in a prominent company precede
  same-direction drift in an economically-linked company AFTER the move is public, in India? This decides
  whether the Mind's ripple thesis deserves the build. GATE PROBE — deliberately not a pre-registered
  experiment (mints no Exp ID); the pre-registered version is the Phase-7 report card / Layer-2 rules.
status: RUN 2026-06-12 (read-only; harness selftest PASS; placebo run). VERDICT — **ALIVE AT THE MONTH
  HORIZON**: +20d signed drift ≈ +1% incremental above the generic-momentum placebo, both sleeves, surviving
  (weaker) in the 2022+ recency slice. The week horizon (+5/+10) is mostly generic cross-momentum — placebo
  non-flat there, exactly what the placebo exists to catch. GATE: PROCEED (Phase 1.5 fresh-eyes → build).
lane: Lijo (gate decision — recommendation: proceed) + Claude (authored/ran harness, read-only)
tags: [p1a, gate, pair-drift, economic-links, ripple, placebo, results, news-brain, phase-1]
artifacts: [
  "scripts/research/p1a-pair-drift-gate.mjs (selftest + placebo modes)",
  "scripts/research/output/p1a/p1a_events.csv (1,973 events)",
  "scripts/research/output/p1a/placebo_run.txt"
]
---

# P1a results — the pair-drift gate: ALIVE at the month horizon

## 1. Setup (as built)
19/20 famous economic-link pairs priced (TATAMOTORS head missing from `research_prices` — symbol-coverage
gap, noted). Benchmark `^NSEI`. Events = head's market-adjusted daily move ≥|3%|, declustered ≥6 trading
days, since 2015 → **1,973 events / 1,142 distinct days**. Measure = linked name's market-adjusted CAR over
+1..+{5,10,20}, signed by head's day-0 direction. Harness selftest: recovers a known injected +1.5% drift
(t=3.5) and reads an independent series as statistically zero. ✅

## 2. The result that matters (real vs placebo)

| Window | REAL (shock events) | PLACEBO (random days) | Incremental | Read |
|---|---|---|---|---|
| day-0 co-move | +1.12% (t=16.7) | +0.42% (t=8.2) | — | market prices much of it immediately (CF's 60/40 shape) |
| +1..+5 | +0.43% (t=3.0) | +0.28% (t=2.0) | **+0.15%** | ⚠ mostly GENERIC cross-momentum, not news diffusion |
| +1..+10 | +0.67% (t=3.2) | +0.40% (t=2.1) | **+0.27%** | ⚠ partially generic |
| **+1..+20** | **+1.22% (t=4.0)** | **+0.24% (t=0.7)** | **≈ +1.0%** | ✅ **survives its placebo — looks like real slow diffusion** |

Sleeves at +20d: low-attention **+0.98% (t=2.2)** vs placebo **−0.13%** → incremental ≈ +1.1%;
high-attention +1.38% (t=3.4) vs placebo +0.48% → ≈ +0.9%. Recency (2022+): +0.97% (t=1.7) vs placebo
+0.25% → ≈ +0.7%, same direction, weaker power — decayed but not dead.

**The placebo earned its place:** without it, the +5/+10 numbers (t≈3!) would have read as a discovery.
They are mostly shared-sector/beta cross-momentum that exists on *any* day, not just news days. The
month-horizon excess is the part the generic baseline cannot explain.

## 3. Per-pair texture (where the drift lives)
Strong: **ASHOKLEY→JAMNAAUTO** (+1.70%, t=3.8 at +5), **BAJFINANCE→BAJAJFINSV** (+1.27%, t=3.2),
**M&M→SWARAJENG** (+1.22%, t=2.5), **VEDL→HINDZINC** (+0.64%, t=2.4) — i.e. **dependent suppliers and
mechanical holding links**. Negative/flat: MARUTI→SUBROS, MARUTI→MOTHERSON, HEROMOTOCO→SUPRAJIT,
EICHERMOT→GABRIEL. **Heterogeneity is the message: edges must EARN their weights** — precisely the Linker
reflection-loop design (decay edges whose ripples never realize). A diversified-supplier linked name
(Motherson) is *not* a one-customer dependent (Swaraj Engines); the graph needs dependence-weighted edges,
not binary ones.

## 4. Honest limits of this probe (why it mints no Exp ID)
- **Gate-grade, not experiment-grade:** windows/threshold not pre-registered; 3 windows × slices = mild
  multiplicity; pair roster hand-picked on link *fame* (selection on link-existence is acceptable for a
  premise gate; selection on performance would not be — we did not peek).
- **Survivorship:** all 19 pairs survive today; the dead linked names that would have made drift look worse
  (or better) aren't testable — the perennial ceiling, now at least *logged* going forward (Phase 0).
- **Gross, not net:** ≈+1%/20d incremental is an information statement, not a tradability statement —
  250bps round-trip cost would eat a naive monthly version; tradability is Layer-2's question with
  concentration/conditioning, after the report card.
- **Sleeve labels are rough** (hand-assigned attention flags, 19 pairs). The "low-attention carries the
  alpha" claim (Madsen) is *suggested* (+1.1% vs +0.9% incremental) but not powered here.

## 5. Gate decision (per blueprint §3 Phase-1)
**ALIVE → PROCEED.** The premise the Mind is built on — *public news about a linked head diffuses slowly
into less-watched linked names* — shows a placebo-surviving ≈+1%/month signature on hand-picked famous
links. A 55-node factor graph + LLM-extracted dependence-weighted edges + novelty/attention conditioning is
exactly the machinery that could concentrate this. Next per blueprint: **Phase 1.5 (fresh-eyes review of
the blueprint) → P1b/c/d probes → Phase-2 build.** The Phase-7 report card — judged against the Exp19
momentum-ablation baseline — is where this graduates (or dies) as a pre-registered claim.

## 6. Changelog
| When | What |
|---|---|
| 2026-06-12 | Harness authored; selftest pass (after fixing the independent-series assertion to test t, not raw mean — a noise draw isn't a failure). Real run: 1,973 events. Placebo run: +5/+10 contaminated by generic cross-momentum; +20 clean. Verdict ALIVE-at-month-horizon; documented; CSV + placebo log saved. TATAMOTORS missing from research_prices flagged. |
