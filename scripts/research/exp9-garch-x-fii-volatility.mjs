#!/usr/bin/env node
//
// Experiment 9 — GARCH-X (validated-estimator re-run): does |FII flow| add forecast
//   power OVER a plain GARCH(1,1)?
// See: ai_docs/sachnetra v2/wiki/syntheses/sachnetra_research_playbook.md
//      ai_docs/sachnetra v2/wiki/experiments/Exp9.md
//   This RE-RUNS the GARCH-X question from Exp 7 (ai_docs/.../Exp7.md), which found
//   ❌ NULL but whose self-test could not identify gamma (its simulated regressor was a
//   smooth AR(1), collinear with omega). This estimator's self-test uses a SPIKY (iid)
//   regressor and cleanly recovers gamma (LR p≈6e-4), so a null here is the estimator's
//   verdict, not an artifact. Goal: confirm (or overturn) Exp 7's null on a validated fit.
//
// HYPOTHESIS (falsifiable, with direction + horizon):
//   "H9: |FII net flow| on day T carries INCREMENTAL information about next-day
//    ^NSEI volatility OVER AND ABOVE what a plain GARCH(1,1) already captures via
//    volatility persistence — i.e. the exogenous regressor |flow_{T-1}| in the
//    GARCH variance equation has a SIGNIFICANT, POSITIVE coefficient (gamma > 0)."
//
// WHY THIS, AFTER EXP 6:
//   Exp 6 regressed |return_T+1| on |flow_T| with OLS and found a real, OOS-robust
//   next-day VOLATILITY signal (outflow asymmetry +24%, p<0.001). But OLS on |r|
//   ignores that volatility CLUSTERS: yesterday's vol predicts today's. So Exp 6
//   could not say whether |flow| adds anything BEYOND that persistence — maybe big
//   flows just happen on already-turbulent days (the same-day coincidence Exp 6
//   also found). GARCH(1,1) models the persistence explicitly (alpha*eps^2 + beta*sigma^2);
//   GARCH-X adds gamma*|flow|. If gamma is significant after the GARCH terms soak up
//   persistence, |flow| has genuine INCREMENTAL forecast value. This is the
//   "Exp 6b — fit a GARCH-X" follow-up named in Exp6 section 9.
//
// NO LOOK-AHEAD:
//   FII net for day T is published only AFTER T's close, so it can inform the
//   variance of T+1, never T. The regressor entering sigma^2_t is |flow_{t-1}|
//   (previous trading day's flow). The same-day term is never used.
//
// MODEL (returns in PERCENT, r% = 100*log_return, so the variance is O(1) and the
//   optimiser is well-conditioned — standard practice, cf. rugarch/arch):
//   mean:      r_t = mu + eps_t
//   GARCH:     sigma^2_t = omega + alpha*eps^2_{t-1} + beta*sigma^2_{t-1}
//   GARCH-X:   sigma^2_t = omega + alpha*eps^2_{t-1} + beta*sigma^2_{t-1} + gamma*x_{t-1}
//              where x = |FII net| scaled to mean 1 (so gamma is in variance units).
//   Gaussian quasi-MLE. Fit by Nelder-Mead (no deps). Constraints via reparam:
//     omega = exp(.) > 0 ; alpha = sig(.)*0.999 ; beta = sig(.)*(0.999-alpha)
//     => alpha,beta >= 0 and alpha+beta < 0.999 (stationary). gamma free; sigma^2 floored.
//
// INFERENCE (two complementary lenses):
//   (1) Likelihood-ratio test of the nested models: LR = 2*(logL_X - logL_base) ~ chi^2(1).
//       This is the clean test for "does adding gamma improve fit?" — the headline.
//   (2) gamma's own t-stat from the numerical curvature (Hessian) of the NLL at the MLE.
//   (3) OUT-OF-SAMPLE: fit both on the first SPLIT of dates, then roll the variance
//       recursion through the held-out tail and compare PREDICTIVE negative log-lik
//       (a proper scoring rule) + realized-variance RMSE. A within-sample LR win that
//       vanishes out-of-sample is overfitting (the program's cardinal sin).
//
// BOUNDARY: read-only. SELECTs from research_prices + india_institutional_flows.
//   Writes nothing. Claude authors; Lijo runs. (--selftest needs no DB.)
// PREREQUISITE: research_prices populated (backfill-research-prices.mjs).
//
// USAGE
//   node scripts/research/exp9-garch-x-fii-volatility.mjs
//   node scripts/research/exp9-garch-x-fii-volatility.mjs --split=0.7
//   node scripts/research/exp9-garch-x-fii-volatility.mjs --signed=outflow   # x = outflow magnitude only (|net| on net<0 days, else 0)
//   node scripts/research/exp9-garch-x-fii-volatility.mjs --from=2012-01-01
//   node scripts/research/exp9-garch-x-fii-volatility.mjs --selftest          # verify the estimator on simulated data (NO DB)

