#!/usr/bin/env node
//
// Experiment 1 — Does FII flow predict the next-day Nifty move?
// See: ai_docs/sachnetra v2/wiki/syntheses/sachnetra_research_playbook.md
//
// HYPOTHESIS (falsifiable, with direction + horizon):
//   "FII net flow on day T predicts the SAME-SIGN Nifty (^NSEI) return over the
//    next H trading days." (Net buying → up, net selling → down.)
//
// WHY THIS IS THE FIRST REAL EXPERIMENT:
//   india_institutional_flows is your longest, cleanest series (V2-017b: ~3,964
//   rows back to Dec 2009). If the strongest, longest signal you own doesn't
//   predict anything, be very skeptical of the noisier ones.
//
// NO LOOK-AHEAD (the trap that fakes most "alpha"):
//   FII net for day T is known only AFTER the close of T. So we predict the
//   return of the NEXT trading day onward (T+1 ... T+H) — never T itself.
//   We also run the REVERSE regression (does the prior return predict today's
//   flow?). If reverse is stronger, FII is a coincident/reacting indicator,
//   not a leading one — important to know before anyone calls it alpha.
//
// VALIDATION:
//   Fit on the first --split fraction of dates, test on the rest. A slope that
//   only exists in-sample is noise you fooled yourself with.
//
// BOUNDARY: read-only. SELECTs from india_institutional_flows + research_prices.
//   Writes nothing. Claude authors; Lijo runs.
//
// PREREQUISITE: research_prices must be populated (run backfill-research-prices.mjs).
//
// USAGE
//   node scripts/research/exp1-fii-predicts-nifty.mjs
//   node scripts/research/exp1-fii-predicts-nifty.mjs --horizon=2     # T+1..T+2 forward return
//   node scripts/research/exp1-fii-predicts-nifty.mjs --from=2015-01-01 --to=2024-12-31
//   node scripts/research/exp1-fii-predicts-nifty.mjs --investor=DII --segment=cash
//   node scripts/research/exp1-fii-predicts-nifty.mjs --split=0.7

import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

// ── CLI flags ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const HORIZON = Math.max(1, Number(flag('horizon', '1')));   // forward trading days
const INVESTOR = flag('investor', 'FII');                    // 'FII' | 'DII'
const SEGMENT = flag('segment', 'cash');
const INDEX_SYMBOL = flag('index', '^NSEI');
const FROM = flag('from', null);
const TO = flag('to', null);
const SPLIT = Number(flag('split', '0.7'));                  // in-sample fraction

// ── Stats (no deps) ──────────────────────────────────────────────────────
function ols(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let Sxx = 0, Sxy = 0, Syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    Sxx += dx * dx; Sxy += dx * dy; Syy += dy * dy;
  }
  const slope = Sxy / Sxx;
  const intercept = my - slope * mx;
  const r = Sxy / Math.sqrt(Sxx * Syy);
  const rss = Syy - slope * Sxy;
  const seSlope = Math.sqrt((rss / (n - 2)) / Sxx);
  const t = slope / seSlope;
  return { n, slope, intercept, r, r2: r * r, t, p: twoSidedP(t) };
}

// Two-sided p-value, normal approximation (fine for n in the hundreds+).
function twoSidedP(t) {
  const z = Math.abs(t);
  // Abramowitz & Stegun erf approximation
  const erf = (x) => {
    const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
          a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const tt = 1 / (1 + p * x);
    const y = 1 - (((((a5 * tt + a4) * tt) + a3) * tt + a2) * tt + a1) * tt * Math.exp(-x * x);
    return s * y;
  };
  const cdf = 0.5 * (1 + erf(z / Math.SQRT2));
  return 2 * (1 - cdf);
}

// Directional hit-rate: how often does sign(flow) match sign(forward return)?
function hitRate(xs, ys) {
  let hits = 0, used = 0;
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] === 0 || ys[i] === 0) continue;
    used++;
    if (Math.sign(xs[i]) === Math.sign(ys[i])) hits++;
  }
  return { rate: used ? hits / used : NaN, used };
}

