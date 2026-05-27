---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=wB8Gw06EI3I
source_type: video
duration: ~31m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, ARIMA, differencing, backshift, nabla, seasonal, non-stationarity, integration]
status: distilled
---

# Ep 12 — Differencing Operators and ARIMA Defined

> **Why Lijo watched this**: The "I" in ARIMA finally explained. Differencing is the surgery that converts non-stationary data into something you can model. This lecture makes ARIMA a complete concept.

---

## ⏱ Worth watching? SKIM

Jump to 20:28 ("let's shift attention to seasonal models") and watch through 31:00. That 10-minute segment covers seasonal differencing and the formal ARIMA definition with a worked example — directly applicable to SachNetra. The earlier sections on linear/quadratic trend differencing are derivable from the rules table below.

---

## What this episode is actually about (ELI12)

This lecture answers the hanging question from Ep 08: **what does the "I" in ARIMA mean?** Answer: differencing. And differencing is the tool that converts non-stationary data into something that can be modelled.

---

## Two operators — one idea

### Backshift operator (B)

Just a shorthand for "look one step in the past."

- `B·YT = YT-1`
- `B²·YT = YT-2`
- `Bᵈ·YT = YT-d`

That's it. It's notation to make the maths cleaner, not a new concept.

### Differencing operator (∇, "nabla")

Take today's value minus yesterday's.

- `∇YT = YT - YT-1` (first difference)
- `∇²YT = ∇(∇YT)` (second difference = first difference of first difference)
- Relationship: `∇ = (1 - B)` so `∇YT = (1 - B)YT = YT - YT-1`

**The rule — how many times to difference:**

| Trend type | Differences needed |
|---|---|
| Linear (`a + bT`) | 1 |
| Quadratic (`a + bT²`) | 2 |
| Cubic (`a + bT³`) | 3 |
| Polynomial of order K | K |

In practice: most financial/economic time series need d = 1. Almost never d > 2. If you're differencing 3+ times, reconsider your data.

---

## Random walk decoded

`YT = YT-1 + εT` is just AR(1) with φ1 = 1.

AR(1) is stationary only when |φ1| < 1. Since φ1 = 1 exactly, the random walk is non-stationary.

**One difference fixes it:**
`∇YT = YT - YT-1 = εT` → pure white noise → stationary ✅

This is why you work with daily **returns** (price changes) not price **levels** when analysing stocks:
- Log prices follow a random walk → non-stationary
- Returns = ∇(log prices) → stationary (approximately white noise + some AR/MA structure)

**SachNetra already does this correctly** — abnormal returns are a differenced transformation of the underlying price series. The experiment design implicitly applied d = 1.

---

## Seasonal differencing (new and important)

For seasonal data, use **lag-D difference** (not repeated first-differencing):

`∇_D·YT = YT - YT-D`

- Monthly temperature: D = 12 (June this year minus June last year)
- Quarterly filings: D = 4 (Q1 this year minus Q1 last year)
- Weekly data: D = 52 (this week minus same week last year)

**What it does:** Removes seasonality of period D by subtracting the observation from exactly one full cycle ago. The seasonal effect cancels out.

### Critical notation distinction — don't confuse these

| Notation | Name | Purpose |
|---|---|---|
| `∇ᵈ` (superscript d) | d-th order differencing | Removes **trend** |
| `∇_D` (subscript D) | Lag-D difference | Removes **seasonality of period D** |

For a series with both trend AND seasonality, you apply both: first `∇_D` (remove seasonality), then `∇` (remove remaining trend).

---

## ARIMA(p, d, q) — the complete definition

> **YT follows ARIMA(p, d, q) if applying d differences to YT produces a stationary ARMA(p, q) process.**

The three parameters:
- **p** = AR order — how many past values in the autoregressive component
- **d** = integration order — how many times you difference to achieve stationarity
- **q** = MA order — how many past errors in the moving average component

The "I" = **Integrated**. Differencing is the reverse of integration (cumulative summing). If differencing d times produces a stationary series, the original is said to be "integrated of order d."

### Worked example (from the lecture)

Start with YT. Difference twice (`∇²YT`). The result is stationary ARMA(2,1).
→ YT follows **ARIMA(2, 2, 1)**.

- AR order p = 2 (from ARMA(2,1))
- Differencing d = 2 (differenced twice)
- MA order q = 1 (from ARMA(2,1))

---

## The Box-Jenkins methodology (introduced here)

The professor names Box and Jenkins as the originators of the differencing idea. The Box-Jenkins workflow is:

1. **Identify**: Plot data. Plot ACF and PACF. Determine if differencing is needed (non-stationary?). Pick p, d, q.
2. **Estimate**: Fit the ARIMA(p,d,q) model. Estimate coefficients.
3. **Diagnose**: Check residuals. Plot ACF of residuals — should look like white noise.
4. **Forecast**: Use fitted model to forecast.

This 4-step loop is the standard applied time series analysis workflow. Everything in the course so far is preparation for step 1.

---

## Preview: Seasonal ARIMA (SARIMA)

The lecture previews the next topic: if you have both trend and seasonality, you need seasonal ARIMA (SARIMA). The notation:

`SARIMA(p, d, q)(P, D, Q)[s]`

- Lower case (p, d, q) = non-seasonal AR/I/MA orders
- Upper case (P, D, Q) = seasonal AR/I/MA orders
- [s] = seasonal period (12 for monthly, 4 for quarterly, 52 for weekly)

The seasonal part handles the lag-D differencing and seasonal AR/MA terms. This is the model that handles real-world economic data with both trend and quarterly/annual cycles.

---

## So what for SachNetra?

**Two direct applications:**

**1. Filing volume time series:**
NSE filing counts per month have both trend (growing over years) and seasonality (peaks in quarterly result months). Correct approach:
- Apply lag-12 difference (∇_12) to remove the quarterly/annual seasonality
- Apply ∇ once to remove any remaining trend
- Then fit ARIMA on the double-differenced series
This is the proper decomposition before any experiment using filing counts as a base rate.

**2. The ARIMA(p,d,q) for event study returns:**
Post-event abnormal returns are already stationary (d = 0 expected, since we're looking at returns not levels). If ACF/PACF from Ep 10 shows AR or MA structure in those returns:
- d = 0 (returns don't need differencing)
- p and q from ACF/PACF shapes (Ep 10 table)
- → ARIMA(p, 0, q) or equivalently ARMA(p, q)

**The key question**: do post-filing abnormal returns show persistent AR structure (market drift), MA structure (shock absorption), or white noise (EMH)? The ARIMA d parameter confirms the stationarity assumption about returns.

---

## Open questions

- SARIMA is next. NSE quarterly result seasons create D = 4 or D = 12 seasonality depending on data frequency. Worth knowing the SARIMA notation before designing any experiment on filing frequency.
- How do you choose d in practice? You plot the data and run a unit root test (ADF test — Augmented Dickey-Fuller). The ADF test is the formal hypothesis test for "is this series non-stationary?" Almost certainly covered in the next 2 episodes.
- Python's `statsmodels.tsa.arima.model.ARIMA` takes (p, d, q) directly. The d parameter handles the differencing automatically inside the model — you don't need to manually difference first.
