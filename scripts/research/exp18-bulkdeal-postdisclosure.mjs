#!/usr/bin/env node
//
// Experiment 18 — Post-disclosure drift after disclosed institutional BUY bulk/block deals.
// Pre-registration: ai_docs/sachnetra v2/wiki/experiments/exp18_brief.md
//
// HYPOTHESES (pre-registered, brief §2):
//   H18a  A long-only book that buys at T+1 close (strictly AFTER the EOD NSE deal disclosure) following a
//         disclosed institutional BUY bulk/block deal earns positive SIZE-MATCHED-adjusted CAR over +1..+H.
//   H18b  That edge clears a 250 bps round-trip cost floor on the liquid half, survives a concentration drop,
//         and stays positive after a Deflated Sharpe Ratio penalty for all trials.
//   H18c  BUY–SELL asymmetry (FALSIFICATION/VETO): SELL deals do NOT drift up. If BUY and SELL drift the same
//         way, the signal is "deals cluster in trending names" → KILL regardless of t-stat.
//   H18d  Leakage split (LOAD-BEARING): decompose into PRE[-5..-1]+DAY0 (pre-disclosure, untradeable) vs
//         POST[+1..+H] (tradeable). Alive only if POST carries a materially positive, cost-surviving share.
//
// METHOD (market-adjusted, size-aware long-only event study; reuses the Exp16 harness):
//   - Events    india_bulk_block_deals, deduped to the unit (symbol, deal_date, buy_sell) — quantity summed,
//               price = qty-weighted avg (Exp10 GRASIM anti-inflation lesson).
//   - Ticker    deals store BARE 'AGIIL'; research_prices store 'AGIIL.NS' — both canonicalized (Exp4 bug).
//   - Liquidity Amihud illiquidity below the priced-deal-universe median (drop the illiquid tail).
//   - Material  deal value (qty*price) >= --adv-mult * trailing ADV (a deal too small to signal is noise).
//   - Benchmark SIZE-MATCHED equal-weight basket of the event's own band (midcap150 / smallcap250 /
//               microcap250), daily-rebalanced — NOT ^NSEI (which under-adjusts small caps). 'broad' (names in
//               no band) falls back to ^NSEI.
//   - Windows   PRE = CAR[-5..-1] (leakage), DAY0 = AR[0] (deal/disclosure day), POST = CAR[entry..exit].
//   - Entry/exit buy at T+1 CLOSE (strictly after the T0 disclosure), hold H in {3,5,10}, exit at T+1+H close.
//               [adj-consistent: research_prices open mixes adjustment bases — same choice as Exp16.]
//   - Costs     100 & 250 bps round-trip; accept only on 250.
//
// GATES (brief §4): POST net>250bps for >=1 H (p<0.05) · BUY-SELL asymmetry (SELL not +, BUY-SELL>0) ·
//   leakage split POST share materially + · concentration-robust (drop top-3 events AND days) · DSR>=0.95 ·
//   Theil U<1 · ADF/KPSS · capacity >= ~30 BUY events/yr.
//
// BOUNDARY: READ-ONLY (SELECTs only). Claude authored; Lijo runs. Writes CSV to output/exp18/.
// GATED: run scripts/research/check-deals-coverage.mjs (Exp18 §0 P1–P3) FIRST.
//
// USAGE
//   node scripts/research/exp18-bulkdeal-postdisclosure.mjs --selftest      # synthetic estimator gate (no DB)
//   node scripts/research/exp18-bulkdeal-postdisclosure.mjs
//   node scripts/research/exp18-bulkdeal-postdisclosure.mjs --horizons=3,5,10 --costs=100,250 --adv-mult=0.5

import { loadEnvFile } from '../_seed-utils.mjs';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'output', 'exp18');

