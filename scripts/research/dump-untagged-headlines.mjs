#!/usr/bin/env node
//
// V2-031 recon helper — dump a 50-row sample of headlines that are currently
// UNTAGGED (no nse_tickers) from india_news_signals, for Gemini's NER eval.
//
// Why this script: Railway's Data console can't run ORDER BY + LIMIT against
// the table-filter view (it wraps the SQL in its own template and errors on
// "LIMIT"). See memory/reference_railway_query_console. Run this from the
// repo against DATABASE_PUBLIC_URL instead.
//
// BOUNDARY: read-only. Single SELECT. Saves to scripts/research/output/v2-031/.
//
// USAGE
//   node scripts/research/dump-untagged-headlines.mjs                      # 50 rows, random sample
//   node scripts/research/dump-untagged-headlines.mjs --limit=200          # bigger sample
//   node scripts/research/dump-untagged-headlines.mjs --recent              # ORDER BY published_at DESC instead of random
//   node scripts/research/dump-untagged-headlines.mjs --market-moving-only  # only is_market_moving=true rows

import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const LIMIT = Math.max(1, Number(flag('limit', '50')));
const RECENT = args.includes('--recent');
const MM_ONLY = args.includes('--market-moving-only');

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'output', 'v2-031');
const OUT_PATH = join(OUT_DIR, 'headlines_untagged_sample.csv');

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_PUBLIC_URL or DATABASE_URL not set in .env.local');
    process.exit(1);
  }

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    const whereClauses = [
      '(nse_tickers IS NULL OR COALESCE(array_length(nse_tickers, 1), 0) = 0)',
    ];
    if (MM_ONLY) whereClauses.push('is_market_moving = TRUE');

    const orderBy = RECENT ? 'published_at DESC NULLS LAST' : 'RANDOM()';

    const sql = `
      SELECT
        id,
        headline,
        source_name,
        published_at,
        is_market_moving,
        sectors,
        event_category
      FROM india_news_signals
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $1
    `;

    console.log('Connecting to Railway PostgreSQL...');
    const { rows: countRows } = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE nse_tickers IS NULL OR COALESCE(array_length(nse_tickers, 1), 0) = 0) AS untagged
      FROM india_news_signals
    `);
    const total = Number(countRows[0].total);
    const untagged = Number(countRows[0].untagged);
    const pct = total > 0 ? (100 * untagged / total).toFixed(2) : 'NaN';
    console.log(`✓ Connected. Total rows: ${total}, untagged: ${untagged} (${pct}%)`);
    console.log(`  Strategy: ${RECENT ? 'most-recent' : 'random sample'}${MM_ONLY ? ', market-moving only' : ''}, LIMIT ${LIMIT}`);

    const { rows } = await pool.query(sql, [LIMIT]);
    console.log(`✓ Fetched ${rows.length} rows`);

    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

    const header = ['id', 'headline', 'source_name', 'published_at', 'is_market_moving', 'sectors', 'event_category'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([
        csvEscape(r.id),
        csvEscape(r.headline),
        csvEscape(r.source_name),
        csvEscape(r.published_at ? r.published_at.toISOString() : ''),
        csvEscape(r.is_market_moving),
        csvEscape(Array.isArray(r.sectors) ? r.sectors.join('|') : ''),
        csvEscape(r.event_category),
      ].join(','));
    }
    writeFileSync(OUT_PATH, lines.join('\n') + '\n', 'utf8');

    console.log(`✓ Saved: ${OUT_PATH}`);
    console.log(`  ${rows.length} rows + 1 header line`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
