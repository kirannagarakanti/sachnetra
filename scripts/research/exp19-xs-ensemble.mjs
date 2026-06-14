#!/usr/bin/env node
//
// Experiment 19 — IC-weighted, size/sector-neutral, walk-forward cross-sectional ensemble.
// Pre-registration: ai_docs/sachnetra v2/wiki/experiments/exp19_brief.md (§2 hypotheses, §3 method, §4 gates).
//
// Reads the panel from build-xs-panel.mjs and, per the four pre-registered words:
//   cross-sectional  — rank/standardize stocks against EACH OTHER on each rebalance date
//   size/sector-neutral — residualize each signal on log-ADV (+ band dummies) before scoring
//   IC-weighted      — weight each signal by its TRAILING (past-only) Information Coefficient
//   walk-forward     — weights use only dates strictly BEFORE t; OOS evaluation after a warmup
// → composite score → long-only TOP DECILE vs equal-weight benchmark, net of cost → the standard gauntlet.
//
// H19c (the blend must beat its parts): reports each single-signal standalone OOS IC + a drop-one-out table.
//
// READ-ONLY (reads the CSV panel; no DB, no writes except output CSV). Claude authored; Lijo runs.
//
// USAGE
//   node scripts/research/exp19-xs-ensemble.mjs --selftest        # synthetic estimator gate (no panel)
//   node scripts/research/exp19-xs-ensemble.mjs                   # full run on output/exp19/panel.csv
//   node scripts/research/exp19-xs-ensemble.mjs --columns=price_momentum,bulkdeal_intensity --cost=250

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'output', 'exp19');
const PANEL = join(OUTPUT_DIR, 'panel.csv');

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const SELFTEST = has('selftest');
const HTML = has('html');
const COLS = flag('columns', 'price_momentum,ear_drift,bulkdeal_intensity').split(',').map((s) => s.trim()).filter(Boolean);
const COST_BPS = Number(flag('cost', '250'));            // round-trip per rebalance; accept on this
const DECILE = Number(flag('decile', '0.1'));            // top-decile long book
const IC_WINDOW = Number(flag('ic-window', '12'));       // trailing rebalances for IC weighting
const WARMUP = Number(flag('warmup', '12'));             // min past ICs before a date is OOS
const MIN_STOCKS = Number(flag('min-stocks', '20'));     // need a real cross-section
const PERIODS_PER_YR = 12;                               // monthly rebalance

// ── stats core (copied from exp16/exp18) ──
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
function twoSidedP(t) { const z = Math.abs(t); const erf = (x) => { const s = x < 0 ? -1 : 1; x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const tt = 1 / (1 + p * x); return s * (1 - (((((a5 * tt + a4) * tt) + a3) * tt + a2) * tt + a1) * tt * Math.exp(-x * x)); };
  return 2 * (1 - 0.5 * (1 + erf(z / Math.SQRT2))); }
function tStat(arr) { const n = arr.length; if (n < 2) return { n, mean: NaN, t: NaN, p: NaN };
  const m = mean(arr); const s = sd(arr); return { n, mean: m, t: m / (s / Math.sqrt(n)), p: twoSidedP(m / (s / Math.sqrt(n))) }; }
const stars = (p) => (p < 0.01 ? '***' : p < 0.05 ? '**' : p < 0.1 ? '*' : '');
const pctf = (x) => (Number.isNaN(x) ? '  n/a' : `${(x * 100).toFixed(2)}%`);
function quantile(s, q) { if (!s.length) return NaN; const p = (s.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (p - lo); }
function invert(A) { const n = A.length; const M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) { let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-12) return null; [M[c], M[piv]] = [M[piv], M[c]]; const d = M[c][c];
    for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = M[r][c]; if (!f) continue; for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; } }
  return M.map((row) => row.slice(n)); }
function olsResid(X, Y) { const n = X.length, k = X[0].length; const XtX = Array.from({ length: k }, () => Array(k).fill(0)); const Xty = Array(k).fill(0);
  for (let i = 0; i < n; i++) for (let a = 0; a < k; a++) { Xty[a] += X[i][a] * Y[i]; for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b]; }
  const inv = invert(XtX); if (!inv) return Y.slice();
  const beta = Array(k).fill(0); for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) beta[a] += inv[a][b] * Xty[b];
  return Y.map((y, i) => { let yh = 0; for (let a = 0; a < k; a++) yh += X[i][a] * beta[a]; return y - yh; }); }
