#!/usr/bin/env node
//
// READ-ONLY coverage check: how much of a symbol universe is actually in research_prices?
// No writes. Created 2026-06-05 to verify G4 (midcap price backfill) coverage before Exp16.
//
//   node scripts/research/check-midcap-coverage.mjs                                  # default: shared/nifty-midcap150.json
//   node scripts/research/check-midcap-coverage.mjs --symbols-file=shared/nifty-midcap150.json --min-from=2018-01-01
//
// Reports, for the given universe: how many symbols are present in research_prices, their date ranges and
// row counts, how many have history back to --min-from, and which are missing. SELECT-only.

import { loadEnvFile } from '../_seed-utils.mjs';
import { readFileSync } from 'node:fs';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const args = process.argv.slice(2);
const getFlag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const SYMBOLS_FILE = getFlag('symbols-file', 'shared/nifty-midcap150.json');
const MIN_FROM = getFlag('min-from', '2018-01-01'); // Exp16's narrow-first window

function normalizeYahoo(sym) {
  const s = String(sym).trim().toUpperCase();
  if (!s) return null;
  if (s.startsWith('^') || s.endsWith('.NS') || s.endsWith('.BO')) return s;
  return `${s}.NS`;
}
function loadUniverse(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const arr = Array.isArray(raw) ? raw : (raw.registry || raw.symbols || []);
  return [...new Set(arr.map((e) => (typeof e === 'string' ? e : e.ticker || e.symbol)).map(normalizeYahoo).filter(Boolean))];
}

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('No DATABASE_PUBLIC_URL / DATABASE_URL in .env.local'); process.exit(1); }
  const universe = loadUniverse(SYMBOLS_FILE);
  console.log(`=== Midcap coverage in research_prices ===`);
  console.log(`  Universe file: ${SYMBOLS_FILE}  (${universe.length} symbols)`);
  console.log(`  History target: data on/before ${MIN_FROM}\n`);

  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    // Try the universe as-is (.NS form); also try bare form in case research_prices stored bare symbols.
    const bare = universe.map((s) => s.replace(/\.(NS|BO)$/i, ''));
    const res = await pool.query(
      `SELECT symbol, COUNT(*)::int AS rows, MIN(trade_date)::text AS first, MAX(trade_date)::text AS last
         FROM research_prices
        WHERE symbol = ANY($1) OR symbol = ANY($2)
        GROUP BY symbol`,
      [universe, bare],
    );
    const present = new Map();
    for (const r of res.rows) {
      // map back to the canonical .NS form for set-diff
      const key = r.symbol.endsWith('.NS') || r.symbol.endsWith('.BO') ? r.symbol : `${r.symbol}.NS`;
      present.set(key, r);
    }
    const presentSyms = new Set([...present.keys()]);
    const missing = universe.filter((s) => !presentSyms.has(s) && !present.has(s.replace(/\.(NS|BO)$/i, '')));
    const withHistory = res.rows.filter((r) => r.first <= MIN_FROM).length;
    const rowsArr = res.rows.map((r) => r.rows).sort((a, b) => a - b);
    const median = rowsArr.length ? rowsArr[Math.floor(rowsArr.length / 2)] : 0;

    console.log(`  PRESENT:  ${present.size}/${universe.length} symbols`);
    console.log(`  with history ≤ ${MIN_FROM}: ${withHistory}/${present.size}`);
    console.log(`  median bars/symbol: ${median}`);
    if (res.rows.length) {
      const lat = res.rows.map((r) => r.last).sort();
      console.log(`  latest trade_date across set: ${lat[lat.length - 1]}  ·  earliest first-bar: ${res.rows.map((r) => r.first).sort()[0]}`);
    }
    console.log(`  MISSING:  ${missing.length}/${universe.length}`);
    if (missing.length) {
      console.log('  missing symbols:');
      console.log('    ' + missing.join(', '));
    }
    // a few sample rows for eyeballing
    console.log('\n  Sample (first 8 present):');
    res.rows.slice(0, 8).forEach((r) => console.log(`    ${String(r.symbol).padEnd(16)} ${String(r.rows).padStart(6)} bars  ${r.first} → ${r.last}`));
  } finally {
    await pool.end();
  }
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
