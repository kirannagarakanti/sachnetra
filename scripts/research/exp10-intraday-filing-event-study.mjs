#!/usr/bin/env node
//
// Experiment 10 — does a tagged-large-cap NSE filing move the price (intraday)?
// See: ai_docs/sachnetra v2/wiki/experiments/Exp10.md  (pre-registered hypothesis,
//      verdict tiers, and bias-checklist defences live there — read §5 before
//      interpreting any output below).
//
// HYPOTHESIS (locked in Exp10.md §1):
//   For a tagged-large-cap NSE filing landing in regular market hours (9:15–15:30 IST),
//   the abnormal return AR_h = ln(close_{t+h}/close_t) − ln(NSEI_{t+h}/NSEI_t) at
//   h = +60min exceeds 0.5% in absolute terms more often than chance, with mean
//   signed AR distinguishable from zero at p<0.05 in ≥1 tradeable category
//   (acquisition / financial_results / dividend / board_meeting).
//
// METHOD (Exp10.md §3):
//   1. Filings from india_bourse_announcements for the 15 tagged large-caps that
//      account for ~all news ticker-tags today (Exp 4 §14.3 list).
//   2. Filter to market hours (9:15–15:30 IST) + tradeable categories.
//   3. Snap announced_at to the NEXT 5-min bar in research_prices_intraday — never
//      use the bar containing the filing instant (no look-ahead).
//   4. AR at 7 horizons: +5, +15, +30, +60, +240 min, EOD close, next-day close.
//   5. Per-horizon: mean AR, t vs 0, mean |AR|, hit-rate >0.5%. Per-category guard
//      min-events=10. Concentration check: re-compute headline drop-top-3 events
//      and drop-top-3 days; flag 🚩 SUSPECT if the result collapses.
//   6. News match (for context + Gemini split): announcement.symbol ∈
//      news.nse_tickers[] (strip .NS suffix), news.published_at within ±48h of
//      announced_at (same matching method as Exp 4).
//
// OUTPUTS:
//   scripts/research/output/exp10/exp10_events_matched.csv     — events w/ news in DB
//   scripts/research/output/exp10/exp10_events_unmatched.csv   — events w/o news → Gemini loop
//   scripts/research/output/exp10/exp10_results_summary.csv    — per-horizon + per-category stats
//
// BOUNDARY (per memory/feedback_v2_prod_execution + research playbook):
//   READ-ONLY on prod. SELECTs against india_bourse_announcements + india_news_signals +
//   research_prices_intraday. Writes only local CSV files. Claude authors; Lijo runs.
//
// USAGE
//   node scripts/research/exp10-intraday-filing-event-study.mjs                 # default run
//   node scripts/research/exp10-intraday-filing-event-study.mjs --from=2026-04-25 --to=2026-05-22
//   node scripts/research/exp10-intraday-filing-event-study.mjs --min-events=5  # loosen per-category guard
//   node scripts/research/exp10-intraday-filing-event-study.mjs --categories=acquisition,dividend
//   node scripts/research/exp10-intraday-filing-event-study.mjs --use-gemini-news # re-run after Gemini loop

import { loadEnvFile } from '../_seed-utils.mjs';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

// ── CLI flags ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const FROM = flag('from', null);
const TO = flag('to', null);
const MIN_EVENTS = Number(flag('min-events', '10'));
const CATEGORIES_FLAG = flag('categories', null);
const USE_GEMINI_NEWS = args.includes('--use-gemini-news');
const HIT_THRESHOLD = Number(flag('hit-threshold', '0.005')); // 0.5% in fractional units

// ── Universe: same 15 tagged large-caps as backfill-intraday-prices.mjs ───
const TAGGED_LARGE_CAPS = [
  'ITC', 'SBIN', 'RELIANCE', 'BHARTIARTL', 'SUNPHARMA',
  'MARUTI', 'NTPC', 'HINDALCO', 'EICHERMOT', 'GRASIM',
  'TCS', 'TATASTEEL', 'M&M', 'APOLLOHOSP', 'DRREDDY',
];
// Map bare announcement symbol → Yahoo intraday symbol used in research_prices_intraday.
const intradaySymbolFor = (bareSymbol) => `${bareSymbol}.NS`;
const NSEI = '^NSEI';