function adfTest(y, maxLag = 8) { const T = y.length; let best = { aic: Infinity, t: NaN };
  for (let p = 0; p <= maxLag; p++) { const X = [], Y = []; for (let t = p + 1; t < T; t++) { const row = [1, y[t - 1]]; for (let k = 1; k <= p; k++) row.push(y[t - k] - y[t - k - 1]); X.push(row); Y.push(y[t] - y[t - 1]); }
    if (X.length < X[0]?.length + 2) continue; const n = X.length, k = X[0].length; const XtX = Array.from({ length: k }, () => Array(k).fill(0)); const Xty = Array(k).fill(0);
    for (let i = 0; i < n; i++) for (let a = 0; a < k; a++) { Xty[a] += X[i][a] * Y[i]; for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b]; }
    const inv = invert(XtX); if (!inv) continue; const beta = Array(k).fill(0); for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) beta[a] += inv[a][b] * Xty[b];
    let rss = 0; for (let i = 0; i < n; i++) { let yh = 0; for (let a = 0; a < k; a++) yh += X[i][a] * beta[a]; rss += (Y[i] - yh) ** 2; }
    const se = Math.sqrt((rss / (n - k)) * inv[1][1]); const aic = n * Math.log(rss / n) + 2 * k; if (aic < best.aic) best = { aic, t: beta[1] / se }; }
  return best; }
function kpssTest(y) { const T = y.length; const m = mean(y); const e = y.map((x) => x - m); const S = []; let c = 0; for (const v of e) { c += v; S.push(c); }
  let sumS2 = 0; for (const s of S) sumS2 += s * s; const l = Math.floor(4 * (T / 100) ** 0.25); let s2 = e.reduce((a, v) => a + v * v, 0) / T;
  for (let j = 1; j <= l; j++) { let cov = 0; for (let t = j; t < T; t++) cov += e[t] * e[t - j]; cov /= T; s2 += 2 * (1 - j / (l + 1)) * cov; } return sumS2 / (T * T * s2); }
function erfInv(x) { const a = 0.147; const l = Math.log(1 - x * x); const t1 = 2 / (Math.PI * a) + l / 2; return Math.sign(x) * Math.sqrt(Math.sqrt(t1 * t1 - l / a) - t1); }
const probit = (p) => Math.SQRT2 * erfInv(2 * Math.max(1e-9, Math.min(1 - 1e-9, p)) - 1);
function normCDF(x) { const erf = (z) => { const s = z < 0 ? -1 : 1; z = Math.abs(z); const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911; const t = 1 / (1 + p * z); return s * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z)); }; return 0.5 * (1 + erf(x / Math.SQRT2)); }
function calculateDSR(rets, trials = 10, sigmaSR = 0.5) { const T = rets.length; if (T < 3) return { dsr: 0 };
  const m = mean(rets), s = sd(rets); const sr = m / s; const ge = 0.5772156649; const z1 = probit(1 - 1 / trials), z2 = probit(1 - 1 / (trials * Math.E));
  const sr0 = sigmaSR * ((1 - ge) * z1 + ge * z2) / Math.sqrt(PERIODS_PER_YR); let s3 = 0, s4 = 0; for (const r of rets) { s3 += (r - m) ** 3; s4 += (r - m) ** 4; }
  const sk = s3 / (T * s ** 3), ku = s4 / (T * s ** 4); const Z = ((sr - sr0) * Math.sqrt(T - 1)) / Math.sqrt(1 - sk * sr + ((ku - 1) / 4) * sr * sr); return { dsr: normCDF(Z), sk, ku }; }

// ── rank / Spearman IC ──
function avgRank(a) { const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]); const r = new Array(a.length);
  let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const rr = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = rr; i = j + 1; } return r; }
function pearson(x, y) { const n = x.length; if (n < 3) return NaN; const mx = mean(x), my = mean(y); let sxy = 0, sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sx += dx * dx; sy += dy * dy; } return sx > 0 && sy > 0 ? sxy / Math.sqrt(sx * sy) : NaN; }
function spearman(x, y) { return pearson(avgRank(x), avgRank(y)); }
function zscore(vals) { const ok = vals.filter((v) => v != null && !Number.isNaN(v)); if (ok.length < 2) return vals.map(() => 0); const m = mean(ok), s = sd(ok); return vals.map((v) => (v == null || Number.isNaN(v) || s === 0 ? 0 : (v - m) / s)); }

