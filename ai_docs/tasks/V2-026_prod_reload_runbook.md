# V2-026 Electricity — Prod Reload Runbook

**For:** Lijo · **Owner of execution:** Lijo (Claude/James do NOT run TRUNCATE or `--write` against prod)
**Branch:** `fix/v2-026-parser-v2-027-cron` (parser fix `d88d6db1` + OPS-001 guards `563a72f3`)
**Date prepared:** 2026-05-29

---

## Why this reload is needed

The existing `india_electricity_demand` table is **corrupt + incomplete** (prior recon):

- ~2,496 rows · ~416 dates · stops **2024-06-30**
- Only ~6 rows/day (region/national) — **zero state rows**
- Section A metrics written by the old buggy parser (off-by-one / null max_demand)

The parser is now fixed (`d88d6db1`): all 4 scratch XLS samples parse to **42–45 rows/day**
(6 region/national + 36–39 state rows). Because the table uses
`ON CONFLICT (target_date, row_type, entity_name) DO NOTHING`, a re-run will **skip** the
existing corrupt rows rather than repair them. **The corrupt rows must be TRUNCATEd first.**

---

## Preconditions

- [ ] Branch `fix/v2-026-parser-v2-027-cron` **merged to main** — *currently NOT merged; merge before prod reload.*
- [ ] Parser verified locally (42–45 rows/day on the 4 scratch XLS) — ✅ done
- [ ] DB disk headroom checked: `node scripts/research/check-db-space.mjs` (read-only) — want comfortable free space; backfill adds only ~16 MB (~54k rows) but the volume is shared, so confirm first (see [[feedback_check_disk_before_prod_writes]])

---

## Step 1 — Clear the corrupt rows (DESTRUCTIVE)

The existing rows have wrong Section A values and no states; `DO NOTHING` will skip them on
reload, so they must be removed first.

```bash
psql "$DATABASE_PUBLIC_URL" -c "TRUNCATE india_electricity_demand;"
```

> Use `DATABASE_PUBLIC_URL` (the `trolley.proxy.rlwy.net` host) when running from your laptop;
> `DATABASE_URL` (`postgres.railway.internal`) only resolves inside Railway.

Sanity check it's empty:

```bash
psql "$DATABASE_PUBLIC_URL" -c "SELECT COUNT(*) FROM india_electricity_demand;"
-- expect 0
```

---

## Step 2 — Full backfill Jan 2023 → today

```bash
node scripts/backfill-india-electricity.mjs --write
```

Expectations (OPS-001 guards):

- Without `--write` it runs **DRY RUN** — parses + counts only, never connects to PG, `inserted=0`.
- With `--write` it prints a **WRITE PLAN block + disk preflight** before the first upsert.
- Walks fiscal years from `2022-23`→current, months Apr→Mar; pre-Jan-2023 months return no XLS
  (expected — logged, not an error).
- ~200 ms pause between files → runtime ≈ **30–60 min**.
- Volume ≈ **54k rows / ~16 MB** (~1,240 days × ~43 rows).
- Idempotent — safe to re-run if interrupted (`DO NOTHING`).

---

## Step 3 — Verify

```sql
-- Coverage
SELECT COUNT(*)                AS rows,
       COUNT(DISTINCT target_date) AS dates,
       MIN(target_date)        AS first_date,
       MAX(target_date)        AS last_date
FROM india_electricity_demand;
-- Expect ~800+ distinct dates (every day incl. weekends), max_date ≈ yesterday,
-- ~54k rows total (NOT ~2,496).

-- Row composition on the latest date (should be ~42–45, NOT 6)
SELECT target_date, row_type, COUNT(*)
FROM india_electricity_demand
WHERE target_date = (SELECT MAX(target_date) FROM india_electricity_demand)
GROUP BY 1, 2 ORDER BY 2;
-- Expect: region_total = 5, national_total = 1, state = 36–39.

-- Section A metric is now populated (was NULL on corrupt data)
SELECT entity_name, max_demand_met_mw, peak_demand_met_mw, energy_met_mu
FROM india_electricity_demand
WHERE target_date = '2024-06-15' AND row_type = 'national_total';
-- max_demand_met_mw should be NON-NULL (e.g. ~238957 for 2024-06-15).

-- OD/UD split sanity (Decision 9): a recent (2026) state row should have
-- both columns where the source was a "778/ -819" split string.
SELECT entity_name, max_od_mw, max_ud_mw
FROM india_electricity_demand
WHERE row_type = 'state' AND target_date = (SELECT MAX(target_date) FROM india_electricity_demand)
LIMIT 5;
```

---

## Step 4 — Wire the daily cron

Mirror the FASTag (V2-027) setup — separate Railway cron service for failure isolation.

| Setting | Value |
|---|---|
| Service name | `seed-india-electricity` |
| Cron | `30 5 * * *` (05:30 UTC ≈ 11:00 IST) |
| Start command | `node scripts/seed-india-electricity.mjs` |
| Env vars | `DATABASE_URL` (ref Postgres), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |

> Cadence rationale: Grid-India publishes day D's PSP report at 09:30–10:30 IST on D+1; the
> 11:00 IST run always catches it. The seed picks `target_date = today_IST − 1 day` and upserts
> only that day (~45 rows), idempotently.

Either wire it via the Railway dashboard (as FASTag was) **or** run the helper:

```bash
RAILWAY_TOKEN=... node scripts/railway-set-electricity-cron.mjs --apply
```

(The helper is dry-run by default; `--apply` mutates. See note in Phase 2 below — created only if present in this branch.)

---

## Step 5 — Cron smoke test

Railway → `seed-india-electricity` → **Run now**. Expected log:

```
[electricity] target_date=YYYY-MM-DD  fiscalYear=...  month=..
[electricity] listFilesForMonth → N file(s)
[electricity] downloading files/grdw/...
[electricity] parsed ~42-45 rows (target_date=...) — upserting…
[electricity] inserted 0-N new of ~42-45 for ...
=== Done ===
```

`inserted 0` on a same-day re-run is correct (idempotent). On a holiday / publish delay it logs
`no XLS for target_date … yet … exiting cleanly` and exits 0.

---

## Acceptance checklist

- [x] All 4 scratch XLS parse to 42–45 rows/day with state rows
- [x] `backfill-india-electricity.mjs` dry run → no DB connection, `inserted=0`
- [ ] `TRUNCATE` corrupt rows (Lijo)
- [ ] Full `--write` backfill → ~54k rows, max_date ≈ yesterday (Lijo)
- [ ] Verify queries pass (rows/day = 42–45, max_demand_met_mw non-null)
- [ ] Railway cron `30 5 * * *` wired + smoke-tested (Lijo)
- [x] No FASTag / research backfill / sacred-file changes
