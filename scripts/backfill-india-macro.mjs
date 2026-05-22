#!/usr/bin/env node

// V2-020 — BIS India macro rates one-time full-history backfill.
// One-time; Lijo runs against prod after migration; safe to re-run (DO UPDATE upsert).

import pg from 'pg';
import { loadEnvFile } from './_seed-utils.mjs';
import { SERIES, fetchSeries } from './_bis-india-source.mjs';

loadEnvFile(import.meta.url);

const FACT_UPSERT_SQL = `
INSERT INTO india_macro_rates (series_code, time_period, obs_value, source)
VALUES ($1, $2, $3, 'bis')
ON CONFLICT (series_code, time_period) DO UPDATE
  SET obs_value = EXCLUDED.obs_value,
      updated_at = NOW()
`;

const META_UPSERT_SQL = `
INSERT INTO india_macro_series_meta (series_code, dataset, sdmx_key, label, unit, frequency, revises)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (series_code) DO UPDATE
  SET label      = EXCLUDED.label,
      unit       = EXCLUDED.unit,
      frequency  = EXCLUDED.frequency,
      revises    = EXCLUDED.revises,
      updated_at = NOW()
`;

async function backfill() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_PUBLIC_URL is not set. Add it to .env.local first.');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    console.log('=== BIS India Macro — Full-History Backfill ===');
    console.log(`  Series: ${SERIES.length}`);
    console.log('');

    let totalWritten = 0;
    let totalFailed = 0;

    for (const s of SERIES) {
      try {
        // No startPeriod → BIS returns full history to inception (Decision 7)
        const obs = await fetchSeries({ dataset: s.dataset, key: s.key });
        let written = 0;
        for (const o of obs) {
          await pool.query(FACT_UPSERT_SQL, [s.series_code, o.time_period, o.obs_value]);
          written++;
        }
        console.log(`  ✓ ${s.series_code}: ${obs.length} fetched, ${written} upserted`);
        totalWritten += written;
      } catch (err) {
        console.error(`  ✗ SKIP ${s.series_code}: ${err.message}`);
        totalFailed++;
      }
    }

    // Refresh meta table from registry
    console.log('');
    for (const s of SERIES) {
      await pool.query(META_UPSERT_SQL, [
        s.series_code, s.dataset, s.key, s.label, s.unit, s.frequency, s.revises,
      ]);
    }
    console.log(`  ✓ india_macro_series_meta: ${SERIES.length} rows refreshed`);

    console.log('');
    console.log(`=== Done: ${totalWritten} rows upserted across ${SERIES.length - totalFailed} series; ${totalFailed} skipped ===`);
  } finally {
    await pool.end();
  }
}

backfill().catch((err) => {
  console.error('FATAL:', err.message || err);
  process.exit(1);
});
