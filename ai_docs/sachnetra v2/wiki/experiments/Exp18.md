---
tags: [experiment, sachnetra, research, quant-finance, bulk-deals, block-deals, smart-money, event-study, null, leakage, confound]
source: [[sachnetra_research_playbook]], [[exp18_brief]], [[Exp14]], [[Exp16]], [[Exp17]], [[2026-06-06_edge-hunt-where-alpha-could-still-live]]
experiment_id: Exp18
status: COMPLETE — ❌ NULL (confound + leakage-dominated). Post-disclosure BUY drift is negative; no BUY–SELL asymmetry; the documented 5–7% is entirely pre-disclosure (untradeable). N=6,120 BUY / 6,393 SELL, 4.6y.
authored_date: 2026-06-07 (brief) · run_date: 2026-06-07
verdict: ❌ NULL — the bulk/block-deal "smart-money following" edge does not survive. The big academic effect is real but **pre-disclosure** (PRE+DAY0 = +9.89%); the **tradeable** post-T+1 slice is −0.31% gross (worse net of cost), and BUY and SELL drift the *same* way afterward (−0.31% vs −0.21%) → it is a "deals cluster in already-moving names" confound, not a followable signal.
audience: Lijo, James, future Claude Code sessions
---

# Experiment 18 — Post-disclosure drift after institutional BUY bulk/block deals

