#!/usr/bin/env node
//
// Experiment 16 — Long-Only Mid-Cap PEAD via Day-0 Price-Reaction (EAR) proxy.
// Pre-registration: ai_docs/sachnetra v2/wiki/experiments/exp16_brief.md  (incl. §5b amendment).
//
// HYPOTHESES (pre-registered, see brief §2):
//   H16a  A long-only book of Nifty-Midcap-150 names that post a top-quintile day-0 Earnings-Announcement
//         Return (EAR) on a results filing earns positive market-adjusted CAR over +1..+H, beating an
//         equal-weighted Midcap-150 benchmark.
//   H16b  That edge survives a 100–250 bps round-trip cost floor on the liquid half, after a Deflated
//         Sharpe Ratio (DSR) penalty for the number of trials.
//   H16c  The edge holds in the most recent ~36 months (the India size anomaly is fading).
//
// METHOD (market-adjusted long-only event study):
//   - EAR_i        = day-0 abnormal return = stock_simple_return(T0) − benchmark_simple_return(T0),
//                    where T0 = first trading day on/after the IST announcement date. Signal is fully
//                    formed at T0 close (no look-ahead). adj_close-based throughout.
//   - §5b rule     PRIMARY: exclude any event with |EAR| > --ear-cap (0.25, above NSE's ±20% circuit —
//                    a real earnings reaction can't exceed it, so larger = split/relisting adj artifact).
//                    ROBUSTNESS variant: winsorize EAR (and per-event CAR) at the 1st/99th pct instead.
//                    The winsor variant is ONE extra DSR trial; the verdict stands on the EXCLUDE spec.
//   - Universe     liquid half of the Midcap-150 by --liquidity (default: Amihud illiquidity below the
//                    universe median; or --liquidity=fno with --fno-file=<json list>).
//   - Benchmark    --benchmark=eqw (default: equal-weight, daily-rebalanced Midcap-150) or an index
//                    symbol present in research_prices (e.g. ^NSEMID).
//   - Selection    long the top --quintile (0.2) of EAR, AND only names trading above their --dma (50)-day
//                    moving average at T0 (value-trap guard). Equal weight.
//   - Entry/exit   buy at T+1 close, hold H ∈ {5,10,15} trading days, exit at T+1+H close (entry strictly
//                    after the T0 signal). [Deviation from brief's "T+1 open": our store has only RAW open,
//                    which mixes adjustment bases with adj_close — T+1 close is the correct adj-consistent
//                    choice. Documented here + in the write-up.]
//   - Costs        apply 100 and 250 bps round-trip; accept only on the conservative 250 bps scenario.
//
// GATES (brief §4): net CAR>0 @250bps for ≥1 H · DSR≥0.95 · recency-positive · concentration-robust
//   (drop top-3 events AND top-3 event-days) · Theil's U<1.0 · ADF p<0.05 & KPSS not-rejected · ≥~30 ev/yr.
//
// CAVEATS (stated loudly): (1) survivorship — nifty-midcap150.json is TODAY's membership, applied back in
//   time; prefer the recency slice. (2) EAR-only (no SUE) captures price reaction, not fundamental surprise.
//   (3) the top-quintile EAR cutoff is computed in-sample (characterization, not a live-tradable threshold).
//
// BOUNDARY: READ-ONLY (SELECTs only). Claude authored; Lijo runs. Writes CSV/summary to output/exp16/.
//
// USAGE
//   node scripts/research/exp16-midcap-pead.mjs
//   node scripts/research/exp16-midcap-pead.mjs --benchmark=^NSEMID --liquidity=fno --fno-file=shared/fno.json
//   node scripts/research/exp16-midcap-pead.mjs --horizons=5,10,15 --costs=100,250 --recency-months=36

import { loadEnvFile } from '../_seed-utils.mjs';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'output', 'exp16');

