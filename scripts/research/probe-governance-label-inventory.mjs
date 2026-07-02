#!/usr/bin/env node
//
// PROBE 1 — Governance label/feature inventory of india_bourse_announcements.
// Feeds the governance blow-up pre-registration (research-notes/2026-06-26_governance-blowup-PREREGISTRATION.md).
//
// QUESTION IT ANSWERS:
//   Do we already collect the LABELS (SEBI 24h default disclosure, NCLT/IBC admission, credit-rating-to-D,
//   forced/compulsory delisting) and the FEATURES (auditor resignation, promoter pledge, CFO/CS/director exit,
//   RPT spike, delayed results) the pre-registration needs — and at what date depth + symbol breadth?
//
// BOUNDARY (memory/feedback_v2_prod_execution + research playbook):
//   READ-ONLY. A single SELECT-only pass over india_bourse_announcements. No writes to prod. Local file output only.
//   Claude authors; Lijo/James run against prod after review.
//
// USAGE
//   node scripts/research/probe-governance-label-inventory.mjs --selftest   # regex classifier check, no DB
//   node scripts/research/probe-governance-label-inventory.mjs              # full read-only prod inventory
//   node scripts/research/probe-governance-label-inventory.mjs --from=2023-07-01 --to=2025-06-30   # window

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
const FROM = flag('from', null);
const TO = flag('to', null);

// ── Buckets: each is a labelled regex over `category || ' ' || subject` (lower-cased). ──────────────────
// LABELS (Tier-1 distress, per pre-registration §1) and FEATURES (friction flags, §3) are tallied separately so
// we can see whether the gold label (SEBI default disclosure) is actually in the stream and how deep it goes.
const BUCKETS = [
  // --- LABELS ---
  ['LABEL default_disclosure', /default|delay in payment|payment default|reg(ulation)? ?30.*default/],
  ['LABEL insolvency_nclt_ibc', /insolvency|nclt|\bcirp\b|\bibc\b|bankrupt|liquidat/],
  ['LABEL rating_to_D', /rating/], // refined below to rating∧(D|default); kept broad here for the raw rating count
  ['LABEL delisting', /delist/],
  // --- FEATURES ---
  ['FEAT auditor', /auditor/],
  ['FEAT pledge', /pledg|encumbr|margin call|invok/],
  ['FEAT kmp_cfo_cs', /chief financial|\bcfo\b|company secretary|\bcs\b|key managerial|\bkmp\b/],
  ['FEAT director_resign', /(director|board).*(resign|cessation|vacat)|(resign|cessation).*director/],
  ['FEAT related_party', /related[ -]?part|\brpt\b/],
  ['FEAT delayed_results', /delay.*(result|financial)|extension.*(result|filing)|non[ -]?submission/],
];
// Refinement predicates that need an AND of two regexes (applied in JS for clarity, not SQL):
const RATING_TO_D = (t) => /rating/.test(t) && /\bd\b|default|\bdowngrad/.test(t);

function classify(text) {
  const t = (text || '').toLowerCase();
  const hits = [];
  for (const [name, re] of BUCKETS) if (re.test(t)) hits.push(name);
  if (RATING_TO_D(t)) hits.push('LABEL rating_to_D(refined)');
  return hits;
}

// ── Self-test (no DB): the classifier behaves on representative filing subjects ────────────────────────
function runSelfTest() {
  console.log('=== Probe 1 self-test (synthetic; no DB) ===');
  let pass = true;
  const check = (label, cond) => { console.log(`  ${cond ? '✓' : '✗'} ${label}`); if (!cond) pass = false; };
  const has = (s, b) => classify(s).includes(b);

  check('SEBI default → default_disclosure',
    has('Disclosure of default on payment of interest under Regulation 30', 'LABEL default_disclosure'));
  check('NCLT admission → insolvency bucket',
    has('Order of NCLT admitting Corporate Insolvency Resolution Process (CIRP)', 'LABEL insolvency_nclt_ibc'));
  check('rating to D → refined rating_to_D',
    has('CRISIL revises rating to CRISIL D (Default)', 'LABEL rating_to_D(refined)'));
  check('compulsory delisting → delisting', has('Compulsory delisting of equity shares', 'LABEL delisting'));
  check('auditor resignation → auditor', has('Resignation of Statutory Auditor', 'FEAT auditor'));
  check('pledge creation → pledge', has('Creation of pledge over promoter shareholding', 'FEAT pledge'));
  check('CFO exit → kmp', has('Resignation of Chief Financial Officer (CFO)', 'FEAT kmp_cfo_cs'));
  check('director resignation → director_resign', has('Cessation of Independent Director due to resignation', 'FEAT director_resign'));
  check('RPT → related_party', has('Disclosure of Related Party Transactions for the half year', 'FEAT related_party'));
  check('routine board meeting → no bucket', classify('Board meeting to consider quarterly results').length === 0);

  console.log(pass ? '\n  ✅ SELFTEST PASS' : '\n  ❌ SELFTEST FAIL — fix the classifier before trusting a prod run.');
  process.exit(pass ? 0 : 1);
}

