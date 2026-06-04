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
> **Next free ID: `Exp16`.**

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

---

## How to allocate the next ID

1. When an experiment reaches **pre-registration** (a brief in `wiki/experiments/`), claim the next free ID here in the same commit: add a row, bump the "Next free ID" line.
2. **Research notes / learning articles / repo reviews do NOT mint IDs.** They write *"next free Exp ID (ExpNN at time of writing)"* — the number is provisional until pre-registration claims it here.
3. IDs are permanent. A rejected/null experiment keeps its number; the next experiment takes the next integer.

## Pending claims on Exp16 (resolve at pre-registration)

Two candidates currently reference "Exp16" provisionally — only one can take it:
- **G6 sentiment calibration test** (does a finance-domain model fix the FinBERT positivity bias?) — from `learning/articles/2026-06-04_bloomberggpt-*.md`.
- **PEAD Day-0 price-reaction-proxy pilot** (gated on G4) — from `learning/research-notes/2026-06-04_pead-mid-small-caps.md`.

Whichever is pre-registered first claims Exp16; the other takes Exp17.