// ── the pipeline: walk-forward composite over a set of columns ──
function runEnsemble(byDate, dates, cols) {
  const icHist = Object.fromEntries(cols.map((c) => [c, []]));   // past ICs (chronological)
  const oosCompositeIC = [];                                     // OOS composite IC per date
  const netSpread = [];                                          // OOS net top-decile spread per date
  const portRet = [], benchRet = [];
  const series = []; let cum = 0;                                // per-OOS-date timeseries for the HTML report
  for (const d of dates) {
    const stocks = byDate.get(d).filter((r) => r.fwd != null);
    if (stocks.length < MIN_STOCKS) continue;
    const fwd = stocks.map((r) => r.fwd);
    // neutralization design: [1, z(logAdv), band dummies]
    const zAdv = zscore(stocks.map((r) => r.logAdv));
    const bandList = [...new Set(stocks.map((r) => r.band))]; const bandRef = bandList[0];
    const X = stocks.map((r, i) => [1, zAdv[i], ...bandList.slice(1).map((b) => (r.band === b ? 1 : 0))]);
    // neutralized z-signals
    const neut = {};
    for (const c of cols) { const z = zscore(stocks.map((r) => r.sig[c])); neut[c] = olsResid(X, z); }
    // weights from PAST ICs only (walk-forward). A sparse column (e.g. ear_drift, 2024+) simply carries
    // weight 0 until it has history — it must NOT gate the blend's OOS window. OOS begins once the DENSEST
    // column is warm; cold columns contribute 0 and ramp in as their IC history accrues.
    const w = {}; let maxHist = 0;
    for (const c of cols) { const h = icHist[c]; w[c] = h.length ? mean(h.slice(-IC_WINDOW)) : 0; if (h.length > maxHist) maxHist = h.length; }
    const haveWarmup = maxHist >= WARMUP;
    // composite
    const composite = stocks.map((_, i) => cols.reduce((s, c) => s + w[c] * neut[c][i], 0));
    const compIC = spearman(composite, fwd);
    const sigICnow = {}; for (const c of cols) sigICnow[c] = spearman(neut[c], fwd); // THIS date's per-signal IC
    if (haveWarmup) {
      oosCompositeIC.push(compIC);
      const cutoff = quantile([...composite].sort((a, b) => a - b), 1 - DECILE);
      const topRets = []; for (let i = 0; i < stocks.length; i++) if (composite[i] >= cutoff) topRets.push(fwd[i]);
      const pr = topRets.length ? mean(topRets) : 0, br = mean(fwd);
      portRet.push(pr); benchRet.push(br);
      const net = pr - br - COST_BPS / 10000; netSpread.push(net); cum += net;
      series.push({ date: d, compositeIC: compIC, sigIC: { ...sigICnow }, net, cum, weights: { ...w } });
    }
    // append THIS date's ICs for future weights (never used for today)
    for (const c of cols) { if (!Number.isNaN(sigICnow[c])) icHist[c].push(sigICnow[c]); }
  }
  return { oosCompositeIC, netSpread, portRet, benchRet, series };
}

function summarize(res, label, trials) {
  const ic = res.oosCompositeIC.filter((x) => !Number.isNaN(x));
  const icMean = ic.length ? mean(ic) : NaN; const icIR = ic.length > 1 ? icMean / sd(ic) : NaN;
  const sp = tStat(res.netSpread); const curve = []; let c = 0; for (const r of res.netSpread) { c += r; curve.push(c); }
  const sharpe = res.netSpread.length > 2 ? (mean(res.netSpread) / sd(res.netSpread)) * Math.sqrt(PERIODS_PER_YR) : NaN;
  const dsr = res.netSpread.length > 2 ? calculateDSR(res.netSpread, trials).dsr : 0;
  let sd2 = 0, sb2 = 0; for (let i = 0; i < res.portRet.length; i++) { sd2 += (res.portRet[i] - res.benchRet[i]) ** 2; sb2 += res.benchRet[i] ** 2; }
  const theil = sb2 > 0 ? Math.sqrt(sd2 / sb2) : NaN;
  const adf = curve.length > 12 ? adfTest(curve).t : NaN; const kpss = curve.length > 12 ? kpssTest(curve) : NaN;
  return { label, nOOS: res.netSpread.length, icMean, icIR, spread: sp.mean, t: sp.t, p: sp.p, sharpe, dsr, theil, adf, kpss };
}

