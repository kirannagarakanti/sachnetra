#!/usr/bin/env node
// CLOSURE TEST — dump the actual flag-triggering filings for the 4 TIED pairs (case + control), in-window, so we can
// judge whether the tie is "both genuinely clean" (signal ceiling) or "extraction missed real distress in the case"
// (extraction ceiling). The attack round's recommended cheap diagnostic. READ-ONLY.
import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';
loadEnvFile(import.meta.url);
const { Pool } = pg;

const PAIRS = [ // [case, T0, control]
  ['PREMIER', '2025-06-20', 'GREAVESCOT'], ['SANCO', '2025-12-23', 'CORDSCABLE'],
  ['ASTRON', '2026-05-15', 'SESHAPAPER'], ['AKSHOPTFBR', '2026-06-20', 'VINDHYATEL'],
];
const BUCKETS = [
  ['auditor', /auditor/i], ['kmp', /chief financial|\bcfo\b|company secretary|key managerial/i],
  ['director', /(director|board).{0,40}(resign|cessation|vacat)|(resign|cessation).{0,20}director/i],
  ['delayed', /delay.{0,30}(result|financ)|non[- ]?submission.{0,30}(result|financ)|extension.{0,20}(result|filing)/i],
];
const flags = (t) => BUCKETS.filter(([, re]) => re.test(t)).map(([n]) => n);
const addMonths = (d, m) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCMonth(x.getUTCMonth() + m); return x.toISOString().slice(0, 10); };

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  async function dump(sym, a, b) {
    const { rows } = await pool.query(
      `SELECT to_char((announced_at AT TIME ZONE 'Asia/Kolkata')::date,'YYYY-MM-DD') AS d,
              coalesce(category,'')||' — '||coalesce(subject,'') AS txt
         FROM india_bourse_announcements WHERE symbol=$1
          AND (announced_at AT TIME ZONE 'Asia/Kolkata')::date >= $2 AND (announced_at AT TIME ZONE 'Asia/Kolkata')::date < $3
        ORDER BY d`, [sym, a, b]);
    const hits = rows.map((r) => ({ d: r.d, f: flags(r.txt), txt: r.txt })).filter((r) => r.f.length);
    return hits;
  }
  for (const [c, t0, k] of PAIRS) {
    const a = addMonths(t0, -18), b = addMonths(t0, -6);
    console.log(`\n========= TIE: ${c} (case, blow-up) vs ${k} (control)   window ${a} → ${b} =========`);
    for (const [label, sym] of [['CASE ' + c, c], ['CTRL ' + k, k]]) {
      const hits = await dump(sym, a, b);
      console.log(`  --- ${label}: ${hits.length} flag-filings ---`);
      for (const h of hits) console.log(`    ${h.d}  [${h.f.join(',')}]  ${h.txt.replace(/\s+/g, ' ').slice(0, 130)}`);
      if (!hits.length) console.log('    (none)');
    }
  }
  await pool.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
