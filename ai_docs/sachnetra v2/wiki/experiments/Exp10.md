---
tags: [experiment, sachnetra, research, quant-finance, intraday, event-study, exp4-followup, pre-registered]
source: [[sachnetra_research_playbook]]
experiment_id: Exp10
status: COMPLETED
authored_date: 2026-05-24
run_date: 2026-05-24
verdict: ⬜ INCONCLUSIVE + 🚩 SUSPECT
audience: Lijo, James, future Claude Code sessions
---

# Experiment 10 — Do tagged-large-cap NSE filings move the price (intraday)?

> Part of the SachNetra quant research program. Method philosophy in
> [[sachnetra_research_playbook]]. Direct follow-up to [[Exp4]] (filings lead news by
> ~13 min on large-caps) and [[Exp2]] (same-day +0.48% on daily bars but per-category
> untestable). Exp 10 asks the question Exp 4 implies but does not answer: **does the
> latency edge translate into a tradable intraday price move?**

This doc is **pre-registered**: hypothesis, thresholds, interpretation rules, and caveats are
locked in §1 / §5 / §9 *before* running the script. Results in §6–8 are added after.

---

## 1. Hypothesis (locked before looking)

**H10:** *For a tagged large-cap NSE filing landing during regular market hours
(9:15–15:30 IST), the price moves significantly in the short window after the filing —
measured as the **abnormal return** (stock minus ^NSEI) at horizon t+60min exceeding
0.5% in absolute terms at a hit-rate **above** the random-walk baseline, with the
mean signed abnormal return distinguishable from zero at p<0.05.*

**Direction:** the four cleanest Exp 4 buckets (acquisition, financial_results,
dividend, board_meeting) should show a systematic post-filing reaction. The Exp 2
DAY0 +0.48%/t=3.08 on daily bars is the prior — H10 is the same claim, refined to
intraday.

**Falsifiable:** if |abnormal return at t+60min| > 0.5% occurs at chance rate and
mean abnormal return is indistinguishable from zero, **H10 is rejected** and Exp 4's
latency edge has no monetary translation in the tagged-large-cap universe. That is a
publishable null — it tells us the value lives in mid/small-caps (the [[Exp4]] §7.4
"floor" interpretation), and would re-route the data-gap priority to G1.

### Pre-registered success thresholds (no moving the goalposts)

| Outcome class | Trigger |
|---|---|
| ✅ SUPPORTED | hit-rate at t+60min ≥ 55% AND mean signed AR significant at p<0.05 in ≥1 of the four tradeable categories |
| 🟡 PROMISING | mean |AR| significant at p<0.05 across ALL events but no per-category category clears 55% |
| ⬜ INCONCLUSIVE | N<60 matched events at any horizon; treat as baseline, re-run monthly |
| ❌ NULL | hit-rate at chance (~30% for the 0.5% threshold given typical large-cap 5-min vol) AND mean AR p>0.10 at all horizons |
| 🚩 SUSPECT | result driven by 1–2 single events or a single trading day (concentration check fails) |

---

## 2. Why this experiment

[[Exp4]] proved we beat the wire by ~13 min (sign-test p=0.002, n=239) on large-cap
filings. But Exp 4 is a *timestamp* test — it never touched price. The *valuable* claim
("be your own first customer; trade your own signal" — see [[positioning_v2]]) requires
linking that latency edge to a price reaction.

[[Exp2]] measured *daily* abnormal returns and found +0.48% same-day across 205 events,
but couldn't distinguish per category or per intraday horizon — `research_prices` only
has daily bars. Daily bars cannot test a 13-minute lead.

Exp 10 is the **prerequisite for any tradable strategy built on Exp 4**. If it
succeeds, the trade-rule construction (entry on filing, exit at horizon N) becomes
well-defined and feeds [[Exp11]] (paper-trade for 30 days). If it fails, Exp 4 stays
on the record as an academic latency result, and the research priority pivots to
unblocking G1 (mid/small-cap tagging) so the *valuable* version becomes testable.

---

## 3. Method

