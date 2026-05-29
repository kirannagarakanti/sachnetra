#!/usr/bin/env node
//
// Experiment 12 — Are there cointegrated, tradeable Nifty-50 pairs?
// See: ai_docs/sachnetra v2/wiki/experiments/Exp12.md (pre-registered hypothesis,
//      verdict tiers, and caveat checklist live there — read §1/§5/§9 before
//      interpreting any output below).
//
// HYPOTHESIS (locked in Exp12.md §1):
//   H12  — ≥1 same-sector Nifty-50 pair is cointegrated on daily log prices
//          (Engle-Granger: OLS levels → ADF on residuals, EG critical values, p<0.05).
//   H12b — passing pairs mean-revert OUT-OF-SAMPLE (frozen IS β/μ/σ): half-life
//          5–60 trading days AND >55% reversion at |z|>2.
//
// METHOD (Exp12.md §3):
//   1. p = ln(adj_close) for each leg; inner-join on trade_date; ≥500 overlapping days.
//   2. ADF each leg (constant) to confirm I(1).
//   3. Chronological 70/30 split. In-sample OLS p1 = α + β·p2 → residual ε.
//   4. ADF on ε (NO constant, NO trend) vs ENGLE-GRANGER critical values (not std DF).
//   5. Half-life = −ln(2)/λ from Δε = a + λ·ε_{t-1}.
//   6. OOS: freeze α,β,μ,σ; z = (ε_oos−μ)/σ; |z|>2 entries; reversion within 5 days.
//   7. Tier A (~16 sector pairs) reported raw + FDR note. Tier B (all pairs) → BH-FDR.
//   8. Structural-break flag: largest residual mean-shift; re-test with break window dropped.
//
// OUTPUTS (scripts/research/output/exp12/):
//   exp12_report.html         — VISUAL report (verdict banner + spread "rubber-band" charts)
//   exp12_tierA.csv           — headline sector pairs, full stats
//   exp12_tierB_allpairs.csv  — full scan for the FDR appendix
//
// BOUNDARY (per memory/feedback_v2_prod_execution + research playbook):
//   READ-ONLY on prod. SELECTs research_prices only. Writes local files. Claude authors;
//   Lijo runs. --selftest needs NO DB (validated-estimator gate, Exp 9 discipline).
//
// USAGE
//   node scripts/research/exp12-cointegration-pairs.mjs --selftest    # synthetic, no DB
//   node scripts/research/exp12-cointegration-pairs.mjs               # full run (Lijo)
//   node scripts/research/exp12-cointegration-pairs.mjs --tier=A
//   node scripts/research/exp12-cointegration-pairs.mjs --from=2015-01-01 --to=2024-12-31
//   node scripts/research/exp12-cointegration-pairs.mjs --pair=HDFCBANK.NS,ICICIBANK.NS
//   node scripts/research/exp12-cointegration-pairs.mjs --split=0.7

import { loadEnvFile } from '../_seed-utils.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

// ── CLI flags ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const SELFTEST = args.includes('--selftest');
const TIER = (flag('tier', 'AB') || 'AB').toUpperCase();   // 'A' | 'B' | 'AB'
const FROM = flag('from', null);
const TO = flag('to', null);
const SPLIT = Number(flag('split', '0.7'));                // in-sample fraction
const PAIR_FLAG = flag('pair', null);                      // 'SYM1.NS,SYM2.NS'
const MIN_DAYS = Number(flag('min-days', '500'));
const FDR_Q = Number(flag('fdr-q', '0.10'));
const MAXLAG = Number(flag('adf-maxlag', '4'));
const PRICE_COL = 'adj_close';

// ── Engle-Granger critical values (N=2 variables, constant, asymptotic). ──────
// MacKinnon EG surface — NOT standard Dickey-Fuller (residual is estimated, so the
// null distribution shifts left). ep39 §1. Pass = residual-ADF t < EG_CRIT['5%'].
const EG_CRIT = { '1%': -3.90, '5%': -3.34, '10%': -3.04 };

// ── Tier A: economically plausible same-sector pairs (Exp12.md §3.2). .NS form. ──
const TIER_A = [
  ['banking', 'HDFCBANK.NS', 'ICICIBANK.NS'],
  ['banking', 'HDFCBANK.NS', 'KOTAKBANK.NS'],
  ['banking', 'ICICIBANK.NS', 'AXISBANK.NS'],
  ['banking', 'SBIN.NS', 'ICICIBANK.NS'],
  ['banking', 'HDFCBANK.NS', 'AXISBANK.NS'],
  ['metal',   'TATASTEEL.NS', 'JSWSTEEL.NS'],
  ['metal',   'TATASTEEL.NS', 'HINDALCO.NS'],
  ['auto',    'M&M.NS', 'MARUTI.NS'],
  ['auto',    'M&M.NS', 'BAJAJ-AUTO.NS'],
  ['auto',    'TATAMOTORS.NS', 'MARUTI.NS'],
  ['pharma',  'SUNPHARMA.NS', 'DRREDDY.NS'],
  ['pharma',  'CIPLA.NS', 'DRREDDY.NS'],
  ['pharma',  'SUNPHARMA.NS', 'CIPLA.NS'],
  ['it',      'TCS.NS', 'INFY.NS'],
  ['it',      'INFY.NS', 'WIPRO.NS'],
  ['it',      'TCS.NS', 'HCLTECH.NS'],
];

