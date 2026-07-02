#!/usr/bin/env node
//
// ROSTER FROM IBBI — turns the IBBI CIRP export into the clean hand-trace case roster, joined to our filings.
// Consumes scratch/ibbi_cirp.csv (+ optional scratch/bse_scrip_master.csv for the CIN→ISIN bridge), applies the
// pre-registration §1 filters (L-CIN listed filter; drop <90-day Sec-12A withdrawals; keep Ongoing/Resolution/
// Liquidation = equity wipeouts), then joins to india_bourse_announcements to report which cases we can actually
// hand-trace (have ≥~12m of prior filings) vs which are illustrative-only (pre-2024).
//
// BOUNDARY: READ-ONLY on the DB. Reads local CSVs. No writes to prod. Local file output only.
//
// USAGE
//   node scripts/research/assemble-roster-from-ibbi.mjs --selftest        # parser + filter check, no files/DB
//   node scripts/research/assemble-roster-from-ibbi.mjs                   # full run (needs scratch/ibbi_cirp.csv)
//   node scripts/research/assemble-roster-from-ibbi.mjs --ibbi=path.csv --bse=path.csv

import { loadEnvFile } from '../_seed-utils.mjs';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..', '..');
const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const SELFTEST = args.includes('--selftest');
const IBBI_PATH = flag('ibbi', join(ROOT, 'scratch', 'ibbi_cirp.csv'));
const BSE_PATH = flag('bse', join(ROOT, 'scratch', 'bse_scrip_master.csv'));
const OUTPUT_DIR = join(__dir, 'output', 'probe-governance');

// ── Minimal robust CSV parser (handles quoted fields, embedded commas/newlines) ───────────────────────
function parseCsv(text) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}
function toObjects(rows) {
  if (!rows.length) return [];
  const hdr = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => Object.fromEntries(hdr.map((h, i) => [h, (r[i] ?? '').trim()])));
}
// Find a column whose header contains any of the given needles.
function col(obj, needles) {
  const keys = Object.keys(obj);
  for (const nd of needles) { const k = keys.find((kk) => kk.includes(nd)); if (k) return k; }
  return null;
}

const normName = (s) => (s || '').toLowerCase()
  .replace(/&/g, ' and ').replace(/\b(limited|ltd|private|pvt|the|company|co|inc|corporation|corp)\b/g, '')
  .replace(/[^a-z0-9]+/g, '').trim();
const isIsin = (s) => /^IN[EF0-9A-Z]{10}$/i.test((s || '').trim());
const parseDate = (s) => {
  const t = (s || '').trim(); if (!t) return null;
  // accept YYYY-MM-DD or DD-MMM-YYYY or DD/MM/YYYY
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[-\/]([A-Za-z]{3})[-\/](\d{4})/);
  if (m) { const mo = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' }[m[2].toLowerCase()]; if (mo) return `${m[3]}-${mo}-${String(m[1]).padStart(2, '0')}`; }
  m = t.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/); if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  return null;
};
const daysBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / 86400000;

// ── Filter one IBBI row → kept case or rejection reason ────────────────────────────────────────────────
function classifyCase(c) {
  const cin = (c.cin || '').trim().toUpperCase();
  if (!/^L/.test(cin)) return { keep: false, reason: 'not_listed (CIN not L*)' };
  const status = (c.status || '').toLowerCase();
  const isWithdrawn = /withdraw|12a/.test(status);
  if (isWithdrawn) {
    const gap = c.admission_date && c.withdrawal_date ? daysBetween(c.admission_date, c.withdrawal_date) : null;
    if (gap != null && gap < 90) return { keep: false, reason: `withdrawn_<90d (${Math.round(gap)}d)` };
    if (gap == null) return { keep: true, reason: 'withdrawn_but_undated (MANUAL: verify >90d)' };
  }
  return { keep: true, reason: 'kept' };
}