import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const has = (n) => args.includes(`--${n}`);
const INVESTOR = flag('investor', 'FII');
const SEGMENT = flag('segment', 'cash');
const INDEX_SYMBOL = flag('index', '^NSEI');
const SIGNED = flag('signed', 'abs');   // 'abs' = |net| ; 'outflow' = |net| on net<0 days else 0
const FROM = flag('from', null);
const TO = flag('to', null);
const SPLIT = Number(flag('split', '0.7'));
const RESTARTS = Math.max(1, Number(flag('restarts', '8')));

// ── small stats (no deps) ────────────────────────────────────────────────────
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const variance = (a) => { const m = mean(a); return a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1); };
const median = (a) => { const b = [...a].sort((x, y) => x - y); const k = b.length >> 1; return b.length % 2 ? b[k] : (b[k - 1] + b[k]) / 2; };
function erf(x) { const s = x < 0 ? -1 : 1; x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * x); return s * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)); }
const twoSidedP = (t) => 2 * (1 - 0.5 * (1 + erf(Math.abs(t) / Math.SQRT2)));   // |Z| tail
const chi2P1 = (lr) => (lr <= 0 ? 1 : twoSidedP(Math.sqrt(lr)));                // P(chi^2_1 > lr)
const stars = (p) => (p < 0.01 ? '***' : p < 0.05 ? '**' : p < 0.1 ? '*' : '');

// ── Nelder-Mead simplex (derivative-free, no deps) ────────────────────────────
function nelderMead(f, x0, { maxIter = 4000, tol = 1e-9 } = {}) {
  const n = x0.length;
  let simplex = [x0.slice()];
  for (let i = 0; i < n; i++) { const p = x0.slice(); p[i] += (p[i] !== 0 ? 0.08 * p[i] : 0.08); simplex.push(p); }
  let fv = simplex.map(f);
  const order = () => { const idx = [...Array(n + 1).keys()].sort((a, b) => fv[a] - fv[b]); simplex = idx.map((i) => simplex[i]); fv = idx.map((i) => fv[i]); };
  const A = 1, G = 2, R = 0.5, S = 0.5;
  for (let it = 0; it < maxIter; it++) {
    order();
    if (Math.abs(fv[n] - fv[0]) < tol) break;
    const c = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c[j] += simplex[i][j];
    for (let j = 0; j < n; j++) c[j] /= n;
    const xr = c.map((cj, j) => cj + A * (cj - simplex[n][j])); const fr = f(xr);
    if (fr < fv[0]) {
      const xe = c.map((cj, j) => cj + G * (xr[j] - cj)); const fe = f(xe);
      if (fe < fr) { simplex[n] = xe; fv[n] = fe; } else { simplex[n] = xr; fv[n] = fr; }
    } else if (fr < fv[n - 1]) { simplex[n] = xr; fv[n] = fr; }
    else {
      const xc = c.map((cj, j) => cj + R * (simplex[n][j] - cj)); const fc = f(xc);
      if (fc < fv[n]) { simplex[n] = xc; fv[n] = fc; }
      else for (let i = 1; i <= n; i++) { simplex[i] = simplex[i].map((v, j) => simplex[0][j] + S * (v - simplex[0][j])); fv[i] = f(simplex[i]); }
    }
  }
  order();
  return { x: simplex[0], f: fv[0] };
}

