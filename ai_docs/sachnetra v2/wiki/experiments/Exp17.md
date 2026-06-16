---
tags: [experiment, sachnetra, research, quant-finance, PEAD, intraday, latency, gate, midcap, null]
source: [[sachnetra_research_playbook]], [[Exp16]], [[Exp10]], [[Exp4]], [[2026-06-05_earnings-announcement-data-sourcing]]
experiment_id: Exp17
status: COMPLETE — 🔴 RED GATE + cheap SUE shot taken (also RED) ⇒ lane CLOSED (no minute data, no SUE build; → G1)
authored_date: 2026-06-05
run_date: 2026-06-05
verdict: 🔴 RED — the day-0 results reaction is LARGE ENOUGH (35–44% of events move >2.5%) but does NOT continue — top-reaction names show ZERO-to-slightly-negative next-session drift (−0.05% to −0.34%, t≈−0.7, ns). The market reprices within the session; a slower participant captures nothing net of 100–250 bps cost. The one cheap SUE shot (§C2 / Exp17b, volume-confirmed-surprise surrogate) ALSO returned RED — even high-abnormal-volume reactions show ~zero forward drift (+0.10%/−0.17%, ns). Lane closed: do not acquire minute data, do not build the SUE/XBRL collector; move to G1.
audience: Lijo, James, future Claude Code sessions
---

# Experiment 17 — Gate 0: is the intraday mid-cap results reaction worth capturing?

> **Purpose:** a *free, read-only* gate placed BEFORE any spend on intraday (minute) data, to decide
> whether bet **(B)** — capturing the intraday drift after a results filing on under-covered midcaps — is
> alive. If the day-0 reaction clusters below cost, sits in a non-capturable overnight gap, or reverses
> next session, we KILL (B) without buying data. Script: `scripts/research/exp17-intraday-reaction-gate.mjs`.

## 0. One-paragraph verdict
On the liquid half of the Nifty-Midcap-150 (Amihud-below-median, 75 names), results filings produce a
**genuinely large day-0 reaction** — median |EARcc| 1.6% (intraday filers) to 2.2% (after-close), with
**35–44% of events moving more than 2.5%**. So magnitude is *not* the binding constraint (this refutes the
simplest "moves are too small" reading of the Exp10 squeeze). **The binding constraint is persistence:**
the names that react hardest on the filing day show **no positive next-session drift** — top-quintile
positive-EAR events drift **−0.34%** (intraday filers) / **−0.05%** (all), statistically indistinguishable
from zero and leaning *negative*. The reaction is fast and complete by the close; a participant who is not
*inside* the initial repricing captures nothing, and net of a 100–250 bps round-trip the bet is deeply
negative. **🔴 RED gate — do not buy intraday data to chase drift.**

## A. Data (read-only, run 2026-06-05)
Universe `shared/nifty-midcap150.json`, liquid 75/150. Results filings classified by the Exp2/16 regex.
Reaction day `r` = the filing's own session for an **intraday** filing (09:15–15:30 IST), else the **first
trading day after** the filing (after-close/weekend/pre-open). 27,133 results filings → **880 usable**
events on liquid names (26,244 dropped illiquid; |EARcc|>25% removed 0). Span 2024–2026 (announcement-depth
capped, same as Exp16).

## B. Results

**Reaction by filing time-of-day** (EARcc = market-adjusted close-to-close on the reaction day):

| bucket | N | /yr | med &#124;EAR&#124; | >1.5% | >2.5% | med &#124;intra&#124; | med &#124;gap&#124; | capturable? |
|---|---|---|---|---|---|---|---|---|
| **intraday** (09:15–15:30) | 200 | 101 | 1.58% | 52% | 35% | 1.85% | 0.48% | intra = T0 capture ceiling |
| after-close (>15:30) | 610 | 307 | 2.19% | 62% | 44% | 2.02% | 1.35% | ~44% locked in overnight GAP |
| pre-open / weekend | 70 | 36 | ~1.6% | ~55% | ~35% | — | — | open gap |

- **Only ~1/4 of filings are intraday** (200 of 880) — the rest react via an opening gap a slow trader
  buys alongside everyone else. For after-close filers, **~44% of the move is the non-capturable gap**.

**The bet — top-quintile positive EARcc, does it CONTINUE or REVERSE?** (next-session market-adj drift)

| scope | cutoff EARcc | N | next-session drift | t | net @250bps | med &#124;T0 intra ceiling&#124; | read |
|---|---|---|---|---|---|---|---|
| intraday filers | 2.61% | 40 | **−0.34%** | −0.72 | −2.84% | 4.03% | no drift (slight reversal) |
| all filers | 2.53% | 176 | **−0.05%** | −0.28 | −2.55% | 3.88% | no drift |

The strongest reactions have a ~4% same-session move (real) but **zero continuation afterward** — the
hallmark of an efficient, fully-in-session repricing (and consistent with EAR being an *overreaction*
proxy, the pre-registered Exp16 caveat).

