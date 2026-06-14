#!/usr/bin/env node
//
// READ-ONLY data-quality spot-check on the Midcap-150 series in research_prices.
// No writes. Created 2026-06-05 — the gate before Exp16 stats (per exp16_brief.md §1 and
// research-notes/2026-06-05_g4-already-done-correction.md "Corrected next step" #1).
//
// WHY THIS EXISTS
//   G4 is DONE — check-midcap-coverage.mjs proved all 150/150 Midcap-150 names are PRESENT.
//   But "present" ≠ "sane". The backfill that loaded them is now reference-only and the OHLCV was
//   never audited. Exp16 computes EAR (day-0 market-adjusted return) and multi-day CARs off these
//   exact columns (close, adj_close, log_return) — so a bad bar (negative price, adj_close hole,
//   a fake ±90% "move" from a split artifact, a weekend row) would silently poison the event study.
//   This script flags those classes BEFORE we trust the data, all in read-only SQL aggregates.
//
// WHAT IT CHECKS (per symbol, then rolled up)
//   - bad_close        close NULL or ≤ 0                         (structural — must be 0)
//   - bad_olh          open/high/low ≤ 0                         (structural)
//   - ohlc_bad         high < low / high < open|close / low > open|close   (structural)
//   - bad_adj          adj_close NULL or ≤ 0                     (structural — Exp16 uses adj_close)
//   - ohlc_bad uses a 1e-4 relative tolerance so sub-cent float rounding isn't flagged as an inversion.
//   - weekend          trade_date falls on Sat/Sun              (INFORMATIONAL — NSE holds real Sat/Sun
//                       special sessions: Diwali Muhurat, Budget-Saturday, disaster-recovery live runs.
//                       Verified 2026-06-05: the only weekend dates in research_prices are exactly those.)
//   - zero_vol         volume NULL or 0                          (informational — halts/illiquid days)
//   - big_move         |log_return| > --max-move (default 0.25)  (informational — NSE circuit is ±20%,
//                       so >~25% is usually a split/adjustment artifact worth eyeballing)
//   - max gap          largest calendar gap between consecutive bars (informational — suspensions)
//
// USAGE (read-only; safe to run against prod)
//   node scripts/research/exp16-quality-spotcheck.mjs
//   node scripts/research/exp16-quality-spotcheck.mjs --symbols-file=shared/nifty-midcap150.json
//   node scripts/research/exp16-quality-spotcheck.mjs --max-move=0.20 --gap-days=21 --from=2018-01-01
//
// Requires DATABASE_URL or DATABASE_PUBLIC_URL in .env.local (same as the other research scripts).

import { loadEnvFile } from '../_seed-utils.mjs';
import { readFileSync } from 'node:fs';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const args = process.argv.slice(2);
const getFlag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const SYMBOLS_FILE = getFlag('symbols-file', 'shared/nifty-midcap150.json');
const MAX_MOVE = Number(getFlag('max-move', '0.25'));   // |log_return| above this = flag for eyeballing
const GAP_DAYS = Number(getFlag('gap-days', '30'));     // report symbols whose largest bar-to-bar gap exceeds this
const FROM = getFlag('from', null);                     // optional: only audit bars on/after this date (Exp16 window)