// ── Category buckets: mirror Exp 2 / Exp 4 exactly for cross-experiment consistency ──
const BUCKETS = [
  ['auditor',           /auditor/],
  ['promoter_pledge',   /pledg|encumbr/],
  ['mgmt_change',       /resign|cessation|appoint|change in director|change in management|ceo|cfo|managing director|key managerial/],
  ['board_meeting',     /board meeting/],
  ['financial_results', /financial result|unaudited|audited.*result|quarterly result/],
  ['dividend',          /dividend/],
  ['buyback',           /buy.?back/],
  ['bonus_split',       /bonus|stock split|sub-division|subdivision/],
  ['credit_rating',     /credit rating|rating/],
  ['order_win',         /order|contract|bags |wins |awarded/],
  ['acquisition',       /acqui|merger|amalgamation|scheme of arrangement|stake/],
];
const TRADEABLE_DEFAULT = ['acquisition', 'financial_results', 'dividend', 'board_meeting'];
const TRADEABLE = CATEGORIES_FLAG ? CATEGORIES_FLAG.split(',').map((s) => s.trim()) : TRADEABLE_DEFAULT;

function classify(text) {
  const t = (text || '').toLowerCase();
  const hits = [];
  for (const [name, re] of BUCKETS) if (re.test(t)) hits.push(name);
  return hits;
}

// ── Horizons (Exp10.md §3.4) ────────────────────────────────────────────────
// Each is (label, bar-offset). EOD and next-day-close are computed specially.
const HORIZONS_BARS = [
  ['t+5min',   1],
  ['t+15min',  3],
  ['t+30min',  6],
  ['t+60min',  12],
  ['t+240min', 48],
];
const HORIZONS_SPECIAL = ['EOD_close', 'next_day_close'];

// ── Stats helpers (no deps) ────────────────────────────────────────────────
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function tStatVsZero(arr) {
  const n = arr.length; if (n < 2) return { n, mean: NaN, sd: NaN, t: NaN, p: NaN };
  const m = mean(arr);
  const sd = Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1));
  if (sd === 0) return { n, mean: m, sd: 0, t: NaN, p: NaN };
  const t = m / (sd / Math.sqrt(n));
  return { n, mean: m, sd, t, p: twoSidedP(t) };
}
function twoSidedP(t) {
  const z = Math.abs(t);
  const erf = (x) => {
    const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const tt = 1 / (1 + p * x);
    return s * (1 - (((((a5 * tt + a4) * tt) + a3) * tt + a2) * tt + a1) * tt * Math.exp(-x * x));
  };
  return 2 * (1 - 0.5 * (1 + erf(z / Math.SQRT2)));
}
const stars = (p) => (p < 0.01 ? '***' : p < 0.05 ? '**' : p < 0.1 ? '*' : '');
const pct = (x, d = 2) => (x * 100).toFixed(d) + '%';
const bps = (x) => (x * 10000).toFixed(1) + ' bps';

// ── Bar lookup helpers ─────────────────────────────────────────────────────
// Given a sorted array of bars [{ ts: epoch_seconds, close }] return the index of
// the FIRST bar with ts >= target. Returns -1 if no such bar (target past last bar).
function nextBarIdx(bars, target) {
  let lo = 0, hi = bars.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (bars[m].ts < target) lo = m + 1; else hi = m; }
  return lo < bars.length ? lo : -1;
}

