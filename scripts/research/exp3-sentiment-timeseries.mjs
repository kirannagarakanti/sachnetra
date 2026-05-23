#!/usr/bin/env node
//
// Experiment 3 — Is news sentiment a well-behaved, predictive time series?
// See: ai_docs/sachnetra v2/wiki/syntheses/sachnetra_research_playbook.md
//
// HYPOTHESES:
//   H3a (ARIMA pre-flight): the daily-mean sentiment series is STATIONARY
//       (ADF test) and AUTOCORRELATED (ACF / AR(1) / Ljung-Box) — i.e. is it
//       even valid to model with ARIMA, and does yesterday's mood inform today's?
//   H3b (value): daily-mean sentiment on day T predicts the ^NSEI return on T+1
//       (no look-ahead), and is it leading or merely coincident (same-day check)?
//
// METHOD:
//   Daily mean of india_news_signals.sentiment_score (IST day). Then:
//     • descriptive stats + per-day headline counts (thin days are noisy means)
//     • ACF at lags 1..5 with ±1.96/sqrt(N) significance band
//     • AR(1): sentiment_t ~ sentiment_t-1 (OLS)
//     • Dickey-Fuller unit-root test: Δsent_t ~ const + sent_t-1  (tau vs DF crit)
//     • Ljung-Box Q(5) for joint autocorrelation
//     • predictive: sent_T vs ^NSEI return_T+1 (no look-ahead) + same-day check
//
// HONESTY NOTE: sentiment scoring began ~2026-05-06, so the daily series is only
//   ~16 points. ADF/ARIMA/forecast statistics need ~30–50+ daily obs to mean
//   anything. This run is a METHOD pre-flight + a baseline to repeat monthly as
//   the series deepens — NOT a basis for conclusions. The script says so loudly.
//
// BOUNDARY: read-only. SELECTs only. Claude authors; Lijo runs.
// PREREQUISITE: research_prices populated (for the H3b return join).
//
// USAGE
//   node scripts/research/exp3-sentiment-timeseries.mjs
//   node scripts/research/exp3-sentiment-timeseries.mjs --min-headlines=10   # drop thin days
//   node scripts/research/exp3-sentiment-timeseries.mjs --market-moving-only

import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const MIN_HEADLINES = Number(flag('min-headlines', '1'));
const MM_ONLY = args.includes('--market-moving-only');
const INDEX_SYMBOL = flag('index', '^NSEI');

// ── stats helpers (no deps) ─────────────────────────────────────────────────
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
function ols(xs, ys) {
  const n = xs.length, mx = mean(xs), my = mean(ys);
  let Sxx = 0, Sxy = 0, Syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; Sxx += dx * dx; Sxy += dx * dy; Syy += dy * dy; }
  const slope = Sxy / Sxx, intercept = my - slope * mx, r = Sxy / Math.sqrt(Sxx * Syy);
  const rss = Syy - slope * Sxy, seSlope = Math.sqrt((rss / (n - 2)) / Sxx), t = slope / seSlope;
  return { n, slope, intercept, r, r2: r * r, t, se: seSlope, p: twoSidedP(t) };
}
function twoSidedP(t) {
  const z = Math.abs(t);
  const erf = (x) => { const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
    const tt = 1/(1+p*x); return s*(1-(((((a5*tt+a4)*tt)+a3)*tt+a2)*tt+a1)*tt*Math.exp(-x*x)); };
  return 2 * (1 - 0.5 * (1 + erf(z / Math.SQRT2)));
}
function acf(y, k) {
  const n = y.length, m = mean(y);
  let num = 0, den = 0;
  for (let t = 0; t < n; t++) den += (y[t] - m) ** 2;
  for (let t = k; t < n; t++) num += (y[t] - m) * (y[t - k] - m);
  return num / den;
}
// Dickey-Fuller (no augmentation): Δy_t = a + γ·y_{t-1} + e ; tau = γ/se(γ)
function dickeyFuller(y) {
  const yl = [], dy = [];
  for (let t = 1; t < y.length; t++) { yl.push(y[t - 1]); dy.push(y[t] - y[t - 1]); }
  const reg = ols(yl, dy);
  return { tau: reg.t, gamma: reg.slope, n: reg.n }; // compare tau to DF critical values
}
const stars = (p) => (p < 0.01 ? '***' : p < 0.05 ? '**' : p < 0.1 ? '*' : '');
const f4 = (x) => (x == null || Number.isNaN(x) ? '  n/a' : x.toFixed(4));

function firstAfter(dates, target) {
  let lo = 0, hi = dates.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (dates[m] > target) hi = m; else lo = m + 1; }
  return lo;
}

