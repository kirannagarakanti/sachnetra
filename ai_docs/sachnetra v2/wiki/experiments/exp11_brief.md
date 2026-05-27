---
tags: [experiment, sachnetra, research, quant-finance, intraday, event-study, exp4-followup, exp10-followup, mid-small-cap, pre-design-brief]
source: [[sachnetra_research_playbook]], [[latency_vs_value_tradeoff]], [[Exp4]], [[Exp10]]
experiment_id: Exp11
status: BRIEF — scoping the experiment before pre-registration
authored_date: 2026-05-26
audience: Lijo (founder/operator) + James + future Claude Code sessions
purpose: Scope what Exp 11 actually tests now that V2-031 (G1+G2 news ticker tagging) is live. Identify preconditions, define the universe, list the data/script work that must happen *before* the pre-registered Exp11.md is written.
---

# Experiment 11 — Brief

> Pre-design brief, not yet a pre-registered experiment. Same posture as the
> `backfill-intraday-prices.mjs` + `exp10_gemini_news_backfill_brief.md` step that
> preceded the Exp 10 pre-registration: figure out what we're testing and what
> data we need *before* locking the hypothesis. The full pre-registered
> `Exp11.md` is written **after** §5's preconditions are met.

---

## 1. Why this experiment, why now

V2-031 just shipped. The G1+G2 data gap that blocked
[[latency_vs_value_tradeoff]] §6 Option B is — in principle — closed: the news
pipeline now tags tickers via NER across the full headline stream, not just the
1.7% pre-V2-031 coverage that was almost entirely large-cap.

That unlocks the experiment [[latency_vs_value_tradeoff]] §6 says is
**decision-grade either way**: re-run [[Exp4]] (lead time) and [[Exp10]] (price
impact) on a **mid/small-cap universe** and check whether the
latency-vs-value squeeze (high-impact events = short lead, long-lead events =
no impact — proven structural in [[Exp10]] §7.4b) relaxes when we step
off the Nifty-50 names where the wire is fastest.

The expected effect, if the original SachNetra thesis is right:

- **Lead time grows** — fewer journalists watch a small-cap NSE filing page; the
  wire latency on Astral or Inox Wind should be hours not 13 min.
- **Price impact per event grows** — thinner trading on small-caps amplifies
  the move per unit of new information; a news event that moves Reliance 0.5%
  can move a mid-cap 5%.

Both effects compound multiplicatively. If both hold, the "valuable corner"
that [[latency_vs_value_tradeoff]] §4.3 found empty in large-caps becomes
populated. If neither holds, the pure-latency thesis dies and the next
research direction is NLP (Option A) or fundamentals (a different edge entirely).

---

## 2. The two coupled hypotheses (locked when the full Exp11.md is written)

The squeeze is structural — both halves must improve to populate the valuable
corner, so we test them together, not in isolation.

**H11a — Lead time (Exp 4 redux on mid/small-caps):**
> *For NSE corporate filings on tickers OUTSIDE the [[Exp4]] §14.3
> tagged-large-cap set, the median filing → first-news lead is **at least 60
> minutes** (vs ~13 min on large-caps), at p<0.05 via sign-test against a null
> of 13 min.*

**H11b — Price impact (Exp 10 redux on mid/small-caps):**
> *For the same universe, mean |AR| at the headline horizon (likely t+60min,
> reconfirmed in Exp11 design) is **at least 2× the large-cap large-cap mean
> |AR|** measured in [[Exp10]] §7.1 (38.9 bps at t+15min, 166.1 bps at
> t+60min), at p<0.05.*

The 2× threshold is calibrated to typical mid-cap-vs-large-cap volatility
ratios; it is a stretch target. Tighten or loosen when the universe is locked
in §5.

