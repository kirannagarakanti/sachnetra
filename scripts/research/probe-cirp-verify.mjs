#!/usr/bin/env node
//
// VERIFY — dump the full "Corporate Insolvency Resolution Process" filings for the PRIMARY CIRP candidates so we
// can hand-classify each: GENUINE own-admission (keep, with real date) / subsidiary or 3rd-party mention (drop) /
// stayed or withdrawn (drop or flag) / update-only-first-filing (adjust date). READ-ONLY.
//
// USAGE
//   node scripts/research/probe-cirp-verify.mjs                       # symbols with first CIRP filing >= 2025-06-01
//   node scripts/research/probe-cirp-verify.mjs --from=2025-06-01

import { loadEnvFile } from '../_seed-utils.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const FROM = flag('from', '2025-06-01');
const __dir = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dir, 'output', 'probe-governance');

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // PRIMARY symbols = first CIRP-category filing >= FROM.
  const { rows: primary } = await pool.query(
    `SELECT symbol, min((announced_at AT TIME ZONE 'Asia/Kolkata')::date) AS firstcirp
       FROM india_bourse_announcements
      WHERE category ILIKE 'Corporate Insolvency Resolution Process'
      GROUP BY symbol HAVING min((announced_at AT TIME ZONE 'Asia/Kolkata')::date) >= $1
      ORDER BY firstcirp`, [FROM]);
  const syms = primary.map((r) => r.symbol);

  // All CIRP filings for those symbols, full subject.
  const { rows } = await pool.query(
    `SELECT symbol, coalesce(company_name,'') AS name,
            to_char((announced_at AT TIME ZONE 'Asia/Kolkata')::date,'YYYY-MM-DD') AS d,
            coalesce(subject,'') AS subject
       FROM india_bourse_announcements
      WHERE symbol = ANY($1) AND category ILIKE 'Corporate Insolvency Resolution Process'
      ORDER BY symbol, d`, [syms]);
  await pool.end();

  const byCo = new Map();
  for (const r of rows) { if (!byCo.has(r.symbol)) byCo.set(r.symbol, { name: r.name, rows: [] }); byCo.get(r.symbol).rows.push(r); }

  let dump = '';
  for (const s of syms) {
    const c = byCo.get(s); if (!c) continue;
    const header = `\n=== ${s}  —  ${c.name}  (${c.rows.length} CIRP filings) ===`;
    console.log(header); dump += header + '\n';
    for (const r of c.rows) {
      const line = `  ${r.d}  ${r.subject.replace(/\s+/g, ' ').trim().slice(0, 240)}`;
      console.log(line); dump += line + '\n';
    }
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, 'cirp_verify_dump.txt'), dump);
  console.log(`\n  ${syms.length} primary symbols dumped → ${join(OUTPUT_DIR, 'cirp_verify_dump.txt')}`);
}
main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