// ── IST helpers (market hours 9:15–15:30 IST = 03:45–10:00 UTC) ───────────
// We test in UTC because all timestamps are TIMESTAMPTZ (absolute instants).
// 9:15 IST = 3:45 UTC ; 15:30 IST = 10:00 UTC. Window check is on UTC HH:MM.
function isMarketHoursUTC(date) {
  const h = date.getUTCHours(), m = date.getUTCMinutes();
  const utcMin = h * 60 + m;
  return utcMin >= (3 * 60 + 45) && utcMin <= (10 * 60); // [03:45, 10:00] UTC
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Experiment 10 — intraday filing → price reaction (tagged large-caps) ===');
  console.log(`  Universe: ${TAGGED_LARGE_CAPS.length} tagged large-caps + ^NSEI (market control)`);
  console.log(`  Tradeable categories: ${TRADEABLE.join(', ')}`);
  console.log(`  Window: ${FROM || 'start'} → ${TO || 'today'}`);
  console.log(`  Hit-rate threshold: |AR| > ${HIT_THRESHOLD * 100}%`);
  console.log(`  Per-category guard: min-events=${MIN_EVENTS}`);
  if (USE_GEMINI_NEWS) console.log(`  Augmented news: --use-gemini-news ON`);

  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // ── 1. Load filings for the 15 tagged tickers in window ──
  const annParams = [TAGGED_LARGE_CAPS];
  let annWhere = `symbol = ANY($1)`;
  if (FROM) { annParams.push(FROM); annWhere += ` AND announced_at >= $${annParams.length}`; }
  if (TO)   { annParams.push(TO);   annWhere += ` AND announced_at <= $${annParams.length}`; }
  const { rows: annRows } = await pool.query(
    `SELECT symbol, company_name, category, subject,
            EXTRACT(EPOCH FROM announced_at)::float AS ts,
            announced_at
       FROM india_bourse_announcements
      WHERE ${annWhere}
      ORDER BY ts ASC`, annParams);

  // ── 2. Load intraday bars for each ticker + ^NSEI ──
  const barsBySymbol = new Map();
  const intradayTickers = [...new Set([NSEI, ...TAGGED_LARGE_CAPS.map(intradaySymbolFor)])];
  for (const sym of intradayTickers) {
    const { rows } = await pool.query(
      `SELECT EXTRACT(EPOCH FROM bar_ts)::float AS ts, close
         FROM research_prices_intraday
        WHERE symbol = $1 AND interval = '5m'
        ORDER BY ts ASC`, [sym]);
    barsBySymbol.set(sym, rows.map((r) => ({ ts: Number(r.ts), close: Number(r.close) })));
  }
  const nseiBars = barsBySymbol.get(NSEI);
  if (!nseiBars || nseiBars.length === 0) {
    console.error('ERROR: no ^NSEI bars in research_prices_intraday — run backfill-intraday-prices.mjs first.');
    await pool.end(); process.exit(1);
  }

  // ── 3. Load news for the matched/unmatched split (Exp 4 method) ──
  const { rows: newsRows } = await pool.query(
    `SELECT EXTRACT(EPOCH FROM published_at)::float AS ts,
            published_at, nse_tickers, headline
       FROM india_news_signals
      WHERE published_at IS NOT NULL AND nse_tickers IS NOT NULL`);
  const newsByTicker = new Map();
  for (const r of newsRows) {
    for (const t of r.nse_tickers || []) {
      const k = norm(t);
      if (!k) continue;
      if (!newsByTicker.has(k)) newsByTicker.set(k, []);
      newsByTicker.get(k).push({ ts: Number(r.ts), published_at: r.published_at, headline: r.headline });
    }
  }
  for (const arr of newsByTicker.values()) arr.sort((a, b) => a.ts - b.ts);

  // ── 4. Augmented Gemini news (optional) ──
  let geminiByTicker = null;
  if (USE_GEMINI_NEWS) {
    const geminiPath = join(OUTPUT_DIR, 'exp10_events_gemini_verified.csv');
    if (!existsSync(geminiPath)) {
      console.warn(`  ⚠ --use-gemini-news set but ${geminiPath} not found — skipping augmentation.`);
    } else {
      geminiByTicker = parseGeminiCsv(readFileSync(geminiPath, 'utf8'));
      console.log(`  ✓ Loaded ${geminiByTicker.size} ticker entries from Gemini verification.`);
    }
  }

  await pool.end();

  // ── 5. Build event set: in market hours + tradeable category ──
  const events = []; // each: { symbol, intraday_symbol, announced_at, ts, category, subject, ... }
  let totalFilings = 0, hoursOk = 0, tradeableOk = 0;
  for (const a of annRows) {
    totalFilings++;
    const announceDate = new Date(Number(a.ts) * 1000);
    if (!isMarketHoursUTC(announceDate)) continue;
    hoursOk++;
    const buckets = classify(`${a.category} ${a.subject}`);
    const tradeableHits = buckets.filter((b) => TRADEABLE.includes(b));
    if (tradeableHits.length === 0) continue;
    tradeableOk++;
    events.push({
      symbol: a.symbol,
      intraday_symbol: intradaySymbolFor(a.symbol),
      announced_at: a.announced_at,
      ts: Number(a.ts),
      category: a.category,
      subject: a.subject,
      buckets: tradeableHits,
    });
  }

  // ── 6. Snap each event to next 5-min bar + compute ARs at all horizons ──
  const enriched = [];
  let snapped = 0, snapFails = 0;
  for (const e of events) {
    const stockBars = barsBySymbol.get(e.intraday_symbol);
    if (!stockBars || stockBars.length === 0) { snapFails++; e.fail = 'no_intraday_bars'; continue; }
    const iStock = nextBarIdx(stockBars, e.ts);
    const iMkt = nextBarIdx(nseiBars, e.ts);
    if (iStock < 0 || iMkt < 0) { snapFails++; e.fail = 'no_next_bar'; continue; }
    // Sanity: entry bars should be near each other in time (same trading day).
    // If they diverge by > 1 day, something is off — flag and skip.
    if (Math.abs(stockBars[iStock].ts - nseiBars[iMkt].ts) > 24 * 3600) { snapFails++; e.fail = 'bar_misalign'; continue; }
    snapped++;

    const entryStock = stockBars[iStock].close;
    const entryMkt = nseiBars[iMkt].close;
    const entryTs = stockBars[iStock].ts;

    const ARs = {};
    for (const [label, off] of HORIZONS_BARS) {
      const jStock = iStock + off, jMkt = iMkt + off;
      if (jStock >= stockBars.length || jMkt >= nseiBars.length) { ARs[label] = null; continue; }
      const rStock = Math.log(stockBars[jStock].close / entryStock);
      const rMkt = Math.log(nseiBars[jMkt].close / entryMkt);
      ARs[label] = rStock - rMkt;
    }

    // EOD close: last bar on the same UTC calendar day as the entry bar.
    const entryDayUTC = new Date(entryTs * 1000).toISOString().slice(0, 10);
    let eodStock = null, eodMkt = null;
    for (let j = stockBars.length - 1; j >= iStock; j--) {
      if (new Date(stockBars[j].ts * 1000).toISOString().slice(0, 10) === entryDayUTC) { eodStock = stockBars[j].close; break; }
    }
    for (let j = nseiBars.length - 1; j >= iMkt; j--) {
      if (new Date(nseiBars[j].ts * 1000).toISOString().slice(0, 10) === entryDayUTC) { eodMkt = nseiBars[j].close; break; }
    }
    ARs['EOD_close'] = (eodStock != null && eodMkt != null)
      ? Math.log(eodStock / entryStock) - Math.log(eodMkt / entryMkt) : null;

    // Next-day close: last bar on the NEXT distinct UTC calendar day with bars present.
    let nextDayStock = null, nextDayMkt = null;
    const nextDistinctClose = (bars, fromIdx) => {
      let curDay = new Date(bars[fromIdx].ts * 1000).toISOString().slice(0, 10);
      let nextDay = null, lastClose = null;
      for (let j = fromIdx + 1; j < bars.length; j++) {
        const d = new Date(bars[j].ts * 1000).toISOString().slice(0, 10);
        if (d === curDay) continue;
        if (nextDay == null) nextDay = d;
        if (d === nextDay) lastClose = bars[j].close;
        else break;
      }
      return lastClose;
    };
    nextDayStock = nextDistinctClose(stockBars, iStock);
    nextDayMkt = nextDistinctClose(nseiBars, iMkt);
    ARs['next_day_close'] = (nextDayStock != null && nextDayMkt != null && eodStock != null && eodMkt != null)
      ? Math.log(nextDayStock / eodStock) - Math.log(nextDayMkt / eodMkt) : null;

    // News match (Exp 4 method): nearest news within ±48h for this ticker.
    const newsList = newsByTicker.get(norm(e.symbol)) || [];
    const augList = geminiByTicker ? (geminiByTicker.get(norm(e.symbol)) || []) : [];
    const allNews = [...newsList, ...augList].sort((a, b) => a.ts - b.ts);
    let matchedNews = null;
    if (allNews.length > 0) {
      const i = nextBarIdx(allNews, e.ts - 48 * 3600);
      // walk forward while within window, track nearest
      let bestAbs = Infinity, best = null;
      for (let j = i; j < allNews.length; j++) {
        const d = Math.abs(allNews[j].ts - e.ts);
        if (d > 48 * 3600) { if (allNews[j].ts > e.ts) break; else continue; }
        if (d < bestAbs) { bestAbs = d; best = allNews[j]; }
      }
      matchedNews = best;
    }

    enriched.push({ ...e, entry_bar_ts: entryTs, entry_stock_close: entryStock, entry_mkt_close: entryMkt, ARs, matchedNews });
  }

  // ── 7. Report funnel (Exp10.md §6) ──
  console.log(`\n— Data reality (the funnel) —`);
  console.log(`  Tagged-symbol filings in window:             ${totalFilings}`);
  console.log(`  ...landed in market hours (9:15–15:30 IST):  ${hoursOk}`);
  console.log(`  ...in tradeable categories:                  ${tradeableOk}`);
  console.log(`  ...successfully snapped to intraday bars:    ${snapped}`);
  console.log(`  ...snap failures (no bars / misalign):       ${snapFails}`);

  if (snapped === 0) {
    console.log('\n  ⬜ No usable events — nothing to test. Widen window with --from / --to or wait for collectors.');
    return;
  }

  // ── 8. Per-horizon stats (all tradeable pooled) ──
  console.log(`\n— Per-horizon (all tradeable categories pooled) —`);
  console.log(`  ${'horizon'.padEnd(15)} ${'n'.padStart(4)}   ${'mean AR'.padStart(10)} ${'t'.padStart(7)} ${'p'.padStart(7)}   ${'mean |AR|'.padStart(10)}  hit-rate`);
  console.log('  ' + '─'.repeat(78));
  const horizonStats = {};
  for (const h of [...HORIZONS_BARS.map((x) => x[0]), ...HORIZONS_SPECIAL]) {
    const arr = enriched.map((e) => e.ARs[h]).filter((x) => x != null);
    if (arr.length === 0) { console.log(`  ${h.padEnd(15)} ${String(0).padStart(4)}   (no data)`); continue; }
    const tt = tStatVsZero(arr);
    const abs = arr.map(Math.abs);
    const ttAbs = tStatVsZero(abs);
    const hits = arr.filter((x) => Math.abs(x) > HIT_THRESHOLD).length;
    const hitrate = hits / arr.length;
    horizonStats[h] = { n: arr.length, mean: tt.mean, t: tt.t, p: tt.p, meanAbs: ttAbs.mean, hitrate, arr };
    console.log(`  ${h.padEnd(15)} ${String(arr.length).padStart(4)}   ${bps(tt.mean).padStart(10)} ${tt.t.toFixed(2).padStart(7)} ${tt.p.toFixed(3).padStart(7)}${stars(tt.p)}   ${bps(ttAbs.mean).padStart(10)}  ${pct(hitrate)}`);
  }

  // ── 9. Per-category at headline horizon (t+60min) ──
  const HEADLINE = 't+60min';
  console.log(`\n— Per-category at ${HEADLINE} (min ${MIN_EVENTS} events) —`);
  console.log(`  ${'category'.padEnd(18)} ${'n'.padStart(4)}   ${'mean AR'.padStart(10)} ${'t'.padStart(7)} ${'p'.padStart(7)}   ${'hit-rate'.padStart(8)}  %positive`);
  console.log('  ' + '─'.repeat(72));
  const byCat = new Map();
  for (const e of enriched) {
    const v = e.ARs[HEADLINE]; if (v == null) continue;
    for (const b of e.buckets) {
      if (!byCat.has(b)) byCat.set(b, []);
      byCat.get(b).push(v);
    }
  }
  const catRows = [];
  for (const [name, arr] of byCat) {
    if (arr.length < MIN_EVENTS) { catRows.push({ name, n: arr.length, skipped: true }); continue; }
    const tt = tStatVsZero(arr);
    const hits = arr.filter((x) => Math.abs(x) > HIT_THRESHOLD).length;
    const pos = arr.filter((x) => x > 0).length;
    catRows.push({ name, n: arr.length, mean: tt.mean, t: tt.t, p: tt.p, hitrate: hits / arr.length, fracPos: pos / arr.length });
  }
  catRows.sort((a, b) => (a.skipped ? 1 : 0) - (b.skipped ? 1 : 0) || (b.t || 0) - (a.t || 0));
  for (const r of catRows) {
    if (r.skipped) { console.log(`  ${r.name.padEnd(18)} ${String(r.n).padStart(4)}   (below min-events=${MIN_EVENTS})`); continue; }
    console.log(`  ${r.name.padEnd(18)} ${String(r.n).padStart(4)}   ${bps(r.mean).padStart(10)} ${r.t.toFixed(2).padStart(7)} ${r.p.toFixed(3).padStart(7)}${stars(r.p)}   ${pct(r.hitrate).padStart(8)}  ${pct(r.fracPos)}`);
  }

  // ── 10. Concentration check (drop-top-3-events, drop-top-3-days) ──
  console.log(`\n— Concentration check at ${HEADLINE} (does the headline survive?) —`);
  const headlineArr = enriched.map((e) => ({ v: e.ARs[HEADLINE], day: new Date(e.entry_bar_ts * 1000).toISOString().slice(0, 10) })).filter((x) => x.v != null);
  const fullTT = tStatVsZero(headlineArr.map((x) => x.v));
  const fullHit = headlineArr.filter((x) => Math.abs(x.v) > HIT_THRESHOLD).length / headlineArr.length;
  console.log(`  FULL set:                n=${headlineArr.length}  mean=${bps(fullTT.mean)}  t=${fullTT.t.toFixed(2)}  p=${fullTT.p.toFixed(3)}${stars(fullTT.p)}  hit=${pct(fullHit)}`);
  // drop top-3 by |AR|
  const sortedByAbs = [...headlineArr].sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  const minusTop3 = sortedByAbs.slice(3).map((x) => x.v);
  const dropEvTT = tStatVsZero(minusTop3);
  const dropEvHit = minusTop3.filter((x) => Math.abs(x) > HIT_THRESHOLD).length / minusTop3.length;
  console.log(`  drop top-3 by |AR|:      n=${minusTop3.length}  mean=${bps(dropEvTT.mean)}  t=${dropEvTT.t.toFixed(2)}  p=${dropEvTT.p.toFixed(3)}${stars(dropEvTT.p)}  hit=${pct(dropEvHit)}`);
  // drop top-3 days by event count
  const dayCounts = new Map();
  for (const x of headlineArr) dayCounts.set(x.day, (dayCounts.get(x.day) || 0) + 1);
  const topDays = new Set([...dayCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d));
  const minusTopDays = headlineArr.filter((x) => !topDays.has(x.day)).map((x) => x.v);
  if (minusTopDays.length >= 2) {
    const dropDayTT = tStatVsZero(minusTopDays);
    const dropDayHit = minusTopDays.filter((x) => Math.abs(x) > HIT_THRESHOLD).length / minusTopDays.length;
    console.log(`  drop top-3 days:         n=${minusTopDays.length}  mean=${bps(dropDayTT.mean)}  t=${dropDayTT.t.toFixed(2)}  p=${dropDayTT.p.toFixed(3)}${stars(dropDayTT.p)}  hit=${pct(dropDayHit)}`);
  }

  // ── 11. News matched/unmatched split (for Gemini loop) ──
  const matched = enriched.filter((e) => e.matchedNews != null);
  const unmatched = enriched.filter((e) => e.matchedNews == null);
  console.log(`\n— News match (Exp 4 method, ±48h ticker join) —`);
  console.log(`  Events with matching news in DB:  ${matched.length}`);
  console.log(`  Events with NO news in DB:        ${unmatched.length}  → for Gemini news-backfill loop`);

  // ── 12. Pre-registered verdict mapping (Exp10.md §5) ──
  console.log(`\n— Verdict against pre-registered §5 rules (Exp10.md) —`);
  const headlineHit = horizonStats[HEADLINE]?.hitrate ?? 0;
  const catSig = catRows.filter((r) => !r.skipped && r.p < 0.05);
  const catHit = catRows.filter((r) => !r.skipped && r.hitrate >= 0.55);
  const fullSig = horizonStats[HEADLINE]?.p < 0.05;
  if (headlineArr.length < 60) {
    console.log(`  ⬜ INCONCLUSIVE — only ${headlineArr.length} matched events at ${HEADLINE} (need ≥60). Re-run monthly as window slides.`);
  } else if (catSig.length >= 1 && catHit.length >= 1 && catSig.some((c) => catHit.find((h) => h.name === c.name))) {
    console.log(`  ✅ SUPPORTED — pre-registered threshold met (≥1 tradeable category with hit-rate ≥55% AND p<0.05).`);
    console.log(`     Surviving category(ies): ${catSig.filter((c) => catHit.find((h) => h.name === c.name)).map((c) => c.name).join(', ')}`);
    console.log(`     Next: author Exp 11 — paper-trade the rule for 30 days.`);
  } else if (fullSig) {
    console.log(`  🟡 PROMISING — pooled |AR| significant (p<0.05) but no single category cleared both bars. Keep collecting, re-run monthly.`);
  } else {
    console.log(`  ❌ NULL — no horizon/category cleared the pre-registered threshold. Pivot to G1 (mid/small-cap tagging) per Exp10.md §12.`);
  }
  // Concentration flag
  const headlineP = fullTT.p, dropP = dropEvTT.p;
  if (headlineP < 0.05 && dropP > 0.10) {
    console.log(`  🚩 SUSPECT — concentration check fails: headline p=${headlineP.toFixed(3)} collapses to p=${dropP.toFixed(3)} after dropping top-3 |AR| events. Downgrade verdict one tier.`);
  }

  // ── 13. Write the three CSVs ──
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, 'exp10_events_matched.csv'), buildMatchedCsv(matched));
  writeFileSync(join(OUTPUT_DIR, 'exp10_events_unmatched.csv'), buildUnmatchedCsv(unmatched));
  writeFileSync(join(OUTPUT_DIR, 'exp10_results_summary.csv'), buildSummaryCsv(horizonStats, catRows, headlineArr.length));
  console.log(`\n— Outputs —`);
  console.log(`  ${join(OUTPUT_DIR, 'exp10_events_matched.csv')}   (${matched.length} rows)`);
  console.log(`  ${join(OUTPUT_DIR, 'exp10_events_unmatched.csv')} (${unmatched.length} rows)`);
  console.log(`  ${join(OUTPUT_DIR, 'exp10_results_summary.csv')}`);
  console.log(`\n  → Fill Exp10.md §6/§7/§8 with the numbers above.`);
  console.log(`  → For unmatched events, follow the Gemini brief once authored.`);
  console.log('\nDone.');
}

