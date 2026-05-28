#!/usr/bin/env node

// V2-017c — read-only health check for the FII/DII flow pipeline.
//
// Runs three SELECTs (NO writes — safe to run anytime):
//   1. Current-month row counts + latest date by investor_type — the Go/No-Go gate
//      (the absorption ratio is meaningful only when BOTH FII and DII are present).
//   2. All-time row shape by investor_type — shows the FII-only history situation.
//   3. View-vs-table consistency on the latest date — only if the migration has run.
//
// Prints the connection HOST only (never the password) so the target DB is
// confirmable against the env-drift hazard (a `*.railway.internal` host won't
// resolve off-Railway). Makes no changes.

import pg from 'pg';
import { loadEnvFile } from './_seed-utils.mjs';

loadEnvFile(import.meta.url);

const { Pool } = pg;

function describeTarget(connectionString) {
  try {
    const u = new URL(connectionString);
    return `${u.hostname}:${u.port || '5432'}${u.pathname}`;
  } catch {
    return '(unparseable connection string)';
  }
}

async function main() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_PUBLIC_URL is not set in .env.local.');
    process.exit(1);
  }

  console.log(`[health] target: ${describeTarget(connectionString)}`);

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pool.query('SELECT 1');
    console.log('[health] connected\n');

    // 1. Current-month gate
    const { rows: month } = await pool.query(`
      SELECT investor_type,
             COUNT(*)             AS rows_this_month,
             MAX(flow_date)::text AS latest
      FROM india_institutional_flows
      WHERE segment = 'cash'
        AND flow_date >= date_trunc('month', CURRENT_DATE)::date
      GROUP BY investor_type
      ORDER BY investor_type;
    `);
    console.log('== Current month (Go/No-Go gate) ==');
    if (month.length === 0) {
      console.log('  (no rows this month)');
    } else {
      for (const r of month) {
        console.log(`  ${r.investor_type.padEnd(4)} rows=${r.rows_this_month}  latest=${r.latest}`);
      }
    }
    const hasFII = month.some((r) => r.investor_type === 'FII' && Number(r.rows_this_month) > 0);
    const hasDII = month.some((r) => r.investor_type === 'DII' && Number(r.rows_this_month) > 0);
    const missing = `${hasFII ? '' : 'FII '}${hasDII ? '' : 'DII'}`.trim();
    console.log(
      `  VERDICT: ${hasFII && hasDII ? 'PASS — both FII and DII present' : `FAIL — missing ${missing}`}`,
    );
    console.log('  (absorption ratio is only meaningful when this PASSes)\n');

    // 2. All-time shape
    const { rows: all } = await pool.query(`
      SELECT investor_type,
             COUNT(*)             AS total_rows,
             MIN(flow_date)::text AS earliest,
             MAX(flow_date)::text AS latest
      FROM india_institutional_flows
      WHERE segment = 'cash'
      GROUP BY investor_type
      ORDER BY investor_type;
    `);
    console.log('== All-time row shape ==');
    if (all.length === 0) {
      console.log('  (table empty)');
    } else {
      for (const r of all) {
        console.log(`  ${r.investor_type.padEnd(4)} total=${r.total_rows}  ${r.earliest} -> ${r.latest}`);
      }
    }
    console.log('');

    // 3. View-vs-table consistency (only if migrated)
    console.log('== View vs table (latest date) ==');
    try {
      const { rows: cons } = await pool.query(`
        SELECT v.as_of_date::text   AS as_of_date,
               v.absorption_ratio   AS view_ratio,
               v.status             AS status,
               m.absorption_ratio   AS table_ratio
        FROM india_flow_absorption_v1 v
        LEFT JOIN india_flow_metrics m USING (as_of_date);
      `);
      if (cons.length === 0) {
        console.log('  (view returned no rows)');
      } else {
        for (const r of cons) {
          const match = String(r.view_ratio) === String(r.table_ratio) ? 'match' : 'MISMATCH';
          console.log(
            `  as_of=${r.as_of_date}  view=${r.view_ratio}  table=${r.table_ratio}  status=${r.status}  [${match}]`,
          );
        }
      }
    } catch (err) {
      if (err.code === '42P01' || err.code === '42883' || (err.message || '').includes('does not exist')) {
        console.log('  (view/table/function not present yet — run migrate-india-signals.mjs first)');
      } else {
        throw err;
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[health] error:', err.message || err);
  process.exit(1);
});
