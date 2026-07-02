#!/usr/bin/env node
//
// ROSTER ASSEMBLY — the concrete CASE list for the governance blow-up hand-trace.
// Pulls Tier-1 distress events (per 2026-06-26_governance-blowup-PREREGISTRATION.md §1) from
// india_bourse_announcements, reduces each company to its EARLIEST Tier-1 event (= T0), and filters to the
// clean-window so there is ≥~12 months of prior filing history (our data starts 2024-05-30) to hand-trace.
//
// THIS IS A STARTING LIST, NOT A FINAL ONE. The human hand-trace must verify each candidate (esp. delisting =
// forced vs voluntary; insolvency = genuine CIRP admission) and reject false hits. Controls (matched survivors)
// are picked separately by hand per the §2 rule.
//
// BOUNDARY: READ-ONLY. SELECT-only over india_bourse_announcements. No writes to prod. Local file output only.
//
// USAGE
//   node scripts/research/assemble-blowup-roster.mjs --selftest             # classifier check, no DB
//   node scripts/research/assemble-blowup-roster.mjs                        # window 2025-06-01 → 2026-06-30
//   node scripts/research/assemble-blowup-roster.mjs --from=2025-09-01 --to=2026-06-30   # pre-reg primary window

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
const FROM = flag('from', '2025-06-01');   // T0 must be ≥ this so a ~12m pre-blow-up window sits in our data
const TO = flag('to', '2026-06-30');

// Tier-1 label buckets (pre-registration §1). Order = priority when one filing matches several (default is cleanest).
const RE_DEFAULT = /default|delay in payment|payment default/i;
const RE_INSOLVENCY = /insolvency|nclt|\bcirp\b|\bibc\b|bankrupt|liquidat/i;
const RE_RATING_D = /rating/i;                       // refined below with the D/default guard
const RATING_D_GUARD = /\bd\b|default|downgrad/i;
const RE_DELIST = /delist/i;

// EXCLUSIONS — the false-positive sources the first run exposed:
//  - NCLT also approves mergers/demergers ("scheme of arrangement") → healthy cos trip the insolvency filter.
//  - SEBI requires a QUARTERLY default certificate even when the answer is NIL → healthy cos trip the default filter.
//  - delisting catches subsidiary / warrant / scheme / voluntary exits, not just penal ones.
const RE_SCHEME = /scheme of arrangement|amalgamat|\bmerger\b|de-?merger|composite scheme|arrangement between|slump sale/i;
const RE_NIL_DEFAULT = /\bnil\b|no default|not applicable|no .{0,12}default|without any default|certificate.*(no|nil)/i;
const RE_BENIGN_DELIST = /scheme|warrant|debenture|\bncd\b|voluntary|subsidiar|merger|amalgamat/i;

function labelOf(text) {
  const t = (text || '');
  // Rating actions first: a "rating to D (Default)" press release contains the word "default" but is a CRA action,
  // not the company's own Reg-30 loan-default disclosure — classify it as rating, not default.
  if (RE_RATING_D.test(t) && RATING_D_GUARD.test(t)) return 'rating_to_D';
  if (RE_DEFAULT.test(t)) return RE_NIL_DEFAULT.test(t) ? null : 'default_disclosure';
  if (RE_INSOLVENCY.test(t)) return RE_SCHEME.test(t) ? null : 'insolvency_nclt';
  if (RE_DELIST.test(t)) return RE_BENIGN_DELIST.test(t) ? null : 'delisting_unverified';
  return null;
}

function runSelfTest() {
  console.log('=== Roster self-test (synthetic; no DB) ===');
  let pass = true;
  const ck = (l, c) => { console.log(`  ${c ? '✓' : '✗'} ${l}`); if (!c) pass = false; };
  ck('default disclosure', labelOf('Disclosure of default on payment of interest (Reg 30)') === 'default_disclosure');
  ck('CIRP admission', labelOf('Order admitting Corporate Insolvency Resolution Process') === 'insolvency_nclt');
  ck('compulsory delisting', labelOf('Compulsory delisting of equity shares') === 'delisting_unverified');
  ck('rating to D', labelOf('CRISIL revises rating to CRISIL D (Default)') === 'rating_to_D');
  ck('routine board meeting → null', labelOf('Board meeting to consider quarterly results') === null);
  console.log(pass ? '\n  ✅ SELFTEST PASS' : '\n  ❌ SELFTEST FAIL'); process.exit(pass ? 0 : 1);
}

