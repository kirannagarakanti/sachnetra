---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=VvjO0Tn2VxU&list=PLOzRYVm0a65e8s29NCmih-Aww81ax0A0H&index=3
source_type: video
duration: ~29m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, stationarity, autocorrelation, autocovariance, fundamentals]
status: distilled
---

# Ep 04 — Stationarity in Time Series

> **Why Lijo watched this**: Understand stationarity — the single most important assumption in all time series modelling.

---

## ⏱ Worth watching? SKIP

The ELI12 below captures everything. The lecture is heavy on mathematical notation for the first 15 minutes (deriving variance and autocovariance formulas) — none of that notation is needed to understand the concept. The concept itself is in this note.

---

## What this episode is actually about (ELI12)

Imagine you're a scientist trying to study a river. You want to build a model for how it behaves.

**The problem**: at any single moment in time, you only have ONE measurement of the river level. Just one. You can't repeat the experiment from the same starting conditions. So how do you ever get enough data to build a reliable model?

**The solution**: assume the river behaves the **same way regardless of when you look at it**. The rules governing the river don't change between January and July, between morning and evening. If that's true, you can treat your entire history of measurements as "multiple samples from the same stable process" — and suddenly you have enough data.

**That assumption is called stationarity.**

A stationary series = the series follows the same rules no matter when you look at it. Mean doesn't drift. Variance doesn't grow. Patterns don't shift.

A non-stationary series = the rules keep changing. India's population (always growing), Delhi AQI (different every season). You can't model these directly. You have to **transform them first** to remove the changing behaviour, then model the remainder.

This is why ~90% of real data being non-stationary (mentioned in Ep 03) is a problem — it means you almost always need a pre-processing step before fitting any model.

---

## Key concepts introduced

- **Mean function (μt)** — the average value of the series at time T. In a stationary series, this is constant (doesn't change with T).

- **Variance function (γ₀)** — how much the series jumps around. In a stationary series, this is also constant over time.

- **Autocovariance (γt,s)** — measures how much the value at time T moves together with the value at time S, *within the same series*. The "auto" prefix means: same series, two different time points (not two different series). High autocovariance = yesterday strongly predicts today.

- **Autocorrelation (ρt,s)** — same as autocovariance but scaled to a -1 to +1 range. Easier to interpret. +1 = perfectly predicts the next value. 0 = no predictive relationship. -1 = perfectly opposite.

- **Stationarity** — the core simplifying assumption. A series is stationary if its statistical properties (mean, variance, autocovariance) don't change over time. Visually: a flat, stable series that doesn't trend or grow.

- **Strong (strict) stationarity** — the strictest form. The *entire probability distribution* of the series doesn't change if you shift the time window by any amount K. Hard to verify in practice. Comes in orders:
  - 1st order: the distribution of a single time point doesn't change with a time shift
  - 2nd order: the *joint* distribution of any two time points doesn't change with a time shift
  - nth order: generalisation to n time points

- **Weak stationarity** — (coming in Ep 05) — a relaxed version. Only requires the mean and variance to be constant and autocovariance to depend only on the gap between time points, not their absolute position. This is what most real models actually use.

---

## Why autocovariance/autocorrelation matters for SachNetra

The autocorrelation function (ACF) measures: *how much does the value at time T predict the value at time T+1, T+2, T+3...?*

For SachNetra experiments:
- If autocorrelation of market reaction after filings is high → news impact carries forward multiple days. A multi-day window strategy could work.
- If autocorrelation is near zero → each filing event is effectively independent. No carry-forward. Single-day window is the right choice.

This is a testable question on existing SachNetra data. Not designed as an experiment yet.

---

## So what for SachNetra?

**Experiments**:
- Potential new experiment: measure ACF of abnormal returns around NSE filing events. Does the market reaction persist for 2–3 days or die out within 1 day? This would tell us whether our 1-day vs 5-day event windows are correctly sized.

**Verdict**: **Park** — the ACF experiment idea is interesting but needs to be designed properly. Gate: complete the stationarity lectures (Ep 04–06) first, then assess if this warrants a formal experiment.

---

## Open questions

- Weak stationarity (Ep 05) is what real models actually use — what are its exact conditions?
- Can our NSE filing volume time series be made stationary by simple differencing (removing the trend), or does it need something more complex?
- The professor mentions "inference is too complicated if moments change over time" — is this why our GARCH model in Exp 7/9 needed a stationarity check before fitting?