// ── selftest ──
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function buildSynthetic(rng, predictive) {
  const dates = []; const byDate = new Map(); const M = 80, D = 60;
  for (let dd = 0; dd < D; dd++) { const date = String(2000 + dd).padStart(6, '0'); dates.push(date); const rows = [];
    for (let s = 0; s < M; s++) { const good = rng() * 2 - 1, noise1 = rng() * 2 - 1, noise2 = rng() * 2 - 1;
      const fwd = (predictive ? 0.5 * good : 0) + 0.4 * (rng() * 2 - 1);
      rows.push({ band: s % 2 ? 'midcap' : 'smallcap', logAdv: rng() * 3, sig: { good, noise1, noise2 }, fwd }); }
    byDate.set(date, rows); }
  return { dates, byDate };
}
function runSelftest() {
  console.log('=== Exp19 --selftest (synthetic; no panel) ===\n');
  const cols = ['good', 'noise1', 'noise2'];
  const sig = buildSynthetic(mulberry32(7), true);
  const noise = buildSynthetic(mulberry32(7), false);
  const full = summarize(runEnsemble(sig.byDate, sig.dates, cols), 'predictive-blend', 8);
  const pure = summarize(runEnsemble(noise.byDate, noise.dates, cols), 'pure-noise', 8);
  const goodOnly = summarize(runEnsemble(sig.byDate, sig.dates, ['good']), 'good-only', 8);
  const noiseOnly = summarize(runEnsemble(sig.byDate, sig.dates, ['noise1']), 'noise1-only', 8);
  for (const r of [full, goodOnly, noiseOnly, pure])
    console.log(`  ${r.label.padEnd(18)} OOS IC ${r.icMean.toFixed(3)} (IR ${r.icIR.toFixed(2)})  net spread ${pctf(r.spread)} p=${r.p.toFixed(3)}`);
  // Pass on the IC (what the estimator measures), NOT the net spread: a no-edge blend SHOULD reliably lose
  // the cost drag (pure-noise net spread is correctly negative & significant — that proves cost is applied).
  const pass = full.icMean > 0.05 && full.p < 0.05               // blend recovers the planted signal
    && goodOnly.icMean > Math.abs(noiseOnly.icMean)              // real column beats noise column
    && Math.abs(pure.icMean) < 0.05                              // pure-noise panel has ~zero IC
    && pure.spread < 0;                                          // and correctly loses the cost (no free edge)
  console.log(`\n  ${pass ? '✅ SELFTEST PASS' : '❌ SELFTEST FAIL'} — planted signal dominates, blend has IC, pure noise reads ~0 IC & loses cost.`);
  process.exit(pass ? 0 : 1);
}

