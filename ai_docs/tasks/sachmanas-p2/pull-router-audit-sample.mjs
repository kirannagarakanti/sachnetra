#!/usr/bin/env node
//
// SachManas Phase-2 — pull the 100-article router-precision audit sample (READ-ONLY).
// Task: ai_docs/tasks/SachManas-P2_reading-spine.md (gate item 3) · schema: ./c9_schema.sql
//
//   node pull-router-audit-sample.mjs
//
// Needs SACHMANAS_DATABASE_URL. Writes p1-router-audit/router_audit_sample.csv — one row per article with the
// router's decision + a blank `correct` column. Then run the P1d two-grader move: Claude grades provisional,
// blind Gemini grades independently, Lijo adjudicates only the disagreements. Precision = correct / 100 >= 90%.

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const env = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
const cs = (env.match(/SACHMANAS_DATABASE_URL=(\S+)/) || [])[1] || process.env.SACHMANAS_DATABASE_URL;
if (!cs) { console.error('SACHMANAS_DATABASE_URL not set — run once the SachManas spine has written rows.'); process.exit(1); }

const N = 100;
const OUT = path.join('p1-router-audit');
const csvCell = (s) => `"${String(s ?? '').replace(/"/g, '""').replace(/\s+/g, ' ').trim()}"`;

const pool = new pg.Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
try {
  // random, stratified-ish by route_label so the audit sees all three buckets (not 90% ignore)
  const { rows } = await pool.query(`
    (SELECT * FROM articles WHERE route_label='company' AND created_at > now()-interval '7 days' ORDER BY random() LIMIT 40)
    UNION ALL
    (SELECT * FROM articles WHERE route_label='factor'  AND created_at > now()-interval '7 days' ORDER BY random() LIMIT 40)
    UNION ALL
    (SELECT * FROM articles WHERE route_label='ignore'  AND created_at > now()-interval '7 days' ORDER BY random() LIMIT 20)`);

  if (rows.length < N) console.warn(`note: only ${rows.length} rows available (<${N}) — audit on what we have.`);

  const header = 'id,source_name,headline,description,route_label,route_family,category_tag,correct,note';
  const lines = rows.map((r) => [
    r.id, csvCell(r.source_name), csvCell(r.headline), csvCell((r.description || '').slice(0, 300)),
    r.route_label, r.route_family ?? '', r.category_tag ?? '', '', '',
  ].join(','));

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'router_audit_sample.csv'), [header, ...lines].join('\n'));
  console.log(`wrote ${path.join(OUT, 'router_audit_sample.csv')} — ${rows.length} rows.`);
  console.log('Next: grade the `correct` column (yes/no) two-grader style; precision = yes / total >= 90% to pass.');
} finally {
  await pool.end();
}
