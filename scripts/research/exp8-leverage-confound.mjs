#!/usr/bin/env node
//
// Experiment 8 — Is Exp 6's FII-outflow volatility asymmetry just the LEVERAGE EFFECT?
// See: ai_docs/sachnetra v2/wiki/syntheses/sachnetra_research_playbook.md
//      ai_docs/sachnetra v2/wiki/experiments/Exp8.md
//
// HYPOTHESES (falsifiable, written before looking):
//   H8a (leverage effect):  a NEGATIVE ^NSEI return on day T precedes HIGHER
//        volatility on T+1 than a positive return of the same size — the classic
//        equity "leverage effect" (down moves raise next-day vol).
//   H8b (the confound — the real point):  Exp 6 found FII-OUTFLOW days precede
//        ~+24% higher next-day volatility than inflow days (t=6.6, p<0.001). But
//        outflow days are DISPROPORTIONATELY DOWN days. So that headline may be the
//        leverage effect wearing an FII costume. AFTER controlling for the sign &
//        size of day T's OWN return, does the FII-outflow effect retain INDEPENDENT
//        predictive content (its coefficient stays positive & significant), or does
//        it collapse (it was leverage all along)?
//
// WHY THIS, AFTER EXP 6:
//   Exp 6's outflow asymmetry is the program's most economically meaningful result.
//   Before it informs a risk product it must survive the most obvious confound: the
//   market's own leverage effect. If P(down | outflow) >> P(down | inflow) and the
//   market mechanically gets more volatile after down days, an outflow→vol contrast
//   that ignores own returns is partly (or wholly) double-counting that. This is a
//   robustness/falsification test of Exp 6, not a new signal hunt.
//
// NO LOOK-AHEAD (same discipline as Exp 1/6):
//   Both the FII net for day T and ^NSEI's return on T are known only AFTER T's
//   close, so both legitimately inform the volatility of T+1, never T. The
//   same-day terms are reported only as coincidence diagnostics.
//
// VOLATILITY PROXY: |log_return| (default), or squared return r^2 via --target=sq.
//   Own-return controls entering the regression:
//     |r_T|     = own-move size      → soaks up volatility persistence/coincidence
//     dn_T      = max(-r_T, 0)       → DOWNSIDE magnitude = the leverage channel
//   Flow signal: outflow dummy (net_T < 0), the exact variable Exp 6's asymmetry used.
//
// THE TWO NESTED MODELS (the heart of the test):
//   Model A  (Exp 6 reproduction):  vol_{T+1} = a + b·outflow_T
//   Model B  (+ own-return control): vol_{T+1} = a + b·outflow_T + c1·|r_T| + c2·dn_T
//   Compare b and its t-stat A→B. b collapsing ⇒ leverage confound; b surviving ⇒
//   FII outflow carries volatility info beyond the market's own move.
//   Plus a STRATIFIED view: outflow-vs-inflow next-day vol WITHIN down-only and
//   WITHIN up-only days (the model-free version of the same control).
//
// VALIDATION: 70/30 chronological split on Model B (b must survive out-of-sample).
//
// BOUNDARY: read-only. SELECTs from research_prices + india_institutional_flows.
//   Writes nothing. Claude authors; Lijo runs. (--selftest needs no DB.)
// PREREQUISITE: research_prices populated (backfill-research-prices.mjs).
//
// USAGE
//   node scripts/research/exp8-leverage-confound.mjs
//   node scripts/research/exp8-leverage-confound.mjs --target=sq      # squared-return vol proxy
//   node scripts/research/exp8-leverage-confound.mjs --horizon=5      # mean vol over T+1..T+5
//   node scripts/research/exp8-leverage-confound.mjs --from=2012-01-01 --split=0.7
//   node scripts/research/exp8-leverage-confound.mjs --selftest       # validate the estimator (NO DB)

import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const has = (n) => args.includes(`--${n}`);
const HORIZON = Math.max(1, Number(flag('horizon', '1')));
const INVESTOR = flag('investor', 'FII');
const SEGMENT = flag('segment', 'cash');
const INDEX_SYMBOL = flag('index', '^NSEI');
const TARGET = flag('target', 'abs');          // 'abs' (|r|) | 'sq' (r^2)
const FROM = flag('from', null);
const TO = flag('to', null);
const SPLIT = Number(flag('split', '0.7'));

