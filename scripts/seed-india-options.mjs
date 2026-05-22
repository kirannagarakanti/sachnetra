#!/usr/bin/env node

// V2-024 — NSE options chain EOD collector.
//
// Separate daily Railway cron (≈10:30 UTC / 16:00 IST — after market close;
// Decision 2). NOT the 10-min news cron. Captures NIFTY / BANKNIFTY / FINNIFTY,
// nearest 3 expiries each (Decision 5). Data → PostgreSQL (india_options_oi);
// the canonical Redis key is a STATUS key only. Does NOT read
// news:digest:v1:india:en. No backfill — live-only source (Decision 6).

import pg from 'pg';
import { loadEnvFile, runSeed, sleep } from './_seed-utils.mjs';
import {
  warmUpNSE,
  fetchContractInfo,
  fetchOptionChainV3,
  computeAggregates,
} from './_nse-options-source.mjs';

loadEnvFile(import.meta.url); // MUST be first

const CANONICAL_KEY = 'news:options:v1:india'; // STATUS key only — data → PostgreSQL
const CACHE_TTL     = 86400;                    // daily

const SYMBOLS             = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
const EXPIRIES_PER_SYMBOL = 3; // front weekly + next + monthly term structure

// Decision 8: idempotent upsert — same-day re-run refreshes the row, not duplicates.
const UPSERT_SQL = `
INSERT INTO india_options_oi
  (snapshot_date, symbol, expiry_date, underlying, total_ce_oi, total_pe_oi, pcr,
   max_pain, atm_strike, atm_ce_iv, atm_pe_iv, snapshot_ts, source)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'nse')
ON CONFLICT (snapshot_date, symbol, expiry_date) DO UPDATE
  SET underlying  = EXCLUDED.underlying,
      total_ce_oi = EXCLUDED.total_ce_oi, total_pe_oi = EXCLUDED.total_pe_oi,
      pcr         = EXCLUDED.pcr,         max_pain    = EXCLUDED.max_pain,
      atm_strike  = EXCLUDED.atm_strike,
      atm_ce_iv   = EXCLUDED.atm_ce_iv,   atm_pe_iv   = EXCLUDED.atm_pe_iv,
      snapshot_ts = EXCLUDED.snapshot_ts, updated_at  = NOW();
`;

// Current date in IST (YYYY-MM-DD). Canadian locale returns ISO 8601 format.
function todayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

// 'DD-Mon-YYYY' (from contract-info expiryDates) → 'YYYY-MM-DD' for PostgreSQL.
const MONTHS = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};
function expiryToDate(ddMonYyyy) {
  const m = ddMonYyyy.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const mon = MONTHS[m[2]];
  return mon ? `${m[3]}-${mon}-${m[1]}` : null;
}

// Attempt fetchContractInfo; on 401/403 re-warm cookie once and retry.
async function contractInfoWithReWarm(symbol, cookie, reWarm) {
  try {
    return await fetchContractInfo(symbol, cookie);
  } catch (err) {
    if (/HTTP (401|403)/.test(err.message)) {
      console.log(`  [options] cookie expired for ${symbol} contract-info — re-warming`);
      const fresh = await reWarm();
      await sleep(1000);
      return { expiryDates: await fetchContractInfo(symbol, fresh), cookie: fresh };
    }
    throw err;
  }
}

// Attempt fetchOptionChainV3; on 401/403 re-warm cookie once and retry.
async function chainV3WithReWarm(args, reWarm) {
  try {
    return { chain: await fetchOptionChainV3(args), cookie: args.cookie };
  } catch (err) {
    if (/HTTP (401|403)/.test(err.message)) {
      console.log(`  [options] cookie expired for ${args.symbol}/${args.expiry} — re-warming`);
      const fresh = await reWarm();
      await sleep(1000);
      return { chain: await fetchOptionChainV3({ ...args, cookie: fresh }), cookie: fresh };
    }
    throw err;
  }
}

async function fetchOptions() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[options] DATABASE_URL not set — skipping');
    return { written: 0 };
  }

  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    const today = todayIST();
    let cookie   = await warmUpNSE();
    const reWarm = async () => { cookie = await warmUpNSE(); return cookie; };

    let written             = 0;
    let latestSnapshotDate  = null;

    for (const symbol of SYMBOLS) {
      await sleep(1000);

      // Step a: fetch expiry list
      let expiryDates;
      const infoResult = await contractInfoWithReWarm(symbol, cookie, reWarm);
      if (Array.isArray(infoResult)) {
        expiryDates = infoResult;
      } else {
        expiryDates = infoResult.expiryDates;
        cookie      = infoResult.cookie;
      }

      const expiries = expiryDates.slice(0, EXPIRIES_PER_SYMBOL);

      // Step b: fetch + aggregate each expiry
      for (const expiry of expiries) {
        await sleep(1100);

        const v3Result = await chainV3WithReWarm(
          { type: 'Indices', symbol, expiry, cookie },
          reWarm,
        );
        const chain = v3Result.chain;
        cookie      = v3Result.cookie;

        const agg = computeAggregates(chain);

        if (!agg.snapshot_date) {
          console.log(`  [options] ${symbol}/${expiry}: failed to parse snapshot_date — skipping`);
          continue;
        }

        // Decision 7: stale snapshot means market was closed today — clean no-op.
        if (agg.snapshot_date < today) {
          console.log(
            `[options] no new session for ${today} (market closed; last snapshot ${agg.snapshot_date})`,
          );
          return { written: 0 };
        }

        const expiryDate = expiryToDate(expiry);
        if (!expiryDate) {
          console.log(`  [options] ${symbol}/${expiry}: failed to parse expiry date — skipping`);
          continue;
        }

        await pool.query(UPSERT_SQL, [
          agg.snapshot_date, symbol,        expiryDate,
          agg.underlying,    agg.total_ce_oi, agg.total_pe_oi,
          agg.pcr,           agg.max_pain,    agg.atm_strike,
          agg.atm_ce_iv,     agg.atm_pe_iv,   agg.snapshot_ts,
        ]);
        written += 1;
        if (!latestSnapshotDate || agg.snapshot_date > latestSnapshotDate) {
          latestSnapshotDate = agg.snapshot_date;
        }
      }
    }

    console.log(`[options] upserted ${written} row(s); latest snapshot ${latestSnapshotDate}`);
    return {
      written,
      symbols:              SYMBOLS,
      expiries_per_symbol:  EXPIRIES_PER_SYMBOL,
      latest:               latestSnapshotDate,
    };
  } finally {
    await pool.end();
  }
}

function validate(d) {
  return typeof d === 'object' && d !== null;
}

runSeed('india', 'options', CANONICAL_KEY, fetchOptions, {
  validateFn:    validate,
  ttlSeconds:    CACHE_TTL,
  sourceVersion: 'options-nse-v3-eod-v1',
}).catch((err) => {
  console.error('FATAL:', err.message || err);
  process.exit(0);
});