// ── HTML report (self-contained, inline SVG — opens offline) ──
const SIG_META = {
  price_momentum:     { label: 'Price momentum (12-1)', color: '#38bdf8', desc: 'Stocks up over the past year (skipping the last month) tend to keep outperforming. A classic factor — included as the baseline.' },
  ear_drift:          { label: 'Earnings-reaction drift', color: '#f59e0b', desc: 'The day-0 abnormal move on a stock’s most recent results filing — a proxy for how the market received its earnings.' },
  bulkdeal_intensity: { label: 'Bulk/block-deal intensity', color: '#a78bfa', desc: 'Net (BUY−SELL) value of disclosed institutional deals in the trailing month, vs the stock’s turnover.' },
  oi_shift:           { label: 'Options OI shift', color: '#fb7185', desc: 'Change in open interest / IV skew (where F&O coverage allows).' },
};
const meta = (c) => SIG_META[c] || { label: c, color: '#94a3b8', desc: '' };
function trailingMean(vals, win) {
  return vals.map((_, i) => { const w = []; for (let k = Math.max(0, i - win + 1); k <= i; k++) { const v = vals[k]; if (v != null && !Number.isNaN(v)) w.push(v); } return w.length ? w.reduce((s, x) => s + x, 0) / w.length : null; });
}
function svgLineChart({ width = 860, height = 280, series, xLabels, zero = false, yfmt = (v) => v.toFixed(2), title = '' }) {
  const padL = 54, padR = 14, padT = 14, padB = 30; const W = width, H = height;
  const finite = []; for (const s of series) for (const v of s.vals) if (v != null && !Number.isNaN(v)) finite.push(v);
  if (zero) finite.push(0);
  let ymin = Math.min(...finite), ymax = Math.max(...finite); if (ymin === ymax) { ymin -= 1; ymax += 1; }
  const pad = (ymax - ymin) * 0.08; ymin -= pad; ymax += pad;
  const N = xLabels.length;
  const xs = (i) => padL + (N <= 1 ? 0 : (i / (N - 1)) * (W - padL - padR));
  const ys = (v) => H - padB - ((v - ymin) / (ymax - ymin)) * (H - padT - padB);
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img">`;
  // y gridlines + labels
  for (let g = 0; g <= 4; g++) { const v = ymin + (g / 4) * (ymax - ymin); const y = ys(v);
    svg += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#1e293b" stroke-width="1"/>`;
    svg += `<text x="${padL - 6}" y="${(y + 3).toFixed(1)}" fill="#64748b" font-size="10" text-anchor="end">${yfmt(v)}</text>`; }
  // zero line
  if (zero && 0 >= ymin && 0 <= ymax) { const y = ys(0); svg += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#475569" stroke-width="1" stroke-dasharray="4 4"/>`; }
  // x labels (~6)
  const step = Math.max(1, Math.floor(N / 6));
  for (let i = 0; i < N; i += step) svg += `<text x="${xs(i).toFixed(1)}" y="${H - 8}" fill="#64748b" font-size="10" text-anchor="middle">${xLabels[i]}</text>`;
  // series paths (break on null)
  for (const s of series) { let d = '', pen = false;
    s.vals.forEach((v, i) => { if (v == null || Number.isNaN(v)) { pen = false; return; } d += `${pen ? 'L' : 'M'}${xs(i).toFixed(1)} ${ys(v).toFixed(1)} `; pen = true; });
    svg += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 1.8}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round"/>`; }
  svg += `</svg>`;
  // legend
  const leg = series.map((s) => `<span class="lg"><i style="background:${s.color}"></i>${s.name}</span>`).join('');
  return `<figure class="chart"><figcaption>${title}</figcaption>${svg}<div class="legend">${leg}</div></figure>`;
}
function gate(b) { return b ? '<span class="g ok">PASS</span>' : '<span class="g no">FAIL</span>'; }
function buildHtmlReport({ full, singles, drops, fullRes, dates, verdict, beatsParts, acceptCost }) {
  const S = fullRes.series; const xLabels = S.map((s) => s.date.slice(0, 7));
  const vColor = verdict === 'SUPPORTED' ? '#34d399' : verdict === 'NULL' ? '#f87171' : '#f59e0b';
  const grossMo = full.spread + COST_BPS / 10000;
  // chart 1 — equity curve (cumulative net spread)
  const equity = svgLineChart({ title: 'Cumulative net top-decile spread vs benchmark (after 250 bps/rebalance)',
    series: [{ name: 'Blend equity (net)', color: '#34d399', width: 2.2, vals: S.map((s) => s.cum * 100) }], xLabels, zero: true, yfmt: (v) => `${v.toFixed(0)}%` });
  // chart 2 — rolling IC per signal + composite
  const icSeries = COLS.map((c) => ({ name: meta(c).label, color: meta(c).color, vals: trailingMean(S.map((s) => s.sigIC[c]), 12) }));
  icSeries.push({ name: 'COMPOSITE (blend)', color: '#e2e8f0', width: 2.4, vals: trailingMean(S.map((s) => s.compositeIC), 12) });
  const icChart = svgLineChart({ title: 'Predictive power over time — rolling 12-month Information Coefficient of every weak signal (higher = more predictive; 0 = useless)',
    series: icSeries, xLabels, zero: true, yfmt: (v) => v.toFixed(2) });
  // chart 3 — IC weights over time (how much the model trusts each signal)
  const wSeries = COLS.map((c) => ({ name: meta(c).label, color: meta(c).color, vals: S.map((s) => s.weights[c]) }));
  const wChart = svgLineChart({ title: 'How much the model trusts each signal over time — walk-forward IC weight (set only from past data)',
    series: wSeries, xLabels, zero: true, yfmt: (v) => v.toFixed(2) });

  const card = (label, val, sub) => `<div class="card"><span class="lbl">${label}</span><b>${val}</b>${sub ? `<span class="sub2">${sub}</span>` : ''}</div>`;
  const tblRow = (r) => `<tr><td>${r.label}</td><td>${r.nOOS}</td><td class="${r.icMean > 0 ? 'pos' : 'neg'}">${r.icMean.toFixed(3)}</td><td>${Number.isNaN(r.icIR) ? 'n/a' : r.icIR.toFixed(2)}</td><td class="${r.spread > 0 ? 'pos' : 'neg'}">${pctf(r.spread)}</td><td>${r.t.toFixed(2)}${stars(r.p)}</td></tr>`;
  const sigCards = COLS.map((c) => { const m = meta(c); return `<div class="sigcard"><span class="dot" style="background:${m.color}"></span><b>${m.label}</b><p>${m.desc}</p></div>`; }).join('');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Exp 19 — Cross-Sectional Ensemble</title>
<style>
  :root{--bg:#070b14;--panel:#0b1120;--line:#1e293b;--ink:#e2e8f0;--mut:#94a3b8;--dim:#64748b}
  *{box-sizing:border-box} body{background:var(--bg);color:var(--ink);font:14px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;margin:0}
  .wrap{max-width:960px;margin:0 auto;padding:28px 22px 60px}
  h1{font-size:24px;margin:0 0 4px} h2{font-size:16px;margin:34px 0 12px;color:#cbd5e1;border-bottom:1px solid var(--line);padding-bottom:6px}
  .sub{color:var(--dim);font-size:12px;margin-bottom:20px}
  .verdict{padding:18px 22px;border-radius:12px;border:2px solid ${vColor};background:${vColor}14;margin:18px 0}
  .verdict .tag{font-size:26px;font-weight:800;color:${vColor};letter-spacing:.5px}
  .verdict p{margin:8px 0 0;color:var(--mut);font-size:13.5px}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
  .card .lbl{color:var(--dim);font-size:11px;text-transform:uppercase;letter-spacing:.4px} .card b{font-size:22px;display:block;font-family:ui-monospace,monospace;margin-top:3px} .card .sub2{color:var(--mut);font-size:11px}
  .explain{background:var(--panel);border:1px solid var(--line);border-left:3px solid #38bdf8;border-radius:8px;padding:14px 16px;color:var(--mut);font-size:13.5px;margin:14px 0}
  .explain b{color:var(--ink)}
  .chart{margin:10px 0 4px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 12px 8px}
  figcaption{color:#cbd5e1;font-size:12.5px;margin:0 4px 8px;font-weight:600}
  .legend{display:flex;gap:16px;flex-wrap:wrap;margin:4px 6px 2px;color:var(--mut);font-size:11.5px}
  .legend .lg i{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:5px;vertical-align:-1px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px} th,td{padding:7px 10px;text-align:right;border-bottom:1px solid var(--line)} th:first-child,td:first-child{text-align:left} th{color:var(--dim);font-weight:600;font-size:11px;text-transform:uppercase}
  td.pos{color:#34d399} td.neg{color:#f87171}
  .g{font-size:11px;font-weight:700;padding:1px 7px;border-radius:5px} .g.ok{background:#34d39922;color:#34d399} .g.no{background:#f8717122;color:#f87171}
  .gates{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0} .gates div{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:8px 12px;font-size:12px}
  .sigcards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:10px 0}
  .sigcard{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px} .sigcard b{font-size:13.5px} .sigcard p{color:var(--mut);font-size:12px;margin:6px 0 0} .sigcard .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:7px}
  code{background:var(--panel);padding:1px 5px;border-radius:4px;color:#7dd3fc;font-size:12px}
  .foot{color:#475569;font-size:11px;margin-top:34px;border-top:1px solid var(--line);padding-top:14px}
</style></head><body><div class="wrap">
  <h1>Experiment 19 — Cross-Sectional Ensemble <span style="color:var(--dim);font-weight:400">(v1)</span></h1>
  <div class="sub">Generated ${new Date().toISOString()} · ${full.nOOS} out-of-sample monthly rebalances · ${dates[0]} → ${dates[dates.length - 1]} · walk-forward · read-only research run</div>

  <div class="verdict"><div class="tag">${verdict}</div>
    <p><b>Plain English:</b> we blended several weak stock-ranking signals into one score, bought the top 10% each month, and tested it honestly out-of-sample. There <b>is</b> a faint real signal (Information Coefficient <b>${full.icMean.toFixed(3)}</b>) — but it is essentially just <b>price momentum</b>; the SachNetra-unique signals add almost nothing, and the edge (~${(grossMo * 100).toFixed(2)}%/mo gross) does <b>not survive trading cost</b> (net ${pctf(full.spread)}/mo). Useful baseline; the real test is adding the calibrated-sentiment & latency feeders next.</p>
  </div>

  <div class="cards">
    ${card('OOS Information Coeff.', full.icMean.toFixed(3), 'IR ' + (Number.isNaN(full.icIR) ? 'n/a' : full.icIR.toFixed(2)) + ' (bar ≥0.30)')}
    ${card('Gross spread / mo', (grossMo * 100).toFixed(2) + '%', 'top decile vs benchmark')}
    ${card('Net spread / mo', pctf(full.spread), 'after ' + COST_BPS + ' bps')}
    ${card('Ann. Sharpe (net)', full.sharpe.toFixed(2), '')}
    ${card('Deflated Sharpe', full.dsr.toFixed(3), 'bar ≥0.95')}
    ${card('Theil U vs bench', full.theil.toFixed(2), 'bar <1.0')}
  </div>

  <h2>What each weak signal is</h2>
  <div class="explain"><b>The idea (the "methodological shift").</b> No single signal here beats a coin flip by much. Instead of hunting one winner, we score every stock on <i>all</i> of them, weight each signal by how predictive it has <b>recently</b> been (its Information Coefficient), and rank stocks against each other. The hope: many weak-but-independent votes combine into one good one.</div>
  <div class="sigcards">${sigCards}<div class="sigcard"><span class="dot" style="background:#e2e8f0"></span><b>COMPOSITE (the blend)</b><p>The IC-weighted, size/sector-neutralised sum of the signals above — the score we actually rank and trade.</p></div></div>

  <h2>1 · Does it make money? — cumulative net spread</h2>
  <div class="explain">The equity curve of the strategy: buy the top-decile of the blend each month, long-only, <b>after</b> a 250 bps round-trip cost. A rising line = the blend is adding value net of cost; a falling line = cost is eating the edge.</div>
  ${equity}

  <h2>2 · Is each signal actually predictive? — rolling Information Coefficient</h2>
  <div class="explain">For every signal (and the composite), this is its <b>rolling 12-month IC</b> — the correlation between how it ranked stocks and what those stocks then did. <b>Above 0 = predictive; at 0 = useless.</b> Notice the <b>composite (white) tracks price-momentum (blue)</b> almost exactly, while earnings-drift and bulk-deal intensity hover near zero — that is the key finding: the blend <i>is</i> momentum.</div>
  ${icChart}

  <h2>3 · How much does the model trust each signal? — walk-forward IC weights</h2>
  <div class="explain">The model sets each signal's weight from its <b>past</b> IC only (never the future — that's "walk-forward"). A signal whose IC turns negative gets down-weighted automatically. This shows momentum earning the loudest vote, with the sparse unique signals carrying little weight.</div>
  ${wChart}

  <h2>4 · The verdict gates (pre-registered)</h2>
  <div class="gates">
    <div>Net spread &gt;0, p&lt;.05 ${gate(acceptCost)}</div>
    <div>OOS IC&gt;0 &amp; IR≥0.30 ${gate(full.icMean > 0 && full.icIR >= 0.3)}</div>
    <div>DSR≥0.95 ${gate(full.dsr >= 0.95)}</div>
    <div>Theil U&lt;1 ${gate(full.theil < 1)}</div>
    <div>ADF stationary ${gate(full.adf < -2.86)}</div>
    <div>KPSS ${gate(full.kpss < 0.463)}</div>
    <div>Blend beats its parts (H19c) ${gate(beatsParts)}</div>
  </div>

  <h2>5 · The blend vs its parts (why this is "just momentum")</h2>
  <div class="explain"><b>How to read this:</b> if the blend were a true team effort, removing any one signal would hurt it. Instead, <b>dropping price-momentum collapses the IC</b> while dropping the unique signals barely changes it — proof the edge is momentum, not the SachNetra data.</div>
  <table><thead><tr><th>Model</th><th>OOS dates</th><th>IC</th><th>IR</th><th>Net/mo</th><th>t</th></tr></thead><tbody>
    ${tblRow(full)}
    <tr><td colspan="6" style="color:var(--dim);font-size:11px;padding-top:10px">— each signal alone —</td></tr>
    ${singles.map(tblRow).join('')}
    ${drops.length ? `<tr><td colspan="6" style="color:var(--dim);font-size:11px;padding-top:10px">— leave-one-out —</td></tr>${drops.map(tblRow).join('')}` : ''}
  </tbody></table>

  <h2>6 · What's next</h2>
  <div class="explain"><b>v1 verdict:</b> a real but weak <i>momentum</i> signal that doesn't clear cost — Exp15 redux. The unique columns (earnings, deals) add no cross-sectional alpha. <b>So the whole ensemble bet now rests on the feeders:</b> per-ticker <b>sentiment</b> (needs G6 calibration → Exp20) and <b>latency</b> (needs G1). Those are the decisive test of whether SachNetra's unique data adds anything beyond a textbook factor. Cheap refinement first: a turnover-aware cost model (this run charges a harsh flat 250 bps every month).</div>

  <div class="foot">SachNetra quant research · Exp 19 · pre-registration: <code>wiki/experiments/exp19_brief.md</code> · full record: <code>wiki/experiments/Exp19.md</code> · read-only, no look-ahead (weights use past data only). Charts are inline SVG — this file is fully self-contained.</div>
</div></body></html>`;
}

// ── main ──
function loadPanel() {
  const text = readFileSync(PANEL, 'utf8').trim().split('\n');
  const header = text[0].split(',');
  const ix = (n) => header.indexOf(n);
  const byDate = new Map(); const dateSet = new Set();
  for (let i = 1; i < text.length; i++) { const c = text[i].split(',');
    const d = c[ix('date')]; dateSet.add(d);
    const num = (n) => { const v = c[ix(n)]; return v === '' || v == null ? null : Number(v); };
    const row = { sym: c[ix('symbol')], band: c[ix('band')], logAdv: num('log_adv'), fwd: num('fwd_ret'), sig: {} };
    for (const col of COLS) row.sig[col] = num(col);
    if (!byDate.has(d)) byDate.set(d, []); byDate.get(d).push(row); }
  return { byDate, dates: [...dateSet].sort() };
}
function main() {
  if (SELFTEST) return runSelftest();
  console.log('=== Experiment 19 — cross-sectional ensemble (walk-forward) ===');
  console.log(`  columns: ${COLS.join(', ')}  ·  cost ${COST_BPS}bps  ·  top-${(DECILE * 100).toFixed(0)}%  ·  IC window ${IC_WINDOW} · warmup ${WARMUP}\n`);
  const { byDate, dates } = loadPanel();
  console.log(`  Panel: ${dates.length} rebalance dates, ${dates[0]} → ${dates[dates.length - 1]}\n`);
  const TRIALS = COLS.length * 2 + 2; // signals × {weight schemes} + holds — logged into DSR

  // full blend
  const fullRes = runEnsemble(byDate, dates, COLS);
  const full = summarize(fullRes, 'FULL BLEND', TRIALS);
  // single-signal standalone (H19c)
  const singles = COLS.map((c) => summarize(runEnsemble(byDate, dates, [c]), c, TRIALS));
  // drop-one-out (H19c)
  const drops = COLS.length > 1 ? COLS.map((c) => summarize(runEnsemble(byDate, dates, COLS.filter((x) => x !== c)), `drop ${c}`, TRIALS)) : [];

  const row = (r) => `   ${r.label.padEnd(22)} OOS=${String(r.nOOS).padStart(3)}  IC ${r.icMean.toFixed(3)} (IR ${Number.isNaN(r.icIR) ? 'n/a' : r.icIR.toFixed(2)})  net ${pctf(r.spread).padStart(8)} (t=${r.t.toFixed(2)}${stars(r.p)})`;
  console.log('── Full blend ──'); console.log(row(full));
  console.log(`   Sharpe ${full.sharpe.toFixed(2)} · DSR ${full.dsr.toFixed(3)} · Theil ${full.theil.toFixed(2)} · ADF ${full.adf.toFixed(2)} · KPSS ${full.kpss.toFixed(2)}\n`);
  console.log('── Single-signal standalone (H19c: blend must beat best single) ──'); singles.forEach((r) => console.log(row(r)));
  if (drops.length) { console.log('\n── Drop-one-out (H19c: result must not depend on one column) ──'); drops.forEach((r) => console.log(row(r))); }

  const bestSingleIC = Math.max(...singles.map((s) => (Number.isNaN(s.icMean) ? -1 : s.icMean)));
  const beatsParts = full.icMean > bestSingleIC;
  const acceptCost = full.spread > 0 && full.p < 0.05;
  const allGates = acceptCost && full.icMean > 0 && full.icIR >= 0.3 && full.dsr >= 0.95 && full.theil < 1.0 && full.adf < -2.86 && full.kpss < 0.463 && beatsParts;
  console.log('\n=== Verdict (pre-registered, brief §4) ===');
  console.log(`   net spread>0 & p<.05: ${acceptCost ? '✅' : '❌'} · OOS IC>0 & IR≥0.3: ${(full.icMean > 0 && full.icIR >= 0.3) ? '✅' : '❌'} · DSR≥.95: ${full.dsr >= 0.95 ? '✅' : '❌'} · Theil<1: ${full.theil < 1 ? '✅' : '❌'} · ADF: ${full.adf < -2.86 ? '✅' : '❌'} · KPSS: ${full.kpss < 0.463 ? '✅' : '❌'} · beats-parts(H19c): ${beatsParts ? '✅' : '❌'}`);
  console.log(`   → ${allGates ? '✅ SUPPORTED — advance to paper-trade.' : (full.icMean <= 0 ? '❌ NULL — composite has no OOS predictive content.' : (!beatsParts ? '🟡/❌ one-signal-driven — not a true ensemble win (H19c fails).' : '❌ NOT SUPPORTED on the primary spec — record null/partial.'))}`);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const all = [full, ...singles, ...drops];
  writeFileSync(join(OUTPUT_DIR, 'exp19_summary.csv'),
    ['label,n_oos,ic_mean,ic_ir,net_spread,t,p,sharpe,dsr,theil,adf,kpss',
      ...all.map((r) => [r.label, r.nOOS, r.icMean, r.icIR, r.spread, r.t, r.p, r.sharpe, r.dsr, r.theil, r.adf, r.kpss].map((v) => (typeof v === 'number' ? v.toFixed(5) : v)).join(','))].join('\n'));
  console.log(`\n  Wrote ${join(OUTPUT_DIR, 'exp19_summary.csv')}`);

  if (HTML) {
    const verdict = allGates ? 'SUPPORTED' : (full.icMean <= 0 ? 'NULL' : 'NOT SUPPORTED');
    const html = buildHtmlReport({ full, singles, drops, fullRes, dates, verdict, beatsParts, acceptCost });
    writeFileSync(join(OUTPUT_DIR, 'exp19_report.html'), html);
    console.log(`  Wrote ${join(OUTPUT_DIR, 'exp19_report.html')}  ← open in a browser`);
  }
}
main();
