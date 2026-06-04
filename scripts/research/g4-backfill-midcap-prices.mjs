#!/usr/bin/env node
//
// G4 (SAFE re-run) — Nifty Midcap 150 price backfill into research_prices.
//
// WHY THIS EXISTS (read before running)
//   scripts/research/backfill-midcap-prices.mjs crashed the shared Railway Postgres on disk-full:
//   its disk guard checked headroom ONCE at startup against a HARDCODED 4 GB ceiling, then wrote
//   ~600K rows with no further checks. If the real volume is < that ceiling (or already near-full),
//   the guard never trips and the write fills the disk mid-run. Diagnosis + plan:
//     ai_docs/learning/research-notes/2026-06-04_g4-midcap-backfill-safety.md
//
//   This script is the safe re-run. Same proven fetch/parse/upsert as the original, plus:
//     1. PERIODIC disk guard — re-checks DB size every --guard-every symbols, aborts cleanly if over.
//     2. CONFIGURABLE ceiling — --max-db-gb must match the REAL Railway volume (the original's 4 GB
//        was an assumption). You MUST verify the volume first (Step 0 below) and pass the real number.
//     3. NARROW-FIRST defaults — --from=2018-01-01 (recency-aligned; PEAD/size anomaly is fading and
//        pre-2018 is survivorship-biased anyway). Pass a curated liquid-~75 list via --symbols-file.
//     4. RESUMABLE — --skip-existing skips symbols already populated past a recent date, so a mid-run
//        abort is safe to resume (the upsert is idempotent on PK (symbol, trade_date) regardless).
//
// BOUNDARY (memory/feedback_v2_prod_execution + research playbook):
//   - Writes ONLY to research_prices. Additive, idempotent. Touches no india_* table, no sacred file.
//   - Claude AUTHORED this; LIJO runs it. Manual backfill, NOT a cron. Dry-run is the default.
//
// ── STEP 0 (DO THIS FIRST, before --write) ─────────────────────────────────────
//   a) node scripts/research/check-db-space.mjs        # read-only: see total DB size + largest tables
//   b) Check the Railway dashboard for the ACTUAL VOLUME size and % used.
//   c) Grow the volume so free space >= ~3x the estimated backfill (absorbs WAL/bloat during the write).
//   d) Set --max-db-gb to (real volume size in GB) * 0.8  — NOT the old 4 GB assumption.
//
// USAGE (writes are OPT-IN — default is a dry run that never touches the DB)
//   node scripts/research/g4-backfill-midcap-prices.mjs                                   # DRY RUN (full midcap150, from 2018)
//   node scripts/research/g4-backfill-midcap-prices.mjs --symbols-file=shared/nifty-midcap150.json --limit=75   # DRY RUN, first 75
//   node scripts/research/g4-backfill-midcap-prices.mjs --symbol=BHARATFORG.NS            # DRY RUN, one-symbol smoke test
//   node scripts/research/g4-backfill-midcap-prices.mjs --write --max-db-gb=0.8           # WRITE (Lijo, post Step 0)
//   node scripts/research/g4-backfill-midcap-prices.mjs --write --max-db-gb=0.8 --skip-existing   # resume after an abort
//
// Requires DATABASE_URL or DATABASE_PUBLIC_URL in .env.local (same as the other backfills).

import { loadEnvFile, CHROME_UA, sleep } from '../_seed-utils.mjs';
import { readFileSync } from 'node:fs';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

// ── CLI flags ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getFlag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const FROM_DATE = getFlag('from', '2018-01-01'); // narrow-first default (recency + less survivorship)
const ONLY_SYMBOL = getFlag('symbol', null);
const SYMBOLS_FILE = getFlag('symbols-file', 'shared/nifty-midcap150.json'); // default to the full midcap list
const LIMIT = getFlag('limit', null) ? Number(getFlag('limit', null)) : null;
const DRY_RUN = !args.includes('--write');
const SKIP_EXISTING = args.includes('--skip-existing');
const MAX_DB_GB = Number(getFlag('max-db-gb', '0.8')); // CONSERVATIVE default — OVERRIDE to real volume*0.8
const GUARD_EVERY = Number(getFlag('guard-every', '10')); // re-check disk headroom every N symbols
const YAHOO_DELAY_MS = Number(getFlag('delay-ms', '400'));
const MAX_SYMBOLS = Number(getFlag('max-symbols', '400')); // sanity cap against a junk list

