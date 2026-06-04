---
date: 2026-06-04
problem: The EAR-proxy risk note showed the SUE leg is the one that actually carries PEAD drift — but we can't build it without earnings-surprise data. CAN we source that cheaply for Indian mid-caps, and which SUE flavour avoids paying for analyst consensus?
status: researched
lane: Lijo (decide) + James (build collector if pursued)
tags: [research-note, PEAD, SUE, data-sourcing, XBRL, fundamentals, exp17, consensus-estimates]
sources_consulted: [
  "Trendlyne Forecaster — consensus from 40+ brokerages; ₹2,090/yr base, StratQ ₹5,900/yr w/ Excel Connect (search-summary)",
  "Indian API (analyst.indianapi.in) — analyst consensus EPS/Rev/EBITDA + quarterly results/balance sheets, has a free tier (search-summary)",
  "Screener.in (₹4,999/yr) — 10y reported fundamentals, no consensus (search-summary)",
  "BSE/NSE XBRL — results filed machine-readable since 2015; free Excel utility; bulk programmatic access undocumented (search-summary)",
  "Bernard & Thomas (1989/1990) — classic PEAD used TIME-SERIES (seasonal-random-walk) SUE, not analyst consensus (established literature)",
  "Internal: ear-proxy-risk-for-exp16.md; exp16_brief.md; midcap-event-arbitrage-dossier.md"
]
---

# Research: Can we cheaply build a SUE leg for Indian mid-cap PEAD?

> The EAR-risk note flagged that the signal we CAN build (EAR) may reverse, while SUE — the leg a recent
> replication says actually drifts — needs data we don't have. This note asks: how cheaply can we get that
> data, and is there a SUE flavour that sidesteps paid analyst consensus? (New note; edits nothing.)

## Problem & current state
- **Problem**: Build a Standardized Unexpected Earnings (SUE) signal for the liquid Midcap-150 to pair with
  (or replace) Exp16's EAR proxy.
- **Today**: We have `india_bourse_announcements` (result *events* + PDFs, V2-018) but **no structured
  quarterly EPS series and no consensus estimates** in the DB. The earlier notes called this a "to-be-filed
  consensus/fundamentals collector."
- **"Solved"** = a sourced answer on (a) which SUE flavour to use, (b) where the data comes from, (c) cost,
  (d) feasibility for mid-caps.

## The key distinction (this is the whole answer)
There are **two SUE flavours**, and they have very different data needs:

| Flavour | Expectation model | Data needed | Cost |
|---|---|---|---|
| **Analyst-consensus SUE** | actual EPS − **broker consensus** EPS | paid consensus feed | ₹2k–6k/yr (Trendlyne) or Indian API |
| **Time-series SUE** (Foster / Bernard-Thomas) | actual EPS − **seasonal-random-walk** forecast (same quarter last year + drift), scaled by σ of past surprises | **only historical quarterly EPS** | ~free (XBRL / Indian API) |

**The classic PEAD papers (Bernard & Thomas 1989/1990) used TIME-SERIES SUE, not analyst consensus.** So the
academically-canonical SUE leg needs *only a history of quarterly EPS per symbol* — which is free/cheap —
**not** a paid consensus subscription. This meaningfully de-risks the bet: the leg that drifts is buildable.

## Sourcing options — what works / what might not

| Source | Gives | Programmatic? | Cost | Fit for our SUE |
|---|---|---|---|---|
| **NSE/BSE XBRL filings** | actual quarterly EPS/PAT (machine-readable since 2015) | bulk API undocumented — likely **scrape XBRL** per filing | free | **Best for time-series SUE** (primary, authoritative) but engineering to parse/backfill |
| **Indian API (analyst.indianapi.in)** | quarterly results + **consensus** EPS/Rev + historical snapshots | **yes — REST API, free tier** | free tier → paid | **Most promising programmatic source**; gives BOTH a quarterly-EPS history AND consensus; verify mid-cap coverage + rate limits |
| **Trendlyne Forecaster** | 40+ broker consensus, EPS/targets, analyst accuracy | Excel Connect (StratQ ₹5,900/yr); no open API | paid | consensus SUE if we ever want it; manual-ish |
| **Screener.in** | 10y reported fundamentals (no consensus) | scrape/Excel | ₹4,999/yr | a quarterly-EPS history source for time-series SUE |
| **Tijori** | operational/alt-data | — | ₹3,500/yr | not SUE-relevant |

## Verdict (gate-checked)
- **Recommendation: PARK building a collector now, but with a clear, cheap path identified — and a verdict
  that the SUE leg is FEASIBLE.** Build **time-series SUE from a free quarterly-EPS history**, sourced from
  **Indian API (test the free tier first) with NSE/BSE XBRL as the authoritative fallback** — no paid
  consensus subscription required. This would be the "to-be-filed fundamentals collector" (a future Exp17
  data dependency).
- **Sequencing**: this is *behind* Exp16. Run Exp16 (EAR-only) first; if EAR reverses/is weak (the documented
  risk), *then* build the time-series-SUE collector and test the SUE leg. Don't build it speculatively.
- **Gate**: data tier ⚠️ (the data is sourceable cheaply but not yet collected) · kill list ✅ (proprietary
  data asset, not UI/SaaS) · live consumer ✅ (the SUE leg of the mid-cap PEAD bet, post-Exp16) · right
  denominator ✅.

## Open questions / what I couldn't verify
1. **Indian API free-tier coverage & limits** — does it cover mid/small-caps with enough quarterly-EPS
   history (need ≥8–12 quarters per name for a seasonal SUE)? Rate limits? Verify by hitting the API (the
   one programmatic step worth taking before committing to XBRL scraping).
2. **XBRL bulk access** — NSE/BSE XBRL is machine-readable but the *bulk programmatic* path is undocumented;
   may require per-filing scraping off the announcements feed we already bank (V2-018). Effort unknown.
3. **Survivorship in EPS history** — same ceiling as prices; historical quarterly EPS for delisted/demoted
   names may be missing from free sources.
4. **Data quality** — XBRL tagging errors and restatements are common; a SUE built on dirty EPS is noise.
   Needs a validation pass before trusting.

---
*Reflection: this closes the loop the EAR-risk note opened. The leg that actually drifts (SUE) is NOT gated
on a pricey consensus feed — the canonical Bernard-Thomas SUE is a seasonal-random-walk on free quarterly
EPS. So the bet's "optional upgrade" (the SUE leg) is cheaper and more feasible than the prior notes assumed.
But sequence it AFTER Exp16 — don't build a collector for a leg until the EAR pilot tells us whether we even
need it.*