// ── flags ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const SYMBOLS_FILE = flag('symbols-file', 'shared/nifty-midcap150.json');
const FROM = flag('from', null);                                  // optional start date for the event window
const LIQUIDITY = flag('liquidity', 'amihud');                   // 'amihud' (default) | 'fno'
const FNO_FILE = flag('fno-file', null);                         // required if --liquidity=fno
const BENCHMARK = flag('benchmark', 'eqw');                      // 'eqw' (default) | an index symbol in research_prices
const HORIZONS = flag('horizons', '5,10,15').split(',').map((x) => Number(x.trim())).filter(Boolean);
const COSTS = flag('costs', '100,250').split(',').map((x) => Number(x.trim())).filter(Boolean); // bps round-trip
const EAR_CAP = Number(flag('ear-cap', '0.25'));                 // §5b primary: exclude |EAR| above this
const QUINTILE = Number(flag('quintile', '0.2'));               // long the top 20% of EAR
const DMA = Number(flag('dma', '50'));                          // trend filter: enter only if adj_close > N-DMA at T0
const MIN_EVENTS = Number(flag('min-events', '30'));
const RECENCY_MONTHS = Number(flag('recency-months', '36'));
const HEADLINE_H = Number(flag('headline-horizon', '10'));      // horizon used for the daily-series gates
const ACCEPT_COST = Number(flag('accept-cost', '250'));         // conservative cost scenario for acceptance
const MAXLAG = 8;

// Bad bars the spot-check flagged (§5b defensive exclusion). Any event touching one is dropped.
const BAD_BARS = new Set(['KEI.NS|2010-01-27', 'BANKINDIA.NS|2009-07-01']);

const RESULTS_RE = /financial result|unaudited|audited.*result|quarterly result/; // same buckets as exp2/exp10

// ── stats (reused verbatim from exp2 / exp12 / exp15) ─────────────────────────
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
function twoSidedP(t) {
  const z = Math.abs(t);
  const erf = (x) => { const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const tt = 1 / (1 + p * x);
    return s * (1 - (((((a5 * tt + a4) * tt) + a3) * tt + a2) * tt + a1) * tt * Math.exp(-x * x)); };
  return 2 * (1 - 0.5 * (1 + erf(z / Math.SQRT2)));
}
function tStat(arr) {
  const n = arr.length; if (n < 2) return { n, mean: NaN, t: NaN, p: NaN };
  const m = mean(arr); const s = sd(arr); const t = m / (s / Math.sqrt(n));
  return { n, mean: m, sd: s, t, p: twoSidedP(t) };
}
const stars = (p) => (p < 0.01 ? '***' : p < 0.05 ? '**' : p < 0.1 ? '*' : '');
const pctf = (x) => `${(x * 100).toFixed(2)}%`;
function quantile(sorted, q) { // sorted asc
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// matrix / OLS / ADF / KPSS / DSR — copied from exp12 (ADF) and exp15 (KPSS, DSR).
function invert(A) {
  const n = A.length; const M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let piv = col; for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col]; for (let j = 0; j < 2 * n; j++) M[col][j] /= d;
    for (let r = 0; r < n; r++) { if (r === col) continue; const f = M[r][col]; if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[col][j]; }
  }
  return M.map((row) => row.slice(n));
}
function olsFit(X, Y) {
  const n = X.length, k = X[0].length;
  const XtX = Array.from({ length: k }, () => Array(k).fill(0)); const Xty = Array(k).fill(0);
  for (let i = 0; i < n; i++) { const xi = X[i];
    for (let a = 0; a < k; a++) { Xty[a] += xi[a] * Y[i]; for (let b = a; b < k; b++) XtX[a][b] += xi[a] * xi[b]; } }
  for (let a = 0; a < k; a++) for (let b = 0; b < a; b++) XtX[a][b] = XtX[b][a];
  const inv = invert(XtX); if (!inv) return null;
  const beta = Array(k).fill(0);
  for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) beta[a] += inv[a][b] * Xty[b];
  let rss = 0; for (let i = 0; i < n; i++) { let yh = 0; for (let a = 0; a < k; a++) yh += X[i][a] * beta[a]; const r = Y[i] - yh; rss += r * r; }
  const dof = n - k; const sigma2 = dof > 0 ? rss / dof : NaN;
  const se = Array.from({ length: k }, (_, a) => Math.sqrt(sigma2 * inv[a][a]));
  return { beta, se, rss, n, k };
}
function adfTest(y, { regression = 'c', maxLag = MAXLAG } = {}) {
  const T = y.length; const withConst = regression === 'c'; let best = { aic: Infinity, t: NaN, usedLag: NaN, nobs: 0 };
  for (let p = 0; p <= maxLag; p++) {
    const X = [], Y = [];
    for (let t = p + 1; t < T; t++) { const row = []; if (withConst) row.push(1); row.push(y[t - 1]);
      for (let kk = 1; kk <= p; kk++) row.push(y[t - kk] - y[t - kk - 1]); X.push(row); Y.push(y[t] - y[t - 1]); }
    if (X.length === 0) continue; const n = X.length, k = X[0].length; if (n <= k + 2) continue;
    const fit = olsFit(X, Y); if (!fit) continue;
    const aic = n * Math.log(fit.rss / n) + 2 * k;
    if (aic < best.aic) { const lvlIdx = withConst ? 1 : 0; best = { aic, t: fit.beta[lvlIdx] / fit.se[lvlIdx], usedLag: p, nobs: n }; }
  }
  return best;
}
function kpssTest(y) {
  const T = y.length; const m = mean(y); const e = y.map((x) => x - m);
  const S = new Array(T).fill(0); S[0] = e[0]; for (let t = 1; t < T; t++) S[t] = S[t - 1] + e[t];
  let sumS2 = 0; for (let t = 0; t < T; t++) sumS2 += S[t] * S[t];
  const l = Math.floor(4 * Math.pow(T / 100, 0.25)); let s2 = e.reduce((s, v) => s + v * v, 0) / T;
  for (let j = 1; j <= l; j++) { let cov = 0; for (let t = j; t < T; t++) cov += e[t] * e[t - j]; cov /= T;
    s2 += 2 * (1 - j / (l + 1)) * cov; }
  return { stat: sumS2 / (T * T * s2), l };
}
function erfInv(x) { const a = 0.147; const l = Math.log(1 - x * x); const t1 = 2 / (Math.PI * a) + l / 2;
  const inner = t1 * t1 - l / a; return Math.sign(x) * Math.sqrt(Math.sqrt(inner) - t1); }
