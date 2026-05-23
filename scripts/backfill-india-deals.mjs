#!/usr/bin/env node

// V2-030 — one-time NSE bulk & block deals backfill (Decision 5).
//
// Lijo runs this against prod, post-review. Safe to re-run any time —
// idempotent via ON CONFLICT (deal_id) DO NOTHING (Decision 4). Walks history
// in ~7-day windows for BOTH bulk_deals and block_deals, re-warming the cookie
// on a 401/403 wall. Lookback length is a CLI arg (default 30d; Lijo typically
// runs 30–90d for an initial seed).
//
//   node scripts/backfill-india-deals.mjs          # 30-day default
//   node scripts/backfill-india-deals.mjs 90       # 90-day run
//
// Standalone (no runSeed / no lock): a manual one-shot, not a cron.

import pg from 'pg';
import { upsertDeals } from './_deals-upsert.mjs';
import { fetchDeals, parseDealsCsv, warmUpNSE } from './_nse-deals-source.mjs';
import { loadEnvFile, sleep } from './_seed-utils.mjs';

loadEnvFile(import.meta.url); // MUST be first

const BACKFILL_DAYS     = Number(process.argv[2]) || 30;
const CHUNK_DAYS        = 7;
const CHUNK_PAUSE_MS    = 1000; // polite gap between chunks
const DEAL_TYPE_PAUSE_MS = 1500; // gap between bulk→block within a chunk (NSE bot settle)

const DEAL_TYPES = [
  { apiType: 'bulk_deals',  label: 'bulk' },
  { apiType: 'block_deals', label: 'block' },
];

// IST = UTC+05:30. NSE wants DD-MM-YYYY.
function istDateParam(date) {
  const ist  = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const dd   = String(ist.getUTCDate()).padStart(2, '0');
  const mm   = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = ist.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// NSE's bot protection sometimes hangs the connection and times out instead of
// returning 401/403. Treat TimeoutError the same as a cookie wall — re-warm
// once and retry.
function isRetryable(err) {
  const msg = String(err?.message || '');
  return /HTTP 40[13]/.test(msg)
    || err?.name === 'TimeoutError'
    || /aborted due to timeout/i.test(msg);
}

// Build [{fromDate, toDate}] walking BACKFILL_DAYS back in CHUNK_DAYS windows.
// Adjacent windows overlap by one day at the seam; the DO NOTHING upsert makes
// that free.
function buildChunks(now) {
  const chunks = [];
  for (let offset = 0; offset < BACKFILL_DAYS; offset += CHUNK_DAYS) {
    const to          = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    const fromOffset  = Math.min(offset + CHUNK_DAYS, BACKFILL_DAYS);
    const from        = new Date(now.getTime() - fromOffset * 24 * 60 * 60 * 1000);
    chunks.push({ fromDate: istDateParam(from), toDate: istDateParam(to) });
  }
  return chunks;
}

async function fetchChunkWithRewarm({ apiType, label, fromDate, toDate, cookieRef }) {
  try {
    return await fetchDeals({ dealType: apiType, fromDate, toDate, cookie: cookieRef.cookie });
  } catch (err) {
    if (!isRetryable(err)) throw err;
    console.warn(`[backfill:${label}] retryable error (${err.message}) — re-warming`);
    cookieRef.cookie = await warmUpNSE();
    return fetchDeals({ dealType: apiType, fromDate, toDate, cookie: cookieRef.cookie });
  }
}

async function backfill() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_PUBLIC_URL is not set. Add it to .env.local first.');
    process.exit(1);
  }

  const cookieRef = { cookie: await warmUpNSE() };
  const chunks    = buildChunks(new Date());

  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pool.query('SELECT 1');
    console.log(
      `[backfill] start — ${BACKFILL_DAYS} days in ${chunks.length} chunk(s) of ~${CHUNK_DAYS}d` +
      ` × ${DEAL_TYPES.length} deal types`,
    );

    let totalFetched  = 0;
    let totalInserted = 0;

    for (const [i, chunk] of chunks.entries()) {
      const window = `${chunk.fromDate}→${chunk.toDate}`;

      for (const [di, { apiType, label }] of DEAL_TYPES.entries()) {
        if (di > 0) await sleep(DEAL_TYPE_PAUSE_MS);
        console.log(`[backfill:${label}] chunk ${i + 1}/${chunks.length} ${window} — fetching…`);

        const csvText = await fetchChunkWithRewarm({
          apiType, label, fromDate: chunk.fromDate, toDate: chunk.toDate, cookieRef,
        });

        const rows = parseDealsCsv(csvText, label);

        if (rows.length === 0) {
          console.log(`[backfill:${label}]   → no rows (weekend/holiday or none filed)`);
          continue;
        }

        const inserted = await upsertDeals(pool, rows);

        totalFetched  += rows.length;
        totalInserted += inserted;
        console.log(
          `[backfill:${label}]   → fetched ${rows.length}, inserted ${inserted}` +
          ` (skipped ${rows.length - inserted})`,
        );
      }

      if (i < chunks.length - 1) await sleep(CHUNK_PAUSE_MS);
    }

    console.log(
      `[backfill] done — fetched ${totalFetched}, inserted ${totalInserted},` +
      ` skipped ${totalFetched - totalInserted} (idempotent; safe to re-run)`,
    );
  } finally {
    await pool.end();
  }
}

backfill().catch((err) => {
  console.error('Backfill failed:', err.message || err);
  process.exit(1);
});
