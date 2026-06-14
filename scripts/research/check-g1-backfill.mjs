#!/usr/bin/env node
//
// READ-ONLY verification for the V2-031d G1 historical re-tag backfill.
// Run AFTER `node scripts/backfill-news-tags.mjs` populates nse_tickers_v2,
// and BEFORE the Phase 3 cutover. SELECTs only — safe on prod.
//
// Answers the V2-031d acceptance gates:
//   G2 — did the backfill finish? (0 rows still NULL in v2)
//   G3 — any tagging REGRESSION? (v1 tagged but v2 now empty — must be ~0)
//   G4 — recall GAIN? (v2 coverage >= v1 coverage on the same rows)
//   G5 — precision eyeball (30 random rows where v1/v2 disagree)
//   + the tagged∩scored count that feeds the Exp20 readiness call.
//
//   node scripts/research/check-g1-backfill.mjs
//
// Convention note: a "tagged" row = the array is non-NULL AND has length >= 1.
// The backfill writes empty arrays {} to no-tag rows (so the IS NULL guard can
// advance), so NULL means "not yet backfilled", {} means "backfilled, no tags".

import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

// coalesce to 0: array_length returns NULL for empty/NULL arrays, which would
// make `NOT (… >= 1)` evaluate to NULL (not false) and silently zero the
// gain/regression counters. coalesce(…,0) makes the boolean three-valued-safe.
const HAS_V1 = 'coalesce(array_length(nse_tickers, 1), 0) >= 1';
const HAS_V2 = 'coalesce(array_length(nse_tickers_v2, 1), 0) >= 1';

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set in .env.local'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // G2 — completion + headline coverage counts
  const { rows: [c] } = await pool.query(`
    SELECT
      count(*)::int                                              AS total,
      count(*) FILTER (WHERE nse_tickers_v2 IS NULL)::int        AS v2_pending,
      count(*) FILTER (WHERE ${HAS_V1})::int                     AS v1_tagged,
      count(*) FILTER (WHERE ${HAS_V2})::int                     AS v2_tagged
    FROM india_news_signals`);

  // G3/G4 — confusion between v1 and v2 (only over backfilled rows)
  const { rows: [d] } = await pool.query(`
    SELECT
      count(*) FILTER (WHERE ${HAS_V2} AND NOT (${HAS_V1}))::int AS gain_v2_only,
      count(*) FILTER (WHERE ${HAS_V1} AND NOT (${HAS_V2}))::int AS regress_v1_only,
      count(*) FILTER (WHERE ${HAS_V1} AND ${HAS_V2})::int       AS both
    FROM india_news_signals
    WHERE nse_tickers_v2 IS NOT NULL`);

  // Coverage by month (v1 vs v2) — shows the gain is on HISTORY, not just recent
  const { rows: byMonth } = await pool.query(`
    SELECT to_char(date_trunc('month', scraped_at), 'YYYY-MM') AS mon,
           count(*)::int                                  AS rows,
           count(*) FILTER (WHERE ${HAS_V1})::int         AS v1,
           count(*) FILTER (WHERE ${HAS_V2})::int         AS v2
    FROM india_news_signals
    GROUP BY 1 ORDER BY 1`);

  // tagged∩scored after backfill (Exp20 cross-section readiness)
  const { rows: [x] } = await pool.query(`
    SELECT count(*) FILTER (WHERE ${HAS_V2} AND sentiment_score IS NOT NULL)::int AS v2_tagged_scored,
           count(*) FILTER (WHERE ${HAS_V1} AND sentiment_score IS NOT NULL)::int AS v1_tagged_scored
    FROM india_news_signals`);

  // G5 — 30 random disagreement rows for a precision eyeball
  const { rows: sample } = await pool.query(`
    SELECT left(headline, 90) AS headline,
           coalesce(nse_tickers, '{}')    AS v1,
           coalesce(nse_tickers_v2, '{}') AS v2
    FROM india_news_signals
    WHERE nse_tickers_v2 IS NOT NULL
      AND (nse_tickers IS DISTINCT FROM nse_tickers_v2)
      AND (${HAS_V1} OR ${HAS_V2})
    ORDER BY random() LIMIT 30`);

  await pool.end();

  const pct = (n) => `${((100 * n) / Math.max(c.total, 1)).toFixed(2)}%`;

  console.log('=== V2-031d — G1 backfill verification (READ-ONLY) ===\n');
  console.log(`Total rows: ${c.total}`);
  console.log(`G2 completion : v2 still NULL (pending) = ${c.v2_pending}  ${c.v2_pending === 0 ? '✅ done' : '⚠ run backfill again'}`);
  console.log(`Coverage      : v1 tagged ${c.v1_tagged} (${pct(c.v1_tagged)})  ·  v2 tagged ${c.v2_tagged} (${pct(c.v2_tagged)})`);
  console.log(`G4 recall gain: v2 tags where v1 was empty = ${d.gain_v2_only}  ${c.v2_tagged >= c.v1_tagged ? '✅ v2 >= v1' : '⚠ v2 < v1 — investigate'}`);
  console.log(`G3 regression : v1 tagged but v2 empty     = ${d.regress_v1_only}  ${d.regress_v1_only === 0 ? '✅ none' : '⚠ REVIEW before cutover'}`);
  console.log(`              : both tagged                 = ${d.both}\n`);

  console.log('Exp20 cross-section (tagged ∩ scored):');
  console.log(`  via v1 = ${x.v1_tagged_scored}   →   via v2 = ${x.v2_tagged_scored}  ${x.v2_tagged_scored > x.v1_tagged_scored ? '(gain ✅)' : ''}\n`);

  console.log('Coverage by month (rows · v1 · v2):');
  for (const m of byMonth) console.log(`  ${m.mon}  ${String(m.rows).padStart(6)}  v1=${String(m.v1).padStart(5)}  v2=${String(m.v2).padStart(5)}`);

  console.log('\nG5 precision eyeball — 30 random v1≠v2 rows (verify v2 column is right):');
  for (const s of sample) {
    console.log(`  v1[${(s.v1.join(',') || '-').padEnd(18)}] v2[${(s.v2.join(',') || '-').padEnd(18)}] ${s.headline}`);
  }
  console.log('\nGates: G2 pending=0 · G3 regression≈0 · G4 v2>=v1 · G5 eyeball >=90% → then run Phase 3 cutover.');
  console.log('Done.');
}

main().catch((e) => { console.error('Check failed:', e.message); process.exit(1); });