### 3.1 Data inputs
- **Events:** `india_bourse_announcements` filtered to the 15 tagged large-caps
  (per [[Exp4]] §14.3 — the names that account for ~all news ticker-tags today),
  landing 9:15–15:30 IST, in tradeable categories.
- **Prices:** new `research_prices_intraday` table with 5-min OHLCV from Yahoo for the
  same 15 tickers + `^NSEI` (the market control), populated by
  `scripts/research/backfill-intraday-prices.mjs`. Yahoo's free 5m feed is a rolling
  ~60-day window, which covers the rolling 30-day NSE announcement window with margin.
- **News (verification only):** `india_news_signals` for the matched/unmatched split
  feeding the optional Gemini news-backfill loop (script-emitted CSVs; brief authored
  *after* the first experiment run so its format is anchored in real script output).

### 3.2 Event extraction
For each filing on a tagged ticker:
1. Snap `announced_at` to the **next 5-min bar boundary** (entry bar `t`).
2. Categorise using the [[Exp2]] bucket regexes (same buckets for cross-experiment consistency).
3. Flag if landed outside market hours (excluded from the main analysis; recorded separately
   so we know how many we threw out and why).

### 3.3 Abnormal return at horizon `h`
- `r_stock(t→t+h) = ln(close_{t+h} / close_t)`
- `r_market(t→t+h) = ln(NSEI_{t+h} / NSEI_t)`
- `AR_h = r_stock − r_market` — the **market-adjusted** return at horizon `h`.

Using `^NSEI` as the control partially cancels each large-cap's Nifty-driven beta;
what remains is the idiosyncratic reaction — which is exactly the quantity the
filing should move.

### 3.4 Horizons measured

| Horizon | Bars | What it tests |
|---|---|---|
| t+5min | 1 | Inside the 13-min Exp 4 lead — if any edge exists, it's here |
| t+15min | 3 | At the edge of the lead |
| t+30min | 6 | Mid-digestion |
| t+60min | 12 | **Headline horizon** (the H10 pre-registered threshold) |
| t+240min (4h) | 48 | Half-day digestion |
| EOD close | (varies) | Full-session reaction |
| Next-day open→close | (varies) | Overnight + next session spillover |

### 3.5 Statistics
- **Per-horizon (all events):** mean AR, t-stat vs 0 (signed); mean |AR|, t-stat;
  hit-rate (% of events with |AR|>0.5%).
- **Per-category (Exp 2 buckets):** same metrics, guarded by `--min-events=10`.
- **Sign test (directional categories):** for `acquisition` and `dividend` (which
  carry a clear ex-ante sign expectation), does the AR sign at t+60min match the
  expected sign more often than 50%?
- **Concentration check:** drop the top-3 |AR| events and the top-3 trading days;
  does the headline statistic survive? Guards against single-event / single-day
  domination.
- **In-sample only:** N is too small (60–120 expected) for a meaningful OOS split.
  Treated as a baseline; re-run monthly (same posture as [[Exp2]]/[[Exp3]]/[[Exp4]]).

### 3.6 Output artifacts
- `exp10_events_matched.csv` — filings where a matching news item exists in `india_news_signals`
  (for the news-side context, NOT the lead time; that's Exp 4's job).
- `exp10_events_unmatched.csv` — filings with NO matching news in our DB, formatted for the
  manual Gemini news-backfill loop. Each row carries the filing's exact timestamp + subject so
  Gemini can be asked "did news exist for this event we missed?" → recalibrates the 1.7%
  ticker-tagging gap from below. **The Gemini brief is authored after the first run** so it
  matches the actual CSV schema and event volume.
- `exp10_results_summary.csv` — per-horizon and per-category aggregate statistics.

---

## 4. Commands

