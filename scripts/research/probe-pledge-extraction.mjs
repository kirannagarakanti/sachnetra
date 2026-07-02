#!/usr/bin/env node
//
// PROBE 1b — Where does promoter-PLEDGE signal actually live in india_bourse_announcements?
// Probe 1 found only 90 rows matching plain "pledge" text — implausibly low. Pledge / encumbrance disclosures
// are filed under SEBI SAST (Substantial Acquisition of Shares & Takeovers) Reg 31, which the native NSE
// taxonomy buckets as "Disclosure under SEBI Takeover Regulations" (~7,820 rows). This probe locates the pledge
// signal so we can fix feature F2 in the governance blow-up pre-registration before the hand-trace.
//
// BOUNDARY: READ-ONLY. SELECT-only over india_bourse_announcements. No writes to prod. Local file output only.
//   Claude authors; run with Lijo's explicit go-ahead.
//
// USAGE
//   node scripts/research/probe-pledge-extraction.mjs --selftest   # regex check, no DB
//   node scripts/research/probe-pledge-extraction.mjs              # full read-only scan
//   node scripts/research/probe-pledge-extraction.mjs --samples=30 # how many example subjects to print

import { loadEnvFile } from '../_seed-utils.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const SELFTEST = args.includes('--selftest');
const SAMPLES = Number(flag('samples', '25'));

// Broadened pledge taxonomy: creation/increase vs release vs invocation, + the SAST/Reg-31 wrapper language.
const RE_PLEDGE_ANY = /pledg|encumbr|invocation|invok|reg(ulation)? ?31|sast|substantial acquisition|takeover regulation/i;
const RE_PLEDGE_CORE = /pledg|encumbr|invok/i;                       // the actual pledge act
const RE_PLEDGE_INCREASE = /(creation|increase|additional).*(pledg|encumbr)|(pledg|encumbr).*(creat|increase)|invocation|invok|margin call/i;
const RE_PLEDGE_RELEASE = /(release|revoke|revocation|discharge).*(pledg|encumbr)|(pledg|encumbr).*(release|revoke|discharg)/i;

function bucketOf(text) {
  const t = (text || '');
  if (!RE_PLEDGE_ANY.test(t)) return null;
  if (RE_PLEDGE_RELEASE.test(t)) return 'pledge_release';
  if (RE_PLEDGE_INCREASE.test(t)) return 'pledge_increase';
  if (RE_PLEDGE_CORE.test(t)) return 'pledge_other';
  return 'sast_wrapper_no_pledge_word'; // SAST/Reg-31/takeover filing that doesn't literally say "pledge"
}

function runSelfTest() {
  console.log('=== Probe 1b self-test (synthetic; no DB) ===');
  let pass = true;
  const ck = (l, c) => { console.log(`  ${c ? '✓' : '✗'} ${l}`); if (!c) pass = false; };
  ck('creation of pledge → increase', bucketOf('Creation of pledge over promoter shareholding') === 'pledge_increase');
  ck('revocation of pledge → release', bucketOf('Revocation / release of pledge over shares') === 'pledge_release');
  ck('invocation → increase', bucketOf('Invocation of pledge by lender') === 'pledge_increase');
  ck('SAST Reg 31 wrapper without "pledge" → wrapper', bucketOf('Disclosure under Regulation 31 of SEBI SAST Regulations') === 'sast_wrapper_no_pledge_word');
  ck('encumbrance creation → increase', bucketOf('Creation of encumbrance on shares') === 'pledge_increase');
  ck('plain takeover open offer → wrapper', bucketOf('Disclosure under SEBI Takeover Regulations - open offer') === 'sast_wrapper_no_pledge_word');
  ck('routine result → null', bucketOf('Outcome of Board Meeting - quarterly results') === null);
  console.log(pass ? '\n  ✅ SELFTEST PASS' : '\n  ❌ SELFTEST FAIL'); process.exit(pass ? 0 : 1);
}

