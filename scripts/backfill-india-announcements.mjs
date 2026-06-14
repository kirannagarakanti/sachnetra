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

// Window is parametrizable so this one script can fill a cron-stall gap precisely
// (e.g. --days=10) or a specific historical range (--from/--to), not just a fixed
// 30 days. Defaults are unchanged: a bare run still backfills the last 30 days.
//   node scripts/backfill-india-announcements.mjs                 # last 30 days (default)
//   node scripts/backfill-india-announcements.mjs --days=10       # last 10 days (gap fill)
//   node scripts/backfill-india-announcements.mjs --from=30-05-2026 --to=05-06-2026
const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const BACKFILL_DAYS = Number(flag('days', '30'));
const FROM = flag('from', null); // DD-MM-YYYY (inclusive) — explicit-range override
const TO = flag('to', null);     // DD-MM-YYYY (inclusive)
const CHUNK_DAYS = 7;
const CHUNK_PAUSE_MS = 1000; // polite gap between chunks

const DDMMYYYY_RE = /^(\d{2})-(\d{2})-(\d{4})$/;
// Parse a DD-MM-YYYY param to a noon-UTC Date (anchor avoids TZ edges; istDateParam reproduces the date).
function parseDdMmYyyy(s) {
  const m = DDMMYYYY_RE.exec(String(s).trim());
  if (!m) throw new Error(`bad date "${s}" — expected DD-MM-YYYY`);
  return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0));
}

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

// Build [{from, to}] chunks of ~CHUNK_DAYS, walking back from `anchorTo` for
// `totalDays`. Windows are inclusive and adjacent days overlap by one at the
// seams; the append-only upsert makes that free.
function buildChunks(anchorTo, totalDays) {
  const chunks = [];
  for (let offset = 0; offset < totalDays; offset += CHUNK_DAYS) {
    const to = new Date(anchorTo.getTime() - offset * 24 * 60 * 60 * 1000);
    const fromOffset = Math.min(offset + CHUNK_DAYS, totalDays);
    const from = new Date(anchorTo.getTime() - fromOffset * 24 * 60 * 60 * 1000);
    chunks.push({ fromDate: istDateParam(from), toDate: istDateParam(to) });
  }
  return chunks;
}

// Resolve the requested window into (anchorTo, totalDays) for buildChunks.
// Explicit --from/--to wins; otherwise it's `--days` back from now.
function resolveWindow(now) {
  if (FROM || TO) {
    if (!(FROM && TO)) throw new Error('--from and --to must be given together');
    const fromD = parseDdMmYyyy(FROM), toD = parseDdMmYyyy(TO);
    const days = Math.ceil((toD.getTime() - fromD.getTime()) / 864e5) + 1;
    if (days < 1) throw new Error('--from must be on or before --to');
    return { anchorTo: toD, totalDays: days, label: `${FROM}→${TO} (${days}d)` };
  }
  return { anchorTo: now, totalDays: BACKFILL_DAYS, label: `last ${BACKFILL_DAYS}d` };
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

  const { anchorTo, totalDays, label } = resolveWindow(new Date());
  const cookieRef = { cookie: await warmUpNSE() };
  const chunks = buildChunks(anchorTo, totalDays);

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query('SELECT 1');
    console.log(`[backfill] start — window ${label} in ${chunks.length} chunk(s) of ~${CHUNK_DAYS}d`);

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