// ── Output paths ───────────────────────────────────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dir, 'output', 'probe-governance');

async function main() {
  if (SELFTEST) return runSelfTest();

  console.log('=== Probe 1 — governance label/feature inventory (india_bourse_announcements) — READ ONLY ===');
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set in .env.local'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  const where = [];
  const params = [];
  if (FROM) { params.push(FROM); where.push(`announced_at >= $${params.length}`); }
  if (TO) { params.push(TO); where.push(`announced_at <= $${params.length}`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // 1) Headline shape: rows, date range, distinct symbols.
  const { rows: shape } = await pool.query(
    `SELECT count(*)::int AS n, count(DISTINCT symbol)::int AS symbols,
            to_char(min(announced_at),'YYYY-MM-DD') AS first, to_char(max(announced_at),'YYYY-MM-DD') AS last
       FROM india_bourse_announcements ${whereSql}`, params);
  const s = shape[0];
  console.log(`\n  Rows: ${s.n}   Distinct symbols: ${s.symbols}   Date range: ${s.first} → ${s.last}`);
  if (FROM || TO) console.log(`  (window filter: ${FROM || 'start'} → ${TO || 'today'})`);

  // 2) Top raw categories (the native NSE `category`/desc taxonomy).
  const { rows: cats } = await pool.query(
    `SELECT coalesce(category,'(null)') AS category, count(*)::int AS n
       FROM india_bourse_announcements ${whereSql}
       GROUP BY 1 ORDER BY 2 DESC LIMIT 40`, params);
  console.log(`\n— Top 40 native categories —`);
  for (const c of cats) console.log(`  ${String(c.n).padStart(7)}  ${c.category}`);

  // 3) Bucket tallies (label/feature) with date depth + symbol breadth, computed in one streamed pass.
  //    We pull category+subject+date+symbol and classify in JS (regex parity with the pre-registration).
  const { rows: all } = await pool.query(
    `SELECT symbol, coalesce(category,'') AS category, coalesce(subject,'') AS subject,
            to_char(announced_at,'YYYY-MM-DD') AS d
       FROM india_bourse_announcements ${whereSql}`, params);
  await pool.end();

  const tally = new Map(); // bucket -> { n, syms:Set, min, max }
  for (const r of all) {
    for (const b of classify(`${r.category} ${r.subject}`)) {
      if (!tally.has(b)) tally.set(b, { n: 0, syms: new Set(), min: r.d, max: r.d });
      const t = tally.get(b);
      t.n++; t.syms.add(r.symbol);
      if (r.d < t.min) t.min = r.d; if (r.d > t.max) t.max = r.d;
    }
  }

  console.log(`\n— Label / feature buckets (regex over category+subject; pre-registration parity) —`);
  console.log(`  ${'bucket'.padEnd(30)} ${'rows'.padStart(7)} ${'symbols'.padStart(8)}  date range`);
  console.log('  ' + '─'.repeat(72));
  const ordered = [...tally.entries()].sort((a, b) => b[1].n - a[1].n);
  for (const [b, t] of ordered) {
    console.log(`  ${b.padEnd(30)} ${String(t.n).padStart(7)} ${String(t.syms.size).padStart(8)}  ${t.min} → ${t.max}`);
  }

  // 4) The make-or-break flags for the pre-registration, called out explicitly.
  const got = (b) => tally.get(b)?.n || 0;
  console.log(`\n— Pre-registration readiness —`);
  console.log(`  GOLD LABEL — SEBI default disclosure rows:        ${got('LABEL default_disclosure')}`);
  console.log(`  LABEL — insolvency/NCLT/IBC rows:                 ${got('LABEL insolvency_nclt_ibc')}`);
  console.log(`  LABEL — rating-to-D (refined) rows:              ${got('LABEL rating_to_D(refined)')}`);
  console.log(`  LABEL — delisting rows:                          ${got('LABEL delisting')}`);
  console.log(`  → §5 base-rate gate needs ≥20 Tier-1 label events in the clean window to power the primary arm.`);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const out = {
    generated: new Date().toISOString(), window: { from: FROM, to: TO }, shape: s,
    topCategories: cats,
    buckets: ordered.map(([b, t]) => ({ bucket: b, rows: t.n, symbols: t.syms.size, first: t.min, last: t.max })),
  };
  writeFileSync(join(OUTPUT_DIR, 'probe1_label_inventory.json'), JSON.stringify(out, null, 2));
  console.log(`\n  Wrote ${join(OUTPUT_DIR, 'probe1_label_inventory.json')}`);
  console.log('Done (read-only).');
}

main().catch((e) => { console.error('Probe failed:', e.message); console.error(e.stack); process.exit(1); });