// ── Universe loader (file or single symbol; NEVER hand-type tickers) ──────────
function normalizeYahoo(sym) {
  const s = String(sym).trim().toUpperCase();
  if (!s) return null;
  if (s.startsWith('^') || s.endsWith('.NS') || s.endsWith('.BO')) return s;
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
function resolveUniverse() {
  if (ONLY_SYMBOL) return { symbols: [normalizeYahoo(ONLY_SYMBOL)], source: '--symbol' };
  return { symbols: loadFromFile(SYMBOLS_FILE), source: SYMBOLS_FILE };
}

// ── DDL (idempotent — identical to the Nifty-50 / original midcap backfill) ──
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

// ── PERIODIC disk guard (the fix) — configurable ceiling, called repeatedly ──
async function dbSizeBytes(pool) {
  const r = await pool.query(`SELECT pg_database_size(current_database()) AS bytes`);
  return Number(r.rows[0].bytes);
}
function fmtGB(bytes) {
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
async function assertHeadroom(pool, limitBytes, where) {
  const bytes = await dbSizeBytes(pool);
  const pct = (100 * bytes / limitBytes).toFixed(1);
  if (bytes > limitBytes) {
    throw new Error(
      `[disk-guard] ABORT at ${where}: DB ${fmtGB(bytes)} exceeds ceiling ${fmtGB(limitBytes)} (${pct}%). ` +
      `Partial write is consistent (idempotent upsert) — grow the volume, then resume with --skip-existing.`,
    );
  }
  return { bytes, pct };
}

// ── Yahoo fetch with 429 backoff (identical to the proven original) ──────────
async function fetchYahoo(symbol, period1, period2, maxAttempts = 4) {
  const base = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
  const url = `${base}?period1=${period1}&period2=${period2}&interval=1d`;
  for (let i = 0; i < maxAttempts; i++) {
    const resp = await fetch(url, { headers: { 'User-Agent': CHROME_UA }, signal: AbortSignal.timeout(20_000) });
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

// ── Parse chart payload → daily rows + log returns (identical to the original) ─
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
      symbol, trade_date: tradeDate,
      open: q.open?.[i] ?? null, high: q.high?.[i] ?? null, low: q.low?.[i] ?? null,
      close, adj_close: adjClose, volume: q.volume?.[i] ?? null, log_return: null,
    });
  }
  rows.sort((a, b) => (a.trade_date < b.trade_date ? -1 : 1));
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1].adj_close, cur = rows[i].adj_close;
    if (prev > 0 && cur > 0) rows[i].log_return = Math.log(cur / prev);
  }
  return rows;
}

// ── Chunked idempotent upsert (identical to the original) ────────────────────
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
    await pool.query(
      `INSERT INTO research_prices
         (symbol, trade_date, open, high, low, close, adj_close, volume, log_return)
       VALUES ${values.join(',')}
       ON CONFLICT (symbol, trade_date) DO UPDATE SET
         open=EXCLUDED.open, high=EXCLUDED.high, low=EXCLUDED.low,
         close=EXCLUDED.close, adj_close=EXCLUDED.adj_close,
         volume=EXCLUDED.volume, log_return=EXCLUDED.log_return`,
      params,
    );
    written += chunk.length;
  }
  return written;
}