// ── stats (no deps) ─────────────────────────────────────────────────────────
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
function erf(x) { const s = x < 0 ? -1 : 1; x = Math.abs(x);
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const t=1/(1+p*x); return s*(1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x)); }
const twoSidedP = (t) => 2 * (1 - 0.5 * (1 + erf(Math.abs(t) / Math.SQRT2)));
const stars = (p) => (p < 0.01 ? '***' : p < 0.05 ? '**' : p < 0.1 ? '*' : '');
const pctv = (x) => `${(x * 100).toFixed(3)}%`;

// simple OLS (one regressor) — for the leverage slope + coincidence diagnostics
function ols(xs, ys) {
  const n = xs.length, mx = mean(xs), my = mean(ys);
  let Sxx = 0, Sxy = 0, Syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; Sxx += dx * dx; Sxy += dx * dy; Syy += dy * dy; }
  const slope = Sxy / Sxx, intercept = my - slope * mx, r = Sxy / Math.sqrt(Sxx * Syy);
  const rss = Syy - slope * Sxy, seSlope = Math.sqrt((rss / (n - 2)) / Sxx), t = slope / seSlope;
  return { n, slope, intercept, r, r2: r * r, t, p: twoSidedP(t) };
}
// Welch two-sample t-test (unequal variances)
function welch(a, b) {
  const ma = mean(a), mb = mean(b), va = sd(a) ** 2, vb = sd(b) ** 2;
  const se = Math.sqrt(va / a.length + vb / b.length);
  const t = (ma - mb) / se;
  return { ma, mb, diff: ma - mb, t, p: twoSidedP(t), na: a.length, nb: b.length };
}

// ── multiple linear regression via normal equations (Gauss-Jordan inverse) ────
function invert(M) {
  const n = M.length;
  const A = M.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    if (Math.abs(A[piv][col]) < 1e-12) throw new Error('singular design matrix (collinear regressors)');
    [A[col], A[piv]] = [A[piv], A[col]];
    const d = A[col][col];
    for (let j = 0; j < 2 * n; j++) A[col][j] /= d;
    for (let r = 0; r < n; r++) { if (r === col) continue; const f = A[r][col]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[col][j]; }
  }
  return A.map((row) => row.slice(n));
}
// X = rows of regressors INCLUDING a leading 1 for the intercept. Returns betas, SEs, t, p, R².
function mlr(X, y) {
  const n = X.length, k = X[0].length;
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty = new Array(k).fill(0);
  for (let i = 0; i < n; i++) for (let a = 0; a < k; a++) { Xty[a] += X[i][a] * y[i]; for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b]; }
  const inv = invert(XtX);
  const beta = new Array(k).fill(0);
  for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) beta[a] += inv[a][b] * Xty[b];
  let rss = 0; for (let i = 0; i < n; i++) { let yh = 0; for (let a = 0; a < k; a++) yh += X[i][a] * beta[a]; rss += (y[i] - yh) ** 2; }
  const sigma2 = rss / (n - k);
  const se = beta.map((_, a) => Math.sqrt(sigma2 * inv[a][a]));
  const t = beta.map((b, a) => b / se[a]);
  const my = mean(y); let tss = 0; for (let i = 0; i < n; i++) tss += (y[i] - my) ** 2;
  return { n, k, beta, se, t, p: t.map(twoSidedP), r2: 1 - rss / tss };
}

// forward AVERAGE volatility proxy over the next H trading days strictly after a date
function makeForwardVol(priceRows, transform) {
  const dates = priceRows.map((r) => r.trade_date);
  const rets = priceRows.map((r) => r.log_return);
  const firstAfter = (target) => { let lo = 0, hi = dates.length; while (lo < hi) { const m = (lo + hi) >> 1; if (dates[m] > target) hi = m; else lo = m + 1; } return lo; };
  return (date, H) => {
    const start = firstAfter(date);
    if (start + H > dates.length) return null;
    let sum = 0;
    for (let i = start; i < start + H; i++) { if (rets[i] == null) return null; sum += transform(rets[i]); }
    return sum / H;
  };
}

