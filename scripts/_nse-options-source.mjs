#!/usr/bin/env node

// V2-024 — NSE options chain source adapter.
//
// Two-step handshake + per-expiry v3 fetch (Decision 1):
//   1. Warm up on /option-chain (NOT bare origin — bare origin omits `nsit`).
//   2. GET /api/option-chain-contract-info?symbol=<SYM> → expiryDates[].
//   3. GET /api/option-chain-v3?type=Indices&symbol=<SYM>&expiry=<DD-Mon-YYYY>
//
// computeAggregates() derives PCR / max-pain / ATM IV from the raw chain and
// returns only the summary row — raw per-strike data is discarded (Decision 3).
// fetchEquityChain() is a documented stub (Decision 5).

import { CHROME_UA } from './_seed-utils.mjs';

// ⚠️ Warm-up MUST target /option-chain — bare origin omits the `nsit` cookie
// that option-chain-v3 requires. Different from V2-018 warm-up URL (Decision 1).
const WARMUP_URL = 'https://www.nseindia.com/option-chain';
const NSE_API    = 'https://www.nseindia.com/api';
const REFERER    = 'https://www.nseindia.com/option-chain';

const MONTHS = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

// Parse "DD-Mon-YYYY HH:MM:SS" (IST) → YYYY-MM-DDThh:mm:ss+05:30.
// Returns null on shape mismatch so callers detect stale/bad data.
function parseIstTimestamp(raw) {
  const match = String(raw ?? '').trim()
    .match(/^(\d{2})-([A-Za-z]{3})-(\d{4}) (\d{2}:\d{2}:\d{2})$/);
  if (!match) return null;
  const mon = MONTHS[match[2]];
  if (!mon) return null;
  return `${match[3]}-${mon}-${match[1]}T${match[4]}+05:30`;
}

// Parse snapshot date (YYYY-MM-DD) from records.timestamp IST string.
function parseSnapshotDate(raw) {
  const match = String(raw ?? '').trim()
    .match(/^(\d{2})-([A-Za-z]{3})-(\d{4})/);
  if (!match) return null;
  const mon = MONTHS[match[2]];
  if (!mon) return null;
  return `${match[3]}-${mon}-${match[1]}`;
}

/**
 * Warm up the NSE session cookie for options endpoints.
 * GET /option-chain page → join set-cookie → return cookie string.
 *
 * @returns {Promise<string>} Cookie header value
 */
export async function warmUpNSE() {
  const resp = await fetch(WARMUP_URL, {
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!resp.ok) throw new Error(`NSE options warm-up HTTP ${resp.status}`);

  const setCookies = typeof resp.headers.getSetCookie === 'function'
    ? resp.headers.getSetCookie()
    : [resp.headers.get('set-cookie')].filter(Boolean);

  const cookie = setCookies
    .map((c) => String(c).split(';')[0].trim())
    .filter(Boolean)
    .join('; ');

  if (!cookie) throw new Error('NSE options warm-up returned no Set-Cookie (bot wall or markup change)');
  return cookie;
}

/**
 * Fetch available expiry dates for a symbol.
 * GET /api/option-chain-contract-info?symbol=<SYM>
 *
 * @param {string} symbol - e.g. 'NIFTY'
 * @param {string} cookie - from warmUpNSE()
 * @returns {Promise<string[]>} expiryDates in 'DD-Mon-YYYY' format
 */
export async function fetchContractInfo(symbol, cookie) {
  const url = `${NSE_API}/option-chain-contract-info?symbol=${encodeURIComponent(symbol)}`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'application/json, text/plain, */*',
      Referer: REFERER,
      Cookie: cookie,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!resp.ok) throw new Error(`NSE contract-info HTTP ${resp.status} for ${symbol}`);

  const data = await resp.json();
  if (!Array.isArray(data?.expiryDates) || data.expiryDates.length === 0) {
    throw new Error(`NSE contract-info returned no expiryDates for ${symbol}`);
  }
  return data.expiryDates;
}

/**
 * Fetch per-expiry option chain from the v3 endpoint.
 * ⚠️ Classic option-chain-indices returns {} — must use v3 (Decision 1).
 * ⚠️ v3 returns ONE expiry per call — call fetchContractInfo first.
 *
 * @param {object} args
 * @param {'Indices'|'Equities'} args.type
 * @param {string} args.symbol  - e.g. 'NIFTY'
 * @param {string} args.expiry  - exact 'DD-Mon-YYYY' from contract-info
 * @param {string} args.cookie  - from warmUpNSE()
 * @returns {Promise<object>} full chain response
 */