Joint outcome tree (lifted from [[latency_vs_value_tradeoff]] §6, restated
verbatim so future agents don't have to re-derive):

| H11a verdict | H11b verdict | Combined meaning | Next step |
|---|---|---|---|
| ✅ supported | ✅ supported | Valuable corner exists. Latency thesis intact for mid/small-caps. | Author **Exp 12 — paper-trade the rule for 30 days** ([[positioning_v2]] "be your own first customer" closing-loop). |
| ✅ supported | ❌ null | Lead exists, impact doesn't. Squeeze partial. | Layer Option A (NLP direction extraction) on top of the long-lead events; combine. |
| ❌ null | (any) | Wire is faster on mid-caps than expected. Pure-latency thesis dies. | Pivot to a different edge (volatility — [[Exp6]]/[[Exp8]] — or NLP-based fundamentals). |

All three are decision-grade. The point of Exp 11 is to *force* the decision.

---

## 3. What the V2-031 deploy actually changed (verify before designing)

Before we lock anything, we need to confirm V2-031 worked the way the task
expected. Three reality checks Lijo runs against prod, each one a one-liner:

| # | Check | SQL | What "good" looks like |
|---|---|---|---|
| 1 | Tagging coverage post-V2-031 | `SELECT COUNT(*) FILTER (WHERE array_length(nse_tickers,1) > 0)::float / COUNT(*) FROM india_news_signals WHERE published_at >= NOW() - INTERVAL '7 days';` | ≥20% (G1 acceptance gate from [[g1_execution_plan]]); ≥30% is the [[_data_gaps_backlog]] G1 target |
| 2 | Mid/small-cap coverage specifically | `SELECT ticker, COUNT(*) FROM (SELECT unnest(nse_tickers) AS ticker FROM india_news_signals WHERE published_at >= NOW() - INTERVAL '7 days') t WHERE ticker NOT IN ('ITC','SBIN','RELIANCE','BHARTIARTL','SUNPHARMA','MARUTI','NTPC','HINDALCO','EICHERMOT','GRASIM','TCS','TATASTEEL','M&M','APOLLOHOSP','DRREDDY') GROUP BY ticker ORDER BY COUNT(*) DESC LIMIT 50;` | A long tail of unique mid/small-cap tickers, each with ≥3 stories/week |
| 3 | False-positive spot check | Pull 30 random tagged rows, eyeball the headline-vs-ticker fit | ≥90% precision (acceptable; pure NER will always have some collisions) |

If check 1 is below 20% or check 2 is dominated by a few large-caps with a
sparse tail, **V2-031 didn't actually deliver Option B's preconditions** and
Exp 11 stays blocked. That is itself a decision-grade outcome — it routes
back to G1 hardening, not to Exp 11.

---

## 4. Universe definition (the largest open design question)

Exp 10 used a hardcoded list of 15 large-caps (the names with enough tagging
*before* V2-031 to count as "tagged"). Exp 11's universe is the bigger
question — and the wrong choice will silently bias the result.

Three options, each with a tradeoff:

### Option U1 — Top-N by V2-031 tag volume, excluding the Exp 10 large-caps

Lock the universe as the top ~30–50 tickers by tagged story count in the last
30 days *after excluding* the 15 Exp 10 large-caps. Reuses the Exp 10
infrastructure (intraday backfill list, snap logic, etc.) with minimal
plumbing.

- **Pros:** simple, defensible, mid-cap names that have *enough* news to be
  testable. Avoids the "we have 3 stories on this ticker, can't say anything"
  problem.
- **Cons:** ranking by tag volume re-introduces the same selection bias Exp 10
  had — we'd be measuring the *most-covered* mid-caps, where the wire is
  presumably fastest among mid-caps. Pushes the result toward the squeeze
  (conservative test).

### Option U2 — Random sample of tagged tickers above a coverage floor

Define a coverage floor (e.g. ≥3 tagged stories in 30 days), enumerate all
tickers meeting it, take a random sample of ~50.

- **Pros:** unbiased; the result generalises to "tagged mid-caps" as a class.
- **Cons:** more script work; some sampled tickers will have so little news
  that the per-event N is tiny.

### Option U3 — Stratified: 15 mid-caps + 15 small-caps by market cap band

Define market cap bands (mid: 5,000–20,000 cr; small: 500–5,000 cr) using
NSE's master file (Lijo already has `scratch/fetch_nse_equity_master_playwright.mjs`).
Sample 15 from each band that meet the coverage floor.

- **Pros:** lets the result speak to *both* mid and small separately. If the
  squeeze loosens differently across bands that's a real finding.
- **Cons:** most work. Requires a join to a market-cap source that doesn't yet
  exist in the DB.

**Recommendation: U1 for v1**, then U3 if v1 fires SUPPORTED and we want the
finer cut. U2's randomness is a luxury we don't yet need.

Decide which after §3 prints — the coverage distribution will tell us how
luxurious we can afford to be.

---

## 5. Preconditions before pre-registration

Exp 10's pre-registration was authored after the backfill landed so the
script's schema and event volume anchored the hypothesis. Same posture here.
Five preconditions, all on Lijo's side except where flagged:

| # | Precondition | Owner | Output | Status |
|---|---|---|---|---|
| 1 | Confirm V2-031 tagging coverage (§3 checks 1+2+3) | Lijo | three SQL outputs pasted into this brief's §11 | ⬜ pending Lijo prod run |
| 2 | Lock the Exp 11 universe (§4 → U1, U2, or U3) | Claude + Lijo | append §4.X with the chosen ticker list | ⬜ blocked on (1) |
| 3 | Expand `research_prices_intraday` to cover the Exp 11 universe | Claude authors script revision; Lijo runs | bars for the new universe + ^NSEI extension if needed | ⬜ blocked on (2) |
| 4 | Fix the three Exp 10 method bugs ([[Exp10]] §9.1) in the new script | Claude | revised `exp11-intraday-event-study.mjs` — dedupe by (symbol, day), guard near-close snap, optionally extract direction | ⬜ blocked on (3) |
| 5 | Author the pre-registered `Exp11.md` (hypothesis, thresholds, traps, outcome tree) | Claude + Lijo | Exp11.md alongside this brief | ⬜ blocked on (4) |

Hard rule (per [[feedback_v2_prod_execution]]): everything Claude writes is
local + read-only on prod. Lijo runs SQL and the backfill against Railway.

---

## 6. What the new event-study script must do differently from Exp 10

These are the [[Exp10]] §9.1 method bugs that *must* be fixed before Exp 11
runs, plus two new requirements driven by the mid-cap universe.

1. **Dedupe by (symbol, trading_day) — keep the earliest filing per cluster.**
   Exp 10's GRASIM 2026-05-20 had 5 filings collapsed onto one Q4 results
   event, which broke the concentration check. With more tickers and more
   total filings, the dedup matters more on the mid-cap side, not less.

2. **Near-close snap-to-next-day guard.** Require
   `announced_at + max(horizon) ≤ 15:30 IST same day`; bucket the rest as
   "spillover" and report separately.

3. **Direction extraction (deferred but flag the gap).** Per [[Exp10]] §8.4,
   `financial_results` is a *signed* event. For Exp 11 v1 we can still report
   |AR| (magnitude only), but we should explicitly note in the verdict
   that the "directionless" frame underestimates the surplus for results
   buckets. NLP direction extraction is Option A in
   [[latency_vs_value_tradeoff]] §5; Exp 11 doesn't need to solve it.

4. **NEW: News-side ticker normalisation.** V2-031 writes raw NSE ticker
   symbols (no `.NS` suffix) to `india_news_signals.nse_tickers[]`. Exp 10's
   `norm()` already strips `.NS|.BO`, so the join should still work — but
   confirm against a sample. Mid-cap tickers may also contain unusual
   characters (`&`, `-`, digits) that Exp 10's regex never had to handle.

5. **NEW: Per-band slicing (if §4 lands on U3).** If we stratify by market
   cap band, the §5 verdict needs to be reported per-band, not just pooled.

6. **NEW: Wire-leg measurement (Exp 4 redux).** Exp 11 needs both halves of
   the squeeze, so the script must also emit the lead-time distribution
   (announcement → first-news for each (symbol, day) event), not just the
   price reaction. This is a *new output*, not Exp 10's job.

   Lead-time metric:
   ```
   lead_minutes(event) = (first_matched_news_published_at - announced_at) / 60
   ```
   bucketed and reported alongside |AR|. The sign-test against the
   13-min Exp 4 median is the H11a test.

---

## 7. Caveats inherited and new

From Exp 10's bias checklist ([[Exp10]] §9), all still apply: look-ahead,
timezone, multiple-testing, in-sample-only, tiny-N traps. Plus the new ones
introduced by the mid-cap universe:

- **Survivorship — now bites.** Mid/small-caps actually delist. Use the NSE
  equity master file as of *event date* for each filing, not as of today.
- **Liquidity & bar reliability.** Yahoo 5-min bars on a thinly-traded small-cap
  may have gaps, zero-volume bars, or stale closes. Add a per-event guard:
  if entry bar volume is below a threshold (e.g. 1000 shares), flag the event
  as "low-liquidity" and report it separately rather than excluding silently.
- **Transaction costs become material.** A 2× large-cap |AR| might still not
  cover round-trip cost on a small-cap (impact cost + STT + brokerage can be
  50–100 bps on a thinly-traded name). H11b's 2× threshold is gross, not
  net; net-of-cost is a separate downstream calculation when the verdict
  fires.
- **News ticker-tagging precision on mid-caps.** V2-031 NER may have lower
  precision on small-cap names than large-caps (less context per article,
  more ambiguous mentions). §3 check 3's eyeball spot-check is the gate; if
  precision is <80%, Exp 11 must be considered to be measuring news-tagging
  error as much as latency.
- **HF tagging gap on mid-caps.** Some mid/small-cap headlines won't be in
  our pipeline at all (RSS coverage holes). For each unmatched filing, the
  Gemini news-backfill loop is the recalibration — same posture as Exp 10's
  §7.4b. Reuse `exp10_gemini_news_backfill_brief.md` with mid-cap-specific
  search terms.

---

## 8. What this brief does NOT decide

- The exact ticker list. That's locked after §3 + §4.
- The exact horizons (probably same as Exp 10 — t+5/15/30/60/240, EOD, next-day).
- The exact category buckets (probably same as Exp 10).
- The exact lead-time threshold for H11a (60 min is a guess; tightens after
  §3 reveals coverage).
- The exact magnitude threshold for H11b (2× is a guess; tightens once
  v1 universe volatility profile is sampled).

These are pre-registration decisions that get locked in `Exp11.md` once the
preconditions are met. Until then, they're placeholders.

---

## 9. Why this experiment is the right next step

Three filters from prior synthesis:

- **[[positioning_v2]] "be your own first customer".** Exp 11 is the test that
  decides whether SachNetra can ever generate a tradeable signal for Lijo's
  own capital. If H11a+H11b fire SUPPORTED → Exp 12 paper-trade → live trade.
  No other in-flight work has that direct a route to the strategy.
- **[[latency_vs_value_tradeoff]] §6.** Exp 11 is the *named* recommendation
  there. It was gated on G1; G1 just shipped (V2-031).
- **[[sachnetra_research_playbook]] "research, not collection".** All the
  task-filed data sources (V2-019/020/024/026/027) are collection. None of
  them tests an existing hypothesis; they accumulate data for unwritten
  hypotheses. Exp 11 is the inverse: a hypothesis-test on data we already
  have, using the pipeline V2-031 just made testable.

Counter-argument we considered and rejected: "just run the prod backfills
for V2-017 and V2-030 first since they're code-complete." That's true but
parallel — Lijo can do those before, during, or after Exp 11; they don't
block each other and they don't tell us anything new about the squeeze.

---

## 10. Concrete next actions (when this brief is accepted)

1. **Lijo:** run §3 checks 1, 2, 3 against prod. Paste output into §11.
2. **Claude:** read §11; recommend U1/U2/U3 in §4; lock universe.
3. **Claude:** revise `backfill-intraday-prices.mjs` to accept a tickers flag /
   read from a coverage-driven list rather than the hardcoded Exp 10 array.
   Author the script; Lijo runs.
4. **Claude:** author `exp11-intraday-event-study.mjs` baking in §6's fixes.
5. **Claude + Lijo:** author the pre-registered `Exp11.md` — same template as
   `Exp10.md`. Lock §1 (hypothesis), §5 (success thresholds), §9 (traps)
   *before* running.
6. **Lijo:** run the experiment script. Fill `Exp11.md` §6/§7/§8/changelog.
7. **Claude + Lijo:** map the §8 result onto §2's outcome tree. Author Exp 12
   if SUPPORTED; route to G1 hardening or NLP if NULL.

---

## 11. Coverage check output (filled by Lijo after V2-031 prod run)

> Paste the raw output of §3 checks 1, 2, and 3 below. Don't summarise — the
> distribution shape matters for §4 (universe choice).

### 11.1 — Check 1: overall coverage

```
(pending Lijo prod run)
```

### 11.2 — Check 2: mid/small-cap tag distribution (top 50, excluding Exp 10 large-caps)

```
(pending Lijo prod run)
```

### 11.3 — Check 3: precision spot-check (30 random tagged rows)

```
(pending Lijo + manual eyeball; for each row record: ticker | headline-snippet | match? Y/N)
```

---

## 12. Cross-references

| To understand… | Read |
|---|---|
| The latency-vs-value squeeze this experiment tests | [[latency_vs_value_tradeoff]] |
| The lead-time result Exp 11 redux's on mid-caps | [[Exp4]] |
| The price-impact result Exp 11 redux's on mid-caps | [[Exp10]] |
| The Gemini news-backfill loop reused for mid-cap unmatched events | [[exp10_gemini_news_backfill_brief]] |
| Why we're not running more collectors first | [[positioning_v2]] |
| The G1 plan that V2-031 implemented | [[g1_execution_plan]] (memory) + V2-031 task file |
| The hypothesis register Exp 11 logs into post-run | [[sachnetra_research_playbook]] |

---

## 13. Changelog

| Date | Change |
|---|---|
| 2026-05-26 | Initial brief authored the day V2-031 was marked COMPLETE in CLAUDE.md. Scopes the experiment, locks the two coupled hypotheses (H11a lead time, H11b price impact), defines preconditions (§5) and method bug fixes (§6), and routes the next concrete actions (§10). Not yet pre-registered — the locked `Exp11.md` is authored only after §3 + §4 + §5(3) land. |