const __dir = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dir, 'output', 'probe-governance');

async function main() {
  if (SELFTEST) return runSelfTest();

  console.log('=== Probe 1b — locating promoter-PLEDGE signal (india_bourse_announcements) — READ ONLY ===');
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // Pull every row whose category OR subject smells of pledge/SAST/takeover, plus the native takeover category.
  const { rows } = await pool.query(
    `SELECT symbol, coalesce(category,'') AS category, coalesce(subject,'') AS subject,
            to_char(announced_at,'YYYY-MM-DD') AS d
       FROM india_bourse_announcements
      WHERE category ~* 'pledg|encumbr|takeover|sast|reg(ulation)? ?31'
         OR subject  ~* 'pledg|encumbr|invok|reg(ulation)? ?31|sast|substantial acquisition'`);
  await pool.end();

  // Bucket by category (where pledge signal lives) and by pledge sub-type.
  const byCat = new Map();   // native category -> count
  const bySub = new Map();   // pledge sub-bucket -> { n, syms:Set, min, max }
  const examples = { pledge_increase: [], pledge_release: [], pledge_other: [], sast_wrapper_no_pledge_word: [] };
  for (const r of rows) {
    byCat.set(r.category, (byCat.get(r.category) || 0) + 1);
    const sub = bucketOf(`${r.category} ${r.subject}`);
    if (!sub) continue;
    if (!bySub.has(sub)) bySub.set(sub, { n: 0, syms: new Set(), min: r.d, max: r.d });
    const t = bySub.get(sub); t.n++; t.syms.add(r.symbol);
    if (r.d < t.min) t.min = r.d; if (r.d > t.max) t.max = r.d;
    if (examples[sub] && examples[sub].length < SAMPLES) examples[sub].push(`${r.d}  ${r.symbol}  ${r.subject.slice(0, 90)}`);
  }

  console.log(`\n  Candidate rows pulled (pledge/SAST/takeover-ish): ${rows.length}`);
  console.log(`\n— Native categories carrying these rows —`);
  for (const [c, n] of [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${String(n).padStart(7)}  ${c}`);
  }

  console.log(`\n— Pledge sub-buckets (the F2 signal) —`);
  console.log(`  ${'bucket'.padEnd(30)} ${'rows'.padStart(7)} ${'symbols'.padStart(8)}  date range`);
  console.log('  ' + '─'.repeat(70));
  for (const [b, t] of [...bySub.entries()].sort((x, y) => y[1].n - x[1].n)) {
    console.log(`  ${b.padEnd(30)} ${String(t.n).padStart(7)} ${String(t.syms.size).padStart(8)}  ${t.min} → ${t.max}`);
  }

  const inc = bySub.get('pledge_increase');
  console.log(`\n— F2 readiness —`);
  console.log(`  pledge_increase (the friction flag we need): ${inc ? `${inc.n} rows, ${inc.syms.size} companies, ${inc.min} → ${inc.max}` : 'NONE'}`);
  console.log(`  → compare to Probe-1's plain-regex 90 rows; if materially higher, F2 should source from SAST/this scan.`);

  for (const sub of Object.keys(examples)) {
    if (!examples[sub].length) continue;
    console.log(`\n— sample subjects: ${sub} —`);
    for (const e of examples[sub]) console.log(`    ${e}`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, 'probe1b_pledge.json'), JSON.stringify({
    generated: new Date().toISOString(), candidateRows: rows.length,
    byCategory: [...byCat.entries()].map(([category, n]) => ({ category, n })),
    bySubBucket: [...bySub.entries()].map(([bucket, t]) => ({ bucket, rows: t.n, symbols: t.syms.size, first: t.min, last: t.max })),
    examples,
  }, null, 2));
  console.log(`\n  Wrote ${join(OUTPUT_DIR, 'probe1b_pledge.json')}`);
  console.log('Done (read-only).');
}

main().catch((e) => { console.error('Probe failed:', e.message); console.error(e.stack); process.exit(1); });
