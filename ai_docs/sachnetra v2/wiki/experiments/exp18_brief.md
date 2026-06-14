---
tags: [experiment, sachnetra, research, quant-finance, bulk-deals, block-deals, smart-money, event-study, pre-registered, pre-design-brief]
source: [[sachnetra_research_playbook]], [[Exp2]], [[Exp10]], [[Exp14]], [[Exp16]], [[Exp17]], [[2026-06-06_edge-hunt-where-alpha-could-still-live]]
experiment_id: Exp18
status: COMPLETE — ran 2026-06-07 after the G8 backfill (4.7y). Verdict ❌ NULL (confound + leakage). Post-run record: [[Exp18]].
authored_date: 2026-06-07
audience: Lijo (founder/operator) + James + future Claude Code sessions
purpose: Pre-register the post-disclosure bulk/block-deal smart-money-following study — the #1 candidate from the 2026-06-06 edge-hunt note — with the eight design lessons from the Exp10/14/16/17 null streak locked in BEFORE any data is touched.
registry_note: "Claims Exp18 (per wiki/experiments/_index.md, after the Exp17 ID-collision resolution 2026-06-07). _index.md row + 'next free ID → Exp19' already updated in the same change."
---

# Experiment 18 — Brief: Post-Disclosure Drift After Institutional BUY Bulk/Block Deals

## 1. Why this experiment, why now

The honest read of the program is sobering: **four event-study nulls in a row** on NSE mid-cap *price
reactions* — [[Exp10]] (intraday filing), [[Exp14]] (governance shock), [[Exp16]] (EAR-PEAD next-day),
[[Exp17]] (intraday results reaction). All died the same way: the move is either **too small to clear cost**
(Exp16: +0.5% < 250 bps) or **large but fully priced by the close** (Exp17). The
[[2026-06-06_edge-hunt-where-alpha-could-still-live]] note concluded the probability mass has **moved off
price-reaction signals entirely** onto two unmined veins. This experiment tests the first one.

**Why bulk/block deals jump to #1 candidate:**
- It is the only candidate where a **peer-reviewed effect size is an order of magnitude above our cost
  floor**: Emerald (MF-08-2021-0374), NSE 2010-19, reports **5–7%/week** around disclosed deals with
  **BUY ≫ SELL**. A 5–7% effect clears even a conservative 250 bps round-trip — the exact thing PEAD (0.5%)
  could never do.
- The **mechanism is genuinely new**, not a re-litigation: it is **institutional information/accumulation**,
  distinct from FII *cash-flow direction* ([[Exp1]], dead) and from earnings *price reaction* (Exp16/17,
  dead). A new mechanism is an independent shot, not the same bet in new clothes.
- It reuses the **event-study competency the program already has** (the Exp2/Exp16 harness — stats, DSR,
  concentration drop, gates) on **data we already collect** (V2-030, `india_bulk_block_deals`).

**The honest catch this experiment exists to resolve.** The literature's big number is *partly*
**pre-event front-running** — abnormal return that accrues *before* the deal, to people who knew. We can only
trade **after NSE's end-of-day disclosure (T+1 onward)**. The abstract does not separate post-disclosure
drift from pre-event leakage — so **the tradeable slice is unverified**, and measuring it is the entire point
of Exp18.

> **Program-history caution (loud, on purpose).** [[Exp14]]'s final verdict was that the academic governance
> CAR of −5% to −12% is *"likely driven almost entirely by survivorship bias."* The bulk-deal 5–7% is the
> **same class of academic number**. Treat it as inflated until the *post-disclosure, survivorship-aware,
> cost-net* slice proves otherwise. This brief is built to find the honest tradeable slice or kill the bet
> cleanly — not to confirm the headline.

---

## 0. Preconditions — verify BEFORE pre-registration is "ready to run" (the Exp16 / V2-018 lesson)

[[Exp16]]'s null was really an *underpowering* story (announcements only went back to 2024-05 → N=105,
recency gate degenerate). And the 2026-06-05 whole-project review found V2-018 had **died for a week
unnoticed** — *"you cannot trust a backtest on a feed that can flatline in silence."* So Exp18 is **GATED**
until these three read-only checks pass. Claude authors the probe; **Lijo runs it** (prod boundary).

