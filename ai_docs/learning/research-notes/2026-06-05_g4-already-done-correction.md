---
date: 2026-06-05
problem: The entire PEAD thread assumed research_prices was Nifty-50-only and Exp16 was "gated on G4 (midcap backfill)". A live read-only DB check on 2026-06-05 proved that premise STALE — G4 is already done.
status: researched — CORRECTION (supersedes "gated on G4" across the thread)
lane: Lijo
tags: [research-note, correction, G4, research_prices, exp16, verified]
sources_consulted: [
  "LIVE read-only check 2026-06-05: scripts/research/check-db-space.mjs + scripts/research/check-midcap-coverage.mjs",
  "Stale source that misled the thread: strategy_reset_and_data_foundation_2026-05-29.md §8 (said 47 symbols, rolled back)"
]
---

# Correction: G4 is ALREADY DONE — research_prices is full-universe, not Nifty-50-only

> Every 2026-06-04 note in this thread says "research_prices is Nifty-50-only (47 symbols), Exp16 gated on
> G4." **That is false as of 2026-06-05.** This note records the live evidence and supersedes the
> "gated-on-G4" framing wherever it appears.

## The live evidence (read-only, 2026-06-05)
`check-db-space.mjs`:
```
Total database size: 1437 MB
research_prices: 6,385,924 rows · 2,357 symbols · latest 2026-05-29   (1107 MB)
```
`check-midcap-coverage.mjs` (against `shared/nifty-midcap150.json`):
```
PRESENT:  150/150 symbols
with history ≤ 2018-01-01: 112/150   (the other 38 are newer listings — e.g. 360ONE 2019, AIIL 2024)
median bars/symbol: 4291              (full 2009→2026 history for established names)
earliest first-bar: 2009-01-02  ·  latest: 2026-05-29
MISSING: 0/150
```

## What this means
- **G4 is complete.** `research_prices` holds ~the full active NSE universe (2,357 symbols, 6.39M rows),
  including **all 150 Nifty-Midcap-150 names** with deep history. Someone re-ran a successful full-universe
  backfill after the 2026-05-29 rollback (the OPS-001 disk-preflight work fits the timeline).
- **The volume is already adequate** — a 1.4 GB DB is online, so the Railway volume already holds it. No
  resize or re-backfill is needed to *load* the data. (Resizing to 5 GB remains optional headroom hygiene.)
- **Exp16 is NOT data-blocked.** It can run now.
- **The G4 backfill script + safety runbook are now reference-only** (useful for future refresh/extend, not
  a prerequisite). The `g4-backfill-midcap-prices.mjs --skip-existing` path would simply confirm coverage.

## Why the thread was wrong (root cause)
The 2026-06-04 notes inherited "47 symbols / rolled back" from `strategy_reset_and_data_foundation_2026-05-29.md`
§8 and never re-checked the live DB. The fix was a 2-command read-only check. **Lesson reinforced (Hard
Rule 11): "don't claim data readiness you didn't check" — and re-verify a cited internal doc against the
live system before building a plan on it.**

## Corrected next step
The critical path is no longer "do G4." It is:
1. **Quality spot-check** the midcap series (sane OHLCV, adj-close, log returns; survivorship caveat: the
   list is today's index membership).
2. **Run Exp16** — the long-only EAR-drift-vs-reverse pilot (`exp16_brief.md`) — it's unblocked.
3. **G1 alias-normalization** (Pillar A) remains the *other* open gate — that one is genuinely not done.

## Files corrected to reflect this
- `2026-06-04_midcap-event-arbitrage-dossier.md` — correction banner + Pillar B gate / build sequence / verdict
- `research-notes/_index.md` — next action flipped to Exp16
- `wiki/experiments/exp16_brief.md` — status BLOCKED-on-G4 → READY
- `2026-06-04_g4-midcap-backfill-safety.md` — SUPERSEDED banner (G4 already done)
The other dated notes are left as-is (append-only history); this note is the authoritative correction.
