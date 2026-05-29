#!/usr/bin/env node
//
// G4 disk-full cleanup runner — trims research_prices back to the legitimate
// Nifty-50 universe and reclaims disk. Node equivalent of
// scripts/research/cleanup-midcap-research-prices.sql (psql isn't installed here).
//
// CONTEXT
//   The G4 backfill filled the SHARED prod Railway volume ("No space left on
//   device") and crashed Postgres. Incident: §8 of
//   ai_docs/sachnetra v2/wiki/syntheses/strategy_reset_and_data_foundation_2026-05-29.md
//   Handoff: ai_docs/tasks/G4_incident_recovery_handoff.md
//
// WHY A NODE RUNNER (not the .sql / Railway web console)
//   - psql isn't installed on this machine.
//   - The Railway web data console misreports multi-row SELECTs as "0 rows" and
//     won't hold BEGIN/COMMIT across statements — so the pre-check looks empty
//     and the transaction safety net is moot there.
//   - Deriving the KEEP set from shared/market-taxonomy.json at runtime means the
//     symbol list CANNOT drift from the source of truth (no hand-typed tickers).
//
// ⚠ ORDER OF OPERATIONS — do NOT skip:
//   1. GROW the Railway volume FIRST. The DB is in a disk-full crash loop and
//      won't even accept connections until it has headroom; VACUUM FULL also
//      needs free disk to rewrite the table.
//   2. Confirm Postgres is healthy + live seed crons recovered.
//   3. THEN: --precheck  →  --delete  →  --vacuum  (in that order).
//
// SAFETY
//   - Touches ONLY research_prices. No india_* / sacred tables.
//   - Default (no flag) = --precheck, which is READ-ONLY. Nothing is deleted
//     unless you pass --delete; nothing is rewritten unless you pass --vacuum.
//   - --delete runs inside a transaction and aborts (ROLLBACK) on any anomaly.
//
// USAGE (run each stage, read the output between them)
//   node scripts/research/cleanup-midcap-research-prices.mjs            # read-only pre-check
//   node scripts/research/cleanup-midcap-research-prices.mjs --precheck # same, explicit
//   node scripts/research/cleanup-midcap-research-prices.mjs --delete   # transactional DELETE (asks nothing — gated by checks)
//   node scripts/research/cleanup-midcap-research-prices.mjs --vacuum   # VACUUM FULL research_prices
//
// Requires DATABASE_URL or DATABASE_PUBLIC_URL in .env.local (same as the backfills).

import { loadEnvFile, loadSharedConfig } from '../_seed-utils.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const args = process.argv.slice(2);
const DO_DELETE = args.includes('--delete');
const DO_VACUUM = args.includes('--vacuum');
// Anything else (including --precheck or no args) = read-only pre-check.

// ── KEEP set: '^NSEI' + every nifty50_registry ticker (source of truth) ─────
// Identical derivation to scripts/research/backfill-research-prices.mjs:52-54.
const taxonomy = loadSharedConfig('market-taxonomy.json');
const constituents = (taxonomy.nifty50_registry || []).map((r) => r.ticker);
const KEEP = ['^NSEI', ...constituents];

function assertSaneKeepSet() {
  if (KEEP.length < 40) {
    throw new Error(
      `KEEP set has only ${KEEP.length} symbols — expected ~48. ` +
        'market-taxonomy.json may be wrong/empty. Aborting to avoid deleting good rows.',
    );
  }
}

