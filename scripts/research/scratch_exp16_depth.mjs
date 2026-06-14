// READ-ONLY diagnostic: why is exp16's event sample only ~1.9 years?
// Checks the three candidate bottlenecks independently:
//   (A) india_bourse_announcements history depth (results events by year)
//   (B) research_prices midcap coverage (how many midcap names, how far back)
//   (C) the intersection that exp16 actually joins on
import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';
import { readFileSync } from 'node:fs';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const normNS = (s) => { s = String(s).trim().toUpperCase(); if (!s) return null;
  return (s.startsWith('^') || s.endsWith('.NS') || s.endsWith('.BO')) ? s : `${s}.NS`; };
const RESULTS_RE = /financial result|unaudited|audited.*result|quarterly result/;

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  const rawUniv = JSON.parse(readFileSync('shared/nifty-midcap150.json', 'utf8'));
  const arr = Array.isArray(rawUniv) ? rawUniv : (rawUniv.registry || rawUniv.symbols || []);
  const universe = [...new Set(arr.map((e) => (typeof e === 'string' ? e : e.ticker || e.symbol)).map(normNS).filter(Boolean))];
  console.log(`Midcap universe: ${universe.length} symbols (normalized .NS)\n`);

  // ── (A) announcements depth ──
  console.log('=== (A) india_bourse_announcements — overall ===');
  const a0 = await pool.query(`SELECT COUNT(*) n, MIN(announced_at) lo, MAX(announced_at) hi FROM india_bourse_announcements`);
  console.log(`  rows=${a0.rows[0].n}  span ${String(a0.rows[0].lo).slice(0,10)} → ${String(a0.rows[0].hi).slice(0,10)}`);
  const aYr = await pool.query(
    `SELECT EXTRACT(YEAR FROM announced_at AT TIME ZONE 'Asia/Kolkata')::int yr, COUNT(*) n
       FROM india_bourse_announcements GROUP BY 1 ORDER BY 1`);
  console.log('  by year (all categories):');
  for (const r of aYr.rows) console.log(`    ${r.yr}: ${r.n}`);

  // results-category subset for the midcap universe (strip .NS to match stored symbol)
  const bareSet = universe.map((s) => s.replace(/\.NS$/, ''));
  const aMid = await pool.query(
    `SELECT EXTRACT(YEAR FROM announced_at AT TIME ZONE 'Asia/Kolkata')::int yr,
            category, subject
       FROM india_bourse_announcements WHERE symbol = ANY($1)`, [bareSet]);
  const midByYr = {}; let midResults = 0;
  for (const r of aMid.rows) {
    const isRes = RESULTS_RE.test(`${r.category} ${r.subject}`.toLowerCase());
    if (!isRes) continue; midResults++;
    midByYr[r.yr] = (midByYr[r.yr] || 0) + 1;
  }
  console.log(`\n  MIDCAP results-announcements: ${midResults} total, by year:`);
  for (const y of Object.keys(midByYr).sort()) console.log(`    ${y}: ${midByYr[y]}`);

  // ── (B) research_prices midcap coverage ──
  console.log('\n=== (B) research_prices — midcap coverage ===');
  const pCov = await pool.query(
    `SELECT symbol, COUNT(*) n, MIN(trade_date) lo, MAX(trade_date) hi
       FROM research_prices WHERE symbol = ANY($1) GROUP BY symbol ORDER BY lo`, [universe]);
  console.log(`  midcap symbols present: ${pCov.rows.length}/${universe.length}`);
  if (pCov.rows.length) {
    const startYears = {};
    for (const r of pCov.rows) { const y = String(r.lo).slice(0,4); startYears[y] = (startYears[y]||0)+1; }
    console.log('  earliest-bar (start) year distribution:');
    for (const y of Object.keys(startYears).sort()) console.log(`    ${y}: ${startYears[y]} symbols`);
    console.log('  sample (5 earliest-starting):');
    for (const r of pCov.rows.slice(0,5)) console.log(`    ${r.symbol}: ${r.n} bars (${String(r.lo).slice(0,10)} → ${String(r.hi).slice(0,10)})`);
    console.log('  sample (5 latest-starting):');
    for (const r of pCov.rows.slice(-5)) console.log(`    ${r.symbol}: ${r.n} bars (${String(r.lo).slice(0,10)} → ${String(r.hi).slice(0,10)})`);
  }

  // overall research_prices span (all symbols, e.g. Nifty50 from Exp0)
  const pAll = await pool.query(`SELECT MIN(trade_date) lo, MAX(trade_date) hi, COUNT(DISTINCT symbol) syms FROM research_prices`);
  console.log(`\n  research_prices OVERALL: ${pAll.rows[0].syms} symbols, ${String(pAll.rows[0].lo).slice(0,10)} → ${String(pAll.rows[0].hi).slice(0,10)}`);

  await pool.end();
}
main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
