---
date: 2026-06-06
problem: After three event-study nulls in a row (Exp14/16/17) the one bet (mid-cap PEAD/latency) looks exhausted. Before the kill-signal fires, do a systematic, honest hunt for where a *defensible* edge could still live — ranked by edge plausibility × data-readiness × cost-survivability — grounded in the unique data SachNetra already collects, not in wishful thinking.
status: researched — edge-hunt synthesis. Opinion + page-checked externals. Proposes the next experiment; mints no Exp ID (flags the live Exp17 collision).
lane: Lijo (decide the bet) + James (build collectors/executor)
tags: [research-note, edge-hunt, alpha, bulk-deals, block-deals, options-OI, participant-oi, alt-data, nowcasting, ensemble, multi-signal, smart-money, strategy]
sources_consulted: [
  "Internal: research_state_summary.md; midcap-event-arbitrage-dossier.md; positioning_v2.md; _data_gaps_backlog.md; experiments/_index.md; 2026-06-05_earnings-announcement-data-sourcing.md; CLAUDE.md V2 status (collectors live)",
  "External page-checked 2026-06-06: Emerald MF-08-2021-0374 'What's hidden behind bulk deals?' (NSE 2010-19, 5-7%/wk around deals, buy>sell, front-running); ScienceDirect S1566014115000138 (price manipulation/front-running bulk trades India); SCIRP 88060 Harshita India PEAD (Nifty500, SUE=(EPS-EPS_-4)/P, 6%/64d, survives illiquidity/size, SUE×Size sig); Quantpedia PEAD (SUE∩EAR quintiles, ~15%/yr, small-cap concentrated); ScienceDirect S0140988323005042 (electricity nowcasts industrial production, beats oil/stock predictors); arXiv 2406.18394 AlphaForge + 2508.18592 IC-dynamic-weighting + 2603.13252 'When Alpha Breaks' (combine weak alphas, IC-weight, tail-uncertainty)",
  "External: niftytrader/Swastika explainers on participant-wise FII index-futures OI (signal over 3-5 sessions, noisy 1-day)"
]
---

# Edge Hunt: where a defensible alpha could still live (and where it can't)

> Written because the honest read of the program is sobering — **three event-study nulls in a row**
> (Exp14 governance, Exp16 EAR-PEAD, Exp17 intraday capture) on top of the FII-flow nulls (Exp1/7/9). The
> question this note answers is not "how do we save PEAD" (we can't — see §1) but **"given everything proven
> and refuted, and the unique data we already collect, where is the highest-probability undiscovered edge?"**
> No silver bullet is claimed. Two paths carry most of the remaining probability mass; one new experiment is
> recommended. (New note; edits nothing except an index pointer.)

---

## 0. The honest prior (read this first)
A "miracle" — one strong, clean, tradeable signal hiding in plain sight — is **unlikely**, and the program's
own rigor is why we can say that. India's classic anomalies are **decaying** (Sharma 2021; Harshita's own
2008-17 sub-period already weaker than 2002-08), and the simplest signals (FII flow→direction, FII
flow→vol, EAR-drift, intraday capture, index mean-reversion, momentum) are **individually killed or weak**.
So the rational search is **not** "find the one big alpha." It is:
1. Look where the **documented effect size is large enough to clear the 100-250 bps cost floor** that killed
   PEAD — i.e. effects in the **5-7% range**, not the 0.5% range.
2. Look at the **unique data we already own** that almost nobody has structured for free (deals, options OI,
   participant positioning, FASTag, electricity, deep FPI), because under-arbitraged data beats
   over-tested price signals.
3. Consider that the edge may be **methodological, not a new signal**: real quant P&L comes from *combining
   many weak alphas*, and the program has only ever tested signals **one at a time** — which is the single
   most likely reason for the null streak.

Everything below is ranked on **edge plausibility × data-readiness × cost-survivability × capacity**.

---

## 1. First, kill the false hope cleanly (so we don't chase it)

**PEAD/SUE is not the miracle.** I went deep on the SUE leg (the team's "last cheap shot") and it does *not*
rescue the bet — for reasons that are now page-verified, and one of which *corrects the internal thread*:

- **The internal thread imported a US conclusion that doesn't hold in India.** It concluded "EAR decayed/
  reverses, SUE is durable" from US data (Brandt 2008 EAR-drift 1987-2004; Rockstead EAR-*reversal*
  1996-2026). But the **India-specific** record says the opposite: an NSE200 study (2005-16) finds **EAR
  *beats* SUE (7.55%/yr, ~1.3% more) and does *not* reverse**, and Harshita (Nifty500, 2002-17) finds
  **SUE-PEAD real (6%/64d), surviving illiquidity/size/P-B/idio-vol controls**, *stronger in small caps*
  (SUE×Size coeff −0.06, sig.). So **in India both EAR and SUE PEAD were real pre-2018** — EAR is *not* the
  wrong proxy. **Exp16's null is therefore a *decay + cost + tiny-window + liquid-half* story, not a
  proxy-choice story.** Building the SUE leg won't fix any of those four — SUE faces the identical gauntlet.