## C. Interpretation (decision-grade)
- **(B) as an EAR-selected intraday→drift capture: DEAD.** Not because the reaction is small — it's large —
  but because it **does not persist**. There is no leftover drift for a participant who isn't part of the
  initial move, and on a *public* feed (every desk sees each NSE filing at once) we are not faster than the
  algos that make that initial move. Buying minute data to chase continuation would be wasted spend.
- **This is the same efficiency verdict three times now:** [[Exp16]] (next-day drift, null), [[Exp14]]
  (governance shocks, null), and now Exp17 (intraday reaction, large but non-persistent). The NSE mid-cap
  *results* reaction is fast and complete.
- **The Exp10 squeeze, refined:** it's not "moves too small." It's "moves are big **but fully priced by the
  close**." The latency edge needs slow *price incorporation*, and here incorporation is fast even when the
  newswire is slow — the order book moves without waiting for the wire.

### What survives (cheap threads)
1. **SUE selection (fundamental surprise, not price reaction).** EAR buys overreacted names that revert;
   top-SUE names *might* behave differently. → **TAKEN as the one cheap shot — see §C2 below. Also RED.**
2. **Short-term reversal / contrarian** (fade the overreaction) — the data leans this way, but it's the
   *opposite* of PEAD, needs its own gate, and the short leg is dead (SLB) so it'd be long-only "buy the
   down-overreactions," a different experiment.

## C2. The one cheap SUE shot — taken 2026-06-05 (Exp17b). Also 🔴 RED.

The surviving thread (§C, item 1) was "select on fundamental *surprise* (SUE), not price *reaction* (EAR) —
maybe that drifts." We took the cheapest honest version of it. Two findings:

**(i) A proper EPS-SUE is not cheaply executable — it stays PARKED, not "in hand."** Checking the DB
corrected an earlier over-claim:
- There is **no fundamentals/EPS table** — EPS is stored nowhere.
- **`has_xbrl` is just a boolean flag, not the data.** The structured XBRL *document URL* isn't stored
  (`attachment_url` is the PDF). `has_xbrl` is *mostly* reliable as "a results filing" (only ~53 of 14,532
  are delay-notice contaminants), but getting actual EPS still requires **fetching + parsing XBRL per
  filing off NSE**, or the **Indian API** (needs a Lijo signup/key — `2026-06-04_indian-api-probe.md`).
  Neither is a quick script. So "we already hold the EPS, no OCR" was wrong: we hold the *flag*, not the
  number.

**(ii) The cheap *surrogate* for surprise-quality says SUE won't help.** Standard PEAD refinement: reactions
backed by **high abnormal volume** (real information / conviction) are the ones that should drift; low-volume
ones are noise that reverts. We have volume, so we tested it (`exp17b-surprise-quality.mjs`): among
top-quintile positive-EAR events, split by abnormal volume (median ~4.7× normal):

| scope | subset | next-session drift | t | net @250bps |
|---|---|---|---|---|
| intraday | HIGH vol (real surprise) | **−0.17%** | −0.23 | −2.67% |
| intraday | LOW vol | −0.45% | −0.70 | −2.95% |
| all | HIGH vol (real surprise) | **+0.10%** | 0.31 | −2.40% |
| all | LOW vol | −0.12% | −0.55 | −2.62% |

**Even volume-confirmed, high-conviction reactions show ~zero forward drift** (+0.10% / −0.17%,
insignificant, deeply negative net of cost). If information-backed reactions don't drift, an EPS-surprise
signal almost certainly won't either — the market prices the result within the session regardless of
surprise quality. **The cheap SUE shot fails ⇒ a proper SUE build is not justified.**

### Decision (final)
- **Lane closed.** Efficiency wins four ways now — [[Exp14]] (governance), [[Exp16]] (next-day drift),
  Exp17 (intraday reaction), Exp17b (volume-confirmed surprise). The NSE mid-cap *results* drift family is
  exhausted. Do **not** buy minute data; do **not** build the SUE/XBRL collector.
- **Move to G1 alias-normalization** (tagging recall) — the open, non-exhausted lane.

## D. Artifacts
- `scripts/research/exp17-intraday-reaction-gate.mjs` — the Gate-0 reaction/continuation probe (read-only).
- `scripts/research/exp17b-surprise-quality.mjs` — the cheap SUE-shot surrogate (volume-confirmed), read-only.
- `scripts/research/output/exp17/exp17_events.csv` — per-event bucket / EARcc / gap / intra / continuation.

## E. H17 register row (for the playbook)
```
| H17 | 2026-06-05 | Day-0 results reaction on liquid midcaps is large, capturable intraday, and CONTINUES net of cost | india_bourse_announcements (results) + research_prices (daily OHLC) | Gate 0: timing split + EARcc magnitude vs 150/250bps + gap/intra decomposition + next-session continuation on top-quintile EAR | reaction large (35–44% >2.5%) BUT next-session drift −0.05%/−0.34% (ns), ~44% of after-close move is non-capturable gap, only ~25% file intraday | 2024–2026; EAR≠surprise; daily-data proxy for intraday | 🔴 RED — large but non-persistent reaction; do not buy minute data | Optional one-shot SUE-selected re-test (XBRL); else lane closed → G1 |
```