```bash
# Step 1 — backfill intraday prices (writes research_prices_intraday). Lijo runs.
node scripts/research/backfill-intraday-prices.mjs

# Step 2 — smoke check the data landed
#   psql: SELECT symbol, COUNT(*), MIN(bar_ts), MAX(bar_ts)
#          FROM research_prices_intraday GROUP BY symbol ORDER BY symbol;

# Step 3 — run the event study (read-only; emits CSVs). Lijo runs.
node scripts/research/exp10-intraday-filing-event-study.mjs

# Step 4 — (optional) Gemini news backfill
#   Open exp10_events_unmatched.csv, follow [[exp10_gemini_news_backfill_brief]]
#   (written after Step 3), paste results into exp10_events_gemini_verified.csv.

# Step 5 — (optional) re-run with the augmented news set
node scripts/research/exp10-intraday-filing-event-study.mjs --use-gemini-news
```

---

## 5. Pre-registered interpretation rules

Locked here so that whatever the script prints in §6 maps to a single, pre-committed verdict
in §8 — no post-hoc rationalisation.

| Result pattern | Verdict | What we do next |
|---|---|---|
| Hit-rate t+60 ≥ 55% AND mean signed AR p<0.05 in ≥1 tradeable category | ✅ SUPPORTED | Author [[Exp11]] — paper-trade the surviving category rule for 30 days |
| Mean \|AR\| sig p<0.05 across all events but no category clears 55% | 🟡 PROMISING | Keep collectors running; re-run monthly. Don't trade yet. |
| N<60 matched events | ⬜ INCONCLUSIVE | Baseline. Re-run when the announcement window has slid forward by another month. |
| Hit-rate ~chance AND mean AR p>0.10 at ALL horizons | ❌ NULL | Log H10 dead. Pivot research priority to G1 (mid/small-cap tagging) so the *valuable* version becomes testable. |
| Headline survives drop-top-3-events AND drop-top-3-days | (passes concentration) | Verdict stands |
| Headline collapses under either drop | 🚩 SUSPECT | Downgrade by one tier (e.g. SUPPORTED → PROMISING). Document the dependence. |

---

## 6. Data reality (the funnel — first run 2026-05-24)

| Fact | Value | Consequence |
|---|---|---|
| Tagged-symbol filings in 30-day window | 289 | denominator |
| ...landed in regular market hours (9:15–15:30 IST) | 91 | 68% landed outside trading; can't be intraday-tested |
| ...in tradeable categories (acq / results / dividend / board) | 32 | 3 of 4 in-hours filings are non-tradeable buckets |
| ...successfully snapped to intraday bars | 29 | analytical N as printed |
| ...snap failures (no bars / misalign) | 3 | edge-of-window filings |
| Matched-news split (Exp 4 method, ±48h) | 18 matched / 11 unmatched | unmatched feeds Gemini loop |
| Date range of analytical events | 2026-04-25 → 2026-05-22 | rolling 30-day window |
| **DISTINCT corporate events (de-dup by symbol+day)** | **~8** | the *real* analytical N — see §8 |

---

## 7. Results (first run 2026-05-24 — verbatim, nothing omitted)

### 7.1 Per-horizon (all tradeable categories pooled)

| horizon | n | mean AR | t | p | mean \|AR\| | hit-rate >0.5% |
|---|---|---|---|---|---|---|
| t+5min | 29 | −17.2 bps | −1.65 | 0.098 * | 42.6 bps | 27.59% |
| t+15min | 29 | −11.9 bps | −1.07 | 0.286 | 38.9 bps | 31.03% |
| t+30min | 28 | +7.9 bps | +0.47 | 0.636 | 58.1 bps | 35.71% |
| **t+60min** | **26** | **+95.2 bps** | **+2.44** | **0.015 ** | 166.1 bps | **73.08%** |
| t+240min | 26 | +199.7 bps | +3.41 | 0.001 *** | 301.4 bps | 84.62% |
| EOD close | 29 | +38.0 bps | +1.83 | 0.067 * | 81.0 bps | 44.83% |
| next-day close | 25 | +155.5 bps | +2.71 | 0.007 *** | 252.0 bps | 96.00% |

Pattern: first 30 min is noise (negative drift, not significant). Significance materialises from
t+60min onward and grows. Hit-rates climb from 28% to 96%.

### 7.2 Per-category at t+60min (min-events=10)