export async function fetchOptionChainV3({ type, symbol, expiry, cookie }) {
  const url = `${NSE_API}/option-chain-v3?type=${encodeURIComponent(type)}&symbol=${encodeURIComponent(symbol)}&expiry=${encodeURIComponent(expiry)}`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'application/json, text/plain, */*',
      Referer: REFERER,
      Cookie: cookie,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) throw new Error(`NSE option-chain-v3 HTTP ${resp.status} for ${symbol}/${expiry}`);

  const text = await resp.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`NSE v3 JSON.parse failed for ${symbol}/${expiry}: ${err.message}`);
  }
  if (!parsed?.records?.data) {
    throw new Error(`NSE v3 empty/invalid payload for ${symbol}/${expiry} (classic endpoint drift?)`);
  }
  return parsed;
}

/**
 * Compute EOD aggregates from a v3 chain response.
 * Raw per-strike data is discarded after computing (Decision 3).
 *
 * Returns all aggregate fields ready for upsert, including snapshot_date
 * (YYYY-MM-DD derived from records.timestamp) and snapshot_ts (IST ISO).
 *
 * @param {object} chain - full response from fetchOptionChainV3
 * @returns {object} aggregate row
 */
export function computeAggregates(chain) {
  const records = chain.records;
  const rows = records.data ?? [];
  const underlying = records.underlyingValue ?? null;

  // Sum CE / PE open interest across all strikes
  let totalCeOi = 0;
  let totalPeOi = 0;
  for (const row of rows) {
    if (row.CE?.openInterest) totalCeOi += row.CE.openInterest;
    if (row.PE?.openInterest) totalPeOi += row.PE.openInterest;
  }

  const pcr = totalCeOi > 0 ? totalPeOi / totalCeOi : null;

  // ATM strike: strike nearest to underlyingValue
  let atmStrike = null;
  if (underlying != null && rows.length > 0) {
    let minDist = Infinity;
    for (const row of rows) {
      const dist = Math.abs(row.strikePrice - underlying);
      if (dist < minDist) { minDist = dist; atmStrike = row.strikePrice; }
    }
  }

  // ATM IV at ATM strike — skip IV=0 (far-OTM entries carry IV=0 on NSE)
  let atmCeIv = null;
  let atmPeIv = null;
  if (atmStrike != null) {
    const atmRow = rows.find((r) => r.strikePrice === atmStrike);
    if (atmRow) {
      const ceIv = atmRow.CE?.impliedVolatility;
      const peIv = atmRow.PE?.impliedVolatility;
      if (ceIv > 0) atmCeIv = Number(ceIv.toFixed(2));
      if (peIv > 0) atmPeIv = Number(peIv.toFixed(2));
    }
  }

  // Max pain: strike that minimises total option-writer payout
  // (algorithm verified in scratch/calculate_max_pain.mjs)
  const strikes = records.strikePrices
    ?? [...new Set(rows.map((r) => r.strikePrice))].sort((a, b) => a - b);
  let maxPain = null;
  let minPain = Infinity;
  for (const target of strikes) {
    let pain = 0;
    for (const row of rows) {
      const s = row.strikePrice;
      if (row.CE && s > target) pain += (s - target) * (row.CE.openInterest || 0);
      if (row.PE && s < target) pain += (target - s) * (row.PE.openInterest || 0);
    }
    if (pain < minPain) { minPain = pain; maxPain = target; }
  }

  return {
    snapshot_date: parseSnapshotDate(records.timestamp),
    snapshot_ts:   parseIstTimestamp(records.timestamp),
    underlying:    underlying != null ? Number(underlying) : null,
    total_ce_oi:   totalCeOi,
    total_pe_oi:   totalPeOi,
    pcr:           pcr != null ? Number(pcr.toFixed(4)) : null,
    max_pain:      maxPain,
    atm_strike:    atmStrike,
    atm_ce_iv:     atmCeIv,
    atm_pe_iv:     atmPeIv,
  };
}

/**
 * STUB — equity options: future scope (Decision 5 / V2-024b).
 * Schema confirmed identical to indices (recon). Wire into the seed's symbol
 * loop with type='Equities' when equities are in scope.
 */
export async function fetchEquityChain() {
  throw new Error('Equity options: future scope, V2-024b');
}
