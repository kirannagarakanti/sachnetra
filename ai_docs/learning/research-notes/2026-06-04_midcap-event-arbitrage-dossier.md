---
date: 2026-06-04
problem: Consolidate everything known about SachNetra's ONE bet — mid-cap event arbitrage — into a single pick-up-cold dossier: the thesis, the two signal pillars, the gates, the costs, the experiment ledger, the risk register, and the build sequence.
status: synthesis — living dossier for the one strategy
lane: Lijo (owns the bet) + James (builds the gates)
tags: [research-note, synthesis, dossier, mid-cap, event-arbitrage, strategy, PEAD, latency, gates]
sources_consulted: [
  "Internal: research_state_summary.md; positioning_v2.md; strategy_reset_and_data_foundation_2026-05-29.md",
  "wiki/experiments/_index.md (Exp1–15 ledger); Exp4 (latency); Exp10 (squeeze); Exp14 (refuted); Exp15 (rejected); exp16_brief.md",
  "research-notes 2026-06-04: pead-mid-small-caps(+followup), pead-size-liquidity-resolution, ear-proxy-risk-for-exp16, g4-midcap-backfill-safety",
  "Page-verified externals: Harshita et al. 2018 (SCIRP); Quantpedia PEAD; SEBI Aug-2024 F&O criteria; 2026 STT; LODR XBRL"
]
---

# Dossier: SachNetra's One Bet — Mid-Cap Event Arbitrage

> Single source of truth for the strategy the whole research program now points at. Synthesises the
> 2026-06-04 PEAD research thread + the prior experiment ledger. New file; supersedes nothing — read
> alongside `research_state_summary.md`. (Promote to `wiki/syntheses/` if it proves durable.)

