---
tags: [experiment, sachnetra, research, registry, index, id-allocation]
source: [[sachnetra_research_playbook]]
status: LIVING — the single source of truth for experiment-ID allocation
last_updated: 2026-06-04
audience: Lijo, James, future Claude Code / research sessions
---

# Experiment Registry — SachNetra Quant Research Program

> **This is the single source of truth for experiment IDs.** Before referencing or minting an
> experiment number, check this table. **Never mint a new `ExpNN` in a research note, article, or
> repo review** — write *"next free Exp ID"* and let the number get assigned here at pre-registration.
> IDs are **never reused**, even when an experiment is rejected/null.
>
> **Next free ID: `Exp23`.**

---

## Registry

| ID | Title | Status | Verdict | Binding gap / note |
|----|-------|--------|---------|--------------------|
| Exp1 | Does FII flow predict the next-day Nifty move? | COMPLETE | ❌ DEAD (primary) + 🟡 tiny coincident effect + ⬜ DII blocked | G3 (DII uncollected) |
| Exp2 | Do NSE bourse announcements move prices? (event study) | INCONCLUSIVE | ⬜ one real-ish same-day effect (DAY0 +0.48%, t=3.08, n=205); category-level untestable | G4 (Nifty-50-only prices) + calendar time |
| Exp3 | News sentiment as a time series | INCONCLUSIVE | ⬜ method validated; sentiment looks coincident not leading; positivity bias flagged | G6 + data too young (N=16) |
| Exp4 | Does the bourse lead the newswire? (latency edge) | COMPLETE | 🟡 SUPPORTED — first leading signal; bourse leads ~13 min, p≈0.002, n=239; large-cap-gated | G1 (tagging ~1.7%) + G2 (format) |
| Exp5 | Do sentiment + flow tails line up with shocks? (EVT teaser) | DEFERRED | ⏸ both arms blocked; revisit ~Aug 2026 as a proper EVT/GPD study | sentiment too young (time) |
| Exp6 | Does FII flow predict VOLATILITY (not direction)? | COMPLETE | 🟡 SUPPORTED unconditionally (outflow asymmetry +24%, t=6.6) — **partly superseded by Exp7** | none new |
| Exp7 | GARCH-X: does \|FII flow\| beat a plain GARCH(1,1)? | COMPLETE | ❌ NULL — \|flow\| not incremental to GARCH vol-persistence (γ≈0, LR p=0.38) | none new |
| Exp8 | Is the FII-outflow volatility asymmetry just the LEVERAGE EFFECT? | COMPLETE | 🟡 SUPPORTED — asymmetry survives own-return control (t 6.99→5.83); not merely leverage | none new |
| Exp9 | GARCH-X re-run with a validated estimator | COMPLETE | ❌ NULL CONFIRMED — flow→variance question closed for symmetric-Gaussian GARCH(1,1) | none new |
| Exp10 | Do tagged large-cap NSE filings move the price (intraday)? | COMPLETED | ⬜ INCONCLUSIVE + 🚩 SUSPECT — surfaced the latency-vs-value squeeze | latency↔value tradeoff |
| Exp11 | News-ticker tagging coverage / recall diagnosis (G1) | BRIEF | scoping (pre-registration); coverage ~8% (24h), recall ~28% among market-moving | G1 (master gaps + untaggable macro) |
| Exp12 | Are there cointegrated, tradeable Nifty-50 pairs? | COMPLETE | 🟡 PROMISING | — |
| Exp13 | Does Nifty drift between trending and mean-reverting regimes? | COMPLETE | 🟡 WEAK DRIFT | — |
| Exp14 | Do governance shocks move prices? (auditor / pledge event study) | RE-RUN 5 | ❌ NULL — well-powered null (auditor_resignation N=185 +27bps; pledge_increase N=42 −63bps ns); refuted on listed names | survivorship ceiling |
| Exp15 | Volatility-Adjusted Cross-Sectional Momentum on Nifty Midcap 150 | REJECTED | ❌ did not meet OOS criteria | — |
| Exp16 | Long-only mid-cap PEAD via day-0 EAR proxy | COMPLETE | ❌ NULL — gross drift ≈+0.5% (ns, p 0.36–0.56); net<0 at 100/250bps; DSR 0.000; N=105 | announcement history (only 2024-05→2026-05) — H16c untestable |
| Exp17 | Intraday mid-cap results-reaction gate (+ Exp17b SUE surrogate) | COMPLETE | 🔴 RED — day-0 reaction large (35–44% move >2.5%) but non-persistent (next-session drift −0.05%/−0.34%, ns); volume-confirmed surrogate also RED | lane closed (no minute data, no SUE build) → G1 |
| Exp18 | Post-disclosure drift after institutional BUY bulk/block deals | COMPLETE | ❌ NULL (confound + leakage) — BUY POST −0.31% gross/−2.81% net@250bps; PRE+DAY0 +9.89% (all pre-disclosure); BUY−SELL −0.10% (asymmetry veto fails); N=6,120 BUY | survivorship (13,910 unpriced dropped); deal depth 4.6y |
| Exp19 | IC-weighted size-neutral walk-forward cross-sectional ensemble (v1) | COMPLETE | ❌ NOT SUPPORTED — composite OOS IC **+0.043** (IR 0.26), gross ≈+0.84%/mo but net −1.66%@250bps; blend = **momentum** (drop-mom→IC 0.010; ear/deal add ≈0). Harness built. First non-negative XS read. | feeders (G6 sentiment, G1 latency) are now THE test; conservative cost; sparse unique cols |
| Exp20 | Sentiment calibration (G6) + per-ticker sentiment feeder for Exp19 | BRIEF | pre-registration ([[exp20_brief]]) — the load-bearing feeder: does calibrated per-ticker sentiment add XS IC beyond momentum? Re-scoped G6 to RANK quality (z-score already removes uniform bias) | G1 tagging recall (coverage) + gold-label quality + headline-only |
| Exp21 | Filing→press latency by market-cap tier (the head-start measurement) | BRIEF | pre-registration design ([[exp21_brief]], 2026-06-09) — timing half runnable; price-impact half deferred (research_prices stall → V2-018d) | coverage-honesty layer; research_prices stall |
| Exp22 | H2-2026 one-shot confirmations: (H-A) illiquid post-filing drift vs magnitude-matched placebo; (H-B) the NO-FILING pair ripple on the frozen 19 pairs | **PRE-REGISTERED 🔒** | window 2026-06-13→11-30, ONE evaluation Dec 2026, trial #1; frozen defs + kill conditions in [[prereg_filing_and_ripple_confirmation_2026H2]]; motivated by probes P1a/P1f + the 6-round fresh-eyes review | announcements depth (2024-06+); survivorship (universe-log now baselining); probe-grade priors only |

