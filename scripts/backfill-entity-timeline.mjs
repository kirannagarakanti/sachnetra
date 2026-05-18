#!/usr/bin/env node
/**
 * One-time back-fill: fans out historical india_news_signals into entity_timeline.
 *
 * Run AFTER V2-013 thread_id back-fill so rows carry thread_id where available.
 * Pre-V2-013 rows will have thread_id=NULL — "evidence without narrative", still queryable.
 *
 * Idempotent: ON CONFLICT (entity_id, entity_type, cluster_hash) DO NOTHING.
 * Safe to re-run at any time.
 *
 * Usage: node scripts/backfill-entity-timeline.mjs
 */

import { loadEnvFile } from './_seed-utils.mjs';
import { fanOutEntities } from './_entity-fan-out.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);

const { Pool } = pg;

const CHUNK_SIZE = 500;   // cluster_hashes per batch
const LOG_EVERY  = 2000;  // log a progress line every N clusters (~10k rows at ~5 rows/cluster)

async function backfill() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_PUBLIC_URL not set. Add it to .env.local first.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    console.log('Connecting to Railway PostgreSQL...');
    await pool.query('SELECT 1');
    console.log('✓ Connected\n');

    // R4: iterate DISTINCT cluster_hash, not row-by-row (~8× fewer iterations)
    const { rows: hashRows } = await pool.query(
      `SELECT DISTINCT cluster_hash
       FROM india_news_signals
       WHERE cluster_hash IS NOT NULL
       ORDER BY cluster_hash`
    );

    const allHashes = hashRows.map(r => r.cluster_hash);
    const total = allHashes.length;

    if (total === 0) {
      console.log('[backfill] No clusters found — nothing to do.');
      return;
    }

    const chunks = Math.ceil(total / CHUNK_SIZE);
    console.log(`[backfill] ${total} distinct clusters | chunk size: ${CHUNK_SIZE} | ${chunks} batches\n`);

    let processed = 0;
    const startMs = Date.now();

    for (let i = 0; i < allHashes.length; i += CHUNK_SIZE) {
      const chunk = allHashes.slice(i, i + CHUNK_SIZE);
      await fanOutEntities(pool, chunk);
      processed += chunk.length;

      const isLastChunk = processed >= total;
      const hitLogBoundary = processed % LOG_EVERY === 0;

      if (hitLogBoundary || isLastChunk) {
        const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
        const pct     = ((processed / total) * 100).toFixed(1);
        console.log(`[backfill] progress: ${processed}/${total} clusters (${pct}%) — ${elapsed}s elapsed`);
      }
    }

    const totalSec = ((Date.now() - startMs) / 1000).toFixed(1);
    console.log(`\n[backfill] Done. ${total} clusters in ${totalSec}s.`);
    console.log('Run scripts/migrate-india-signals.mjs to verify entity_timeline row count.');
  } finally {
    await pool.end();
  }
}

backfill().catch(err => {
  console.error('[backfill] FATAL:', err.message);
  process.exit(1);
});
