# G4 incident — Railway disk full · recovery handoff for James

**Date:** 2026-05-29 · **From:** Lijo (via Claude) · **Severity:** prod DB down
**Status:** ✅ **RESOLVED — 2026-05-29** (see Resolution log below)
**Cleanup runner:** `scripts/research/cleanup-midcap-research-prices.mjs` (run with `node` — see step 4)
**Cleanup SQL (reference):** `scripts/research/cleanup-midcap-research-prices.sql` (same logic, for psql)
**Full incident record:** §8 of `ai_docs/sachnetra v2/wiki/syntheses/strategy_reset_and_data_foundation_2026-05-29.md`

---

## ✅ Resolution log — 2026-05-29

Incident closed. Recovery ran clean, no data loss to the legitimate universe.

1. **Volume grown** — moved Postgres to the Railway **hobby plan** and resized the
   volume. Postgres finished WAL recovery and came back **Online** (no backup restore
   needed — the corruption HINT was boilerplate, as predicted).
2. **Crons recovered** — `seed-india-announcements`, `seed-india-flows`, and the news
   `Cron` service all showed **"Last run succeeded"** before cleanup.
3. **Headroom confirmed** — `check-db-space.mjs`: DB 213 MB, `research_prices` 107 MB /
   632,244 rows / 186 symbols. Ample free space for `VACUUM FULL`.
4. **Cleanup ran via the Node runner** (psql not installed), all three stages gated:
   - Pre-check: total 632,244 · would_keep 196,724 (47 symbols) · would_delete 435,520
     (139 symbols). Invariant `keep + delete == total` held; delete list was all
     non-Nifty-50 midcaps.
   - `--delete`: deleted **435,520** (== pre-check) · remaining **196,724** (== expected)
     · **COMMITTED**.
   - `--vacuum`: `research_prices` **107 MB → 29 MB**; DB total **213 MB → 135 MB**
     (~78 MB returned to OS). Final: 196,724 rows · 47 symbols · latest 2026-05-27.

**Known residual (pre-existing, not caused by the incident):** `TATAMOTORS.NS` is the
one KEEP-set symbol with 0 rows (so the table is 47 symbols, not 48). Likely a Yahoo
fetch miss during the original Nifty-50 backfill (TATAMOTORS demerger/ticker change).
Optional one-symbol re-backfill when convenient:
`node scripts/research/backfill-research-prices.mjs --symbol=TATAMOTORS.NS`.

**G4 retry status:** the midcap backfill failed only on disk, not logic. With the hobby
plan's larger volume a retry is now viable — but it's a fresh budget/scope decision
(step 5), not part of this recovery. Re-check headroom and consider `--limit` batches.

---

## What happened (2 min read)

A manual G4 backfill (`scripts/research/backfill-midcap-prices.mjs`) wrote the Nifty
Midcap 150 into the **shared prod** `research_prices` table on Railway PostgreSQL. It
got **140/150 symbols (~441,102 bars)** in, then the volume hit **"No space left on
device"**. Postgres then **crashed and is stuck in a disk-full recovery loop** — WAL
replay needs disk and there's none free. A follow-up read-only check couldn't even
connect (`ECONNRESET`).

This is **infra/billing, not a code bug**. The backfill was additive and idempotent;
the unchecked risk was *volume headroom*, not the rows themselves.

**Blast radius:** this is the same DB the **live news-seed cron** writes to, so the
live pipeline is likely failing until space is restored. Treat as prod-down.

**Budget note:** Railway credit is nearly gone (~9 days / ~$3 left) — so the fix is
also a money decision (see step 5).

### What the Railway deploy logs confirm (2026-05-29)

The Postgres service is in a **disk-full crash loop**, and the logs are reassuring on
the important point:

```
LOG:   database system was not properly shut down; automatic recovery in progress
LOG:   redo starts at 0/7AED0FD8
LOG:   redo done at 0/84FFFF30          ← WAL replay COMPLETES fine
FATAL: could not write to file "pg_wal/xlogtemp.35": No space left on device
LOG:   startup process (PID 35) exited with exit code 1
LOG:   shutting down due to startup process failure
LOG:   database system is shut down     ← then it restarts and repeats
```

- **WAL redo finishes** — the failure is only when it tries to write a *new*
  post-recovery WAL segment and the disk is full. So **growing the volume should let
  startup complete and the DB come back** (high confidence, no expected data loss).