async function main() {
  console.log('=== Experiment 3 — news sentiment as a time series ===');
  console.log(`  Source: india_news_signals.sentiment_score, daily mean (IST)`);
  console.log(`  Filters: min headlines/day=${MIN_HEADLINES}${MM_ONLY ? ', market-moving only' : ''}`);

  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  const where = `sentiment_score IS NOT NULL${MM_ONLY ? ' AND is_market_moving' : ''}`;
  const { rows: dayRows } = await pool.query(
    `SELECT to_char((scraped_at AT TIME ZONE 'Asia/Kolkata')::date,'YYYY-MM-DD') AS d,
            count(*) AS n, avg(sentiment_score)::float AS avg
       FROM india_news_signals WHERE ${where}
       GROUP BY 1 ORDER BY 1 ASC`);

  const { rows: priceRows } = await pool.query(
    `SELECT to_char(trade_date,'YYYY-MM-DD') AS d, log_return AS r
       FROM research_prices WHERE symbol = $1 AND log_return IS NOT NULL ORDER BY trade_date ASC`,
    [INDEX_SYMBOL]);
  await pool.end();

  // ── Build the daily series ──
  const all = dayRows.map((r) => ({ d: r.d, n: Number(r.n), avg: Number(r.avg) }));
  const series = all.filter((r) => r.n >= MIN_HEADLINES);
  const sent = series.map((r) => r.avg);
  const N = sent.length;

  console.log(`\n— Daily mean sentiment series —`);
  console.log(`  date        headlines   mean_sentiment`);
  for (const r of all) {
    const kept = r.n >= MIN_HEADLINES ? '' : '   (dropped: thin)';
    console.log(`  ${r.d}   ${String(r.n).padStart(5)}      ${r.avg >= 0 ? ' ' : ''}${r.avg.toFixed(4)}${kept}`);
  }
  console.log(`\n  N (days used): ${N}   range: ${series[0]?.d} → ${series[N - 1]?.d}`);
  if (N < 5) { console.error('\n  Too few days to compute anything. Stop.'); process.exit(0); }

  console.log(`  mean=${f4(mean(sent))}  sd=${f4(sd(sent))}  min=${f4(Math.min(...sent))}  max=${f4(Math.max(...sent))}`);

  // ── H3a: autocorrelation + stationarity (the ARIMA pre-flight) ──
  const band = 1.96 / Math.sqrt(N);
  console.log(`\n— H3a: is the series autocorrelated & stationary? (ARIMA pre-flight) —`);
  console.log(`  ACF (significance band ±${band.toFixed(3)}):`);
  for (let k = 1; k <= Math.min(5, N - 2); k++) {
    const r = acf(sent, k);
    console.log(`    lag ${k}: ${r >= 0 ? ' ' : ''}${r.toFixed(3)} ${Math.abs(r) > band ? '◀ outside band (autocorrelated)' : ''}`);
  }
  const ar1 = ols(sent.slice(0, -1), sent.slice(1));
  console.log(`  AR(1) regression sent_t ~ sent_t-1:  coef=${ar1.slope.toFixed(3)}  t=${ar1.t.toFixed(2)}  p≈${ar1.p.toFixed(3)} ${stars(ar1.p)}`);

  // Ljung-Box Q(h)
  const h = Math.min(5, N - 2);
  let Q = 0;
  for (let k = 1; k <= h; k++) Q += (acf(sent, k) ** 2) / (N - k);
  Q *= N * (N + 2);
  const chi05 = { 1: 3.84, 2: 5.99, 3: 7.81, 4: 9.49, 5: 11.07 }[h] ?? null;
  console.log(`  Ljung-Box Q(${h}) = ${Q.toFixed(2)}  (χ²₀.₀₅(${h}) = ${chi05}) → ${chi05 && Q > chi05 ? 'autocorrelation present' : 'cannot reject "no autocorrelation"'}`);

  // Dickey-Fuller
  const df = dickeyFuller(sent);
  console.log(`  Dickey-Fuller tau = ${df.tau.toFixed(2)}  (crit: -2.57@10%, -2.86@5%, -3.43@1%)`);
  console.log(`    → ${df.tau < -2.86 ? 'reject unit root: STATIONARY (good for ARIMA)' : df.tau < -2.57 ? 'borderline stationary (10%)' : 'cannot reject unit root — treat as non-stationary / difference it first'}`);

  // ── H3b: does sentiment predict the next-day Nifty? ──
  console.log(`\n— H3b: does daily sentiment predict the next-day ${INDEX_SYMBOL} move? —`);
  const pdates = priceRows.map((r) => r.d);
  const prets = priceRows.map((r) => Number(r.r));
  const retByDate = new Map(priceRows.map((r) => [r.d, Number(r.r)]));
  const sx = [], fy = [], cx = [], cy = []; // predictive (next-day), contemporaneous (same-day)
  for (const row of series) {
    const pos = firstAfter(pdates, row.d);
    if (pos < pdates.length && prets[pos] != null) { sx.push(row.avg); fy.push(prets[pos]); }
    const sd0 = retByDate.get(row.d);
    if (sd0 != null) { cx.push(row.avg); cy.push(sd0); }
  }
  if (sx.length >= 5) {
    const pred = ols(sx, fy);
    console.log(`  predictive (sent_T → return_T+1):  n=${pred.n}  corr=${pred.r.toFixed(3)}  slope=${pred.slope.toExponential(2)}  t=${pred.t.toFixed(2)}  p≈${pred.p.toFixed(3)} ${stars(pred.p)}`);
  } else console.log(`  predictive: only ${sx.length} aligned obs — too few.`);
  if (cx.length >= 5) {
    const con = ols(cx, cy);
    console.log(`  contemporaneous (sent_T vs return_T): n=${con.n}  corr=${con.r.toFixed(3)}  t=${con.t.toFixed(2)}  p≈${con.p.toFixed(3)} ${stars(con.p)}`);
  } else console.log(`  contemporaneous: only ${cx.length} aligned obs — too few.`);

  // ── Verdict ──
  console.log(`\n— Verdict —`);
  if (N < 30) {
    console.log(`  ⬜ INCONCLUSIVE — N=${N} daily points. ADF/ARIMA/forecast stats need ~30–50+.`);
    console.log(`     This is a METHOD pre-flight + baseline. Re-run monthly as the series deepens.`);
    console.log(`     Any "significant" result at this N is provisional (and likely noise).`);
  } else {
    console.log(`  Enough data to read the H3a/H3b numbers above as real. Log them.`);
  }
  console.log(`\n  → Log to the Hypothesis Register in sachnetra_research_playbook.md.`);
  console.log('\nDone.');
}

main().catch((e) => { console.error('Experiment failed:', e.message); process.exit(1); });