function probit(p) { const c = Math.max(1e-9, Math.min(1 - 1e-9, p)); return Math.SQRT2 * erfInv(2 * c - 1); }
function normCDF(x) { const erf = (x) => { const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const t = 1 / (1 + p * x); return s * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)); };
  return 0.5 * (1 + erf(x / Math.SQRT2)); }
function calculateDSR(rets, trials = 10, sigmaSR = 0.5) {
  const T = rets.length; if (T < 3) return { dsrValue: 0 };
  const m = mean(rets), std = sd(rets); const srDaily = m / std;
  const gamma_e = 0.5772156649; const z1 = probit(1 - 1 / trials); const z2 = probit(1 - 1 / (trials * Math.E));
  const sr0_ann = sigmaSR * ((1 - gamma_e) * z1 + gamma_e * z2); const sr0_daily = sr0_ann / Math.sqrt(252);
  let s3 = 0, s4 = 0; for (let i = 0; i < T; i++) { const d = rets[i] - m; s3 += d ** 3; s4 += d ** 4; }
  const skew = s3 / (T * std ** 3), kurt = s4 / (T * std ** 4);
  const Z = ((srDaily - sr0_daily) * Math.sqrt(T - 1)) / Math.sqrt(1 - skew * srDaily + ((kurt - 1) / 4) * srDaily * srDaily);
  return { dsrValue: normCDF(Z), skew, kurt, srDaily, sr0_daily };
}

// ── universe + search helpers ────────────────────────────────────────────────
function normalizeYahoo(sym) { const s = String(sym).trim().toUpperCase(); if (!s) return null;
  return (s.startsWith('^') || s.endsWith('.NS') || s.endsWith('.BO')) ? s : `${s}.NS`; }
