#!/usr/bin/env node

// V2-026 — POSOCO / Grid-India electricity demand one-time backfill.
//
// ONE-TIME; Lijo runs against prod, post-review. Safe to re-run any time —
// idempotent via ON CONFLICT (target_date, row_type, entity_name) DO NOTHING.
// Lookback floor is 2023-01-01 per the XLS boundary (V2-026 Decision 6);
// pre-Jan-2023 files are PDF-only and out of scope for this script.
//
// Walk: fiscal year "2022-23" month 1 (= Jan 2023) → current calendar month,
// in chronological order. For each calendar month: list files via the Grid-India
// Web API, download each .xls, parse Section A + C, upsert to PostgreSQL.
// .pdf files are skipped. ~200ms sleep between file downloads (politeness).
//
// Standalone (no runSeed / no lock): a manual one-shot, not a cron.

import pg from 'pg';
import { upsertElectricity } from './_electricity-upsert.mjs';
import {
  downloadXls,
  fiscalYearFor,
  listFilesForMonth,
  parseDailyPsp,
} from './_grid-india-source.mjs';
import { loadEnvFile, sleep } from './_seed-utils.mjs';

loadEnvFile(import.meta.url); // MUST be first

// XLS boundary: Grid-India started publishing .xls files in January 2023.
// Pre-2023 is PDF-only (V2-026 Decision 6). Starting at "2022-23" month 1
// means we begin at January 2023 and skip the Apr–Dec 2022 portion of that FY.
const START_PERIOD_YEAR = '2022-23';
const START_MONTH       = 1;   // January (calendar month)
const FILE_PAUSE_MS     = 200; // polite gap between individual file downloads

// Generate all (periodYear, month) pairs from the XLS floor to today, in
// chronological order. Months within a fiscal year run Apr(4) → Mar(3).
function* fiscalMonthRange() {
  const now          = new Date();
  const currentFY    = fiscalYearFor(now);
  const currentMonth = now.getUTCMonth() + 1;

  let fyStart = Number(START_PERIOD_YEAR.split('-')[0]); // 2022
  let month   = START_MONTH;                             // 1

  while (true) {
    const periodYear = `${fyStart}-${String(fyStart + 1).slice(-2)}`;

    // Stop if we have gone past the current calendar month.
    if (periodYear > currentFY) break;
    if (periodYear === currentFY && month > currentMonth) break;

    yield { periodYear, month };

    // Stop after yielding the current month.
    if (periodYear === currentFY && month === currentMonth) break;

    // Advance one calendar month in the fiscal sequence (Apr→Mar):
    if (month === 3) {
      // March = end of fiscal year → next FY starts at April.
      fyStart++;
      month = 4;
    } else if (month === 12) {
      // December → January (still the same fiscal year).
      month = 1;
    } else {
      month++;
    }
  }
}

// One retry on transient TLS / network errors (Grid-India certs can flap).
// The second failure propagates to the caller, which logs and skips the file.
async function downloadWithRetry(filePath) {
  try {
    return await downloadXls(filePath);
  } catch (firstErr) {
    const msg         = String(firstErr?.message || '');
    const isTransient = /ECONNRESET|TLS|certificate|socket|timeout|ETIMEDOUT|fetch failed/i.test(msg);
    if (!isTransient) throw firstErr;
    console.warn(`[backfill]     transient error — retrying once: ${msg.slice(0, 80)}`);
    return await downloadXls(filePath);
  }
}

async function backfill() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_PUBLIC_URL is not set. Add it to .env.local first.');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pool.query('SELECT 1');
    console.log('[backfill] connected to Railway PostgreSQL');
    console.log(`[backfill] start — floor=${START_PERIOD_YEAR}/0${START_MONTH} (Jan 2023 XLS boundary, V2-026 Decision 6)`);

    let grandFetched  = 0;
    let grandInserted = 0;
    let grandFiles    = 0;

    for (const { periodYear, month } of fiscalMonthRange()) {
      const mm = String(month).padStart(2, '0');
      console.log(`\n[backfill] ── ${periodYear} month=${mm} ──`);

      // List files for this fiscal month; skip the month on API failure.
      let files;
      try {
        files = await listFilesForMonth({ periodYear, month });
      } catch (err) {
        console.warn(`[backfill]   listFilesForMonth failed: ${err.message} — skipping month`);
        continue;
      }

      const xlsFiles = files.filter((f) => String(f.FilePath ?? '').toLowerCase().endsWith('.xls'));
      console.log(`[backfill]   ${files.length} file(s) listed, ${xlsFiles.length} XLS (${files.length - xlsFiles.length} PDF skipped)`);

      if (xlsFiles.length === 0) {
        console.log(`[backfill]   no XLS for ${periodYear} month=${mm} — skipping`);
        continue;
      }

      let monthFetched  = 0;
      let monthInserted = 0;

      for (const [fi, file] of xlsFiles.entries()) {
        const name = file.FilePath.split('/').pop();

        // Download with one retry on transient errors.
        let buf;
        try {
          buf = await downloadWithRetry(file.FilePath);
        } catch (err) {
          console.warn(`[backfill]   SKIP ${name} (download failed): ${err.message}`);
          if (fi < xlsFiles.length - 1) await sleep(FILE_PAUSE_MS);
          continue;
        }

        // Parse Section A + C.
        let rows;
        try {
          rows = parseDailyPsp(buf);
        } catch (err) {
          console.warn(`[backfill]   SKIP ${name} (parse error): ${err.message}`);
          if (fi < xlsFiles.length - 1) await sleep(FILE_PAUSE_MS);
          continue;
        }

        // Upsert — idempotent, DO NOTHING on conflict.
        const inserted = await upsertElectricity(pool, rows);
        const skipped  = rows.length - inserted;
        monthFetched  += rows.length;
        monthInserted += inserted;
        grandFiles    += 1;
        console.log(`[backfill]   ${name}: parsed=${rows.length} inserted=${inserted} skipped=${skipped}`);

        if (fi < xlsFiles.length - 1) await sleep(FILE_PAUSE_MS);
      }

      grandFetched  += monthFetched;
      grandInserted += monthInserted;
      console.log(`[backfill]   month total: parsed=${monthFetched} inserted=${monthInserted} skipped=${monthFetched - monthInserted}`);
    }

    console.log('\n[backfill] ══ DONE ══');
    console.log(`[backfill] files processed : ${grandFiles}`);
    console.log(`[backfill] rows parsed     : ${grandFetched}`);
    console.log(`[backfill] rows inserted   : ${grandInserted}`);
    console.log(`[backfill] rows skipped    : ${grandFetched - grandInserted}  (already present — idempotent)`);
    console.log('[backfill] safe to re-run; skipped rows are already in india_electricity_demand');
  } finally {
    await pool.end();
  }
}

backfill().catch((err) => {
  console.error('Backfill failed:', err.message || err);
  process.exit(1);
});
