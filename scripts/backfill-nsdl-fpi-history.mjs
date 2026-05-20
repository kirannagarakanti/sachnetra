#!/usr/bin/env node
// One-time backfill: NSDL FPI Monitor → india_institutional_flows
// Walks month-end dates from Jan 1999 → today, upserts FPI equity cash rows.
// Safe to re-run (idempotent via ON CONFLICT). Lijo runs this once against prod.

import pg from 'pg';
import { loadEnvFile, sleep } from './_seed-utils.mjs';
import { fetchHandshake, fetchMonthData } from './_nsdl-fpi-source.mjs';

loadEnvFile(import.meta.url);

// Research Appendix — confirmed from nsdl_post_response.html + live run (2026-05-21):
// Earliest month with actual data: Dec 2009 (1999–Nov 2009 return no data from NSDL).
const EARLIEST_YEAR = 1999;
const EARLIEST_MONTH = 1;

const DELAY_MS = 1500;          // ~1.5 s between requests — polite pacing (Decision 2)
const REHANDSHAKE_EVERY = 50;   // refresh ASP.NET viewstate every N requests
const PING_EVERY = 20;          // keep-alive DB ping every N months

// V2-017 exact upsert — source='nsdl' is highest trust, supersedes 'moneycontrol' (Decision 3).
// WHERE clause is unchanged from V2-017 Decision 4; is_provisional added to SET for correctness.
const UPSERT_SQL = `
  INSERT INTO india_institutional_flows
    (flow_date, investor_type, segment, gross_buy, gross_sell, net, source, is_provisional)
  VALUES ($1, 'FII', 'cash', $2, $3, $4, 'nsdl', FALSE)
  ON CONFLICT (flow_date, investor_type, segment) DO UPDATE
    SET gross_buy      = EXCLUDED.gross_buy,
        gross_sell     = EXCLUDED.gross_sell,
        net            = EXCLUDED.net,
        source         = EXCLUDED.source,
        is_provisional = EXCLUDED.is_provisional,
        updated_at     = NOW()
    WHERE india_institutional_flows.source = 'moneycontrol'
       OR EXCLUDED.source = india_institutional_flows.source
`;

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun',
                     'Jul','Aug','Sep','Oct','Nov','Dec'];

function monthEndDateStr(year, month) {
  // Last day of month — day 0 of next month in JS date (month is 1-based)
  const lastDay = new Date(year, month, 0).getDate();
  return `${String(lastDay).padStart(2, '0')}-${MONTH_NAMES[month - 1]}-${year}`;
}

function todayDateStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${MONTH_NAMES[d.getMonth()]}-${d.getFullYear()}`;
}

// Retry the upsert once on connection drop — pg.Pool creates a fresh connection automatically.
async function upsertWithRetry(pool, params) {
  try {
    return await pool.query(UPSERT_SQL, params);
  } catch (err) {
    if (/Connection terminated|connection|ECONNRESET|ETIMEDOUT/i.test(err.message)) {
      console.warn('[nsdl-backfill] DB connection lost, retrying in 3s...');
      await sleep(3000);
      return await pool.query(UPSERT_SQL, params);
    }
    throw err;
  }
}

async function main() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL is not set. Add it to .env.local first.');
    process.exit(1);
  }

  // Optional --from-year=YYYY flag to resume a partial run
  const fromYearArg = process.argv.find(a => a.startsWith('--from-year='));
  const fromYear = fromYearArg ? parseInt(fromYearArg.split('=')[1], 10) : EARLIEST_YEAR;

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    idleTimeoutMillis: 0,          // pool never kills idle connections
    connectionTimeoutMillis: 30_000,
  });

  // Dependency check: V2-017 must have run the migration first
  try {
    await pool.query('SELECT 1 FROM india_institutional_flows LIMIT 1');
  } catch {
    console.error('STOP: india_institutional_flows does not exist. Run V2-017 migration first.');
    await pool.end();
    process.exit(1);
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let handshake = await fetchHandshake();
  let requestCount = 0;
  let monthsWalked = 0;
  let monthsEmpty = 0;
  let rowsWritten = 0;
  let rowsSkipped = 0;

  console.log(`[nsdl-backfill] Walking ${fromYear === EARLIEST_YEAR ? `Jan ${EARLIEST_YEAR}` : `Jan ${fromYear} (resumed)`} → ${MONTH_NAMES[currentMonth - 1]} ${currentYear}`);
  console.log(`[nsdl-backfill] ~${((currentYear - fromYear) * 12 + currentMonth)} requests at ${DELAY_MS}ms pacing`);

  for (let year = fromYear; year <= currentYear; year++) {
    const startMonth = year === fromYear ? (fromYear === EARLIEST_YEAR ? EARLIEST_MONTH : 1) : 1;
    const endMonth = year === currentYear ? currentMonth : 12;
    let yearRows = 0;

    for (let month = startMonth; month <= endMonth; month++) {
      // Proactive re-handshake to avoid ASP.NET viewstate expiry over long walk
      if (requestCount > 0 && requestCount % REHANDSHAKE_EVERY === 0) {
        console.log(`[nsdl-backfill] Re-handshaking at request ${requestCount}...`);
        handshake = await fetchHandshake();
        // Ping DB to keep connection alive during long NSDL fetches
        await pool.query('SELECT 1').catch(() => {});
      } else if (monthsWalked > 0 && monthsWalked % PING_EVERY === 0) {
        await pool.query('SELECT 1').catch(() => {});
      }

      // Current month: query today; past months: query last day of month
      const dateStr = (year === currentYear && month === currentMonth)
        ? todayDateStr()
        : monthEndDateStr(year, month);

      let rows;
      try {
        rows = await fetchMonthData(handshake, dateStr);
        requestCount++;
      } catch (err) {
        // On failure, refresh handshake and retry once before skipping
        console.warn(`[nsdl-backfill] POST failed for ${dateStr}: ${err.message} — refreshing and retrying`);
        try {
          handshake = await fetchHandshake();
          rows = await fetchMonthData(handshake, dateStr);
          requestCount++;
        } catch (retryErr) {
          console.warn(`[nsdl-backfill] Retry failed for ${dateStr}: ${retryErr.message} — skipping month`);
          monthsEmpty++;
          await sleep(DELAY_MS);
          continue;
        }
      }

      if (!rows || rows.length === 0) {
        console.log(`[nsdl-backfill] no data ${MONTH_NAMES[month - 1]}-${year}`);
        monthsEmpty++;
        await sleep(DELAY_MS);
        continue;
      }

      for (const row of rows) {
        const result = await upsertWithRetry(pool, [
          row.flow_date,
          row.gross_buy,
          row.gross_sell,
          row.net,
        ]);
        if (result.rowCount > 0) {
          rowsWritten++;
          yearRows++;
        } else {
          rowsSkipped++; // existing nsdl row, WHERE guard blocked overwrite
        }
      }

      monthsWalked++;
      await sleep(DELAY_MS);
    }

    console.log(`[nsdl-backfill] ${year}: ${yearRows} rows written`);
  }

  await pool.end();

  console.log(`\n[nsdl-backfill] COMPLETE`);
  console.log(`  months_walked  : ${monthsWalked}`);
  console.log(`  months_empty   : ${monthsEmpty}`);
  console.log(`  rows_written   : ${rowsWritten}`);
  console.log(`  rows_skipped   : ${rowsSkipped}  (already-nsdl rows, no overwrite needed)`);
}

main().catch(err => {
  console.error('FATAL:', err.message || err);
  process.exit(1);
});