| # | Precondition | Why it gates | Check |
|---|---|---|---|
| **P1** | `india_bulk_block_deals` is **populated in prod**. CLAUDE.md lists V2-030 as *"CODE COMPLETE — awaiting Lijo prod run + Railway cron."* | If the table is empty / the cron never ran, there is no experiment. | `SELECT COUNT(*), MIN(deal_date), MAX(deal_date), COUNT(DISTINCT symbol) FROM india_bulk_block_deals;` |
| **P2** | **History depth ≥ ~5 years.** | Exp16 was born underpowered at ~2 years. If deals span only ~1–2 years, backfill history first (**data-gap G8**). | from P1's MIN/MAX span |
| **P3** | **Feed is fresh** (`MAX(deal_date)` within ~3 trading days). | A dead deals feed = a fiction backtest (the V2-018 lesson). | from P1's MAX(deal_date) |

**The depth fix is cheap and already scoped (unlike Exp16's announcements).** Unlike the announcements feed
(rolling 30-day window, *not* backfillable — [[Exp2]] §5), the NSE deals endpoint **accepts a `from`/`to`
date range** and the CSV path is **uncapped** (V2-030 recon, `scratch/V2-030_*_recon_checklist.md` §5:
522 rows for a 7-day range). So **G8 = run the existing `backfill-india-deals.mjs` over several years of NSE
history** (a direct pull, chunked 7–15 days) — *not* a Gemini/AI loop. The Exp10-style Gemini news-search
loop is the **wrong tool** here (it fills per-event *news* gaps, not deal-record history). The only open
unknown is **how far back NSE serves** — recon proved the date-range works (May-2025, Apr-2026) but didn't
pin the earliest date; P2 establishes it.

**Stop rule:** if P1 fails → not runnable (the V2-030 cron/prod-run never happened). If P2 fails → run the
**existing `backfill-india-deals.mjs`** (G8) before Exp18. If P3 fails → fix/alarm the V2-030 cron first.
Record the P1–P3 funnel verbatim in `Exp18.md §A`.

### §0 PROBE RESULT — 2026-06-07 (`scripts/research/check-deals-coverage.mjs`, read-only)

⛔ **Exp18 is BLOCKED.** Probe ran against prod:

| Check | Result | |
|---|---|---|
| **P1 populated** | ✅ PASS | 6,359 rows · 755 symbols · BUY 3,228 / SELL 3,131 · bulk 6,089 / block 270 |
| **P2 depth ≥5y** | ❌ FAIL | span **2026-02-23 → 2026-05-22 = 0.2y** (only ~3 months — Exp16-style underpowering) |
| **P3 fresh** | ❌ FAIL | latest `deal_date` **16 days stale** → V2-030 cron not running (the V2-018 silent-death pattern) |
| join feasibility | (good) | 71.7% of 755 deal symbols priced in `research_prices` |
| capacity (loose) | (ample) | ~4,267 priced BUY (symbol,day) events/yr — plenty *if* depth existed |

**Read:** the V2-030 *seed ran once* (3 months loaded), but the *cron was never turned on / has died*. Do
**NOT** run the harness on 3 months — it would manufacture an underpowered null (the exact §0 failure mode).

**Two prod actions required before run (Lijo/James — prod writes, run `check-db-space.mjs` first):**
1. **G8 — deep backfill:** `node scripts/backfill-india-deals.mjs` over the NSE date-range API back to ~2018
   (7–15-day chunks). Turns 3 months → 5+ years → Exp18 powered.
2. **Revive + freshness-alarm the V2-030 cron** (extend the alarm to every collector — Layer-0).

Then re-run `check-deals-coverage.mjs`; when P2 + P3 go green, Exp18 is runnable (harness `--selftest` already
passes). Logged as **G8** in `_data_gaps_backlog.md`.

---

## 2. Core hypotheses (written before looking)

- **H18a (post-disclosure drift exists, BUY side):** A long-only book that buys a name at **T+1 (strictly
  after the end-of-day NSE deal disclosure)** following a **disclosed institutional BUY** bulk/block deal
  earns a positive **size/sector-adjusted** CAR over the following {3, 5, 10} trading days, beating a
  size-matched benchmark.
- **H18b (net of cost — the real gate):** That CAR clears a **250 bps round-trip cost floor** on the liquid
  half of the deal universe (illiquid tail dropped), survives a **concentration drop** (top-3 events AND
  top-3 event-days), and stays positive after a **Deflated Sharpe Ratio** penalty for all trials.
- **H18c (BUY–SELL asymmetry — built-in falsification):** SELL deals do **not** drift up; ideally drift
  **down**. If BUY and SELL drift the *same* direction, the "signal" is just "deals happen in stocks already
  moving that way" → **kill**, regardless of H18a's t-stat. *(This is the directional falsification [[Exp10]]
  lacked — bulk deals give it for free.)*
