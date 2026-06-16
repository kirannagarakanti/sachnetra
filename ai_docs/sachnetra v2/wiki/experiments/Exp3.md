---
tags: [experiment, sachnetra, research, quant-finance, sentiment, time-series, arima]
source: [[sachnetra_research_playbook]]
experiment_id: Exp3
status: INCONCLUSIVE (data too young — N=16 daily points)
run_date: 2026-05-22
verdict: ⬜ INCONCLUSIVE · method validated · recurring theme — sentiment looks COINCIDENT (~0.56 same-day) not leading · no day-to-day autocorrelation · positivity bias flagged
audience: Lijo, James, future Claude Code sessions
---

# Experiment 3 — News sentiment as a time series

> Part of the SachNetra quant research program. Method in `[[sachnetra_research_playbook]]`.
> Follows [[Exp1]] (FII reacts, doesn't lead) and [[Exp2]] (announcements too young to test).
> Run autonomously 2026-05-22 while Lijo was away.

---

## 1. Hypotheses (written before looking)

- **H3a — ARIMA pre-flight:** the daily-mean sentiment series is **stationary** (ADF test) and **autocorrelated** (ACF / AR(1) / Ljung-Box). I.e. is it even valid to model sentiment with ARIMA, and does *yesterday's* mood inform *today's*?
- **H3b — value:** daily-mean sentiment on day T predicts the **^NSEI return on T+1** (no look-ahead). Plus the same-day check: is sentiment **leading** the market or merely **coincident**?

---

## 2. Why this experiment

The playbook lists Exp 3 as the cheapest, deepest-data time-series test SachNetra owns, and the one not gated by the rolling-window problem that crippled Exp 2. It directly exercises the early NPTEL lectures (stationarity, ACF, ARIMA). It also tests the *core SachNetra thesis* — that aggregated news sentiment is a tradable signal.

---

## 3. Data

| Series | Source | Detail |
|---|---|---|
| Daily mean sentiment | `india_news_signals.sentiment_score` (IST day, `scraped_at`) | 869 scored rows of 16,428 total (~5%; scoring tracks the market-moving subset) |
| Nifty return | `research_prices` `^NSEI` `log_return` | for the H3b join |

**Coverage reality (the binding constraint):** sentiment scoring began **2026-05-07**, giving only **16 distinct daily observations** (→ 2026-05-22). Daily headline counts swing from **3 to 188** — the pipeline ramped sharply around 2026-05-17 (the V2-012 autonomous pipeline going live), so early days are thin and noisy. ADF/ARIMA/forecast statistics need ~30–50+ daily points to mean anything. **This run is a method pre-flight + a baseline to repeat monthly, not a basis for conclusions.**

---

## 4. Method

Script: `scripts/research/exp3-sentiment-timeseries.mjs` (read-only). Builds the daily-mean series, then:
- descriptive stats + per-day headline counts (thin days flagged);
- **ACF** at lags 1–5 with a ±1.96/√N significance band;
- **AR(1)** regression `sent_t ~ sent_t-1`;
- **Dickey-Fuller** unit-root test `Δsent_t = a + γ·sent_t-1 + e`, comparing tau to DF critical values (−2.57/−2.86/−3.43);
- **Ljung-Box Q(5)** for joint autocorrelation vs χ²;
- **H3b:** `sent_T → ^NSEI return_T+1` (no look-ahead, next trading day) and same-day `sent_T vs return_T`.

Run twice: default (all 16 days) and `--min-headlines=20` (drops thin days → 10 days) to check robustness to the noisy low-count days.

---

## 5. Commands run
```bash
node scripts/research/exp3-sentiment-timeseries.mjs
node scripts/research/exp3-sentiment-timeseries.mjs --min-headlines=20
```

---

## 6. Results (complete)

### 6.1 The daily series (all 16 days)
| date | headlines | mean sentiment |
|---|---|---|
| 2026-05-07 | 8 | +0.6619 |
| 2026-05-08 | 24 | +0.2266 |
| 2026-05-09 | 17 | +0.1497 |
| 2026-05-10 | 6 | +0.2650 |
| 2026-05-11 | 17 | −0.3791 |
| 2026-05-12 | 36 | −0.0767 |
| 2026-05-13 | 33 | +0.2170 |
| 2026-05-14 | 5 | +0.2000 |
| 2026-05-15 | 28 | +0.2536 |
| 2026-05-16 | 28 | +0.2859 |
| 2026-05-17 | 3 | +0.9333 |
| 2026-05-18 | 95 | +0.0677 |
| 2026-05-19 | 129 | +0.0694 |
| 2026-05-20 | 144 | +0.0230 |
| 2026-05-21 | 188 | +0.1788 |
| 2026-05-22 | 108 | +0.3299 |

Descriptive: mean **+0.2129**, sd 0.2900, min −0.3791, max +0.9333. **14 of 16 days are positive** — a structural positivity bias (see §8).

### 6.2 H3a — autocorrelation & stationarity

| Metric | Default (N=16) | min-headlines=20 (N=10) |
|---|---|---|
| ACF lag 1 | +0.113 (in band) | −0.020 |
| ACF lag 2 | −0.063 | −0.285 |
| ACF lag 3 | −0.114 | −0.468 |
| ACF lag 4 | −0.295 | −0.006 |
| ACF lag 5 | −0.241 | +0.200 |
| Significance band ±1.96/√N | ±0.490 | ±0.620 |
| AR(1) coef (t, p) | 0.111 (t=0.44, p=0.66) | −0.036 (t=−0.09, p=0.93) |
| Ljung-Box Q(5) vs χ²₀.₀₅=11.07 | 4.22 → no autocorr | 5.94 → no autocorr |
| Dickey-Fuller tau | −3.52 → "stationary @1%" | −2.47 → "non-stationary" |

- **No significant autocorrelation** at any lag, on either run. Yesterday's sentiment does **not** inform today's — the series behaves like noise around a positive mean.
- **The ADF result flips** (stationary → non-stationary) just by dropping thin days. That fragility is the signature of too-small N; the "stationary @1%" in the default run is **not trustworthy**.

### 6.3 H3b — does sentiment predict / move with the Nifty?

| Test | Default | min-headlines=20 |
|---|---|---|
| Predictive sent_T → return_T+1 | n=15, corr **+0.210**, t=0.78, p=0.44 | n=9, corr −0.078, t=−0.21, p=0.84 |
| Contemporaneous sent_T vs return_T | n=12, corr **+0.563**, t=2.15, **p=0.031 \*\*** | n=9, corr **+0.560**, t=1.79, p=0.074 \* |

- **Predictive (next-day): not significant**, and the sign isn't even stable across runs (+0.21 → −0.08). No evidence sentiment leads.
- **Contemporaneous (same-day): the same ~+0.56 correlation appears in both runs** and is significant in the default. Sentiment moves *with* the market on the same day.

---

## 7. Interpretation

1. **The recurring theme — coincident, not leading.** This is now the third experiment pointing the same way:
   - Exp 1: FII flow is contemporaneous with the index, not predictive.
   - Exp 3: news sentiment is contemporaneous (~+0.56 same-day, stable across runs), not predictive next-day.
   SachNetra's signals so far **describe** the market in real time; none has yet been shown to **lead** it. That is the single most important pattern in the research to date.

2. **Sentiment is not (yet) ARIMA-friendly in the useful sense.** No day-to-day autocorrelation (AR(1) ≈ 0, Ljung-Box can't reject white noise). At this N, sentiment looks like noise around a positive mean — there's no "memory" for an AR model to exploit. (This may change with more data, or sentiment may genuinely be near-memoryless day-to-day.)

3. **Everything here is underpowered.** N=12–16. The one "significant" result (same-day corr) rests on 12 points and a normal-approximated p — provisional at best. Do not trade or pitch on it.

4. **Verdict: ⬜ inconclusive, data too young.** Same status as Exp 2, different cause: here the *series length* (16 days) is the limit, not the universe. The method is validated and a baseline is set.

---

## 8. Notable secondary finding — sentiment positivity bias

14 of 16 daily means are positive; series mean +0.21. Possible causes, worth investigating before sentiment is used as a feature:
- the FinBERT / sentiment-chain model may skew positive on Indian financial headlines;
- the market-moving filter may select upbeat corporate news;
- May 2026 may simply have been a positive news month.
**Action:** before sentiment becomes a model input, check whether the scorer is calibrated (e.g. distribution of raw scores, a labelled spot-check). A signal that's positive 88% of the time has little discriminating power as-is.

> **📌 Reconcile addendum (2026-06-08, from [[exp20_brief]] §1.1).** The "88%" here is **14 of 16 daily-mean
> values being positive** (87.5%) over **16 days in May 2026** — a day-level, tiny-N, single-month statistic.
> It is **not** a row-level claim that 88% of *headlines* score positive, and it has been **widely mis-cited
> that way** (incl. the original Exp20 brief premise). The Exp20-A1 read-only diagnosis
> (`check-sentiment-calibration.mjs`, n=2,784 labelled rows of 65,985) found the **row-level split is pos
> 35.2% · neu 37.8% · neg 27.0%** — a *mild*, model-driven lean, **not 88%**. The May-2026 daily-mean
> positivity was real but reflected a positive news month + thin early days, not a scorer that calls 88% of
> items positive. **Use the row-level figure (≈35% positive) when citing the bias.** The discriminating-power
> concern still stands but is much smaller than this section implied: A1 found ample score dispersion
> (sd≈0.77) for a cross-sectional rank.

---

## 9. Caveats & limitations

- **N=16 daily points** — below any threshold for ADF/ARIMA/forecasting. Dominant limitation.
- **Thin early days** (3–8 headlines) make some daily means near-meaningless; the `--min-headlines` runs show results flip when they're dropped.
- **Pipeline ramp confound:** scoring volume jumped ~10× around 2026-05-17, so the series mixes two regimes (sparse manual-ish era + dense autonomous era).
- **Index-level sentiment vs index return** — aggregate market sentiment vs Nifty; no per-ticker sentiment→stock test yet (entity_sentiment / nse_tickers exist for that later).
- **p-values normal-approximated**; with n≈12 the true t-distribution tails are fatter, so the same-day "p=0.031" is optimistic.
- **Sentiment coverage ~5%** of headlines (the scored/market-moving subset) — not the full news flow.

---

## 10. Action items

| Need | Why | Owner |
|---|---|---|
| **Let sentiment accumulate ~2–3 months** | 16 → 60–90 daily points makes ADF/ARIMA/forecast real. Re-run Exp 3 monthly. | time + collector running |
| ~~**Calibration check on the sentiment scorer**~~ ✅ DONE 2026-06-08 ([[exp20_brief]] §1.1) | "88% positive days" was a 16-day daily-mean stat; row-level is ~35% positive, mild, well-dispersed → G6 not the ensemble blocker | Exp20-A1 |
| **Later: per-ticker sentiment → stock returns** | aggregate index-level test is coarse; entity-level is where alpha would be | future Exp (uses `entity_sentiment`/`nse_tickers`) |

---

## 11. Outputs & artifacts
- **Hypothesis Register** (`[[sachnetra_research_playbook]]`): rows **H3a, H3b** logged 2026-05-22.
- **Code:** `scripts/research/exp3-sentiment-timeseries.mjs` (read-only).
- **Reused data:** `research_prices` (^NSEI), `india_news_signals`.

---

## 12. Reproducibility
Deterministic given the DB snapshot; the series **grows daily**, so re-running later samples more days (the intended use — repeat monthly). Re-run: the two commands in §5. Flags: `--min-headlines=N`, `--market-moving-only`, `--index=`.

---

## 13. Cross-experiment summary (state after Exp 1–3)

| Exp | Signal | Verdict | Leading? |
|---|---|---|---|
| 1 | FII daily flow | ❌ no next-day prediction | coincident only |
| 2 | NSE announcements | ⬜ inconclusive (1 mo data) | same-day pop seen; post-drift unproven |
| 3 | News sentiment | ⬜ inconclusive (16 days) | coincident (~0.56 same-day), not leading |

**The honest state of the research:** every signal examined so far is **coincident with** market moves, and the two most promising leading-signal candidates (announcements, sentiment) are **not yet testable because the data is too young**. The strategic implication is consistent across Exp 2 and Exp 3 — *the database genuinely is the asset; the proof requires letting the collectors run for months.* The most valuable thing Lijo can do for the quant thesis right now is keep the pipeline alive and re-run these experiments on a monthly cadence.

---

## Changelog
| Date | Change |
|---|---|
| 2026-05-22 | Initial complete write-up. Both runs, full ACF/ADF/Ljung-Box/AR(1)/H3b numbers, the coincident-not-leading cross-experiment theme, the sentiment positivity-bias finding, caveats, action items. Run autonomously. |
| 2026-06-08 | Added §8 reconcile addendum: the "88% positive" was a 16-day daily-mean stat, not row-level; Exp20-A1 measured the true row-level split (≈35% positive, mild). Closed the §10 calibration-check action item. |