// Known structural breaks to annotate (Exp12.md §3.7).
const KNOWN_BREAKS = [
  { tickers: ['HDFCBANK.NS'], date: '2023-07-01', note: 'HDFC twins merger (HDFC Ltd → HDFCBANK)' },
];

// ── Linear algebra (pure Node, no deps) ──────────────────────────────────────
function invert(A) {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) return null; // singular
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    for (let j = 0; j < 2 * n; j++) M[col][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[col][j];
    }
  }
  return M.map((row) => row.slice(n));
}

// OLS via normal equations. X: n×k design, Y: n. Returns coefficients + SE + RSS.
function olsFit(X, Y) {
  const n = X.length, k = X[0].length;
  const XtX = Array.from({ length: k }, () => Array(k).fill(0));
  const Xty = Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    const xi = X[i];
    for (let a = 0; a < k; a++) {
      Xty[a] += xi[a] * Y[i];
      for (let b = a; b < k; b++) XtX[a][b] += xi[a] * xi[b];
    }
  }
  for (let a = 0; a < k; a++) for (let b = 0; b < a; b++) XtX[a][b] = XtX[b][a];
  const inv = invert(XtX);
  if (!inv) return null;
  const beta = Array(k).fill(0);
  for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) beta[a] += inv[a][b] * Xty[b];
  let rss = 0;
  for (let i = 0; i < n; i++) {
    let yhat = 0;
    for (let a = 0; a < k; a++) yhat += X[i][a] * beta[a];
    const r = Y[i] - yhat; rss += r * r;
  }
  const dof = n - k;
  const sigma2 = dof > 0 ? rss / dof : NaN;
  const se = Array.from({ length: k }, (_, a) => Math.sqrt(sigma2 * inv[a][a]));
  return { beta, se, rss, n, k };
}

// Simple OLS y = a + b·x. Returns {a, b}.
function simpleOLS(x, y) {
  const fit = olsFit(x.map((xi) => [1, xi]), y);
  return fit ? { a: fit.beta[0], b: fit.beta[1] } : null;
}

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };

// ── ADF test (AIC lag selection up to maxLag) ────────────────────────────────
// regression: 'c' (constant) for level series, 'nc' (none) for EG residuals.
// Returns { t, usedLag, nobs } — t is the t-stat on the lagged-level coefficient.
function adfTest(y, { regression = 'c', maxLag = MAXLAG } = {}) {
  const T = y.length;
  const withConst = regression === 'c';
  let best = { aic: Infinity, t: NaN, usedLag: NaN, nobs: 0 };
  for (let p = 0; p <= maxLag; p++) {
    const X = [], Y = [];
    for (let t = p + 1; t < T; t++) {
      const row = [];
      if (withConst) row.push(1);
      row.push(y[t - 1]);                          // level → γ (the unit-root coef)
      for (let kk = 1; kk <= p; kk++) row.push(y[t - kk] - y[t - kk - 1]); // lagged Δ
      X.push(row);
      Y.push(y[t] - y[t - 1]);                     // Δy_t
    }
    const n = X.length, k = X[0].length;
    if (n <= k + 2) continue;
    const fit = olsFit(X, Y);
    if (!fit) continue;
    const aic = n * Math.log(fit.rss / n) + 2 * k;
    if (aic < best.aic) {
      const lvlIdx = withConst ? 1 : 0;
      best = { aic, t: fit.beta[lvlIdx] / fit.se[lvlIdx], usedLag: p, nobs: n };
    }
  }
  return best;
}

// ── Approximate EG p-value (for BH-FDR ranking ONLY; decision uses EG_CRIT). ──
// Monotone interpolation across EG distribution anchors. Well-anchored near the
// 1/5/10% decision boundary (the region BH cares about); mid/high-p anchors are
// approximate and only affect pairs that don't survive FDR anyway. Documented as
// approximate in Exp12.md §9.
const EG_PVAL_ANCHORS = [
  [-6.50, 0.0001], [-4.50, 0.005], [-3.90, 0.01], [-3.60, 0.025],
  [-3.34, 0.05], [-3.04, 0.10], [-2.57, 0.25], [-2.10, 0.50],
  [-1.50, 0.75], [-0.80, 0.90], [0.00, 0.975],
];
function egApproxPValue(t) {
  const A = EG_PVAL_ANCHORS;
  if (t <= A[0][0]) return A[0][1];
  if (t >= A[A.length - 1][0]) return A[A.length - 1][1];
  for (let i = 1; i < A.length; i++) {
    if (t <= A[i][0]) {
      const [t0, p0] = A[i - 1], [t1, p1] = A[i];
      return p0 + (p1 - p0) * ((t - t0) / (t1 - t0));
    }
  }
  return 0.999;
}

