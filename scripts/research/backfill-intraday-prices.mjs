#!/usr/bin/env node
//
// Intraday price backfill — prerequisite for Experiment 10.
// See: ai_docs/sachnetra v2/wiki/experiments/Exp10.md
//
// WHAT THIS DOES
//   Pulls 5-MINUTE OHLCV bars for the 15 large-caps that are actually tagged in
//   india_news_signals.nse_tickers (per Exp 4 §14.3), plus ^NSEI as the market
//   control, from Yahoo Finance. Upserts into a new `research_prices_intraday`
//   table on Railway. Yahoo's free 5m feed is limited to a rolling ~60 days,
//   which covers the rolling 30-day NSE announcement window with margin.
//
// WHY IT EXISTS
//   Exp 4 proved SachNetra sees NSE filings ~13 min before the newswire (median).
//   To monetise that latency edge we need to know whether prices actually MOVE
//   in that window — a price-reaction test, not a timestamp test. Exp 2 only had
//   daily bars; that's too coarse to test a 13-min lead. This backfill is the
//   data prerequisite that makes Exp 10 (intraday event study) runnable.
//
// UNIVERSE (16 symbols)
//   The 15 tickers that account for ~all news ticker-tags today (large-caps):
//     ITC.NS, SBIN.NS, RELIANCE.NS, BHARTIARTL.NS, SUNPHARMA.NS, MARUTI.NS,
//     NTPC.NS, HINDALCO.NS, EICHERMOT.NS, GRASIM.NS, TCS.NS, TATASTEEL.NS,
//     M&M.NS, APOLLOHOSP.NS, DRREDDY.NS
//   Plus ^NSEI (Nifty 50 index) as the market control for abnormal-return calc.
//
// BOUNDARY (per memory/feedback_v2_prod_execution + research playbook):
//   - Writes ONLY to research_prices_intraday. Touches no sacred/india_*/story_*/
//     entity_* tables. Additive only.
//   - Claude authors; LIJO runs. Manual one-shot (re-run weekly if you want a
//     fresh 60-day window). NOT a cron.
//
// USAGE
//   node scripts/research/backfill-intraday-prices.mjs                # all 16 symbols, full 60-day window
//   node scripts/research/backfill-intraday-prices.mjs --symbol=ITC.NS   # one symbol (smoke test)
//   node scripts/research/backfill-intraday-prices.mjs --dry-run         # fetch + parse, print counts, NO db write
//   node scripts/research/backfill-intraday-prices.mjs --limit=3         # first N symbols only
//
// WHAT TO VERIFY AFTER RUNNING
//   1. Summary should report ~16/16 symbols ok.
//   2. Per-symbol bar count should be ~3000–4500 (75 bars/trading day × ~45 sessions
//      in the 60-day window, holidays excluded).
//   3. Quick sanity in Railway: SELECT symbol, COUNT(*), MIN(bar_ts), MAX(bar_ts)
//      FROM research_prices_intraday GROUP BY symbol ORDER BY symbol;
//
// Requires DATABASE_URL or DATABASE_PUBLIC_URL in .env.local.

import { loadEnvFile, CHROME_UA, sleep } from '../_seed-utils.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

// ── CLI flags ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getFlag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const ONLY_SYMBOL = getFlag('symbol', null);
const LIMIT = getFlag('limit', null) ? Number(getFlag('limit', null)) : null;
const DRY_RUN = args.includes('--dry-run');
const YAHOO_DELAY_MS = 600; // be polite — heavier payload than daily

// ── Symbol universe: the 15 actually-tagged large-caps + ^NSEI ─────────────
// Source: Exp 4 §14.3 (top-tagged tickers in india_news_signals.nse_tickers,
// all Nifty large-caps). These are the names where the Exp 4 lead exists and
// therefore where the Exp 10 price-reaction test is meaningful.
const TAGGED_LARGE_CAPS = [
  'ITC.NS', 'SBIN.NS', 'RELIANCE.NS', 'BHARTIARTL.NS', 'SUNPHARMA.NS',
  'MARUTI.NS', 'NTPC.NS', 'HINDALCO.NS', 'EICHERMOT.NS', 'GRASIM.NS',
  'TCS.NS', 'TATASTEEL.NS', 'M&M.NS', 'APOLLOHOSP.NS', 'DRREDDY.NS',
];
let SYMBOLS = ['^NSEI', ...TAGGED_LARGE_CAPS];
if (ONLY_SYMBOL) SYMBOLS = [ONLY_SYMBOL];
else if (LIMIT) SYMBOLS = SYMBOLS.slice(0, LIMIT);

// ── DDL: intraday price store (idempotent) ─────────────────────────────────
// Schema mirrors research_prices but keyed on a TIMESTAMPTZ bar start instead
// of a DATE, because 75 bars per trading day need sub-day granularity.
const DDL = `
CREATE TABLE IF NOT EXISTS research_prices_intraday (
  symbol       TEXT NOT NULL,             -- '^NSEI' | 'RELIANCE.NS' | ...
  bar_ts       TIMESTAMPTZ NOT NULL,      -- start of the 5-min bar (UTC instant)
  interval     TEXT NOT NULL DEFAULT '5m',-- bar size; '5m' for now, room to add others
  open         DOUBLE PRECISION,
  high         DOUBLE PRECISION,
  low          DOUBLE PRECISION,
  close        DOUBLE PRECISION,
  volume       BIGINT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (symbol, bar_ts, interval)
);
CREATE INDEX IF NOT EXISTS idx_research_prices_intraday_ts
  ON research_prices_intraday (bar_ts DESC);
CREATE INDEX IF NOT EXISTS idx_research_prices_intraday_symbol_ts
  ON research_prices_intraday (symbol, bar_ts DESC);
`;

