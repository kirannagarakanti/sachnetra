#!/usr/bin/env node
//
// Exp19 — cross-sectional panel builder (the positioning_v2 §3.3 reusable asset).
// Pre-registration: ai_docs/sachnetra v2/wiki/experiments/exp19_brief.md §3.1.
//
// Emits ONE row per (symbol, monthly rebalance_date) with each weak signal as a column, plus the target
// forward return — every signal known STRICTLY as of the rebalance date (no look-ahead). Read-only on prod
// (SELECTs only); writes scripts/research/output/exp19/panel.csv. Claude authored; Lijo runs.
//
// v1 cross-sectional columns (all genuinely per-stock, derivable today — brief §3.1):
//   price_momentum     ln(adj[d-21]/adj[d-252])        12-1 skip-month momentum (research_prices)
//   ear_drift          day-0 abnormal return of the most recent results filing in [d-90, d)
//   bulkdeal_intensity signed (BUY-SELL) deal value in [d-30, d) / (~month ADV)   (india_bulk_block_deals)
//   log_adv            ln(median trailing-20d rupee turnover)  — SIZE PROXY for neutralization (not a signal)
//   band               midcap/smallcap  — coarse size/group dummy for neutralization
//   fwd_ret            adj[d+H]/adj[d]-1  (TARGET; H = --horizon trading days)
//
// NOTE (brief §3.1 correctness gate): FII/DII absorption is MARKET-AGGREGATE → not a cross-sectional column.
// Per-ticker sentiment / latency are feeders (Exp20/G6, G1) added later. This builder ships the clean subset.
//
// USAGE
//   node scripts/research/build-xs-panel.mjs
//   node scripts/research/build-xs-panel.mjs --horizon=21 --from=2021-01-01

import { loadEnvFile } from '../_seed-utils.mjs';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'output', 'exp19');

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const HORIZON = Number(flag('horizon', '21'));            // fwd-return hold (trading days ≈ monthly)
const FROM = flag('from', null);                          // optional first rebalance date
const MOM_LONG = 252, MOM_SKIP = 21;                     // 12-1 momentum
const ADV_WIN = 20;                                      // trailing ADV window
const EAR_LOOKBACK_CAL = 90;                             // most-recent results within this many calendar days
const DEAL_LOOKBACK_CAL = 30;                            // bulk-deal accumulation window (calendar days)
const BAND_FILES = { midcap: 'shared/nifty-midcap150.json', smallcap: 'shared/nifty-smallcap250.json' };
const RESULTS_RE = /financial result|unaudited|audited.*result|quarterly result/;