// ── CSV builders ───────────────────────────────────────────────────────────
const __script_dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__script_dirname, 'output', 'exp10');

function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function csvRow(arr) { return arr.map(csvCell).join(',') + '\n'; }

function buildMatchedCsv(events) {
  const horizons = [...HORIZONS_BARS.map((x) => x[0]), ...HORIZONS_SPECIAL];
  const header = ['announced_at', 'symbol', 'category_raw', 'bucket', 'subject',
                  'entry_bar_ts_utc', 'news_published_at', 'news_headline', ...horizons];
  let out = csvRow(header);
  for (const e of events) {
    out += csvRow([
      e.announced_at?.toISOString?.() ?? e.announced_at,
      e.symbol, e.category, e.buckets.join('|'), e.subject,
      new Date(e.entry_bar_ts * 1000).toISOString(),
      e.matchedNews.published_at?.toISOString?.() ?? e.matchedNews.published_at,
      e.matchedNews.headline,
      ...horizons.map((h) => e.ARs[h] == null ? '' : e.ARs[h].toFixed(6)),
    ]);
  }
  return out;
}

function buildUnmatchedCsv(events) {
  // Includes a pre-formatted Gemini query so the manual loop is one paste per row.
  const header = ['announced_at_utc', 'announced_at_ist', 'symbol', 'category_raw',
                  'bucket', 'subject', 'gemini_query'];
  let out = csvRow(header);
  for (const e of events) {
    const utc = e.announced_at?.toISOString?.() ?? String(e.announced_at);
    const istDate = new Date(new Date(utc).getTime() + 5.5 * 3600 * 1000);
    const istStr = istDate.toISOString().replace('Z', '+05:30').replace('T', ' ').slice(0, 19);
    const windowStart = new Date(istDate.getTime() - 2 * 3600 * 1000).toISOString().slice(11, 16);
    const windowEnd = new Date(istDate.getTime() + 4 * 3600 * 1000).toISOString().slice(11, 16);
    const istDay = istDate.toISOString().slice(0, 10);
    const q = `Find any news articles about ${e.symbol} (Indian listed company, NSE) published on ${istDay} between ${windowStart} and ${windowEnd} IST regarding: "${e.subject}". For each result list: source, headline, publish timestamp (IST), URL. If nothing exists, reply exactly: NO_NEWS_FOUND.`;
    out += csvRow([utc, istStr, e.symbol, e.category, e.buckets.join('|'), e.subject, q]);
  }
  return out;
}