// ── self-test (no DB): can the control distinguish a confound from a real signal? ──
function gauss() { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function selftest() {
  console.log('=== Exp 8 SELF-TEST — does the own-return control tell confound from signal? (no DB) ===');
  const N = 6000;
  // shared truth: next-day vol rises with own downside (leverage). vol = base + L*dn + (signal?)
  const base = 0.8, L = 1.5, indep = 0.4;
  const build = (flowIsConfound) => {
    const y = [], Xa = [], Xb = [];
    for (let i = 0; i < N; i++) {
      const r = gauss() * 1.0;                       // own return, %
      const dn = Math.max(-r, 0);                    // downside magnitude
      // outflow: if confound, outflow ≈ down day (tied to r); if not, independent coin flip
      const outflow = flowIsConfound ? (r < 0 ? 1 : 0) : (Math.random() < 0.5 ? 1 : 0);
      const extra = flowIsConfound ? 0 : indep * outflow;   // genuine independent flow effect
      const vol = base + L * dn + extra + Math.abs(gauss()) * 0.3;
      y.push(vol);
      Xa.push([1, outflow]);                          // Model A: outflow only
      Xb.push([1, outflow, Math.abs(r), dn]);         // Model B: + own-return controls
    }
    const A = mlr(Xa, y), B = mlr(Xb, y);
    return { A, B };
  };
  const conf = build(true), real = build(false);
  console.log(`  CONFOUND case (outflow IS just down-days, no independent effect):`);
  console.log(`    Model A outflow coef t = ${conf.A.t[1].toFixed(2)} ${stars(conf.A.p[1])}   (should look significant)`);
  console.log(`    Model B outflow coef t = ${conf.B.t[1].toFixed(2)} ${stars(conf.B.p[1])}   (should COLLAPSE toward 0)`);
  console.log(`  REAL case (outflow has an independent +${indep} vol effect):`);
  console.log(`    Model A outflow coef t = ${real.A.t[1].toFixed(2)} ${stars(real.A.p[1])}`);
  console.log(`    Model B outflow coef t = ${real.B.t[1].toFixed(2)} ${stars(real.B.p[1])}   (should STAY significant)`);
  const ok = Math.abs(conf.B.t[1]) < 3 && Math.abs(real.B.t[1]) > 4;
  console.log(ok ? '  ✅ control correctly kills the confound and preserves the real signal — machinery validated.'
                 : '  ⚠️  unexpected — inspect the regression before trusting the real run.');
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (has('selftest')) { selftest(); return; }
  loadEnvFile(import.meta.url);
  const transform = TARGET === 'sq' ? (r) => r * r : (r) => Math.abs(r);

  console.log('=== Experiment 8 — is the FII-outflow vol asymmetry just the LEVERAGE EFFECT? ===');
  console.log(`  Investor: ${INVESTOR}  Segment: ${SEGMENT}  Index: ${INDEX_SYMBOL}`);
  console.log(`  Vol proxy: ${TARGET === 'sq' ? 'squared return r²' : 'absolute return |r|'}, averaged over next ${HORIZON} day(s)`);
  console.log(`  NO look-ahead: flow_T & return_T (both known after close T) → vol of T+1..T+${HORIZON}.`);
  console.log(`  Window: ${FROM || 'start'} → ${TO || 'today'}   OOS split: ${(SPLIT * 100).toFixed(0)}%`);

  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(1); }
  const { Pool } = pg;
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  const pParams = [INDEX_SYMBOL]; let pWhere = `symbol = $1 AND log_return IS NOT NULL`;
  if (FROM) { pParams.push(FROM); pWhere += ` AND trade_date >= $${pParams.length}`; }
  if (TO) { pParams.push(TO); pWhere += ` AND trade_date <= $${pParams.length}`; }
  const { rows: priceRows } = await pool.query(
    `SELECT to_char(trade_date,'YYYY-MM-DD') AS trade_date, log_return
       FROM research_prices WHERE ${pWhere} ORDER BY trade_date ASC`, pParams);
  if (!priceRows.length) { console.error(`ERROR: no ${INDEX_SYMBOL} in research_prices. Run Exp 0 first.`); await pool.end(); process.exit(1); }

  const fParams = [INVESTOR, SEGMENT]; let fWhere = `investor_type = $1 AND segment = $2`;
  if (FROM) { fParams.push(FROM); fWhere += ` AND flow_date >= $${fParams.length}`; }
  if (TO) { fParams.push(TO); fWhere += ` AND flow_date <= $${fParams.length}`; }
  const { rows: flowRows } = await pool.query(
    `SELECT to_char(flow_date,'YYYY-MM-DD') AS flow_date, net
       FROM india_institutional_flows WHERE ${fWhere} ORDER BY flow_date ASC`, fParams);
  await pool.end();
  if (!flowRows.length) { console.error(`ERROR: no ${INVESTOR}/${SEGMENT} flow rows.`); process.exit(1); }

  const fwdVol = makeForwardVol(priceRows, transform);
  const retByDate = new Map(priceRows.map((r) => [r.trade_date, Number(r.log_return) * 100])); // signed return %, on day T

  // Aligned sample: for each flow day that is also a priced trading day with a forward window
  const rows = [];   // { outflow, absR, dn, fwd, isDown }
  for (const f of flowRows) {
    const net = Number(f.net);
    if (!Number.isFinite(net)) continue;
    const rT = retByDate.get(f.flow_date);            // own ^NSEI return on T (must be a trading day)
    if (rT == null) continue;
    const fv = fwdVol(f.flow_date, HORIZON);          // next-day(s) vol
    if (fv == null) continue;
    rows.push({ outflow: net < 0 ? 1 : 0, absR: Math.abs(rT), dn: Math.max(-rT, 0), fwd: fv, isDown: rT < 0, rT });
  }
  if (rows.length < 100) { console.error(`ERROR: only ${rows.length} aligned obs — too few.`); process.exit(1); }
  const n = rows.length;
  console.log(`  Aligned observations: ${n}`);

  // ── 0. Reproduce Exp 6's headline asymmetry (sanity anchor) ──
  console.log(`\n— [0] Exp 6 anchor: outflow vs inflow → next-day vol (model-free) —`);
  const outVol = rows.filter((r) => r.outflow).map((r) => r.fwd);
  const inVol = rows.filter((r) => !r.outflow).map((r) => r.fwd);
  const asym = welch(outVol, inVol);
  console.log(`  outflow days (net<0, n=${asym.na}): mean next-day vol = ${pctv(asym.ma)}`);
  console.log(`  inflow  days (net≥0, n=${asym.nb}): mean next-day vol = ${pctv(asym.mb)}`);
  console.log(`  difference = ${pctv(asym.diff)} (${(100 * asym.diff / asym.mb).toFixed(1)}% higher)  Welch t=${asym.t.toFixed(2)}, p≈${asym.p.toFixed(4)} ${stars(asym.p)}`);

  // ── 1. H8a — the leverage effect itself (own down-days → higher next-day vol) ──
  console.log(`\n— [1] H8a leverage effect: do DOWN days precede higher next-day vol than UP days? —`);
  const downVol = rows.filter((r) => r.isDown).map((r) => r.fwd);
  const upVol = rows.filter((r) => !r.isDown).map((r) => r.fwd);
  const lev = welch(downVol, upVol);
  console.log(`  down days (r_T<0, n=${lev.na}): mean next-day vol = ${pctv(lev.ma)}`);
  console.log(`  up   days (r_T≥0, n=${lev.nb}): mean next-day vol = ${pctv(lev.mb)}`);
  console.log(`  difference = ${pctv(lev.diff)}  Welch t=${lev.t.toFixed(2)}, p≈${lev.p.toFixed(4)} ${stars(lev.p)}`);
  const slopeReg = ols(rows.map((r) => r.rT), rows.map((r) => r.fwd));
  console.log(`  signed-return slope (vol_T+1 ~ r_T): ${slopeReg.slope.toExponential(2)}  t=${slopeReg.t.toFixed(2)} ${stars(slopeReg.p)}  (negative ⇒ leverage)`);

  // ── 2. The confound exists? — are outflow days disproportionately down days? ──
  console.log(`\n— [2] Confound mechanism: P(down day | outflow) vs P(down | inflow) —`);
  const outDownRate = rows.filter((r) => r.outflow && r.isDown).length / Math.max(1, rows.filter((r) => r.outflow).length);
  const inDownRate = rows.filter((r) => !r.outflow && r.isDown).length / Math.max(1, rows.filter((r) => !r.outflow).length);
  console.log(`  P(down | outflow) = ${(100 * outDownRate).toFixed(1)}%`);
  console.log(`  P(down | inflow)  = ${(100 * inDownRate).toFixed(1)}%`);
  console.log(`  ${outDownRate > inDownRate + 0.05 ? '⚠️  outflow days ARE disproportionately down days → confound is plausible; the control below settles it.' : 'outflow/down link is weak → leverage confound less likely to explain Exp 6.'}`);

  // ── 3. THE TEST — Model A (Exp 6 reproduction) vs Model B (+ own-return controls) ──
  console.log(`\n— [3] Nested regressions — does the outflow coefficient survive the own-return control? —`);
  const y = rows.map((r) => r.fwd);
  const Xa = rows.map((r) => [1, r.outflow]);
  const Xb = rows.map((r) => [1, r.outflow, r.absR, r.dn]);
  const A = mlr(Xa, y), B = mlr(Xb, y);
  console.log(`  Model A: vol_T+1 = a + b·outflow`);
  console.log(`    b(outflow) = ${A.beta[1].toExponential(2)}  t=${A.t[1].toFixed(2)} ${stars(A.p[1])}   R²=${A.r2.toFixed(4)}`);
  console.log(`  Model B: vol_T+1 = a + b·outflow + c1·|r_T| + c2·downside(r_T)`);
  console.log(`    b(outflow)   = ${B.beta[1].toExponential(2)}  t=${B.t[1].toFixed(2)} ${stars(B.p[1])}`);
  console.log(`    c1(|r_T|)    = ${B.beta[2].toExponential(2)}  t=${B.t[2].toFixed(2)} ${stars(B.p[2])}   (own-move persistence)`);
  console.log(`    c2(downside) = ${B.beta[3].toExponential(2)}  t=${B.t[3].toFixed(2)} ${stars(B.p[3])}   (leverage channel)`);
  console.log(`    R²=${B.r2.toFixed(4)}`);
  const shrink = A.beta[1] !== 0 ? (1 - B.beta[1] / A.beta[1]) * 100 : NaN;
  console.log(`  → outflow coefficient shrinks ${Number.isFinite(shrink) ? shrink.toFixed(0) : 'n/a'}% when own-return controls are added; t ${A.t[1].toFixed(2)} → ${B.t[1].toFixed(2)}.`);

  // ── 4. Stratified (model-free) control: outflow vs inflow WITHIN each return-sign bucket ──
  console.log(`\n— [4] Stratified control: outflow vs inflow next-day vol, WITHIN down-only / up-only days —`);
  for (const [label, want] of [['DOWN days only', true], ['UP days only', false]]) {
    const o = rows.filter((r) => r.isDown === want && r.outflow).map((r) => r.fwd);
    const i = rows.filter((r) => r.isDown === want && !r.outflow).map((r) => r.fwd);
    if (o.length > 5 && i.length > 5) {
      const w = welch(o, i);
      console.log(`  ${label}: outflow ${pctv(w.ma)} (n=${w.na}) vs inflow ${pctv(w.mb)} (n=${w.nb})  diff ${pctv(w.diff)}  t=${w.t.toFixed(2)}, p≈${w.p.toFixed(4)} ${stars(w.p)}`);
    } else console.log(`  ${label}: too few (out=${o.length}, in=${i.length}).`);
  }

  // ── 5. Out-of-sample: does Model B's outflow coefficient survive the held-out tail? ──
  const cut = Math.floor(n * SPLIT);
  console.log(`\n— [5] Out-of-sample: re-fit Model B on first ${(SPLIT * 100).toFixed(0)}% (${cut}), check outflow coef on the rest —`);
  const Bin = mlr(Xb.slice(0, cut), y.slice(0, cut));
  const Bout = mlr(Xb.slice(cut), y.slice(cut));
  console.log(`  in-sample  b(outflow) = ${Bin.beta[1].toExponential(2)}  t=${Bin.t[1].toFixed(2)} ${stars(Bin.p[1])}`);
  console.log(`  out-sample b(outflow) = ${Bout.beta[1].toExponential(2)}  t=${Bout.t[1].toFixed(2)} ${stars(Bout.p[1])}`);

  // ── Verdict hint ──
  console.log('\n— Verdict hint (you decide, then log it) —');
  const survives = B.p[1] < 0.05 && B.beta[1] > 0 && Math.sign(Bin.beta[1]) === Math.sign(Bout.beta[1]);
  if (survives) {
    console.log('  🟡/✅  Outflow coefficient stays POSITIVE & significant after controlling for the own');
    console.log('         return (and holds out-of-sample) → Exp 6 is NOT merely the leverage effect; FII');
    console.log('         outflow carries volatility info beyond the market\'s own down-move. Exp 6 confirmed.');
  } else if (lev.p < 0.05 && (B.p[1] >= 0.05 || B.beta[1] <= 0)) {
    console.log('  ❌  Leverage effect is real, and the outflow effect COLLAPSES once own returns are');
    console.log('       controlled → Exp 6\'s +24% asymmetry was largely the leverage effect in disguise.');
    console.log('       Re-frame Exp 6: |flow| MAGNITUDE may still predict vol, but the OUTFLOW asymmetry');
    console.log('       is mostly down-day vol. Important correction — log it loudly.');
  } else {
    console.log('  🟡  Mixed: inspect the coefficient shrinkage in [3] and the stratified result in [4].');
  }
  console.log('  Reminder: a surviving but tiny coefficient is statistically real yet economically small (the Exp 1 lesson).');
  console.log('\n  → Append a row to the Hypothesis Register in sachnetra_research_playbook.md (H8 / H8a).');
  console.log('\nDone.');
}

main().catch((e) => { console.error('Experiment failed:', e.message); process.exit(1); });
