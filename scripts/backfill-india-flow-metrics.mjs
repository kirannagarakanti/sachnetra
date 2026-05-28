#!/usr/bin/env node

// One-time; Lijo runs against prod; safe to re-run.
//
// Known limitation: daily cron only refreshes the latest as_of_date.
// If prior month flows are revised (e.g. NSDL supersede), re-run this backfill
// to refresh those rows.

import pg from 'pg';
import { loadEnvFile } from './_seed-utils.mjs';

loadEnvFile(import.meta.url);

const { Pool } = pg;

const BACKFILL_SQL = `
INSERT INTO india_flow_metrics
  (as_of_date, month_start, mtd_fii_net, mtd_dii_net,
   absorption_ratio, status, trading_days_mtd, computed_at)
SELECT
  a.as_of_date, a.month_start, a.mtd_fii_net, a.mtd_dii_net,
  a.absorption_ratio, a.status, a.trading_days_mtd, NOW()
FROM (
  SELECT DISTINCT flow_date
  FROM india_institutional_flows
  WHERE segment = 'cash'
) d
CROSS JOIN LATERAL india_flow_absorption_as_of(d.flow_date) a
WHERE a.as_of_date IS NOT NULL
ON CONFLICT (as_of_date) DO UPDATE SET
  month_start      = EXCLUDED.month_start,
  mtd_fii_net      = EXCLUDED.mtd_fii_net,
  mtd_dii_net      = EXCLUDED.mtd_dii_net,
  absorption_ratio = EXCLUDED.absorption_ratio,
  status           = EXCLUDED.status,
  trading_days_mtd = EXCLUDED.trading_days_mtd,
  computed_at      = NOW();
`;

async function main() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[backfill-metrics] DATABASE_URL or DATABASE_PUBLIC_URL is not set — skipping');
    process.exit(0);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Run the backfill statement.
    // If the database has not been migrated yet (missing table or function),
    // we catch the error, log a clear warning, and exit 0.
    const res = await pool.query(BACKFILL_SQL);
    const rowCount = res.rowCount || 0;

    const { rows: rangeRows } = await pool.query(
      'SELECT MIN(as_of_date)::text AS min_date, MAX(as_of_date)::text AS max_date FROM india_flow_metrics'
    );
    const minDate = rangeRows[0]?.min_date || 'N/A';
    const maxDate = rangeRows[0]?.max_date || 'N/A';

    console.log(`[backfill-metrics] upserted ${rowCount} rows; range ${minDate} → ${maxDate}`);
  } catch (err) {
    // Undefined table (42P01) or Undefined function (42883)
    if (err.code === '42P01' || err.code === '42883' || err.message.includes('does not exist')) {
      console.log('[backfill-metrics] Table or function missing (migration not run yet) — skipping backfill.');
    } else {
      console.error('[backfill-metrics] Unexpected error during backfill:', err.message || err);
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('FATAL:', err.message || err);
  process.exit(0); // Exit 0 always per contract
});