function buildSummaryCsv(horizonStats, catRows, headlineN) {
  let out = csvRow(['section', 'key', 'n', 'mean_AR', 't', 'p', 'mean_abs_AR', 'hit_rate', 'frac_pos']);
  for (const [h, s] of Object.entries(horizonStats)) {
    out += csvRow(['horizon', h, s.n, s.mean?.toFixed(6), s.t?.toFixed(3), s.p?.toFixed(4), s.meanAbs?.toFixed(6), s.hitrate?.toFixed(4), '']);
  }
  for (const r of catRows) {
    if (r.skipped) { out += csvRow(['category_t60', r.name, r.n, '', '', '', '', '', '']); continue; }
    out += csvRow(['category_t60', r.name, r.n, r.mean?.toFixed(6), r.t?.toFixed(3), r.p?.toFixed(4), '', r.hitrate?.toFixed(4), r.fracPos?.toFixed(4)]);
  }
  out += csvRow(['meta', 'headline_horizon', 't+60min', '', '', '', '', '', '']);
  out += csvRow(['meta', 'headline_n', headlineN, '', '', '', '', '', '']);
  out += csvRow(['meta', 'hit_threshold', HIT_THRESHOLD, '', '', '', '', '', '']);
  return out;
}

function parseGeminiCsv(text) {
  // Format expected from the Gemini loop output (header: symbol, news_published_at_ist, source, headline, url)
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return new Map();
  const out = new Map();
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 4) continue;
    const symbol = norm((parts[0] || '').replace(/^"|"$/g, ''));
    const publishedIst = (parts[1] || '').replace(/^"|"$/g, '').trim();
    const headline = (parts[3] || '').replace(/^"|"$/g, '');
    if (!symbol || !publishedIst || /^NO_NEWS_FOUND/i.test(headline)) continue;
    const publishedUtc = new Date(publishedIst.replace(' ', 'T') + (publishedIst.includes('+') ? '' : '+05:30'));
    if (isNaN(publishedUtc.getTime())) continue;
    if (!out.has(symbol)) out.set(symbol, []);
    out.get(symbol).push({ ts: publishedUtc.getTime() / 1000, published_at: publishedUtc, headline });
  }
  return out;
}
const norm = (s) => (s || '').trim().toUpperCase().replace(/\.(NS|BO)$/, '');

main().catch((e) => { console.error('Experiment failed:', e.message); console.error(e.stack); process.exit(1); });