- **The real structural problem is a "drift-vs-liquidity squeeze":** the India drift is documented as
  *strongest in small caps* (where you can't trade it after 300+ bps cost), and the liquid Midcap-150 half
  we *can* trade is exactly where it's weakest. This mirrors the latency-vs-value squeeze (Exp10). PEAD in
  India is an academic anomaly that **doesn't survive the liquidity+cost gauntlet at retail long-only
  scale.** That's a *real finding*, not a data gap.
- **Build note for the record (if SUE is ever run anyway):** use **Harshita's price-deflated
  SUE = (EPS_q − EPS_{q−4}) / Price** as primary — it's the India-validated form AND needs only
  same-quarter-last-year EPS (5 quarters), vs Bernard-Thomas σ-SUE which needs 8-12 quarters to estimate the
  denominator. And source the EPS *history* from a **fundamentals API (IndianAPI ~13 quarters to 2021, or
  Screener 10y)** — *not* by parsing the 2-year XBRL we hold (which only gives the live forward signal). But
  the §1 verdict stands: **don't expect SUE to clear cost on the liquid band.** One shot, long shot — and
  now we know precisely *why* it's a long shot.

→ **Verdict: stop spending the bet's cheap shots on price-reaction PEAD. The probability mass moved.** It is
now in §2 and §3.

---

## 2. The closest thing to a miracle: bulk/block-deal smart-money following (data already collected)

**Why this jumps to #1.** It is the only candidate where a **peer-reviewed effect size is an order of
magnitude above our cost floor**, on **data we already collect (V2-030, code-complete)**, using the
**event-study competency the program already has** (reuse the Exp2/Exp16 harness):

- Emerald (MF-08-2021-0374), NSE 2010-19, event study: **front-runners achieve 5-7% within a week around
  the deal**; cumulative abnormal returns as high as **7.49%**; **BUY deals >> SELL deals**; abnormal
  returns concentrate where institutions accumulate. A 5-7% effect **crushes** even a 250 bps cost floor —
  the exact thing PEAD (0.5%) could never do.
- The mechanism is *different* from everything refuted: it's **institutional information/accumulation**, not
  FII *cash-flow direction* (Exp1, dead), not earnings *price reaction* (Exp16, dead). New mechanism = a
  genuinely independent shot, not a re-litigation.

**The honest catch (and why this is an *experiment*, not a trade):** the literature's big number is partly
**pre-event front-running** — abnormal return that accrues *before* the deal, to people who knew. We can
only trade **after NSE's end-of-day disclosure (T+1 onward)**. The abstract does **not** separate
post-disclosure drift from pre-event leakage — so **the tradeable slice is unverified.** That is *exactly*
the first gate, and we have everything to measure it:

> **Recommended next experiment (next free Exp ID — see §6 on the live Exp17 collision):**
> **Post-disclosure drift after disclosed institutional BUY bulk/block deals.**
> - **Events:** `india_bulk_block_deals` (V2-030) — **schema confirmed this session**: columns
>   `deal_date, symbol, client_name, buy_sell ('BUY'|'SELL'), quantity, price, deal_type ('bulk'|'block')`,
>   indexed on date/symbol/client/type. Filter to `buy_sell='BUY'`; **`client_name` is the real prize** — it
>   names the institution, so you can filter to known FII/MF buyers and even build a *"follow specific
>   smart-money clients"* variant. Size the deal by `quantity*price` vs ADV.
> - **Method:** market-adjusted event study, **entry T+1 open/close (strictly post-disclosure)**, CAR over
>   {3,5,10} days vs Nifty/sector. Reuse exp2/exp16 harness (read-only research lane).
> - **First gate (pre-registered):** is **post-disclosure** CAR after BUY deals **positive and > 250 bps
>   net** — or is the whole effect pre-event (→ untradeable, honest kill)?
> - **Guards (apply the lessons from the null streak):** concentration drop (top-3 events/days), DSR on all
>   horizons×filters, **recency slice** (anomaly-decay guard), liquidity filter (deal size vs ADV; drop the
>   illiquid tail), and the **buy-vs-sell asymmetry** as a built-in falsification (sell deals should *not*
>   drift up if the signal is real).
> - **Capacity sanity:** count tradeable BUY deals/yr on liquid names after filters (≥~30/yr to matter).

**Pre-mortem (why it might still fail, stated up front):** (a) all the alpha is pre-disclosure leakage →
post-T+1 flat → kill; (b) the drift lives in illiquid small-caps again (same squeeze) → cost eats it;
(c) decay — the 2010-19 sample predates the modern, faster market. **But the asymmetry of the bet is good:**
the data is in hand, the test is one research script, and a 5-7% documented effect means even a *fraction*
surviving post-disclosure clears cost. **This is the single highest expected-value next action in the
program.** Run it *before* spending anything on the SUE collector.

---

## 3. The methodological miracle: stop hunting single signals — combine the weak ones

**The deepest finding in this whole review.** The program has run 17 experiments and tested signals
**one at a time**, killing each on its own. But that is *not how quant P&L is actually generated.* The modern
literature — and **WorldQuant, which is literally in our own `wiki/entities/`** — makes money by
**combining many weak alphas** (each with tiny but positive Information Coefficient) into a cross-sectional
ranking, not by finding one strong signal:

- **AlphaForge (arXiv 2406.18394)** and **IC-dynamic-weighting (2508.18592):** mine many formulaic alphas,
  combine by **rolling IC** (cross-sectional corr of predicted vs realized returns), neutralize for
  industry/size via OLS residualization. Weak signals that individually fail significance can be jointly
  profitable.
- **"When Alpha Breaks" (arXiv 2603.13252):** the score *tails* (where you actually trade) are where rank
  uncertainty is *largest* — a direct warning for how to size the blend. (This is the anti-overfit
  discipline the program already values, applied to ensembles.)

**Why SachNetra is unusually well-placed to do this:** it owns a stack of **weak-but-plausibly-real,
mutually-independent** signals that nobody else has assembled for free:
- latency flag (Exp4 — early-to-filing), calibrated sentiment (post-G6), PEAD/EAR drift score (weak but
  nonzero +0.5%), FII/DII **absorption** metrics (V2-017c — normalized flow, *different* from the refuted
  raw flow), bulk/block-deal flag (§2), options-OI shift (V2-024), participant-wise positioning (§4),
  entity/story-thread "narrative momentum."

> **The reframe:** instead of asking *"does signal X beat cost on its own?"* (answer has been "no" 17 times),
> ask *"does an **IC-weighted, industry/size-neutral cross-sectional blend** of our 6-8 weak signals produce a
> top-minus-bottom decile spread that survives walk-forward + DSR + 250 bps?"* This is a **different
> question** the program has **never asked**, and it's where shops with exactly this kind of data-breadth
> (not one killer signal) actually find their edge.

**What it needs (and this doubles as the un-built `positioning_v2 §3.3` harness):** the **backtesting harness
+ a cross-sectional panel** (one row per (stock, day) with every signal as a column). That panel is the real
asset — building it is the same work as "promote `scripts/research/` to a framework." **Highest ceiling of
anything in this note; also the most work.** Sequence it *after* the cheap §2 event study, but it is the
strategic bet if the program wants P&L rather than another single-signal verdict.

---

## 4. Secondary lanes (real, but lower or slower) — ranked

| Lane | Data ready? | Edge plausibility | Cost-survivable? | Verdict |
|---|---|---|---|---|
| **Participant-wise *derivatives* positioning** (FII net index-futures long/short) | partial (V2-024 OI; participant report scrapeable) | Med — *distinct* from refuted cash-flow (Exp1): leveraged directional conviction; but signal is **3-5 sessions, noisy 1-day**, index-level (low capacity, beta-like) | Med (index, liquid) | **Park-able experiment** — a *timing/overlay*, not a stock selector. Test multi-day, not next-day (Exp1's mistake). |
| **Options-OI microstructure** (OI-shift, IV skew, max-pain drift into expiry) | partial (V2-024 EOD OI; **needs intraday for the real play**) | Med — India options are the world's largest; genuine short-horizon edges exist | ? (needs intraday data we may lack) | **Park** — gated on intraday options data; high effort. |
| **Alt-data macro nowcasting** (POSOCO electricity → IIP; FASTag → freight/mobility) | ✅ (V2-026 electricity, V2-027 FASTag live) | **High uniqueness/moat**; electricity *beats oil & stock-price* predictors for industrial production (ScienceDirect) | indirect | **The dataset-of-record pillar.** Not a fast trade (macro nowcast → sector rotation is slow, low-capacity-friendly). **This is the kill-signal fallback's crown jewel** — build it as the moat even if it's not the trade. |
| **Calibrated sentiment as a *cross-sectional* selector** (post-G6) | needs G6 fix first | Low-Med alone; **Med as an ensemble input (§3)** | — | Fix G6, then feed §3, don't trade standalone. |

---

## 5. What I'd do, in order (expected-value ranked)

1. **Resurrect + *alarm* the dead V2-018 feed** (from the 06-05 review — still the precondition; a backtest
   on a feed that can die unnoticed is fiction). Extend freshness alarms to **every** collector, incl. V2-030
   deals (the §2 experiment depends on it being alive).
2. **Run the bulk/block-deal post-disclosure event study (§2).** One research script, data in hand, the only
   candidate with a documented effect that clears cost. **First gate: post-T+1 BUY-deal drift net of 250 bps.**
   Highest EV action in the program.
3. **Build the cross-sectional signal panel + backtest harness (§3).** This is the `positioning_v2 §3.3`
   mandatory capability *and* the substrate for the only frame (multi-signal ensemble) that addresses the
   root cause of the null streak. Start the moment §2 reports.
4. **In parallel, treat alt-data nowcasting (§4) as the moat build**, not a trade — it's what makes the
   dataset-of-record fallback (positioning §7) genuinely valuable, so it's never wasted work.
5. **Only if §2 *and* the §3 ensemble both fail after honest cost:** the kill-signal (positioning §7) is real
   — pivot to **dataset-of-record (Option B)**, where the alt-data moat (§4) is the asset. That is **not a
   failure** — it's the most replicable-resistant thing the program owns.

---

## 6. Housekeeping flag (a live doc-drift bug found mid-hunt)
**Experiment-ID collision.** `wiki/experiments/_index.md` (updated 2026-06-04) says *"Next free ID: Exp17"*
and assigns Exp17 to **G6 sentiment calibration**. But `2026-06-05_earnings-announcement-data-sourcing.md`
§7 already refers to **"[[Exp17]]" = the intraday-reaction gate that ran 2026-06-05.** So **Exp17 is
double-claimed** and the registry is stale. This must be reconciled *before* the §2 experiment pre-registers
(it should take the *next genuinely free* ID). Per the registry's own rules this note mints **no** ID — it
writes "next free Exp ID" and flags the collision for resolution at pre-registration.

---

## 7. One-paragraph verdict
There is **no single hidden alpha** — the program proved that the honest way, and India's anomalies really are
decaying. But the search isn't over: the probability mass moved off "price-reaction PEAD" (dead for
structural, not fixable, reasons) onto **(a) bulk/block-deal smart-money following** — the one candidate with
a *5-7% documented effect on data already collected*, whose tradeable post-disclosure slice is a single
read-only experiment away from a verdict — and **(b) the methodological shift the program has never tried:
combining its many weak-but-unique signals into one IC-weighted, neutralized, walk-forward cross-sectional
model**, which is how data-broad shops (WorldQuant included) actually earn P&L. If both fail after honest
cost, the alt-data nowcasting moat makes the dataset-of-record fallback a *strong* outcome, not a defeat.
**The next move is cheap and high-EV: run the bulk-deal post-disclosure event study before spending another
hour on PEAD.**

---
*Reflection: the user asked for a miracle. The honest gift isn't a fabricated one — it's redirecting the
search from the exhausted vein (single price signals) to the two unmined ones: a large-effect event signal
sitting in a table we already fill (bulk deals), and the ensemble method that turns a graveyard of "weak"
single-signal nulls into a possible portfolio. Neither is guaranteed. Both are testable on data in hand, and
both have a far better shot at clearing the cost floor than anything the program has run. That's where I'd
point the next month.*

## Sources (external, page-checked 2026-06-06)
- Emerald MF-08-2021-0374 / ScienceDirect S0307435822000842 — *What's hidden behind bulk deals? A study on the Indian stock market* (NSE 2010-19; 5-7%/wk; buy>sell; front-running).
- ScienceDirect S1566014115000138 — *Price manipulation, front running and bulk trades: Evidence from India*.
- SCIRP 88060 — Harshita, *PEAD Anomaly in India* (Nifty500 2002-17; SUE=(EPS−EPS₋₄)/P; 6%/64d; survives illiquidity/size; SUE×Size sig.).
- Quantpedia — *Post-Earnings Announcement Effect* (SUE∩EAR quintiles; ~15%/yr; small-cap concentrated; long side carries it).
- ScienceDirect S0140988323005042 — *Nowcasting industrial production using electricity demand* (beats oil & stock-price predictors).
- arXiv 2406.18394 (AlphaForge), 2508.18592 (IC dynamic weighting), 2603.13252 (When Alpha Breaks) — combining weak alphas, IC-weighting, tail uncertainty.
- niftytrader.in / swastika.co.in — participant-wise FII index-futures OI (multi-session signal, noisy 1-day).
