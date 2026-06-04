---
date: 2026-06-04
problem: G4 (backfill Nifty Midcap 150 prices into research_prices) is the hard blocker for Exp15-redo and Exp16, but the prior attempt filled the shared Railway volume and took the prod DB offline. How do we do it SAFELY?
status: researched
lane: James (execution) + Lijo (run); Claude authored this runbook
tags: [research-note, G4, research_prices, midcap, railway, disk-full, runbook, ops]
sources_consulted: [
  "scripts/research/backfill-midcap-prices.mjs (READ 2026-06-04 — the script that crashed prod)",
  "scripts/research/_db-guard.mjs (READ — assertDiskHeadroom, 4 GB hardcoded limit)",
  "scripts/research/check-db-space.mjs (READ — read-only diagnostic)",
  "memory/feedback_check_disk_before_prod_writes; memory/project_pead_midcap_finding",
  "internal: research-notes/2026-06-04_pead-mid-small-caps-followup.md §G4"
]
---

# Research: How to backfill Midcap-150 prices (G4) without re-crashing prod

> G4 is the single blocker on the mid-cap event-arbitrage bet (Exp15 was rejected, Exp16 is designed but
> can't run). The first backfill **filled the shared Railway volume and took Postgres offline**, then was
> rolled back. This note diagnoses *why* and specifies a safe re-run. (New note — does not edit the script
> or run any prod write; that's Lijo/James's lane.)

## Problem & current state (with evidence)
- **Problem**: Backfill ~150 midcap symbols × ~17y (~600K rows) into `research_prices` on a shared Railway
  Postgres without a disk-full outage.
- **Today (read from the actual code)**:
  - `research_prices` is Nifty-50-only (47 symbols, ~196K rows).
  - `backfill-midcap-prices.mjs` already has: dry-run default, `--write` opt-in, chunked 500-row upsert,
    Yahoo 429 backoff, idempotent `ON CONFLICT` upsert, and a disk guard. **Yet it still crashed prod.**
- **"Solved"** = midcap daily bars land in `research_prices`, the DB stays online throughout, and there's a
  mid-run abort if disk gets tight — so Exp16 can run.

---

## Root-cause diagnosis (from reading the code, not guessing)

The crash was **not** a missing guard — it was a guard with three gaps:

1. **The disk check runs ONCE, before any write (line 263), and never again.** `assertDiskHeadroom` is
   called a single time at startup. A 150-symbol backfill then writes ~600K rows over many minutes with
   **no further checks** — so a volume that fills *during* the run is never caught. The guard can't abort
   what it never re-measures.
2. **The limit is a hardcoded 4 GB (`_db-guard.mjs`) that may exceed the real Railway volume.** If the
   actual provisioned volume is smaller than 4 GB (Railway starter volumes often are), the guard's ceiling
   is *above* the physical disk — so it green-lights a write that the disk can't hold. (Also a cosmetic
   bug: the script's log message says "5 GB" while the guard enforces 4 GB — they disagree.)
3. **`pg_database_size` ≠ disk used.** The guard measures logical DB size, but disk-full on Railway is also
   driven by **WAL growth, temp files, and dead-tuple bloat** generated *by the bulk write itself*. A big
   `INSERT ... ON CONFLICT DO UPDATE` churns WAL and dead tuples; the logical size can look fine while the
   volume fills. The shared volume already carries the large `india_*` tables (17K announcements, news
   signals, FII history, deals), so headroom was thin to begin with.

**Net**: the backfill was safe *in theory* (chunked, idempotent) but the disk guard was a one-shot check
against a possibly-wrong ceiling, on an already-thin shared volume, while the write itself generated WAL/bloat.

---

## Safe re-run plan (what works / what to avoid)

### Step 0 — Measure reality first (read-only, Lijo runs)
```
node scripts/research/check-db-space.mjs
```
This prints total DB size + the 12 largest tables + research_prices row/symbol counts. **Also check the
Railway dashboard for the actual VOLUME size and % used** — the guard's 4 GB assumption must be replaced
with the real number. Do not write until you know: (a) real volume size, (b) current free headroom.

### Step 1 — Grow the volume BEFORE writing (Railway)
Railway volumes can be resized. Given the shared volume already holds the `india_*` tables, **grow it to
give comfortable headroom** (target: free space ≥ 3× the estimated backfill size, to absorb WAL/bloat).
Estimate the backfill size empirically: current `research_prices` is 47 symbols / ~196K rows → measure its
`pg_total_relation_size`, then a 150-symbol backfill is ~3× that table (plus index + WAL churn).

### Step 2 — Shrink the write to what Exp16 actually needs (the highest-leverage safety move)
The full 150 symbols × 2009→now is the *maximum*, not the requirement:
- **Universe**: Exp16 only trades the **liquid half** of the Midcap 150 (~75 names). Backfill those first
  (`--symbols-file` with a filtered list). Halves the rows.
- **Window**: Exp16's recency gate wants the **last ~36 months**; the PEAD anomaly is *fading*, so old data
  is low-value. Start with `--from=2018-01-01` (or even 2021). A 5-year × 75-symbol backfill ≈ ~95K rows —
  ~1/6 of the 600K that crashed it. Validate, then extend the window only if needed.
- This staging (narrow first, widen later) is both safer and aligned with the experiment's real data need.

### Step 3 — Run with mid-flight disk re-checks (recommend a small script change — James lane)
The current one-shot guard should become a **periodic** guard. Recommended (NOT applied here — James to
implement; Claude does not edit prod scripts):
- Call `assertDiskHeadroom` **every N symbols** (e.g. every 10) inside the main loop, not just at startup,
  so a filling volume aborts gracefully mid-run with the table left consistent (the upsert is idempotent, so
  a partial run is safe to resume).
- Replace the hardcoded 4 GB with a value derived from the **real Railway volume** (e.g. `volume_size × 0.8`),
  passed via env or flag — so the ceiling tracks the disk, not an assumption.
- Reconcile the "5 GB" log string with the actual limit.
- Optionally `VACUUM` / rely on autovacuum between batches to reclaim dead tuples from the upserts.

### Step 4 — Verify, then unblock Exp16
After the write: re-run `check-db-space.mjs` (confirm online + headroom), confirm row/symbol counts, spot-
check a few symbols for sane OHLCV + log returns. Then Exp16 (`exp16_brief.md`) can run.

---

## Candidates — what works / what might not

| Approach | Works because | Might NOT work because | Verdict |
|---|---|---|---|
| **Narrow-first (75 liquid names, 2018→now)** | ~95K rows fits easily; matches Exp16's real need; fast to validate | needs a liquidity-filtered symbol list built first | **Pursue (do this first)** |
| Grow Railway volume, then full 150 × 2009 | gives the complete universe for any future study | costs money; 600K rows + WAL still needs real headroom; survivorship makes pre-2018 low-value anyway | Park (do later if a study needs it) |
| Periodic in-loop disk guard | catches a filling volume mid-run; idempotent upsert makes partial runs safe | small script change, James lane (not done here) | **Pursue (recommend to James)** |
| Just re-run the original script as-is | — | same one-shot guard / wrong ceiling → same crash risk | **Kill — do not repeat** |

---

## Verdict (gate-checked)
- **Recommendation: PURSUE the narrow-first backfill** (75 liquid midcaps, 2018→now) **after** (a) measuring
  the real Railway volume and (b) growing it for headroom; **recommend** the periodic-guard script change to
  James. This is the concrete unblock for Exp16.
- **Gate**: data tier ✅ (this *creates* the data tier Exp16 needs) · kill list ✅ (research_prices only, no
  sacred files) · live consumer ✅ (Exp16 + a future Exp15 redo both wait on it) · right denominator ✅ (the
  measure of success is "DB stays online + midcap bars present").
- **Boundary**: writes to prod are **Lijo/James's lane** ([[feedback_v2_prod_execution]]); Claude authored
  this runbook and read the scripts read-only. The script edits in Step 3 are recommendations for James.

---

## Open questions / what I couldn't verify
1. **Actual Railway volume size & current free headroom** — not measured here (would require connecting to
   prod). Run `check-db-space.mjs` + check the Railway dashboard. This is the #1 unknown.
2. **The liquidity-filtered ~75-name Midcap list** — needs building (Amihud-median or F&O-membership filter).
   No such file exists yet; `shared/nifty-midcap150.json` is the full 150.
3. **Whether autovacuum keeps up with the upsert churn** — may need a manual `VACUUM` between batches on a
   tight volume.

---
*Reflection: the crash wasn't carelessness — the script had real guards — it was a one-shot check against a
ceiling that didn't match the physical disk, on an already-thin shared volume, while the write itself made
WAL/bloat. The cheapest fix is to not write 600K rows when Exp16 only needs ~95K from the recent, liquid
slice. Narrow the ask to the experiment's real need.*
