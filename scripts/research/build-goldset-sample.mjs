#!/usr/bin/env node

// Gold-set STRATIFIED SAMPLER for news→ticker tagging evaluation (READ-ONLY).
//
// Emits a labelling CSV that a human fills in with two labels per headline:
//   gate_label   ∈ {SPECIFIC, EMPTY}   — is this headline about ONE company?
//   ticker_label = ticker(s)            — which NSE symbol(s), if SPECIFIC
//   role         ∈ {PRIMARY, MENTIONED} — per ticker (use ; for multiple)
// (See ai_docs/learning/research-notes/problem-solving/2026-06-10_*.md and the
//  SPECIFIC-vs-EMPTY labeling doc for the rules.)
//
// SAFETY: this script ONLY runs SELECTs. It never writes to the database. The
// single write is a local CSV. Lijo runs it against prod (read-only).
//
// Strata (~1,000 total, proportions from the right-sized gold-set table):
//   A high-volume tickers  ~440  top ~40 tickers by tagged-row volume, ~11 each
//   B mid-cap tickers      ~220  next tier by volume, sampled in aggregate
//   C long tail            ~110  rows tagged ONLY by tickers outside A∪B
//   D1 untagged (random)   ~120  no tag at all — the "is it EMPTY or a MISS?" pile
//   D2 untagged (macro kw) ~80   untagged AND matches macro/index/listicle words
// The D strata are the point of this run: they quantify how much of the ~93%
// untagged corpus is correctly EMPTY vs a real small-cap MISS.
//
// Usage:
//   node scripts/research/build-goldset-sample.mjs                 # ~1,000 rows
//   node scripts/research/build-goldset-sample.mjs --total 300     # smaller dry-run
//   node scripts/research/build-goldset-sample.mjs --out path.csv

