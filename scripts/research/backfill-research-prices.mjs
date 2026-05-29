#!/usr/bin/env node
//
// Experiment 0 — research price-series backfill.
// See: ai_docs/sachnetra v2/wiki/syntheses/sachnetra_research_playbook.md
//
// WHAT THIS DOES
//   Pulls daily OHLCV history for ^NSEI (Nifty 50 index) + every Nifty-50
//   constituent in shared/market-taxonomy.json from Yahoo Finance (free, ~20y
//   of daily bars), computes daily LOG RETURNS from the split/dividend-adjusted
//   close, and upserts everything into a `research_prices` table on Railway.
//
// WHY IT EXISTS
//   india_institutional_flows / india_bourse_announcements / india_news_signals
//   are all EVENT tables. To test "did the price move after the event", every
//   experiment in the playbook needs a daily price series it can SQL-join against
//   event dates. This builds that series. Nothing else in the playbook runs until
//   research_prices exists.
//
// BOUNDARY (per memory/feedback_v2_prod_execution + research playbook):
//   - Writes ONLY to research_prices. Never touches india_* / story_threads /
//     entity_timeline / any sacred file. Read-nothing from prod; this is additive.
//   - Claude authors this; LIJO runs it. It is a manual backfill, not a cron.
//
// USAGE (writes are OPT-IN — default is a dry run that never touches the DB)
//   node scripts/research/backfill-research-prices.mjs                 # DRY RUN — fetch + parse, print counts, NO db write
//   node scripts/research/backfill-research-prices.mjs --symbol=^NSEI  # DRY RUN, one symbol (smoke test)
//   node scripts/research/backfill-research-prices.mjs --limit=3       # DRY RUN, first N symbols only
//   node scripts/research/backfill-research-prices.mjs --write         # WRITE — full backfill from 2009-01-01 (Lijo/James, post-review)
//   node scripts/research/backfill-research-prices.mjs --write --from=2015-01-01
//   node scripts/research/backfill-research-prices.mjs --write --max-symbols=N  # allow a universe larger than 60
//
// Requires DATABASE_URL or DATABASE_PUBLIC_URL in .env.local (same as migrate-india-signals.mjs).

import { loadEnvFile, loadSharedConfig, CHROME_UA, sleep } from '../_seed-utils.mjs';
import pg from 'pg';
import { assertDiskHeadroom } from './_db-guard.mjs';

loadEnvFile(import.meta.url);
const { Pool } = pg;

// ── CLI flags ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getFlag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const FROM_DATE = getFlag('from', '2009-01-01'); // covers V2-017b FII history (Dec 2009)
const ONLY_SYMBOL = getFlag('symbol', null);
const LIMIT = getFlag('limit', null) ? Number(getFlag('limit', null)) : null;
const DRY_RUN = !args.includes('--write'); // writes are OPT-IN; default = dry run
const MAX_SYMBOLS = Number(getFlag('max-symbols', '60')); // ^NSEI + Nifty50 = ~51
const YAHOO_DELAY_MS = 400; // be polite — full backfill is ~48 calls, no rush

// ── Symbol universe: ^NSEI + Nifty 50 constituents ─────────────────────────
const taxonomy = loadSharedConfig('market-taxonomy.json');
const constituents = (taxonomy.nifty50_registry || []).map((r) => r.ticker);
let SYMBOLS = ['^NSEI', ...constituents];
if (ONLY_SYMBOL) SYMBOLS = [ONLY_SYMBOL];
else if (LIMIT) SYMBOLS = SYMBOLS.slice(0, LIMIT);

// ── DDL: the research price store (idempotent) ─────────────────────────────
const DDL = `
CREATE TABLE IF NOT EXISTS research_prices (
  symbol      TEXT NOT NULL,            -- '^NSEI' | 'RELIANCE.NS' | ...
  trade_date  DATE NOT NULL,            -- exchange trading day (IST)
  open        DOUBLE PRECISION,
  high        DOUBLE PRECISION,
  low         DOUBLE PRECISION,
  close       DOUBLE PRECISION,
  adj_close   DOUBLE PRECISION,         -- split/dividend adjusted — use THIS for returns
  volume      BIGINT,
  log_return  DOUBLE PRECISION,         -- ln(adj_close_t / adj_close_t-1), per symbol
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (symbol, trade_date)
);
CREATE INDEX IF NOT EXISTS idx_research_prices_date ON research_prices (trade_date DESC);
`;