async function precheck(pool) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)                                          AS total_rows,
       COUNT(*) FILTER (WHERE symbol = ANY($1))          AS would_keep,
       COUNT(*) FILTER (WHERE NOT (symbol = ANY($1)))    AS would_delete,
       COUNT(DISTINCT symbol) FILTER (WHERE symbol = ANY($1))       AS keep_symbols,
       COUNT(DISTINCT symbol) FILTER (WHERE NOT (symbol = ANY($1))) AS delete_symbols
     FROM research_prices`,
    [KEEP],
  );
  const r = rows[0];
  console.log('=== PRE-CHECK (read-only) ===');
  console.log(`  KEEP set:        ${KEEP.length} symbols (^NSEI + ${constituents.length} Nifty-50)`);
  console.log(`  total rows:      ${r.total_rows}`);
  console.log(`  would KEEP:      ${r.would_keep}  (${r.keep_symbols} distinct symbols)`);
  console.log(`  would DELETE:    ${r.would_delete}  (${r.delete_symbols} distinct symbols)`);

  const toDelete = await pool.query(
    `SELECT symbol, COUNT(*) AS bars
       FROM research_prices
      WHERE NOT (symbol = ANY($1))
      GROUP BY symbol ORDER BY symbol`,
    [KEEP],
  );
  if (toDelete.rows.length) {
    console.log(`\n  Symbols that WOULD be deleted (${toDelete.rows.length}) — confirm all are non-Nifty-50:`);
    for (const row of toDelete.rows) console.log(`    ${row.symbol.padEnd(16)} ${row.bars} bars`);
  } else {
    console.log('\n  Nothing to delete — table already matches the KEEP set.');
  }
  return r;
}

async function runDelete(pool) {
  const before = await precheck(pool);
  if (Number(before.would_delete) === 0) {
    console.log('\n  Nothing to delete. Exiting without changes.');
    return;
  }
  if (Number(before.would_keep) === 0) {
    throw new Error('would_keep is 0 — refusing to delete (that would empty the table). Check the KEEP set.');
  }

  console.log('\n=== DELETE (transactional) ===');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const del = await client.query(`DELETE FROM research_prices WHERE NOT (symbol = ANY($1))`, [KEEP]);
    console.log(`  deleted rows:    ${del.rowCount}`);
    if (del.rowCount !== Number(before.would_delete)) {
      throw new Error(
        `deleted ${del.rowCount} but pre-check said ${before.would_delete} — mismatch, rolling back.`,
      );
    }
    const { rows } = await client.query(
      `SELECT COUNT(*) AS remaining, COUNT(DISTINCT symbol) AS symbols FROM research_prices`,
    );
    console.log(`  remaining rows:  ${rows[0].remaining}  (${rows[0].symbols} symbols)`);
    if (Number(rows[0].remaining) !== Number(before.would_keep)) {
      throw new Error(
        `remaining ${rows[0].remaining} != expected ${before.would_keep} — rolling back.`,
      );
    }
    await client.query('COMMIT');
    console.log('  ✓ COMMITTED. Now run with --vacuum to reclaim disk.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`  ✗ ROLLED BACK: ${err.message}`);
    throw err;
  } finally {
    client.release();
  }
}

async function runVacuum(pool) {
  console.log('=== VACUUM FULL research_prices ===');
  console.log('  (rewrites the table; needs free disk; takes an ACCESS EXCLUSIVE lock briefly)');
  await pool.query('VACUUM FULL research_prices'); // cannot run inside a transaction
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS rows, COUNT(DISTINCT symbol) AS symbols, MAX(trade_date) AS latest,
            pg_size_pretty(pg_total_relation_size('research_prices')) AS table_size
       FROM research_prices`,
  );
  console.log(`  ✓ done. rows=${rows[0].rows} symbols=${rows[0].symbols} latest=${rows[0].latest} size=${rows[0].table_size}`);
}

async function main() {
  assertSaneKeepSet();
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_PUBLIC_URL not set in .env.local');
    process.exit(1);
  }
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await pool.query('SELECT 1'); // fails fast with a clear error if the DB is still down
    if (DO_VACUUM) await runVacuum(pool);
    else if (DO_DELETE) await runDelete(pool);
    else await precheck(pool);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('\nCleanup failed:', err.message);
  if (/ECONNRESET|ECONNREFUSED|timeout/i.test(err.message)) {
    console.error('→ The DB looks unreachable. It is likely still in the disk-full crash loop.');
    console.error('  GROW the Railway volume first, confirm it recovers, THEN re-run this.');
  }
  process.exit(1);
});