// For --skip-existing: which symbols already have rows at/after a cutoff date.
async function loadAlreadyPopulated(pool, cutoffDate) {
  const r = await pool.query(
    `SELECT symbol, MAX(trade_date)::text AS latest FROM research_prices GROUP BY symbol HAVING MAX(trade_date) >= $1`,
    [cutoffDate],
  );
  return new Map(r.rows.map((row) => [row.symbol, row.latest]));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const period1 = Math.floor(new Date(`${FROM_DATE}T00:00:00Z`).getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);

  console.log('=== G4 SAFE backfill — Nifty Midcap 150 → research_prices ===');
  let { symbols, source } = resolveUniverse();
  if (LIMIT) symbols = symbols.slice(0, LIMIT);

  console.log(`  From:       ${FROM_DATE} → today`);
  console.log(`  Source:     ${source}`);
  console.log(`  Symbols:    ${symbols.length}${LIMIT ? ` (limited to ${LIMIT})` : ''}`);
  console.log(`  Mode:       ${DRY_RUN ? 'DRY RUN (no DB write)' : 'WRITE'}`);
  if (!DRY_RUN) {
    console.log(`  Disk guard: ceiling ${MAX_DB_GB} GB, re-checked every ${GUARD_EVERY} symbols`);
    console.log(`  Skip-existing: ${SKIP_EXISTING ? 'yes (resume mode)' : 'no'}`);
  }

  if (symbols.length === 0) { console.error('ERROR: empty universe. Check --symbols-file.'); process.exit(1); }
  if (symbols.length > MAX_SYMBOLS) {
    console.error(`ERROR: ${symbols.length} symbols exceeds --max-symbols=${MAX_SYMBOLS}. Likely a bad list. Aborting.`);
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!DRY_RUN && !connectionString) {
    console.error('ERROR: DATABASE_URL / DATABASE_PUBLIC_URL not set in .env.local');
    process.exit(1);
  }

  let pool = null;
  let skipSet = new Map();
  if (!DRY_RUN) {
    if (!Number.isFinite(MAX_DB_GB) || MAX_DB_GB <= 0) {
      console.error('ERROR: pass a real --max-db-gb (real Railway volume GB * 0.8). See Step 0 in the header.');
      process.exit(1);
    }
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    await pool.query('SELECT 1');
    await pool.query(DDL);
    const pre = await assertHeadroom(pool, MAX_DB_GB * 1024 ** 3, 'startup');
    console.log(`  ✓ table ready · current DB ${fmtGB(pre.bytes)} (${pre.pct}% of ceiling)`);
    console.log(`\n  ⚠ Verify ${MAX_DB_GB} GB matches your REAL Railway volume (Step 0). Proceeding because --write was passed.\n`);
    if (SKIP_EXISTING) {
      skipSet = await loadAlreadyPopulated(pool, FROM_DATE);
      console.log(`  resume: ${skipSet.size} symbols already populated past ${FROM_DATE} — will skip.\n`);
    }
  }

  let totalRows = 0, hits = 0, misses = 0, skipped = 0;
  const notes = [];

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    if (!DRY_RUN && SKIP_EXISTING && skipSet.has(symbol)) {
      skipped++; console.log(`  [${i + 1}/${symbols.length}] ${symbol}: skip (have data to ${skipSet.get(symbol)})`); continue;
    }
    // Periodic disk guard — the key safety fix.
    if (!DRY_RUN && i > 0 && i % GUARD_EVERY === 0) {
      const g = await assertHeadroom(pool, MAX_DB_GB * 1024 ** 3, `symbol ${i}/${symbols.length}`);
      console.log(`  [disk] ${fmtGB(g.bytes)} (${g.pct}% of ceiling) after ${i} symbols`);
    }
    if (i > 0) await sleep(YAHOO_DELAY_MS);
    try {
      const data = await fetchYahoo(symbol, period1, period2);
      if (!data) { misses++; notes.push(`${symbol}: FETCH FAIL`); continue; }
      const rows = parseHistory(data, symbol);
      if (rows.length === 0) { misses++; notes.push(`${symbol}: 0 bars`); continue; }
      if (!DRY_RUN) await upsertRows(pool, rows);
      totalRows += rows.length; hits++;
      console.log(`  [${i + 1}/${symbols.length}] ${symbol}: ${rows.length} bars (${rows[0].trade_date} → ${rows[rows.length - 1].trade_date})`);
    } catch (err) {
      // A disk-guard abort lands here — stop the whole run cleanly (don't keep hammering a full disk).
      if (String(err.message).includes('[disk-guard]')) { console.error(`\n${err.message}\n`); break; }
      misses++; notes.push(`${symbol}: ERROR ${err.message}`);
      console.warn(`  [Yahoo] ${symbol} error: ${err.message}`);
    }
  }

  if (pool) await pool.end();

  console.log('\n=== Summary ===');
  console.log(`  Symbols ok:   ${hits}/${symbols.length}`);
  console.log(`  Skipped:      ${skipped}`);
  console.log(`  Misses:       ${misses}`);
  console.log(`  Total bars:   ${totalRows}${DRY_RUN ? ' (NOT written — dry run)' : ' written/updated'}`);
  if (notes.length) {
    console.log('\n  Notes:');
    for (const n of notes.filter((l) => /FAIL|ERROR|0 bars/.test(l))) console.log(`    - ${n}`);
    const missPct = (100 * misses) / symbols.length;
    if (missPct > 20) console.log(`\n  ⚠ ${missPct.toFixed(0)}% misses — symbol list is likely wrong-format (BSE codes? missing .NS?). Fix the list, not the script.`);
  }
  console.log('\nDone.');
}

main().catch((err) => { console.error('Backfill failed:', err.message); process.exit(1); });
