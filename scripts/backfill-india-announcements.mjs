#!/usr/bin/env node

// V2-018 — one-time NSE bourse-announcements 30-day backfill (Decision 3).
//
// Lijo runs this against prod, post-review. Safe to re-run any time —
// idempotent via the Decision 4 ON CONFLICT (source, announcement_id) DO
// NOTHING upsert. Walks the last 30 days in ~7-day windows (weekly chunking
// avoids one ~27k-row response and is politer to NSE than a single giant call),
// re-warming the cookie on a 401/403 wall.
//
// Standalone (no runSeed / no lock): a manual one-shot, not a cron.

import pg from 'pg';
import { upsertAnnouncements } from './_announcements-upsert.mjs';
import { fetchNSEAnnouncements, warmUpNSE } from './_nse-announcements-source.mjs';
import { loadEnvFile, sleep } from './_seed-utils.mjs';

loadEnvFile(import.meta.url); // MUST be first

const BACKFILL_DAYS = 30;
const CHUNK_DAYS = 7;
const CHUNK_PAUSE_MS = 1000; // polite gap between chunks

// IST = UTC+05:30. NSE wants DD-MM-YYYY (recon A1).
function istDateParam(date) {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const dd = String(ist.getUTCDate()).padStart(2, '0');
  const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = ist.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function isCookieWall(err) {
  return /HTTP 40[13]/.test(String(err?.message || ''));
}

// Build [{from, to}] chunks walking BACKFILL_DAYS back in CHUNK_DAYS windows.
// Windows are inclusive and adjacent days overlap by one at the seams; the
// append-only upsert makes that free.
function buildChunks(now) {
  const chunks = [];
  for (let offset = 0; offset < BACKFILL_DAYS; offset += CHUNK_DAYS) {
    const to = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    const fromOffset = Math.min(offset + CHUNK_DAYS, BACKFILL_DAYS);
    const from = new Date(now.getTime() - fromOffset * 24 * 60 * 60 * 1000);
    chunks.push({ fromDate: istDateParam(from), toDate: istDateParam(to) });
  }
  return chunks;
}

async function fetchChunkWithRewarm(chunk, cookieRef) {
  try {
    return await fetchNSEAnnouncements({ ...chunk, cookie: cookieRef.cookie });
  } catch (err) {
    if (!isCookieWall(err)) throw err;
    console.warn(`[backfill] cookie wall (${err.message}) — re-warming`);
    cookieRef.cookie = await warmUpNSE();
    return fetchNSEAnnouncements({ ...chunk, cookie: cookieRef.cookie });
  }
}

async function backfill() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_PUBLIC_URL is not set. Add it to .env.local first.');
    process.exit(1);
  }

  const cookieRef = { cookie: await warmUpNSE() };
  const chunks = buildChunks(new Date());

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query('SELECT 1');
    console.log(`[backfill] start — ${BACKFILL_DAYS} days in ${chunks.length} chunk(s) of ~${CHUNK_DAYS}d`);

    let totalFetched = 0;
    let totalInserted = 0;
    for (const [i, chunk] of chunks.entries()) {
      const window = `${chunk.fromDate}→${chunk.toDate}`;
      console.log(`[backfill] chunk ${i + 1}/${chunks.length} ${window} — fetching…`);
      const rows = await fetchChunkWithRewarm(chunk, cookieRef);

      const inserted = await upsertAnnouncements(pool, rows); // batched, idempotent

      totalFetched += rows.length;
      totalInserted += inserted;
      console.log(`[backfill]   → fetched ${rows.length}, inserted ${inserted} (skipped ${rows.length - inserted})`);

      if (i < chunks.length - 1) await sleep(CHUNK_PAUSE_MS);
    }

    console.log(`[backfill] done — fetched ${totalFetched}, inserted ${totalInserted}, skipped ${totalFetched - totalInserted} (idempotent; safe to re-run)`);
  } finally {
    await pool.end();
  }
}

backfill().catch((err) => {
  console.error('Backfill failed:', err.message || err);
  process.exit(1);
});
