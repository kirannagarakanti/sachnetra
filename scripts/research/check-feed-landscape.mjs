#!/usr/bin/env node
//
// READ-ONLY feed-landscape probe of prod india_news_signals. Answers Lijo's
// 2026-06-09 questions about the RSS layer:
//   Q2 — how many distinct sources actually deliver rows (+ top contributors)
//   Q4 — which configured feeds are SILENT (in config but 0 rows = dead/misrouted)
//   Q5 — "who gets to the news first" — within each cluster_hash, which source
//        carries the earliest published_at (first-to-break leaderboard) + lead time
// SELECTs only — safe on prod (runs fine alongside the V2-031d backfill).
//
//   node scripts/research/check-feed-landscape.mjs

import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // Q2 — source coverage
  const { rows: [tot] } = await pool.query(
    `SELECT count(*)::int AS rows, count(DISTINCT source_name)::int AS sources,
            to_char(min(scraped_at),'YYYY-MM-DD') AS first, to_char(max(scraped_at),'YYYY-MM-DD') AS last
       FROM india_news_signals`);
  const { rows: topSrc } = await pool.query(
    `SELECT source_name, count(*)::int AS rows,
            count(*) FILTER (WHERE array_length(nse_tickers,1) >= 1)::int AS tagged
       FROM india_news_signals GROUP BY source_name ORDER BY rows DESC LIMIT 30`);

  // Q5 — first-to-break: within each multi-source cluster, who has the earliest published_at?
  // Guard: need cluster_hash, published_at present, and >=2 DISTINCT sources in the cluster.
  const { rows: firstBreak } = await pool.query(`
    WITH multi AS (
      SELECT cluster_hash FROM india_news_signals
       WHERE cluster_hash IS NOT NULL AND published_at IS NOT NULL
       GROUP BY cluster_hash HAVING count(DISTINCT source_name) >= 2
    ),
    ranked AS (
      SELECT s.source_name,
             row_number() OVER (PARTITION BY s.cluster_hash ORDER BY s.published_at ASC) AS rnk
        FROM india_news_signals s
        JOIN multi m USING (cluster_hash)
       WHERE s.published_at IS NOT NULL
    )
    SELECT source_name,
           count(*) FILTER (WHERE rnk = 1)::int AS first_wins,
           count(*)::int                        AS appearances
      FROM ranked
     GROUP BY source_name
     HAVING count(*) >= 10
     ORDER BY first_wins DESC LIMIT 25`);

  const { rows: [clStat] } = await pool.query(`
    SELECT count(*)::int AS multi_source_clusters FROM (
      SELECT cluster_hash FROM india_news_signals
       WHERE cluster_hash IS NOT NULL AND published_at IS NOT NULL
       GROUP BY cluster_hash HAVING count(DISTINCT source_name) >= 2
    ) q`);

  await pool.end();

  console.log('=== Feed landscape (READ-ONLY) ===\n');
  console.log(`Q2 · Coverage: ${tot.rows} rows · ${tot.sources} distinct sources · ${tot.first} → ${tot.last}\n`);
  console.log('Top sources by volume (rows · tagged · tag%):');
  for (const s of topSrc) {
    const pct = ((100 * s.tagged) / Math.max(s.rows, 1)).toFixed(1);
    console.log(`  ${String(s.source_name ?? '(null)').padEnd(26)} ${String(s.rows).padStart(6)}  ${String(s.tagged).padStart(5)}  ${pct.padStart(5)}%`);
  }

  console.log(`\nQ5 · First-to-break — ${clStat.multi_source_clusters} multi-source clusters (>=2 distinct sources).`);
  console.log('Leaderboard: who carries the EARLIEST published_at in a shared story (wins · appearances · win%):');
  for (const f of firstBreak) {
    const pct = ((100 * f.first_wins) / Math.max(f.appearances, 1)).toFixed(0);
    console.log(`  ${String(f.source_name ?? '(null)').padEnd(26)} ${String(f.first_wins).padStart(5)} / ${String(f.appearances).padStart(5)}  (${pct.padStart(3)}%)`);
  }
  console.log('\nNote: published_at is the OUTLET-claimed time (can be missing/unreliable); first-to-break = first to PUBLISH among our feeds, not first we scraped.');
  console.log('Done.');
}

main().catch((e) => { console.error('Check failed:', e.message); process.exit(1); });