---

## How to allocate the next ID

1. When an experiment reaches **pre-registration** (a brief in `wiki/experiments/`), claim the next free ID here in the same commit: add a row, bump the "Next free ID" line.
2. **Research notes / learning articles / repo reviews do NOT mint IDs.** They write *"next free Exp ID (ExpNN at time of writing)"* — the number is provisional until pre-registration claims it here.
3. IDs are permanent. A rejected/null experiment keeps its number; the next experiment takes the next integer.

## Resolved: Exp16 claim (2026-06-05)

The **PEAD Day-0 price-reaction-proxy pilot** was pre-registered first ([[exp16_brief]]) and claimed **Exp16**
(now COMPLETE — ❌ NULL, see [[Exp16]]).

## Resolved: Exp17 ID collision (2026-06-07)

A stale note here previously pre-assigned `Exp17` to the **G6 sentiment-calibration test**, but the
**intraday mid-cap results-reaction gate** was actually built, run, and written up as **[[Exp17]]**
(COMPLETE — 🔴 RED, 2026-06-05) before that test ever pre-registered. Per the "IDs are assigned at
pre-registration, never reused" rule, **Exp17 = the intraday reaction gate** (the artifact that exists wins).
Consequently:
- **Exp18** is claimed by the **post-disclosure bulk/block-deal study** ([[exp18_brief]], 2026-06-07).
- The **G6 sentiment-calibration test** takes the **next free ID (`Exp20`)** if/when it pre-registers
  (Exp19 was claimed 2026-06-07 by the cross-sectional ensemble, [[exp19_brief]] — for which calibrated
  sentiment is a *feeder* input). It is also a feeder for the latency column via G1.
