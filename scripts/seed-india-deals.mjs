#!/usr/bin/env node

// V2-030 — NSE bulk & block deals daily EOD collector.
//
// SEPARATE daily Railway cron ≈13:00 UTC / 18:30 IST (Decision 2). NOT the
// 10-min news cron — failure isolation. Bulk and block disclosures are released
// EOD after market close; one daily capture is sufficient. Reuses runSeed() for
// the distributed lock + freshness meta + exit-0 contract. Data target is
// Railway PostgreSQL (india_bulk_block_deals); the canonical Redis key is a
// STATUS key only. Does NOT read news:digest:v1:india:en, does NOT touch the
// news pipeline or entity_timeline (Decision 9).

import pg from 'pg';
import { upsertDeals } from './_deals-upsert.mjs';
import { fetchDeals, parseDealsCsv, warmUpNSE } from './_nse-deals-source.mjs';
import { loadEnvFile, runSeed } from './_seed-utils.mjs';

loadEnvFile(import.meta.url); // MUST be first

const CANONICAL_KEY = 'news:deals:v1:india'; // STATUS key only — data → PostgreSQL
const CACHE_TTL = 86400; // daily

// IST = UTC+05:30. Format a Date as DD-MM-YYYY in IST (NSE's required param shape).
function istDateParam(date) {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const dd   = String(ist.getUTCDate()).padStart(2, '0');
  const mm   = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = ist.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// NSE's bot protection sometimes hangs and times out instead of returning 401/403.
// Treat TimeoutError the same as a cookie wall — re-warm once and retry.
function isRetryable(err) {
  const msg = String(err?.message || '');
  return /HTTP 40[13]/.test(msg)
    || err?.name === 'TimeoutError'
    || /aborted due to timeout/i.test(msg);
}

const DEAL_TYPES = [
  { apiType: 'bulk_deals',  label: 'bulk' },
  { apiType: 'block_deals', label: 'block' },
];

async function fetchAndUpsert() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[deals] DATABASE_URL not set — skipping');
    return { written: 0 };
  }

  // 2-day IST window: yesterday → today, so a filing straddling the midnight /
  // run boundary is never missed; append-only upsert makes the overlap free.
  const now      = new Date();
  const fromDate = istDateParam(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const toDate   = istDateParam(now);
  const window   = `${fromDate}→${toDate}`;

  let cookie = await warmUpNSE();

  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  let totalFetched = 0;
  let totalWritten = 0;
  let latestDate   = null;

  try {
    for (const { apiType, label } of DEAL_TYPES) {
      let csvText;
      try {
        csvText = await fetchDeals({ dealType: apiType, fromDate, toDate, cookie });
      } catch (err) {
        if (!isRetryable(err)) throw err;
        console.warn(`[deals:${label}] retryable error (${err.message}) — re-warming once`);
        cookie  = await warmUpNSE();
        csvText = await fetchDeals({ dealType: apiType, fromDate, toDate, cookie });
      }

      const rows = parseDealsCsv(csvText, label);

      if (rows.length === 0) {
        console.log(`[deals:${label}] no new rows for ${window} (weekend/holiday or none filed)`);
        continue;
      }

      console.log(`[deals:${label}] fetched ${rows.length} for ${window} — upserting…`);

      const written = await upsertDeals(pool, rows);

      for (const row of rows) {
        if (!latestDate || row.deal_date > latestDate) latestDate = row.deal_date;
      }

      totalFetched += rows.length;
      totalWritten += written;
      console.log(`[deals:${label}] inserted ${written} new of ${rows.length} for ${window}`);
    }
  } finally {
    await pool.end();
  }

  console.log(`[deals] total: fetched=${totalFetched} written=${totalWritten} latest=${latestDate ?? 'none'}`);
  return { fetched: totalFetched, written: totalWritten, latest: latestDate };
}

function validate(d) {
  return typeof d === 'object' && d !== null;
}

runSeed('india', 'deals', CANONICAL_KEY, fetchAndUpsert, {
  validateFn: validate,
  ttlSeconds: CACHE_TTL,
  sourceVersion: 'deals-nse-csv-v1',
}).catch((err) => {
  console.error('FATAL:', err.message || err);
  process.exit(0);
});
