---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=oCXdqFuPi-M&list=PLOzRYVm0a65e8s29NCmih-Aww81ax0A0H&index=2
source_type: video
duration: ~27m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, trend, seasonality, noise, stationarity, examples]
status: distilled
---

# Ep 03 — Examples of Time Series Data (Reading Real Graphs)

> **Why Lijo watched this**: Learn to visually read a time series graph — spot trend, seasonality, and noise before touching any model.

---

## ⏱ Worth watching? SKIM

The graphs are the value here. If you can access the video, jump to 8:26 (CO2 graph) and watch through 25:00 — that stretch shows 5 real-world graphs with live commentary on how to read them. The rest (notation, long/short definitions) is fully covered by this note.

---

## What this episode is actually about (ELI12)

This lecture teaches you to read a time series graph the way a doctor reads an X-ray — not with math, just with your eyes.

Every time series graph has at most three things happening:

**🔼 Trend** — the overall direction. India's population always going up. Draw a straight line through the data and it slopes one way. Easy to spot.

**🔄 Seasonality** — repetitions at regular intervals. Delhi's air quality gets bad every winter, clears every summer, gets bad again next winter. Like clockwork. The bumps are evenly spaced.

**📶 Noise** — random jitter with no pattern. Goes up, down, up, down randomly with no structure. Static. You want to separate signal (trend + seasonality) from this noise.

The professor walks through 5 real graphs and reads each one out loud. That's the whole lecture.

---

## The 5 real graphs — what each one teaches

| Graph | Trend? | Seasonal? | Special lesson |
|---|---|---|---|
| **CO2 in atmosphere (1960–2020)** | ✅ Strong upward | ✅ Yes — wiggles within the trend | You can have BOTH at once |
| **Crude oil price** | ❌ No overall trend | ❌ No | Mini-trends exist in short stretches — doesn't mean the whole series trends |
| **India SGST revenue (2017–2020)** | ✅ Mild upward | ❌ Not clear | Even mild trends matter for forecasting |
| **Delhi Air Quality Index (2017–2020)** | ❌ No | ✅ Yes — spikes every winter | Seasonality without trend is common |
| **International airline passengers (1949–1960)** | ✅ Upward | ✅ Yes | **AND the peaks get taller over time** — variability is growing. Third thing to watch for. |

The airline data is the most important example. It has all three: trend + seasonality + growing variability. The professor calls this the classic non-stationary dataset.

---

## Key concepts introduced

- **H (gap between observations)** — the time between any two consecutive readings. Daily data → H = 1 day. You collect every other day → H = 2 days. Not worth memorising the notation; just know that "how often you sample" is a deliberate choice.

- **Sampling frequency (1/H)** — how many observations per time unit. Higher frequency = more data points = more noise too.

- **Noise** — random fluctuation with no pattern. Minute-by-minute sales data is mostly noise if you're trying to forecast tomorrow's total. Match your time scale to your actual question. Forecasting tomorrow's grocery sales? Use daily data, not minute-by-minute.

- **Long time series** — hundreds or thousands of data points. Daily stock prices over 5 years ≈ 1,250 points. Models work well here.

- **Short time series** — just a handful of points. India census (every 10 years since 1951) = ~7 points. Very hard to model reliably.

- **Non-stationary** — a series whose behaviour changes over time. If it has a trend, or growing variability, or seasonality → it's non-stationary. ~90% of real-world data is non-stationary. This matters because most standard models assume the data is stationary. You have to fix it first.

- **Stochastic process** — a fancy name for "a sequence of random values evolving over time." Time series IS a stochastic process. The goal is to model the hidden mechanism generating it.

---

## The two goals of time series (stated explicitly here)

1. **Explanatory** — understand the hidden pattern generating the data. What model describes it?
2. **Predictive** — forecast future values using past history.

SachNetra is primarily goal 2 (predictive) for experiments. Goal 1 matters when we're debugging why a signal did or didn't work.

---

## SachNetra relevance — what to carry forward

The "reading a graph before modelling" principle is directly applicable to our data:

- **NSE filing volume over time** → almost certainly non-stationary (growing trend as more companies file digitally). Any model we build needs to handle this.
- **Market reaction after events** → likely noisy. The question is whether there's a detectable signal inside the noise. That's what our experiments are testing.
- **Matching time scale to question** → we use 1-day and 5-day windows in our experiments. This lecture confirms that's the right instinct — don't use tick-level data to answer a daily-level question.

---

## So what for SachNetra?

- **Experiments**: None directly — but the "90% of real data is non-stationary" point is a reminder that any new experiment should check for stationarity before running a model on the data.
- **Verdict**: **Park** — foundational visual literacy. No new experiment warranted, but the framework (spot trend, seasonality, noise before modelling) should be our default first step on any new dataset.

---

## Open questions

- Is SachNetra's NSE filing volume data stationary when you look at it as a time series? (Hypothesis: no — there's a strong upward trend from 2017 onward as digital filing became mandatory.)
- The professor mentions "variability increasing with time" as a separate non-stationarity signal. Does our event-to-price-reaction data show increasing variance in recent years vs earlier years?
- Next lecture covers stationarity formally — that's where the vocabulary to answer these questions gets defined.