// ── Build forward-return lookup over the trading calendar ──────────────────
// Given ordered price rows (date, log_return), return a fn(flowDate, H) that
// sums log returns over the next H trading days strictly AFTER flowDate.
function makeForwardReturn(priceRows) {
  const dates = priceRows.map((r) => r.trade_date); // ascending 'YYYY-MM-DD'
  const rets = priceRows.map((r) => r.log_return);
  // first index with dates[i] > target (binary search)
  const firstAfter = (target) => {
    let lo = 0, hi = dates.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (dates[mid] > target) hi = mid; else lo = mid + 1;
    }
    return lo;
  };
  return (flowDate, H) => {
    const start = firstAfter(flowDate);
    if (start + H > dates.length) return null; // not enough future bars
    let sum = 0;
    for (let i = start; i < start + H; i++) {
      if (rets[i] == null) return null; // gap — skip this observation
      sum += rets[i];
    }
    return sum;
  };
}

function report(label, reg) {
  const stars = reg.p < 0.01 ? '***' : reg.p < 0.05 ? '**' : reg.p < 0.1 ? '*' : '';
  console.log(`  ${label}`);
  console.log(`    n=${reg.n}  corr=${reg.r.toFixed(3)}  R²=${reg.r2.toFixed(4)}  slope=${reg.slope.toExponential(2)}  t=${reg.t.toFixed(2)}  p≈${reg.p.toFixed(4)} ${stars}`);
}

