#!/usr/bin/env node
//
// Experiment 2 — Do NSE bourse announcements move prices? (event study)
// See: ai_docs/sachnetra v2/wiki/syntheses/sachnetra_research_playbook.md
//
// HYPOTHESIS (falsifiable, with direction + horizon):
//   "Announcements in certain categories (board outcomes, results, pledges,
//    auditor/management changes, etc.) produce non-zero ABNORMAL returns in the
//    days around the filing — and, for a tradable edge, in the days AFTER it."
//
// WHY THIS MATTERS: this is the empirical core of Product A. Exp 1 showed the
// leading signal is NOT in FII flows; event-driven filings are the next
// candidate. 17,322 announcements + the price series from Exp 0.
//
// METHOD — classic market-adjusted event study:
//   abnormal return AR_t(stock) = log_return_t(stock) − log_return_t(^NSEI)
//   Event day 0 = first trading day on/after the announcement's IST date.
//   For each event we measure AR over relative trading days −5..+5 and split:
//     • PRE   CAR[−5..−1]  — anticipation / information leakage before the filing
//     • DAY0  AR[0]        — the immediate reaction
//     • POST  CAR[+1..+5]  — the only window an outsider could actually TRADE
//   Cross-sectional t-stat per category: mean(CAR) / (sd(CAR)/sqrt(N)).
//
// LOOK-AHEAD NOTE: POST (+1..+5) is the no-look-ahead, tradable window — it
//   excludes day 0 entirely, so even after-hours filings can't leak into it.
//   A significant POST drift is the interesting result; a big DAY0 with no POST
//   means the market already absorbed it (efficient — not tradable).
//
// SURVIVORSHIP CAVEAT: research_prices holds only CURRENT Nifty-50 names, so
//   only announcements for those ~47 symbols are testable. Delisted/blown-up
//   names (where auditor-resignation alpha really lives) are absent. This biases
//   results toward survivors — stated loudly in the output and the write-up.
//
// BOUNDARY: read-only. SELECTs only. Claude authors; Lijo runs.
// PREREQUISITE: research_prices populated (backfill-research-prices.mjs).
//
// USAGE
//   node scripts/research/exp2-announcements-event-study.mjs
//   node scripts/research/exp2-announcements-event-study.mjs --min-events=50
//   node scripts/research/exp2-announcements-event-study.mjs --from=2015-01-01
//   node scripts/research/exp2-announcements-event-study.mjs --pre=5 --post=5

import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const PRE = Math.max(1, Number(flag('pre', '5')));
const POST = Math.max(1, Number(flag('post', '5')));
const MIN_EVENTS = Number(flag('min-events', '30'));
const INDEX_SYMBOL = flag('index', '^NSEI');
const FROM = flag('from', null);
const TO = flag('to', null);

// ── stats ──────────────────────────────────────────────────────────────────
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
function tStat(arr) {
  const n = arr.length; if (n < 2) return { n, mean: NaN, t: NaN, p: NaN };
  const m = mean(arr);
  const sd = Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1));
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
const pct = (x) => `${(x * 100).toFixed(2)}%`;
const stars = (p) => (p < 0.01 ? '***' : p < 0.05 ? '**' : p < 0.1 ? '*' : '');

// ── category buckets (keyword rules over category + subject) ────────────────
const BUCKETS = [
  ['auditor',          /auditor/],
  ['promoter_pledge',  /pledg|encumbr/],
  ['mgmt_change',      /resign|cessation|appoint|change in director|change in management|ceo|cfo|managing director|key managerial/],
  ['board_meeting',    /board meeting/],
  ['financial_results',/financial result|unaudited|audited.*result|quarterly result/],
  ['dividend',         /dividend/],
  ['buyback',          /buy.?back/],
  ['bonus_split',      /bonus|stock split|sub-division|subdivision/],
  ['credit_rating',    /credit rating|rating/],
  ['order_win',        /order|contract|bags |wins |awarded/],
  ['acquisition',      /acqui|merger|amalgamation|scheme of arrangement|stake/],
];
function classify(text) {
  const t = (text || '').toLowerCase();
  const hits = [];
  for (const [name, re] of BUCKETS) if (re.test(t)) hits.push(name);
  return hits; // an announcement can land in multiple buckets
}

// ── forward/relative-day machinery per symbol ──────────────────────────────
function firstAtOrAfter(dates, target) {
  let lo = 0, hi = dates.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (dates[m] >= target) hi = m; else lo = m + 1; }
  return lo; // index of first date >= target (== dates.length if none)
}

