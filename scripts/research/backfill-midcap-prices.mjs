#!/usr/bin/env node
//
// G4 — Nifty Midcap 150 price-series backfill.
// Task: ai_docs/tasks/G4_midcap_price_universe.md
// Decision record: ai_docs/sachnetra v2/wiki/syntheses/strategy_reset_and_data_foundation_2026-05-29.md
//
// WHAT THIS DOES
//   Same as scripts/research/backfill-research-prices.mjs (the Nifty-50 backfill) but over the
//   Nifty MIDCAP 150 universe. Pulls daily OHLCV from Yahoo Finance, computes log returns from the
//   adjusted close, and upserts into the SAME `research_prices` table on Railway.
//
// WHY
//   research_prices is Nifty-50 only, so ~96% of corporate filings can't be priced and event studies
//   starve (Exp 14: 2 of 712 filings landed on a priced symbol). Adding the Midcap 150 is the single
//   highest-leverage data fix — it unblocks the mid-cap governance-shock strategy.
//
// UNIVERSE — three ways to supply it (NEVER hand-type tickers; hallucinated symbols poison the table):
//   (A default) fetch the official NSE constituents CSV (ind_niftymidcap150list.csv), Symbol col + '.NS'
//   (B)         --symbols-file=shared/nifty-midcap150.json  (JSON: ["X.NS", ...] or [{ticker:"X.NS"}] or {registry:[{ticker}]})
//   (C)         --symbol=BHARATFORG.NS   (single, for a smoke test)
//
// BOUNDARY (per memory/feedback_v2_prod_execution + research playbook):
//   - Writes ONLY to research_prices. Additive, idempotent. Touches no india_* / sacred file.
//   - Claude authors this; LIJO/JAMES run it. Manual backfill, NOT a cron.
//
// USAGE
//   node scripts/research/backfill-midcap-prices.mjs --dry-run                 # fetch+parse, no DB write
//   node scripts/research/backfill-midcap-prices.mjs --dry-run --symbols-file=shared/nifty-midcap150.json
//   node scripts/research/backfill-midcap-prices.mjs --symbol=BHARATFORG.NS    # one-symbol smoke test
//   node scripts/research/backfill-midcap-prices.mjs --from=2015-01-01         # all, custom start
//   node scripts/research/backfill-midcap-prices.mjs                           # full backfill
//
// Requires DATABASE_URL or DATABASE_PUBLIC_URL in .env.local (same as the other backfills).

import { loadEnvFile, CHROME_UA, sleep } from '../_seed-utils.mjs';
import { readFileSync } from 'node:fs';
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
const FROM_DATE = getFlag('from', '2009-01-01');
const ONLY_SYMBOL = getFlag('symbol', null);
const SYMBOLS_FILE = getFlag('symbols-file', null);
const LIMIT = getFlag('limit', null) ? Number(getFlag('limit', null)) : null;
const DRY_RUN = !args.includes('--write');
const MAX_SYMBOLS = getFlag('max-symbols', '400') ? Number(getFlag('max-symbols', '400')) : 400;
const YAHOO_DELAY_MS = 400;

// Official NSE index-constituents CSV. Verify it still resolves; niftyindices sometimes blocks bots.
const NSE_MIDCAP150_CSV = 'https://niftyindices.com/IndexConstituent/ind_niftymidcap150list.csv';

// ── Universe loaders ────────────────────────────────────────────────────────
function normalizeYahoo(sym) {
  const s = String(sym).trim().toUpperCase();
  if (!s) return null;
  if (s.startsWith('^') || s.endsWith('.NS') || s.endsWith('.BO')) return s; // already a Yahoo ticker
  return `${s}.NS`;
}

function loadFromFile(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const arr = Array.isArray(raw) ? raw : (raw.registry || raw.symbols || []);
  const out = arr
    .map((e) => (typeof e === 'string' ? e : e.ticker || e.symbol))
    .map(normalizeYahoo)
    .filter(Boolean);
  return [...new Set(out)];
}

// Quote-aware single-line CSV field split (company names can contain commas).
function splitCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else { inQ = !inQ; }
    } else if (c === ',' && !inQ) {
      fields.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  fields.push(cur);
  return fields.map((f) => f.trim());
}

