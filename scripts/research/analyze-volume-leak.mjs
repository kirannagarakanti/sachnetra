#!/usr/bin/env node
//
// VOLUME-LEAK CHECK — the attack round's near-unanimous #1 critique: is the "governance friction score" just a
// proxy for FILING VOLUME (distressed firms file more → more chances to hit a flag-type)? For each case + control,
// over the SAME pre-reg window [T0-18m, T0-6m], count TOTAL filings and TOTAL DISTINCT native categories. If
// blow-ups systematically file more / have more distinct categories than their healthy controls, the score is
// partly a volume/activity proxy, not governance. READ-ONLY.

import { loadEnvFile } from '../_seed-utils.mjs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
loadEnvFile(import.meta.url);
const { Pool } = pg;

// [case, T0, control]
const PAIRS = [
  ['SIGIND', '2025-06-11', 'APOLLOPIPE'], ['GENSOL', '2025-06-13', 'KPIGREEN'],
  ['PREMIER', '2025-06-20', 'GREAVESCOT'], ['MARSHALL', '2025-08-25', 'MACPOWER'],
  ['SABEVENTS', '2025-12-02', 'NAZARA'], ['GOENKA', '2025-12-10', 'GOLDIAM'],
  ['SANCO', '2025-12-23', 'CORDSCABLE'], ['VIVIMEDLAB', '2026-02-13', 'KOPRAN'],
  ['WINSOME', '2026-04-17', 'NITINSPIN'], ['PARSVNATH', '2026-04-30', 'ASHIANA'],
  ['OSIAHYPER', '2026-05-04', 'V2RETAIL'], ['AKSHOPTFBR', '2026-06-20', 'VINDHYATEL'],
  ['ASTRON', '2026-05-15', 'SESHAPAPER'],
];
const addMonths = (d, m) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCMonth(x.getUTCMonth() + m); return x.toISOString().slice(0, 10); };

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  async function vol(sym, a, b) {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n, count(DISTINCT category)::int AS cats
         FROM india_bourse_announcements
        WHERE symbol=$1 AND (announced_at AT TIME ZONE 'Asia/Kolkata')::date >= $2
          AND (announced_at AT TIME ZONE 'Asia/Kolkata')::date < $3`, [sym, a, b]);
    return rows[0];
  }
  console.log('VOLUME-LEAK CHECK — total filings & distinct categories in [T0-18m, T0-6m]\n');
  console.log(`  ${'CASE'.padEnd(12)} ${'filings'.padStart(7)} ${'cats'.padStart(5)}  | ${'CONTROL'.padEnd(12)} ${'filings'.padStart(7)} ${'cats'.padStart(5)}  case_files_more?`);
  let caseMoreFilings = 0, caseMoreCats = 0;
  const ratios = [];
  for (const [c, t0, k] of PAIRS) {
    const a = addMonths(t0, -18), b = addMonths(t0, -6);
    const cv = await vol(c, a, b), kv = await vol(k, a, b);
    const moreF = cv.n > kv.n, moreC = cv.cats > kv.cats;
    if (moreF) caseMoreFilings++; if (moreC) caseMoreCats++;
    if (kv.n > 0) ratios.push(cv.n / kv.n);
    console.log(`  ${c.padEnd(12)} ${String(cv.n).padStart(7)} ${String(cv.cats).padStart(5)}  | ${k.padEnd(12)} ${String(kv.n).padStart(7)} ${String(kv.cats).padStart(5)}  ${moreF ? 'YES' : 'no'}${moreC ? ' (+cats)' : ''}`);
  }
  await pool.end();
  const n = PAIRS.length;
  const medRatio = ratios.sort((a, b) => a - b)[Math.floor(ratios.length / 2)];
  console.log(`\n  Cases filed MORE than control: ${caseMoreFilings}/${n}  (distinct categories: ${caseMoreCats}/${n})`);
  console.log(`  Median case/control filing-count ratio: ${medRatio ? medRatio.toFixed(2) : 'n/a'}x`);
  console.log(`  → If cases file much more (ratio >>1, ${caseMoreFilings}/${n} high), the governance score is partly a`);
  console.log(`    FILING-VOLUME/activity proxy — the attack round's #1 critique. Compare this split to the 8/13`);
  console.log(`    governance-score wins: if volume tracks the wins, the "governance" signal is mostly activity.`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
