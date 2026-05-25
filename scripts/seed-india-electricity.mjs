#!/usr/bin/env node

// V2-026 — POSOCO / Grid-India daily electricity demand collector.
//
// SEPARATE daily Railway cron ≈05:30 UTC / 11:00 IST (Decision 3). NOT the
// 10-min news cron — failure isolation. Grid-India publishes yesterday's PSP
// report at 09:30–10:30 IST; the 11:00 IST run always catches it. Reuses
// runSeed() for the distributed lock + freshness meta + exit-0 contract, but
// the data target is Railway PostgreSQL (india_electricity_demand); the
// canonical Redis key is a STATUS key only. Does NOT read
// news:digest:v1:india:en, does NOT touch the news pipeline or entity_timeline
// (Decision 11).

import pg from 'pg';
import { upsertElectricity } from './_electricity-upsert.mjs';
import {
  downloadXls,
  fiscalYearFor,
  listFilesForMonth,
  parseDailyPsp,
  pickXlsForDate,
} from './_grid-india-source.mjs';
import { loadEnvFile, runSeed } from './_seed-utils.mjs';

loadEnvFile(import.meta.url); // MUST be first

const CANONICAL_KEY = 'news:electricity:v1:india'; // STATUS key only — data → PostgreSQL
const CACHE_TTL     = 86400;                        // daily

// target_date = today in IST minus 1 day.
// The PSP report published today covers yesterday's data (Decision 7).
function yesterdayIST() {
  const now  = new Date();
  const ist  = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const yest = new Date(ist.getTime() - 24 * 60 * 60 * 1000);
  return yest; // UTC Date whose getUTC* fields represent yesterday in IST
}

// Extract the data date encoded in a PSP filename.
// "files/grdw/2026/05/23.05.26_NLDC_PSP_282.xls" → "2026-05-23"
function dateFromFilename(filePath) {
  const name = String(filePath).split('/').pop();
  const m    = name.match(/^(\d{2})\.(\d{2})\.(\d{2})_NLDC_PSP_/);
  if (!m) return null;
  return `20${m[3]}-${m[2]}-${m[1]}`; // dd mm yy → YYYY-MM-DD
}

async function fetchElectricity() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[electricity] DATABASE_URL not set — skipping');
    return { written: 0 };
  }

  // Step 1: target_date = today_IST - 1 day (Decision 7)
  const targetDateObj = yesterdayIST();
  const targetDate    = targetDateObj.toISOString().split('T')[0];

  // Step 2: fiscal context for the API request
  const periodYear = fiscalYearFor(targetDateObj);
  const month      = targetDateObj.getUTCMonth() + 1;

  console.log(`[electricity] target_date=${targetDate}  fiscalYear=${periodYear}  month=${String(month).padStart(2, '0')}`);

  // Step 3: list files for this calendar month
  const files = await listFilesForMonth({ periodYear, month });
  console.log(`[electricity] listFilesForMonth → ${files.length} file(s)`);

  // Step 4: pick the XLS matching target_date (latest revision if multiple)
  const xlsFile = pickXlsForDate(files, targetDateObj);
  if (!xlsFile) {
    console.log(`[electricity] no XLS for target_date ${targetDate} yet (publish delay or holiday) — exiting cleanly`);
    return { written: 0 };
  }

  console.log(`[electricity] downloading ${xlsFile.FilePath}`);

  // Step 5: download raw XLS bytes
  const buf = await downloadXls(xlsFile.FilePath);

  // Step 6: parse Section A (6 region/national rows) + Section C (36–39 state rows)
  const rows = parseDailyPsp(buf);

  // Decision 7 cross-check: filename date should equal in-file target_date.
  // Trust in-file value; warn on mismatch (not an error).
  const fileDate   = dateFromFilename(xlsFile.FilePath);
  const inFileDate = rows[0]?.target_date ?? null;
  if (fileDate && inFileDate && fileDate !== inFileDate) {
    console.warn(
      `[electricity] WARNING: filename date ${fileDate} ≠ in-file target_date ${inFileDate} — trusting in-file value`,
    );
  }

  if (rows.length === 0) {
    console.log('[electricity] parser returned 0 rows — exiting cleanly');
    return { written: 0 };
  }

  console.log(`[electricity] parsed ${rows.length} rows (target_date=${inFileDate}) — upserting…`);

  // Step 7: upsert to PostgreSQL — batched, idempotent (ON CONFLICT DO NOTHING)
  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  let written;
  try {
    written = await upsertElectricity(pool, rows);
  } finally {
    await pool.end();
  }

  console.log(`[electricity] inserted ${written} new of ${rows.length} for ${inFileDate}`);

  // Step 8: return summary → runSeed publishes this object to the Redis status key
  return { fetched: rows.length, written, target_date: inFileDate };
}

function validate(d) {
  return typeof d === 'object' && d !== null;
}

runSeed('india', 'electricity', CANONICAL_KEY, fetchElectricity, {
  validateFn:    validate,
  ttlSeconds:    CACHE_TTL,
  sourceVersion: 'electricity-grid-india-xls-v1',
}).catch((err) => {
  console.error('FATAL:', err.message || err);
  process.exit(0);
});