| category | n | mean AR | t | p | hit-rate | %positive |
|---|---|---|---|---|---|---|
| financial_results | 11 | +78.5 bps | +1.17 | 0.244 | 90.91% | 72.73% |
| board_meeting | 9 | (below min-events=10) | | | | |
| dividend | 9 | (below min-events=10) | | | | |
| acquisition | 4 | (below min-events=10) | | | | |

Only `financial_results` cleared the guard. Mean is large (+78.5 bps) but p=0.244 is not significant.
Three categories under-N.

### 7.3 Concentration check at t+60min

| Test | n | mean | t | p | hit-rate |
|---|---|---|---|---|---|
| FULL set | 26 | +95.2 bps | +2.44 | 0.015 ** | 73.08% |
| drop top-3 by \|AR\| | 23 | +58.1 bps | +1.55 | 0.121 | 69.57% |
| **drop top-3 days** | **12** | **−62.8 bps** | **−1.88** | **0.061 *** | **50.00%** |

Headline significance dies on either drop. **Mean flips sign** when the top-3 days are removed —
the strongest possible concentration-failure signature.

### 7.4 News matched vs unmatched split

- Matched (Exp 4 method, ±48h ticker join): **18 events** → `exp10_events_matched.csv`
- Unmatched: **11 events** → `exp10_events_unmatched.csv` (formatted for Gemini loop)
- 38% unmatched rate — better than Exp 4's universe-wide 98% because we filtered to tagged large-caps

### 7.4b Gemini-augmented re-run (2026-05-24)

After running the Gemini news-backfill loop ([[exp10_gemini_news_backfill_brief]]) on the
4 distinct unmatched corporate events:

| (Symbol, Day) | Gemini found | News timing | Implication |
|---|---|---|---|
| MARUTI 2026-04-28 (Q4 results) | ✅ FE 15:34 IST + Mint 15:44 IST | filing 14:41 → news 15:34 = **53 min lead** | G1 tagging gap — Mint/FE both ran it; our pipeline didn't tag |
| M&M 2026-05-05 (Q4 results) | ✅ Livemint 12:27 IST + FE 19:13 IST | filing 12:22 → news 12:27 = **5 min lead** | G1 tagging gap — Livemint near-simultaneous; tight lead |
| ITC 2026-05-07 (Sresta/Wimco amalgamation) | ❌ NO_NEWS_FOUND across 6 tier-1 outlets | filing only — no wire coverage | genuine zero-coverage event |
| RELIANCE 2026-05-07 (Kandla GHA acquisition) | ❌ NO_NEWS_FOUND across 6 tier-1 outlets | filing only — no wire coverage | genuine zero-coverage event |

**Re-run with `--use-gemini-news`:** matched 18 → 27, unmatched 11 → 2. The price statistics
(§7.1–§7.3) **are unchanged** because news augmentation does not affect abnormal-return
calculation — it only re-partitions the matched/unmatched split. The verdict in §8 is
unaltered.

