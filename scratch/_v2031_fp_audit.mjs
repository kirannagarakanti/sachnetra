#!/usr/bin/env node
// READ-ONLY audit: which tickers dominate nse_tickers_v2, and do the
// single-word-alias suspects fire on unrelated headlines (COALINDIA-class FPs)?
import pg from 'pg';
import { loadEnvFile } from '../scripts/_seed-utils.mjs';

loadEnvFile(import.meta.url);

const SUSPECTS = [
  'SKIPPER', 'TRENT', 'MIDWESTLTD', 'NILE', 'CUPID', 'ANTGRAPHIC', 'LUXIND',
  'MANORAMA', 'AXISBANK', 'VIPULLTD', 'PRITI', 'MOHITIND', 'ANMOL',
  'SUMEETINDS', 'SHINDL', 'KAYA', 'ARCHIES', 'TRIDENT', 'UNITECH',
  'GRANULES', 'HUBTOWN', 'SOBHA', 'ASTRAL',
];

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log('=== TOP 25 tickers by nse_tickers_v2 volume (with 2 samples each) ===');
  const { rows: top } = await pool.query(`
    SELECT t AS ticker, count(*)::int AS n FROM india_news_signals, unnest(nse_tickers_v2) t
    GROUP BY t ORDER BY n DESC LIMIT 25`);
  for (const { ticker, n } of top) {
    const { rows: s } = await pool.query(
      `SELECT left(headline,95) AS h FROM india_news_signals
        WHERE nse_tickers_v2 @> ARRAY[$1]::text[] ORDER BY random() LIMIT 2`, [ticker]);
    console.log(`${ticker.padEnd(12)} ${String(n).padStart(5)}  | ${s.map((r) => r.h).join('  || ')}`);
  }

  console.log('\n=== SUSPECT single-word-alias tickers (count + 3 samples) ===');
  for (const t of SUSPECTS) {
    const { rows: [{ n }] } = await pool.query(
      `SELECT count(*)::int AS n FROM india_news_signals WHERE nse_tickers_v2 @> ARRAY[$1]::text[]`, [t]);
    if (Number(n) === 0) { console.log(`${t.padEnd(12)}     0`); continue; }
    const { rows: s } = await pool.query(
      `SELECT left(headline,100) AS h FROM india_news_signals
        WHERE nse_tickers_v2 @> ARRAY[$1]::text[] ORDER BY random() LIMIT 3`, [t]);
    console.log(`${t.padEnd(12)} ${String(n).padStart(5)}`);
    for (const r of s) console.log(`              · ${r.h}`);
  }
} finally {
  await pool.end();
}
