---
date: YYYY-MM-DD
source_url: https://...
source_type: academic_paper / research_summary
publication: <site / journal / university name>
author: <name(s)>
publish_date: YYYY-MM-DD
tags: [quant, microstructure, options, sentiment, statistics, ml, india-macro]
status: raw
---

# <Paper title — verbatim, not paraphrased>

> **Why Lijo read this**: <one line — the question this was supposed to answer>

---

## TL;DR (3 bullets)

- <claim 1>
- <claim 2>
- <claim 3>

---

## ELI12 — what is this actually saying?

<60 seconds of plain English, no jargon. Define any term you have to use, inline in parentheses.>

---

## Glossary (new terms only)

> Only terms NOT already in `wiki/glossary.md`.

- **Term** — one-line def.

---

## State of the market RIGHT NOW (per this source)

- **If true, then ___**
- **Falsifiable by ___**
- **Time horizon** (intraday / next-day / weeks / cycle)

---

## So what for SachNetra?

**NSE/BSE Feasibility Check**:
- **F&O Segment**: [Yes/No/N/A - Are assets in F&O for overnight shorting?]
- **Data Availability**: [What data feed is required? Level-1/2/3, daily, tick?]
- **STT/Tax Drag**: [Does the 2026 STT hike on F&O options/futures impact this strategy?]

**Experiments to add/kill**:
- Add: Exp## — <hypothesis>
- Kill: Exp## — <why>
- N/A: <if none>

**Features to build**:
- <feature> — link V2-### roadmap item (or "new task to file")
- N/A: <if none>

**Data to capture**:
- <new field / collector / source> — gated by what?
- N/A: <if none>

**Pursue / Park / Kill** (pick exactly one):

> ⚠️ **Verdict gate — before writing "Pursue", it must clear ALL THREE:**
> 1. **Data tier** — testable on data we actually have *today* (EOD `research_prices`). NOT gated on Level-2/Level-3/tick data, an order router, or an execution engine. If it is → **Park** with the gate named.
> 2. **Kill list** — not UI polish, not a `finance`/`full`/`tech` variant feature, not B2B/SaaS/consumer (see `positioning_v2.md`). If it is → **Kill**.
> 3. **One-strategy focus** — moves the current bet (mid-cap event arbitrage / the live experiment) forward, not a net-new tooling/infra project. If it's "build a library/simulator/pipeline" before a 2nd consumer exists → **Park** or scope it down.
>
> Default to **Park**, not Pursue. "Interesting" is not Pursue. If you write Pursue, name the V2-### task or experiment it changes.

- **Pursue** — <what changes; link V2-### task or experiment>
- **Park** — <blocked by what; testable when>
- **Kill** — <killed by which experiment, or which rule above it fails>

---

## Open questions (for next session)

- <question>

---

## Wiki impact

- **Created**: [[concept_x]]
- **Updated**: [[entity_y]]
- **Logged in**: `wiki/log.md` on YYYY-MM-DD
- **Status after promote**: `promoted_to_wiki`

---

## Source excerpt

<article text or link>
