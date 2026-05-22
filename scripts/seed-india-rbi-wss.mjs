#!/usr/bin/env node

// V2-019 — RBI WSS weekly collector.
//
// SEPARATE weekly Railway cron (Fri ~12:30 UTC / 18:00 IST — after release activates).
// NOT the 10-min news cron — failure isolation (Decision 3).
// Data target: Railway PostgreSQL (india_rbi_wss).
// Canonical Redis key is STATUS only — does NOT read news:digest:v1:india:en.

import pg from 'pg';
import { resolveLatestRelease, downloadWorkbook, parseWss } from './_rbi-wss-source.mjs';
import { loadEnvFile, runSeed } from './_seed-utils.mjs';

loadEnvFile(import.meta.url); // MUST be first

const CANONICAL_KEY = 'news:rbiwss:v1:india'; // STATUS key only — data → PostgreSQL
const CACHE_TTL = 604800; // 7 days (weekly)

// Decision 7: DO UPDATE supersede — RBI revises aggregates in later publications.
const UPSERT_SQL = `
INSERT INTO india_rbi_wss
  (release_date, bank_credit, aggregate_deposits, scb_as_on,
   currency_in_circulation, reserve_money, m3, monetary_as_on,
   forex_reserves_inr_cr, forex_reserves_usd_mn, forex_as_on, source, is_provisional)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'rbi_wss',TRUE)
ON CONFLICT (release_date) DO UPDATE
  SET bank_credit             = EXCLUDED.bank_credit,
      aggregate_deposits      = EXCLUDED.aggregate_deposits,
      scb_as_on               = EXCLUDED.scb_as_on,
      currency_in_circulation = EXCLUDED.currency_in_circulation,
      reserve_money           = EXCLUDED.reserve_money,
      m3                      = EXCLUDED.m3,
      monetary_as_on          = EXCLUDED.monetary_as_on,
      forex_reserves_inr_cr   = EXCLUDED.forex_reserves_inr_cr,
      forex_reserves_usd_mn   = EXCLUDED.forex_reserves_usd_mn,
      forex_as_on             = EXCLUDED.forex_as_on,
      updated_at              = NOW()
`;

// Most recent Friday computed in IST (UTC+05:30) so the calendar date matches
// the RBI release date regardless of where the cron host runs.
function latestFridayIST() {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  const dayIST = nowIST.getUTCDay(); // 0=Sun … 5=Fri … 6=Sat
  const daysBack = (dayIST - 5 + 7) % 7; // 0 when today is Friday
  const fridayIST = new Date(nowIST.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(fridayIST.getUTCFullYear(), fridayIST.getUTCMonth(), fridayIST.getUTCDate()),
  );
}

async function fetchWss() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[rbiwss] DATABASE_URL not set — skipping');
    return { written: 0 };
  }

  const fridayDate = latestFridayIST();
  const releaseDateStr = fridayDate.toISOString().slice(0, 10);

  // 1. Resolve XLSX link from RBI detail page
  const xlsxUrl = await resolveLatestRelease(fridayDate);
  if (!xlsxUrl) {
    // Decision 6: release not out yet / holiday week — write nothing, exit 0
    console.log(`[rbiwss] no release for ${releaseDateStr} (not yet published)`);
    return { written: 0 };
  }

  // 2. Download + parse (label-guarded — Decision 5)
  const buffer = await downloadWorkbook(xlsxUrl);
  const rec = parseWss(buffer);

  // 3. Upsert one row (Decision 7 DO UPDATE)
  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await pool.query(UPSERT_SQL, [
      releaseDateStr,
      rec.bank_credit             ?? null,
      rec.aggregate_deposits      ?? null,
      rec.scb_as_on               ?? null,
      rec.currency_in_circulation ?? null,
      rec.reserve_money           ?? null,
      rec.m3                      ?? null,
      rec.monetary_as_on          ?? null,
      rec.forex_reserves_inr_cr   ?? null,
      rec.forex_reserves_usd_mn   ?? null,
      rec.forex_as_on             ?? null,
    ]);
  } finally {
    await pool.end();
  }

  console.log(`[rbiwss] upserted release_date=${releaseDateStr}`);
  return { written: 1, release_date: releaseDateStr };
}

function validate(d) {
  return typeof d === 'object' && d !== null;
}

runSeed('india', 'rbiwss', CANONICAL_KEY, fetchWss, {
  validateFn: validate,
  ttlSeconds: CACHE_TTL,
  sourceVersion: 'rbiwss-xlsx-v1',
}).catch((err) => {
  console.error('FATAL:', err.message || err);
  process.exit(0);
});
