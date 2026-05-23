#!/usr/bin/env node
//
// Experiment 6 — Does FII flow predict VOLATILITY (not direction)?
// See: ai_docs/sachnetra v2/wiki/syntheses/sachnetra_research_playbook.md
//
// HYPOTHESIS (falsifiable, with direction + horizon):
//   "The MAGNITUDE of FII net flow on day T predicts the MAGNITUDE of the ^NSEI
//    move on the next trading day, |return_T+1| — i.e. big flows (in OR out)
//    precede turbulent days — even though SIGNED flow does NOT predict direction
//    (that was Exp 1's dead result)."
//   Plus an asymmetry check: do OUTFLOW days precede more next-day volatility
//    than inflow days? (the classic leverage / bad-news-clusters effect)
//
// WHY THIS, AFTER EXP 1:
//   Exp 1 tested sign(flow) → sign(return) and found nothing. That is the MEAN
//   (direction) question. This is the VARIANCE (volatility) question — a different
//   moment of the distribution. Volatility clusters (the premise behind GARCH);
//   FII flow magnitude is a plausible exogenous driver of those clusters. A hit
//   here would be a RISK / options signal, not a direction signal.
//
// NO LOOK-AHEAD (same discipline as Exp 1):
//   FII net for day T is known only AFTER T's close, so we predict |return| of the
//   NEXT trading day (T+1), never T itself. The same-day |return_T| regression is
//   reported only as a coincidence diagnostic.
//
// VOLATILITY PROXY: |log_return| (absolute next-day return). Robustness: squared
//   return r^2 (true variance proxy) via --target=sq. Both are standard 1-day
//   realized-vol proxies for a daily GARCH-style mean equation.
//
// VALIDATION: 70/30 chronological split. A relationship only in-sample is noise.
//
// BOUNDARY: read-only. SELECTs from india_institutional_flows + research_prices.
//   Writes nothing. Claude authors; Lijo runs.
// PREREQUISITE: research_prices populated (backfill-research-prices.mjs).
//
// USAGE
//   node scripts/research/exp6-fii-predicts-volatility.mjs
//   node scripts/research/exp6-fii-predicts-volatility.mjs --target=sq    # squared return
//   node scripts/research/exp6-fii-predicts-volatility.mjs --horizon=5    # mean |return| over T+1..T+5
//   node scripts/research/exp6-fii-predicts-volatility.mjs --investor=FII --segment=cash
//   node scripts/research/exp6-fii-predicts-volatility.mjs --from=2015-01-01 --split=0.7

import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const HORIZON = Math.max(1, Number(flag('horizon', '1')));   // forward trading days to average |return| over
const INVESTOR = flag('investor', 'FII');
const SEGMENT = flag('segment', 'cash');
const INDEX_SYMBOL = flag('index', '^NSEI');
const TARGET = flag('target', 'abs');                        // 'abs' (|r|) | 'sq' (r^2)
const FROM = flag('from', null);
const TO = flag('to', null);
const SPLIT = Number(flag('split', '0.7'));

// ── stats (no deps) ─────────────────────────────────────────────────────────
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
function ols(xs, ys) {
  const n = xs.length, mx = mean(xs), my = mean(ys);
  let Sxx = 0, Sxy = 0, Syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; Sxx += dx * dx; Sxy += dx * dy; Syy += dy * dy; }
  const slope = Sxy / Sxx, intercept = my - slope * mx, r = Sxy / Math.sqrt(Sxx * Syy);
  const rss = Syy - slope * Sxy, seSlope = Math.sqrt((rss / (n - 2)) / Sxx), t = slope / seSlope;
  return { n, slope, intercept, r, r2: r * r, t, p: twoSidedP(t) };
}
function twoSidedP(t) {
  const z = Math.abs(t);
  const erf = (x) => { const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
    const tt = 1/(1+p*x); return s*(1-(((((a5*tt+a4)*tt)+a3)*tt+a2)*tt+a1)*tt*Math.exp(-x*x)); };
  return 2 * (1 - 0.5 * (1 + erf(z / Math.SQRT2)));
}
// Welch two-sample t-test (unequal variances) — for the decile + asymmetry contrasts.
function welch(a, b) {
  const ma = mean(a), mb = mean(b), va = sd(a) ** 2, vb = sd(b) ** 2;
  const se = Math.sqrt(va / a.length + vb / b.length);
  const t = (ma - mb) / se;
  return { ma, mb, diff: ma - mb, t, p: twoSidedP(t), na: a.length, nb: b.length };
}
const stars = (p) => (p < 0.01 ? '***' : p < 0.05 ? '**' : p < 0.1 ? '*' : '');
const pctv = (x) => `${(x * 100).toFixed(3)}%`;

