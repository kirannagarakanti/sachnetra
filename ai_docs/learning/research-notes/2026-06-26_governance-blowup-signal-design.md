---
tags: [design, governance-signal, blow-up, risk-overlay, pre-registration, structural-intelligence, fresh-eyes]
date: 2026-06-26
status: DESIGN DRAFT — the mechanics of the chosen door ([[project-pivot-governance-door]]). Grounded in repo
  reality (Exp14 already exists; survivorship ceiling already documented). Feeds the fresh-eyes DESIGN round +
  the prototyper. NOT yet pre-registered — that's the output of this design, after fresh-eyes.
related: 2026-06-26_fresh-eyes-sharpen-the-pivot.md, ai_docs/sachnetra v2/wiki/experiments/Exp14.md,
  scripts/research/exp14-governance-shock-event-study.mjs, ai_docs/sachnetra v2/wiki/experiments/_data_gaps_backlog.md
---

# Governance "Blow-Up" Risk Signal — Design

## The one-line product
A per-company, point-in-time **Governance Friction Score** built from regulatory filings, that flags names heading
for a **blow-up** (permanent capital loss / default / delisting) **12–18 months before the rating agencies or the
price move** — sold as a **toxic-asset EXCLUSION filter** (avoid catastrophe), not an alpha generator.

## What we ALREADY have (don't rebuild)
- **`exp14-governance-shock-event-study.mjs`** — extracts `auditor` (`/auditor/`) and `promoter_pledge`
  (`/pledg|encumbr/`) filings from `india_bourse_announcements`, with sub-tags (auditor_resignation/change,
  pledge_increase/release), strict point-in-time event-day logic, dedupe, concentration checks, a self-test, and a
  locked verdict ladder. **The extraction + discipline is reusable as-is.** It currently measures the WRONG target
  for our purpose (±5-day CAR, short-term), but the plumbing is right.
- **`india_bourse_announcements`** — NSE filings, ~17k+ rows, 2,104 symbols. The dashboard contract
  (`india_bourse_filings.md`) already defines a richer taxonomy than Exp14 uses: `credit_rating`, `board_outcome`,
  `management`, `mna`, `takeover`, `sast`, `pledge` — i.e. the other Friction inputs (KMP churn, board exits, rating
  actions) are already in the stream, just not yet sub-classified.
- **`research_prices`** — daily prices + log returns. **BUT current Nifty universe only** (deepened to ~150 midcaps
  to ~2009 via G4) → see the crux below.