async function loadFromNSE() {
  const resp = await fetch(NSE_MIDCAP150_CSV, {
    headers: { 'User-Agent': CHROME_UA, Accept: 'text/csv,*/*' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!resp.ok) throw new Error(`NSE CSV HTTP ${resp.status} — supply --symbols-file instead (see task §Getting the Midcap 150 list)`);
  const text = await resp.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error('NSE CSV looks empty');
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const symIdx = header.findIndex((h) => h === 'symbol');
  if (symIdx < 0) throw new Error(`NSE CSV has no Symbol column (header: ${header.join('|')})`);
  const out = lines.slice(1)
    .map((l) => splitCsvLine(l)[symIdx])
    .map(normalizeYahoo)
    .filter(Boolean);
  return [...new Set(out)];
}

async function resolveUniverse() {
  if (ONLY_SYMBOL) return { symbols: [normalizeYahoo(ONLY_SYMBOL)], source: '--symbol' };
  if (SYMBOLS_FILE) return { symbols: loadFromFile(SYMBOLS_FILE), source: SYMBOLS_FILE };
  const symbols = await loadFromNSE();
  return { symbols, source: NSE_MIDCAP150_CSV };
}

// ── DDL (idempotent — identical to the Nifty-50 backfill) ──────────────────
const DDL = `
CREATE TABLE IF NOT EXISTS research_prices (
  symbol      TEXT NOT NULL,
  trade_date  DATE NOT NULL,
  open        DOUBLE PRECISION,
  high        DOUBLE PRECISION,
  low         DOUBLE PRECISION,
  close       DOUBLE PRECISION,
  adj_close   DOUBLE PRECISION,
  volume      BIGINT,
  log_return  DOUBLE PRECISION,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (symbol, trade_date)
);
CREATE INDEX IF NOT EXISTS idx_research_prices_date ON research_prices (trade_date DESC);
`;

// ── Yahoo fetch with 429 backoff (identical to the Nifty-50 backfill) ──────
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
    if (!resp.ok) { console.warn(`  [Yahoo] ${symbol} HTTP ${resp.status}`); return null; }
    return resp.json();
  }
  console.warn(`  [Yahoo] ${symbol} rate limited after ${maxAttempts} attempts`);
  return null;
}

// ── Parse chart payload → daily rows + log returns (identical) ─────────────
function parseHistory(data, symbol) {
  const result = data?.chart?.result?.[0];
  const ts = result?.timestamp;
  const q = result?.indicators?.quote?.[0];
  const adj = result?.indicators?.adjclose?.[0]?.adjclose;
  if (!Array.isArray(ts) || !q) return [];

  const rows = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i];
    const adjClose = adj?.[i] ?? close;
    if (close == null) continue;
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
      log_return: null,
    });
  }
  rows.sort((a, b) => (a.trade_date < b.trade_date ? -1 : 1));
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1].adj_close;
    const cur = rows[i].adj_close;
    if (prev > 0 && cur > 0) rows[i].log_return = Math.log(cur / prev);
  }
  return rows;
}

// ── Chunked multi-row upsert (identical) ────────────────────────────────────
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

  console.log('=== research_prices backfill — Nifty Midcap 150 (G4) ===');

  let { symbols, source } = await resolveUniverse();
  if (LIMIT) symbols = symbols.slice(0, LIMIT);

  console.log(`  From:    ${FROM_DATE}  →  today`);
  console.log(`  Source:  ${source}`);
  console.log(`  Symbols: ${symbols.length}${LIMIT ? ` (limited to ${LIMIT})` : ''}`);
  console.log(`  Mode:    ${DRY_RUN ? 'DRY RUN (no DB write)' : 'WRITE'}`);

  if (symbols.length === 0) {
    console.error('ERROR: empty symbol universe. Supply --symbols-file=... or check the NSE CSV URL.');
    process.exit(1);
  }
  if (symbols.length > MAX_SYMBOLS) {
    console.error(`ERROR: ${symbols.length} symbols exceeds the --max-symbols=${MAX_SYMBOLS} limit — aborting to avoid junk. Use --max-symbols=N to allow larger universes.`);
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
    console.log(`\nWRITE PLAN: ${symbols.length} symbols → research_prices`);
    console.log(`  current DB: ${dbStat.sizePretty} / 5000 MB`);
    console.log(`  proceeding because --write was passed.\n`);
  }

  let totalRows = 0, hits = 0, misses = 0;
  const perSymbol = [];

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
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
      console.log(`  [${i + 1}/${symbols.length}] ${symbol}: ${rows.length} bars (${first} → ${last})`);
    } catch (err) {
      misses++;
      perSymbol.push(`${symbol}: ERROR ${err.message}`);
      console.warn(`  [Yahoo] ${symbol} error: ${err.message}`);
    }
  }

  if (pool) await pool.end();

  console.log('\n=== Summary ===');
  console.log(`  Symbols ok:   ${hits}/${symbols.length}`);
  console.log(`  Symbols miss: ${misses}`);
  console.log(`  Total bars:   ${totalRows}${DRY_RUN ? ' (NOT written — dry run)' : ' written/updated'}`);
  if (misses > 0) {
    console.log('\n  Misses / notes:');
    for (const line of perSymbol.filter((l) => /FAIL|ERROR|0 bars/.test(l))) console.log(`    - ${line}`);
    const missPct = (100 * misses) / symbols.length;
    if (missPct > 20) console.log(`\n  ⚠ ${missPct.toFixed(0)}% misses — symbol list is likely wrong-format (BSE codes? missing .NS?). Fix the list, not the script.`);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Backfill failed:', err.message);
  process.exit(1);
});
