#!/usr/bin/env node

// V2-027 — one-time NPCI / NETC FASTag toll-volume backfill.
//
// One-time; Lijo runs against prod; safe to re-run; monthly floor is
// 2016-11-01, daily floor is 2021-06-01 per V2-027 Decision 6.
//
// Walks two independent axes in order:
//   1. MONTHLY axis (smaller — run first): every fiscal year from "2016-17"
//      to current FY (~11 calls). Pre-2017 rows carry NULL volume/value but
//      real tag/bank counts — expected, not an error (Decision 6/7).
//   2. DAILY axis (larger — run second): every calendar month from June 2021
//      to the current month (~60 calls).
//
// ~300ms sleep between calls. 1 retry on transient 5xx; log+skip after 2
// consecutive fails (never fatal). Idempotent via ON CONFLICT DO NOTHING.
// Standalone — no runSeed / no distributed lock (manual one-shot, not a cron).
//
// SAFETY: writes are OPT-IN. Default = DRY RUN (fetch + parse + count, NO DB
// connection / NO upsert). Pass --write to upsert to prod, which runs a disk
// preflight (assertDiskHeadroom) before the first write.
//   node scripts/backfill-india-fastag.mjs            # DRY RUN — fetch + parse, no DB write
//   node scripts/backfill-india-fastag.mjs --write    # WRITE to india_fastag_toll_volumes (Lijo, post-review)

import pg from 'pg';
import { upsertFastag } from './_fastag-upsert.mjs';
import {
  fetchDailyMonth,
  fetchMonthly,
  fiscalYearRangeFor,
  monthsBetween,
  parseDailyPayload,
  parseMonthlyPayload,
} from './_npci-source.mjs';
import { assertDiskHeadroom } from './research/_db-guard.mjs';
import { loadEnvFile, sleep } from './_seed-utils.mjs';

loadEnvFile(import.meta.url); // MUST be first

const args    = process.argv.slice(2);
const DRY_RUN = !args.includes('--write'); // writes are OPT-IN; default = dry run
const CALL_PAUSE_MS = 300;

// Returns a UTC Date whose getUTC* fields represent today's IST wall-clock date.
function nowIST() {
  const now = new Date();
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
}

// All fiscal year strings from startFY through (and including) the current FY.
// e.g. fiscalYearsFrom("2016-17") → ["2016-17", "2017-18", …, "2025-26"]
function fiscalYearsFrom(startFY) {
  const endFY     = fiscalYearRangeFor(nowIST());
  const startYear = Number.parseInt(startFY.split('-')[0], 10);
  const endYear   = Number.parseInt(endFY.split('-')[0], 10);
  const out = [];
  for (let y = startYear; y <= endYear; y++) {
    out.push(`${y}-${String((y + 1) % 100).padStart(2, '0')}`);
  }
  return out;
}

// 1 retry on transient 5xx; log+skip (return null) after 2 consecutive fails.
async function fetchWithRetry(label, fn) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg  = String(err?.message || '');
      const is5xx = /HTTP 5\d\d/.test(msg);
      if (attempt === 1 && is5xx) {
        console.warn(`[backfill] ${label} — transient 5xx, retrying once…`);
        await sleep(1000);
      } else {
        console.error(`[backfill] ${label} — failed after ${attempt} attempt(s): ${msg || err}`);
        return null;
      }
    }
  }
  return null;
}