> ⚠️ **2026-06-05 CORRECTION — G4 is DONE.** A live read-only check proved `research_prices` is **full-universe
> (2,357 symbols, 6.39M rows), incl. all 150 Midcap-150 names** (2009→2026). The "Nifty-50-only / gated on G4"
> statements below are **superseded** — Exp16 can run now. The live next step is **Exp16**, not G4. See
> `2026-06-05_g4-already-done-correction.md`. (Pillar A's G1 gate is still genuinely open.)

## 1. The thesis (one paragraph)
SachNetra's only *proven* edge is **latency** — its NSE-filing pipeline beats Indian newswires by ~13 min
(Exp 4). But that edge only *pays* where the wire is slow and the price still moves: **mid/small-caps**, not
large-caps (the "latency-vs-value squeeze," Exp 10). Independently, the academic record shows **post-earnings
drift is real in India and stronger in smaller, under-covered firms** (resolved 2026-06-04). The bet:
**combine the latency edge with the mid-cap earnings-drift edge** — be early to under-covered mid-cap
earnings events and capture the slow repricing. Structure is **long-only** (the SLB short market is dead and
the long side carries the drift anyway). It is **not** built yet — **G4 prices are DONE (2026-06-05)** so
Pillar B (Exp16) can run now; Pillar A still needs **G1** tagging. One serious open risk remains: the EAR proxy.

## 2. The two signal pillars

| Pillar | Status | Evidence | Gate to monetize on mid-caps |
|---|---|---|---|
| **A. Latency edge** (bourse leads newswire ~13 min) | 🟡 PROVEN but large-cap-only | Exp 4 (page of record): 60.3% lead, ~13 min median, p≈0.002, n=239 | **G1** — news→ticker tagging coverage (mid/small-caps untagged; the wire is only slow *here*) |
| **B. Earnings drift** (PEAD, stronger in small/under-covered) | ✅ premise resolved (size axis); ⚠️ EAR-vs-SUE caveat (see §6.1) | Harshita 2018 (India, ~6%/64d, survives controls, SUE×Size sig.); Quantpedia (small-cap concentrated, long side carries it); **Brandt 2008 page-verified** — SUE +5.6% / EAR +6.3% / combined **11.5%** (US 1987–2004) | ✅ **G4 DONE** (verified 2026-06-05: 150/150 Midcap-150 priced, 2009–2026) → **Exp16 can run now** |

Pillar A says *be early*; Pillar B says *there's drift to be early to*. Neither is tradeable on mid-caps until
its gate clears.

## 3. The cost & structure reality (page-verified 2026-06-04)
- **Long-only, not long-short.** SLB (securities lending) market is thin & large-cap-skewed (March 2026:
  ~11.87 cr shares / 341 scrips / ₹57 cr rental) — the biggest-drift mid/small names aren't borrowable. And
  Quantpedia: the long side carries PEAD returns anyway.
- **Tradeable band = liquid, F&O-eligible half of the Nifty Midcap 150** (impact cost ≤~1%). The illiquid
  Midcap tail + all of Smallcap-250 run >300 bps round-trip → drift eaten. Avoid.
- **Cost floor**: 100–250 bps round-trip (impact + spread + **20 bps delivery STT**, unchanged in 2026 —
  the hike hit F&O only). Accept signals only against the 250 bps (conservative) scenario.
- **No OCR needed**: SEBI LODR mandates XBRL → result numbers are machine-readable.

## 4. Experiment ledger (what's settled — don't re-litigate)
| Exp | Verdict | Bearing on the bet |
|---|---|---|
| Exp 1, 7, 9 | ❌ FII flow doesn't lead direction or beat GARCH | FII is not the signal — closed |
| Exp 4 | 🟡 latency edge real (large-cap) | **Pillar A**; mid-cap extension gated on G1 |
| Exp 10 | ⬜ inconclusive + 🚩 the latency-vs-value squeeze | *why* we must go mid-cap |
| Exp 14 | ❌ governance-shock refuted (listed names) | a *different* event type failed — PEAD ≠ governance shock |
| Exp 15 | ❌ midcap momentum rejected (OOS DD 26.5%) | momentum ≠ event-arbitrage; doesn't touch the bet |
| **Exp 16** | 📝 designed, **BLOCKED on G4** | **the pilot** — long-only Day-0/EAR-proxy PEAD on liquid Midcap-150 |
| Exp 17 (candidate) | — | **the time-series-SUE leg** — now the *priority* candidate, since SUE is the durable signal and EAR decayed (page-verified). Builds on a free quarterly-EPS collector (Indian API endpoints confirmed). (G6 sentiment-calibration is a separate later candidate.) |

## 5. Dependency graph (what unblocks what)
```
                       ┌─ G1 (news→ticker tagging, mid/small-cap) ──► Pillar A on mid-caps
  THE BET ◄────────────┤
  (mid-cap             └─ G4 (Midcap-150 prices in research_prices) ─► Exp 16 (Pillar B pilot)
   event arb)                     │
                                  └─ (prior G4 backfill crashed prod; see g4-backfill-safety note:
                                      grow volume → narrow-first 75 names × 2018→now → periodic disk guard)

  Optional upgrade: to-be-filed time-series-SUE collector (free quarterly EPS) ──► SUE leg
                     (PAGE-VERIFIED: SUE is the DURABLE signal — positive in both eras (+5.6% 1987–2004,
                      +3.91% 1996–2026). EAR — the leg we can build — DECAYED: +6.3% historically but
                      −3.39% (reverses) in modern data. So the SUE leg matters MORE than first thought.
                      See ear-proxy-risk + pead-recon-results + sue-leg-data-sourcing notes.)
```

## 6. Risk register (the honest "what might not work")
1. **EAR proxy may capture reversal, not drift** (HIGHEST open risk — now page-verified as an *anomaly-decay*
   story, not just a one-off claim). Brandt 2008 (page-verified): EAR-drift was real and continued (+6.3% over
   240d) in **1987–2004 US** data. Rockstead replication (page-verified): in **1996–2026** data EAR **reverses**
   (−3.39%), while SUE stays positive (+3.91%). The EAR/sentiment signal **decayed** post-2004; SUE is durable.
   Since Exp16 can only build the EAR leg, its **FIRST gate must be "continue vs reverse"** on Indian mid-caps —
   reversal is a valid (informative) outcome, not a fail-to-tune. (The paper itself even flags slight
   inter-announcement mean-reversion.)
2. **Anomaly decay** — the India size anomaly is *fading* (Sharma et al. 2021) → Exp16 must pass on the
   recent sub-period, not just full-sample.
3. **G4 disk fragility** — the midcap backfill crashed prod once; re-run only via the safety runbook
   (measure volume → grow → narrow-first → periodic guard).
4. **Survivorship** — `nifty-midcap150.json` is today's index; pre-2018 backtests overstate. Prefer recent windows.
5. **Evidence provenance** — mostly resolved 2026-06-04 (Gemini recon, page-verified): SLB stats (341 scrips,
   ₹57.32 cr, Mar-2026), the Brandt EAR primary (+6.3%/+5.6%/11.5%, 1987–2004), and SEBI Aug-2024 F&O criteria
   (F&O list now ~180–225 names) are all **page-verified**. STILL unresolved: the **Sehgal liquidity/size split
   could NOT be accessed** → the "drift bigger in illiquid vs just smaller" question must be **measured on our
   own data post-G4** (compute the Amihud/size boundaries ourselves), not taken from literature.

## 7. Build sequence (the critical path)
1. ✅ ~~**G4**~~ **DONE** (verified 2026-06-05: 150/150 Midcap-150 in `research_prices`, 2009→2026). No
   resize/backfill needed. *Pillar B is unblocked.*
2. **Exp 16 (Lijo) ← the live next action** — quality spot-check the midcap series, then run the long-only
   EAR-proxy PEAD pilot; FIRST test continue-vs-reverse, then the cost/DSR/recency gates. *Decides whether
   Pillar B is real on our universe.*
3. **G1 (James)** — raise mid/small-cap news→ticker coverage (the real gap is **alias-form**, not master
   size — master is complete at 2,386; see g1-tagging-gap note). *Unblocks Pillar A.* (Independent; parallel.)
4. **If EAR reverses / is weak** — file the consensus/fundamentals collector to build the SUE leg (Exp 17),
   the leg the replication says actually works.
5. **Combine** Pillar A (be early) × Pillar B (drift) only once both are individually validated on mid-caps.

## 8. Gate-checked overall verdict (updated 2026-06-05)
- **The bet is coherent, the premise is sourced, and the data is READY** — G4 is done (150/150 midcaps
  priced). Pillar B (Exp16) is **runnable now**; the only remaining gate is **G1** for Pillar A. The one
  serious method risk is still **EAR reversal** (test it first).
- **Gate**: data tier ✅ (G4 done — midcap prices present) · kill list ✅ (proprietary research, not UI/SaaS)
  · live consumer ✅ (this *is* the live consumer) · right denominator ✅ (net-of-cost CAR + continue-vs-reverse
  + recency).
- **One-line**: *G4 is done — run **Exp 16** now (continue-vs-reverse first) and let it tell us if the EAR
  signal drifts or reverses on Indian mid-caps. G1 alias-fix proceeds in parallel for Pillar A.*

---
*Living doc. Update as G4/G1 land and Exp 16 reports. Companion notes (all 2026-06-04): pead-mid-small-caps
(+followup), pead-size-liquidity-resolution, ear-proxy-risk-for-exp16, g4-midcap-backfill-safety.*
