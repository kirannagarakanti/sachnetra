#!/usr/bin/env node
//
// SachManas Phase-2 gate check (READ-ONLY). Prints the gate numbers in one shot.
// Task: ai_docs/tasks/SachManas-P2_reading-spine.md · schema: ./c9_schema.sql
//
//   node check-sachmanas-phase2.mjs
//
// Needs SACHMANAS_DATABASE_URL in .env.local (the Mind's OWN db — NOT the SachNetra DATABASE_URL).
// Does NOT cover: cost (glance at console.groq.com) and the 100-article precision audit
// (run pull-router-audit-sample.mjs). This covers gate items 1, 2, the route mix, and freshness.

import fs from 'node:fs';
import pg from 'pg';

const env = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
const cs = (env.match(/SACHMANAS_DATABASE_URL=(\S+)/) || [])[1] || process.env.SACHMANAS_DATABASE_URL;
if (!cs) {
  console.error('SACHMANAS_DATABASE_URL not set (the Mind\'s own DB). Nothing to check yet — this runs once');
  console.error('James has stood up the SachManas Postgres and the spine has written rows.');
  process.exit(1);
}

const ok = (b) => (b ? '✓' : '✗ FAIL');
const pool = new pg.Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

try {
  // 1 + freshness — run_log continuity over the last 7 days
  const { rows: [rl] } = await pool.query(`
    SELECT count(*)                                                       AS cycles,
           min(started_at)                                               AS first_run,
           max(started_at)                                               AS last_run,
           extract(epoch FROM (now() - max(started_at)))/60              AS mins_since_last,
           round(extract(epoch FROM (max(started_at) - min(started_at)))/86400.0, 1) AS days_live
      FROM run_log WHERE started_at > now() - interval '7 days'`);

  // longest gap between consecutive cycles (a dead-cron detector)
  const { rows: [gap] } = await pool.query(`
    SELECT COALESCE(round(max(gap_min)), 0) AS longest_gap_min FROM (
      SELECT extract(epoch FROM (started_at - lag(started_at) OVER (ORDER BY started_at)))/60 AS gap_min
        FROM run_log WHERE started_at > now() - interval '7 days') t`);

  // 2 + route mix — coverage and the company/factor/ignore split
  const { rows: [a] } = await pool.query(`
    SELECT count(*)                                                  AS total,
           count(*) FILTER (WHERE route_label IS NOT NULL)           AS labeled,
           count(*) FILTER (WHERE route_label = 'company')           AS company,
           count(*) FILTER (WHERE route_label = 'factor')            AS factor,
           count(*) FILTER (WHERE route_label = 'ignore')            AS ignore_,
           round(100.0 * count(*) FILTER (WHERE route_label IS NOT NULL) / NULLIF(count(*),0), 1) AS pct
      FROM articles WHERE created_at > now() - interval '7 days'`);

  // last cycle freshness
  const { rows: [last] } = await pool.query(`
    SELECT items_new FROM run_log ORDER BY started_at DESC LIMIT 1`);

  const weekLive = Number(rl.days_live) >= 6.8 && Number(gap.longest_gap_min) <= 60;
  const categorized = Number(a.pct) >= 95;
  const fresh = Number(rl.mins_since_last) <= 30;

  console.log('=== SachManas Phase-2 gate ===\n');
  console.log(`  1. Week live:     ${rl.days_live} days · ${rl.cycles} cycles · longest gap ${gap.longest_gap_min} min   ${ok(weekLive)}`);
  console.log(`  2. Categorized:   ${a.pct}%  (${a.labeled} / ${a.total} articles)                    ${ok(categorized)}`);
  console.log(`     Route mix:     company ${a.company} · factor ${a.factor} · ignore ${a.ignore_}`);
  console.log(`  5. Last cycle:    ${Math.round(rl.mins_since_last)} min ago · items_new ${last?.items_new ?? '?'}        ${ok(fresh)}`);
  console.log('\n  4. Cost:          glance at console.groq.com — confirm under the 14,400/day free cap ($0)');
  console.log('  3. Precision:     run  node pull-router-audit-sample.mjs  → 100-article two-grader audit (>=90%)');
  console.log(`\n  Quick gates ${weekLive && categorized && fresh ? 'PASS' : 'NOT yet all green'} — still need #3 (precision) + #4 (cost) confirmed by hand.`);
} finally {
  await pool.end();
}
