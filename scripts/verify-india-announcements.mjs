#!/usr/bin/env node

// V2-018 — read-only verification for india_bourse_announcements.
//
// Runs the post-backfill sanity checks via pg directly, so result rows print to
// the terminal — Railway's Data console renders scalar aggregates but fails to
// display multi-row result sets. SELECT-only; writes nothing. Safe to run any
// time. Lijo runs against prod (read-only is within the self-check boundary).

import pg from 'pg';
import { loadEnvFile } from './_seed-utils.mjs';

loadEnvFile(import.meta.url); // MUST be first

async function verify() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_PUBLIC_URL is not set.');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    const { rows: [counts] } = await pool.query(`
      SELECT COUNT(*)                                        AS total,
             COUNT(*) FILTER (WHERE attachment_url IS NOT NULL) AS with_pdf,
             COUNT(DISTINCT category)                        AS categories,
             COUNT(DISTINCT symbol)                          AS symbols,
             MIN(announced_at)                               AS oldest,
             MAX(announced_at)                               AS newest
      FROM india_bourse_announcements
    `);

    console.log('\n=== india_bourse_announcements — verification ===');
    console.log(`  total rows      : ${counts.total}`);
    console.log(`  with PDF (V2-015): ${counts.with_pdf}  (${counts.total > 0 ? ((counts.with_pdf / counts.total) * 100).toFixed(1) : 0}%)`);
    console.log(`  distinct category: ${counts.categories}`);
    console.log(`  distinct symbol  : ${counts.symbols}`);
    console.log(`  oldest announced : ${counts.oldest?.toISOString?.() ?? counts.oldest}`);
    console.log(`  newest announced : ${counts.newest?.toISOString?.() ?? counts.newest}`);

    const { rows: dups } = await pool.query(`
      SELECT source, announcement_id, COUNT(*) AS n
      FROM india_bourse_announcements
      GROUP BY source, announcement_id HAVING COUNT(*) > 1
    `);

    const { rows: topCats } = await pool.query(`
      SELECT category, COUNT(*) AS n
      FROM india_bourse_announcements
      GROUP BY category ORDER BY n DESC LIMIT 10
    `);
    console.log('\n  top categories:');
    for (const c of topCats) {
      console.log(`    ${String(c.n).padStart(6)}  ${c.category ?? '(null)'}`);
    }

    const { rows: sample } = await pool.query(`
      SELECT symbol, category, announced_at
      FROM india_bourse_announcements
      ORDER BY announced_at DESC LIMIT 5
    `);
    console.log('\n  5 most recent:');
    for (const r of sample) {
      console.log(`    ${r.announced_at?.toISOString?.() ?? r.announced_at}  ${String(r.symbol ?? '').padEnd(12)}  ${r.category ?? ''}`);
    }

    // Pass/fail summary
    const pass = Number(counts.total) > 0 && dups.length === 0;
    console.log('\n  checks:');
    console.log(`    rows present       : ${Number(counts.total) > 0 ? 'PASS' : 'FAIL'}`);
    console.log(`    no duplicate PKs   : ${dups.length === 0 ? 'PASS' : `FAIL (${dups.length} dup keys)`}`);
    console.log(`    PDF coverage       : ${counts.with_pdf === counts.total ? 'PASS (100%)' : `partial (${counts.with_pdf}/${counts.total})`}`);
    console.log(`\n=== ${pass ? 'VERIFICATION PASSED' : 'VERIFICATION FAILED'} ===\n`);
  } finally {
    await pool.end();
  }
}

verify().catch((err) => {
  console.error('Verify failed:', err.message || err);
  process.exit(1);
});
