#!/usr/bin/env node
//
// READ-ONLY data check for india_bourse_announcements (V2-018 NSE collector).
// Answers: where does the earnings-announcement data come from, and what's the
// latest? Prints (1) overall coverage, (2) the results-classified subset Exp16
// uses, (3) the most recent results filings. SELECTs only — safe on prod.
//
//   node scripts/research/check-earnings-announcements.mjs

import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

// Same buckets Exp16 / Exp2 use to classify a filing as an earnings result.
const RESULTS_RE = "(lower(category) ~ 'financial result|unaudited|audited.*result|quarterly result' OR lower(subject) ~ 'financial result|unaudited|audited.*result|quarterly result')";

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set in .env.local'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // 1) Overall coverage
  const { rows: [tot] } = await pool.query(
    `SELECT count(*)::int AS rows,
            count(DISTINCT symbol)::int AS symbols,
            count(DISTINCT source)::int AS sources,
            to_char(min(announced_at),'YYYY-MM-DD HH24:MI') AS first_ann,
            to_char(max(announced_at),'YYYY-MM-DD HH24:MI') AS last_ann
       FROM india_bourse_announcements`);

  const { rows: bySource } = await pool.query(
    `SELECT source, count(*)::int AS rows FROM india_bourse_announcements GROUP BY source ORDER BY rows DESC`);

  // 2) Results-classified subset (the earnings-announcement reports Exp16 uses)
  const { rows: [res] } = await pool.query(
    `SELECT count(*)::int AS rows,
            count(DISTINCT symbol)::int AS symbols,
            to_char(min(announced_at),'YYYY-MM-DD') AS first_ann,
            to_char(max(announced_at),'YYYY-MM-DD') AS last_ann
       FROM india_bourse_announcements WHERE ${RESULTS_RE}`);

  // 3) Latest 15 results filings
  const { rows: latest } = await pool.query(
    `SELECT to_char((announced_at AT TIME ZONE 'Asia/Kolkata'),'YYYY-MM-DD HH24:MI') AS ist,
            symbol, company_name, category,
            left(coalesce(subject,''),70) AS subject,
            (attachment_url IS NOT NULL) AS has_pdf
       FROM india_bourse_announcements
      WHERE ${RESULTS_RE}
      ORDER BY announced_at DESC LIMIT 15`);

  await pool.end();

  console.log('=== india_bourse_announcements — data check ===\n');
  console.log('ALL announcements:');
  console.log(`  rows=${tot.rows}  symbols=${tot.symbols}  sources=${tot.sources}`);
  console.log(`  span: ${tot.first_ann}  →  ${tot.last_ann} (IST instants stored as timestamptz)`);
  console.log(`  by source: ${bySource.map((s) => `${s.source}=${s.rows}`).join(', ')}\n`);

  console.log('RESULTS-classified subset (earnings reports — what Exp16 trades on):');
  console.log(`  rows=${res.rows}  symbols=${res.symbols}  span: ${res.first_ann} → ${res.last_ann}\n`);

  console.log('Latest 15 results filings:');
  for (const r of latest) {
    console.log(`  ${r.ist}  ${String(r.symbol ?? '').padEnd(12)} ${r.has_pdf ? 'PDF' : '   '} ${String(r.category ?? '').slice(0, 28).padEnd(28)} ${r.subject}`);
  }
  console.log('\nDone.');
}

main().catch((e) => { console.error('Check failed:', e.message); process.exit(1); });