async function backfill() {
  console.log('=== india_fastag_toll_volumes backfill (V2-027) ===');
  console.log(`[backfill] Mode: ${DRY_RUN ? 'DRY RUN (no DB write)' : 'WRITE'}`);

  let pool = null;
  if (!DRY_RUN) {
    const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('ERROR: DATABASE_URL or DATABASE_PUBLIC_URL is not set. Add it to .env.local first.');
      process.exit(1);
    }
    pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    await pool.query('SELECT 1');
    console.log('[backfill] connected to Railway PostgreSQL');
    const dbStat = await assertDiskHeadroom(pool, { tableName: 'india_fastag_toll_volumes' });
    console.log(`\nWRITE PLAN: monthly + daily axes → india_fastag_toll_volumes`);
    console.log(`  est. rows: ~2,000   current DB: ${dbStat.sizePretty} / 5 GB (${((dbStat.bytes / dbStat.limitBytes) * 100).toFixed(1)}%)`);
    console.log(`  proceeding because --write was passed.\n`);
  }

  try {
    let totalFetched   = 0;
    let totalInserted  = 0;
    let totalCallsFailed = 0;

    // ── AXIS 1: Monthly (smaller — run first) ─────────────────────────────────
    const fyRanges = fiscalYearsFrom('2016-17');
    console.log(`\n[backfill] MONTHLY axis — ${fyRanges.length} fiscal year(s): ${fyRanges[0]} → ${fyRanges.at(-1)}`);

    for (const [i, fyRange] of fyRanges.entries()) {
      const json = await fetchWithRetry(`monthly/${fyRange}`, () => fetchMonthly(fyRange));

      if (json === null) {
        totalCallsFailed++;
        if (i < fyRanges.length - 1) await sleep(CALL_PAUSE_MS);
        continue;
      }

      const rows = parseMonthlyPayload(json);
      if (rows.length === 0) {
        console.log(`[backfill]   ${fyRange} → 0 rows (pre-launch period — expected)`);
        if (i < fyRanges.length - 1) await sleep(CALL_PAUSE_MS);
        continue;
      }

      const inserted = DRY_RUN ? 0 : await upsertFastag(pool, rows);
      totalFetched  += rows.length;
      totalInserted += inserted;
      console.log(`[backfill]   ${fyRange} → fetched ${rows.length}${DRY_RUN ? ' (not written — dry run)' : `, inserted ${inserted}, skipped ${rows.length - inserted}`}`);

      if (i < fyRanges.length - 1) await sleep(CALL_PAUSE_MS);
    }

    // ── AXIS 2: Daily (larger — run second) ───────────────────────────────────
    const ist         = nowIST();
    const endYear     = ist.getUTCFullYear();
    const endMonthIdx = ist.getUTCMonth(); // 0-based; current month inclusive
    const months      = monthsBetween(2021, 5, endYear, endMonthIdx); // June 2021 = idx 5

    console.log(`\n[backfill] DAILY axis — ${months.length} month(s): June 2021 → ${months.at(-1).monthName} ${months.at(-1).year}`);

    for (const [i, { year, monthName }] of months.entries()) {
      const json = await fetchWithRetry(`daily/${year}/${monthName}`, () => fetchDailyMonth({ year, monthName }));

      if (json === null) {
        totalCallsFailed++;
        if (i < months.length - 1) await sleep(CALL_PAUSE_MS);
        continue;
      }

      const rows = parseDailyPayload(json);
      if (rows.length === 0) {
        console.log(`[backfill]   ${year}/${monthName} → no daily rows (boundary or gap — expected)`);
        if (i < months.length - 1) await sleep(CALL_PAUSE_MS);
        continue;
      }

      const inserted = DRY_RUN ? 0 : await upsertFastag(pool, rows);
      totalFetched  += rows.length;
      totalInserted += inserted;
      console.log(`[backfill]   ${year}/${monthName} → fetched ${rows.length}${DRY_RUN ? ' (not written — dry run)' : `, inserted ${inserted}, skipped ${rows.length - inserted}`}`);

      if (i < months.length - 1) await sleep(CALL_PAUSE_MS);
    }

    // ── Grand totals ──────────────────────────────────────────────────────────
    console.log('\n[backfill] done');
    console.log(`[backfill]   fetched  ${totalFetched}`);
    if (DRY_RUN) {
      console.log(`[backfill]   to write ~${totalFetched} (NOT written — dry run; pass --write to upsert)`);
    } else {
      console.log(`[backfill]   inserted ${totalInserted}`);
      console.log(`[backfill]   skipped  ${totalFetched - totalInserted} (idempotent DO NOTHING — safe to re-run)`);
    }
    if (totalCallsFailed > 0) {
      console.log(`[backfill]   failed API calls: ${totalCallsFailed} (re-run to retry)`);
    }
  } finally {
    if (pool) await pool.end();
  }
}

backfill().catch((err) => {
  console.error('Backfill failed:', err.message || err);
  process.exit(1);
});