// ── GARCH machinery ───────────────────────────────────────────────────────────
const sig = (z) => 1 / (1 + Math.exp(-z));
function decode(raw, useX) {
  const mu = raw[0];
  const omega = Math.exp(raw[1]);
  const alpha = sig(raw[2]) * 0.999;
  const beta = sig(raw[3]) * (0.999 - alpha);
  const gamma = useX ? raw[4] : 0;
  return { mu, omega, alpha, beta, gamma };
}
// full conditional-variance path; sigma^2 floored to stay positive (gamma can be any sign)
function sigmaPath(p, R, X, useX) {
  const T = R.length, s2 = new Array(T), eps = new Array(T);
  const v0 = variance(R);
  s2[0] = v0; eps[0] = R[0] - p.mu;
  for (let t = 1; t < T; t++) {
    let v = p.omega + p.alpha * eps[t - 1] * eps[t - 1] + p.beta * s2[t - 1];
    if (useX) v += p.gamma * X[t - 1];
    if (!(v > 1e-8)) v = 1e-8;
    s2[t] = v; eps[t] = R[t] - p.mu;
  }
  return { s2, eps };
}
const LOG2PI = Math.log(2 * Math.PI);
function nllWindow(p, R, X, useX, from, to) {
  const { s2, eps } = sigmaPath(p, R, X, useX);
  let nll = 0;
  for (let t = Math.max(1, from); t < to; t++) nll += 0.5 * (LOG2PI + Math.log(s2[t]) + (eps[t] * eps[t]) / s2[t]);
  return Number.isFinite(nll) ? nll : 1e12;
}
// Nelder-Mead collapses near a solution; restarting the simplex there re-expands it.
function optimize(obj, x0) {
  let best = nelderMead(obj, x0);
  for (let i = 0; i < 4; i++) { const r = nelderMead(obj, best.x); if (r.f < best.f - 1e-9) best = r; else { best = r.f < best.f ? r : best; break; } }
  return best;
}
// warm = the 4 base raw params (mu, log-omega, alpha-raw, beta-raw) to seed the GARCH-X fit
// at the plain-GARCH optimum with gamma=0, so logL_X can never be worse than logL_base.
function fit(R, X, useX, from, to, warm) {
  const x0base = [mean(R), Math.log(0.05 * variance(R) + 1e-6), -2.0, 1.5];
  const x0 = useX ? [...(warm || x0base), 0.0] : x0base;
  const obj = (raw) => nllWindow(decode(raw, useX), R, X, useX, from, to);
  let best = optimize(obj, x0);
  for (let r = 1; r < RESTARTS; r++) {
    const start = x0.map((v) => v + (Math.random() - 0.5) * 0.8 * (Math.abs(v) || 1));
    const res = optimize(obj, start);
    if (res.f < best.f) best = res;
  }
  return { p: decode(best.x, useX), nll: best.f, logL: -best.f, k: useX ? 5 : 4, raw: best.x };
}
// numerical t-stat for gamma: curvature of NLL wrt gamma at the MLE (other params held)
function gammaTStat(p, R, X, from, to) {
  const at = (g) => nllWindow({ ...p, gamma: g }, R, X, true, from, to);
  const h = 1e-3 * (Math.abs(p.gamma) || 1);
  const d2 = (at(p.gamma + h) - 2 * at(p.gamma) + at(p.gamma - h)) / (h * h);   // d^2 NLL / dgamma^2 = info
  const se = d2 > 0 ? 1 / Math.sqrt(d2) : NaN;
  return { se, t: se ? p.gamma / se : NaN };
}