// ── flags ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const SELFTEST = has('selftest');
const HORIZONS = flag('horizons', '3,5,10').split(',').map((x) => Number(x.trim())).filter(Boolean);
const COSTS = flag('costs', '100,250').split(',').map((x) => Number(x.trim())).filter(Boolean);
const ADV_MULT = Number(flag('adv-mult', '0.5'));            // deal value >= ADV_MULT * trailing ADV
const ADV_WIN = Number(flag('adv-win', '20'));              // trailing ADV window (trading days)
const ACCEPT_COST = Number(flag('accept-cost', '250'));
const HEADLINE_H = Number(flag('headline-horizon', '5'));
const MIN_EVENTS = Number(flag('min-events', '30'));
const PRE_WIN = 5;                                          // CAR[-5..-1] leakage window
const MAXLAG = 8;
const BAND_FILES = {                                        // size-band membership for the matched benchmark
  midcap: 'shared/nifty-midcap150.json',
  smallcap: 'shared/nifty-smallcap250.json',
  micro: 'shared/nifty-microcap250.json',
};
const RESULTS_DSR_TRIALS = HORIZONS.length * COSTS.length * 2; // ×2 sides; logged into DSR

// ── stats (copied verbatim from exp16 / exp12 / exp15) ──────────────────────────
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
const pctf = (x) => (Number.isNaN(x) ? '   n/a' : `${(x * 100).toFixed(2)}%`);
function quantile(sorted, q) {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); return quantile(s, 0.5); };

// matrix / OLS / ADF / KPSS / DSR — copied from exp16.
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
  const l = Math.floor(4 * (T / 100) ** 0.25); let s2 = e.reduce((s, v) => s + v * v, 0) / T;
  for (let j = 1; j <= l; j++) { let cov = 0; for (let t = j; t < T; t++) cov += e[t] * e[t - j]; cov /= T;
    s2 += 2 * (1 - j / (l + 1)) * cov; }
  return { stat: sumS2 / (T * T * s2), l };
}
function erfInv(x) { const a = 0.147; const l = Math.log(1 - x * x); const t1 = 2 / (Math.PI * a) + l / 2;
  const inner = t1 * t1 - l / a; return Math.sign(x) * Math.sqrt(Math.sqrt(inner) - t1); }
function probit(p) { const c = Math.max(1e-9, Math.min(1 - 1e-9, p)); return Math.SQRT2 * erfInv(2 * c - 1); }
function normCDF(x) { const erf = (z) => { const s = z < 0 ? -1 : 1; z = Math.abs(z);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const t = 1 / (1 + p * z); return s * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z)); };
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

// ── universe helpers ────────────────────────────────────────────────────────────
function normNS(sym) { const s = String(sym).trim().toUpperCase(); if (!s) return null;
  return (s.startsWith('^') || s.endsWith('.NS') || s.endsWith('.BO')) ? s : `${s}.NS`; }
function bareUp(sym) { return String(sym).trim().toUpperCase().replace(/\.(NS|BO)$/i, ''); }
function loadUniverse(path) {
  const raw = JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
  const arr = Array.isArray(raw) ? raw : (raw.registry || raw.symbols || []);
  return new Set(arr.map((e) => (typeof e === 'string' ? e : e.ticker || e.symbol)).map(bareUp).filter(Boolean));
}
function firstAtOrAfter(dates, target) { let lo = 0, hi = dates.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (dates[m] >= target) hi = m; else lo = m + 1; } return lo; }

// Build a per-symbol price record from research_prices rows.
function buildBySym(priceRows) {
  const bySym = new Map();
  for (const r of priceRows) {
    if (!bySym.has(r.symbol)) bySym.set(r.symbol, { dates: [], adj: [], sret: [], turnover: [] });
    const o = bySym.get(r.symbol); const adj = r.adj_close == null ? null : Number(r.adj_close);
    const prev = o.adj.length ? o.adj[o.adj.length - 1] : null;
    o.dates.push(r.d); o.adj.push(adj);
    o.sret.push(prev != null && adj != null && prev > 0 ? adj / prev - 1 : null);
    o.turnover.push(r.close != null && r.volume != null ? Number(r.close) * Number(r.volume) : null);
  }
  return bySym;
}