function report(label, reg) {
  console.log(`  ${label}`);
  console.log(`    n=${reg.n}  corr=${reg.r.toFixed(3)}  R²=${reg.r2.toFixed(4)}  slope=${reg.slope.toExponential(2)}  t=${reg.t.toFixed(2)}  p≈${reg.p.toFixed(4)} ${stars(reg.p)}`);
}

// forward AVERAGE volatility proxy over the next H trading days strictly after flowDate
function makeForwardVol(priceRows, transform) {
  const dates = priceRows.map((r) => r.trade_date);
  const rets = priceRows.map((r) => r.log_return);
  const firstAfter = (target) => { let lo = 0, hi = dates.length; while (lo < hi) { const m = (lo + hi) >> 1; if (dates[m] > target) hi = m; else lo = m + 1; } return lo; };
  return (flowDate, H) => {
    const start = firstAfter(flowDate);
    if (start + H > dates.length) return null;
    let sum = 0;
    for (let i = start; i < start + H; i++) { if (rets[i] == null) return null; sum += transform(rets[i]); }
    return sum / H;
  };
}

async function main() {
  const transform = TARGET === 'sq' ? (r) => r * r : (r) => Math.abs(r);
  console.log('=== Experiment 6 — does FII flow predict VOLATILITY (not direction)? ===');
  console.log(`  Investor: ${INVESTOR}  Segment: ${SEGMENT}  Index: ${INDEX_SYMBOL}`);
  console.log(`  Volatility proxy: ${TARGET === 'sq' ? 'squared return r²' : 'absolute return |r|'}, averaged over next ${HORIZON} day(s)`);
  console.log(`  X = |FII net| (magnitude). NO look-ahead: flow at close T → vol of T+1..T+${HORIZON}.`);
  console.log(`  Window: ${FROM || 'start'} → ${TO || 'today'}   In-sample split: ${(SPLIT * 100).toFixed(0)}%`);

  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  const priceParams = [INDEX_SYMBOL];
  let priceWhere = `symbol = $1 AND log_return IS NOT NULL`;
  if (FROM) { priceParams.push(FROM); priceWhere += ` AND trade_date >= $${priceParams.length}`; }
  if (TO) { priceParams.push(TO); priceWhere += ` AND trade_date <= $${priceParams.length}`; }
  const { rows: priceRows } = await pool.query(
    `SELECT to_char(trade_date,'YYYY-MM-DD') AS trade_date, log_return
       FROM research_prices WHERE ${priceWhere} ORDER BY trade_date ASC`, priceParams);
  if (!priceRows.length) { console.error(`ERROR: no ${INDEX_SYMBOL} in research_prices. Run Exp 0 first.`); await pool.end(); process.exit(1); }

  const flowParams = [INVESTOR, SEGMENT];
  let flowWhere = `investor_type = $1 AND segment = $2`;
  if (FROM) { flowParams.push(FROM); flowWhere += ` AND flow_date >= $${flowParams.length}`; }
  if (TO) { flowParams.push(TO); flowWhere += ` AND flow_date <= $${flowParams.length}`; }
  const { rows: flowRows } = await pool.query(
    `SELECT to_char(flow_date,'YYYY-MM-DD') AS flow_date, net
       FROM india_institutional_flows WHERE ${flowWhere} ORDER BY flow_date ASC`, flowParams);
  await pool.end();
  if (!flowRows.length) { console.error(`ERROR: no ${INVESTOR}/${SEGMENT} flow rows.`); process.exit(1); }

  const fwdVol = makeForwardVol(priceRows, transform);
  const volByDate = new Map(priceRows.map((r) => [r.trade_date, transform(r.log_return)]));

  // X = |net| magnitude; also keep signed net for the asymmetry split.
  const absFlow = [], fwd = [];          // predictive: |flow_T| → vol_T+1
  const signedFlow = [], fwdForSign = []; // for inflow/outflow asymmetry
  const absFlowSame = [], sameVol = [];   // coincidence: |flow_T| → vol_T
  for (const f of flowRows) {
    const net = Number(f.net);
    if (!Number.isFinite(net)) continue;
    const fv = fwdVol(f.flow_date, HORIZON);
    if (fv != null) { absFlow.push(Math.abs(net)); fwd.push(fv); signedFlow.push(net); fwdForSign.push(fv); }
    const sv = volByDate.get(f.flow_date);
    if (sv != null) { absFlowSame.push(Math.abs(net)); sameVol.push(sv); }
  }
  if (absFlow.length < 30) { console.error(`ERROR: only ${absFlow.length} aligned obs — too few.`); process.exit(1); }

  // ── Predictive regression: |flow_T| → next-day volatility ──
  console.log(`\n— Predictive (|FII net|_T → volatility_T+1..T+${HORIZON}) — the hypothesis —`);
  const full = ols(absFlow, fwd);
  report('full sample', full);

  // ── Out-of-sample split ──
  const cut = Math.floor(absFlow.length * SPLIT);
  console.log(`\n— Out-of-sample check —`);
  report(`in-sample  (first ${(SPLIT * 100).toFixed(0)}%)`, ols(absFlow.slice(0, cut), fwd.slice(0, cut)));
  report(`out-sample (last ${((1 - SPLIT) * 100).toFixed(0)}%)`, ols(absFlow.slice(cut), fwd.slice(cut)));

  // ── Decile contrast: top-decile |flow| days vs the rest, next-day vol ──
  console.log(`\n— Tail contrast: do the biggest-|flow| days precede higher volatility? —`);
  const idx = absFlow.map((_, i) => i).sort((a, b) => absFlow[a] - absFlow[b]);
  const d = Math.floor(absFlow.length / 10);
  const topIdx = idx.slice(-d), botIdx = idx.slice(0, absFlow.length - d);
  const topVol = topIdx.map((i) => fwd[i]), restVol = botIdx.map((i) => fwd[i]);
  const dec = welch(topVol, restVol);
  console.log(`  top-decile |flow| days (n=${dec.na}): mean next-day vol = ${pctv(dec.ma)}`);
  console.log(`  all other days        (n=${dec.nb}): mean next-day vol = ${pctv(dec.mb)}`);
  console.log(`  difference = ${pctv(dec.diff)}  (Welch t=${dec.t.toFixed(2)}, p≈${dec.p.toFixed(4)} ${stars(dec.p)})`);

  // ── Asymmetry: outflow vs inflow days, next-day vol ──
  console.log(`\n— Asymmetry: do OUTFLOW days precede more next-day volatility than INFLOW days? —`);
  const outVol = [], inVol = [];
  for (let i = 0; i < signedFlow.length; i++) (signedFlow[i] < 0 ? outVol : inVol).push(fwdForSign[i]);
  if (outVol.length > 5 && inVol.length > 5) {
    const asym = welch(outVol, inVol);
    console.log(`  outflow days (net<0, n=${asym.na}): mean next-day vol = ${pctv(asym.ma)}`);
    console.log(`  inflow  days (net≥0, n=${asym.nb}): mean next-day vol = ${pctv(asym.mb)}`);
    console.log(`  difference = ${pctv(asym.diff)}  (Welch t=${asym.t.toFixed(2)}, p≈${asym.p.toFixed(4)} ${stars(asym.p)})`);
  } else console.log(`  too few in one group (out=${outVol.length}, in=${inVol.length}).`);

  // ── Coincidence diagnostic: same-day ──
  console.log(`\n— Coincidence diagnostic (|flow_T| vs vol_T, same day) —`);
  report('contemporaneous', ols(absFlowSame, sameVol));

  // ── Verdict hint ──
  console.log('\n— Verdict hint (you decide, then log it) —');
  const inReg = ols(absFlow.slice(0, cut), fwd.slice(0, cut)), outReg = ols(absFlow.slice(cut), fwd.slice(cut));
  const survives = full.p < 0.05 && Math.sign(inReg.slope) === Math.sign(outReg.slope) && outReg.p < 0.10;
  if (survives && full.slope > 0) {
    console.log('  🟡/✅  |FII flow| predicts higher next-day volatility, and it survives out-of-sample.');
    console.log('         A VARIANCE signal where Exp 1 found no MEAN signal. Check R² for economic size.');
  } else if (full.p < 0.05) {
    console.log('  🟡  Significant full-sample but fragile out-of-sample → likely overfit. Treat as in-sample-only.');
  } else {
    console.log('  ❌  No predictive volatility relationship either. FII magnitude carries no next-day vol info.');
  }
  console.log('  Reminder: a significant slope with R²≈0 is statistically real but economically negligible (the Exp 1 lesson).');
  console.log('\n  → Append a row to the Hypothesis Register in sachnetra_research_playbook.md (H6).');
  console.log('\nDone.');
}

main().catch((e) => { console.error('Experiment failed:', e.message); process.exit(1); });
