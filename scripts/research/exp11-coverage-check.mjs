#!/usr/bin/env node
//
// Exp 11 — V2-031 tagging-coverage recon (read-only).
//
// Runs the three SQL checks from `exp11_brief.md` §3 against Railway prod and
// emits output formatted for direct paste into §11.1–11.3 of the brief.
//
// BOUNDARY: strictly read-only. Three SELECTs, no writes, no DDL.
//
// USAGE
//   node scripts/research/exp11-coverage-check.mjs
//   → console output + scripts/research/output/exp11/coverage_check.md

import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'output', 'exp11');
const OUT_PATH = join(OUT_DIR, 'coverage_check.md');

const EXP10_LARGE_CAPS = [
  'ITC', 'SBIN', 'RELIANCE', 'BHARTIARTL', 'SUNPHARMA',
  'MARUTI', 'NTPC', 'HINDALCO', 'EICHERMOT', 'GRASIM',
  'TCS', 'TATASTEEL', 'M&M', 'APOLLOHOSP', 'DRREDDY',
];

async function main() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_PUBLIC_URL or DATABASE_URL not set in .env.local');
    process.exit(1);
  }

  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const lines = [];
  const emit = (s = '') => { console.log(s); lines.push(s); };

  try {
    emit('# Exp 11 — V2-031 Coverage Check');
    emit('');
    emit(`*Generated: ${new Date().toISOString()}*`);
    emit('*Source: `scripts/research/exp11-coverage-check.mjs` (read-only)*');
    emit('');

    // ── Check 1: overall 7-day coverage ─────────────────────────────────
    emit('## 11.1 — Check 1: overall coverage (last 7 days)');
    emit('');
    const c1 = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE COALESCE(array_length(nse_tickers, 1), 0) > 0) AS tagged
      FROM india_news_signals
      WHERE published_at >= NOW() - INTERVAL '7 days'
    `);
    const total = Number(c1.rows[0].total);
    const tagged = Number(c1.rows[0].tagged);
    const pct = total > 0 ? (100 * tagged / total) : 0;
    emit('```');
    emit(`total_rows_7d:   ${total}`);
    emit(`tagged_rows_7d:  ${tagged}`);
    emit(`coverage_pct:    ${pct.toFixed(2)}%`);
    emit(`gate (≥20%):     ${pct >= 20 ? 'PASS' : 'FAIL'}`);
    emit(`target (≥30%):   ${pct >= 30 ? 'PASS' : 'BELOW'}`);
    emit('```');
    emit('');

    // ── Check 2: mid/small-cap distribution ─────────────────────────────
    emit('## 11.2 — Check 2: tag distribution (top 50, excl. Exp 10 large-caps)');
    emit('');
    const c2 = await pool.query(
      `
      SELECT ticker, COUNT(*)::int AS n
      FROM (
        SELECT unnest(nse_tickers) AS ticker
        FROM india_news_signals
        WHERE published_at >= NOW() - INTERVAL '7 days'
          AND COALESCE(array_length(nse_tickers, 1), 0) > 0
      ) t
      WHERE ticker <> ALL($1::text[])
      GROUP BY ticker
      ORDER BY n DESC, ticker ASC
      LIMIT 50
      `,
      [EXP10_LARGE_CAPS],
    );
    emit('```');
    emit('rank  ticker                 count');
    emit('────  ─────────────────────  ─────');
    c2.rows.forEach((r, i) => {
      const rank = String(i + 1).padStart(4, ' ');
      const ticker = String(r.ticker).padEnd(21, ' ');
      const n = String(r.n).padStart(5, ' ');
      emit(`${rank}  ${ticker}  ${n}`);
    });
    if (c2.rows.length === 0) emit('(no rows)');
    emit('```');
    emit('');
    const distinctMidSmall = c2.rows.length;
    const tickersAt3Plus = c2.rows.filter((r) => r.n >= 3).length;
    emit(`distinct_non_largecap_tickers_top50: ${distinctMidSmall}`);
    emit(`tickers_with_≥3_stories_in_top50:    ${tickersAt3Plus}`);
    emit(`gate (long tail, ≥3 stories/week):   ${tickersAt3Plus >= 10 ? 'PASS (rough heuristic)' : 'THIN — review §4 U1/U2/U3 choice'}`);
    emit('');

    // ── Check 3: 30-row precision spot-check ────────────────────────────
    emit('## 11.3 — Check 3: precision spot-check (30 random tagged rows, last 7 days)');
    emit('');
    emit('*Eyeball each row: does the headline genuinely mention the tagged ticker(s)? Mark Y/N. Target ≥90%.*');
    emit('');
    const c3 = await pool.query(`
      SELECT id, published_at, headline, nse_tickers, source_name
      FROM india_news_signals
      WHERE COALESCE(array_length(nse_tickers, 1), 0) > 0
        AND published_at >= NOW() - INTERVAL '7 days'
      ORDER BY RANDOM()
      LIMIT 30
    `);
    emit('| # | tickers | headline | source | id |');
    emit('|---|---|---|---|---|');
    c3.rows.forEach((r, i) => {
      const tickers = Array.isArray(r.nse_tickers) ? r.nse_tickers.join(', ') : String(r.nse_tickers ?? '');
      const headline = String(r.headline ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 180);
      const source = String(r.source_name ?? '');
      emit(`| ${i + 1} | \`${tickers}\` | ${headline} | ${source} | ${r.id} |`);
    });
    if (c3.rows.length === 0) emit('| — | (no tagged rows in last 7 days) | | | |');
    emit('');

    // ── Save ────────────────────────────────────────────────────────────
    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_PATH, lines.join('\n') + '\n', 'utf8');
    console.log('');
    console.log(`✓ Saved: ${OUT_PATH}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