function reportFit(label, f, useX) {
  const { p } = f;
  console.log(`  ${label}`);
  console.log(`    mu=${p.mu.toFixed(4)}  omega=${p.omega.toFixed(4)}  alpha=${p.alpha.toFixed(4)}  beta=${p.beta.toFixed(4)}` +
    (useX ? `  gamma=${p.gamma.toFixed(4)}` : '') + `   persistence(a+b)=${(p.alpha + p.beta).toFixed(4)}`);
  console.log(`    logL=${f.logL.toFixed(2)}  AIC=${(2 * f.k - 2 * f.logL).toFixed(2)}  BIC est below`);
}

// ── self-test (no DB): simulate a GARCH-X, confirm we recover gamma>0 + LR fires ──
function selftest() {
  console.log('=== Exp 9 SELF-TEST — simulate GARCH-X, check estimator recovery (no DB) ===');
  const T = 5000, mu = 0.02, omega = 0.05, alpha = 0.08, beta = 0.85, gammaTrue = 0.15;
  // x = |flow| proxy: positive, NOT persistent (iid) so its effect can't be re-absorbed
  // by the GARCH beta term — makes gamma cleanly identifiable for the recovery check.
  const X = new Array(T);
  for (let t = 0; t < T; t++) X[t] = Math.abs(gauss());
  const xm = mean(X); for (let t = 0; t < T; t++) X[t] /= xm;
  const R = new Array(T); let s2 = omega / (1 - alpha - beta), eps = 0;
  for (let t = 0; t < T; t++) {
    s2 = omega + alpha * eps * eps + beta * s2 + (t > 0 ? gammaTrue * X[t - 1] : 0);
    eps = Math.sqrt(s2) * gauss(); R[t] = mu + eps;
  }
  const base = fit(R, X, false, 1, T), gx = fit(R, X, true, 1, T, base.raw);
  reportFit(`GARCH(1,1)  [true: a=${alpha} b=${beta}]`, base, false);
  reportFit(`GARCH-X     [true: a=${alpha} b=${beta} gamma=${gammaTrue}]`, gx, true);
  const LR = 2 * (gx.logL - base.logL), p = chi2P1(LR);
  const gt = gammaTStat(gx.p, R, X, 1, T);
  console.log(`  LR = ${LR.toFixed(2)}  p(chi^2_1) = ${p.toExponential(2)} ${stars(p)}   gamma t≈${gt.t.toFixed(2)}`);
  const ok = gx.p.gamma > 0.10 && LR > 10;
  console.log(ok ? '  ✅ estimator recovers a positive, significant gamma — machinery validated.'
                 : '  ⚠️  recovery weak — inspect optimiser settings before trusting the real run.');
}
let _g2 = null;
function gauss() { if (_g2 !== null) { const v = _g2; _g2 = null; return v; }
  let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random();
  const r = Math.sqrt(-2 * Math.log(u)), th = 2 * Math.PI * v; _g2 = r * Math.sin(th); return r * Math.cos(th); }

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (has('selftest')) { selftest(); return; }
  loadEnvFile(import.meta.url);

  console.log('=== Experiment 9 — GARCH-X (validated re-run of Exp 7): does |FII flow| beat a plain GARCH(1,1)? ===');
  console.log(`  Investor: ${INVESTOR}  Segment: ${SEGMENT}  Index: ${INDEX_SYMBOL}  Exog: ${SIGNED === 'outflow' ? '|net| on OUTFLOW days only' : '|net| (all days)'}`);
  console.log(`  Returns in PERCENT (100*log_return). No look-ahead: sigma^2_t uses |flow_{t-1}|.`);
  console.log(`  Window: ${FROM || 'start'} → ${TO || 'today'}   OOS split: ${(SPLIT * 100).toFixed(0)}%   restarts: ${RESTARTS}`);

  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(1); }
  const { Pool } = pg;
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  const pParams = [INDEX_SYMBOL]; let pWhere = `symbol = $1 AND log_return IS NOT NULL`;
  if (FROM) { pParams.push(FROM); pWhere += ` AND trade_date >= $${pParams.length}`; }
  if (TO) { pParams.push(TO); pWhere += ` AND trade_date <= $${pParams.length}`; }
  const { rows: priceRows } = await pool.query(
    `SELECT to_char(trade_date,'YYYY-MM-DD') AS d, log_return FROM research_prices WHERE ${pWhere} ORDER BY trade_date ASC`, pParams);
  if (!priceRows.length) { console.error(`ERROR: no ${INDEX_SYMBOL} in research_prices. Run Exp 0 first.`); await pool.end(); process.exit(1); }

  const fParams = [INVESTOR, SEGMENT]; let fWhere = `investor_type = $1 AND segment = $2`;
  if (FROM) { fParams.push(FROM); fWhere += ` AND flow_date >= $${fParams.length}`; }
  if (TO) { fParams.push(TO); fWhere += ` AND flow_date <= $${fParams.length}`; }
  const { rows: flowRows } = await pool.query(
    `SELECT to_char(flow_date,'YYYY-MM-DD') AS d, net FROM india_institutional_flows WHERE ${fWhere} ORDER BY flow_date ASC`, fParams);
  await pool.end();
  if (!flowRows.length) { console.error(`ERROR: no ${INVESTOR}/${SEGMENT} flow rows.`); process.exit(1); }

  // align flow magnitude to the price-date grid (X[i] = exog known at close of price date i)
  const flowByDate = new Map();
  for (const r of flowRows) { const net = Number(r.net); if (Number.isFinite(net)) flowByDate.set(r.d, SIGNED === 'outflow' ? (net < 0 ? Math.abs(net) : 0) : Math.abs(net)); }
  const R = priceRows.map((r) => Number(r.log_return) * 100);   // percent returns
  const Xraw = priceRows.map((r) => (flowByDate.has(r.d) ? flowByDate.get(r.d) : null));
  const present = Xraw.filter((v) => v != null);
  const fillVal = median(present);
  const Xfilled = Xraw.map((v) => (v == null ? fillVal : v));
  const xm = mean(Xfilled);                     // scale to mean 1 → gamma in variance (percent^2) units
  const X = Xfilled.map((v) => v / xm);
  const cov = present.length, T = R.length;
  console.log(`  Aligned: ${T} return days; flow present on ${cov} (${(100 * cov / T).toFixed(1)}%), ${T - cov} filled with median.`);
  if (T < 250) { console.error(`ERROR: only ${T} days — too few for GARCH.`); process.exit(1); }

  // ── Full-sample fit: GARCH vs GARCH-X + LR test ──
  console.log(`\n— Full-sample maximum-likelihood fit —`);
  const base = fit(R, X, false, 1, T), gx = fit(R, X, true, 1, T, base.raw);
  reportFit('GARCH(1,1)', base, false);
  reportFit('GARCH-X (+ gamma*|flow|)', gx, true);
  const LR = 2 * (gx.logL - base.logL), lrP = chi2P1(LR);
  const gt = gammaTStat(gx.p, R, X, 1, T);
  const bicBase = base.k * Math.log(T - 1) - 2 * base.logL, bicX = gx.k * Math.log(T - 1) - 2 * gx.logL;
  console.log(`\n  Likelihood-ratio test (does gamma improve fit?):`);
  console.log(`    LR = 2*(logL_X - logL_base) = ${LR.toFixed(2)}   p(chi^2_1) = ${lrP.toExponential(2)} ${stars(lrP)}`);
  console.log(`    gamma = ${gx.p.gamma.toFixed(4)}   numerical t = ${Number.isFinite(gt.t) ? gt.t.toFixed(2) : 'n/a'} ${Number.isFinite(gt.t) ? stars(twoSidedP(gt.t)) : ''}`);
  console.log(`    BIC: base ${bicBase.toFixed(2)}  vs  GARCH-X ${bicX.toFixed(2)}   (lower wins; BIC penalises the extra param)`);

  // ── Out-of-sample: fit on first SPLIT, score predictive NLL on the held-out tail ──
  const cut = Math.floor(T * SPLIT);
  console.log(`\n— Out-of-sample (fit on first ${(SPLIT * 100).toFixed(0)}% = ${cut} days, score the last ${T - cut}) —`);
  const baseIn = fit(R, X, false, 1, cut), gxIn = fit(R, X, true, 1, cut, baseIn.raw);
  const nllBaseOOS = nllWindow(baseIn.p, R, X, false, cut, T);
  const nllXOOS = nllWindow(gxIn.p, R, X, true, cut, T);
  const nOOS = T - cut;
  // realized-variance RMSE on the OOS tail (forecast sigma^2_t vs realized r_t^2)
  const sBase = sigmaPath(baseIn.p, R, X, false).s2, sX = sigmaPath(gxIn.p, R, X, true).s2;
  let rmseBase = 0, rmseX = 0;
  for (let t = cut; t < T; t++) { rmseBase += (sBase[t] - R[t] * R[t]) ** 2; rmseX += (sX[t] - R[t] * R[t]) ** 2; }
  rmseBase = Math.sqrt(rmseBase / nOOS); rmseX = Math.sqrt(rmseX / nOOS);
  console.log(`  predictive NLL (lower=better):  GARCH ${nllBaseOOS.toFixed(2)}   GARCH-X ${nllXOOS.toFixed(2)}   Δ(base−X)=${(nllBaseOOS - nllXOOS).toFixed(2)} (+ = X better)`);
  console.log(`  per-day NLL:                    GARCH ${(nllBaseOOS / nOOS).toFixed(4)}  GARCH-X ${(nllXOOS / nOOS).toFixed(4)}`);
  console.log(`  realized-var RMSE (lower=better): GARCH ${rmseBase.toFixed(3)}   GARCH-X ${rmseX.toFixed(3)}`);
  console.log(`  OOS gamma (re-fit in-sample): ${gxIn.p.gamma.toFixed(4)}`);

  // ── Verdict hint ──
  console.log('\n— Verdict hint (you decide, then log it) —');
  const inWins = LR > 3.84 && gx.p.gamma > 0;            // chi^2_1 0.05 crit = 3.84
  const oosWins = (nllBaseOOS - nllXOOS) > 0 && gxIn.p.gamma > 0;
  if (inWins && oosWins) {
    console.log('  🟡/✅  gamma>0, LR-significant, AND GARCH-X wins out-of-sample → |FII flow| adds');
    console.log('          INCREMENTAL volatility-forecast power beyond GARCH persistence. The proper');
    console.log('          confirmation of Exp 6 — the signal is not just the same-day coincidence.');
  } else if (inWins && !oosWins) {
    console.log('  🟡  In-sample LR fires but GARCH-X does NOT beat plain GARCH out-of-sample → the');
    console.log('       extra param overfits; |flow| adds little once persistence is modelled. Honest null-ish.');
  } else {
    console.log('  ❌  gamma not significant / wrong sign → once GARCH soaks up persistence, |flow| adds');
    console.log('       nothing. Exp 6\'s OLS signal was largely the volatility-clustering it could not control for.');
  }
  console.log('  Check persistence(a+b): near 1.0 = highly persistent vol (expected for an equity index).');
  console.log('\n  → Append a row to the Hypothesis Register in sachnetra_research_playbook.md (H9).');
  console.log('\nDone.');
}

main().catch((e) => { console.error('Experiment failed:', e.message); process.exit(1); });