- **H18d (leakage split — is the tradeable slice real?):** Decompose total abnormal return into **PRE
  [−5..−1] run-up** (pre-disclosure leakage, *untradeable*) vs **POST [+1..+H] drift** (*tradeable*). The bet
  is alive **only if POST carries a materially positive, cost-surviving share** — not if the whole 5–7% is
  PRE. *(This is the Exp17 persistence gate, adapted: Exp17 died because the move didn't continue past day 0;
  here the equivalent question is whether anything continues past **disclosure**.)*

**Why four hypotheses:** H18a is the academic claim. H18b is the operator claim (tradeable after costs).
H18c is the falsification that separates signal from "deals cluster in trending names." H18d is the
load-bearing one — it isolates the *only slice we can actually trade*.

---

## 3. Method — market-adjusted, size-aware long-only event study

### 3.1 Data inputs (exact columns — confirmed from `migrate-india-signals.mjs` DDL)

| Source | Columns | Role |
|---|---|---|
| `india_bulk_block_deals` | `deal_date` (DATE, IST), `symbol` (**bare NSE**, e.g. `AGIIL`), `client_name`, `buy_sell` (`'BUY'`/`'SELL'`), `quantity` (BIGINT), `price` (₹), `deal_type` (`'bulk'`/`'block'`) | Events |
| `research_prices` | `symbol` (`.NS` form), `trade_date`, `adj_close`, `close`, `volume` | CARs, benchmark, liquidity (Amihud), ADV |
| size-band index lists | `shared/nifty-midcap150.json`, `shared/nifty-smallcap250.json`, `shared/nifty-microcap250.json` (exist from G7/G7b) | size/sector-matched benchmark |

### 3.2 Ticker-format reconciliation (the [[Exp4]] landmine — fix BEFORE the join)
[[Exp4]] lost its entire first run to `'SBIN.NS' ≠ 'SBIN'`. The deals table stores **bare** symbols; prices
store `.NS`. Canonicalize both sides to the bare upper-cased symbol (strip trailing `.NS`/`.BO`), exactly as
Exp4's `norm()` now does. Log the match funnel (deals → symbol overlaps `research_prices` → priced events) so
an empty join is never silently read as "no signal."

### 3.3 Unit of observation — dedupe (the [[Exp10]] GRASIM trap)
Exp10 inflated N from ~8 real events to 26 by counting one corporate event as 5 filings. Bulk deals have the
identical trap (one block prints as several rows; many funds buy one name one day). **Pre-registered unit =
`(symbol, deal_date, buy_sell)`**, aggregating `quantity` and computing the `quantity*price`-weighted average
`price` across same-day same-side prints. One row = one tradeable observation.

### 3.4 Event filters (locked)
- **Side:** primary set = `buy_sell='BUY'`. SELL set built identically for the H18c asymmetry test.
- **Liquidity (the Exp16/17 Amihud filter):** drop names with Amihud illiquidity **above** the universe
  median — the illiquid tail is where 250+ bps eats the edge.
- **Deal materiality:** size each event by `quantity*price` vs the name's trailing **ADV** (`close*volume`,
  ~20-day median). Pre-registered floor: **deal value ≥ 0.5× ADV** (a deal too small to signal accumulation
  is noise). Report results with and without this floor as one DSR trial.
- **Client filter (secondary, exploratory — not in the primary verdict):** `client_name` is the real prize.
  A *"follow named smart-money clients"* variant (filter to recurring FII/MF buyers) is logged as a
  **secondary** analysis only — it is in-sample client selection and must not drive the H18a/b verdict.

### 3.5 Returns & benchmark (the size/sector upgrade over Exp2/14/16)
- **Entry:** T+1 **close** (strictly after the EOD T disclosure). *(adj-consistent — `research_prices` open
  mixes adjustment bases with `adj_close`; same documented choice as [[Exp16]].)*
- **Abnormal return:** `AR = stock_simple_return(adj_close) − benchmark_simple_return`.
- **Benchmark = size-matched, NOT `^NSEI`.** Every prior single-name study used `^NSEI`, which *under-adjusts*
  small/mid-caps — and bulk deals concentrate in exactly those names. Pre-registered: each event is adjusted
  against the **equal-weight basket of its own size band** (Midcap-150 / Smallcap-250 / Microcap-250,
  daily-rebalanced), per [[Exp16]]'s `eqw` benchmark machinery. *(Robustness variant: a sector basket; one
  DSR trial.)*