- The earlier `HINT: ...some data is corrupted and you will have to use the last
  backup for recovery` is Postgres's **generic boilerplate** for any unclean restart —
  it is **not** evidence of real corruption here. **Do not restore from backup first.**
  Grow the volume (step 1), let it finish recovery, and confirm health before
  considering anything more drastic.

---

## Recovery steps — IN THIS ORDER

> Lijo/James run all of this. **No agent touches the live DB.** Order matters: the
> cleanup VACUUM needs free disk to run, so we make space *first*, recover, *then* trim.

1. **Grow the Railway volume first.** Bump the Postgres volume size in Railway so
   there's headroom. Don't try to DELETE/VACUUM on a full volume — `VACUUM FULL`
   rewrites the table into a new copy and needs free space to do it; it can't run when
   the disk is full.

2. **Confirm Postgres comes back healthy.** After the volume grows, check it finishes
   WAL recovery and accepts connections (Railway → Postgres metrics + logs).

3. **Confirm the live seed crons recovered.** Check the seed service logs — the
   news-seed cron (and FII/DII, bourse, etc.) should be writing again. This is the
   "are users/data OK" gate. Don't proceed to cleanup until the live pipeline is green.

4. **Run the cleanup via the Node runner** — `scripts/research/cleanup-midcap-research-prices.mjs`.
   (`psql` is **not installed** on Lijo's machine, so use the Node runner, not the `.sql`.
   It reuses the repo's `pg` dependency, auto-loads `.env.local` like the backfills, and
   derives the KEEP set from `shared/market-taxonomy.json` at runtime so the symbol list
   can't drift.) Run the three stages in order, reading the output between each:

   ```bash
   # STEP 1 — read-only pre-check (deletes nothing; default when no flag given)
   node scripts/research/cleanup-midcap-research-prices.mjs
   #   eyeball: would_keep ≈ Nifty-50 history (~196K bars, 48 symbols incl. ^NSEI),
   #            would_delete ≈ ~441K midcap bars. It also lists the ~140 midcap
   #            symbols slated for deletion — confirm nothing legitimate is in it.

   # STEP 2 — transactional DELETE (only after the pre-check looks right)
   node scripts/research/cleanup-midcap-research-prices.mjs --delete
   #   self-guards: re-runs the pre-check, refuses if would_keep is 0, and ROLLBACKs
   #   if the deleted/remaining counts don't match the pre-check.

   # STEP 3 — reclaim disk (returns freed pages to the OS; plain VACUUM won't)
   node scripts/research/cleanup-midcap-research-prices.mjs --vacuum
   ```

   The KEEP set is exactly `^NSEI` + the 47 `nifty50_registry` tickers from
   `shared/market-taxonomy.json` — derived from the file, not hand-typed — so the
   DELETE can only hit non-Nifty-50 rows. (The `.sql` file has the identical logic if
   you'd rather paste into a psql session elsewhere — but **not** the Railway web
   console, which misreports multi-row SELECTs as "0 rows" and won't hold the
   transaction.)

5. **Budget decision before retrying G4.** Two paths:
   - **Upgrade Railway storage** (and/or top up credit) so the Midcap 150 fits with
     headroom, then re-run `backfill-midcap-prices.mjs` to fill the 10 missing symbols
     (idempotent — safe to re-run the whole thing). Net adds ~441K bars back.
   - **Keep the DB lean** (cleanup leaves it Nifty-50 only) and defer/scope-down G4
     until storage/budget allows. The mid-cap event-study strategy (Exp 14) stays
     blocked in that case.

   Pick based on remaining credit. If we grow storage just to recover (step 1) and
   then re-trim (step 4), we end up lean again — so retrying G4 specifically needs the
   storage headroom to *stay* grown.

---

## Don't

- Don't re-run the midcap backfill before the volume has real headroom — same wall.
- Don't `VACUUM FULL` on a full/near-full volume — it needs space to rewrite.
- Don't auto-retry or run destructive recovery from a script/agent against the live DB.

---

## Attachments

- `scripts/research/cleanup-midcap-research-prices.mjs` — **the execution path.** Node
  runner: `--precheck` (default, read-only) → `--delete` (transactional, self-guarded) →
  `--vacuum`. KEEP set derived from `shared/market-taxonomy.json` at runtime.
- `scripts/research/cleanup-midcap-research-prices.sql` — reference copy of the same
  logic (pre-check + transactional DELETE + VACUUM FULL) for a psql session, symbol list
  inlined from `shared/market-taxonomy.json`.