**What the Gemini loop actually produced (which the price test doesn't capture):**
1. **The 1.7% tagging gap is not a fringe problem.** Our pipeline missed major Q4 results
   for MARUTI and M&M — Nifty-50 top-10 names with dense Mint/FE coverage. This routes
   directly to G1 priority (news NER on the `india_news_signals` pipeline).
2. **The latency-vs-value tradeoff is empirical.** Q4 results (highest expected price
   impact) have 5–60 min leads because the wire is fast on Nifty names. Small corporate
   actions (sub-subsidiary amalgamation, transmission asset deal) have **infinite** lead
   because no journalist covered them — but those events also produce no measurable price
   reaction. The events with biggest lead are precisely the events with smallest impact.
3. **Independent corroboration of [[Exp4]]'s 13-min median.** The two externally-measured
   leads (53 min MARUTI, 5 min M&M) bracket Exp 4's median from a completely different
   timing source (search-engine publish timestamps vs our scrape timestamps). Same order
   of magnitude, same direction.

### 7.5 Top-3 |AR| events at t+60min (the events driving the headline)

| Rank | Date | Symbol | Bucket | t+60 AR | News headline |
|---|---|---|---|---|---|
| 1 | 2026-05-20 | GRASIM | dividend | +3.82% | "Grasim narrows loss in Q4...shares zoom post Q4 results" |
| 2 | 2026-05-20 | GRASIM | board_meeting / fin_results | +3.20% | (same news headline as rank 1) |
| 3 | 2026-05-20 | GRASIM | financial_results | +3.20% | (same news headline as rank 1) |

**All three are GRASIM on the same trading day matched to the same news article.** GRASIM
filed 5 separate items on 2026-05-20 within 12 minutes (board outcome, acquisition, dividend,
auditor appointment, press release) — each was counted as an independent event but they
collectively describe one corporate event: Q4 results disclosure. See §8.

---

## 8. Interpretation (first run 2026-05-24)

**Verdict per §5: ⬜ INCONCLUSIVE + 🚩 SUSPECT.** Both fired. INCONCLUSIVE because n=26 at the
headline horizon vs the §5 threshold of 60. SUSPECT because the concentration check failed and
the mean *flips sign* when the top-3 days are dropped — that's the strongest possible signature
of "a few outliers are doing all the work."

### 8.1 The naïve read (what we'd say if we hadn't pre-registered)

Without §5 in place, the t+60min row is alluring: +95 bps, p=0.015, hit-rate 73%, climbing to
+200 bps and 85% by t+240. A trader scanning only this row would write a strategy memo.

### 8.2 The pre-registration earns its keep

§7.3 shows the headline collapses (p=0.121, then sign-flip to −63 bps) once 3 events / 3 days
are removed. §7.5 shows the top-3 events are **the same company on the same day** — GRASIM
2026-05-20, Q4 results disclosure. The "26 events" are not 26 independent observations.

### 8.3 The real N is ~8, not 26 — the multi-filing-per-event artefact

Reading `exp10_events_matched.csv` end-to-end, the 18 matched events collapse to ~6–7
distinct corporate events when de-duped by `(symbol, trading_day)`:
- GRASIM 2026-05-20 (Q4 results) — **5 filings, all matched to one news headline**
- ITC 2026-05-21 (Q4 results) — 3 filings, same headline
- SBIN 2026-05-08 (Q4 results) — 2 filings, same headline
- SUNPHARMA 2026-05-22 (Q4 results) — 3 filings, all near end-of-window
- SBIN 2026-05-12 (board meeting), MARUTI 2026-05-14, M&M 2026-05-14, BHARTIARTL 2026-05-14, APOLLOHOSP 2026-05-21 — one filing each

Same logic on the 11 unmatched: 4 MARUTI 2026-04-28 (Q4 results) + 5 M&M 2026-05-05 (Q4 results) +
1 ITC + 1 RELIANCE = **4 distinct events**, not 11.

So the dataset is **~8 matched + 4 unmatched = ~12 distinct corporate events** across the entire
30-day window. That is far below any threshold for inference about per-category effects, and is
*why* §5's INCONCLUSIVE rule (n<60) was the right gate.

### 8.4 What the data actually shows (descriptively, with N caveats)

The directional read of the 4–5 Q4 results events that did snap:
- GRASIM: results beat expectations → +3.8% in 60 min
- BHARTIARTL: results positive → +0.9% in 60 min
- SBIN: results miss → −3.0% in 60 min (and −1.5% on a second-day re-filing)
- ITC: results miss → −1.9% in 60 min
- SUNPHARMA: end-of-window, no t+60 measurable

Pattern: **the price moves in the direction of the results surprise**, not in the direction of
"a filing happened." The latency edge from Exp 4 (~13 min) appears to give the SachNetra pipeline
the *number* before the wire confirms it — but extracting *direction* from filing text requires
NLP we don't have. The current script treats "results announced" as a categorical event without
sign; that is the wrong abstraction for this category.

### 8.5 Snapping bug: filings near close get snapped to next-day open

Row 16 of the matched CSV (ITC dividend 2026-05-21 09:55:48 UTC = 15:25:48 IST) has its entry
bar snapped to **2026-05-22T03:45:00Z** — the *next trading day*'s open — because only ~5 min
remained in the session. All horizons for that row measure overnight gap + next-day action, not
an intraday filing reaction. Same issue likely affects a small number of other late-session
filings; pollutes the t+60min and t+240min rows.

### 8.6 What §5 row was triggered, and what we do about it

§5 row triggered: **⬜ INCONCLUSIVE** (primary) + **🚩 SUSPECT** (modifier). Per §12, this
means:
1. Do NOT trade on the +95 bps t+60min number. It is a story about 3 days, not 26 events.
2. Do NOT proceed to [[Exp11]] (paper-trade) — the pre-registered gate (SUPPORTED) was not met.
3. Re-run **monthly** as the rolling 30-day announcement window slides forward.
4. **First, fix the script** (§9 follow-ups below) — the multi-filing-per-event inflation and
   the near-close snap bug are method failures, not data limitations. The next run with those
   fixed will report a much smaller (but more honest) N and a more interpretable result.
5. The Q4-results signature visible in §8.4 hints that the *real* tradeable question is "does
   our filing arrive enough ahead of the wire for us to classify direction in time?" — that is
   an NLP + execution latency question, not the simple "is there a move" question H10 asked.

The honest summary: **Exp 10 v1 didn't find a tradable signal, but it found two real method
bugs and pointed at the right next question.** That is what pre-registration is supposed to
do — keep the analysis honest enough that the *follow-up* is well-targeted.

---

## 9. Caveats & traps (locked in advance; mapped to playbook checklist)

The [[sachnetra_research_playbook]] §"traps that invalidate research" lists seven failure
modes. Exp 10's defences against each:

- **Look-ahead bias.** Entry is the *next 5-min bar after* `announced_at` — we never use
  the bar containing the filing instant. No future information leaks into the entry price.
- **Survivorship bias.** The 15-name universe is today's tagged-large-cap set; none of the
  Nifty heavyweights have been delisted in the 60-day window, so survivorship is not a
  meaningful confound at this scale. **Caveat:** the result will not generalise to
  mid/small-caps (where delisting risk actually bites) — that's the [[Exp4]] §7.4 large-cap
  ceiling and the G1 gap.
- **Timezone drift.** Both `announced_at` (TIMESTAMPTZ, IST) and `bar_ts` (TIMESTAMPTZ, UTC
  at bar start) are absolute instants in Postgres; the snap-to-next-bar is computed in epoch
  seconds, so no IST/UTC re-alignment is required. The market-hours filter (9:15–15:30 IST)
  is applied in IST explicitly.
- **Multiple-testing.** Four tradeable categories × seven horizons = 28 cells. A spurious
  "significant at p<0.05" in 1–2 cells is expected by chance. The pre-registered §5 success
  rule requires p<0.05 *and* hit-rate ≥55% at the *headline horizon* (t+60min); category
  noise at other horizons is reported but doesn't qualify.
- **In-sample only.** Explicitly accepted (§3.5) — N too small for OOS. Mitigated by the
  monthly-rerun protocol and the §5 ⬜ INCONCLUSIVE bucket for N<60.
- **Tiny-N event studies.** Per-category guard is `--min-events=10`; categories under that
  are reported with their N but excluded from the §5 verdict logic. The "[[Exp2]] H2-mgmt
  n=10 anecdote" mistake is logged in the playbook precisely so we don't make it again.
- **Non-stationarity.** Single-name idiosyncratic abnormal returns at 5-min–60-min horizons
  are not a trending series — the AR construction (stock − market) already differences out
  the index-level trend. Stationarity tests are not required at this horizon.

Plus the experiment-specific caveats:

- **5-min snap.** Entry bar is the next 5-min bar after the filing, so we concede ~2.5 min
  of the 13-min Exp 4 median lead before the entry price prints. The t+5min row is the
  honest test of "can you trade inside the lead window."
- **No transaction costs.** AR is gross. Brokerage + STT + slippage on a large-cap is
  ~0.1% round-trip; add that mentally when reading §8.
- **Matching noise inherited from Exp 4.** The news side may tag the wrong filing as
  "matched" for the news-context output — does NOT affect §5's price-reaction verdict,
  which only uses `india_bourse_announcements` and `research_prices_intraday`.
- **Yahoo intraday provenance.** 5-min bars are Yahoo's reconstruction, not raw NSE tick
  data. Adequate for the directional question at this scale; would be insufficient for a
  microstructure / HFT test.
- **Tagged-large-cap selection bias.** The 15 names are the only ones where the news side
  currently has enough tags to even count as "tagged." The result tells us nothing about
  the ~3000 listed names that aren't in this universe — that's [[Exp4]] §7.4's "we measured
  the hardest case" point.

### 9.1 Method bugs surfaced by the first run (must fix before re-run)

- **Multi-filing-per-event inflation.** One corporate event (a Q4 results disclosure) generates
  3–5 NSE filings within minutes (board outcome → financial results → dividend → record date →
  press release). The current script treats each as an independent event — inflating N by 3–5x
  and making the per-event observations statistically dependent. **Fix:** dedupe by
  `(symbol, trading_day)` and keep the *earliest* filing per cluster as the entry timestamp.
  Real N will drop from ~26 to ~6–8 in this window, which is the truth.
- **Near-close snap-to-next-day.** Filings landing within ~30 min of 15:30 IST have their entry
  bar snapped forward to the next trading day's open because no intraday bar exists between the
  filing and close. The resulting AR measures overnight gap + next-day move, not an intraday
  reaction. **Fix:** require `announced_at + max(horizon)` ≤ 15:30 IST same day, OR explicitly
  flag and report these as "spillover" events in a separate bucket.
- **No direction extraction.** For `financial_results` the price reaction is signed by the
  results-vs-expectation surprise, not by "a filing happened." Treating the event as direction-
  less buries the signal (good and bad results average to ~zero). **Fix (harder):** add a sign
  column from a downstream NLP pass or by joining to a results-database; or restrict the
  per-category test to events with a clean ex-ante sign (a `dividend cut` is negative, a
  `dividend hike` is positive — these are extractable from the subject text).

These three fixes are the prerequisite for any honest re-run. They are method bugs, not data
limitations, so they will be fixed in the next Exp 10 script revision before the monthly re-run.

---

## 10. Outputs & artifacts

- **Code (this experiment):**
  - `scripts/research/backfill-intraday-prices.mjs` (writes `research_prices_intraday`; Lijo runs)
  - `scripts/research/exp10-intraday-filing-event-study.mjs` (read-only; Lijo runs; written AFTER backfill lands)
- **Gemini brief:** `ai_docs/sachnetra v2/wiki/experiments/exp10_gemini_news_backfill_brief.md`
  — written AFTER the first experiment run so its format matches actual CSV schema/event volume.
- **New table:** `research_prices_intraday` (5-min OHLCV, 16 symbols, ~60-day rolling window).
- **Output CSVs:** `exp10_events_matched.csv`, `exp10_events_unmatched.csv`,
  `exp10_results_summary.csv` (and `exp10_events_gemini_verified.csv` if Step 4 is run).
- **Hypothesis Register:** row H10 to be logged in [[sachnetra_research_playbook]] post-run.

### H10 Hypothesis-Register row template (fill after §7)

```
| H10 | YYYY-MM-DD | Tagged-large-cap NSE filing → |AR_60min| > 0.5% above random-walk baseline (intraday) | india_bourse_announcements + research_prices_intraday + ^NSEI, n=(TBD) | market-adjusted intraday event study; per-horizon mean AR + hit-rate; concentration check | (TBD: headline AR/p/hit-rate/sig categories) | in-sample only (small N); monthly re-run protocol | (TBD verdict per §5) | (TBD: next step per §5 row triggered) |
```

---

## 11. Reproducibility

Deterministic given the same DB snapshot — **but both source windows slide forward daily**
(NSE announcement window is 30-day rolling; Yahoo intraday is 60-day rolling) so re-running
later samples more (and different) events. Re-run protocol:

1. `node scripts/research/backfill-intraday-prices.mjs` — refreshes the 60-day intraday window.
2. `node scripts/research/exp10-intraday-filing-event-study.mjs` — re-emits CSVs and stats.
3. Compare §7 to the previous run's §7; flag any sign flips or threshold crossings explicitly.

Flags planned for the experiment script: `--from=`, `--to=`, `--min-events=N`, `--categories=`,
`--use-gemini-news`. Finalised when the script is authored.

---

## 12. Next experiment

**If §5 fires SUPPORTED → [[Exp11]] — paper-trade the surviving category rule for 30 days.**
Define entry / exit / size / invalidation precisely; run paper alongside live filings; measure
realised hit-rate and PnL vs the Exp 10 in-sample backtest. This is the "be your own first
customer" closing-loop step in [[positioning_v2]].

**If §5 fires NULL → reprioritise G1 (mid/small-cap news tagging) on the data-gaps backlog.**
The valuable version of the Exp 4 thesis lives in mid/small-caps. The null on large-caps tells
us the latency edge is real but unmonetisable at this beta — the diagnosis is "wrong universe,"
not "wrong thesis."

**Either way, append H10 to the Hypothesis Register** ([[sachnetra_research_playbook]]).

---

## 13. Cross-experiment context

| Exp | Status | Relevance to Exp 10 |
|---|---|---|
| [[Exp2]] | ⬜ inconclusive | Daily DAY0 +0.48% (t=3.08, n=205) — Exp 10's intraday refinement |
| [[Exp4]] | 🟡 supported | The latency premise (~13 min lead, p=0.002) Exp 10 tries to monetise |
| [[Exp11]] | (planned) | Paper-trading test that only happens if Exp 10 fires SUPPORTED |
| G1 (backlog) | open | Reprioritised if Exp 10 fires NULL |

---

## Changelog
| Date | Change |
|---|---|
| 2026-05-24 | Pre-registered. Hypothesis (§1), success thresholds (§5), bias-checklist defences (§9), and re-run protocol (§11) all locked **before** running. Backfill script authored same day; experiment script + Gemini brief deferred until backfill lands so they anchor to real schema/event volume. |
| 2026-05-24 (later) | First run executed (`backfill-intraday-prices.mjs` → 69,855 bars across 16 symbols; `exp10-intraday-filing-event-study.mjs` → 29 snapped events from 289 filings). Filled §6 (funnel), §7 (results — including §7.5 top-3 events), §8 (interpretation — verdict ⬜ INCONCLUSIVE + 🚩 SUSPECT, the §5 rule fired), §9.1 (three method bugs to fix before re-run: multi-filing-per-event inflation, near-close snap-to-next-day, no direction extraction). The pre-registration earned its keep: a naïve read of t+60min (+95 bps, p=0.015) is invalidated by §7.3 (sign-flip when top-3 days drop) and §7.5 (top-3 events are GRASIM same-day-same-event). Real distinct-event N is ~8, not 26. Next: fix the three method bugs, then re-run monthly. H10 register row not yet logged (verdict is INCONCLUSIVE — log when the fixed re-run produces a usable N). |
| 2026-05-24 (later still) | Gemini news-backfill loop executed on the 11 unmatched events (4 distinct corporate events). Results in new §7.4b. Re-run with `--use-gemini-news` shifted matched 18 → 27, unmatched 11 → 2; price statistics (§7.1–§7.3) and the §5 verdict unchanged (correctly — augmentation only re-partitions the news split). Three findings worth carrying: (1) **G1 tagging gap is severe even on top names** — pipeline missed MARUTI + M&M Q4 results despite Mint/FE coverage; (2) **the latency-vs-value tradeoff is empirical** — Q4 events have 5–60 min leads + big impact, small acquisitions have infinite lead + zero impact; (3) **the two externally-measured leads (53 min MARUTI, 5 min M&M) bracket Exp 4's 13-min median**, independent corroboration from a different timing source. |
