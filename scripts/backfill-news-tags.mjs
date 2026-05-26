#!/usr/bin/env node

// V2-031 G1+G2 — ONE-TIME backfill of india_news_signals.nse_tickers_v2 shadow
// column from the new equity-master tagger.
//
// Lijo runs this against prod, AFTER:
//   (1) Phase 1 migration has added the nse_tickers_v2 TEXT[] column
//   (2) The forward tagger has been live ≥24h
//   (3) Decision 7 coverage gate (≥20% on the 48h window) has been verified
//
// Safe to re-run any time — the WHERE nse_tickers_v2 IS NULL guard does double
// duty (loop termination + resume-safety). On a re-run, only rows that haven't
// been written to v2 yet get processed.
//
// Reads from nse_tickers stay UNCHANGED throughout. The cutover (UPDATE +
// DROP COLUMN, Decision 8) is a separate manual SQL step after the
// verification window.

import pg from 'pg';
import { performance } from 'node:perf_hooks';
import { extractCompanies } from './_india-market-keywords.mjs';
import { loadEnvFile } from './_seed-utils.mjs';

loadEnvFile(import.meta.url); // MUST be first — populates DATABASE_URL

const BATCH_SIZE = 500;

async function backfill() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_PUBLIC_URL not set. Add it to .env.local first.');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const t0 = performance.now();
  try {
    await pool.query('SELECT 1');

    // Snapshot for context — total rows + initial state of the shadow column.
    const { rows: [snap] } = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE nse_tickers_v2 IS NULL) AS pending,
        COUNT(*) FILTER (WHERE nse_tickers_v2 IS NOT NULL) AS already_done
      FROM india_news_signals
    `);
    console.log(`[backfill] start — total: ${snap.total}, pending: ${snap.pending}, already-done: ${snap.already_done}`);

    let batchNum = 0;
    let totalProcessed = 0;
    let totalTagged = 0;

    while (true) {
      // NO OFFSET — IS NULL guard shrinks the result set as each batch's
      // UPDATEs land, so the next SELECT naturally picks up the next batch.
      const { rows } = await pool.query(`
        SELECT id, headline FROM india_news_signals
         WHERE nse_tickers_v2 IS NULL
         ORDER BY id
         LIMIT $1
      `, [BATCH_SIZE]);

      if (rows.length === 0) break;
      batchNum++;

      const client = await pool.connect();
      let batchTagged = 0;
      try {
        await client.query('BEGIN');
        for (const r of rows) {
          const tags = extractCompanies(r.headline || '').map((c) => c.ticker);
          if (tags.length > 0) batchTagged++;
          // ALWAYS write — even an empty array — so the IS NULL guard advances
          // and no-tag rows don't loop forever.
          await client.query(
            'UPDATE india_news_signals SET nse_tickers_v2 = $1::text[] WHERE id = $2',
            [tags, r.id]
          );
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }

      totalProcessed += rows.length;
      totalTagged += batchTagged;
      const cov = ((100 * totalTagged) / totalProcessed).toFixed(2);
      console.log(`[backfill] batch ${batchNum}: processed ${rows.length}, tagged ${batchTagged} (cum: ${totalTagged}, coverage: ${cov}%)`);
    }

    const elapsedSec = ((performance.now() - t0) / 1000).toFixed(1);
    if (totalProcessed === 0) {
      console.log(`[backfill] done — no rows needed processing (already-done: ${snap.already_done}). Elapsed: ${elapsedSec}s`);
    } else {
      const finalCov = ((100 * totalTagged) / totalProcessed).toFixed(2);
      console.log(`[backfill] done — ${totalProcessed} rows processed, ${totalTagged} tagged (coverage: ${finalCov}%), ${batchNum} batches, ${elapsedSec}s wall-clock`);
    }
  } finally {
    await pool.end();
  }
}

backfill().catch((err) => {
  console.error('[backfill] FAILED:', err);
  process.exit(1);
});
