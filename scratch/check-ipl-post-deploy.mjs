#!/usr/bin/env node
import pg from 'pg';
import { loadEnvFile } from '../scripts/_seed-utils.mjs';

loadEnvFile(import.meta.url);
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const q = await pool.query(`
  SELECT COUNT(*) FILTER (WHERE 'IPL' = ANY(nse_tickers)) AS ipl_tagged,
         COUNT(*) AS total
  FROM india_news_signals
  WHERE scraped_at >= '2026-05-27 10:00:00+00'
`);
console.log('Since May 27 10:00 UTC:', q.rows[0]);

const q2 = await pool.query(`
  SELECT scraped_at, left(headline, 80) AS headline, nse_tickers
  FROM india_news_signals
  WHERE scraped_at >= '2026-05-28 00:00:00+00'
    AND 'IPL' = ANY(nse_tickers)
  ORDER BY scraped_at DESC
  LIMIT 5
`);
console.log('Recent IPL-tagged May 28:', q2.rows);

const q3 = await pool.query(`
  SELECT nse_tickers[1] AS ticker, COUNT(*)::int AS n
  FROM india_news_signals
  WHERE scraped_at >= '2026-05-28 00:00:00+00'
    AND COALESCE(array_length(nse_tickers, 1), 0) > 0
  GROUP BY 1
  ORDER BY n DESC
  LIMIT 10
`);
console.log('Top tickers May 28 only (post-deploy slice):', q3.rows);

const q4 = await pool.query(`
  SELECT COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE COALESCE(array_length(nse_tickers, 1), 0) > 0)::int AS tagged
  FROM india_news_signals
  WHERE scraped_at >= '2026-05-28 00:00:00+00'
`);
const r4 = q4.rows[0];
console.log(`May 28 coverage: ${r4.tagged}/${r4.total} = ${((r4.tagged / r4.total) * 100).toFixed(2)}%`);

await pool.end();