async function main() {
  console.log('=== Experiment 2 — do NSE announcements move prices? (event study) ===');
  console.log(`  Windows: PRE[−${PRE}..−1]  DAY0[0]  POST[+1..+${POST}]   Min events/bucket: ${MIN_EVENTS}`);
  console.log(`  Abnormal return = stock log_return − ${INDEX_SYMBOL} log_return (market-adjusted)`);
  console.log(`  Window: ${FROM || 'start'} → ${TO || 'today'}`);

  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // Load all prices grouped by symbol; build index return map.
  const { rows: priceRows } = await pool.query(
    `SELECT symbol, to_char(trade_date,'YYYY-MM-DD') AS d, log_return AS r
       FROM research_prices ORDER BY symbol, trade_date ASC`);
  const bySym = new Map(); // symbol -> { dates:[], rets:[] }
  for (const row of priceRows) {
    if (!bySym.has(row.symbol)) bySym.set(row.symbol, { dates: [], rets: [] });
    const o = bySym.get(row.symbol); o.dates.push(row.d); o.rets.push(row.r == null ? null : Number(row.r));
  }
  const idx = bySym.get(INDEX_SYMBOL);
  if (!idx) { console.error(`ERROR: no ${INDEX_SYMBOL} in research_prices. Run Exp 0 first.`); await pool.end(); process.exit(1); }
  const idxRet = new Map(idx.dates.map((d, i) => [d, idx.rets[i]]));
  const priceSymbols = new Set(bySym.keys());

  // Load announcements that have a symbol matching a priced (Nifty-50) name.
  const annParams = [];
  let annWhere = `symbol IS NOT NULL`;
  if (FROM) { annParams.push(FROM); annWhere += ` AND announced_at >= $${annParams.length}`; }
  if (TO) { annParams.push(TO); annWhere += ` AND announced_at <= $${annParams.length}`; }
  const { rows: annRows } = await pool.query(
    `SELECT symbol, category, subject,
            to_char((announced_at AT TIME ZONE 'Asia/Kolkata')::date,'YYYY-MM-DD') AS ann_date
       FROM india_bourse_announcements WHERE ${annWhere}`, annParams);
  await pool.end();

  // Bucket -> array of { pre, day0, post, full } abnormal returns
  const buckets = new Map();
  const add = (name, rec) => { if (!buckets.has(name)) buckets.set(name, []); buckets.get(name).push(rec); };

  let totalAnn = 0, matchedSym = 0, usable = 0;
  const symHits = new Set();

  for (const a of annRows) {
    totalAnn++;
    const psym = `${a.symbol}.NS`;
    if (!priceSymbols.has(psym)) continue; // not a priced (Nifty-50) name
    matchedSym++;
    symHits.add(psym);
    const series = bySym.get(psym);
    const p0 = firstAtOrAfter(series.dates, a.ann_date);
    if (p0 - PRE < 0 || p0 + POST >= series.dates.length) continue; // not enough surrounding bars

    // build AR for relative days −PRE..+POST
    let ok = true, pre = 0, post = 0, day0 = 0, full = 0;
    for (let k = -PRE; k <= POST; k++) {
      const pos = p0 + k;
      const d = series.dates[pos];
      const sr = series.rets[pos];
      const ir = idxRet.get(d);
      if (sr == null || ir == null) { ok = false; break; }
      const ar = sr - ir;
      full += ar;
      if (k < 0) pre += ar; else if (k === 0) day0 = ar; else post += ar;
    }
    if (!ok) continue;
    usable++;

    const rec = { pre, day0, post, full };
    add('ALL', rec);
    for (const b of classify(`${a.category} ${a.subject}`)) add(b, rec);
  }

  // ── Report ──
  console.log(`\n  Announcements scanned: ${totalAnn}`);
  console.log(`  Matched a priced Nifty-50 symbol: ${matchedSym}  (across ${symHits.size} symbols)`);
  console.log(`  Usable events (full ±window present): ${usable}`);
  console.log('  NOTE: only current Nifty-50 names are priced — survivorship-biased toward survivors.\n');

  const rows = [];
  for (const [name, recs] of buckets) {
    if (recs.length < MIN_EVENTS) continue;
    const post = tStat(recs.map((r) => r.post));
    const pre = tStat(recs.map((r) => r.pre));
    const d0 = tStat(recs.map((r) => r.day0));
    rows.push({ name, n: recs.length, pre, d0, post });
  }
  rows.sort((a, b) => Math.abs(b.post.t) - Math.abs(a.post.t)); // most significant tradable drift first

  console.log('  Bucket             N      PRE[−avg]  (t)        DAY0[avg]  (t)        POST[+avg]  (t)      sig');
  console.log('  ' + '─'.repeat(98));
  for (const r of rows) {
    const f = (s) => `${pct(s.mean).padStart(8)} (${s.t.toFixed(2).padStart(5)})`;
    console.log(
      `  ${r.name.padEnd(17)} ${String(r.n).padStart(5)}   ${f(r.pre)}   ${f(r.d0)}   ${f(r.post)}  ${stars(r.post.p)}`
    );
  }

  console.log('\n  Reading the table:');
  console.log('   • POST significant (** or ***) = a drift AFTER the filing an outsider could trade. The headline result.');
  console.log('   • DAY0 big but POST flat = market absorbs it same day (efficient) — not tradable.');
  console.log('   • PRE significant = info leaks/anticipated BEFORE the public filing — interesting (and a compliance flag).');
  console.log('   • Small N (near the min) → treat as anecdote, not statistics.');
  console.log('\n  → Log the significant buckets to the Hypothesis Register in sachnetra_research_playbook.md.');
  console.log('\nDone.');
}

main().catch((e) => { console.error('Experiment failed:', e.message); process.exit(1); });
