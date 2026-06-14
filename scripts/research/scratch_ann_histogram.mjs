#!/usr/bin/env node
// READ-ONLY scratch: daily announcement histogram (last 50 days) to tell a
// stalled cron (hard cliff) from a results-season lull (taper).
import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';
loadEnvFile(import.meta.url);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const { rows } = await pool.query(
  `SELECT to_char((announced_at AT TIME ZONE 'Asia/Kolkata')::date,'YYYY-MM-DD') AS d,
          count(*)::int AS all_rows,
          count(*) FILTER (WHERE lower(category) ~ 'financial result|unaudited|audited.*result|quarterly result'
                              OR lower(subject)  ~ 'financial result|unaudited|audited.*result|quarterly result')::int AS results
     FROM india_bourse_announcements
    WHERE announced_at >= now() - interval '50 days'
    GROUP BY 1 ORDER BY 1 DESC`);
await pool.end();
console.log('date         all   results');
for (const r of rows) console.log(`${r.d}  ${String(r.all_rows).padStart(5)}  ${String(r.results).padStart(5)}`);
console.log(`\n(${rows.length} days with data in last 50)`);
