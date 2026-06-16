#!/usr/bin/env node
//
// READ-ONLY coverage probe for india_bulk_block_deals — the Exp18 §0 preconditions (P1–P3).
// No writes (SELECT-only). Created 2026-06-07 to gate exp18_brief.md before the harness runs.
//
//   node scripts/research/check-deals-coverage.mjs
//   node scripts/research/check-deals-coverage.mjs --min-years=5 --adv-mult=0.5
//
// Answers, verbatim for Exp18.md §A:
//   P1  Is the table populated?         → COUNT, distinct symbols, BUY/SELL + bulk/block split
//   P2  Is history deep enough?         → MIN/MAX deal_date span in years vs --min-years
//   P3  Is the feed fresh?              → MAX(deal_date) vs today (stale = dead cron, the V2-018 lesson)
//   +   Join feasibility (Exp4 lesson) → how many deal symbols (bare) overlap research_prices (.NS)
//   +   Capacity sanity                → distinct (symbol, deal_date, BUY) events/yr on PRICED names
//
// If P1 fails → not runnable (V2-030 prod run / cron never happened).
// If P2 fails → run scripts/backfill-india-deals.mjs over NSE history (G8) before Exp18.
// If P3 fails → fix/alarm the V2-030 cron first.

import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const args = process.argv.slice(2);
const getFlag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const MIN_YEARS = Number(getFlag('min-years', '5'));     // P2 depth target
const STALE_DAYS = Number(getFlag('stale-days', '5'));   // P3 freshness tolerance (calendar days)

