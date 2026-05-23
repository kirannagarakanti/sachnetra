---
tags: [experiment, sachnetra, research, quant-finance, announcements, event-study, product-a]
source: [[sachnetra_research_playbook]]
experiment_id: Exp2
status: INCONCLUSIVE (data too young + too narrow — not a null, not a confirmation)
run_date: 2026-05-22
verdict: ⬜ INCONCLUSIVE · one real-ish same-day effect (DAY0 +0.48%, t=3.08, n=205) · category-level UNTESTABLE yet
audience: Lijo, James, future Claude Code sessions
---

# Experiment 2 — Do NSE bourse announcements move prices? (event study)

> Part of the SachNetra quant research program. Method in `[[sachnetra_research_playbook]]`.
> Follows [[Exp1]] (FII flows don't lead). This tests the empirical core of **Product A**.

---

## 1. Hypothesis (written before looking)

**H2:** *Announcements in certain categories (board outcomes, financial results, promoter pledges, auditor/management changes, dividends, etc.) produce non-zero **abnormal returns** around the filing — and, for a tradable edge, in the days **after** it.*

Direction is per-category (some bullish, some bearish), horizon is the ±5-day window split into PRE / DAY0 / POST. This is the question that, if answered yes, justifies Product A (the corporate-filing intelligence feed).

---

## 2. Why this experiment

Exp 1 established the leading signal is **not** in FII flows (they react, don't lead). Event-driven filings are the next and most business-relevant candidate: the pivot doc claims "the market reacts in minutes after a filing; journalists take hours." This measures whether filings carry exploitable abnormal returns at all.

---

## 3. Method — market-adjusted event study

Script: `scripts/research/exp2-announcements-event-study.mjs` (read-only).

- **Abnormal return:** `AR_t(stock) = log_return_t(stock) − log_return_t(^NSEI)`. Subtracting the index isolates the stock-specific move from the broad-market move.
- **Event day 0:** first trading day on/after the announcement's **IST** date (`announced_at AT TIME ZONE 'Asia/Kolkata'`).
- **Windows:** PRE = CAR[−5..−1], DAY0 = AR[0], POST = CAR[+1..+5].
- **No look-ahead:** POST excludes day 0 entirely, so even after-hours filings can't leak into the tradable window. A significant POST drift is the genuinely interesting result.
- **Symbol match:** announcement `symbol` (e.g. `RELIANCE`) → `RELIANCE.NS`, kept only if present in `research_prices`.
- **Bucketing:** keyword rules over (`category` + `subject`) → buckets (auditor, promoter_pledge, mgmt_change, board_meeting, financial_results, dividend, buyback, bonus_split, credit_rating, order_win, acquisition) + an `ALL` bucket. An announcement can land in multiple buckets.
- **Cross-sectional stat per bucket:** `mean(CAR) / (sd(CAR)/sqrt(N))`, two-sided p via normal approximation. Markers `*`<0.10 `**`<0.05 `***`<0.01.

---

## 4. Commands run

```bash
node scripts/research/exp2-announcements-event-study.mjs                  # min 30 events/bucket
node scripts/research/exp2-announcements-event-study.mjs --min-events=10  # surface smaller buckets
# data-range probe:
#   SELECT min(announced_at), max(announced_at), count(*), count(distinct symbol)
#   FROM india_bourse_announcements;
```

---

## 5. Data reality (the binding constraints — discovered by this experiment)

| Fact | Value | Consequence |
|---|---|---|
| Announcement date range | **2026-04-21 → 2026-05-22 (~1 month)** | NSE's feed serves only a rolling ~30-day window. V2-018's "17,322 rows" is **one month of all-company filings, NOT years**. Cannot be backfilled — must accumulate forward. |
| Distinct symbols in announcements | 2,104 | Filings span the whole listed universe (mostly mid/small caps). |
| `research_prices` coverage | 46 Nifty-50 names + ^NSEI | Only large caps are priced → most announcements have no price to test against. |
| Announcements matched to a priced symbol | **705 / 17,322 (4%)** | 96% unusable for lack of prices. |
| Usable events (full ±5-day window present) | **205** | Recent filings (last ~5 trading days) lack a +5 POST window; one short month limits the rest. |

**These two constraints — one month of history, Nifty-only prices — are the real output of Exp 2.**

---

## 6. Results (complete)

### 6.1 Default run (min 30 events/bucket)
Only the `ALL` bucket cleared the threshold:

| Bucket | N | PRE [−5..−1] (t) | DAY0 [0] (t) | POST [+1..+5] (t) | sig |
|---|---|---|---|---|---|
| ALL | 205 | +0.24% (1.08) | **+0.48% (3.08)** | +0.39% (1.70) | * |

### 6.2 Low threshold (min 10 events/bucket) — for transparency only, N too small to trust
| Bucket | N | PRE (t) | DAY0 (t) | POST (t) | sig |
|---|---|---|---|---|---|
| mgmt_change | 10 | +0.43% (1.02) | +1.71% (3.75) | +2.20% (2.03) | ** |
| ALL | 205 | +0.24% (1.08) | +0.48% (3.08) | +0.39% (1.70) | * |
| board_meeting | 19 | +0.29% (0.40) | +0.54% (1.21) | +0.29% (0.34) | — |
| financial_results | 19 | −0.02% (−0.03) | +0.42% (0.69) | +0.27% (0.33) | — |
| dividend | 17 | +0.70% (1.21) | +0.66% (1.43) | −0.04% (−0.04) | — |

Buckets below 10 events (auditor, promoter_pledge, buyback, bonus_split, credit_rating, order_win, acquisition) were not reportable — too few matched events in one month of Nifty-50 filings.

---

## 7. Interpretation

1. **One real-ish effect:** across all 205 events, a **+0.48% abnormal return on the filing day** (t=3.08). Announcements *do* coincide with a positive same-day stock-specific move. This is the only result with a credible sample.

2. **Post-filing drift is, at best, marginal:** ALL POST = +0.39%, t=1.70 (p≈0.09). Suggestive of mild under-reaction/drift, not established. An efficient-market reading (move happens day 0, little left after) is equally consistent with the data.

3. **The mgmt_change result is a trap, not a finding.** POST +2.20% with t=2.03 looks like alpha, but **N=10**, survivorship-biased, one month. This is exactly the "small N → anecdote" warning. Do **not** act on or cite it. Logged only to show it was seen and dismissed.

4. **The category-level question — which is the entire Product A thesis — is UNTESTABLE today.** Per-category samples are 10–19 events. You cannot distinguish auditor-resignation alpha from noise with this much data.

5. **Net verdict: ⬜ inconclusive.** Not ❌ (nothing was disproved) and not ✅ (nothing was proved). The experiment is **data-limited, not signal-negative.**

---

## 8. Caveats & limitations

- **One month of announcements** → no seasonality, no regime variation, tiny per-category N. The dominant limitation.
- **Survivorship bias (severe here):** only *current* Nifty-50 names are priced. The highest-alpha filings (auditor resignations, pledges on distressed mid/small caps, names that later blew up) are exactly the ones missing. Any positive result is biased toward stable survivors.
- **Symbol matching is exact-on-Nifty-only:** non-`.NS`-mappable or non-Nifty symbols are dropped (the 96%).
- **Market model is simple** (index-subtracted, not beta-adjusted CAPM/market-model with an estimation window). Fine for a screen; would refine for a real study.
- **Multiple buckets per event + ALL overlap:** buckets are not mutually exclusive; ALL is not a sum of buckets.
- **p-values normal-approximated** — irrelevant at n=205, but the N=10 mgmt_change t/p should be read as indicative only.
- **No transaction costs, no liquidity/slippage** modelling.

---

## 9. Action items / what unblocks a real Exp 2

| Need | Why | Owner |
|---|---|---|
| **Let the V2-018 collector run daily for months** | Announcement history can't be backfilled (rolling ~30-day NSE window). Per-category N only grows with calendar time. *The database genuinely IS the asset — this is the literal proof.* | James (collector running) + time |
| **Broaden `research_prices` beyond Nifty-50** | 96% of filings are non-Nifty. Need Nifty 200/500 prices to use them. | Extend `backfill-research-prices.mjs` symbol list |
| **Address survivorship for single-stock studies** | Delisted names carry the real fraud/distress alpha; Yahoo current-universe misses them | Hard with free data — note as a known ceiling, or source a point-in-time universe later |
| **Refine to a market-model AR** (beta-adjusted, estimation window) | Cleaner abnormal-return measurement once N supports it | Future Exp 2b |

---

## 10. Outputs & artifacts

- **Hypothesis Register** (`[[sachnetra_research_playbook]]`): rows **H2, H2-mgmt** logged 2026-05-22.
- **Code:** `scripts/research/exp2-announcements-event-study.mjs` (read-only).
- **Reused data:** `research_prices` (from [[Exp1]] / Exp 0); `india_bourse_announcements` (V2-018).

---

## 11. Reproducibility

Deterministic given the same DB snapshot — **but note the announcement window slides forward daily** (rolling NSE feed), so re-running weeks later samples different (and more) events. Re-run: the two commands in §4. Flags: `--min-events=N`, `--pre=N`, `--post=N`, `--from=`, `--to=`, `--index=`.

---

## 12. Next steps

- **Short term:** nothing more to squeeze from analysis — the bottleneck is data volume, not method.
- **Re-run cadence:** repeat Exp 2 monthly as the announcement table accumulates; per-category N will cross testable thresholds over the coming months.
- **Parallel experiment that IS testable now:** **Exp 3 — news sentiment as a time series** (`india_news_signals`, ARIMA/stationarity). That data is deeper and not gated by the rolling-window problem.

---

## Changelog
| Date | Change |
|---|---|
| 2026-05-22 | Initial complete write-up. Documents both runs, the two binding data constraints (1-month history, Nifty-only prices), full result tables, the mgmt_change trap, caveats, and what unblocks a real test. |
