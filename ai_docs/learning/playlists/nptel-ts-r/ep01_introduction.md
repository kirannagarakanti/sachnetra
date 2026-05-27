---
date: 2026-05-26
source_url: https://www.youtube.com/watch?v=up4jWNmuwQI&list=PLOzRYVm0a65e8s29NCmih-Aww81ax0A0H&index=1
source_type: video
duration: ~6m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, statistics, forecasting, meta, course-overview]
status: distilled
---

# Ep 01 — Introduction (Course Overview)

> **Why Lijo watched this**: Exploratory — what does this 12-week course actually cover, and is it worth going deeper?

---

## ⏱ Worth watching? SKIP

This is pure housekeeping — the professor introduces himself and lists what the 12 weeks will cover. Zero new concepts. Zero graphs. You learned everything useful just by reading this note.

---

## What this episode is actually about (ELI12)

Imagine you're keeping a diary, but instead of writing words, you write one number every single day — like today's temperature, or today's Nifty closing price.

After a year, you have 365 numbers in a row. That list of numbers — in order, one per day — is called a **time series**.

This course teaches you three things about that list:
1. **Read it** — what's the pattern? Is it going up? Does it spike every December? Is it wild and jumpy?
2. **Model it** — build a small math machine that *describes* that pattern
3. **Forecast it** — use that machine to guess what tomorrow's number will be

The professor is a legit academic (PhD from UConn USA, 40+ papers). The course is 12 weeks, 60 lectures, and goes from beginner stuff all the way to advanced tools like GARCH (volatility modelling — directly relevant to SachNetra Exp 7/9).

Every week has a "hands-on R" lecture at the end. **Skip those** — they're just someone typing code in software we don't use.

---

## The roadmap for the series (in plain English)

| Weeks | What you'll learn | SachNetra relevance |
|---|---|---|
| 1–2 | What a time series is; stationarity | Foundation — need this to understand everything else |
| 3–4 | ARIMA, SARIMA models | Medium — we don't forecast prices, but good mental model |
| 5–6 | Forecasting methods, smoothing | Medium — how to measure if a forecast is actually good |
| 7–8 | Two series at once; causality; Fourier | Low for now |
| **6–10** | **GARCH — volatility modelling** | **HIGH — directly overlaps Exp 7/9** |
| 11 | Nonlinear models, regime switching | Low |
| 12 | ML in time series | Medium — see if anything beats our current baseline |

---

## So what for SachNetra?

- **Experiments**: Nothing from this episode alone.
- **Verdict**: **Park** — come back to the GARCH weeks (6–10) when designing the next volatility experiment. The rest of the series is "good to know" not "need to act on."

---

## Open questions

- Does the GARCH treatment here go deeper than what we tested in Exp 7/9, or is it the same family?
- Does the professor use actual Nifty data in the examples, or generic synthetic data?