- **Windows:** **PRE = CAR[−5..−1]** (leakage measurement, H18d), **DAY0 = AR[0]** (disclosure-day),
  **POST = CAR[+1..+H]** for H ∈ {3, 5, 10} (the tradeable window, H18a).

### 3.6 Costs
Apply **100 and 250 bps** round-trip (mid/small-cap band; STT inside). **Accept only on 250 bps.**

### 3.7 Statistics (reuse the Exp16 harness verbatim)
Cross-sectional `mean / (sd/√N)` t-test; **DSR** counting *all* trials (sides × horizons × cost ×
materiality-filter × benchmark-variant — log N); **concentration drop** (top-3 events AND top-3 event-days);
daily-series gates on the POST equity curve (Sharpe, Theil's U < 1.0 vs benchmark, ADF/KPSS).
**Cross-sectional dependence note:** many deals share a `deal_date` → events are *not* independent across the
market. The day-clustering concentration drop partly guards this; additionally report the **effective N**
(distinct event-days) alongside raw N so significance isn't read off correlated same-day events.

### 3.8 `--selftest` (the Exp9/12/13 discipline)
Before any prod run, a synthetic gate: inject a known +X% post-event drift on random dates and assert the
harness recovers it; inject zero-drift and assert null. Validates the estimator before it's trusted.

---

## 4. Success thresholds & acceptance gates (Gate 1 → paper-trading)

| Metric | Threshold | Maps to |
|---|---|---|
| **POST CAR[+1..+H]** | **> 250 bps net** for ≥1 H, p<0.05 | H18a + H18b |
| **BUY–SELL asymmetry** | SELL POST drift **not positive** (ideally negative); BUY − SELL gap > 0 and significant | **H18c (falsification — mandatory)** |
| **Leakage split** | POST share of (PRE+POST) total is **materially positive** and cost-surviving (not ~0) | **H18d (load-bearing)** |
| **Concentration** | edge survives dropping top-3 events AND top-3 event-days | playbook B-gate (Exp10/14) |
| **Deflated Sharpe** | **DSR ≥ 0.95** (counts ALL trials) | anti-overfit |
| **Theil's U** | **< 1.0** vs size-matched benchmark | playbook B1 |
| **Stationarity** | ADF p<0.05 & KPSS not-rejected on the net-CAR curve | playbook B3/B4 |
| **Capacity** | ≥ ~30 tradeable BUY events/yr after liquidity + materiality filters | untradeable below this |

**Verdict is ✅ SUPPORTED only if ALL fire on the 250 bps primary spec.** H18c is a *veto*: if SELL drifts up
with BUY, the result is killed even if every other gate passes.

---

## 5. Pre-registered interpretation tree (no post-hoc rationalization — the [[Exp10]] lesson)

| POST drift | Leakage split (H18d) | Asymmetry (H18c) | Verdict | Next step |
|---|---|---|---|---|
| > 250 bps net, p<0.05, survives concentration | POST share materially +ve | SELL not up; BUY−SELL>0 | ✅ **SUPPORTED** | Author the Exp19+ paper-trade rule (entry T+1 close, hold H, size, stop) |
| > 250 bps net but concentration-fragile | (any) | (any) | 🚩 **SUSPECT** | Downgrade; name the events; re-run as deals accumulate |
| 0 < POST < 250 bps net | POST +ve but small | SELL not up | 🟡 **PROMISING** | Watchlist; re-run with more depth; do NOT paper-trade |
| POST ≈ 0, all return in PRE | leakage-dominated | (any) | ❌ **NULL (leakage)** | Honest kill — the edge is pre-disclosure, untradeable by us |
| BUY and SELL both drift up | (any) | asymmetry fails | ❌ **NULL (confound)** | Kill — measuring "deals cluster in trending names", not smart money |
| N < ~30/yr after filters | — | — | ⬜ **BLOCKED** | Not a verdict; backfill deals history (G8), re-run |

---

## 6. Potential traps & caveats (locked in advance)

1. **Deals-history depth (the binding constraint, like Exp16).** If V2-030 only spans ~1–2 years, Exp18 is
   underpowered by construction. §0/P2 gates this; the fix is **cheap and already scoped** — run the existing
   `backfill-india-deals.mjs` over the NSE date-range API (**G8**, a direct pull, *not* Gemini). Better than
   Exp16, whose announcements feed couldn't be backfilled at all.
2. **Survivorship.** Bulk deals are *better* than prior studies here — the deal name demonstrably traded on
   `deal_date`, so the event set is point-in-time by construction. **But** `research_prices` still holds only
   survivors, so deals in names that later delisted are unpriceable — and those distressed names may carry
   either the real signal or the real losses. Log the unpriceable-deal count as the ceiling (the [[Exp14]]
   discipline). Even a crude delisting log would help.
3. **Pre-disclosure leakage (the whole point — H18d).** The academic 5–7% bundles pre-event front-running we
   cannot capture. Entry at **T+1 close** and the PRE/POST split isolate the tradeable slice; if it's all
   PRE, that is a clean, publishable null — not a failure.
4. **Decay.** The Emerald sample is 2010-19; the modern market is faster. Report a recency slice if depth
   allows (gated on G8 — if depth is only ~2 years, flag H-recency as degenerate, like Exp16's H16c).
5. **Cross-sectional dependence.** Same-day deals share market shocks; raw N overstates independence. Report
   effective N (distinct event-days) and lean on the day-clustering concentration drop.
6. **Client-name messiness.** `client_name` strings vary ("Plutus Wealth Management LLP" vs "PLUTUS WEALTH
   MANAGEMENT"); the "follow named clients" variant needs normalization and is **secondary/exploratory only**
   — never in the primary verdict (in-sample selection risk).
7. **Block vs bulk.** Block deals (negotiated, ≥₹10 cr / 5 lakh shares, separate window) and bulk deals
   (≥0.5% of equity, on-market) have different mechanics. Report `deal_type` split; pre-registered primary
   pools both, with the split as a robustness lens.
8. **Look-ahead.** Disclosure is EOD T; entry T+1 close. Never use any T+1+ information in selection.

---

## 7. Execution plan & next steps

1. **§0 preconditions first** (Lijo runs the read-only P1–P3 probe). If P2 fails → run the existing
   `backfill-india-deals.mjs` over the NSE date-range API (**G8** — direct pull, not Gemini) before Exp18.
2. **Script:** `scripts/research/exp18-bulkdeal-postdisclosure.mjs` (read-only on prod; research lane; Claude
   authors, Lijo runs). Reuse the [[Exp16]] harness (stats, DSR, concentration, gates, CSV output) — the
   delta is the event source, the T+1 entry, the size-matched benchmark, the PRE/POST split, and the
   BUY/SELL twin run.
3. **`--selftest`** must pass (synthetic injected-drift recovery) before the prod run.
4. **Run** BUY primary + SELL falsification; compute PRE/DAY0/POST × {3,5,10} × {100,250} bps; diagnostics.
5. **Report** `wiki/experiments/Exp18.md` (post-run record); the registry row + "next free ID → Exp19" are
   already updated in `_index.md` (2026-06-07); append H18a–d to the research playbook.

**Current state (2026-06-07):** steps 1 + 3 done — §0 probe ran (⛔ BLOCKED, see above), harness authored and
`--selftest` PASS. Awaiting G8 backfill + V2-030 cron revival (Lijo, prod), then re-probe → run.

---

## Changelog
| Date | Change |
|---|---|
| 2026-06-07 | Pre-registered ([[exp18_brief]]). Claimed **Exp18** (after the Exp17 ID-collision resolution; `_index.md` row + "next free ID → Exp19" updated). Built on [[2026-06-06_edge-hunt-where-alpha-could-still-live]] §2 with the 8 null-streak lessons (Exp10/14/16/17) locked in. Authored `scripts/research/check-deals-coverage.mjs` (§0 probe) + `scripts/research/exp18-bulkdeal-postdisclosure.mjs` (harness, `--selftest` PASS — the self-test caught a real entry-bar vs holding-period sign-inversion bug, since fixed). |
| 2026-06-07 | **§0 probe ran → ⛔ BLOCKED.** P1 ✅ (6,359 rows / 755 symbols) but P2 ❌ (only 3 months, Feb–May 2026) + P3 ❌ (cron 16d stale). Logged **G8** in `_data_gaps_backlog.md`. Next: deep backfill (`backfill-india-deals.mjs`, NSE date-range API, `check-db-space.mjs` first) + revive/alarm the V2-030 cron, then re-probe. |

---
*This brief is the pre-registered design only. It does not claim the edge exists — it specifies how we'd
prove or refute it, with the eight lessons of the Exp10/14/16/17 null streak (verify depth first · isolate the
post-disclosure slice · dedupe the event unit · use BUY/SELL as falsification · size/sector-matched benchmark
· Amihud + honest cost · name survivorship · pre-register the verdict tree) locked in before any data is
touched. Built on [[2026-06-06_edge-hunt-where-alpha-could-still-live]] §2.*