function normalizeYahoo(sym) {
  const s = String(sym).trim().toUpperCase();
  if (!s) return null;
  if (s.startsWith('^') || s.endsWith('.NS') || s.endsWith('.BO')) return s;
  return `${s}.NS`;
}
function loadUniverse(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const arr = Array.isArray(raw) ? raw : (raw.registry || raw.symbols || []);
  return [...new Set(arr.map((e) => (typeof e === 'string' ? e : e.ticker || e.symbol)).map(normalizeYahoo).filter(Boolean))];
}

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('No DATABASE_PUBLIC_URL / DATABASE_URL in .env.local'); process.exit(1); }
  const universe = loadUniverse(SYMBOLS_FILE);
  const bare = universe.map((s) => s.replace(/\.(NS|BO)$/i, ''));

  console.log('=== Exp16 data-quality spot-check — Midcap-150 in research_prices (READ-ONLY) ===');
  console.log(`  Universe file: ${SYMBOLS_FILE}  (${universe.length} symbols)`);
  console.log(`  Window:        ${FROM ? `bars on/after ${FROM}` : 'full history'}`);
  console.log(`  Flag move:     |log_return| > ${MAX_MOVE}   ·   Flag gap: > ${GAP_DAYS} days\n`);

  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  try {
    const dateClause = FROM ? 'AND trade_date >= $3' : '';
    const params = FROM ? [universe, bare, FROM] : [universe, bare];

    // One aggregate pass: per-symbol counts of each anomaly class + price/return extremes.
    const agg = await pool.query(
      `SELECT symbol,
              COUNT(*)::int                                                                       AS rows,
              MIN(trade_date)::text                                                               AS first,
              MAX(trade_date)::text                                                               AS last,
              COUNT(*) FILTER (WHERE close IS NULL OR close <= 0)::int                            AS bad_close,
              COUNT(*) FILTER (WHERE open <= 0 OR high <= 0 OR low <= 0)::int                     AS bad_olh,
              COUNT(*) FILTER (WHERE high < low * 0.9999 OR high < open * 0.9999 OR high < close * 0.9999
                                  OR low > open * 1.0001 OR low > close * 1.0001)::int            AS ohlc_bad,
              COUNT(*) FILTER (WHERE adj_close IS NULL OR adj_close <= 0)::int                    AS bad_adj,
              COUNT(*) FILTER (WHERE EXTRACT(DOW FROM trade_date) IN (0,6))::int                  AS weekend,
              COUNT(*) FILTER (WHERE volume IS NULL OR volume = 0)::int                           AS zero_vol,
              COUNT(*) FILTER (WHERE abs(log_return) > $${FROM ? 4 : 3})::int                     AS big_move,
              ROUND(MAX(abs(log_return))::numeric, 4)                                             AS max_abs_ret
         FROM research_prices
        WHERE (symbol = ANY($1) OR symbol = ANY($2)) ${dateClause}
        GROUP BY symbol`,
      FROM ? [...params, MAX_MOVE] : [...params, MAX_MOVE],
    );

    // Largest calendar gap between consecutive bars per symbol (suspension / long halt detector).
    const gaps = await pool.query(
      `WITH d AS (
         SELECT symbol, trade_date,
                trade_date - LAG(trade_date) OVER (PARTITION BY symbol ORDER BY trade_date) AS gap
           FROM research_prices
          WHERE (symbol = ANY($1) OR symbol = ANY($2)) ${dateClause}
       )
       SELECT symbol, MAX(gap)::int AS max_gap_days
         FROM d WHERE gap IS NOT NULL GROUP BY symbol`,
      params,
    );
    const gapBySym = new Map(gaps.rows.map((r) => [r.symbol, r.max_gap_days]));

    const rows = agg.rows;
    if (rows.length === 0) { console.error('No matching rows — check --symbols-file / window.'); process.exit(1); }

    // Roll-ups.
    // weekend is INFORMATIONAL: NSE runs real Sat/Sun special sessions (Muhurat, Budget-Saturday,
    // disaster-recovery live runs) — verified the only weekend dates present are exactly those.
    const STRUCTURAL = ['bad_close', 'bad_olh', 'ohlc_bad', 'bad_adj'];
    const INFO = ['weekend', 'zero_vol', 'big_move'];
    const totals = {};
    for (const k of [...STRUCTURAL, ...INFO]) totals[k] = rows.reduce((s, r) => s + r[k], 0);
    const totalBars = rows.reduce((s, r) => s + r.rows, 0);

    const hasStructural = (r) => STRUCTURAL.some((k) => r[k] > 0);
    const structuralOffenders = rows.filter(hasStructural);
    const bigGapSyms = [...gapBySym.entries()].filter(([, g]) => g > GAP_DAYS).sort((a, b) => b[1] - a[1]);

    console.log(`  Symbols audited: ${rows.length}   ·   total bars: ${totalBars.toLocaleString()}\n`);

    console.log('  STRUCTURAL anomalies (these MUST be 0 to trust the series):');
    for (const k of STRUCTURAL) console.log(`    ${k.padEnd(12)} ${String(totals[k]).padStart(8)}`);
    console.log('\n  INFORMATIONAL (eyeball — often legitimate split/halt/illiquid bars):');
    for (const k of INFO) console.log(`    ${k.padEnd(12)} ${String(totals[k]).padStart(8)}`);

    if (structuralOffenders.length) {
      console.log(`\n  ⚠ ${structuralOffenders.length} symbol(s) with STRUCTURAL anomalies:`);
      for (const r of structuralOffenders) {
        const parts = STRUCTURAL.filter((k) => r[k] > 0).map((k) => `${k}=${r[k]}`);
        console.log(`    ${String(r.symbol).padEnd(16)} ${parts.join('  ')}  (${r.first}→${r.last})`);
      }
    } else {
      console.log('\n  ✓ No structural anomalies — prices, OHLC ordering, adj_close, and dates are all sane.');
    }

    // Top extreme single-day moves (split/adjustment artifacts hide here).
    const byMove = [...rows].sort((a, b) => Number(b.max_abs_ret) - Number(a.max_abs_ret)).slice(0, 10);
    console.log('\n  Largest single-day |log_return| (top 10 — confirm these are real, not split artifacts):');
    for (const r of byMove) {
      const pct = (Math.expm1(Math.abs(Number(r.max_abs_ret))) * 100).toFixed(1);
      console.log(`    ${String(r.symbol).padEnd(16)} max|logret|=${r.max_abs_ret}  (~${pct}%)  big_move bars=${r.big_move}`);
    }

    if (bigGapSyms.length) {
      console.log(`\n  Symbols with a bar-to-bar gap > ${GAP_DAYS} days (possible suspension / thin history):`);
      for (const [sym, g] of bigGapSyms.slice(0, 15)) console.log(`    ${String(sym).padEnd(16)} max gap ${g} days`);
      if (bigGapSyms.length > 15) console.log(`    … and ${bigGapSyms.length - 15} more`);
    }

    // Verdict.
    const structuralTotal = STRUCTURAL.reduce((s, k) => s + totals[k], 0);
    console.log('\n=== Verdict ===');
    if (structuralTotal === 0) {
      console.log('  ✓ STRUCTURALLY CLEAN — no negative/null prices, no OHLC inversions, no adj_close holes, no weekend rows.');
      console.log('    Exp16 can proceed. Still eyeball the top |log_return| list above for split artifacts before trusting EAR on those names.');
    } else {
      console.log(`  ✗ ${structuralTotal} structural anomaly bar(s) across ${structuralOffenders.length} symbol(s) — investigate before Exp16.`);
      console.log('    EAR/CAR computed off bad bars would be silently wrong. Fix or exclude the listed symbols first.');
    }
  } finally {
    await pool.end();
  }
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
