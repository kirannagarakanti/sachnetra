#!/usr/bin/env node
//
// PROBE — CIRP cases from OUR OWN filings (authoritative, in-lane alternative to web-reconstructed IBBI lists).
// When a LISTED company is admitted to CIRP it files that disclosure to the exchange under the native NSE category
// "Corporate Insolvency Resolution Process" (Probe 1: 1,283 rows / ~330 symbols). The EARLIEST such filing per
// company is our best in-data proxy for the CIRP event date — correctly dated (exchange timestamp), complete
// (includes small/micro-caps), and free of web-search guessing. Output is a candidate list to HAND-VERIFY (some
// rows are updates/third-party mentions, not the company's own admission).
//
// BOUNDARY: READ-ONLY. SELECT-only over india_bourse_announcements. Local file output only.
//
// USAGE
//   node scripts/research/probe-cirp-self-disclosed.mjs            # full read-only scan
//   node scripts/research/probe-cirp-self-disclosed.mjs --primary-from=2025-06-01   # primary-window cutoff

import { loadEnvFile } from '../_seed-utils.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
// PRIMARY = first CIRP filing late enough that ~12m of prior filings exist in our 2024-05+ data.
const PRIMARY_FROM = flag('primary-from', '2025-06-01');

const __dir = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dir, 'output', 'probe-governance');

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // The native NSE category is the clean filter (far better than free-text). Include close variants defensively.
  const { rows } = await pool.query(
    `SELECT symbol, coalesce(company_name,'') AS name, coalesce(isin,'') AS isin,
            coalesce(subject,'') AS subject, coalesce(category,'') AS category,
            to_char((announced_at AT TIME ZONE 'Asia/Kolkata')::date,'YYYY-MM-DD') AS d
       FROM india_bourse_announcements
      WHERE symbol IS NOT NULL
        AND category ILIKE 'Corporate Insolvency Resolution Process'`);

  // Earliest CIRP filing per company + count + a sample subject (latest, usually the most descriptive).
  const byCo = new Map();
  for (const r of rows) {
    const c = byCo.get(r.symbol);
    if (!c) byCo.set(r.symbol, { symbol: r.symbol, name: r.name, isin: r.isin, first: r.d, last: r.d, n: 1, firstSubject: r.subject, lastSubject: r.subject });
    else {
      c.n++;
      if (r.d < c.first) { c.first = r.d; c.firstSubject = r.subject; }
      if (r.d > c.last) { c.last = r.d; c.lastSubject = r.subject; }
      if (!c.isin && r.isin) c.isin = r.isin;
    }
  }

  // Pull each company's FIRST overall filing date (lookback floor) in one query.
  const syms = [...byCo.keys()];
  if (syms.length) {
    const { rows: firsts } = await pool.query(
      `SELECT symbol, to_char(min(announced_at),'YYYY-MM-DD') AS firstfiling
         FROM india_bourse_announcements WHERE symbol = ANY($1) GROUP BY symbol`, [syms]);
    for (const f of firsts) { const c = byCo.get(f.symbol); if (c) c.firstFiling = f.firstfiling; }
  }
  await pool.end();

  const all = [...byCo.values()].sort((a, b) => a.first.localeCompare(b.first));
  const primary = all.filter((c) => c.first >= PRIMARY_FROM);

  console.log(`=== CIRP self-disclosed cases (category "Corporate Insolvency Resolution Process") — READ ONLY ===`);
  console.log(`  Companies with ≥1 such filing: ${all.length}`);
  console.log(`  PRIMARY (first CIRP filing ≥ ${PRIMARY_FROM} → ~12m lookback available): ${primary.length}`);
  console.log(`  (base-rate gate wants ≥20 genuine listed CIRP cases in the primary window)`);

  console.log(`\n— PRIMARY candidates (HAND-VERIFY each: is this the COMPANY's own admission, not a 3rd-party mention?) —`);
  console.log(`  ${'firstCIRP'.padEnd(11)} ${'symbol'.padEnd(13)} ${'cirpFilings'.padStart(5)} ${'lookback_start'.padEnd(13)} company`);
  for (const c of primary) {
    console.log(`  ${c.first.padEnd(11)} ${c.symbol.padEnd(13)} ${String(c.n).padStart(5)} ${(c.firstFiling || '—').padEnd(13)} ${c.name.slice(0, 38)}`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  let csv = 'first_cirp_filing,symbol,company_name,isin,cirp_filing_count,first_filing_overall,first_cirp_subject,VERIFY_own_admission,matched_control,pledge_pct_T0minus12m\n';
  for (const c of all) {
    csv += [c.first, c.symbol, c.name, c.isin, c.n, c.firstFiling || '', c.firstSubject, '', '', ''].map(esc).join(',') + '\n';
  }
  writeFileSync(join(OUTPUT_DIR, 'cirp_self_disclosed.csv'), csv);
  console.log(`\n  Wrote ${join(OUTPUT_DIR, 'cirp_self_disclosed.csv')}  (${all.length} rows; hand-verify the PRIMARY ones)`);
  console.log('Done (read-only).');
}

main().catch((e) => { console.error('failed:', e.message); console.error(e.stack); process.exit(1); });