// ── Yahoo fetch with 429 backoff (mirrors seed-commodity-quotes.mjs) ────────
async function fetchYahoo(symbol, period1, period2, maxAttempts = 4) {
  const base = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
  const url = `${base}?period1=${period1}&period2=${period2}&interval=1d`;
  for (let i = 0; i < maxAttempts; i++) {
    const resp = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA },
      signal: AbortSignal.timeout(20_000),
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

// ── Parse the chart payload into daily rows + compute log returns ───────────
function parseHistory(data, symbol) {
  const result = data?.chart?.result?.[0];
  const ts = result?.timestamp;
  const q = result?.indicators?.quote?.[0];
  const adj = result?.indicators?.adjclose?.[0]?.adjclose;
  if (!Array.isArray(ts) || !q) return [];

  const rows = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i];
    const adjClose = adj?.[i] ?? close; // index series have no adjclose; fall back to close
    if (close == null) continue; // skip holidays / null bars
    // Yahoo timestamp is UTC seconds at market open; convert to the IST trading date.
    const istMs = ts[i] * 1000 + 5.5 * 3600 * 1000;
    const tradeDate = new Date(istMs).toISOString().slice(0, 10);
    rows.push({
      symbol,
      trade_date: tradeDate,
      open: q.open?.[i] ?? null,
      high: q.high?.[i] ?? null,
      low: q.low?.[i] ?? null,
      close,
      adj_close: adjClose,
      volume: q.volume?.[i] ?? null,
      log_return: null, // filled below
    });
  }

  // Log returns from adjusted close, in chronological order, per symbol.
  rows.sort((a, b) => (a.trade_date < b.trade_date ? -1 : 1));
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1].adj_close;
    const cur = rows[i].adj_close;
    if (prev > 0 && cur > 0) rows[i].log_return = Math.log(cur / prev);
  }
  return rows;
}

// ── Chunked multi-row upsert ────────────────────────────────────────────────
async function upsertRows(pool, rows, chunkSize = 500) {
  let written = 0;
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const values = [];
    const params = [];
    chunk.forEach((r, idx) => {
      const b = idx * 9;
      values.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9})`);
      params.push(r.symbol, r.trade_date, r.open, r.high, r.low, r.close, r.adj_close, r.volume, r.log_return);
    });
    const sql = `
      INSERT INTO research_prices
        (symbol, trade_date, open, high, low, close, adj_close, volume, log_return)
      VALUES ${values.join(',')}
      ON CONFLICT (symbol, trade_date) DO UPDATE SET
        open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
        close = EXCLUDED.close, adj_close = EXCLUDED.adj_close,
        volume = EXCLUDED.volume, log_return = EXCLUDED.log_return`;
    await pool.query(sql, params);
    written += chunk.length;
  }
  return written;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const period1 = Math.floor(new Date(`${FROM_DATE}T00:00:00Z`).getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);

  console.log('=== research_prices backfill (Experiment 0) ===');
  console.log(`  From:    ${FROM_DATE}  →  today`);
  console.log(`  Symbols: ${SYMBOLS.length}${ONLY_SYMBOL ? ` (${ONLY_SYMBOL})` : ''}${LIMIT ? ` (limited to ${LIMIT})` : ''}`);
  console.log(`  Mode:    ${DRY_RUN ? 'DRY RUN (no DB write)' : 'WRITE'}`);

  if (SYMBOLS.length > MAX_SYMBOLS) {
    console.error(`ERROR: ${SYMBOLS.length} symbols exceeds --max-symbols=${MAX_SYMBOLS}. Use --max-symbols=N to allow a larger universe.`);
    process.exit(1);
  }

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
    console.log('  ✓ research_prices table ready');

    const dbStat = await assertDiskHeadroom(pool, { tableName: 'research_prices' });
    const estRows = SYMBOLS.length * 4000; // rough: ~17y × ~252 trading days
    console.log(`\nWRITE PLAN: ${SYMBOLS.length} symbols → research_prices`);
    console.log(`  est. rows: ~${estRows.toLocaleString()}   current DB: ${dbStat.sizePretty} / 5 GB (${((dbStat.bytes / dbStat.limitBytes) * 100).toFixed(1)}%)`);
    console.log(`  proceeding because --write was passed.\n`);
  }

  let totalRows = 0;
  let hits = 0;
  let misses = 0;
  const perSymbol = [];

  for (let i = 0; i < SYMBOLS.length; i++) {
    const symbol = SYMBOLS[i];
    if (i > 0) await sleep(YAHOO_DELAY_MS);
    try {
      const data = await fetchYahoo(symbol, period1, period2);
      if (!data) { misses++; perSymbol.push(`${symbol}: FETCH FAIL`); continue; }
      const rows = parseHistory(data, symbol);
      if (rows.length === 0) { misses++; perSymbol.push(`${symbol}: 0 bars`); continue; }

      if (!DRY_RUN) await upsertRows(pool, rows);
      totalRows += rows.length;
      hits++;
      const first = rows[0].trade_date;
      const last = rows[rows.length - 1].trade_date;
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