async function main() {
  console.log('=== Experiment 1 — does FII flow predict the next-day Nifty move? ===');
  console.log(`  Investor: ${INVESTOR}  Segment: ${SEGMENT}  Index: ${INDEX_SYMBOL}`);
  console.log(`  Horizon:  next ${HORIZON} trading day(s) (NO look-ahead — flow at close T predicts T+1..T+${HORIZON})`);
  console.log(`  Window:   ${FROM || 'start'} → ${TO || 'today'}   In-sample split: ${(SPLIT * 100).toFixed(0)}%`);

  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_PUBLIC_URL not set in .env.local');
    process.exit(1);
  }
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  // Prices: ascending, only days that have a return
  const priceParams = [INDEX_SYMBOL];
  let priceWhere = `symbol = $1 AND log_return IS NOT NULL`;
  if (FROM) { priceParams.push(FROM); priceWhere += ` AND trade_date >= $${priceParams.length}`; }
  if (TO) { priceParams.push(TO); priceWhere += ` AND trade_date <= $${priceParams.length}`; }
  const { rows: priceRows } = await pool.query(
    `SELECT to_char(trade_date,'YYYY-MM-DD') AS trade_date, log_return
       FROM research_prices WHERE ${priceWhere} ORDER BY trade_date ASC`, priceParams);

  if (priceRows.length === 0) {
    console.error(`\nERROR: research_prices has no ${INDEX_SYMBOL} rows. Run backfill-research-prices.mjs first.`);
    await pool.end();
    process.exit(1);
  }

  // Flows: one net per day (PK already dedups segment/type)
  const flowParams = [INVESTOR, SEGMENT];
  let flowWhere = `investor_type = $1 AND segment = $2`;
  if (FROM) { flowParams.push(FROM); flowWhere += ` AND flow_date >= $${flowParams.length}`; }
  if (TO) { flowParams.push(TO); flowWhere += ` AND flow_date <= $${flowParams.length}`; }
  const { rows: flowRows } = await pool.query(
    `SELECT to_char(flow_date,'YYYY-MM-DD') AS flow_date, net
       FROM india_institutional_flows WHERE ${flowWhere} ORDER BY flow_date ASC`, flowParams);

  await pool.end();

  if (flowRows.length === 0) {
    console.error(`\nERROR: no ${INVESTOR}/${SEGMENT} rows in india_institutional_flows for this window.`);
    process.exit(1);
  }

  const fwd = makeForwardReturn(priceRows);
  const retByDate = new Map(priceRows.map((r) => [r.trade_date, r.log_return]));

  // Pair each flow with its FORWARD return (the predictive test) and same-day
  // return (the reverse / coincidence check).
  const flowVals = [];      // x: FII net (₹ cr)
  const fwdRet = [];        // y: forward return T+1..T+H
  const flowForReverse = []; // x: flow on day with a same-day return
  const sameDayRet = [];     // y: same-day return (reverse-direction diagnostic)
  for (const f of flowRows) {
    const net = Number(f.net);
    if (!Number.isFinite(net)) continue;
    const fr = fwd(f.flow_date, HORIZON);
    if (fr != null) { flowVals.push(net); fwdRet.push(fr); }
    const sd = retByDate.get(f.flow_date);
    if (sd != null) { flowForReverse.push(net); sameDayRet.push(sd); }
  }

  if (flowVals.length < 30) {
    console.error(`\nERROR: only ${flowVals.length} aligned observations — too few to test. Backfill more price/flow history.`);
    process.exit(1);
  }

  // ── Full-sample predictive regression ──
  console.log(`\n— Predictive (flow_T → return_T+1..T+${HORIZON}) — the hypothesis —`);
  const full = ols(flowVals, fwdRet);
  report('full sample', full);
  const hr = hitRate(flowVals, fwdRet);
  console.log(`    directional hit-rate: ${(hr.rate * 100).toFixed(1)}% (sign of flow matches sign of forward return, n=${hr.used}; 50% = coin flip)`);

  // ── Out-of-sample split ──
  const cut = Math.floor(flowVals.length * SPLIT);
  const inX = flowVals.slice(0, cut), inY = fwdRet.slice(0, cut);
  const outX = flowVals.slice(cut), outY = fwdRet.slice(cut);
  console.log(`\n— Out-of-sample check (does it survive on unseen later dates?) —`);
  report(`in-sample  (first ${(SPLIT * 100).toFixed(0)}%)`, ols(inX, inY));
  report(`out-sample (last ${((1 - SPLIT) * 100).toFixed(0)}%)`, ols(outX, outY));
  const inHR = hitRate(inX, inY), outHR = hitRate(outX, outY);
  console.log(`    hit-rate  in: ${(inHR.rate * 100).toFixed(1)}%   out: ${(outHR.rate * 100).toFixed(1)}%`);

  // ── Reverse / coincidence diagnostic ──
  console.log(`\n— Reverse check (same-day return vs flow) — is FII LEADING or just REACTING? —`);
  const reverse = ols(flowForReverse, sameDayRet);
  report('contemporaneous (flow_T vs return_T)', reverse);
  console.log('    If |corr| here ≫ the predictive corr above, FII flow is a coincident/reacting');
  console.log('    indicator, not a leading one — it confirms moves rather than predicting them.');

  // ── Verdict hint ──
  console.log('\n— Verdict hint (you decide, then log it) —');
  const survives = Math.sign(ols(inX, inY).slope) === Math.sign(ols(outX, outY).slope) && full.p < 0.05;
  if (survives) {
    console.log('  🟡/✅  Predictive slope is significant AND keeps its sign out-of-sample. Promising.');
    console.log('         Confirm it is not just the reverse/coincident effect before believing it.');
  } else if (full.p < 0.05) {
    console.log('  🟡  Significant in full sample but sign flips or weakens out-of-sample → likely overfit. Treat as in-sample-only.');
  } else {
    console.log('  ❌  No significant predictive relationship at this horizon. A real, useful result — log it so you do not retry it blindly.');
  }
  console.log('\n  → Append a row to the Hypothesis Register in sachnetra_research_playbook.md');
  console.log('    (hypothesis, n, full-sample p, out-of-sample verdict). Log it even if it failed.');
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Experiment failed:', err.message);
  process.exit(1);
});
