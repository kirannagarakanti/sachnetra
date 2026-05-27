---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=JbJjislNHFY&list=PLOzRYVm0a65e8s29NCmih-Aww81ax0A0H&index=8
source_type: video
duration: ~28m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, white-noise, random-walk, AR, MA, ARMA, building-blocks, arima-vocab]
status: distilled
---

# Ep 08 — Building Blocks: White Noise, Random Walk, AR, MA, ARMA

> **Why Lijo watched this**: The vocabulary for ARIMA. These four models are what ARIMA is built from. Understand these and the rest of the course is just extensions.

---

## ⏱ Worth watching? SKIP

This note covers everything. The lecture is methodical and slow — the professor spends 10+ minutes on white noise and random walk before reaching AR/MA. The cheat sheet at the bottom of this note captures the whole lecture in one table.

---

## Quick add-on from Ep 07: additive vs multiplicative decomposition

Before the models, the lecture closes out the decomposition topic with one distinction:

- **Additive decomposition**: Series = Trend + Seasonality + Cycle + Noise. Use when seasonal swings are roughly *constant in size* regardless of trend level. *"We sell 10,000 more units in November."*
- **Multiplicative decomposition**: Series = Trend × Seasonality × Cycle × Noise. Use when swings *grow proportionally* with the trend level. *"We sell 20% more in November."*

The international airline passenger data from Ep 03 is multiplicative — the seasonal peaks got taller as the overall trend rose. SachNetra event data is likely additive (a filing spike in April is roughly the same size whether the market is at 15k or 25k Nifty).

---

## The four building blocks of time series models

### 🎲 White Noise — the baseline

`YT = εT`

At every time point, you get a completely independent random number. No connection to the past. No pattern. Pure noise. This is the simplest possible time series — and also the target state for your *residuals* after fitting any model. If your model is good, what's left over (residuals) should look like white noise. If the residuals still have structure, your model is missing something.

**Named "white noise"** by analogy to white light: just as white light is a mix of all frequencies of the visible spectrum, white noise contains all frequencies equally — no single frequency dominates.

---

### 🚶 Random Walk — the drunkard's walk

`YT = YT-1 + εT` (equivalently: `YT = ε1 + ε2 + ... + εT`)

The current value = last value + a random shock. Each step depends only on where you were before, plus a random push in any direction. The drunkard doesn't remember where they started — they just step randomly from wherever they are now.

**Why this matters for SachNetra**:
- Stock prices follow a random walk. This is why you work with *daily returns* (YT - YT-1) not price levels — differencing transforms a random walk into white noise, which is stationary.
- The random walk is **non-stationary** (variance = T·σ², grows with time — proved in Ep 05).
- If our abnormal return calculations are correct, we're already implicitly de-trending the random walk by subtracting expected returns. Worth confirming.

---

### 📐 Linear Trend Process

`YT = a + b·T + εT`

A straight line through time plus noise. If b > 0, upward trend. If b < 0, downward trend. Non-stationary (mean depends on T). This is the simplest model to explain non-stationarity caused by trend.

---

### 🔁 AR(p) — Autoregressive Process

`YT = c + φ1·YT-1 + φ2·YT-2 + ... + φp·YT-p + εT`

**"I predict today using my own past values."**

Forecast the current value using the last *p* values of the same series. The *p* is how far back you look. Coefficients φ1...φp determine how much each past value matters.

- **AR(1)**: only yesterday matters → `YT = c + φ1·YT-1 + εT`
- **AR(2)**: yesterday and the day before → `YT = c + φ1·YT-1 + φ2·YT-2 + εT`

**Stationarity condition for AR(1)**: |φ1| < 1.
- If φ1 = 1 exactly → random walk (non-stationary)
- If φ1 > 1 → explodes (definitely non-stationary)
- If |φ1| < 1 → stationary ✅

AR(2) stationarity conditions are more complex (three simultaneous inequalities). Higher orders require software.

**Why "auto"?** Because you're regressing YT on its own past values — the same series at different time points. Auto = self. It's regression against yourself.

---

### 🎯 MA(q) — Moving Average Process

`YT = μ + εT + θ1·εT-1 + θ2·εT-2 + ... + θq·εT-q`

**"I predict today using my own past forecast errors."**

This is the subtle one. AR uses past *values*. MA uses past *mistakes* (the error residuals from previous time steps). If yesterday's random shock (surprise earnings, surprise weather) still has residual effect today, MA captures that carry-forward. The *q* is how many past errors you include.

**Intuition**: MA models "shock decay." A surprise today loses influence over q periods. After q steps, the system has fully absorbed the shock and returned to baseline.

Note: despite the name, this is NOT the same as a "moving average" you'd compute on a spreadsheet (rolling average of values). It's a moving average of *errors*.

---

### ⚙️ ARMA(p, q) — the workhorse

`YT = c + [AR terms: past p values] + [MA terms: past q errors] + εT`

Combines AR and MA into one model. Uses *p* past values AND *q* past errors simultaneously. This is the standard model before adding the "I" (integrated/differencing) step that makes it ARIMA.

---

## The one-line cheat sheet

| Model | Uses past... | Stationary? | Plain English |
|---|---|---|---|
| White Noise | Nothing | ✅ Always | Pure random, nothing to forecast |
| Random Walk | 1 past value (φ = 1) | ❌ Never | Drunk person walking; stock prices |
| Linear Trend | — | ❌ Never | Straight slope through time |
| AR(p) | p past *values* of Y | ✅ If \|φ\| < 1 | "Where I've been predicts where I'm going" |
| MA(q) | q past *errors* | ✅ Always | "My recent forecast mistakes still affect me" |
| ARMA(p,q) | Both values and errors | ✅ Depends on AR part | The full building-block model |

---

## So what for SachNetra?

**The AR vs MA distinction is the key conceptual question for our event studies:**

- If market reaction to a filing event follows an **AR pattern** → the magnitude of today's reaction predicts tomorrow's. Momentum. Multi-day drift.
- If market reaction follows a **MA pattern** → a surprise today gets absorbed over q days and disappears. Mean reversion. Shorter window needed.
- Which one dominates in NSE filing event data is testable — it's the ACF/PACF analysis flagged in Ep 04.

**Stationarity reminder**: AR(1) is stationary only if |φ1| < 1. When we fit AR models on our returns data in any experiment, this condition must be checked. If φ1 ≥ 1, the model is misspecified.

**Experiments**:
- No new experiment warranted yet. The AR vs MA question should be formulated as a diagnostic before the next returns-modelling experiment.

**Verdict**: **Park** — critical vocabulary now built. ARIMA is AR + I (differencing to achieve stationarity) + MA. The I step is what converts a random walk into a stationary series. Probably covered in the next 2 lectures.

---

## Open questions

- ARIMA adds "I" = integrated = differencing to handle non-stationarity. How many times do you difference? That's the "d" parameter. Should be in the next lecture.
- For our NSE event study data (abnormal returns), what order AR and MA would be appropriate? This is the model selection question — covered later in the course (AIC/BIC selection).
- Random walk is the null hypothesis for stock prices (efficient market hypothesis). SachNetra is testing whether filing events create *detectable deviations* from that random walk. Worth making that framing explicit in the experiment documentation.