// ── Yahoo intraday fetch with 429 backoff ──────────────────────────────────
// Note: range=60d is Yahoo's documented max for interval=5m. Using range= rather
// than period1/period2 makes the call self-documenting and avoids edge cases
// when Yahoo clamps the window.
async function fetchYahooIntraday(symbol, maxAttempts = 4) {
  const base = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
  const url = `${base}?range=60d&interval=5m`;
  for (let i = 0; i < maxAttempts; i++) {
    const resp = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA },
      signal: AbortSignal.timeout(30_000),
    });
    if (resp.status === 429) {
      const wait = 5000 * (i + 1);
      console.warn(`  [Yahoo] ${symbol} 429 — waiting ${wait / 1000}s (attempt ${i + 1}/${maxAttempts})`);
      await sleep(wait);
      continue;
    }
    if (!resp.ok) {
      console.warn(`  [Yahoo] ${symbol} HTTP ${resp.status}`);
      return null;
    }
    return resp.json();
  }
  console.warn(`  [Yahoo] ${symbol} rate limited after ${maxAttempts} attempts`);
  return null;
}

// ── Parse the chart payload into 5-min bar rows ────────────────────────────
function parseIntraday(data, symbol) {
  const result = data?.chart?.result?.[0];
  const ts = result?.timestamp;
  const q = result?.indicators?.quote?.[0];
  if (!Array.isArray(ts) || !q) return [];

  const rows = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i];
    if (close == null) continue; // skip null bars (lunch breaks, gaps)
    // Yahoo timestamp is UTC seconds at the START of the bar; store as TIMESTAMPTZ.
    const barTs = new Date(ts[i] * 1000).toISOString();
    rows.push({
      symbol,
      bar_ts: barTs,
      interval: '5m',
      open: q.open?.[i] ?? null,
      high: q.high?.[i] ?? null,
      low: q.low?.[i] ?? null,
      close,
      volume: q.volume?.[i] ?? null,
    });
  }
  rows.sort((a, b) => (a.bar_ts < b.bar_ts ? -1 : 1));
  return rows;
}

// ── Chunked multi-row upsert ───────────────────────────────────────────────
async function upsertRows(pool, rows, chunkSize = 500) {
  let written = 0;
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const values = [];
    const params = [];
    chunk.forEach((r, idx) => {
      const b = idx * 8;
      values.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8})`);
      params.push(r.symbol, r.bar_ts, r.interval, r.open, r.high, r.low, r.close, r.volume);
    });
    const sql = `
      INSERT INTO research_prices_intraday
        (symbol, bar_ts, interval, open, high, low, close, volume)
      VALUES ${values.join(',')}
      ON CONFLICT (symbol, bar_ts, interval) DO UPDATE SET
        open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
        close = EXCLUDED.close, volume = EXCLUDED.volume`;
    await pool.query(sql, params);
    written += chunk.length;
  }
  return written;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== research_prices_intraday backfill (Exp 10 prerequisite) ===');
  console.log(`  Window:  rolling 60 days (Yahoo 5m max)`);
  console.log(`  Symbols: ${SYMBOLS.length}${ONLY_SYMBOL ? ` (${ONLY_SYMBOL})` : ''}${LIMIT ? ` (limited to ${LIMIT})` : ''}`);
  console.log(`  Mode:    ${DRY_RUN ? 'DRY RUN (no DB write)' : 'WRITE'}`);

  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!DRY_RUN && !connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_PUBLIC_URL not set in .env.local');
    process.exit(1);
  }

  let pool = null;
  if (!DRY_RUN) {
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    await pool.query('SELECT 1');
    await pool.query(DDL);
    console.log('  ✓ research_prices_intraday table ready');
  }

  let totalRows = 0;
  let hits = 0;
  let misses = 0;
  const perSymbol = [];

  for (let i = 0; i < SYMBOLS.length; i++) {
    const symbol = SYMBOLS[i];
    if (i > 0) await sleep(YAHOO_DELAY_MS);
    try {
      const data = await fetchYahooIntraday(symbol);
      if (!data) { misses++; perSymbol.push(`${symbol}: FETCH FAIL`); continue; }
      const rows = parseIntraday(data, symbol);
      if (rows.length === 0) { misses++; perSymbol.push(`${symbol}: 0 bars`); continue; }

      if (!DRY_RUN) await upsertRows(pool, rows);
      totalRows += rows.length;
      hits++;
      const first = rows[0].bar_ts;
      const last = rows[rows.length - 1].bar_ts;
      perSymbol.push(`${symbol}: ${rows.length} bars (${first} → ${last})`);
      console.log(`  [${i + 1}/${SYMBOLS.length}] ${symbol}: ${rows.length} bars (${first} → ${last})`);
    } catch (err) {
      misses++;
      perSymbol.push(`${symbol}: ERROR ${err.message}`);
      console.warn(`  [Yahoo] ${symbol} error: ${err.message}`);
    }
  }

  if (pool) await pool.end();

  console.log('\n=== Summary ===');
  console.log(`  Symbols ok:   ${hits}/${SYMBOLS.length}`);
  console.log(`  Symbols miss: ${misses}`);
  console.log(`  Total bars:   ${totalRows}${DRY_RUN ? ' (NOT written — dry run)' : ' written/updated'}`);
  if (misses > 0) {
    console.log('\n  Misses / notes:');
    for (const line of perSymbol.filter((l) => /FAIL|ERROR|0 bars/.test(l))) console.log(`    - ${line}`);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Backfill failed:', err.message);
  process.exit(1);
});
