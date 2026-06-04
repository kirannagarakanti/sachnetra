---
tags: [research-notes, index, navigation, mid-cap-event-arbitrage]
status: LIVING — append a row per new research note
last_updated: 2026-06-04
audience: Lijo + future Claude / Gemini sessions
---

# Research Notes — Index

Problem-driven research output from the `/research` protocol (`../RESEARCH_INSTRUCTIONS.md`). Each note is
gate-checked (Pursue / Park / Kill) and tags its evidence as page-verified vs search-summary. **Start with
the dossier** — it ties the rest together.

## The one bet — mid-cap event arbitrage (read in this order)

| # | Note | What it settles | Verdict |
|---|------|-----------------|---------|
| ★ | [`2026-06-04_midcap-event-arbitrage-dossier.md`](./2026-06-04_midcap-event-arbitrage-dossier.md) | **Capstone.** The whole bet: 2 pillars (latency + drift), gates (G1, G4), costs, ledger, risks, build sequence | PARK on data; next action = G4 |
| 1 | [`2026-06-04_pead-mid-small-caps.md`](./2026-06-04_pead-mid-small-caps.md) | Is Indian mid/small-cap PEAD tradable? (original pass) | PARK-SUE / PURSUE-proxy (gated on G4) |
| 2 | [`2026-06-04_pead-mid-small-caps-followup.md`](./2026-06-04_pead-mid-small-caps-followup.md) | Amihud sweet-spot, SLB (→ long-only), scanned-PDF (→ XBRL); G4 reality | PARK, gated on G4 |
| 3 | [`2026-06-04_pead-size-liquidity-resolution.md`](./2026-06-04_pead-size-liquidity-resolution.md) | **The load-bearing question**: is drift bigger in mid/small-caps? → yes on the SIZE axis (not pure illiquidity) | premise RESOLVED (supported) |
| 4 | [`2026-06-04_ear-proxy-risk-for-exp16.md`](./2026-06-04_ear-proxy-risk-for-exp16.md) | Does Exp16's EAR proxy drift or REVERSE? → **conflicting evidence** (the highest open risk) | PARK / re-scope Exp16's first gate |
| 5 | [`2026-06-04_sue-leg-data-sourcing.md`](./2026-06-04_sue-leg-data-sourcing.md) | Can we cheaply build the SUE leg? → yes, time-series SUE from free quarterly EPS | PARK with a cheap path identified |
| 6 | [`2026-06-04_g4-midcap-backfill-safety.md`](./2026-06-04_g4-midcap-backfill-safety.md) | How to backfill midcap prices without re-crashing prod | PURSUE narrow-first, post volume-grow |

Companion pre-registration brief: [`../../sachnetra v2/wiki/experiments/exp16_brief.md`](../../sachnetra%20v2/wiki/experiments/exp16_brief.md)

## The single next action
**G4 — safely backfill ~75 liquid Midcap-150 names (2018→now) into `research_prices`** (note 6). It unblocks
Exp16 (note 4), which tells us whether the EAR signal drifts or reverses on our universe. Everything else waits
on that.

## Evidence-quality legend
Every note tags figures as **page-verified** (a source actually opened) vs **search-summary** (snippet only,
route to Gemini recon to verify). The PEAD magnitude (Harshita ~6%/64d), the small-cap concentration
(Quantpedia), 2026 STT, SEBI Aug-2024 F&O criteria, and LODR-XBRL are page-verified. The SLB liquidity
figures and the Brandt EAR primary are not yet page-verified.