function runSelfTest() {
  console.log('=== self-test (no files/DB) ===');
  let pass = true; const ck = (l, x) => { console.log(`  ${x ? '✓' : '✗'} ${l}`); if (!x) pass = false; };
  const rows = parseCsv('name,cin,admission,status,"with, draw"\nFoo Ltd,L123,03-Dec-2019,Resolution,\n"Bar, Inc",U999,2020-01-01,Ongoing,\n');
  const objs = toObjects(rows);
  ck('parses 2 data rows', objs.length === 2);
  ck('quoted field with comma', objs[1][Object.keys(objs[1])[0]] === 'Bar, Inc');
  ck('date DD-MMM-YYYY', parseDate('03-Dec-2019') === '2019-12-03');
  ck('date YYYY-MM-DD', parseDate('2025-09-19') === '2025-09-19');
  ck('isin detect', isIsin('INE217K07AB6') && !isIsin('L65910MH1984'));
  ck('L-CIN kept', classifyCase({ cin: 'L65910MH1984', status: 'Resolution' }).keep);
  ck('U-CIN dropped', !classifyCase({ cin: 'U17121MH2006', status: 'Ongoing' }).keep);
  ck('12A <90d dropped', !classifyCase({ cin: 'L1', status: 'Withdrawn u/s 12A', admission_date: '2025-01-01', withdrawal_date: '2025-02-01' }).keep);
  ck('12A >90d kept', classifyCase({ cin: 'L1', status: 'Withdrawn u/s 12A', admission_date: '2025-01-01', withdrawal_date: '2025-06-01' }).keep);
  ck('normName', normName('Reliance Home Finance Limited') === 'reliancehomefinance');
  console.log(pass ? '\n✅ SELFTEST PASS' : '\n❌ SELFTEST FAIL'); process.exit(pass ? 0 : 1);
}