// Benjamini-Hochberg: returns Set of indices that are discoveries at FDR q.
function benjaminiHochberg(pvals, q) {
  const m = pvals.length;
  const order = pvals.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  let kMax = -1;
  for (let r = 0; r < m; r++) if (order[r].p <= ((r + 1) / m) * q) kMax = r;
  const out = new Set();
  for (let r = 0; r <= kMax; r++) out.add(order[r].i);
  return out;
}

// Half-life from a residual series: Δε = a + λ·ε_{t-1}; HL = −ln2/λ (λ<0).
function halfLife(eps) {
  if (eps.length < 20) return NaN;
  const x = eps.slice(0, -1);
  const dy = eps.slice(1).map((e, i) => e - eps[i]);
  const fit = simpleOLS(x, dy);
  if (!fit || fit.b >= 0) return Infinity;
  return -Math.log(2) / fit.b;
}

// OOS reversion test: signals at |z|>2, success if |z| shrinks within 5 days.
function oosReversion(epsOOS, muIS, sigIS, horizon = 5, zEntry = 2) {
  const z = epsOOS.map((e) => (e - muIS) / sigIS);
  let signals = 0, success = 0;
  for (let i = 0; i + horizon < z.length; i++) {
    if (Math.abs(z[i]) > zEntry) {
      signals++;
      if (Math.abs(z[i + horizon]) < Math.abs(z[i])) success++;
    }
  }
  return { signals, rate: signals ? success / signals : NaN };
}

// Largest residual mean-shift (coarse Chow-style scan via prefix sums → O(n)).
function detectBreak(eps, dates) {
  const n = eps.length;
  const s = sd(eps) || 1e-9;
  const minSeg = Math.max(30, Math.floor(n * 0.1));
  const prefix = new Array(n + 1).fill(0);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + eps[i];
  const total = prefix[n];
  let best = { idx: -1, date: null, sigmaJump: 0 };
  for (let i = minSeg; i < n - minSeg; i += 5) {
    const before = prefix[i] / i;
    const after = (total - prefix[i]) / (n - i);
    const j = Math.abs(after - before) / s;
    if (j > best.sigmaJump) best = { idx: i, date: dates[i], sigmaJump: j };
  }
  return best;
}

// ── Per-pair cointegration analysis ──────────────────────────────────────────
// a, b: aligned arrays of { date, p } (log prices) for leg1, leg2 (same dates).
function analyzePair(sector, sym1, sym2, a, b) {
  const n = a.length;
  const dates = a.map((r) => r.date);
  const p1 = a.map((r) => r.p), p2 = b.map((r) => r.p);

  // Leg stationarity (should be I(1) — non-stationary in levels).
  const adf1 = adfTest(p1, { regression: 'c' });
  const adf2 = adfTest(p2, { regression: 'c' });
  const leg1NonStat = !(adf1.t < EG_CRIT['5%']);
  const leg2NonStat = !(adf2.t < EG_CRIT['5%']);

  // 70/30 chronological split.
  const cut = Math.floor(n * SPLIT);
  const p1is = p1.slice(0, cut), p2is = p2.slice(0, cut);

  // In-sample cointegrating regression p1 = α + β·p2.
  const coint = simpleOLS(p2is, p1is);
  if (!coint) return null;
  const { a: alpha, b: beta } = coint;

  // Residuals: IS, OOS, and full (frozen α,β) for break scan.
  const residAll = p1.map((v, i) => v - (alpha + beta * p2[i]));
  const epsIS = residAll.slice(0, cut);
  const epsOOS = residAll.slice(cut);
  const muIS = mean(epsIS), sigIS = sd(epsIS) || 1e-9;

  // EG residual-ADF (no constant).
  const egAdf = adfTest(epsIS, { regression: 'nc' });
  const egT = egAdf.t;
  const egPass = egT < EG_CRIT['5%'];
  const approxP = egApproxPValue(egT);

  // Half-lives + OOS reversion.
  const hlIS = halfLife(epsIS);
  const hlOOS = halfLife(epsOOS);
  const rev = oosReversion(epsOOS, muIS, sigIS);

  // Structural break + SUSPECT re-test (only meaningful if egPass).
  const brk = detectBreak(residAll, dates);
  const known = KNOWN_BREAKS.find((k) => k.tickers.some((t) => t === sym1 || t === sym2));
  let suspect = false;
  if (egPass && brk.idx > 0 && brk.sigmaJump > 3) {
    // Re-run EG residual-ADF excluding ±20-day window around the break (within IS portion).
    const w = 20;
    const lo = Math.max(0, brk.idx - w), hi = Math.min(cut, brk.idx + w);
    const epsDrop = epsIS.filter((_, i) => i < lo || i >= hi);
    if (epsDrop.length > 60) {
      const egDrop = adfTest(epsDrop, { regression: 'nc' });
      if (!(egDrop.t < EG_CRIT['5%'])) suspect = true;
    }
  }

  const hlOOSband = Number.isFinite(hlOOS) && hlOOS >= 5 && hlOOS <= 60;
  const fullPass = egPass && hlOOSband && rev.rate > 0.55;

  return {
    sector, sym1, sym2, n,
    dateFrom: dates[0], dateTo: dates[n - 1], splitIdx: cut,
    adf1: adf1.t, adf2: adf2.t, leg1NonStat, leg2NonStat,
    alpha, beta, egT, egPass, approxP,
    hlIS, hlOOS, hlOOSband, oosSignals: rev.signals, oosRate: rev.rate,
    breakDate: brk.date, breakSigma: brk.sigmaJump, knownBreak: known ? known.note : '',
    suspect, fullPass,
    // chart data (residual + split) kept only for pairs we plot to bound memory
    _resid: residAll, _dates: dates, _muIS: muIS, _sigIS: sigIS,
  };
}

