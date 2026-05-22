#!/usr/bin/env node

// one-time; Lijo runs against prod; safe to re-run; ~5-yr window — older layouts out of scope.
//
// V2-019 — RBI WSS ~5-year backfill.
// Walks past Fridays newest→oldest, resolves the XLSX link, downloads, parses,
// and upserts each release. Missing/empty weeks are logged and skipped.
// Idempotent via ON CONFLICT DO UPDATE — safe to re-run after interruption.

import pg from 'pg';
import { resolveLatestRelease, downloadWorkbook, parseWss } from './_rbi-wss-source.mjs';
import { loadEnvFile, sleep } from './_seed-utils.mjs';

loadEnvFile(import.meta.url);

const YEARS_BACK = 5;
const SLEEP_MS = 1500; // polite pacing — one release every ~1.5 s

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

// Build the list of Friday UTC-midnight Dates from ~YEARS_BACK ago to most recent,
// newest first. Computed in IST so calendar dates match RBI release dates.
function generateFridays(yearsBack) {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  const dayIST = nowIST.getUTCDay();
  const daysBack = (dayIST - 5 + 7) % 7;
  const latestIST = new Date(nowIST.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const latest = new Date(
    Date.UTC(latestIST.getUTCFullYear(), latestIST.getUTCMonth(), latestIST.getUTCDate()),
  );

  const cutoff = new Date(
    Date.UTC(latest.getUTCFullYear() - yearsBack, latest.getUTCMonth(), latest.getUTCDate()),
  );

  const fridays = [];
  let d = latest;
  while (d >= cutoff) {
    fridays.push(new Date(d));
    d = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  return fridays; // newest → oldest
}

async function main() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_PUBLIC_URL not set — add to .env.local');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  const fridays = generateFridays(YEARS_BACK);
  const total = fridays.length;
  console.log(`RBI WSS backfill: ${total} Fridays (~${YEARS_BACK} years), newest first`);
  console.log('Safe to interrupt and re-run — upsert is idempotent.\n');

  let upserted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < total; i++) {
    const fridayDate = fridays[i];
    const releaseDateStr = fridayDate.toISOString().slice(0, 10);
    const prefix = `  [${String(i + 1).padStart(3)}/${total}] ${releaseDateStr}`;

    // Step 1: resolve XLSX link
    let xlsxUrl;
    try {
      xlsxUrl = await resolveLatestRelease(fridayDate);
    } catch (err) {
      console.log(`${prefix}: detail page error — ${err.message}`);
      errors++;
      await sleep(SLEEP_MS);
      continue;
    }

    if (!xlsxUrl) {
      console.log(`${prefix}: no release (holiday or gap — skipping)`);
      skipped++;
      await sleep(SLEEP_MS);
      continue;
    }

    // Step 2: download + parse
    let rec;
    try {
      const buffer = await downloadWorkbook(xlsxUrl);
      rec = parseWss(buffer);
    } catch (err) {
      console.log(`${prefix}: download/parse error — ${err.message}`);
      errors++;
      await sleep(SLEEP_MS);
      continue;
    }

    // Step 3: upsert
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
      console.log(`${prefix}: upserted`);
      upserted++;
    } catch (err) {
      console.log(`${prefix}: DB upsert error — ${err.message}`);
      errors++;
    }

    if (i < total - 1) await sleep(SLEEP_MS);
  }

  await pool.end();

  console.log(`\n=== Backfill complete ===`);
  console.log(`  Upserted : ${upserted}`);
  console.log(`  Skipped  : ${skipped}  (holiday / no release)`);
  console.log(`  Errors   : ${errors}`);
  console.log(`  Total    : ${total}`);
}

main().catch((err) => {
  console.error('FATAL:', err.message || err);
  process.exit(1);
});