> **Pre-registration:** [[exp18_brief]] (hypotheses §2, method §3, gates §4, interpretation tree §5, all locked
> before any data was touched). This file is the **post-run record**. Built on
> [[2026-06-06_edge-hunt-where-alpha-could-still-live]] §2 (the #1 edge-hunt candidate) with the eight
> Exp10/14/16/17 null-streak lessons baked in.

---

## 0. One-paragraph verdict

The single most-promising edge-hunt candidate — *follow disclosed institutional BUY bulk/block deals* — is
**dead as a tradeable signal, decisively and with full power.** On 6,120 liquid BUY events over 4.6 years
(Oct 2021 → May 2026), the post-disclosure (T+1 entry) drift is **negative at every horizon**
(gross ≈ −0.31% at H=5; −2.81% net of 250 bps, t=−26.6). The two pre-registered falsifications both fire: **(H18d
leakage)** the entire documented "around-deal" move is **pre-disclosure** — PRE[−5..−1]+DAY0 = **+9.89%**, while the
tradeable POST[+1..+5] slice is **−0.31%** (POST share −3%); and **(H18c veto)** SELL deals drift **the same way**
as BUY (−0.21% vs −0.31%, BUY−SELL = −0.10%), so this is a *"deals cluster in names that already moved"* confound,
not smart money to follow. Every daily-series gate fails (DSR 0.000, Theil 1.40, Sharpe −4.91). This is exactly
the outcome the brief was built to detect cleanly — and it confirms the program's recurring efficiency finding
for a *fifth* time ([[Exp14]] governance, [[Exp16]] EAR-drift, [[Exp17]] intraday + SUE-surrogate, now Exp18).

---

## A. Data reality (run 2026-06-07, read-only)

Script: `scripts/research/exp18-bulkdeal-postdisclosure.mjs` (Claude authored; `--selftest` PASS; run end-to-end
as validation). Preconditions cleared first via `check-deals-coverage.mjs` after the G8 backfill (see §A.1).

```text
  Deduped deal events (symbol, date, side):  55,518          ← unit = (symbol, deal_date, buy_sell), qty summed
  Priced symbols loaded:                      2,108 / 3,047   ← .NS reconciliation (deals store bare symbols)
  Liquid (Amihud below median) deal names:    1,019 / 2,038 priced

  Event funnel:
    unpriced .............. 13,910   (deal name absent from research_prices — survivorship/coverage)
    illiquid (Amihud) ..... 22,963   (above-median illiquidity tail dropped)
    insufficient bars .....  1,638
    below 0.5×ADV .........  4,494   (deal too small vs trailing 20d ADV to signal accumulation)
    broad-benchmark fallbk.  7,577   (name in no size band → ^NSEI benchmark; flagged)

  USABLE EVENTS — BUY: 6,120  ·  SELL: 6,393
  BUY event span: 2021-09-27 → 2026-05-13 (4.6y) · capacity ~1,323 BUY events/yr (≫ the ≥30/yr gate)
```

### A.1 The G8 backfill (what unblocked this run)
The §0 probe on 2026-06-07 found `india_bulk_block_deals` only **3 months deep** (Feb–May 2026) and the V2-030
cron **16 days stale** — Exp18 would have been born underpowered, the Exp16 trap. `backfill-india-deals.mjs`
(NSE date-range API, plain-fetch warm-up, idempotent) was run from the operator machine: a 90-day pass closed the
freshness gap, then a 2000-day pass deepened it to **4.7 years / 97,990 rows** before a transient network error
("fetch failed") stopped it at chunk 245/286 (~Sep 2021) — all committed rows safe. **NSE was still serving full
rows at the stop point**, so its history goes deeper than Oct 2021; 4.6y of *usable* events is ample (the recency
slice is non-degenerate, unlike Exp16's H16c). Depth is the one P2 "miss" (4.6y vs the 5.0y soft target) — immaterial
given the power achieved.

## B. Results

Net market-adjusted (size-matched-basket) CAR[+1..+H], cross-sectional, net of round-trip cost. `***` = p<0.01.
**The `***` rows are significantly NEGATIVE — that is the cost floor swamping a ~zero-to-negative gross drift, NOT a
short signal.** Back out the cost (net@100 + 1.00%) for the near-gross drift.

| Side | H | cost (bps) | N | net POST CAR | t | p | ≈ gross POST |
|---|---|---|---|---|---|---|---|
| BUY | 3 | 250 | 6,120 | −2.78% | −33.4 | 0.000 *** | −0.28% |
| BUY | 5 | 100 | 6,120 | −1.31% | −12.4 | 0.000 *** | **−0.31%** |
| BUY | 5 | 250 | 6,120 | −2.81% | −26.6 | 0.000 *** | −0.31% |
| BUY | 10 | 250 | 6,120 | −2.71% | −19.1 | 0.000 *** | −0.21% |
| SELL | 5 | 250 | 6,393 | −2.71% | −26.3 | 0.000 *** | −0.21% |

**H18d — leakage split (BUY, gross, H=5):** PRE[−5..−1]+DAY0 = **+9.89%** · POST[+1..+5] = **−0.31%** · POST share
of total around-deal move = **−3%**. → the tradeable slice does **not** clear cost; the whole effect is
pre-disclosure.

**H18c — BUY–SELL asymmetry (the VETO, gross POST, H=5):** BUY **−0.31%** · SELL **−0.21%** · BUY−SELL **−0.10%**.
🚩 **FAILS** — buys do not outperform sells post-disclosure (if anything, slightly worse).

**Concentration (BUY, 250 bps, H=5):** base −2.81% → drop-top3-events −2.85% (t=−27.5) · drop-top3-days −2.83%
(t=−26.9). No positive base edge for the check to erode. Effective N (distinct event-days) = 1,067 of 6,120 — so
significance is not an artifact of correlated same-day events.

**Daily-series gates (BUY, H=5, 250 bps; 1,148 active days):** Ann. Sharpe **−4.91** · DSR **0.000** (N=12 trials)
· Theil's U **1.400** · ADF t=1.36 (fail) · KPSS 14.27 (fail). Every gate fails.

## C. Interpretation (decision-grade)

**Verdict: ❌ NULL (confound + leakage-dominated).** The pre-registered §5 tree lands on two of its kill rows at
once:

- **H18a (post-disclosure drift exists, BUY):** ❌ refuted. The tradeable post-T+1 drift is **negative** (−0.31%
  gross, t<0), not the positive drift the smart-money thesis predicts.
- **H18b (net of cost):** ❌ refuted — nowhere near +250 bps; it is −2.8% net.
- **H18d (leakage split — load-bearing):** ❌ the documented 5–7% effect **is real but it is +9.89% PRE+DAY0**, i.e.
  pre-disclosure run-up + the deal-day move itself. By the time a public participant can act (T+1 close), there is
  nothing left — the POST slice is slightly negative. *Exactly the "all alpha is pre-event leakage" outcome the
  brief flagged as the most likely failure mode.*
- **H18c (BUY–SELL asymmetry — VETO):** 🚩 fails. BUY and SELL drift the **same** direction afterward. A genuine
  accumulation signal would show BUY drifting up and SELL down; instead both drift slightly negative. This is the
  signature of a **confound** — bulk/block deals cluster in names that have *already* made a large move (the +9.89%
  PRE+DAY0), and post-event everything mean-reverts a touch regardless of side. We are not detecting smart money;
  we are detecting "a big trade happened in a stock that already ran."

**Why this is a clean null, not a bug.** Full power (N=6,120, effective 1,067 event-days), the `--selftest` passed
(and earlier caught a real sign-inversion bug in the synthetic injector), the size-matched benchmark and Amihud +
ADV filters applied, and the BUY/SELL twin gives an internal control that *both* point the same way. The
plumbing is sound; the market is efficient on the public T+1 disclosure.

**This is the fifth efficiency null in the mid-cap event family.** [[Exp14]] (governance shocks), [[Exp16]]
(EAR next-day drift), [[Exp17]]/Exp17b (intraday reaction + volume-confirmed surprise), and now Exp18
(disclosed deals). The pattern is consistent: **anything visible on a public NSE feed is priced before a slow
participant can act.** The edge-hunt note's §2 candidate is closed.

### Caveats (all pointing the same way — they would only *weaken* a positive, and there is none)
- **Survivorship** — 13,910 deal events dropped as unpriced (`research_prices` = survivors). The distressed names
  most likely to carry asymmetric information are exactly the unpriceable ones — but this can only have *hidden* a
  positive, and the result is negative, so it does not rescue the bet.
- **Deal-history depth** — 4.6y (Oct 2021→), not the full NSE history; ample for power, recency-valid.
- **`client_name` not used** — the brief's "follow named smart-money clients" variant is secondary/in-sample and
  was not run; given the side-symmetric null, a client filter is very unlikely to revive it (it would need a
  specific client subset whose POST drift is both positive and cost-clearing — possible in principle, a long shot,
  and pure in-sample selection). Logged as the only un-pulled thread.

### Next step
- **Record the null** (this file + registry + playbook). Do **not** paper-trade.
- **Close the edge-hunt §2 candidate.** Per [[2026-06-06_edge-hunt-where-alpha-could-still-live]], the remaining
  unmined vein is **§3 — the methodological shift (combine many weak signals into one IC-weighted, neutralized,
  walk-forward cross-sectional model)** rather than hunting one more single signal. Exp18 is the strongest case yet
  that *single visible-event signals are exhausted on this market* — which is precisely the argument for the
  ensemble approach (and for the alt-data moat as the dataset-of-record fallback).
- **Ops:** revive the V2-030 Railway cron + add a freshness alarm (the feed was 16d stale; backfilled now but will
  re-stale without the cron). Layer-0, still outstanding.

---

## D. Artifacts
- `scripts/research/exp18-bulkdeal-postdisclosure.mjs` — the event study (read-only; `--selftest` gate).
- `scripts/research/check-deals-coverage.mjs` — the §0 P1–P3 precondition probe (read-only).
- `scripts/research/output/exp18/exp18_summary.csv` — per (side × horizon × cost) stats.
- `scripts/research/output/exp18/exp18_events.csv` — per-event PRE / DAY0 / POST, band, deal value, ADV ratio.
- Data: `india_bulk_block_deals` (deepened to 4.7y via `backfill-india-deals.mjs`, G8), `research_prices`.

## E. Changelog
| Date | Change |
|---|---|
| 2026-06-07 | Pre-registered ([[exp18_brief]]); claimed Exp18 (after the Exp17 ID-collision fix). Authored probe + harness; `--selftest` PASS (caught + fixed a sign-inversion bug). |
| 2026-06-07 | §0 probe → BLOCKED (3 months deep). Ran G8 backfill (`backfill-india-deals.mjs`) → 4.7y / 97,990 rows (stopped at chunk 245/286 on a transient network error; committed). Re-probe: P1✅ P3✅, P2 4.6y (ample). |
| 2026-06-07 | **Ran end-to-end → ❌ NULL (confound + leakage).** BUY POST −0.31% gross / −2.81% net@250bps; PRE+DAY0 +9.89% (all alpha pre-disclosure); BUY−SELL −0.10% (asymmetry veto fails); all daily gates fail. Fifth mid-cap event-family efficiency null. Registry + brief status updated; edge-hunt §2 candidate closed → §3 ensemble is the remaining vein. |

## F. H18 Hypothesis Register row (for the playbook)
```
| H18 | 2026-06-07 | Post-disclosure (T+1) drift after disclosed institutional BUY bulk/block deals → positive net CAR[+1..+H] | india_bulk_block_deals (G8 backfill, 4.6y) + research_prices, size-matched benchmark | market-adjusted long-only event study; dedupe (sym,date,side); Amihud-liquid + deal≥0.5×ADV; PRE/DAY0/POST split; BUY/SELL twin veto; {3,5,10}d×{100,250}bps; DSR/Theil/ADF/KPSS | BUY POST −0.31% gross (−2.81% net@250), p<1e-30; PRE+DAY0 +9.89% (all leakage); BUY−SELL −0.10% (no asymmetry); N=6,120 BUY/6,393 SELL | survivorship (13,910 unpriced dropped); client filter not run | ❌ NULL — confound + leakage-dominated; not smart money to follow | Close edge-hunt §2; pivot to §3 multi-signal ensemble; revive V2-030 cron |
```
