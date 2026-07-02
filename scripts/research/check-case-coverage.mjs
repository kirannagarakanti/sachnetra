#!/usr/bin/env node
//
// CASE COVERAGE CHECK — for the governance hand-trace, confirm OUR side is ready before the IBBI list lands.
// For each candidate blow-up symbol: do we hold its filings? is the ISIN (the IBBI↔us join key) populated? how
// much pre-blow-up history do we have? and do the warning-sign filings (auditor/KMP/director/default) actually
// appear for it? This tells us which cases are hand-traceable from our data NOW (recent, primary arm) vs which
// need archival (famous, pre-2024 illustrative arm).
//
// BOUNDARY: READ-ONLY. SELECT-only over india_bourse_announcements. No writes. Local file output only.
//
// USAGE
//   node scripts/research/check-case-coverage.mjs            # check the built-in seed list
//   node scripts/research/check-case-coverage.mjs --selftest # bucket classifier check, no DB

import { loadEnvFile } from '../_seed-utils.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const SELFTEST = process.argv.slice(2).includes('--selftest');

// Seed candidates. RECENT = recognizable genuine-distress names surfaced by assemble-blowup-roster (in our window,
// primary-arm candidates — still to be CONFIRMED against the IBBI L-CIN list). FAMOUS = pre-2024 deaths from the
// recons (expected ABSENT from our 2024-05+ data → illustrative arm only).
const RECENT = ['RHFL', 'IVRCLINFRA', 'ERAINFRA', 'GAMMONIND', 'VAKRANGEE', 'SETUINFRA', 'AIFL', 'GOENKA',
  'QUINTEGRA', 'INDUSFILA', 'VIVIMEDLAB', 'FLEXITUFF', 'FEDDERELEC', 'SABEVENTS', 'AKSHOPTFBR', 'PARSVNATH'];
const FAMOUS = ['DHFL', 'COX&KINGS', 'JETAIRWAYS', 'RELCAPITAL', 'SINTEX', 'FRL', 'BARTRONICS'];

const BUCKETS = [
  ['auditor', /auditor/i],
  ['kmp_cfo_cs', /chief financial|\bcfo\b|company secretary|key managerial/i],
  ['director_resign', /(director|board).*(resign|cessation|vacat)|(resign|cessation).*director/i],
  ['default', /default|delay in payment/i],
  ['insolvency', /insolvency|nclt|\bcirp\b|\bibc\b|liquidat/i],
];
function tally(text) {
  const t = text || ''; const hits = [];
  for (const [n, re] of BUCKETS) if (re.test(t)) hits.push(n);
  return hits;
}

function runSelfTest() {
  console.log('=== self-test ===');
  let pass = true; const ck = (l, c) => { console.log(`  ${c ? '✓' : '✗'} ${l}`); if (!c) pass = false; };
  ck('auditor', tally('Resignation of Statutory Auditor').includes('auditor'));
  ck('cfo', tally('Resignation of CFO').includes('kmp_cfo_cs'));
  ck('default', tally('Disclosure of default on payment').includes('default'));
  ck('insolvency', tally('Order admitting CIRP').includes('insolvency'));
  console.log(pass ? '✅ PASS' : '❌ FAIL'); process.exit(pass ? 0 : 1);
}

const __dir = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dir, 'output', 'probe-governance');

async function main() {
  if (SELFTEST) return runSelfTest();
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  const all = [...RECENT.map((s) => ['RECENT', s]), ...FAMOUS.map((s) => ['FAMOUS', s])];
  const results = [];
  for (const [arm, symbol] of all) {
    const { rows } = await pool.query(
      `SELECT coalesce(category,'')||' '||coalesce(subject,'') AS txt,
              coalesce(isin,'') AS isin, coalesce(company_name,'') AS name,
              to_char(announced_at,'YYYY-MM-DD') AS d
         FROM india_bourse_announcements WHERE symbol = $1`, [symbol]);
    const counts = {}; let isin = '', name = '', first = '', last = '';
    for (const r of rows) {
      if (!isin && r.isin) isin = r.isin;
      if (!name && r.name) name = r.name;
      if (!first || r.d < first) first = r.d;
      if (!last || r.d > last) last = r.d;
      for (const b of tally(r.txt)) counts[b] = (counts[b] || 0) + 1;
    }
    results.push({ arm, symbol, found: rows.length > 0, n: rows.length, isin, name, first, last, counts });
  }
  await pool.end();

  const fmtCounts = (c) => BUCKETS.map(([b]) => `${b.slice(0, 4)}:${c[b] || 0}`).join(' ');
  for (const arm of ['RECENT', 'FAMOUS']) {
    console.log(`\n=== ${arm} candidates ===`);
    console.log(`  ${'symbol'.padEnd(12)} ${'found'.padEnd(6)} ${'isin'.padEnd(14)} ${'filings'.padStart(7)}  ${'first'.padEnd(11)} ${'last'.padEnd(11)} warning-sign filings`);
    for (const r of results.filter((x) => x.arm === arm)) {
      if (!r.found) { console.log(`  ${r.symbol.padEnd(12)} ${'NO'.padEnd(6)} ${'—'.padEnd(14)} ${'0'.padStart(7)}  (not in our filings — symbol differs or pre-2024)`); continue; }
      console.log(`  ${r.symbol.padEnd(12)} ${'yes'.padEnd(6)} ${(r.isin || '—').padEnd(14)} ${String(r.n).padStart(7)}  ${r.first.padEnd(11)} ${r.last.padEnd(11)} ${fmtCounts(r.counts)}`);
    }
  }
  const foundRecent = results.filter((r) => r.arm === 'RECENT' && r.found).length;
  console.log(`\n  RECENT candidates present in our filings: ${foundRecent}/${RECENT.length}`);
  console.log(`  ISIN populated (the IBBI join key): ${results.filter((r) => r.found && r.isin).length}/${results.filter((r) => r.found).length} of found`);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, 'case_coverage.json'), JSON.stringify(results, null, 2));
  console.log(`\n  Wrote ${join(OUTPUT_DIR, 'case_coverage.json')}`);
  console.log('Done (read-only).');
}

main().catch((e) => { console.error('failed:', e.message); console.error(e.stack); process.exit(1); });