const __dir = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dir, 'output', 'probe-governance');

async function main() {
  if (SELFTEST) return runSelfTest();

  console.log('=== Blow-up roster assembly (Tier-1 events) — READ ONLY ===');
  console.log(`  Window for T0 (earliest Tier-1 event): ${FROM} → ${TO}`);
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // Pull every candidate Tier-1 filing (broad SQL prefilter; precise bucketing in JS).
  const { rows } = await pool.query(
    `SELECT symbol, coalesce(company_name,'') AS company_name, coalesce(category,'') AS category,
            coalesce(subject,'') AS subject,
            to_char((announced_at AT TIME ZONE 'Asia/Kolkata')::date,'YYYY-MM-DD') AS d
       FROM india_bourse_announcements
      WHERE symbol IS NOT NULL
        AND (category ~* 'default|insolven|nclt|cirp|ibc|bankrupt|liquidat|delist|rating'
          OR subject  ~* 'default|insolven|nclt|cirp|ibc|bankrupt|liquidat|delist|rating')`);
  await pool.end();

  // Reduce to one row per company: the EARLIEST Tier-1 event = T0. Track all buckets seen + filing count.
  const byCo = new Map(); // symbol -> { symbol, company_name, t0, bucket, subject, buckets:Set, n }
  for (const r of rows) {
    const bucket = labelOf(`${r.category} ${r.subject}`);
    if (!bucket) continue;
    const cur = byCo.get(r.symbol);
    if (!cur) {
      byCo.set(r.symbol, { symbol: r.symbol, company_name: r.company_name, t0: r.d, bucket, subject: r.subject, buckets: new Set([bucket]), n: 1 });
    } else {
      cur.n++; cur.buckets.add(bucket);
      if (r.d < cur.t0) { cur.t0 = r.d; cur.bucket = bucket; cur.subject = r.subject; } // keep earliest as T0
    }
  }

  // Apply the clean-window filter on T0 + sort by T0.
  const roster = [...byCo.values()]
    .filter((c) => c.t0 >= FROM && c.t0 <= TO)
    .sort((a, b) => a.t0.localeCompare(b.t0));

  // Counts by primary bucket (the T0 bucket).
  const counts = new Map();
  for (const c of roster) counts.set(c.bucket, (counts.get(c.bucket) || 0) + 1);

  console.log(`\n  Companies with a Tier-1 event in window: ${roster.length}`);
  console.log(`  (pre-registration §5.6 base-rate gate wants ≥20 to power the primary arm)`);
  console.log(`\n— By T0 bucket —`);
  for (const [b, n] of [...counts.entries()].sort((a, b2) => b2[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${b}`);

  console.log(`\n— ROSTER (verify each by hand; delisting_unverified & insolvency need forced-vs-benign / genuine-CIRP checks) —`);
  console.log(`  ${'T0'.padEnd(11)} ${'symbol'.padEnd(14)} ${'bucket'.padEnd(22)} company / subject`);
  console.log('  ' + '─'.repeat(100));
  for (const c of roster) {
    const name = (c.company_name || c.subject).slice(0, 50);
    console.log(`  ${c.t0.padEnd(11)} ${c.symbol.padEnd(14)} ${c.bucket.padEnd(22)} ${name}`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  // CSV the analyst can open and start filling pledge%/control columns into.
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  let csv = 'T0,symbol,company_name,t0_bucket,all_buckets,n_tier1_filings,t0_subject,VERIFY_keep,matched_control,pledge_pct_T0minus12m\n';
  for (const c of roster) {
    csv += [c.t0, c.symbol, c.company_name, c.bucket, [...c.buckets].join('|'), c.n, c.subject, '', '', ''].map(esc).join(',') + '\n';
  }
  writeFileSync(join(OUTPUT_DIR, 'blowup_roster.csv'), csv);
  console.log(`\n  Wrote ${join(OUTPUT_DIR, 'blowup_roster.csv')}  (open it; fill VERIFY_keep / matched_control / pledge_pct columns by hand)`);
  console.log('Done (read-only).');
}

main().catch((e) => { console.error('Roster assembly failed:', e.message); console.error(e.stack); process.exit(1); });