const ok = (b) => (b ? '✅ PASS' : '❌ FAIL');

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('No DATABASE_PUBLIC_URL / DATABASE_URL in .env.local'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  console.log('=== Exp18 §0 preconditions — india_bulk_block_deals coverage (READ-ONLY) ===\n');
  try {
    // ── does the table even exist? ──
    const exists = await pool.query(
      `SELECT to_regclass('public.india_bulk_block_deals') IS NOT NULL AS present`);
    if (!exists.rows[0].present) {
      console.error('P1 ❌ FAIL — table india_bulk_block_deals does not exist. V2-030 migration never ran.');
      await pool.end(); process.exit(2);
    }

    // ── P1 — populated? ──
    const agg = await pool.query(`
      SELECT COUNT(*)::bigint                                   AS rows,
             COUNT(DISTINCT symbol)::int                        AS symbols,
             MIN(deal_date)::text                               AS first_date,
             MAX(deal_date)::text                               AS last_date,
             COUNT(*) FILTER (WHERE buy_sell = 'BUY')::bigint   AS buys,
             COUNT(*) FILTER (WHERE buy_sell = 'SELL')::bigint  AS sells,
             COUNT(*) FILTER (WHERE deal_type = 'bulk')::bigint  AS bulk,
             COUNT(*) FILTER (WHERE deal_type = 'block')::bigint AS block
        FROM india_bulk_block_deals`);
    const a = agg.rows[0];
    const rows = Number(a.rows);
    const p1 = rows > 0;
    console.log(`P1 — POPULATED?  ${ok(p1)}`);
    console.log(`   rows: ${rows.toLocaleString()}  ·  distinct symbols: ${a.symbols}`);
    console.log(`   BUY: ${Number(a.buys).toLocaleString()}  ·  SELL: ${Number(a.sells).toLocaleString()}`
      + `  ·  bulk: ${Number(a.bulk).toLocaleString()}  ·  block: ${Number(a.block).toLocaleString()}`);
    if (!p1) {
      console.error('\n   → STOP: table empty. The V2-030 prod run / Railway cron never populated it. Not runnable.');
      await pool.end(); process.exit(2);
    }

    // ── P2 — depth ──
    const spanYears = (new Date(a.last_date) - new Date(a.first_date)) / (365.25 * 864e5);
    const p2 = spanYears >= MIN_YEARS;
    console.log(`\nP2 — DEPTH ≥ ${MIN_YEARS}y?  ${ok(p2)}`);
    console.log(`   span: ${a.first_date} → ${a.last_date}  (${spanYears.toFixed(1)} years)`);
    if (!p2) console.log(`   → backfill first: node scripts/backfill-india-deals.mjs  (G8 — NSE date-range API, chunked 7–15 days)`);

    // ── P3 — freshness ──
    const ageDays = (Date.now() - new Date(a.last_date)) / 864e5;
    const p3 = ageDays <= STALE_DAYS;
    console.log(`\nP3 — FRESH (≤ ${STALE_DAYS}d)?  ${ok(p3)}`);
    console.log(`   latest deal_date: ${a.last_date}  (${ageDays.toFixed(0)} calendar days ago)`);
    if (!p3) console.log(`   → the V2-030 cron looks dead — fix + wire scripts/check-deals-freshness.mjs (V2-018 lesson).`);

    // ── per-year row counts (eyeball accumulation / gaps) ──
    const byYear = await pool.query(`
      SELECT EXTRACT(YEAR FROM deal_date)::int AS yr,
             COUNT(*)::int AS rows,
             COUNT(*) FILTER (WHERE buy_sell='BUY')::int AS buys
        FROM india_bulk_block_deals GROUP BY 1 ORDER BY 1`);
    console.log(`\n   Rows per year (BUY in parens):`);
    byYear.rows.forEach((r) => console.log(`     ${r.yr}: ${String(r.rows).padStart(7)}  (${r.buys} BUY)`));

    // ── join feasibility — deal symbols (bare) vs research_prices (.NS). The Exp4 .NS landmine. ──
    // research_prices may hold either form; check overlap both ways.
    const join = await pool.query(`
      WITH dsym AS (SELECT DISTINCT upper(symbol) AS s FROM india_bulk_block_deals WHERE symbol IS NOT NULL),
           psym AS (SELECT DISTINCT upper(regexp_replace(symbol, '\\.(NS|BO)$', '')) AS s FROM research_prices)
      SELECT (SELECT COUNT(*) FROM dsym) AS deal_symbols,
             (SELECT COUNT(*) FROM dsym d WHERE EXISTS (SELECT 1 FROM psym p WHERE p.s = d.s)) AS priced_symbols`);
    const j = join.rows[0];
    const pricedPct = (100 * Number(j.priced_symbols) / Number(j.deal_symbols)).toFixed(1);
    console.log(`\n   JOIN feasibility (bare-symbol reconciliation): ${j.priced_symbols}/${j.deal_symbols} `
      + `deal symbols are priced in research_prices (${pricedPct}%).`);
    console.log(`     (deals store bare 'AGIIL'; research_prices store 'AGIIL.NS' — Exp18 §3.2 canonicalizes both.)`);

    // ── capacity sanity — distinct (symbol, deal_date, BUY) events on PRICED names, per year ──
    const cap = await pool.query(`
      WITH psym AS (SELECT DISTINCT upper(regexp_replace(symbol, '\\.(NS|BO)$', '')) AS s FROM research_prices),
           ev AS (
             SELECT DISTINCT d.symbol, d.deal_date
               FROM india_bulk_block_deals d
               JOIN psym p ON p.s = upper(d.symbol)
              WHERE d.buy_sell = 'BUY')
      SELECT COUNT(*)::int AS buy_events FROM ev`);
    const buyEvents = cap.rows[0].buy_events;
    const perYear = spanYears > 0 ? (buyEvents / spanYears) : 0;
    console.log(`\n   CAPACITY (pre-liquidity-filter): ${buyEvents.toLocaleString()} distinct priced (symbol, day) BUY events`
      + `  ·  ~${perYear.toFixed(0)}/yr`);
    console.log(`     (Exp18 needs ≥~30/yr AFTER the Amihud-liquid + deal≥0.5×ADV filters — this is the loose ceiling.)`);

    // ── verdict ──
    console.log(`\n=== Verdict ===`);
    console.log(`   P1 populated: ${ok(p1)}   ·   P2 depth: ${ok(p2)}   ·   P3 fresh: ${ok(p3)}`);
    if (p1 && p2 && p3) console.log(`   → Exp18 is RUNNABLE. Author/run exp18-bulkdeal-postdisclosure.mjs next.`);
    else if (p1 && !p2) console.log(`   → Backfill (G8) first via scripts/backfill-india-deals.mjs, then re-run this probe.`);
    else console.log(`   → Resolve the failing precondition above before Exp18.`);
  } finally {
    await pool.end();
  }
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