## THE CRUX — survivorship (the thing the 8 strangers could not see)
Documented in `_data_gaps_backlog.md` §"Survivorship-bias ceiling": `research_prices` (Yahoo) holds only the
**current** universe. **Blow-ups get delisted → they vanish from the price series → the positives that would prove
the signal are systematically absent.** A naive "rank the universe, track forward returns of the red-flag cohort"
backtest (Gemini's blueprint) will therefore produce a clean, confident, *untrustworthy* number — the same
overfit-and-self-grade failure that killed the router and the trade. **Any design that labels blow-ups from PRICE
RETURNS inherits this hole.** This is the central design problem, not a footnote.

Second constraint: **history depth.** Live NSE announcements only reach back ~2024-05-30 (rolling window). Gemini's
2016–2022 stress window (IL&FS, COVID) needs a **BSE archival backfill whose depth is UNVERIFIED** (Lane 1). So a
historical blow-up study is gated on archival depth; a forward-only study can't yet show a 12–24mo outcome window.

## The design fork that actually matters: how do you LABEL a blow-up?
| Option | Label source | Survivorship-robust? | Feasible now? |
|---|---|---|---|
| **A — price-return blow-up** (Gemini's): >30% rel-drawdown / 50% peak-loss-no-recovery | `research_prices` | ❌ NO (delisted names absent) | partial (current names only) |
| **B — regulatory-record blow-up**: delisting/suspension notice, NCLT/IBC insolvency, payment-default disclosure, SEBI debarment, **ASM/GSM surveillance** flag, auditor *adverse opinion* | the FILING / exchange surveillance stream | ✅ YES (the flag exists even for dead names) | needs an ASM/GSM + insolvency + delisting collector |
| **C — credit-event blow-up**: ≥2-notch agency downgrade | `credit_rating` filings (companies file these) | ✅ mostly | partial — rating-change *filings* exist going forward |

**Design insight:** Option B sidesteps survivorship entirely — you label the blow-up from the **regulatory exhaust**
(which persists for delisted names), not from a price series (which doesn't). The sharpest honest MVP is therefore
**not** Gemini's price-return backtest. It's: *does our Friction Score rise materially BEFORE a company hits a
public distress flag (ASM/GSM / insolvency / delisting / adverse audit / 2-notch downgrade), and how many days of
lead time does it buy vs that flag?* That's survivorship-robust, it's exactly Gemini's "lead time" pitch metric, and
it reframes the product from "predict returns" (smells like the dead trade) to "early-warning vs the official flag."

## Proposed signal mechanics (the Friction Score)
Point-in-time, per company, rolling 6-month decayed sum of weighted filing events (all timestamped at **PDF publish
time**, never event date — the one look-ahead slip a fund quant will kill us for):
- **High weight:** statutory auditor resignation (esp. "citing lack of information"), promoter pledge *increase* /
  encumbrance / margin-call / invocation, ≥2-notch credit downgrade filing.
- **Medium weight:** sudden CFO/CS/KMP exit, board-member resignation, delayed results, RPT spike.
- **Low weight:** routine board shuffles, boilerplate auditor notes (near-zero).
Start with the **structured/regex extraction we already have** (auditor + pledge) and the existing filing categories
(credit_rating, board_outcome, management) — **defer the LLM-nuance scoring** (Gemini's full vision) until the crude
score shows signal, because LLM-nuance leans on our weakest link (router/NLP at 87%, [[project-router-gate]]).

## Pre-registration skeleton (lock BEFORE running — the DSR-honesty that killed the trade rides along)
- **Universe:** name it point-in-time (BSE 500 / Nifty 500 membership AS OF each date) — we DON'T have PiT membership
  yet (open data ask). Interim: largest N we can price + an explicit survivorship caveat on every output.
- **Window:** as deep as the archival backfill reaches; pre-commit it before looking at outcomes.
- **Label:** Option B primary (regulatory distress flag), C secondary, A only as a survivorship-caveated cross-check.
- **Metrics to pre-commit (Gemini's four, kept):** (1) **Lead time** — days our score fired RED before the official
  flag; (2) **Hit rate** — % of red-flag names that hit a distress flag within 18mo; (3) **False-positive rate** —
  % red-flag names that instead doubled / stayed healthy; (4) **Orthogonality** — score fired while price was flat/up
  (not just trailing a falling stock).
- **Kill gate:** if the top-friction decile shows no elevated distress-flag rate AND no lead time vs the flag across
  3–4 sensible signal variables → governance signal is dead, stop. (Mirror Exp14's locked verdict ladder.)

## Open design decisions (for fresh-eyes + Lijo)
1. **Label source** — adopt Option B (regulatory-flag) as primary over Gemini's price-return Option A? (My strong
   lean: yes — it's the only survivorship-robust path we can run.)
2. **The survivorship/PiT-universe data ask** — do we invest in a point-in-time, delisting-inclusive price+universe
   (assemble from daily BSE/NSE bhavcopy snapshots forward; archival is the hard part)? This is the real
   build-vs-skip decision under the whole door.
3. **History vs forward** — backfill 2016–2022 (gated on BSE archival depth probe) for an immediate study, or start
   forward-only and accept a 12–18mo wait for outcomes? Or both?
4. **Scope of extraction now** — ship with the crude regex/category extraction (fast, dodges NLP), or invest in the
   LLM-nuance layer first (higher fidelity, leans on our weak link)?
5. **Positioning** — productizing this as a sold risk-overlay still brushes positioning_v2's B2B-kill ([[project-v2-positioning]]); confirm we want the "sell to risk/credit desks" shape before building toward it.

## FRESH-EYES DESIGN BRIEF (paste-ready — pressure-test the DESIGN, not the idea)
The idea is decided; this round stress-tests the mechanics. Give the strangers our real constraints so they critique
a grounded design, not a fantasy:

```
We're designing (pre-registration stage) a historical backtest for a governance "blow-up" early-warning signal on
Indian listed companies. The signal = a per-company rolling "friction score" from regulatory filings (auditor
resignations, promoter-pledge increases, sudden CFO/board exits, credit-rating downgrades, related-party-transaction
spikes). The claim we want to prove to a fund risk desk / private-credit desk: this score flags names heading for a
blow-up (default / permanent capital loss / delisting) 12-18 months before the rating agency or the price moves.

Hard real-world constraints you must design AROUND (these are non-negotiable facts of our data):
1. SURVIVORSHIP: our price history only covers companies that still trade today. Names that blew up and delisted are
   ABSENT from the price series. So any "blow-up" defined by price returns is measured on a sample that excludes the
   very events we care about.
2. Our clean filings history only goes back ~2 years; deeper history (to cover IL&FS-2018 / COVID-2020 stress) needs
   an archival backfill of unverified depth.
3. Two people, no budget, free data only. No paid point-in-time universe, no paid rating-history feed.

Be blunt and specific:
1. Given survivorship, how do you define and label a "blow-up" so the backtest is HONEST? (We're considering labeling
   from the regulatory/exchange record itself — insolvency/delisting/surveillance flags — rather than from price. Poke
   holes in that; propose better.)
2. What is the single most rigorous yet ACHIEVABLE version of this backtest given the 3 constraints — what do we
   pre-register, and what's the one metric that, if it holds, a risk desk would actually pay for?
3. What is the subtle bias or look-ahead that will sneak in and make us fool ourselves (beyond survivorship)?
4. What's the cheapest experiment that would KILL this in two weeks if it's hollow?
```
(Attack round: after they answer, show them our Option-A/B/C label fork + the four pre-registered metrics, and ask
them to rank + red-team. Then Claude anchor reality-check → prototyper runs the agreed minimal version on Exp14's
plumbing → Lijo decides.)