// ── helpers ──
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
function quantile(sorted, q) { if (!sorted.length) return NaN; const p = (sorted.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (p - lo); }
const median = (a) => quantile([...a].sort((x, y) => x - y), 0.5);
const bareUp = (s) => String(s).trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
function loadUniverse(path) { const raw = JSON.parse(readFileSync(join(ROOT, path), 'utf8')); const arr = Array.isArray(raw) ? raw : (raw.registry || raw.symbols || []); return new Set(arr.map((e) => (typeof e === 'string' ? e : e.ticker || e.symbol)).map(bareUp).filter(Boolean)); }
function firstAtOrAfter(dates, target) { let lo = 0, hi = dates.length; while (lo < hi) { const m = (lo + hi) >> 1; if (dates[m] >= target) hi = m; else lo = m + 1; } return lo; }
function addCalDays(dateStr, n) { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

async function main() {
  console.log('=== Exp19 — build cross-sectional panel (read-only) ===');
  console.log(`  horizon=${HORIZON}d · momentum ${MOM_LONG}-${MOM_SKIP} · ADV ${ADV_WIN}d · ear lookback ${EAR_LOOKBACK_CAL}cal · deal lookback ${DEAL_LOOKBACK_CAL}cal\n`);
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('No DATABASE_PUBLIC_URL / DATABASE_URL in .env.local'); process.exit(1); }

  // universe + band map
  const bands = {}; const bandOf = new Map();
  for (const [b, f] of Object.entries(BAND_FILES)) { bands[b] = existsSync(join(ROOT, f)) ? loadUniverse(f) : new Set();
    for (const s of bands[b]) if (!bandOf.has(s)) bandOf.set(s, b); }
  const universe = [...bandOf.keys()];
  console.log(`  Universe: ${universe.length} names (midcap ${bands.midcap.size} + smallcap ${bands.smallcap.size})`);

  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  const needNS = ['^NSEI', ...universe.map((s) => `${s}.NS`)];

  // prices
  const { rows: priceRows } = await pool.query(
    `SELECT symbol, to_char(trade_date,'YYYY-MM-DD') AS d, adj_close, close, volume
       FROM research_prices WHERE symbol = ANY($1) ORDER BY symbol, trade_date ASC`, [needNS]);
  const bySym = new Map();
  for (const r of priceRows) { if (!bySym.has(r.symbol)) bySym.set(r.symbol, { dates: [], adj: [], sret: [], turnover: [] });
    const o = bySym.get(r.symbol); const adj = r.adj_close == null ? null : Number(r.adj_close);
    const prev = o.adj.length ? o.adj[o.adj.length - 1] : null;
    o.dates.push(r.d); o.adj.push(adj);
    o.sret.push(prev != null && adj != null && prev > 0 ? adj / prev - 1 : null);
    o.turnover.push(r.close != null && r.volume != null ? Number(r.close) * Number(r.volume) : null); }
  console.log(`  Priced: ${bySym.size}/${needNS.length}`);

  // equal-weight benchmark daily return (for ear day-0 abnormal)
  const acc = new Map();
  for (const s of universe) { const o = bySym.get(`${s}.NS`); if (!o) continue;
    for (let i = 0; i < o.dates.length; i++) { const sr = o.sret[i]; if (sr == null) continue; const a = acc.get(o.dates[i]) || { sum: 0, n: 0 }; a.sum += sr; a.n++; acc.set(o.dates[i], a); } }
  const benchSret = new Map([...acc].map(([d, a]) => [d, a.sum / a.n]));

  // announcements (results) per symbol
  const { rows: annRows } = await pool.query(
    `SELECT upper(symbol) AS symbol, category, subject,
            to_char((announced_at AT TIME ZONE 'Asia/Kolkata')::date,'YYYY-MM-DD') AS ann_date
       FROM india_bourse_announcements WHERE symbol IS NOT NULL`);
  const annBySym = new Map();
  for (const a of annRows) { if (!RESULTS_RE.test(`${a.category} ${a.subject}`.toLowerCase())) continue;
    const k = bareUp(a.symbol); if (!annBySym.has(k)) annBySym.set(k, []); annBySym.get(k).push(a.ann_date); }
  for (const arr of annBySym.values()) arr.sort();

  // deals per symbol: {date, signedValue}
  const { rows: dealRows } = await pool.query(
    `SELECT upper(symbol) AS symbol, to_char(deal_date,'YYYY-MM-DD') AS d, buy_sell, SUM(quantity*price) AS val
       FROM india_bulk_block_deals WHERE symbol IS NOT NULL AND buy_sell IN ('BUY','SELL') AND quantity>0 AND price>0
       GROUP BY upper(symbol), deal_date, buy_sell`);
  const dealBySym = new Map();
  for (const r of dealRows) { const k = bareUp(r.symbol); if (!dealBySym.has(k)) dealBySym.set(k, []);
    dealBySym.get(k).push({ d: r.d, sv: (r.buy_sell === 'BUY' ? 1 : -1) * Number(r.val) }); }
  for (const arr of dealBySym.values()) arr.sort((a, b) => (a.d < b.d ? -1 : 1));
  await pool.end();

  // monthly rebalance dates from ^NSEI calendar (first trading day of each month)
  const cal = (bySym.get('^NSEI') || { dates: [] }).dates;
  const rebal = []; let lastMonth = '';
  for (const d of cal) { const ym = d.slice(0, 7); if (ym !== lastMonth) { rebal.push(d); lastMonth = ym; } }
  const rebalUse = rebal.filter((d) => !FROM || d >= FROM);
  console.log(`  Rebalance dates: ${rebalUse.length} (monthly${FROM ? `, from ${FROM}` : ''})\n`);

  // build rows
  const out = [];
  let nMom = 0, nEar = 0, nDeal = 0;
  for (const sym of universe) {
    const o = bySym.get(`${sym}.NS`); if (!o) continue;
    const band = bandOf.get(sym);
    const anns = annBySym.get(sym) || [];
    const deals = dealBySym.get(sym) || [];
    for (const d of rebalUse) {
      const idx = firstAtOrAfter(o.dates, d);
      if (idx >= o.dates.length || o.dates[idx] !== d) continue;       // d must be a real trading bar for this name
      if (idx < MOM_LONG || idx + HORIZON >= o.dates.length) continue; // need momentum history + forward window
      // size proxy
      const advWin = o.turnover.slice(idx - ADV_WIN, idx).filter((x) => x != null && x > 0);
      if (advWin.length < ADV_WIN / 2) continue;
      const adv = median(advWin); const logAdv = Math.log(adv);
      // price momentum (12-1)
      const a1 = o.adj[idx - MOM_SKIP], a2 = o.adj[idx - MOM_LONG];
      const mom = a1 != null && a2 != null && a2 > 0 ? Math.log(a1 / a2) : null; if (mom != null) nMom++;
      // ear_drift: most recent results in [d-90, d)
      let ear = null; const lo = addCalDays(d, -EAR_LOOKBACK_CAL);
      for (let k = anns.length - 1; k >= 0; k--) { const ad = anns[k]; if (ad >= d) continue; if (ad < lo) break;
        const di = firstAtOrAfter(o.dates, ad); if (di > 0 && di < idx && o.sret[di] != null) { ear = o.sret[di] - (benchSret.get(o.dates[di]) ?? 0); nEar++; } break; }
      // bulkdeal_intensity: signed value in [d-30, d) / (~month ADV)
      const dlo = addCalDays(d, -DEAL_LOOKBACK_CAL); let net = 0, hit = false;
      for (let k = deals.length - 1; k >= 0; k--) { const dd = deals[k].d; if (dd >= d) continue; if (dd < dlo) break; net += deals[k].sv; hit = true; }
      const dealInt = hit ? net / (adv * ADV_WIN + 1) : 0; if (hit) nDeal++;
      // forward return
      const fwd = o.adj[idx + HORIZON] / o.adj[idx] - 1;
      out.push({ d, sym, band, logAdv, mom, ear, dealInt, fwd });
    }
  }
  console.log(`  Panel rows: ${out.length}  ·  non-null momentum ${nMom} · ear events ${nEar} · deal-active ${nDeal}`);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const fmt = (x) => (x == null || Number.isNaN(x) ? '' : Number(x).toFixed(6));
  const csv = ['date,symbol,band,log_adv,price_momentum,ear_drift,bulkdeal_intensity,fwd_ret',
    ...out.map((r) => [r.d, r.sym, r.band, fmt(r.logAdv), fmt(r.mom), fmt(r.ear), fmt(r.dealInt), fmt(r.fwd)].join(','))].join('\n');
  writeFileSync(join(OUTPUT_DIR, 'panel.csv'), csv);
  console.log(`\n  Wrote ${join(OUTPUT_DIR, 'panel.csv')}`);
  console.log('  Next: node scripts/research/exp19-xs-ensemble.mjs');
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
