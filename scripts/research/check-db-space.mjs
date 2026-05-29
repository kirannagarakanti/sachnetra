#!/usr/bin/env node
// READ-ONLY db space diagnostic. No writes. Created 2026-05-29 after a disk-full event.
import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';
loadEnvFile(import.meta.url);
const { Pool } = pg;

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('No DATABASE_PUBLIC_URL'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    const dbSize = await pool.query(`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`);
    console.log(`\nTotal database size: ${dbSize.rows[0].size}\n`);

    const tables = await pool.query(`
      SELECT relname AS table,
             pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
             pg_total_relation_size(c.oid) AS bytes
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r' AND n.nspname = 'public'
      ORDER BY pg_total_relation_size(c.oid) DESC
      LIMIT 12
    `);
    console.log('Largest tables:');
    console.log('  table                              total_size');
    console.log('  ─────────────────────────────────  ──────────');
    tables.rows.forEach((r) => {
      console.log(`  ${String(r.table).padEnd(34)} ${r.total_size}`);
    });

    const rp = await pool.query(`SELECT COUNT(*)::int AS rows, COUNT(DISTINCT symbol)::int AS symbols, MAX(trade_date)::text AS latest FROM research_prices`);
    console.log(`\nresearch_prices: ${rp.rows[0].rows} rows · ${rp.rows[0].symbols} symbols · latest ${rp.rows[0].latest}`);
  } finally {
    await pool.end();
  }
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
