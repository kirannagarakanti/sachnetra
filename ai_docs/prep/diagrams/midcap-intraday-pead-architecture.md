---
tags: [diagram, v2-feature-design, PEAD, intraday, latency, exp17, exp18, midcap]
source: [[generate_diagram]], [[Exp16]], [[2026-06-05_earnings-announcement-data-sourcing]]
authored_date: 2026-06-05
purpose: V2 feature-design diagram for the (B) intraday latency-capture bet — how we gather minute data, what company data, how we execute, and the gate sequence. Built per ai_docs/dev_templates/generate_diagram.md (Step 1 type = "V2 feature design").
status: DESIGN — gated. Gate 0 (Exp17) not yet run; nothing built downstream.
---

# Mid-Cap Intraday PEAD ("B" — latency capture) — Architecture

> Diagram of the **planned** pipeline for bet (B): capture the intraday drift after a results
> filing on under-covered midcaps. Real table/script names where they exist today; `NEW` marks
> what a green-lit gate would add. **Nothing past Gate 0 is built** — each stage is gated on the
> previous one paying off (Exp16 discipline: don't build a collector for a leg until a pilot says
> we need it).

## What data, from where (answers: minute data? company data?)

| Data | Source | State | Used by |
|---|---|---|---|
| Filing event + `announced_at` (minute) + category | NSE corporate-announcements API | HAVE (`india_bourse_announcements`, 2024-05→) | all gates |
| Daily OHLCV | research_prices (Yahoo backfill) | HAVE (2009→) | Gate 0 |
| **Minute OHLCV** | Broker hist. API (Angel SmartAPI free / Dhan / Kite ₹) | **NEW — `research_intraday_prices`**, event-window days only (~2yr ⇒ cheap) | Gate 1+ |
| **Quarterly EPS/PAT** (for SUE selection) | NSE **XBRL** filings (`has_xbrl=true`, 54%) | **NEW — `research_fundamentals`**, no OCR | selection (optional) |

Universe = liquid half of Nifty Midcap-150 (Amihud-liquid ~75). We backfill minute bars **only for
event-window dates**, not the whole universe continuously — and announcements only span 2024-05→, so
~2 years of intraday history (which free broker APIs cover) is enough.

## Diagram 1 — Data gathering + research gates (Gate 0 → Gate 1)

```mermaid
graph TD
    NSEann["NSE corporate-announcements API\n(public — every desk sees each filing at once)"]
    Broker["Broker historical API\n(Angel SmartAPI / Dhan / Kite)\n1-min OHLCV"]
    XBRL["NSE XBRL filings\n(has_xbrl=true, 54% of results)\nactual EPS / PAT"]

    Seed["seed-india-announcements.mjs\nhourly cron — FIX (dead since ~2026-05-30)"]
    Ann[("india_bourse_announcements\nfiling + announced_at(min) + category — HAVE")]
    Daily[("research_prices\nDAILY OHLCV — HAVE")]
    Intra[("research_intraday_prices\nMINUTE OHLCV — NEW (event windows only)")]
    Fund[("research_fundamentals\nquarterly EPS — NEW (optional, SUE)")]

    Exp17["Exp17 — GATE 0 (free, read-only)\ntiming split + day-0 reaction vs cost"]
    Exp18["Exp18 — GATE 1\npost-filing INTRADAY drift\n(minute, event windows)"]

    NSEann --> Seed --> Ann
    Broker --> Intra
    XBRL --> Fund

    Ann -->|"results events"| Exp17
    Daily -->|"EAR, 50-DMA, benchmark"| Exp17
    Exp17 -->|"GREEN: intraday reaction tail > cost"| Exp18
    Exp17 -.->|"RED: clusters below cost"| Kill["KILL (B) — squeeze wins"]

    Ann -->|"filing minute τ"| Exp18
    Intra -->|"minute bars T0,T+1"| Exp18
    Fund -.->|"SUE rank (optional)"| Exp18
    Exp18 -->|"persistent, cost-clearing"| Gate2["GATE 2 — go live"]
```

## Diagram 2 — Live execution (Gate 2 — only if Gate 1 proves it)

```mermaid
sequenceDiagram
    participant Poll as Real-time poller (~30s, market hours)
    participant NSE as NSE announcements API
    participant Sig as Signal engine
    participant Book as Position book
    participant Brk as Broker order API

    Poll->>NSE: poll /corporate-announcements
    NSE-->>Poll: new results filing (symbol, τ)
    Poll->>Sig: results? · liquid (Amihud)? · top EAR/SUE rank? · above 50-DMA?
    alt passes filter
        Sig->>Brk: BUY @ market, size <= k% of ADV
        Brk-->>Book: filled @ P_entry
        Book->>Book: hold to rule (intraday close, or T+H)
        Book->>Brk: SELL (exit)
        Brk-->>Book: realised P&L − cost(100-250 bps)
    else reject
        Sig-->>Poll: skip (after-hours gap · illiquid · move < cost)
    end
```

## Formulas (carried on the arrows above)

```
Abnormal return:         AR = r_stock − r_benchmark
(B) intraday drift:      (P_close(T0) − P_τ)/P_τ − bench   ; τ = filing minute, measured AFTER first pop
Time-series SUE:         Expected_EPS_q = EPS_(q−4) + mean(EPS_q − EPS_(q−4))
                         SUE = (Actual_EPS_q − Expected_EPS_q) / σ(past surprises)
Tradability:             NetCAR = grossCAR − cost(100–250 bps) ;  position ≤ k%·ADV
Gates (= Exp16):         NetCAR>0 @250bps · DSR≥0.95 · Theil U<1 · ADF p<.05 & KPSS ok
```

## The honest constraints (why every stage is gated)
- **Public feed:** NSE's API is seen by all desks at once → (B) is NOT "be first to the move"; it's
  "does intraday drift persist after the fast money's pop?" (intraday PEAD). Gate 1 tests exactly that.
- **The squeeze (Exp10):** long lead ⇒ small move. Gate 0 checks whether the reaction even clears cost
  before we spend on minute data.
- **Only ~1/3 of filings are intraday** (33.2% in 09:15–15:30; 66% file after-close = un-raceable gap).
- **Fix the cron first** — a live (B) needs a real-time feed; right now the hourly one is dead.
```