import pg from 'pg';
import { mkdirSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import { loadEnvFile } from '../_seed-utils.mjs';

loadEnvFile(import.meta.url); // populates DATABASE_URL

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argVal = (flag, dflt) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const TOTAL = Number(argVal('--total', '1000'));
const OUT = argVal('--out', join(ROOT, 'scripts/research/output/goldset/goldset_sample.csv'));

// Proportions (scaled to TOTAL). Canary set is built separately, not here.
const PROPORTIONS = { A: 0.44, B: 0.22, C: 0.11, D1: 0.12, D2: 0.08 };
const SIZE = Object.fromEntries(Object.entries(PROPORTIONS).map(([k, p]) => [k, Math.round(TOTAL * p)]));
const TOP_TICKERS = 40; // Stratum A ticker count
const MID_TICKERS = 400; // Stratum B ticker pool

// Untagged macro/index/listicle keyword filter for D2 (PG case-insensitive regex).
const MACRO_REGEX =
  '\\m(nifty|sensex|bankex|rbi|repo|mpc|inflation|cpi|wpi|gdp|fiscal|budget|fiis?|fpis?|diis?|rupee|crude|sector|stocks to watch|top picks|in focus|stocks to buy)\\M';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function detectTagColumn(pool) {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = 'india_news_signals' AND column_name IN ('nse_tickers_v2','nse_tickers')`,
  );
  const names = rows.map((r) => r.column_name);
  // Prefer the fresh backfill shadow column if present AND populated.
  if (names.includes('nse_tickers_v2')) {
    const { rows: [c] } = await pool.query(
      `SELECT count(*) FILTER (WHERE nse_tickers_v2 IS NOT NULL) AS n FROM india_news_signals`,
    );
    if (Number(c.n) > 0) return 'nse_tickers_v2';
  }
  return 'nse_tickers';
}

function rowOut(r, stratum, tagCol) {
  const tags = (r[tagCol] || []).join(';');
  return {
    id: r.id,
    scraped_at: r.scraped_at ? new Date(r.scraped_at).toISOString().slice(0, 10) : '',
    source_name: r.source_name || '',
    stratum,
    current_tags: tags,
    headline: r.headline || '',
    gate_label: '', // human fills: SPECIFIC | EMPTY
    ticker_label: '', // human fills: ticker(s), ; separated
    role: '', // human fills: PRIMARY | MENTIONED per ticker
    notes: '',
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL / DATABASE_PUBLIC_URL not set. Add it to .env.local first.');
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await pool.query('SELECT 1');
    const tagCol = await detectTagColumn(pool);
    console.log(`[goldset] tag column = ${tagCol} · target total = ${TOTAL}`);

    const SELECT = `id, headline, source_name, scraped_at, ${tagCol}`;
    const seen = new Set();
    const collected = [];
    const add = (rows, stratum) => {
      for (const r of rows) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        collected.push(rowOut(r, stratum, tagCol));
      }
    };

    // Rank tickers by tagged-row volume.
    const { rows: tickerRanks } = await pool.query(
      `SELECT t AS ticker, count(*)::int AS n
         FROM india_news_signals, unnest(${tagCol}) AS t
        WHERE array_length(${tagCol}, 1) >= 1
        GROUP BY t ORDER BY n DESC`,
    );
    const topTickers = tickerRanks.slice(0, TOP_TICKERS).map((r) => r.ticker);
    const midTickers = tickerRanks.slice(TOP_TICKERS, TOP_TICKERS + MID_TICKERS).map((r) => r.ticker);
    const topAndMid = [...topTickers, ...midTickers];
    console.log(`[goldset] ${tickerRanks.length} distinct tickers tagged · top=${topTickers.length} mid=${midTickers.length}`);

    // Stratum A — top tickers, ~even per ticker.
    const perTicker = Math.max(1, Math.ceil(SIZE.A / Math.max(1, topTickers.length)));
    for (const ticker of topTickers) {
      const { rows } = await pool.query(
        `SELECT ${SELECT} FROM india_news_signals
          WHERE ${tagCol} @> ARRAY[$1]::text[]
          ORDER BY random() LIMIT $2`,
        [ticker, perTicker],
      );
      add(rows, 'A_high_volume');
    }

    // Stratum B — mid tickers, in aggregate (oversample, then trim).
    if (midTickers.length > 0) {
      const { rows } = await pool.query(
        `SELECT ${SELECT} FROM india_news_signals
          WHERE ${tagCol} && $1::text[]
          ORDER BY random() LIMIT $2`,
        [midTickers, SIZE.B * 2],
      );
      add(rows.slice(0, SIZE.B), 'B_mid_cap');
    }

    // Stratum C — rows whose tags are ALL outside top∪mid (the long tail).
    {
      const { rows } = await pool.query(
        `SELECT ${SELECT} FROM india_news_signals
          WHERE array_length(${tagCol}, 1) >= 1 AND NOT (${tagCol} && $1::text[])
          ORDER BY random() LIMIT $2`,
        [topAndMid, SIZE.C],
      );
      add(rows, 'C_long_tail');
    }

    // Stratum D1 — untagged, random (the EMPTY-vs-MISS pile).
    {
      const { rows } = await pool.query(
        `SELECT ${SELECT} FROM india_news_signals
          WHERE array_length(${tagCol}, 1) IS NULL
          ORDER BY random() LIMIT $1`,
        [SIZE.D1],
      );
      add(rows, 'D1_untagged_random');
    }

    // Stratum D2 — untagged AND macro/index/listicle keywords (expected EMPTY).
    {
      const { rows } = await pool.query(
        `SELECT ${SELECT} FROM india_news_signals
          WHERE array_length(${tagCol}, 1) IS NULL AND headline ~* $1
          ORDER BY random() LIMIT $2`,
        [MACRO_REGEX, SIZE.D2],
      );
      add(rows, 'D2_untagged_macro');
    }

    // ── Write CSV ──────────────────────────────────────────────────────────────
    mkdirSync(dirname(OUT), { recursive: true });
    const csv = Papa.unparse(collected, {
      columns: ['id', 'scraped_at', 'source_name', 'stratum', 'current_tags', 'headline', 'gate_label', 'ticker_label', 'role', 'notes'],
    });
    writeFileSync(OUT, csv + '\n');

    // ── Report ──────────────────────────────────────────────────────────────────
    const byStratum = {};
    const bySource = {};
    const byMonth = {};
    for (const r of collected) {
      byStratum[r.stratum] = (byStratum[r.stratum] || 0) + 1;
      bySource[r.source_name] = (bySource[r.source_name] || 0) + 1;
      const m = r.scraped_at.slice(0, 7);
      byMonth[m] = (byMonth[m] || 0) + 1;
    }
    console.log(`[goldset] wrote ${collected.length} rows → ${OUT}`);
    console.log('[goldset] per stratum:', byStratum);
    console.log('[goldset] months spanned:', Object.keys(byMonth).sort().join(', '));
    const topSources = Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 8);
    console.log('[goldset] top sources:', topSources.map(([s, n]) => `${s}:${n}`).join('  '));
    console.log('[goldset] DONE — read-only run, no DB writes. Hand the CSV to the labeler.');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('[goldset] FAILED:', e.message);
  process.exit(1);
});
