#!/usr/bin/env node
//
// Phase-0 cost calibration (READ-ONLY) — pins the real article volume that the
// Mind's cost envelope (research-notes/2026-06-12_news-brain-body-text-and-cost-envelope.md)
// assumed at ~2,500 articles/day. SELECTs only — safe on prod.
//
//   node scripts/research/count-news-volume.mjs
//   node scripts/research/count-news-volume.mjs --days=30
//
// Reports, over the trailing window:
//   - articles/day: avg, median, min, max          → ROUTER stage volume
//   - ticker-tagged articles/day                   → floor for SPECIALIST volume
//   - market-moving share (column auto-detected)   → deep-pass sizing hint
//   - distinct sources delivering                  → feed-universe sanity
// Exits 0 always (it is a measurement, not a gate).

import pg from 'pg';
import { loadEnvFile } from '../_seed-utils.mjs';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const DAYS = Number(flag('days', '30'));

async function columnExists(pool, table, column) {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column],
  );
  return rows.length > 0;
}

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(2); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  const now = new Date();

  console.log(`=== News-volume calibration — trailing ${DAYS}d — ${now.toISOString().slice(0, 16).replace('T', ' ')}Z ===\n`);

  const hasTickers = await columnExists(pool, 'india_news_signals', 'nse_tickers');
  const hasMarketMoving = await columnExists(pool, 'india_news_signals', 'market_moving');

  const tickerExpr = hasTickers
    ? `count(*) FILTER (WHERE nse_tickers IS NOT NULL AND array_length(nse_tickers, 1) > 0)`
    : `NULL::bigint`;
  const mmExpr = hasMarketMoving ? `count(*) FILTER (WHERE market_moving IS TRUE)` : `NULL::bigint`;

  const { rows: daily } = await pool.query(
    `SELECT (scraped_at AT TIME ZONE 'Asia/Kolkata')::date AS d,
            count(*)::int AS n,
            (${tickerExpr})::int AS tagged,
            (${mmExpr})::int AS market_moving,
            count(DISTINCT source_name)::int AS sources
       FROM india_news_signals
      WHERE scraped_at >= now() - ($1 || ' days')::interval
      GROUP BY 1 ORDER BY 1`,
    [String(DAYS)],
  );

  if (daily.length === 0) {
    console.log('No rows in the window — is the news cron alive? (run check-all-datasets-health.mjs)');
    await pool.end();
    return;
  }

  const ns = daily.map((r) => r.n).sort((a, b) => a - b);
  const avg = ns.reduce((s, x) => s + x, 0) / ns.length;
  const med = ns[Math.floor(ns.length / 2)];
  const taggedAvg = hasTickers ? daily.reduce((s, r) => s + (r.tagged || 0), 0) / daily.length : null;
  const mmAvg = hasMarketMoving ? daily.reduce((s, r) => s + (r.market_moving || 0), 0) / daily.length : null;

  console.log('PER-DAY ARTICLE VOLUME (router-stage input)');
  console.log(`  days with data       ${daily.length}/${DAYS}`);
  console.log(`  avg / median         ${avg.toFixed(0)} / ${med}`);
  console.log(`  min / max            ${ns[0]} / ${ns[ns.length - 1]}`);
  if (taggedAvg !== null) console.log(`  ticker-tagged avg    ${taggedAvg.toFixed(0)}/day  (${((taggedAvg / avg) * 100).toFixed(1)}% — floor for specialist stage)`);
  if (mmAvg !== null) console.log(`  market-moving avg    ${mmAvg.toFixed(0)}/day  (${((mmAvg / avg) * 100).toFixed(1)}% — deep-pass sizing hint)`);

  console.log('\nLAST 7 DAYS (recency check)');
  for (const r of daily.slice(-7)) {
    const tagged = r.tagged !== null && r.tagged !== undefined ? ` · tagged ${r.tagged}` : '';
    const mm = r.market_moving !== null && r.market_moving !== undefined ? ` · mm ${r.market_moving}` : '';
    console.log(`  ${r.d.toISOString().slice(0, 10)}  ${String(r.n).padStart(5)} articles · ${r.sources} sources${tagged}${mm}`);
  }

  console.log('\nCOST-MODEL RECALIBRATION (vs the 2,500/day assumption)');
  const scale = avg / 2500;
  console.log(`  measured avg ÷ assumed = ${avg.toFixed(0)} / 2500 = ${scale.toFixed(2)}×`);
  console.log(`  → scale every $/month figure in the §B cost table by ~${scale.toFixed(2)}×`);
  console.log(`  → free-tier fit: Groq router 14,400 RPD ${avg <= 14400 ? '✅ covers' : '🔴 EXCEEDED'} · Gemini Flash 1,500 RPD ${taggedAvg !== null ? (taggedAvg <= 1500 ? '✅ covers tagged volume' : '🔴 EXCEEDED by tagged volume') : '(tagged volume unknown)'}`);

  await pool.end();
}

main().catch((e) => { console.error('Volume count failed:', e.message); process.exit(2); });
