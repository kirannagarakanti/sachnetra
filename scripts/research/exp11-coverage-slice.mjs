#!/usr/bin/env node
//
// Exp 11 — V2-031 coverage time-slice (read-only).
//
// Follow-up to `exp11-coverage-check.mjs`. Slices Check 1 by hour (last 48h) and
// day (last 14d) to separate "tagger isn't working" from "7-day window dragged
// by pre-V2-031 backlog". V2-031 was marked COMPLETE 2026-05-26 — the blended
// 7-day 3.19% number is a mix of pre- and post-deploy rows.
//
// BOUNDARY: read-only. Pure SELECTs, no writes, no DDL.
//
// USAGE
//   node scripts/research/exp11-coverage-slice.mjs

import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'output', 'exp11');
const OUT_PATH = join(OUT_DIR, 'coverage_slice.md');

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
    emit('# Exp 11 — V2-031 Coverage Time-Slice');
    emit('');
    emit(`*Generated: ${new Date().toISOString()}*`);
    emit('*Source: `scripts/research/exp11-coverage-slice.mjs` (read-only)*');
    emit('');

    // ── Headline 24h vs 7d comparison ─────────────────────────────────
    emit('## Headline comparison: 24h vs 7d vs 14d');
    emit('');
    const headline = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '24 hours') AS t24,
        COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '24 hours'
                         AND COALESCE(array_length(nse_tickers, 1), 0) > 0) AS g24,
        COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '7 days') AS t7,
        COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '7 days'
                         AND COALESCE(array_length(nse_tickers, 1), 0) > 0) AS g7,
        COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '14 days') AS t14,
        COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '14 days'
                         AND COALESCE(array_length(nse_tickers, 1), 0) > 0) AS g14
      FROM india_news_signals
    `);
    const h = headline.rows[0];
    const pct = (n, d) => d > 0 ? (100 * n / d).toFixed(2) + '%' : 'n/a';
    emit('```');
    emit(`window  total       tagged      coverage`);
    emit(`──────  ──────────  ──────────  ────────`);
    emit(`24h     ${String(h.t24).padEnd(10)}  ${String(h.g24).padEnd(10)}  ${pct(h.g24, h.t24)}`);
    emit(`7d      ${String(h.t7).padEnd(10)}  ${String(h.g7).padEnd(10)}  ${pct(h.g7, h.t7)}`);
    emit(`14d     ${String(h.t14).padEnd(10)}  ${String(h.g14).padEnd(10)}  ${pct(h.g14, h.t14)}`);
    emit('```');
    emit('');

    // ── Daily slice (last 14 days) ────────────────────────────────────
    emit('## Daily coverage (last 14 days)');
    emit('');
    const daily = await pool.query(`
      SELECT
        DATE_TRUNC('day', published_at AT TIME ZONE 'Asia/Kolkata')::date AS day,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE(array_length(nse_tickers, 1), 0) > 0)::int AS tagged
      FROM india_news_signals
      WHERE published_at >= NOW() - INTERVAL '14 days'
      GROUP BY 1
      ORDER BY 1 DESC
    `);
    emit('```');
    emit('day (IST)   total   tagged  coverage');
    emit('──────────  ──────  ──────  ────────');
    for (const r of daily.rows) {
      const d = r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10);
      emit(`${d}  ${String(r.total).padStart(6)}  ${String(r.tagged).padStart(6)}  ${pct(r.tagged, r.total)}`);
    }
    emit('```');
    emit('');

    // ── Hourly slice (last 48h) ───────────────────────────────────────
    emit('## Hourly coverage (last 48 hours, IST)');
    emit('');
    const hourly = await pool.query(`
      SELECT
        DATE_TRUNC('hour', published_at AT TIME ZONE 'Asia/Kolkata') AS hour_ist,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE(array_length(nse_tickers, 1), 0) > 0)::int AS tagged
      FROM india_news_signals
      WHERE published_at >= NOW() - INTERVAL '48 hours'
      GROUP BY 1
      ORDER BY 1 DESC
    `);
    emit('```');
    emit('hour (IST)          total  tagged  coverage');
    emit('──────────────────  ─────  ──────  ────────');
    for (const r of hourly.rows) {
      const t = r.hour_ist instanceof Date
        ? r.hour_ist.toISOString().replace('T', ' ').slice(0, 16)
        : String(r.hour_ist).slice(0, 16);
      emit(`${t}    ${String(r.total).padStart(5)}  ${String(r.tagged).padStart(6)}  ${pct(r.tagged, r.total)}`);
    }
    emit('```');
    emit('');

    // ── Cutover detection ─────────────────────────────────────────────
    emit('## Cutover detection');
    emit('');
    const cutover = await pool.query(`
      SELECT
        MIN(published_at) FILTER (WHERE COALESCE(array_length(nse_tickers, 1), 0) > 0) AS earliest_tagged,
        MAX(published_at) FILTER (WHERE COALESCE(array_length(nse_tickers, 1), 0) > 0) AS latest_tagged,
        MAX(published_at) FILTER (WHERE COALESCE(array_length(nse_tickers, 1), 0) = 0
                                    AND published_at >= NOW() - INTERVAL '7 days') AS latest_untagged_7d
      FROM india_news_signals
    `);
    const co = cutover.rows[0];
    emit('```');
    emit(`earliest_tagged_overall:    ${co.earliest_tagged?.toISOString() ?? 'none'}`);
    emit(`latest_tagged_overall:      ${co.latest_tagged?.toISOString() ?? 'none'}`);
    emit(`latest_untagged_within_7d:  ${co.latest_untagged_7d?.toISOString() ?? 'none'}`);
    emit('```');
    emit('');
    emit('*If `earliest_tagged_overall` is much older than 2026-05-26, the backfill landed and the daily slice should show a flat coverage line — a low number then means the tagger genuinely under-performs.*');
    emit('*If `earliest_tagged_overall` ≈ 2026-05-26, only forward-tagging is active; daily slice should show a step-change at the deploy day and the post-deploy rate is the true tagger performance.*');
    emit('');

    // ── Save ──────────────────────────────────────────────────────────
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
