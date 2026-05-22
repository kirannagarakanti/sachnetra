#!/usr/bin/env node

// V2-020 — BIS India macro rates weekly collector.
//
// SEPARATE weekly Railway cron (Decision 3). NOT the 10-min news cron — failure
// isolation. Reuses runSeed() for lock + freshness meta + exit-0 contract, but the
// data target is Railway PostgreSQL (india_macro_rates + india_macro_series_meta);
// CANONICAL_KEY is a STATUS key only. Does NOT read news:digest:v1:india:en.

import pg from 'pg';
import { loadEnvFile, runSeed } from './_seed-utils.mjs';
import { SERIES, fetchAllSeries } from './_bis-india-source.mjs';

loadEnvFile(import.meta.url); // MUST be first

const CANONICAL_KEY = 'news:macro:v1:india'; // STATUS key only — data → PostgreSQL
const CACHE_TTL = 604800; // weekly
const LOOKBACK_YEARS = 3; // rolling revision window (Decision 7)

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

async function fetchMacro() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[macro] DATABASE_URL not set — skipping');
    return { series: 0, written: 0, latest: null };
  }

  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    const startPeriod = String(new Date().getFullYear() - LOOKBACK_YEARS);
    const { rows, okCount, failCount } = await fetchAllSeries({ startPeriod });

    if (okCount === 0) throw new Error(`All ${failCount} BIS series failed`);

    let written = 0;
    for (const r of rows) {
      await pool.query(FACT_UPSERT_SQL, [r.series_code, r.time_period, r.obs_value]);
      written++;
    }

    for (const s of SERIES) {
      await pool.query(META_UPSERT_SQL, [
        s.series_code, s.dataset, s.key, s.label, s.unit, s.frequency, s.revises,
      ]);
    }

    const latest = rows.reduce((m, r) => (r.time_period > m ? r.time_period : m), rows[0]?.time_period ?? '');
    console.log(`[macro] ${okCount} series ok, ${failCount} skipped, ${written} rows written; latest ${latest}`);
    return { series: okCount, written, latest };
  } finally {
    await pool.end();
  }
}

function validate(d) {
  return typeof d === 'object' && d !== null;
}

runSeed('india', 'macro', CANONICAL_KEY, fetchMacro, {
  validateFn: validate,
  ttlSeconds: CACHE_TTL,
  sourceVersion: 'macro-bis-sdmx-v1',
}).catch((err) => {
  console.error('FATAL:', err.message || err);
  process.exit(0);
});