// Build an equal-weight, daily-rebalanced benchmark from a set of member symbols → {sretByDate, level}.
function buildEqwBench(bySym, memberSyms) {
  const acc = new Map();
  for (const sym of memberSyms) { const o = bySym.get(sym); if (!o) continue;
    for (let i = 0; i < o.dates.length; i++) { const sr = o.sret[i]; if (sr == null) continue;
      const a = acc.get(o.dates[i]) || { sum: 0, n: 0 }; a.sum += sr; a.n++; acc.set(o.dates[i], a); } }
  const sretByDate = new Map([...acc].map(([d, a]) => [d, a.sum / a.n]));
  const allDates = [...sretByDate.keys()].sort();
  const level = new Map(); let lvl = 1;
  for (const d of allDates) { lvl *= 1 + sretByDate.get(d); level.set(d, lvl); }
  return { sretByDate, level };
}
// Benchmark from a single index symbol (e.g. ^NSEI) → {sretByDate, level}.
function buildIndexBench(o) {
  if (!o) return null;
  const sretByDate = new Map(o.dates.map((d, i) => [d, o.sret[i]]).filter(([, v]) => v != null));
  const allDates = [...sretByDate.keys()].sort();
  const level = new Map(); let lvl = 1;
  for (const d of allDates) { lvl *= 1 + (sretByDate.get(d) ?? 0); level.set(d, lvl); }
  return { sretByDate, level };
}

// Core per-event metrics: PRE[-5..-1], DAY0, POST[entry..entry+H] — all market-adjusted. Shared by real + selftest.
function eventMetrics(o, bench, d0, horizons) {
  const maxH = Math.max(...horizons);
  if (d0 < PRE_WIN || d0 + 1 + maxH >= o.dates.length) return null;
  // PRE: cumulative abnormal over [-5..-1]
  let pre = 0; let preOk = true;
  for (let k = d0 - PRE_WIN; k <= d0 - 1; k++) {
    const sr = o.sret[k]; if (sr == null) { preOk = false; break; }
    pre += sr - (bench.sretByDate.get(o.dates[k]) ?? 0);
  }
  if (!preOk) return null;
  const day0 = o.sret[d0] != null ? o.sret[d0] - (bench.sretByDate.get(o.dates[d0]) ?? 0) : null;
  if (day0 == null) return null;
  const entry = d0 + 1;
  const bEnt = bench.level.get(o.dates[entry]);
  const postByH = {};
  for (const H of horizons) {
    const ex = d0 + 1 + H;
    const sRet = o.adj[ex] / o.adj[entry] - 1;
    const bEx = bench.level.get(o.dates[ex]);
    const bRet = bEnt && bEx ? bEx / bEnt - 1 : 0;
    postByH[H] = sRet - bRet;
  }
  return { pre, day0, postByH };
}

// ── selftest (synthetic estimator gate — no DB) ─────────────────────────────────
function runSelftest() {
  console.log('=== Exp18 --selftest (synthetic injected-drift recovery; no DB) ===\n');
  const M = 60, T = 1200; const rng = mulberry32(42);
  const bySym = new Map(); const syms = [];
  for (let s = 0; s < M; s++) {
    const sym = `SYN${s}.NS`; syms.push(sym);
    const dates = [], adj = [], sret = [], turnover = [];
    let p = 100;
    for (let t = 0; t < T; t++) {
      const r = (rng() - 0.5) * 0.02;              // ±1% daily noise
      const prev = p; p *= 1 + r;
      dates.push(dayStr(t)); adj.push(p);
      sret.push(t === 0 ? null : p / prev - 1);
      turnover.push(1e8);                          // big ADV → materiality always passes
    }
    bySym.set(sym, { dates, adj, sret, turnover });
  }
  const bench = buildEqwBench(bySym, syms);

  // helper: measure POST mean at H=5 for events with an injected per-day drift
  function measure(driftPerDay) {
    const posts = [];
    for (let s = 0; s < M; s++) {
      const o = bySym.get(`SYN${s}.NS`);
      // clone adj and inject drift on the 5 days AFTER a fixed event day, recompute that window's metric
      const d0 = 600 + s; // staggered event days
      const o2 = injectDrift(o, d0, 5, driftPerDay);
      const m = eventMetrics(o2, bench, d0, [5]);
      if (m) posts.push(m.postByH[5]);
    }
    return tStat(posts);
  }
  const up = measure(0.004);    // +0.4%/day for 5 days ≈ +2% POST
  const zero = measure(0);
  const down = measure(-0.004);

  console.log(`  injected +0.4%/day (≈+2% POST): mean ${pctf(up.mean)}  t=${up.t.toFixed(2)}  p=${up.p.toFixed(4)} ${stars(up.p)}`);
  console.log(`  zero drift:                     mean ${pctf(zero.mean)}  t=${zero.t.toFixed(2)}  p=${zero.p.toFixed(4)} ${stars(zero.p)}`);
  console.log(`  injected -0.4%/day:             mean ${pctf(down.mean)}  t=${down.t.toFixed(2)}  p=${down.p.toFixed(4)} ${stars(down.p)}`);

  const pass = up.mean > 0.01 && up.p < 0.05 && Math.abs(zero.mean) < 0.005 && zero.p > 0.05 && down.mean < -0.01 && down.p < 0.05;
  console.log(`\n  ${pass ? '✅ SELFTEST PASS' : '❌ SELFTEST FAIL'} — estimator recovers injected sign & magnitude; zero-drift reads null.`);
  process.exit(pass ? 0 : 1);
}
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function dayStr(t) { const d = new Date(Date.UTC(2018, 0, 1) + t * 864e5); return d.toISOString().slice(0, 10); }
function injectDrift(o, d0, H, perDay) {
  // Buy at entry = d0+1 close; the holding-period returns are realized on bars entry+1 .. entry+H.
  // Inject the drift into THOSE bars (not the entry bar) so POST = adj[entry+H]/adj[entry]-1 reflects it.
  const adj = o.adj.slice(), sret = o.sret.slice();
  const entry = d0 + 1;
  for (let k = entry + 1; k <= entry + H && k < adj.length; k++) adj[k] = adj[k - 1] * (1 + (o.sret[k] ?? 0) + perDay);
  for (let k = entry + 1; k <= entry + H && k < adj.length; k++) sret[k] = adj[k] / adj[k - 1] - 1;
  return { dates: o.dates, adj, sret, turnover: o.turnover };
}

