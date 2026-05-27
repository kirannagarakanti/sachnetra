---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=JbJjislNHFY&list=PLOzRYVm0a65e8s29NCmih-Aww81ax0A0H&index=10
source_type: video
duration: ~28m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, ACF, MA, AR, model-identification, exponential-decay, cutoff]
status: distilled
---

# Ep 10 — ACF Shapes for AR and MA Processes

> **Why Lijo watched this**: Learn to visually recognise AR vs MA in an ACF plot — the pattern you look for before fitting any ARIMA model.

---

## ⏱ Worth watching? SKIP

The entire lecture is mathematical derivation. The results (the ACF shapes) are all that matter — and they're summarised below in one visual table. Skip to Ep 11 for model identification in practice.

---

## What this episode is actually about (ELI12)

Two model families. Two completely different ACF graph shapes. Learn to tell them apart and you can identify your model just by looking at a graph.

---

## AR(1) ACF — the exponential decay

**Formula**: `ρ(K) = φ1^K`

If φ1 = 0.6, the ACF values at lags 1, 2, 3, 4... are: 0.60, 0.36, 0.22, 0.13...

The bars keep shrinking but **never reach zero**. The effect of the past decays exponentially but leaves a permanent (if tiny) trace at every lag. **Visually: a slow fade that tails off but never cuts off.**

If φ1 is negative (e.g., -0.6), the ACF alternates sign: -0.6, +0.36, -0.22, ... — still decaying, but oscillating above and below zero. Still "tailing off."

---

## MA(1) ACF — the sharp cutoff

**Formula**:
- `ρ(1) = θ1 / (1 + θ1²)` — a single value between -0.5 and +0.5
- `ρ(K) = 0` for all K > 1 — **exactly zero**

The graph: one spike at lag 1, then a flat line at zero forever. Like hitting a wall.

**Why?** An MA(1) series is `YT = εT + θ1·εT-1`. Today depends only on today's and yesterday's noise. Two days ago? Completely irrelevant. The shock is fully absorbed after exactly 1 period. Hence zero correlation beyond lag 1.

---

## MA(2) ACF — two spikes then flat

Extends naturally: `YT = εT + θ1·εT-1 + θ2·εT-2`

- `ρ(1) ≠ 0` — lag 1 non-zero
- `ρ(2) ≠ 0` — lag 2 non-zero  
- `ρ(K) = 0` for all K > 2 — exactly zero

Two spikes, then flat.

---

## The general rule — MA(q) ACF

> **MA(q) ACF = exactly q non-zero spikes, then perfectly flat at zero.**

The cutoff lag IS the MA order. Count the significant bars before the graph goes flat → that's q.

---

## The master pattern table

| Model | ACF shape | PACF shape |
|---|---|---|
| **MA(q)** | Cuts off sharply after lag **q** | Tails off gradually |
| **AR(p)** | Tails off gradually (exponential/oscillating decay) | Cuts off sharply after lag **p** |
| **ARMA(p,q)** | Tails off gradually | Tails off gradually |
| **White Noise** | Flat (all zeros except lag 0) | Flat |

This table (combined with Ep 09) is the complete model-identification toolkit. **ACF tells you q; PACF tells you p.**

---

## The derived formulas (for reference, not memorisation)

**AR(1)**:
- Mean: `μ = c / (1 - φ1)`
- Variance: `σ²Y = σ²ε / (1 - φ1²)`
- ACF: `ρ(K) = φ1^K`

**MA(1)**:
- Mean: `μ = c`
- Variance: `σ²Y = σ²ε · (1 + θ1²)`
- ACF at lag 1: `ρ(1) = θ1 / (1 + θ1²)`, zero elsewhere

**MA(2)**:
- Variance: `σ²Y = σ²ε · (1 + θ1² + θ2²)`
- ACF at lag 1: `ρ(1) = (θ1 + θ1·θ2) / (1 + θ1² + θ2²)`
- ACF at lag 2: `ρ(2) = θ2 / (1 + θ1² + θ2²)`
- ACF at lag K > 2: exactly zero

---

## The key insight for reading ACF plots in practice

When you open `statsmodels.graphics.tsaplots.plot_acf()` on your data:

1. **Does it tail off slowly?** → AR process. Look at PACF to count p (where PACF cuts off).
2. **Does it cut off sharply?** → MA process. Count the significant bars before the flat. That's q.
3. **Both tail off?** → ARMA. Need both ACF and PACF + AIC/BIC to pick exact orders.
4. **Flat from the start?** → White noise. Nothing to model.

The "significant" threshold: bars within the shaded confidence band (typically ±1.96/√n) are indistinguishable from zero. Only bars outside the band count.

---

## So what for SachNetra?

**If we plot ACF on post-filing abnormal returns:**

- **Tail-off pattern** → the market reaction has AR structure → there's momentum → multi-day event windows are justified
- **Sharp cutoff at lag 1 or 2** → MA structure → the event shock is absorbed quickly → 1-day window is better
- **Flat** → returns are white noise → no detectable signal from filings (null hypothesis of EMH holds)

The shape of the ACF on our event study returns data is the empirical answer to the question: "how long does the market take to price in a filing event?"

**Next step when designing the next experiment**: include an ACF/PACF diagnostic plot as a standard output. This is a 3-line addition to any returns analysis notebook.

---

## Open questions

- Next lecture (Ep 11) shows the model identification from ACF/PACF plots for ar2 and ma2 visually — that's the "reading the graph" skill in action. Worth skimming.
- Is there an existing SachNetra notebook that computes post-event returns? If so, `plot_acf()` can be added in minutes.
- The professor says "for all lags strictly above q, ACF is exactly zero for MA(q)." In real data, these lags won't be exactly zero due to sampling noise — they'll be small but non-zero. The confidence band is what tells you whether they're "effectively zero."