// ── Data loading ─────────────────────────────────────────────────────────────
async function loadPrices(pool, tickers) {
  const params = [tickers];
  let where = `symbol = ANY($1) AND ${PRICE_COL} IS NOT NULL AND ${PRICE_COL} > 0`;
  if (FROM) { params.push(FROM); where += ` AND trade_date >= $${params.length}`; }
  if (TO) { params.push(TO); where += ` AND trade_date <= $${params.length}`; }
  const { rows } = await pool.query(
    `SELECT symbol, to_char(trade_date,'YYYY-MM-DD') AS d, ${PRICE_COL} AS px
       FROM research_prices WHERE ${where} ORDER BY symbol, trade_date ASC`, params);
  const bySym = new Map();
  for (const r of rows) {
    if (!bySym.has(r.symbol)) bySym.set(r.symbol, []);
    bySym.get(r.symbol).push({ date: r.d, p: Math.log(Number(r.px)) });
  }
  return bySym;
}

// Inner-join two log-price series on date.
function alignPair(s1, s2) {
  if (!s1 || !s2) return null;
  const m2 = new Map(s2.map((r) => [r.date, r.p]));
  const a = [], b = [];
  for (const r of s1) {
    if (m2.has(r.date)) { a.push({ date: r.date, p: r.p }); b.push({ date: r.date, p: m2.get(r.date) }); }
  }
  return { a, b };
}

// ── Self-test (no DB): validated-estimator gate (Exp 9 discipline) ───────────
function runSelfTest() {
  console.log('=== Exp 12 self-test (synthetic; no DB) ===');
  // Deterministic LCG so the test is reproducible.
  let seed = 42;
  const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff - 0.5; };
  const N = 1500;
  const dates = Array.from({ length: N }, (_, i) => `2020-01-${String(i).padStart(4, '0')}`);

  // (1) Cointegrated pair: shared random walk + stationary AR(1) spread.
  const rw = [0]; for (let i = 1; i < N; i++) rw.push(rw[i - 1] + rng() * 0.02);
  let ar = 0; const spread = [];
  for (let i = 0; i < N; i++) { ar = 0.9 * ar + rng() * 0.05; spread.push(ar); }
  const coY = rw.map((v, i) => ({ date: dates[i], p: 5 + 1.5 * v + spread[i] }));
  const coX = rw.map((v, i) => ({ date: dates[i], p: v }));
  const coint = analyzePair('synthetic', 'COINT_Y', 'COINT_X', coY, coX);

  // (2) Independent random walks (NOT cointegrated).
  const rwA = [0], rwB = [0];
  for (let i = 1; i < N; i++) { rwA.push(rwA[i - 1] + rng() * 0.02); rwB.push(rwB[i - 1] + rng() * 0.02); }
  const indY = rwA.map((v, i) => ({ date: dates[i], p: 3 + v }));
  const indX = rwB.map((v, i) => ({ date: dates[i], p: 2 + v }));
  const indep = analyzePair('synthetic', 'INDEP_A', 'INDEP_B', indY, indX);

  console.log(`  EG 5% critical value: ${EG_CRIT['5%']}`);
  console.log(`  cointegrated pair   : resid-ADF t=${coint.egT.toFixed(2)}  → pass=${coint.egPass}  (expect PASS, t < ${EG_CRIT['5%']})`);
  console.log(`  independent pair    : resid-ADF t=${indep.egT.toFixed(2)}  → pass=${indep.egPass}  (expect FAIL, t > ${EG_CRIT['5%']})`);
  const ok = coint.egPass === true && indep.egPass === false;
  console.log(ok ? '\n  ✅ SELFTEST PASS — estimator separates cointegrated from spurious.'
                 : '\n  ❌ SELFTEST FAIL — estimator did not separate the two cases. Do NOT trust a real run.');
  process.exit(ok ? 0 : 1);
}

