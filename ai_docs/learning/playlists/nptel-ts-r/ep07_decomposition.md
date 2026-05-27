---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=JbJjislNHFY&list=PLOzRYVm0a65e8s29NCmih-Aww81ax0A0H&index=8
source_type: video
duration: ~28m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, decomposition, trend, seasonality, cyclicality, residual]
status: distilled
---

# Ep 07 — Time Series Decomposition

> **Why Lijo watched this**: Learn to surgically separate trend, seasonality, and noise from each other — the diagnostic step before any modelling.

---

## ⏱ Worth watching? SKIM

Jump to 12:29 (the Nottingham Castle decomposition graph) and watch through 15:50. That 3-minute stretch shows the decomposition visually — raw data, then each layer peeled back one by one. The rest of the lecture is definitions and examples you can read below in 3 minutes.

---

## What this episode is actually about (ELI12)

Every time series is like a song with four instruments playing simultaneously. Decomposition separates them so you can hear each one clearly.

**The four instruments:**

🔼 **Trend (TT)** — the bass line. Slow, long-term direction. Either going up or going down over years. No calendar effects, no random noise. Just the overall drift.
*Example: India's population always growing. A declining newspaper's circulation over a decade.*

📅 **Seasonality (ST)** — the melody that repeats. Regular, predictable, calendar-linked. Completes its cycle in **≤ 1 year**.
*Example: temperature peaks every June, dips every December. Same pattern year after year, like clockwork.*

🌊 **Cyclicality (CT)** — the slow wave. Like seasonality, but the cycle takes **> 2 years** and repetitions aren't perfectly regular — peaks aren't the same height, troughs aren't the same depth.
*Example: a business cycle. Boom → bust → boom → bust. But the boom doesn't happen on a fixed interval — sometimes 2 years, sometimes 4.*

🎲 **Random/Irregular (IT)** — the crowd noise. What's left after removing the other three. Completely unpredictable. No pattern. This is what you're trying to model if your data has no trend or seasonality.

---

## The critical distinction: Seasonality vs Cyclicality

| | Seasonality | Cyclicality |
|---|---|---|
| Period | ≤ 1 year | > 2 years |
| Regularity | Clockwork — same interval, same intensity | Approximate — similar pattern, irregular timing and height |
| Example | Monthly temperature | Business cycle, lynx population |

The professor's lynx example: the number of wild cats trapped annually in Northwest Canada shows clear boom/bust cycles — but the peaks are different heights and the intervals aren't equal. That's cyclicality, not seasonality.

---

## Complex seasonality (relevant for SachNetra)

Not all seasonality is perfectly regular. The professor introduces **complex seasonality**:

- **Salary-driven spending**: people spend more in week 1 of the month (just got paid), less in week 4. Pattern exists, but the exact amount varies by month.
- **Variable trading days**: October has more public holidays than July in India → market data has irregular rhythms even within a "monthly" pattern.

**This is directly relevant to SachNetra.** NSE corporate filings cluster around quarterly result seasons (April, July, October, January) — that's a seasonal pattern. But the exact number of filings per month varies. That's complex seasonality. Any model that ignores this will pick up the filing volume spike as a signal when it's just a calendar effect.

---

## The decomposition in action — Nottingham Castle temperature data

The professor decomposes 20 years of monthly UK temperature readings:

| Layer | What you see | What it tells you |
|---|---|---|
| Raw data | Wiggly — peaks every summer, dips every winter | The full mixed signal |
| Seasonality extracted | Clean repeating wave, period = 1 year | The calendar effect |
| Trend extracted | Nearly flat line | Temperature didn't drift up or down over 20 years |
| Remainder (residual) | Random jagged noise | What's left — unpredictable fluctuation |

**Key insight**: decomposition tells you which component dominates, which tells you what kind of model to use.

| Dominant component | Model direction |
|---|---|
| Trend | Fit a trend model first, then model residuals |
| Seasonality | Use seasonal models (SARIMA, ETS) |
| Cyclicality | Long-memory models or regime-switching |
| Random | Standard ARIMA or pure noise model |

---

## Trend is change in the mean level

One sentence worth locking in: **trend is nothing but a change in the average level of the series over time.** If you divide the series into chunks and the average keeps shifting — up or down — that's a trend. This is exactly the visual intuition for why trending data fails the stationarity test (mean isn't constant).

---

## So what for SachNetra?

**The decomposition frame is immediately applicable:**

NSE filing data almost certainly has:
- ✅ **Trend**: filing volumes have grown since digital mandates (~2015–2018). Raw filing counts are non-stationary.
- ✅ **Seasonal**: filings cluster into quarterly result seasons (4 peaks/year).
- ❓ **Cyclical**: possibly tied to broader market cycles (more discretionary filings in bull markets?). Not tested.
- ✅ **Residual**: the individual filing events themselves are the signal we're hunting in.

**Practical implication**: before any experiment on filing frequency or event density, decompose the filing count time series first. Remove trend and seasonality. Then test hypotheses on the residual. Otherwise you're testing calendar effects, not news effects.

**Experiments**:
- Potential diagnostic: decompose monthly NSE filing count time series. Confirm trend + seasonal pattern. Document dominant component. This is pre-experiment housekeeping, not a full experiment.

**Verdict**: **Park** — the decomposition mental model is immediately useful as a diagnostic frame, but no new experiment warranted yet. Gate: apply this diagnostic when designing the next data-collection experiment (V2-031 area).

---

## Open questions

- Does the SachNetra event database have enough time depth (years of data) to see cyclicality, or only trend + seasonality?
- The professor mentions decomposition is done before modelling. In our GARCH experiments (Exp 7/9), did we decompose first or go straight to modelling? If the latter, is that a gap?
- Next lecture (Ep 08) covers basic time series models — MA, AR, random walk. That's where ARIMA vocabulary starts. High priority.
