---
date: 2026-06-04
problem: The SUE-leg sourcing note said "test Indian API's free tier for mid-cap quarterly-EPS coverage." Probe it — confirm the endpoints exist, whether they give what a time-series SUE needs, and what's still unknown.
status: researched — endpoints CONFIRMED, free-tier coverage NEEDS SIGNUP
lane: Lijo (decide + signup) / James (build collector)
tags: [research-note, SUE, data-sourcing, indian-api, quarterly-eps, probe, exp17]
sources_consulted: [
  "indianapi.in/documentation/indian-stock-market — PAGE-VERIFIED 2026-06-04 (endpoint list)",
  "WebSearch: indianapi.in endpoints, API key, free tier",
  "GitHub 0xramm/Indian-Stock-Market-API — free Yahoo-backed alternative, no API key (search-summary)",
  "Internal: 2026-06-04_sue-leg-data-sourcing.md; ear-proxy-risk-for-exp16.md"
]
---

# Research: Indian API probe — can it feed a time-series SUE leg?

> Follows `sue-leg-data-sourcing.md` (which concluded a time-series SUE needs only free historical quarterly
> EPS). This probes the most promising programmatic source. I could verify the **docs/endpoints** but not
> the **free-tier limits** (those need a signup I shouldn't do autonomously). New note; edits nothing.

## What I confirmed (page-verified from the docs)
The endpoints a time-series **and** a consensus SUE would need **both exist**:
- **`/historical_stats?stats=quarter_results`** → quarterly financials including **"EPS in Rs" by quarter**.
  *This is exactly what a Bernard-Thomas seasonal-random-walk (time-series) SUE needs — no consensus required.*
- **`/stock_forecasts`** (measure = EPS, Actuals or Estimates) → **analyst consensus EPS**, for a consensus
  SUE if ever wanted.
- **`/stock_target_price`** → analyst recommendation history (1w/30/60/90d snapshots).
- Plus search, live/batch prices, corporate actions, balance sheets, cash flows, ratios, shareholding, and a
  `/usage` endpoint.
- **Auth**: all endpoints require an **API key via `X-API-Key` header.**

## What I could NOT verify (needs a signup — Lijo's call)
- **Whether a free tier exists and its request cap / rate limit** — the docs page documents none; the broader
  site is an "API marketplace" with paid options. Must register to see free-tier terms.
- **Mid/small-cap coverage & EPS history depth** — does `quarter_results` return ≥8–12 quarters for liquid
  Midcap-150 names (needed for a seasonal SUE)? Only an actual authenticated call confirms this.
- **Data quality** — restatements, tagging errors, point-in-time correctness (was the EPS as-reported on the
  date, or restated?). Critical: a time-series SUE on restated EPS leaks look-ahead.

## Fallbacks if the free tier is too limited
- **NSE/BSE XBRL** (authoritative, free, machine-readable since 2015) — parse quarterly EPS directly from the
  result filings we already bank (V2-018 `india_bourse_announcements`). More engineering, but no third-party
  dependency or rate cap, and point-in-time-correct (the filing IS the as-reported number).
- **GitHub 0xramm/Indian-Stock-Market-API** — free, no key, but **Yahoo-backed** → same source as our existing
  price pulls, limited/unreliable fundamentals for mid-caps. Low value.

## Verdict (gate-checked)
- **Recommendation: PARK (sequence after Exp16), with the data path now CONFIRMED.** The SUE leg is buildable:
  Indian API exposes quarterly EPS (`/historical_stats`) for time-series SUE, with XBRL as the
  authoritative fallback. **Next step is a 10-minute manual probe by Lijo**: sign up, hit
  `/historical_stats?stats=quarter_results` for ~5 liquid Midcap-150 names, check (a) free-tier cap, (b) #
  of quarters returned, (c) whether EPS looks point-in-time. That single test decides Indian-API-vs-XBRL.
- **Gate**: data tier ⚠️ (sourceable, not yet collected) · kill list ✅ · live consumer ✅ (SUE leg, post-
  Exp16, the leg the EAR-risk note says may carry the actual drift) · right denominator ✅.

## Open questions
1. Free-tier cap & EPS history depth for mid-caps (the 10-min signup probe).
2. Point-in-time correctness of the EPS (restatement risk) — XBRL filings are inherently PIT; third-party
   feeds may serve restated numbers.

---
*Reflection: the SUE data path is no longer hypothetical — the endpoints exist and quarterly EPS is
retrievable. The only gate left is a quick authenticated coverage check, which is Lijo's to run (signup).
Don't build the collector until Exp16 says we need the SUE leg AND the probe confirms free-tier coverage.*