// ── Verdict (Exp12.md §5) ────────────────────────────────────────────────────
function computeVerdict(tierA) {
  const egPassers = tierA.filter((r) => r.egPass);
  const cleanFull = tierA.filter((r) => r.fullPass && !r.suspect);
  const suspectFull = tierA.filter((r) => r.fullPass && r.suspect);
  if (cleanFull.length >= 1) return { tag: 'SUPPORTED', cls: 'ok', cleanFull, egPassers, suspectFull };
  if (suspectFull.length >= 1) return { tag: 'PROMISING (🚩 SUSPECT)', cls: 'warn', cleanFull, egPassers, suspectFull };
  if (egPassers.length >= 1) return { tag: 'PROMISING', cls: 'warn', cleanFull, egPassers, suspectFull };
  return { tag: 'NULL', cls: 'bad', cleanFull, egPassers, suspectFull };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (SELFTEST) return runSelfTest();

  console.log('=== Experiment 12 — cointegrated, tradeable Nifty-50 pairs ===');
  console.log(`  Tier: ${TIER}   Split: ${(SPLIT * 100).toFixed(0)}% IS   Min overlap: ${MIN_DAYS} days`);
  console.log(`  Window: ${FROM || 'start'} → ${TO || 'today'}   EG 5% crit: ${EG_CRIT['5%']}`);

  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set in .env.local'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // Registry tickers.
  const taxPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'shared', 'market-taxonomy.json');
  const registry = JSON.parse(readFileSync(taxPath, 'utf8')).nifty50_registry.map((e) => e.ticker);

  // Which pairs to test.
  let pairs = [];
  if (PAIR_FLAG) {
    const [s1, s2] = PAIR_FLAG.split(',').map((s) => s.trim());
    pairs = [['custom', s1, s2]];
  } else {
    if (TIER.includes('A')) pairs.push(...TIER_A);
    if (TIER.includes('B')) {
      const set = new Set(pairs.map(([, x, y]) => [x, y].sort().join('|')));
      for (let i = 0; i < registry.length; i++)
        for (let j = i + 1; j < registry.length; j++) {
          const key = [registry[i], registry[j]].sort().join('|');
          if (!set.has(key)) { set.add(key); pairs.push(['all', registry[i], registry[j]]); }
        }
    }
  }

  // Load all needed prices in one query.
  const needed = [...new Set(pairs.flatMap(([, x, y]) => [x, y]))];
  const prices = await loadPrices(pool, needed);
  await pool.end();

  const missing = needed.filter((t) => !prices.has(t) || prices.get(t).length < MIN_DAYS);
  if (missing.length) console.log(`  ⚠ skipped (no/short data, <${MIN_DAYS} days): ${missing.join(', ')}`);

  // Analyse.
  const tierA = [], tierB = [];
  for (const [sector, s1, s2] of pairs) {
    const aligned = alignPair(prices.get(s1), prices.get(s2));
    if (!aligned || aligned.a.length < MIN_DAYS) continue;
    const res = analyzePair(sector, s1, s2, aligned.a, aligned.b);
    if (!res) continue;
    if (sector === 'all') tierB.push(res); else tierA.push(res);
  }
  // Tier A pairs also belong in the Tier B universe for the FDR base-rate.
  const tierBAll = [...tierB, ...tierA.map((r) => ({ ...r }))];

  // BH-FDR over the full scan.
  let bhSet = new Set();
  if (tierBAll.length > 1) bhSet = benjaminiHochberg(tierBAll.map((r) => r.approxP), FDR_Q);
  const tierBPass5 = tierBAll.filter((r) => r.egPass).length;
  const expectedByChance = Math.round(tierBAll.length * 0.05);
  const bhSurvivors = bhSet.size;

  // Mark Tier A FDR survival.
  const bhKeys = new Set([...bhSet].map((i) => `${tierBAll[i].sym1}|${tierBAll[i].sym2}`));
  for (const r of tierA) r.fdrSurvive = bhKeys.has(`${r.sym1}|${r.sym2}`);

  const verdict = computeVerdict(tierA);

  // ── Console summary ──
  console.log(`\n— Tier A (${tierA.length} pairs with ≥${MIN_DAYS} days) —`);
  console.log(`  ${'pair'.padEnd(26)} ${'EG t'.padStart(7)} ${'pass'.padStart(5)} ${'HL_OOS'.padStart(7)} ${'rev%'.padStart(6)} ${'sig'.padStart(4)}  flag`);
  console.log('  ' + '─'.repeat(72));
  for (const r of tierA.sort((x, y) => x.egT - y.egT)) {
    const pairName = `${r.sym1}/${r.sym2}`.replace(/\.NS/g, '');
    const flagBits = [r.fullPass ? '✅' : '', r.suspect ? '🚩' : '', r.fdrSurvive ? 'FDR' : ''].filter(Boolean).join(' ');
    console.log(`  ${pairName.padEnd(26)} ${r.egT.toFixed(2).padStart(7)} ${String(r.egPass).padStart(5)} ${(Number.isFinite(r.hlOOS) ? r.hlOOS.toFixed(0) : '∞').padStart(7)} ${(Number.isFinite(r.oosRate) ? (r.oosRate * 100).toFixed(0) : '–').padStart(6)} ${String(r.oosSignals).padStart(4)}  ${flagBits}`);
  }
  if (TIER.includes('B')) {
    console.log(`\n— Tier B multiplicity (${tierBAll.length} pairs scanned) —`);
    console.log(`  passing EG 5%:        ${tierBPass5}`);
    console.log(`  expected by chance:   ~${expectedByChance} (5% of ${tierBAll.length})`);
    console.log(`  BH-FDR survivors (q=${FDR_Q}): ${bhSurvivors}`);
  }
  console.log(`\n— Verdict (Exp12.md §5): ${verdict.tag} —`);

  // ── Write outputs ──
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, 'exp12_tierA.csv'), buildTierACsv(tierA));
  if (TIER.includes('B')) writeFileSync(join(OUTPUT_DIR, 'exp12_tierB_allpairs.csv'), buildTierBCsv(tierBAll, bhSet));
  const html = buildHtmlReport({ tierA, tierBAll, tierBPass5, expectedByChance, bhSurvivors, verdict, missing });
  writeFileSync(join(OUTPUT_DIR, 'exp12_report.html'), html);

  console.log(`\n— Outputs —`);
  console.log(`  ${join(OUTPUT_DIR, 'exp12_report.html')}   ← open this in a browser (visual)`);
  console.log(`  ${join(OUTPUT_DIR, 'exp12_tierA.csv')}`);
  if (TIER.includes('B')) console.log(`  ${join(OUTPUT_DIR, 'exp12_tierB_allpairs.csv')}`);
  console.log(`\n  → Fill Exp12.md §6/§7/§8 with the numbers above; log H12 in the playbook.`);
  console.log('Done.');
}

