#!/usr/bin/env node

// V2-027 — NPCI / NETC FASTag national toll-volume daily collector.
//
// SEPARATE daily Railway cron ≈06:30 UTC / 12:00 IST (Decision 3). NOT the
// 10-min news cron — failure isolation. NPCI's daily data publishes with a
// 3–4 day lag, so cron timing within the day doesn't matter; once-daily is
// sufficient. Reuses runSeed() for the distributed lock + freshness meta +
// exit-0 contract, but the data target is Railway PostgreSQL
// (india_fastag_toll_volumes); the canonical Redis key is a STATUS key only.
// Does NOT read news:digest:v1:india:en, does NOT touch the news pipeline or
// entity_timeline (Decision 11). No warm-up, no cookie, no TLS quirk (Decision 2).

import pg from 'pg';
import { upsertFastag } from './_fastag-upsert.mjs';
import {
  fetchDailyMonth,
  fetchMonthly,
  fiscalYearRangeFor,
  parseDailyPayload,
  parseMonthlyPayload,
  sanityCheckMonthly,
} from './_npci-source.mjs';
import { loadEnvFile, runSeed } from './_seed-utils.mjs';

loadEnvFile(import.meta.url); // MUST be first

const CANONICAL_KEY = 'news:fastag:v1:india'; // STATUS key only — data → PostgreSQL
const CACHE_TTL     = 86400;                   // daily

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Returns today's date components in IST (UTC+05:30) as UTC values, so
// getUTC* fields correctly reflect the IST wall-clock date.
function todayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const year      = ist.getUTCFullYear();
  const monthIdx  = ist.getUTCMonth(); // 0-based
  const monthName = MONTH_NAMES[monthIdx];
  const iso = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`;
  return { year, monthName, iso, date: ist };
}

async function fetchFastag() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[fastag] DATABASE_URL not set — skipping');
    return { written: 0 };
  }

  // Step 1: today in IST — drives both the daily month window and fiscal year.
  const now = todayIST();
  console.log(`[fastag] today_IST=${now.iso}  month=${now.monthName}  fy=${fiscalYearRangeFor(now.date)}`);

  // Step 2: fetch current calendar month's daily payload.
  const dailyJson   = await fetchDailyMonth({ year: now.year, monthName: now.monthName });

  // Step 3: fetch current fiscal year's monthly payload.
  const monthlyJson = await fetchMonthly(fiscalYearRangeFor(now.date));

  // Step 4: parse both payloads.
  const dailyRows   = parseDailyPayload(dailyJson);
  const monthlyRows = parseMonthlyPayload(monthlyJson);

  console.log(`[fastag] parsed: daily=${dailyRows.length} rows  monthly=${monthlyRows.length} rows`);

  if (dailyRows.length === 0 && monthlyRows.length === 0) {
    console.log('[fastag] API returned empty results for both payloads — exiting cleanly');
    return { written: 0 };
  }

  // Step 5: sanity-check monthly unit conversion before touching the database.
  if (monthlyRows.length > 0 && !sanityCheckMonthly(monthlyRows)) {
    return { written: 0, skipped: 'sanity-fail' };
  }

  // Step 6: combine + upsert.
  const rows   = dailyRows.concat(monthlyRows);
  const pool   = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  let written;
  try {
    written = await upsertFastag(pool, rows);
  } finally {
    await pool.end();
  }

  console.log(`[fastag] inserted ${written} new of ${rows.length} total (daily=${dailyRows.length} monthly=${monthlyRows.length})`);

  // Step 7: return summary → runSeed publishes this object to the Redis status key.
  return {
    fetched_daily:   dailyRows.length,
    fetched_monthly: monthlyRows.length,
    written,
    target_date:     now.iso,
  };
}

function validate(d) {
  return typeof d === 'object' && d !== null;
}

runSeed('india', 'fastag', CANONICAL_KEY, fetchFastag, {
  validateFn:    validate,
  ttlSeconds:    CACHE_TTL,
  sourceVersion: 'fastag-npci-json-v1',
}).catch((err) => {
  console.error('FATAL:', err.message || err);
  process.exit(0);
});