// ── main ────────────────────────────────────────────────────────────────────────
async function main() {
  if (SELFTEST) return runSelftest();

  console.log('=== Experiment 18 — Post-disclosure drift after institutional BUY bulk/block deals ===');
  console.log(`  Horizons {${HORIZONS.join(',')}}  ·  costs(bps) {${COSTS.join(',')}}  ·  deal>=${ADV_MULT}×ADV(${ADV_WIN}d)  ·  accept@${ACCEPT_COST}bps  ·  headline H=${HEADLINE_H}\n`);

  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set in .env.local'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // ── band membership (size-matched benchmark) ──
  const bands = {};
  for (const [b, f] of Object.entries(BAND_FILES)) {
    bands[b] = existsSync(join(ROOT, f)) ? loadUniverse(f) : new Set();
    if (!bands[b].size) console.log(`  ⚠ band file missing/empty: ${f} (band '${b}' will be unused)`);
  }
  const bandOf = (bare) => (bands.midcap.has(bare) ? 'midcap' : bands.smallcap.has(bare) ? 'smallcap' : bands.micro.has(bare) ? 'micro' : 'broad');

  // ── events: dedupe to (symbol, deal_date, buy_sell) ──
  const { rows: dealRows } = await pool.query(`
    SELECT upper(symbol) AS symbol, to_char(deal_date,'YYYY-MM-DD') AS deal_date, buy_sell,
           SUM(quantity)::bigint AS qty,
           SUM(quantity * price) / NULLIF(SUM(quantity),0) AS wavg_price
      FROM india_bulk_block_deals
     WHERE symbol IS NOT NULL AND buy_sell IN ('BUY','SELL') AND quantity > 0 AND price > 0
     GROUP BY upper(symbol), deal_date, buy_sell`);
  console.log(`  Deduped deal events (symbol,date,side): ${dealRows.length}`);

  // ── prices: load every symbol we might need (deal names + band members + ^NSEI) ──
  const dealBare = new Set(dealRows.map((r) => bareUp(r.symbol)));
  const need = new Set(['^NSEI']);
  for (const b of dealBare) need.add(`${b}.NS`);
  for (const b of Object.values(bands)) for (const s of b) need.add(`${s}.NS`);
  const { rows: priceRows } = await pool.query(
    `SELECT symbol, to_char(trade_date,'YYYY-MM-DD') AS d, adj_close, close, volume
       FROM research_prices WHERE symbol = ANY($1) ORDER BY symbol, trade_date ASC`, [[...need]]);
  await pool.end();
  const bySym = buildBySym(priceRows);
  console.log(`  Priced symbols loaded: ${bySym.size}  (of ${need.size} requested)`);

  // ── benchmarks per band (built once) ──
  const benchCache = {};
  const getBench = (band) => {
    if (benchCache[band]) return benchCache[band];
    if (band === 'broad') { benchCache[band] = buildIndexBench(bySym.get('^NSEI')) || buildEqwBench(bySym, [...need]); }
    else benchCache[band] = buildEqwBench(bySym, [...bands[band]].map((s) => `${s}.NS`));
    return benchCache[band];
  };

  // ── Amihud liquidity over the priced deal universe ──
  const amihud = [];
  for (const b of dealBare) { const o = bySym.get(`${b}.NS`); if (!o) continue;
    const vals = [];
    for (let i = 0; i < o.dates.length; i++) { const sr = o.sret[i], tv = o.turnover[i];
      if (sr == null || tv == null || tv <= 0) continue; vals.push(Math.abs(sr) / tv); }
    if (vals.length >= 60) amihud.push({ b, illiq: mean(vals) });
  }
  const illiqMed = quantile(amihud.map((a) => a.illiq).sort((x, y) => x - y), 0.5);
  const liquidSet = new Set(amihud.filter((a) => a.illiq < illiqMed).map((a) => a.b));
  console.log(`  Liquid (Amihud below median) deal names: ${liquidSet.size}/${amihud.length} priced\n`);

  // ── build the event set ──
  const events = { BUY: [], SELL: [] };
  let unpriced = 0, illiquid = 0, noBars = 0, tooSmall = 0, broadFallback = 0;
  const maxH = Math.max(...HORIZONS);
  for (const r of dealRows) {
    const bare = bareUp(r.symbol); const sym = `${bare}.NS`;
    const o = bySym.get(sym); if (!o) { unpriced++; continue; }
    if (!liquidSet.has(bare)) { illiquid++; continue; }
    const d0 = firstAtOrAfter(o.dates, r.deal_date);
    if (d0 < Math.max(PRE_WIN, ADV_WIN) || d0 + 1 + maxH >= o.dates.length) { noBars++; continue; }
    // materiality: deal value vs trailing ADV
    const advWindow = o.turnover.slice(d0 - ADV_WIN, d0).filter((x) => x != null && x > 0);
    const adv = advWindow.length ? median(advWindow) : null;
    const dealValue = Number(r.qty) * Number(r.wavg_price);
    if (adv && dealValue < ADV_MULT * adv) { tooSmall++; continue; }
    const band = bandOf(bare); if (band === 'broad') broadFallback++;
    const m = eventMetrics(o, getBench(band), d0, HORIZONS);
    if (!m) { noBars++; continue; }
    events[r.buy_sell].push({ sym, dealDate: r.deal_date, d0, band, dealValue, advRatio: adv ? dealValue / adv : null, o, ...m });
  }
  console.log(`  Event funnel: unpriced ${unpriced} · illiquid ${illiquid} · insufficient-bars ${noBars} · below-${ADV_MULT}×ADV ${tooSmall} · broad-benchmark-fallback ${broadFallback}`);
  console.log(`  USABLE EVENTS — BUY: ${events.BUY.length}  ·  SELL: ${events.SELL.length}\n`);
  if (events.BUY.length < MIN_EVENTS) {
    console.error(`  ⬜ BLOCKED — only ${events.BUY.length} BUY events (< ${MIN_EVENTS}). Backfill deals history (G8) and re-run. (See check-deals-coverage.mjs.)`);
    process.exit(0);
  }

  const span = (set) => { const ds = set.map((e) => e.dealDate).sort(); return { lo: ds[0], hi: ds[ds.length - 1], yrs: (new Date(ds[ds.length - 1]) - new Date(ds[0])) / (365.25 * 864e5) || 1 }; };
  const bspan = span(events.BUY);
  console.log(`  BUY event span: ${bspan.lo} → ${bspan.hi} (${bspan.yrs.toFixed(1)}y) · capacity ~${(events.BUY.length / bspan.yrs).toFixed(0)} BUY events/yr`);
  if (bspan.yrs < 2.5) console.log(`  ⚠ <2.5y of deal history → recency slice degenerate (same Exp16 H16c limitation). Backfill (G8) deepens this.`);
  console.log('');

  // ── per-side × horizon × cost POST table ──
  const tbl = {}; // side -> H -> cost -> stat
  for (const side of ['BUY', 'SELL']) {
    tbl[side] = {};
    console.log(`── ${side} — net POST CAR[+1..+H] (size-matched-adjusted) ──`);
    console.log(`   ${'H'.padStart(3)} ${'cost'.padStart(6)} ${'N'.padStart(5)} ${'net POST'.padStart(9)} ${'t'.padStart(6)} ${'p'.padStart(7)}`);
    for (const H of HORIZONS) {
      tbl[side][H] = {};
      for (const cost of COSTS) {
        const vals = events[side].map((e) => e.postByH[H] - cost / 10000);
        const st = tStat(vals); tbl[side][H][cost] = { st, vals };
        console.log(`   ${String(H).padStart(3)} ${String(cost).padStart(6)} ${String(st.n).padStart(5)} ${pctf(st.mean).padStart(9)} ${st.t.toFixed(2).padStart(6)} ${st.p.toFixed(4).padStart(7)} ${stars(st.p)}`);
      }
    }
    console.log('');
  }

  // ── H18d leakage split (gross, headline H) ──
  const grossPost = (set, H) => mean(set.map((e) => e.postByH[H]));
  const grossBefore = (set) => mean(set.map((e) => e.pre + e.day0));
  const buyBefore = grossBefore(events.BUY), buyPost = grossPost(events.BUY, HEADLINE_H);
  const totalAround = buyBefore + buyPost;
  const postShare = totalAround > 0 ? buyPost / totalAround : NaN;
  console.log(`── H18d leakage split (BUY, gross, H=${HEADLINE_H}) ──`);
  console.log(`   PRE[-5..-1]+DAY0 (pre-disclosure, untradeable): ${pctf(buyBefore)}`);
  console.log(`   POST[+1..+${HEADLINE_H}] (tradeable):             ${pctf(buyPost)}`);
  console.log(`   POST share of total "around-deal" move:        ${Number.isNaN(postShare) ? 'n/a' : (postShare * 100).toFixed(0) + '%'}`);
  console.log(`   ${buyPost - ACCEPT_COST / 10000 > 0 ? '→ tradeable slice clears cost' : '→ tradeable slice does NOT clear cost @' + ACCEPT_COST + 'bps'}\n`);

  // ── H18c BUY–SELL asymmetry (net, headline H, accept-cost) — the VETO ──
  const buyNet = tbl.BUY[HEADLINE_H][ACCEPT_COST].st;
  const sellNet = tbl.SELL[HEADLINE_H] ? tbl.SELL[HEADLINE_H][ACCEPT_COST].st : { mean: NaN, p: NaN };
  const sellGrossPost = events.SELL.length ? grossPost(events.SELL, HEADLINE_H) : NaN;
  const asymmetryOK = events.SELL.length >= 10 && !(sellGrossPost > 0 && buyPost > 0 && Math.sign(sellGrossPost) === Math.sign(buyPost)) && buyPost > sellGrossPost;
  console.log(`── H18c BUY–SELL asymmetry (VETO; gross POST, H=${HEADLINE_H}) ──`);
  console.log(`   BUY gross POST ${pctf(buyPost)}  ·  SELL gross POST ${pctf(sellGrossPost)}  ·  BUY−SELL ${pctf(buyPost - sellGrossPost)}`);
  console.log(`   ${asymmetryOK ? '✓ asymmetry holds (SELL not drifting up with BUY)' : '🚩 asymmetry FAILS → likely "deals cluster in trending names" confound'}\n`);

  // ── concentration check (BUY, accept-cost, headline H) ──
  const carsBuy = events.BUY.map((e) => ({ e, v: e.postByH[HEADLINE_H] - ACCEPT_COST / 10000 }));
  const base = mean(carsBuy.map((c) => c.v));
  const noTop3 = [...carsBuy].sort((a, b) => b.v - a.v).slice(3);
  const byDay = new Map(); for (const c of carsBuy) { const k = c.e.dealDate; (byDay.get(k) || byDay.set(k, []).get(k)).push(c.v); }
  const dropDays = new Set([...byDay.entries()].map(([d, vs]) => ({ d, m: mean(vs) })).sort((a, b) => b.m - a.m).slice(0, 3).map((x) => x.d));
  const noTop3Days = carsBuy.filter((c) => !dropDays.has(c.e.dealDate));
  const m1 = tStat(noTop3.map((c) => c.v)), m2 = tStat(noTop3Days.map((c) => c.v));
  const concOK = base > 0 && m1.mean > 0 && m2.mean > 0;
  const effN = byDay.size;
  console.log(`── Concentration (BUY, ${ACCEPT_COST}bps, H=${HEADLINE_H}) — effective N (distinct event-days) = ${effN} of ${carsBuy.length} ──`);
  console.log(`   base ${pctf(base)} → drop-top3-events ${pctf(m1.mean)} (t=${m1.t.toFixed(2)}) · drop-top3-days ${pctf(m2.mean)} (t=${m2.t.toFixed(2)})  ${base <= 0 ? '— no positive base edge' : (concOK ? '✓ robust' : '🚩 fragile')}\n`);

  // ── daily-series gates (BUY, headline H, accept-cost): Sharpe, DSR, Theil U, ADF, KPSS ──
  const dayAbn = new Map(), dayGross = new Map(), dayBench = new Map();
  const bump = (map, d, v) => { const a = map.get(d) || { sum: 0, n: 0 }; a.sum += v; a.n++; map.set(d, a); };
  for (const e of events.BUY) {
    const bench = getBench(e.band); const entry = e.d0 + 1, ex = e.d0 + 1 + HEADLINE_H;
    for (let k = entry; k <= ex; k++) {
      const d = e.o.dates[k], sr = e.o.sret[k]; if (sr == null) continue;
      const b = bench.sretByDate.get(d) ?? 0;
      let abn = sr - b; if (k === entry) abn -= ACCEPT_COST / 10000;
      bump(dayAbn, d, abn); bump(dayGross, d, sr); bump(dayBench, d, b);
    }
  }
  const activeDates = [...dayAbn.keys()].sort();
  const stratDaily = activeDates.map((d) => dayAbn.get(d).sum / dayAbn.get(d).n);
  const grossDaily = activeDates.map((d) => dayGross.get(d).sum / dayGross.get(d).n);
  const benchDaily = activeDates.map((d) => dayBench.get(d).sum / dayBench.get(d).n);
  const carCurve = []; let cc = 0; for (const r of stratDaily) { cc += r; carCurve.push(cc); }
  const sharpe = (mean(stratDaily) / sd(stratDaily)) * Math.sqrt(252);
  const dsr = calculateDSR(stratDaily, RESULTS_DSR_TRIALS);
  let sd2 = 0, sb2 = 0; for (let i = 0; i < grossDaily.length; i++) { sd2 += (grossDaily[i] - benchDaily[i]) ** 2; sb2 += benchDaily[i] ** 2; }
  const theilU = sb2 > 0 ? Math.sqrt(sd2 / sb2) : NaN;
  const adf = adfTest(carCurve, { regression: 'c' });
  const kpss = kpssTest(carCurve);
  const ADF_CRIT = -2.86, KPSS_CRIT = 0.463;
  console.log(`── Daily-series gates (BUY, H=${HEADLINE_H}, ${ACCEPT_COST}bps; ${activeDates.length} active days) ──`);
  console.log(`   Ann. Sharpe:  ${sharpe.toFixed(2)}`);
  console.log(`   DSR:          ${dsr.dsrValue.toFixed(3)}  (trials N=${RESULTS_DSR_TRIALS}; skew ${dsr.skew?.toFixed(2)}, kurt ${dsr.kurt?.toFixed(2)})  ${dsr.dsrValue >= 0.95 ? 'PASS' : 'FAIL'}`);
  console.log(`   Theil's U:    ${theilU.toFixed(3)}  ${theilU < 1.0 ? 'PASS' : 'FAIL'}`);
  console.log(`   ADF (curve):  t=${adf.t.toFixed(2)}  ${adf.t < ADF_CRIT ? 'PASS' : 'FAIL'}`);
  console.log(`   KPSS (curve): ${kpss.stat.toFixed(3)}  ${kpss.stat < KPSS_CRIT ? 'PASS' : 'FAIL'}\n`);

  // ── pre-registered verdict (brief §4/§5) ──
  const acceptAny = HORIZONS.some((H) => { const s = tbl.BUY[H][ACCEPT_COST].st; return s.mean > 0 && s.p < 0.05; });
  const capacityOK = (events.BUY.length / bspan.yrs) >= 30;
  const allGates = acceptAny && asymmetryOK && (postShare > 0 && buyPost - ACCEPT_COST / 10000 > 0) && concOK
    && dsr.dsrValue >= 0.95 && theilU < 1.0 && adf.t < ADF_CRIT && kpss.stat < KPSS_CRIT && capacityOK;
  console.log('=== Verdict (pre-registered, brief §4/§5 · BUY @' + ACCEPT_COST + 'bps) ===');
  console.log(`   POST net>0 & p<0.05 (≥1 H): ${acceptAny ? '✅' : '❌'}   ·   asymmetry veto: ${asymmetryOK ? '✅' : '🚩'}   ·   leakage POST tradeable: ${(postShare > 0 && buyPost - ACCEPT_COST / 10000 > 0) ? '✅' : '❌'}`);
  console.log(`   concentration: ${base <= 0 ? '—' : (concOK ? '✅' : '🚩')}   ·   DSR≥0.95: ${dsr.dsrValue >= 0.95 ? '✅' : '❌'}   ·   Theil<1: ${theilU < 1.0 ? '✅' : '❌'}   ·   ADF: ${adf.t < ADF_CRIT ? '✅' : '❌'}   ·   KPSS: ${kpss.stat < KPSS_CRIT ? '✅' : '❌'}   ·   capacity≥30/yr: ${capacityOK ? '✅' : '❌'}`);
  console.log(`   → ${allGates ? '✅ SUPPORTED — advance to Gate-1 paper-trade rule.'
    : (!asymmetryOK ? '❌ NULL (confound) — BUY/SELL not asymmetric; deals track trending names, not smart money.'
      : (postShare <= 0 || buyPost - ACCEPT_COST / 10000 <= 0 ? '❌ NULL (leakage) — the tradeable post-disclosure slice does not clear cost; the effect is pre-disclosure.'
        : '❌ NOT SUPPORTED on the primary spec — record null/partial; do not paper-trade.'))}`);
  console.log('   Caveats: survivorship (research_prices = survivors; unpriced deals dropped) · deal-history depth · cross-sectional same-day dependence (see effective N).');

  // ── artifacts ──
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const sumRows = [];
  for (const side of ['BUY', 'SELL']) for (const H of HORIZONS) for (const cost of COSTS) {
    const s = tbl[side][H][cost].st; sumRows.push([side, H, cost, s.n, s.mean, s.t, s.p].join(','));
  }
  writeFileSync(join(OUTPUT_DIR, 'exp18_summary.csv'), ['side,horizon,cost_bps,n,net_post_car,t,p', ...sumRows].join('\n'));
  const evRows = [];
  for (const side of ['BUY', 'SELL']) for (const e of events[side]) {
    evRows.push([side, e.sym, e.dealDate, e.band, Math.round(e.dealValue), e.advRatio ? e.advRatio.toFixed(2) : '', e.pre.toFixed(5), e.day0.toFixed(5), (e.postByH[HEADLINE_H] ?? '')].join(','));
  }
  writeFileSync(join(OUTPUT_DIR, 'exp18_events.csv'), [`side,symbol,deal_date,band,deal_value_inr,adv_ratio,pre_car,day0_ar,post_car_h${HEADLINE_H}`, ...evRows].join('\n'));
  console.log(`\n  Wrote ${join(OUTPUT_DIR, 'exp18_summary.csv')}`);
  console.log(`  Wrote ${join(OUTPUT_DIR, 'exp18_events.csv')}`);
  console.log('\nDone.');
}

main().catch((e) => { console.error('Experiment failed:', e.message); process.exit(1); });