async function main() {
  if (SELFTEST) return runSelfTest();
  if (!existsSync(IBBI_PATH)) {
    console.error(`ERROR: ${IBBI_PATH} not found.\n  Save the IBBI CIRP export there as CSV (cols: company_name, cin, admission_date, status, withdrawal_date, [isin|symbol]).`);
    process.exit(1);
  }

  // 1) Load + normalize the IBBI export (flexible column detection).
  const raw = toObjects(parseCsv(readFileSync(IBBI_PATH, 'utf8')));
  if (!raw.length) { console.error('ERROR: IBBI csv parsed to 0 rows.'); process.exit(1); }
  const k = {
    name: col(raw[0], ['debtor', 'corporate debtor', 'company', 'name']),
    cin: col(raw[0], ['cin']),
    adm: col(raw[0], ['admission', 'commencement', 'date of admission', 'cirp commencement']),
    status: col(raw[0], ['status', 'outcome']),
    wdraw: col(raw[0], ['withdraw', 'date of withdraw']),
    isin: col(raw[0], ['isin']),
    sym: col(raw[0], ['symbol', 'scrip']),
  };
  console.log('  IBBI columns detected:', k);
  const cases = raw.map((r) => ({
    name: r[k.name] || '', cin: r[k.cin] || '', admission_date: parseDate(r[k.adm]),
    status: r[k.status] || '', withdrawal_date: parseDate(r[k.wdraw]),
    isin: k.isin && isIsin(r[k.isin]) ? r[k.isin].trim().toUpperCase() : '',
    symbol: k.sym ? (r[k.sym] || '').trim().toUpperCase() : '',
  }));

  // 2) Optional BSE master → CIN→ISIN bridge.
  const cin2isin = new Map();
  if (existsSync(BSE_PATH)) {
    const bse = toObjects(parseCsv(readFileSync(BSE_PATH, 'utf8')));
    const bk = { cin: col(bse[0], ['cin']), isin: col(bse[0], ['isin']) };
    if (bk.cin && bk.isin) for (const b of bse) { const c = (b[bk.cin] || '').toUpperCase().trim(); const ii = (b[bk.isin] || '').toUpperCase().trim(); if (c && isIsin(ii)) cin2isin.set(c, ii); }
    console.log(`  BSE master loaded: ${cin2isin.size} CIN→ISIN mappings`);
  }
  for (const c of cases) if (!c.isin && cin2isin.has(c.cin.toUpperCase())) c.isin = cin2isin.get(c.cin.toUpperCase());

  // 3) Apply pre-registration filters.
  const kept = []; const dropped = [];
  for (const c of cases) { const v = classifyCase(c); (v.keep ? kept : dropped).push({ ...c, reason: v.reason }); }
  console.log(`\n  IBBI rows: ${cases.length}  → listed & non-trivial kept: ${kept.length}  (dropped: ${dropped.length})`);

  // 4) Join to our filings (by ISIN preferred, else normalized company name).
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  let ourByIsin = new Map(), ourByName = new Map();
  if (cs) {
    const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
    const { rows } = await pool.query(
      `SELECT symbol, coalesce(isin,'') AS isin, coalesce(company_name,'') AS name,
              count(*)::int AS n, to_char(min(announced_at),'YYYY-MM-DD') AS first, to_char(max(announced_at),'YYYY-MM-DD') AS last
         FROM india_bourse_announcements GROUP BY symbol, isin, company_name`);
    await pool.end();
    for (const r of rows) {
      if (r.isin) ourByIsin.set(r.isin.toUpperCase(), r);
      const nn = normName(r.name); if (nn) ourByName.set(nn, r);
    }
    console.log(`  Our filings index: ${ourByIsin.size} ISINs, ${ourByName.size} names`);
  } else {
    console.log('  (no DB connection — skipping our-filings join; will only emit the filtered IBBI list)');
  }

  // 5) Build roster rows with coverage.
  const roster = kept.map((c) => {
    const hit = (c.isin && ourByIsin.get(c.isin)) || ourByName.get(normName(c.name)) || null;
    const lookbackOk = hit && c.admission_date && hit.first <= c.admission_date && daysBetween(hit.first, c.admission_date) >= 300;
    return {
      name: c.name, cin: c.cin, admission_date: c.admission_date, status: c.status, isin: c.isin || (hit?.isin ?? ''),
      our_symbol: hit?.symbol ?? '', our_filings: hit?.n ?? 0, our_first: hit?.first ?? '', our_last: hit?.last ?? '',
      arm: !hit ? 'NO_FILINGS (illustrative/archival)' : (lookbackOk ? 'PRIMARY (hand-traceable)' : 'PARTIAL (thin lookback)'),
      reason: c.reason,
    };
  }).sort((a, b) => (a.admission_date || '').localeCompare(b.admission_date || ''));

  const byArm = roster.reduce((m, r) => (m[r.arm] = (m[r.arm] || 0) + 1, m), {});
  console.log(`\n— Roster by arm —`); for (const [a, n] of Object.entries(byArm)) console.log(`  ${String(n).padStart(4)}  ${a}`);

  console.log(`\n— ROSTER —`);
  console.log(`  ${'admission'.padEnd(11)} ${'our_symbol'.padEnd(12)} ${'filings'.padStart(7)} ${'first'.padEnd(11)} ${'arm'.padEnd(28)} company`);
  for (const r of roster) {
    console.log(`  ${(r.admission_date || '—').padEnd(11)} ${(r.our_symbol || '—').padEnd(12)} ${String(r.our_filings).padStart(7)} ${(r.our_first || '—').padEnd(11)} ${r.arm.padEnd(28)} ${r.name.slice(0, 40)}`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const cols = ['admission_date', 'name', 'cin', 'status', 'isin', 'our_symbol', 'our_filings', 'our_first', 'our_last', 'arm', 'reason'];
  let out = cols.join(',') + ',matched_control,pledge_pct_T0minus12m,VERIFY_keep\n';
  for (const r of roster) out += cols.map((c) => esc(r[c])).join(',') + ',,,\n';
  writeFileSync(join(OUTPUT_DIR, 'hand_trace_roster.csv'), out);
  console.log(`\n  Wrote ${join(OUTPUT_DIR, 'hand_trace_roster.csv')}  (the hand-trace working sheet — fill control + pledge% columns)`);
  console.log('Done (read-only).');
}

main().catch((e) => { console.error('failed:', e.message); console.error(e.stack); process.exit(1); });