function loadUniverse(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8')); const arr = Array.isArray(raw) ? raw : (raw.registry || raw.symbols || []);
  return [...new Set(arr.map((e) => (typeof e === 'string' ? e : e.ticker || e.symbol)).map(normalizeYahoo).filter(Boolean))];
}
function firstAtOrAfter(dates, target) { let lo = 0, hi = dates.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (dates[m] >= target) hi = m; else lo = m + 1; } return lo; }
function winsorize(vals, lo, hi) { const s = [...vals].sort((a, b) => a - b); const L = quantile(s, lo), H = quantile(s, hi);
  return vals.map((v) => Math.min(H, Math.max(L, v))); }

async function main() {
  console.log('=== Experiment 16 — Long-only mid-cap PEAD (EAR proxy) ===');
  console.log(`  Universe:   ${SYMBOLS_FILE}   ·   liquidity=${LIQUIDITY}   ·   benchmark=${BENCHMARK}`);
  console.log(`  Horizons:   {${HORIZONS.join(',')}}   ·   costs(bps): {${COSTS.join(',')}}   ·   top-quintile=${QUINTILE}   ·   ${DMA}-DMA trend filter`);
  console.log(`  §5b:        PRIMARY exclude |EAR|>${EAR_CAP}; winsor(1/99) robustness variant`);
  console.log(`  Window:     ${FROM || 'full history'} → today   ·   recency slice: last ${RECENCY_MONTHS} months\n`);

  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set in .env.local'); process.exit(1); }
  const universe = loadUniverse(SYMBOLS_FILE);
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // ── prices: per-symbol arrays (adj_close-based simple returns + rupee turnover for Amihud) ──
  const benchSymbols = BENCHMARK === 'eqw' ? universe : [...universe, normalizeYahoo(BENCHMARK)];
  const { rows: priceRows } = await pool.query(
    `SELECT symbol, to_char(trade_date,'YYYY-MM-DD') AS d, adj_close, close, volume
       FROM research_prices WHERE symbol = ANY($1) ORDER BY symbol, trade_date ASC`, [benchSymbols]);
  const bySym = new Map(); // symbol -> { dates, adj, sret, turnover }
  for (const r of priceRows) {
    if (!bySym.has(r.symbol)) bySym.set(r.symbol, { dates: [], adj: [], sret: [], turnover: [] });
    const o = bySym.get(r.symbol); const adj = r.adj_close == null ? null : Number(r.adj_close);
    const prev = o.adj.length ? o.adj[o.adj.length - 1] : null;
    o.dates.push(r.d); o.adj.push(adj);
    o.sret.push(prev != null && adj != null && prev > 0 ? adj / prev - 1 : null);
    o.turnover.push(r.close != null && r.volume != null ? Number(r.close) * Number(r.volume) : null);
  }

  // ── benchmark daily series + cumulative level ──
  let benchSretByDate; // Map date -> benchmark simple return
  if (BENCHMARK === 'eqw') {
    const acc = new Map(); // date -> {sum,n}
    for (const sym of universe) { const o = bySym.get(sym); if (!o) continue;
      for (let i = 0; i < o.dates.length; i++) { const sr = o.sret[i]; if (sr == null) continue;
        const a = acc.get(o.dates[i]) || { sum: 0, n: 0 }; a.sum += sr; a.n++; acc.set(o.dates[i], a); } }
    benchSretByDate = new Map([...acc].map(([d, a]) => [d, a.sum / a.n]));
  } else {
    const o = bySym.get(normalizeYahoo(BENCHMARK));
    if (!o) { console.error(`ERROR: benchmark ${BENCHMARK} not in research_prices. Use --benchmark=eqw or backfill it.`); await pool.end(); process.exit(1); }
    benchSretByDate = new Map(o.dates.map((d, i) => [d, o.sret[i]]).filter(([, v]) => v != null));
  }
  const allDates = [...benchSretByDate.keys()].sort();
  const benchLevel = new Map(); let lvl = 1; // cumulative daily-rebalanced benchmark level
  for (const d of allDates) { lvl *= 1 + benchSretByDate.get(d); benchLevel.set(d, lvl); }

  // ── liquidity filter ──
  let liquidSet;
  if (LIQUIDITY === 'fno') {
    if (!FNO_FILE) { console.error('ERROR: --liquidity=fno requires --fno-file=<json list of symbols>'); await pool.end(); process.exit(1); }
    liquidSet = new Set(loadUniverse(FNO_FILE).filter((s) => universe.includes(s)));
  } else {
    const amihud = []; // {sym, illiq}
    for (const sym of universe) { const o = bySym.get(sym); if (!o) continue;
      const vals = [];
      for (let i = 0; i < o.dates.length; i++) { if (FROM && o.dates[i] < FROM) continue;
        const sr = o.sret[i], tv = o.turnover[i]; if (sr == null || tv == null || tv <= 0) continue; vals.push(Math.abs(sr) / tv); }
      if (vals.length >= 60) amihud.push({ sym, illiq: mean(vals) });
    }
    const med = quantile(amihud.map((a) => a.illiq).sort((a, b) => a - b), 0.5);
    liquidSet = new Set(amihud.filter((a) => a.illiq < med).map((a) => a.sym)); // below-median illiquidity = liquid
  }
  console.log(`  Liquid universe: ${liquidSet.size}/${universe.length} names (${LIQUIDITY})\n`);

  // ── announcements: results events ──
  const annParams = []; let annWhere = 'symbol IS NOT NULL';
  if (FROM) { annParams.push(FROM); annWhere += ` AND announced_at >= $${annParams.length}`; }
  const { rows: annRows } = await pool.query(
    `SELECT symbol, category, subject,
            to_char((announced_at AT TIME ZONE 'Asia/Kolkata')::date,'YYYY-MM-DD') AS ann_date
       FROM india_bourse_announcements WHERE ${annWhere}`, annParams);
  await pool.end();

  // ── build the raw event set (results · liquid · enough bars · EAR · trend) ──
  const maxH = Math.max(...HORIZONS);
  const raw = []; let scanned = 0, notResults = 0, notLiquid = 0, noBars = 0, badBar = 0;
  for (const a of annRows) {
    if (!RESULTS_RE.test(`${a.category} ${a.subject}`.toLowerCase())) { notResults++; continue; }
    scanned++;
    const sym = `${a.symbol}.NS`;
    if (!liquidSet.has(sym)) { notLiquid++; continue; }
    const o = bySym.get(sym); if (!o) { notLiquid++; continue; }
    const p0 = firstAtOrAfter(o.dates, a.ann_date);
    if (p0 < Math.max(1, DMA) || p0 + 1 + maxH >= o.dates.length) { noBars++; continue; }
    if (BAD_BARS.has(`${sym}|${o.dates[p0]}`) || BAD_BARS.has(`${sym}|${o.dates[p0 - 1]}`)) { badBar++; continue; }
    const ear = o.sret[p0] != null ? o.sret[p0] - (benchSretByDate.get(o.dates[p0]) ?? 0) : null;
    if (ear == null) { noBars++; continue; }
    const sma = mean(o.adj.slice(p0 - DMA + 1, p0 + 1));
    raw.push({ sym, annDate: a.ann_date, t0Date: o.dates[p0], p0, ear, trendOK: o.adj[p0] > sma, o });
  }
  console.log(`  Announcements scanned: ${annRows.length}  ·  results: ${scanned}  (non-results ${notResults})`);
  console.log(`  Dropped — illiquid/unpriced: ${notLiquid}  ·  insufficient bars: ${noBars}  ·  bad-bar: ${badBar}`);
  console.log(`  Raw results-events on liquid names with full window: ${raw.length}\n`);
  if (raw.length < MIN_EVENTS) { console.error(`ERROR: only ${raw.length} events (< --min-events=${MIN_EVENTS}). Widen window or universe.`); process.exit(1); }

  // ── per-event holding CAR for a horizon (market-adjusted, net of cost) ──
  const carFor = (e, H, costBps) => {
    const ent = e.p0 + 1, ex = e.p0 + 1 + H;
    const sRet = e.o.adj[ex] / e.o.adj[ent] - 1;
    const bEnt = benchLevel.get(e.o.dates[ent]), bEx = benchLevel.get(e.o.dates[ex]);
    const bRet = bEnt && bEx ? bEx / bEnt - 1 : 0;
    return sRet - bRet - costBps / 10000; // market-adjusted, net round-trip cost
  };

  const recencyCutoff = (() => { const d = new Date(); d.setMonth(d.getMonth() - RECENCY_MONTHS); return d.toISOString().slice(0, 10); })();
  const annDatesSorted = raw.map((e) => e.annDate).sort();
  const yearsSpan = (new Date(annDatesSorted[annDatesSorted.length - 1]) - new Date(annDatesSorted[0])) / (365.25 * 864e5) || 1;
  const recencyDegenerate = annDatesSorted[0] >= recencyCutoff;
  console.log(`  Event span: ${annDatesSorted[0]} → ${annDatesSorted[annDatesSorted.length - 1]} (${yearsSpan.toFixed(1)}y) · recency cutoff ${recencyCutoff}`);
  if (recencyDegenerate) console.log(`  ⚠ ALL events fall inside the recency window → H16c is DEGENERATE (full sample == recent slice); the recency gate cannot discriminate here.\n`);
  else console.log('');

  // ── selection per variant ──
  function selectEvents(variant) {
    let pool2 = raw;
    let earOf = new Map(raw.map((e) => [e, e.ear]));
    if (variant === 'exclude') {
      pool2 = raw.filter((e) => Math.abs(e.ear) <= EAR_CAP);
    } else { // winsor: keep all, winsorize EAR for ranking
      const w = winsorize(raw.map((e) => e.ear), 0.01, 0.99);
      earOf = new Map(raw.map((e, i) => [e, w[i]]));
    }
    const cutoff = quantile(pool2.map((e) => earOf.get(e)).sort((a, b) => a - b), 1 - QUINTILE);
    const selected = pool2.filter((e) => earOf.get(e) >= cutoff && e.trendOK);
    return { selected, cutoff, considered: pool2.length };
  }

  // ── headline cross-sectional table per variant ──
  const VARIANTS = ['exclude', 'winsor'];
  const DSR_TRIALS = HORIZONS.length * COSTS.length * VARIANTS.length;
  const summaryRows = []; // for CSV
  const results = {}; // variant -> { selected, cutoff, perHC: Map('H|cost'->stat) }

  for (const variant of VARIANTS) {
    const { selected, cutoff, considered } = selectEvents(variant);
    console.log(`── Variant: ${variant.toUpperCase()}  (top-${(QUINTILE * 100).toFixed(0)}% EAR cutoff=${pctf(cutoff)}; ${considered} considered → ${selected.length} selected after ${DMA}-DMA filter) ──`);
    console.log(`   capacity: ~${(selected.length / yearsSpan).toFixed(1)} events/yr`);
    console.log(`   ${'H'.padStart(3)} ${'cost'.padStart(6)}  ${'N'.padStart(4)}  ${'net CAR'.padStart(9)} ${'t'.padStart(6)} ${'p'.padStart(7)}   recency(netCAR,N)`);
    const perHC = new Map();
    for (const H of HORIZONS) for (const cost of COSTS) {
      let cars = selected.map((e) => ({ e, v: carFor(e, H, cost) }));
      if (variant === 'winsor') { const w = winsorize(cars.map((c) => c.v), 0.01, 0.99); cars = cars.map((c, i) => ({ ...c, v: w[i] })); }
      const vals = cars.map((c) => c.v);
      const st = tStat(vals);
      const rec = selected.filter((e) => e.annDate >= recencyCutoff).map((e) => carFor(e, H, cost));
      const recMean = rec.length >= 5 ? mean(rec) : NaN;
      perHC.set(`${H}|${cost}`, { st, cars, recMean, recN: rec.length });
      console.log(`   ${String(H).padStart(3)} ${String(cost).padStart(6)}  ${String(st.n).padStart(4)}  ${pctf(st.mean).padStart(9)} ${st.t.toFixed(2).padStart(6)} ${st.p.toFixed(4).padStart(7)} ${stars(st.p)}   ${Number.isNaN(recMean) ? 'n/a' : pctf(recMean)} (${rec.length})`);
      summaryRows.push({ variant, H, cost, n: st.n, netCAR: st.mean, t: st.t, p: st.p, recCAR: recMean, recN: rec.length });
    }
    results[variant] = { selected, cutoff, perHC };
    console.log('');
  }

  // ── concentration robustness (primary spec, accept-cost) ──
  console.log(`── Concentration check (EXCLUDE variant, ${ACCEPT_COST}bps) — drop top-3 events AND top-3 event-days ──`);
  for (const H of HORIZONS) {
    const { cars } = results.exclude.perHC.get(`${H}|${ACCEPT_COST}`);
    const base = mean(cars.map((c) => c.v));
    const noTop3 = [...cars].sort((a, b) => b.v - a.v).slice(3); // drop 3 most positive events
    const byDay = new Map(); for (const c of cars) { const k = c.e.t0Date; (byDay.get(k) || byDay.set(k, []).get(k)).push(c.v); }
    const dayMeans = [...byDay.entries()].map(([d, vs]) => ({ d, m: mean(vs) })).sort((a, b) => b.m - a.m);
    const dropDays = new Set(dayMeans.slice(0, 3).map((x) => x.d));
    const noTop3Days = cars.filter((c) => !dropDays.has(c.e.t0Date));
    const m1 = tStat(noTop3.map((c) => c.v)), m2 = tStat(noTop3Days.map((c) => c.v));
    const label = base <= 0 ? '— no positive base edge (concentration test moot)' : (m1.mean > 0 && m2.mean > 0 ? '✓ robust' : '🚩 fragile (edge was top-event-driven)');
    console.log(`   H=${H}: base ${pctf(base)} → drop-top3-events ${pctf(m1.mean)} (t=${m1.t.toFixed(2)}) · drop-top3-days ${pctf(m2.mean)} (t=${m2.t.toFixed(2)})  ${label}`);
  }
  console.log('');

  // ── daily-series gates (EXCLUDE variant, headline H, accept-cost): Sharpe, DSR, Theil's U, ADF, KPSS ──
  const { selected } = results.exclude;
  const dayAbn = new Map(), dayGross = new Map(), dayBench = new Map(); // date -> {sum,n}
  const bump = (map, d, v) => { const a = map.get(d) || { sum: 0, n: 0 }; a.sum += v; a.n++; map.set(d, a); };
  for (const e of selected) {
    const ent = e.p0 + 1, ex = e.p0 + 1 + HEADLINE_H;
    for (let k = ent; k <= ex; k++) {
      const d = e.o.dates[k], sr = e.o.sret[k]; if (sr == null) continue;
      const b = benchSretByDate.get(d) ?? 0;
      let abn = sr - b; if (k === ent) abn -= ACCEPT_COST / 10000; // round-trip cost drag at entry
      bump(dayAbn, d, abn); bump(dayGross, d, sr); bump(dayBench, d, b);
    }
  }
  const activeDates = [...dayAbn.keys()].sort();
  const stratDaily = activeDates.map((d) => dayAbn.get(d).sum / dayAbn.get(d).n);
  const grossDaily = activeDates.map((d) => dayGross.get(d).sum / dayGross.get(d).n);
  const benchDaily = activeDates.map((d) => dayBench.get(d).sum / dayBench.get(d).n);
  const carCurve = []; let c = 0; for (const r of stratDaily) { c += r; carCurve.push(c); }

  const sharpe = (mean(stratDaily) / sd(stratDaily)) * Math.sqrt(252);
  const dsr = calculateDSR(stratDaily, DSR_TRIALS);
  let sd2 = 0, sb2 = 0; for (let i = 0; i < grossDaily.length; i++) { sd2 += (grossDaily[i] - benchDaily[i]) ** 2; sb2 += benchDaily[i] ** 2; }
  const theilU = sb2 > 0 ? Math.sqrt(sd2 / sb2) : NaN;
  const adf = adfTest(carCurve, { regression: 'c' });
  const kpss = kpssTest(carCurve);
  const ADF_CRIT = -2.86, KPSS_CRIT = 0.463; // 5% (constant / level)

  console.log(`── Daily-series gates (EXCLUDE, H=${HEADLINE_H}, ${ACCEPT_COST}bps; ${activeDates.length} active days) ──`);
  console.log(`   Ann. Sharpe:   ${sharpe.toFixed(2)}`);
  console.log(`   DSR:           ${dsr.dsrValue.toFixed(3)}  (trials N=${DSR_TRIALS}; skew ${dsr.skew?.toFixed(2)}, kurt ${dsr.kurt?.toFixed(2)})  ${dsr.dsrValue >= 0.95 ? 'PASS' : 'FAIL'} (≥0.95)`);
  console.log(`   Theil's U:     ${theilU.toFixed(3)}  ${theilU < 1.0 ? 'PASS' : 'FAIL'} (<1.0 vs benchmark)`);
  console.log(`   ADF (CAR):     t=${adf.t.toFixed(2)} (lag ${adf.usedLag})  ${adf.t < ADF_CRIT ? 'PASS' : 'FAIL'} (<${ADF_CRIT})`);
  console.log(`   KPSS (CAR):    stat=${kpss.stat.toFixed(3)}  ${kpss.stat < KPSS_CRIT ? 'PASS' : 'FAIL'} (<${KPSS_CRIT}, level-stationary)`);
  console.log('');

  // ── pre-registered verdict (brief §4) — verdict stands on the EXCLUDE spec ──
  const accAny = HORIZONS.some((H) => results.exclude.perHC.get(`${H}|${ACCEPT_COST}`).st.mean > 0 && results.exclude.perHC.get(`${H}|${ACCEPT_COST}`).st.p < 0.05);
  const recAny = HORIZONS.some((H) => { const r = results.exclude.perHC.get(`${H}|${ACCEPT_COST}`); return r.recN >= 5 && r.recMean > 0; });
  const gatesPass = accAny && recAny && dsr.dsrValue >= 0.95 && theilU < 1.0 && adf.t < ADF_CRIT && kpss.stat < KPSS_CRIT;
  console.log('=== Verdict (pre-registered, brief §4 · EXCLUDE spec @' + ACCEPT_COST + 'bps) ===');
  console.log(`   net CAR>0 & p<0.05 (≥1 H): ${accAny ? '✅' : '❌'}   ·   recency-positive: ${recAny ? '✅' : '❌'}`);
  console.log(`   DSR≥0.95: ${dsr.dsrValue >= 0.95 ? '✅' : '❌'}   ·   Theil U<1: ${theilU < 1.0 ? '✅' : '❌'}   ·   ADF: ${adf.t < ADF_CRIT ? '✅' : '❌'}   ·   KPSS: ${kpss.stat < KPSS_CRIT ? '✅' : '❌'}`);
  console.log(`   → ${gatesPass ? '✅ SUPPORTED — all pre-registered gates cleared. Advance to Gate-1 paper-trading.'
    : '❌ NOT SUPPORTED on the primary spec. Record as null/partial; do NOT advance on the winsor variant alone.'}`);
  console.log('   Caveats: survivorship (today\'s Midcap-150 back-applied) · EAR-only proxy (no SUE) · in-sample quintile cutoff.');

  // ── write artifacts ──
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const csv = ['variant,horizon,cost_bps,n,net_car,t,p,recency_car,recency_n',
    ...summaryRows.map((r) => [r.variant, r.H, r.cost, r.n, r.netCAR, r.t, r.p, r.recCAR, r.recN].join(','))].join('\n');
  writeFileSync(join(OUTPUT_DIR, 'exp16_summary.csv'), csv);
  const evCsv = ['variant,symbol,ann_date,t0_date,ear,trend_ok',
    ...VARIANTS.flatMap((v) => results[v].selected.map((e) => [v, e.sym, e.annDate, e.t0Date, e.ear.toFixed(5), e.trendOK].join(',')))].join('\n');
  writeFileSync(join(OUTPUT_DIR, 'exp16_selected_events.csv'), evCsv);
  console.log(`\n  Wrote ${join(OUTPUT_DIR, 'exp16_summary.csv')}`);
  console.log(`  Wrote ${join(OUTPUT_DIR, 'exp16_selected_events.csv')}`);
  console.log('\nDone.');
}

main().catch((e) => { console.error('Experiment failed:', e.message); process.exit(1); });