// ── Output paths ─────────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dir, 'output', 'exp12');

// ── CSV builders ─────────────────────────────────────────────────────────────
const csvCell = (v) => { if (v == null) return ''; const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csvRow = (a) => a.map(csvCell).join(',') + '\n';
const fx = (v, d = 4) => (v == null || !Number.isFinite(v) ? '' : v.toFixed(d));

function buildTierACsv(rows) {
  let out = csvRow(['sector', 'pair', 'n', 'date_from', 'date_to', 'adf_leg1_t', 'adf_leg2_t',
    'beta', 'eg_resid_adf_t', 'eg_pass_5pct', 'approx_p', 'fdr_survive',
    'half_life_is', 'half_life_oos', 'oos_signals', 'oos_reversion_rate',
    'break_date', 'break_sigma', 'known_break', 'suspect', 'full_pass']);
  for (const r of rows) {
    out += csvRow([r.sector, `${r.sym1}/${r.sym2}`, r.n, r.dateFrom, r.dateTo, fx(r.adf1, 2), fx(r.adf2, 2),
      fx(r.beta), fx(r.egT, 3), r.egPass, fx(r.approxP), r.fdrSurvive,
      fx(r.hlIS, 1), fx(r.hlOOS, 1), r.oosSignals, fx(r.oosRate, 3),
      r.breakDate, fx(r.breakSigma, 2), r.knownBreak, r.suspect, r.fullPass]);
  }
  return out;
}

function buildTierBCsv(rows, bhSet) {
  let out = csvRow(['pair', 'n', 'eg_resid_adf_t', 'eg_pass_5pct', 'approx_p', 'bh_fdr_survive', 'half_life_is']);
  rows.forEach((r, i) => {
    out += csvRow([`${r.sym1}/${r.sym2}`, r.n, fx(r.egT, 3), r.egPass, fx(r.approxP), bhSet.has(i), fx(r.hlIS, 1)]);
  });
  return out;
}

// ── HTML report with inline SVG charts ───────────────────────────────────────
function svgSpreadChart(r) {
  const W = 760, H = 280, PL = 56, PR = 16, PT = 18, PB = 30;
  const eps = r._resid, dates = r._dates, mu = r._muIS, s = r._sigIS, split = r.splitIdx;
  const n = eps.length;
  const yMax = Math.max(2.4 * s, ...eps.map((e) => Math.abs(e - mu))) * 1.05;
  const xOf = (i) => PL + (i / (n - 1)) * (W - PL - PR);
  const yOf = (v) => PT + ((yMax - (v - mu)) / (2 * yMax)) * (H - PT - PB);
  const band = (k, col, dash) =>
    `<line x1="${PL}" y1="${yOf(mu + k * s)}" x2="${W - PR}" y2="${yOf(mu + k * s)}" stroke="${col}" stroke-width="1" stroke-dasharray="${dash}"/>`;
  let path = '';
  for (let i = 0; i < n; i++) path += (i === 0 ? 'M' : 'L') + xOf(i).toFixed(1) + ' ' + yOf(eps[i]).toFixed(1) + ' ';
  const splitX = xOf(split);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" style="background:#0b1120;border-radius:8px">
    ${band(2, '#ef4444', '4 3')}${band(1, '#475569', '2 3')}${band(0, '#94a3b8', '6 4')}${band(-1, '#475569', '2 3')}${band(-2, '#ef4444', '4 3')}
    <line x1="${splitX}" y1="${PT}" x2="${splitX}" y2="${H - PB}" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="2 2"/>
    <text x="${splitX + 4}" y="${PT + 12}" fill="#3b82f6" font-size="11">OOS →</text>
    <text x="${W - PR}" y="${yOf(mu + 2 * s) - 3}" fill="#ef4444" font-size="10" text-anchor="end">+2σ</text>
    <text x="${W - PR}" y="${yOf(mu - 2 * s) + 11}" fill="#ef4444" font-size="10" text-anchor="end">−2σ</text>
    <text x="${W - PR}" y="${yOf(mu) - 3}" fill="#94a3b8" font-size="10" text-anchor="end">mean</text>
    <path d="${path}" fill="none" stroke="#22d3ee" stroke-width="1.2"/>
    <text x="${PL}" y="${H - 8}" fill="#64748b" font-size="10">${dates[0]}</text>
    <text x="${W - PR}" y="${H - 8}" fill="#64748b" font-size="10" text-anchor="end">${dates[n - 1]}</text>
  </svg>`;
}

function badge(text, cls) {
  const col = { ok: '#22c55e', warn: '#f59e0b', bad: '#ef4444', mut: '#475569' }[cls] || '#475569';
  return `<span style="background:${col}22;color:${col};border:1px solid ${col};padding:1px 7px;border-radius:10px;font-size:11px;white-space:nowrap">${text}</span>`;
}

function buildHtmlReport({ tierA, tierBAll, tierBPass5, expectedByChance, bhSurvivors, verdict, missing }) {
  const vcol = { ok: '#22c55e', warn: '#f59e0b', bad: '#ef4444' }[verdict.cls];
  const sorted = [...tierA].sort((a, b) => a.egT - b.egT);
  // Plot the EG-passers; if none, plot the 3 closest (most negative t) so it's still visual.
  const toPlot = sorted.filter((r) => r.egPass);
  const plotted = (toPlot.length ? toPlot : sorted.slice(0, 3));

  const rowsHtml = sorted.map((r) => {
    const name = `${r.sym1}/${r.sym2}`.replace(/\.NS/g, '');
    const passB = r.egPass ? badge('EG pass', 'ok') : badge('no', 'mut');
    const fullB = r.fullPass ? badge('tradeable', 'ok') : '';
    const susB = r.suspect ? badge('🚩 break', 'bad') : '';
    const fdrB = r.fdrSurvive ? badge('FDR', 'ok') : '';
    return `<tr>
      <td>${name}</td><td>${r.sector}</td><td class="num">${r.n}</td>
      <td class="num">${r.egT.toFixed(2)}</td><td>${passB}</td>
      <td class="num">${Number.isFinite(r.hlOOS) ? r.hlOOS.toFixed(0) : '∞'}</td>
      <td class="num">${Number.isFinite(r.oosRate) ? (r.oosRate * 100).toFixed(0) + '%' : '–'}</td>
      <td class="num">${r.oosSignals}</td>
      <td>${[fullB, fdrB, susB].filter(Boolean).join(' ')}</td>
    </tr>`;
  }).join('');

  const chartsHtml = plotted.map((r) => {
    const name = `${r.sym1}/${r.sym2}`.replace(/\.NS/g, '');
    const verd = r.fullPass && !r.suspect ? badge('SUPPORTED', 'ok')
      : r.egPass ? badge(r.suspect ? 'SUSPECT' : 'PROMISING', r.suspect ? 'bad' : 'warn')
      : badge('not cointegrated', 'mut');
    const brkNote = r.knownBreak ? ` · known: ${r.knownBreak}` : (r.breakSigma > 3 ? ` · largest shift ${r.breakDate} (${r.breakSigma.toFixed(1)}σ)` : '');
    return `<div class="card">
      <div class="cardhead"><b>${name}</b> ${verd}
        <span class="meta">β=${r.beta.toFixed(3)} · EG&nbsp;t=${r.egT.toFixed(2)} · OOS half-life=${Number.isFinite(r.hlOOS) ? r.hlOOS.toFixed(0) + 'd' : '∞'} · reversion=${Number.isFinite(r.oosRate) ? (r.oosRate * 100).toFixed(0) + '%' : '–'} (${r.oosSignals} signals)${brkNote}</span>
      </div>
      ${svgSpreadChart(r)}
      <div class="cap">The cyan line is the <b>spread</b> (how far the pair is from its long-run relationship). A tradeable "rubber band" sits near the mean and snaps back from the ±2σ red lines. Blue dashed line = start of the out-of-sample period the model never saw.</div>
    </div>`;
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Exp 12 — Cointegration Pairs</title>
<style>
  body{background:#070b14;color:#e2e8f0;font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:28px;max-width:900px;margin:0 auto}
  h1{font-size:22px;margin:0 0 4px} h2{font-size:16px;margin:28px 0 10px;color:#cbd5e1}
  .sub{color:#64748b;font-size:12px;margin-bottom:20px}
  .verdict{padding:16px 20px;border-radius:10px;border:2px solid ${vcol};background:${vcol}14;margin:18px 0}
  .verdict .tag{font-size:26px;font-weight:700;color:${vcol}}
  .explain{background:#0b1120;border:1px solid #1e293b;border-radius:8px;padding:14px 16px;color:#94a3b8;font-size:13px}
  table{border-collapse:collapse;width:100%;font-size:13px;margin-top:6px}
  th,td{text-align:left;padding:6px 9px;border-bottom:1px solid #1e293b} th{color:#94a3b8;font-weight:600}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;font-family:ui-monospace,Menlo,monospace}
  .card{background:#0b1120;border:1px solid #1e293b;border-radius:10px;padding:14px;margin:14px 0}
  .cardhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
  .meta{color:#64748b;font-size:12px;font-family:ui-monospace,monospace}
  .cap{color:#64748b;font-size:12px;margin-top:8px}
  .mult{display:flex;gap:24px;flex-wrap:wrap} .mult div{background:#0b1120;border:1px solid #1e293b;border-radius:8px;padding:10px 14px}
  .mult b{font-size:20px;color:#e2e8f0;display:block;font-family:ui-monospace,monospace}
  code{background:#0b1120;padding:1px 5px;border-radius:4px;color:#7dd3fc}
  .foot{color:#475569;font-size:11px;margin-top:30px;border-top:1px solid #1e293b;padding-top:14px}
</style></head><body>
  <h1>Experiment 12 — Cointegrated, tradeable Nifty-50 pairs</h1>
  <div class="sub">Generated ${new Date().toISOString()} · window ${FROM || 'start'} → ${TO || 'today'} · ${(SPLIT * 100).toFixed(0)}% in-sample split · EG 5% critical value ${EG_CRIT['5%']} · read-only research run</div>

  <div class="verdict"><div class="tag">${verdict.tag}</div>
    <div style="color:#94a3b8;font-size:13px;margin-top:6px">
      ${verdict.cleanFull.length} pair(s) fully passed (cointegrated + out-of-sample tradeable) ·
      ${verdict.egPassers.length} pair(s) cointegrated in-sample · of ${tierA.length} Tier-A pairs tested.
    </div>
  </div>

  <div class="explain"><b>What this is, in one breath.</b> Two stocks in the same sector are often pulled by the
  same engine, so the gap between them ("the spread") tends to snap back when it stretches — like a rubber band.
  If the gap is statistically a rubber band (<i>cointegrated</i>) <b>and</b> it still snaps back on data the model
  never saw (<i>out-of-sample</i>), you can trade it: short the rich leg, long the cheap one, wait for the snap.
  This experiment scans the Nifty-50 for those rubber bands. Verdict rules were locked <i>before</i> the run
  (<code>Exp12.md §5</code>).</div>

  <h2>Tier A — economically plausible sector pairs</h2>
  <table><thead><tr>
    <th>pair</th><th>sector</th><th class="num">days</th><th class="num">EG&nbsp;t</th><th>cointegrated?</th>
    <th class="num">OOS half-life</th><th class="num">OOS reversion</th><th class="num">signals</th><th>flags</th>
  </tr></thead><tbody>${rowsHtml}</tbody></table>
  <div class="sub" style="margin-top:8px">Pass = EG residual-ADF t &lt; ${EG_CRIT['5%']} (more negative). "tradeable" = also OOS half-life 5–60d &amp; reversion &gt;55%. "🚩 break" = a single structural shift drives the pass (downgrade). "FDR" = also survives Benjamini-Hochberg across the full scan.</div>

  <h2>Spread charts — the rubber band${toPlot.length ? '' : ' (closest 3 — none passed)'}</h2>
  ${chartsHtml || '<div class="explain">No Tier-A pairs to plot.</div>'}

  ${TIER.includes('B') ? `<h2>Tier B — multiplicity check (full ${tierBAll.length}-pair scan)</h2>
  <div class="mult">
    <div>passing EG 5%<b>${tierBPass5}</b></div>
    <div>expected by chance<b>~${expectedByChance}</b></div>
    <div>BH-FDR survivors (q=${FDR_Q})<b>${bhSurvivors}</b></div>
  </div>
  <div class="sub" style="margin-top:8px">If "passing" ≈ "expected by chance", the scan is noise. Real signal shows up as passers far above the chance line and as BH-FDR survivors. Full list in <code>exp12_tierB_allpairs.csv</code>.</div>` : ''}

  ${missing.length ? `<div class="sub" style="margin-top:18px">⚠ Skipped (no/short data): ${missing.map((m) => m.replace('.NS', '')).join(', ')}</div>` : ''}

  <div class="foot">
    Method: Engle-Granger two-step (ep39 §1) — OLS log-price levels → ADF on residuals (no deterministic terms) vs MacKinnon EG critical values (N=2, constant). Half-life from Δε=a+λε₍t-1₎. OOS uses frozen in-sample β/μ/σ (look-ahead guard). Tier-B p-values feeding BH-FDR are <b>approximate</b> (interpolated EG distribution) — the authoritative pass/fail is the critical-value comparison. Caveats (spurious regression, survivorship, transaction costs, structural breaks): <code>Exp12.md §9</code>. Read-only; Claude authors, Lijo runs.
  </div>
</body></html>`;
}

main().catch((e) => { console.error('Experiment failed:', e.message); console.error(e.stack); process.exit(1); });
