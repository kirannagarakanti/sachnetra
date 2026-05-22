#!/usr/bin/env node

// V2-018 — NSE bourse-announcements hourly collector.
//
// SEPARATE hourly Railway cron (Decision 2). NOT the 10-min news cron —
// failure isolation. The alpha is "leads news by hours", so hourly captures
// each filing within ~1h; a once-daily run would throw away the lead time.
// Reuses runSeed() for the distributed lock + freshness meta + exit-0
// contract, but the data target is Railway PostgreSQL
// (india_bourse_announcements); the canonical Redis key is a STATUS key only.
// Does NOT read news:digest:v1:india:en, does NOT touch the news pipeline or
// entity_timeline (Decision 6).

import pg from 'pg';
import { upsertAnnouncements } from './_announcements-upsert.mjs';
import { fetchNSEAnnouncements, warmUpNSE } from './_nse-announcements-source.mjs';
import { loadEnvFile, runSeed } from './_seed-utils.mjs';

loadEnvFile(import.meta.url); // MUST be first

const CANONICAL_KEY = 'news:announcements:v1:india'; // STATUS key only — data → PostgreSQL
const CACHE_TTL = 3600; // hourly

// IST = UTC+05:30. Format a Date as DD-MM-YYYY in IST (NSE's required param
// shape — recon A1), so the 2-day window is correct regardless of server TZ.
function istDateParam(date) {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const dd = String(ist.getUTCDate()).padStart(2, '0');
  const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = ist.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// 401/403 means the warmed cookie was rejected/expired (Decision 1) — worth one
// re-warm + retry. Other errors bubble straight to runSeed's graceful-fail.
function isCookieWall(err) {
  return /HTTP 40[13]/.test(String(err?.message || ''));
}

async function fetchAnnouncements() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[announcements] DATABASE_URL not set — skipping');
    return { written: 0 };
  }

  // 2-day IST window: yesterday → today, so a filing straddling the midnight /
  // run boundary is never missed; the append-only upsert makes the overlap free.
  const now = new Date();
  const fromDate = istDateParam(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const toDate = istDateParam(now);
  const window = `${fromDate}→${toDate}`;

  let cookie = await warmUpNSE();
  let rows;
  try {
    rows = await fetchNSEAnnouncements({ fromDate, toDate, cookie });
  } catch (err) {
    if (!isCookieWall(err)) throw err; // real failure → runSeed graceful-fail
    console.warn(`[announcements] cookie wall (${err.message}) — re-warming once`);
    cookie = await warmUpNSE();
    rows = await fetchNSEAnnouncements({ fromDate, toDate, cookie }); // persistent fail bubbles
  }

  if (rows.length === 0) {
    console.log(`[announcements] no new rows for ${window} (weekend/holiday or none filed)`);
    return { written: 0 };
  }

  console.log(`[announcements] fetched ${rows.length} for ${window} — upserting…`);

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const written = await upsertAnnouncements(pool, rows); // batched, idempotent
    const latest = rows.reduce(
      (m, r) => (!m || r.announced_at > m ? r.announced_at : m),
      null,
    );
    console.log(`[announcements] inserted ${written} new of ${rows.length} for ${window}; latest ${latest}`);
    return { fetched: rows.length, written, latest };
  } finally {
    await pool.end();
  }
}

function validate(d) {
  return typeof d === 'object' && d !== null;
}

runSeed('india', 'announcements', CANONICAL_KEY, fetchAnnouncements, {
  validateFn: validate,
  ttlSeconds: CACHE_TTL,
  sourceVersion: 'announcements-nse-v1',
}).catch((err) => {
  console.error('FATAL:', err.message || err);
  process.exit(0);
});
