---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=iWV1gq_bxhU&list=PLOzRYVm0a65e8s29NCmih-Aww81ax0A0H&index=4
source_type: video
duration: ~28m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, stationarity, weak-stationarity, heteroscedasticity, garch, non-stationarity]
status: distilled
---

# Ep 05 — Weak Stationarity & Non-Stationarity

> **Why Lijo watched this**: Understand weak stationarity (the practical version) and the three things that make a series non-stationary — directly relevant to GARCH and our volatility experiments.

---

## ⏱ Worth watching? SKIP

Everything useful is in this note. The lecture is mostly the professor checking four toy examples against the stationarity conditions — methodical but slow. The results (which series passes/fails) are summarised in the table below.

---

## What this episode is actually about (ELI12)

**Weak stationarity** is the practical version of stationarity that all real models use. Forget the full probability distribution. A series is weakly stationary if just three things are true:

1. **The average doesn't move.** Constant mean throughout — not trending up or down.
2. **The jumps don't grow or shrink.** Constant variance throughout — not getting wilder or calmer.
3. **How correlated today is with yesterday depends only on the GAP, not on when you are.** The relationship between day T and day T+1 is the same whether it's January or August. The "memory" of the series is consistent across time.

**From now on in this course, "stationary" = weakly stationary. Always. That's the default.**

---

## The four worked examples — which series passes the test?

| Series | Plain English | Mean constant? | Variance constant? | Stationary? |
|---|---|---|---|---|
| **YT = εT** | Pure random noise | ✅ Yes (always 0) | ✅ Yes (always σ²) | ✅ **YES** |
| **YT = εT + 0.5·εT-1** | This noise + half of last noise | ✅ Yes (0) | ✅ Yes (1.25σ²) | ✅ **YES** |
| **YT = ε₁+ε₂+...+εT** | Running total of noise | ✅ Yes (0) | ❌ Variance = **T·σ²** — grows with time | ❌ **NO** |
| **YT = a + bT + εT** | Straight trend line + noise | ❌ Mean = **a+bT** — moves with T | — | ❌ **NO** |

The third example is counterintuitive: the mean is zero (fine), but the variance keeps growing because you're accumulating more and more uncertainty as you add terms. This is called a **random walk** — and it's the default model for stock prices. Stock prices are NOT stationary.

The fourth example is the simplest non-stationary case: any series with a linear trend fails the mean test immediately.

---

## The three causes of non-stationarity (memorise these)

| Cause | Graph signature | Real example |
|---|---|---|
| **Trend** | Series slopes up or down overall | GDP, population, filing volume growth |
| **Seasonality** | Regular repeating bumps at fixed intervals | Delhi AQI every winter, quarterly sales |
| **Heteroscedasticity** | The swings get wider (or narrower) over time | Stock market — calm periods and volatile periods cluster |

**Heteroscedasticity is the direct bridge to GARCH.** When variance isn't constant but changes in a predictable pattern, you don't just log it as non-stationary and walk away — you model the variance itself. That's exactly what ARCH/GARCH does. This is the conceptual foundation for SachNetra Exp 7/9.

---

## Strong vs weak — the one-line summary

- If data is normally distributed → weak stationarity = strong stationarity (equivalent)
- In all other cases → they're different, and weak is what you use
- Practical rule: assume weak stationarity, move on

The professor's Cauchy distribution edge case (where strong doesn't imply weak) is an academic curiosity. Ignore it for SachNetra purposes.

---

## Key concept: the random walk

The third example (running sum of noise: YT = ε₁+ε₂+...+εT) is not just a toy example — it's the mathematical model underlying most financial price series. Stock prices are modelled as random walks. Random walks are non-stationary (variance grows with time). This is why you can't just throw raw price data into an ARIMA model — you have to difference it first (take daily returns instead of prices) to get a stationary series.

This has a direct SachNetra implication: if we're ever modelling price levels instead of price changes/returns, we're working with non-stationary data and need to transform it first.

---

## So what for SachNetra?

**Experiments**:
- The heteroscedasticity concept confirms the theoretical basis for Exp 7/9 (GARCH on volatility). If market reaction variance changes over time — which it does during earnings seasons, crises, etc. — GARCH is the right model family, not OLS.
- Potential check: verify that the raw NSE filing data time series is non-stationary before any modelling (it should be — upward trend in filing volume). This is a 5-minute diagnostic, not a full experiment.

**Verdict**: **Park** — theoretical foundation complete. The next actionable step is the GARCH weeks (6–10), not right now.

---

## Open questions

- The professor says stock prices follow a random walk (non-stationary). But abnormal *returns* around events (which is what SachNetra measures) should be stationary — is that assumption validated in our data?
- Heteroscedasticity = changing variance. In our data, does market volatility cluster around specific types of filings (earnings, board changes) more than others? Could that be a segmentation variable for the next experiment?
- Next lecture (Ep 06) is the R practical — **skip it**. The one after covers basic time series models (MA, AR). That's where the vocabulary for ARIMA starts.
