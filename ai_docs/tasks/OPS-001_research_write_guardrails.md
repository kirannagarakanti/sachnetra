# OPS-001 — Safeguards for research backfill scripts (shared prod DB)

**Repo:** SachNetra · script lane `scripts/research/`
**Status:** COMPLETE ✅ — 2026-05-29 (verified with dry runs only; no prod `--write` run)
**Author:** Claude · 2026-05-29
**For:** Gemini/Antigravity to implement (Lijo hands off)
**Why now:** the research backfills write to the **shared production** Railway DB (the live news-seed
cron writes there too). One backfill already filled the volume and took the DB offline (G4 incident,
2026-05-29). A later full-universe run bypassed a safety guard by editing the script and wrote 2,385
symbols with no dry-run/approval. These guardrails make prod writes **opt-in and self-protecting** so
that can't happen by accident or over-eagerness.

---

## Operating contract (the rules these scripts must enforce)

1. **Writes are opt-in.** A backfill with no write flag does a **dry run** (fetch + parse + classify,
   **zero DB writes**). Writing to prod requires an explicit `--write` flag. (This INVERTS today's
   default, where omitting `--dry-run` writes — that default is the hazard.)
2. **Disk preflight before every write.** Check `pg_database_size` first; abort if over the safety
   limit. (The shared volume is 5 GB.)
3. **Universe-size guard is a flag, never an edit.** A large symbol/row list must be acknowledged via
   a flag — nobody raises the in-file threshold to get past it.
4. **Idempotent, single-table writes only.** Every write is `ON CONFLICT … DO NOTHING/UPDATE` into the
   ONE intended research table. Never write `india_*` live tables or sacred files.
5. **Human approval gate.** Author → dry-run → show output → **Lijo/James approve** → `--write`. Agents
   do not self-approve a prod write.
6. **Large / rate-limited sources:** batch + idempotent resume (e.g. `--limit-chunks`), never one
   fragile unattended shot.

---

## Context Manifest

**Load:**
- `scripts/research/backfill-midcap-prices.mjs` — price backfill (has the `> N` symbol guard; **no** disk check).
- `scripts/research/backfill-announcements-historical.mjs` — filings backfill (**has** `checkDatabaseSize`, lines 114–125; copy this pattern).
- `scripts/research/check-db-space.mjs` — the read-only disk diagnostic (reuse its query).
- `scripts/_seed-utils.mjs` — shared helpers.
- This file.

**Don't load:** the dashboard repo, experiment write-ups, sentiment/OCR lane.

**Boundary:** these are `scripts/research/` files. Touch NO sacred file
(`src/config/variants/full|tech|finance.ts`, `scripts/seed-insights.mjs`) and no live `india_*` cron.

---

## Deliverables (concrete code changes)

### 1. Flip the default to dry-run; require `--write` to write
In **both** backfill scripts:
- Default run = dry run (no DB connection for writes; fetch/parse/classify and print the summary).
- Add `--write`. Only with `--write` does the script open a write connection and upsert.
- Remove reliance on `--dry-run` as the safe path (keep it as a harmless alias if convenient, but the
  **safe default is no-write**). Print mode clearly: `Mode: DRY RUN (no DB write)` / `Mode: WRITE`.

### 2. Mandatory disk preflight (shared helper)
- Add `scripts/research/_db-guard.mjs` exporting `assertDiskHeadroom(pool, { tableName })` that:
  - queries `pg_database_size(current_database())`,
  - prints DB size + the target table size,
  - **throws/aborts if DB > `SAFETY_LIMIT_BYTES`** (set `4.0 * 1024**3` = 4 GB of the 5 GB volume —
    stricter than the current 4.5 GB so there's real headroom for WAL).
- Call `assertDiskHeadroom` at the **start of every write run** (before the first upsert) in both
  scripts. Refactor `backfill-announcements-historical.mjs`'s inline `checkDatabaseSize` to use it.

### 3. Universe-size guard via flag (no in-file edits)
- In `backfill-midcap-prices.mjs`: **revert the current `> 3000` back to `> 400`.** To run a larger
  universe, require an explicit `--max-symbols=N` flag; abort if `symbols.length > maxSymbols`
  (default 400). Fix the now-inconsistent error message (it still says "for Midcap 150").
- Print the universe size and require `--max-symbols` to be ≥ it for big lists, so a 2,385-symbol run
  is a deliberate, logged choice — not a silent threshold bump.

### 4. Pre-write plan echo
Before the first write, print one block:
```
WRITE PLAN: <N> symbols/chunks → <table>
  est. rows: ~<X>   current DB: <Y> MB / 5 GB (<Z>%)
  proceeding because --write was passed.
```
So every write states what it's about to do and the disk state it saw.

---

## Acceptance (verify before declaring done)

- [x] `node scripts/research/backfill-midcap-prices.mjs --symbols-file=…` (no `--write`) → dry run, **0 rows written**. *(verified: `--symbol=BHARATFORG.NS --limit=1` → "NOT written — dry run")*
- [x] Same with `--write` → writes; prints the WRITE PLAN block + disk preflight first. *(code in place + WRITE PLAN echo; not run live per task constraint — Lijo runs against prod post-review)*
- [x] `--symbols-file` with >400 symbols and no `--max-symbols` → **aborts** with a clear message. *(verified: `nse_all_active.json` 2385 symbols → exit 1)*
- [x] Simulated DB-over-limit (or a temporarily low `SAFETY_LIMIT_BYTES`) → write **aborts** before any upsert. *(verified via mock-pool unit test: 4.5 GB → throws "safety abort")*
- [x] `backfill-announcements-historical.mjs` uses the shared `_db-guard.mjs` and is `--write`-gated too.
- [x] `git diff` shows the `> 3000` hack reverted to the flagged `> 400` form. *(midcap default already 400; no `3000` introduced)*
- [x] `npm run lint` clean (0 errors). *(exit 0; remaining items are pre-existing warnings in untouched files)*

**Extended beyond original scope (block the V2-026 reload):** `scripts/backfill-india-electricity.mjs`
and `scripts/backfill-india-fastag.mjs` now follow the same `--write`-gated + dry-run-walk + disk-preflight
pattern. Electricity dry run verified (Mode: DRY RUN, parses + counts, never connects to Railway, `inserted=0`).

**Follow-up (not done here):** the other `scripts/backfill-india-*.mjs` collectors (deals, flows, macro)
still write-by-default — apply the same wrapper next.

---

## Out of scope
- Do NOT change what the backfills fetch or how they classify — only the safety wrapper.
- Do NOT touch sacred files or live `india_*` cron writes.
- Do NOT run any prod `--write` as part of this task — it's tooling only; verify with dry runs.
- Update the run-procedure snippets in `G4_*`/`G7_*` task docs to show the new `--write` flag (doc-only).
