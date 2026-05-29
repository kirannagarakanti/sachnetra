#!/usr/bin/env node
//
// Experiment 13 — Does Nifty drift between trending and mean-reverting regimes?
// See: ai_docs/sachnetra v2/wiki/experiments/Exp13.md (pre-registered hypothesis,
//      verdict tiers, caveats — read §1/§5/§9 before interpreting any output).
//
// HYPOTHESIS (Exp13.md §1):
//   H13 — the rolling Hurst exponent (R/S analysis) of ^NSEI daily log returns drifts
//         between persistent (H>0.55) and anti-persistent (H<0.45) regimes, rather than
//         staying pinned at the random-walk value 0.5.
//
// METHOD (ep29):
//   1. r_t = ln(p_t/p_{t-1}) on ^NSEI adj_close.
//   2. R/S Hurst on a rolling 250-day window: mean-adjusted partial sums → adjusted range
//      R = max(Z)−min(Z); R/S = R/std; over log-spaced sub-window sizes m, OLS slope of
//      log(R/S) on log(m) is H (Hurst's law E[R/S] ≈ C·m^H).
//   3. Classify each day: H>0.55 trending, <0.45 mean-reverting, else random walk.
//
// OUTPUTS (scripts/research/output/exp13/):
//   exp13_report.html        — VISUAL (rolling-H line + regime bands)
//   exp13_hurst_series.csv   — date, H, regime
//
// BOUNDARY: READ-ONLY on prod (SELECTs research_prices only). --selftest needs NO DB.
//   Claude authors; Lijo runs.
//
// USAGE
//   node scripts/research/exp13-hurst-regime.mjs --selftest
//   node scripts/research/exp13-hurst-regime.mjs
//   node scripts/research/exp13-hurst-regime.mjs --window=120 --from=2012-01-01

import { loadEnvFile } from '../_seed-utils.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const SELFTEST = args.includes('--selftest');
const WINDOW = Number(flag('window', '250'));
const SYMBOL = flag('symbol', '^NSEI');
const FROM = flag('from', null);
const TO = flag('to', null);
const TREND_HI = 0.55, REV_LO = 0.45;

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sdPop = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length); };
function simpleOLS(x, y) {
  const n = x.length, mx = mean(x), my = mean(y);
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); }
  return { b: sxy / sxx, a: my - (sxy / sxx) * mx };
}

// ── R/S Hurst on a window of returns ─────────────────────────────────────────
function hurstRS(Y) {
  const N = Y.length;
  const minM = 10, maxM = Math.floor(N / 2);
  if (maxM < minM) return NaN;
  // log-spaced integer sub-window sizes
  const count = 9, sizes = [];
  for (let k = 0; k < count; k++) {
    const m = Math.round(minM * (maxM / minM) ** (k / (count - 1)));
    if (!sizes.includes(m)) sizes.push(m);
  }
  const logM = [], logRS = [];
  for (const m of sizes) {
    const chunks = Math.floor(N / m);
    if (chunks < 1) continue;
    const rsv = [];
    for (let c = 0; c < chunks; c++) {
      const seg = Y.slice(c * m, (c + 1) * m);
      const mu = mean(seg), s = sdPop(seg);
      if (s <= 0) continue;
      let cum = 0, mn = Infinity, mx = -Infinity;
      for (const v of seg) { cum += v - mu; if (cum < mn) mn = cum; if (cum > mx) mx = cum; }
      rsv.push((mx - mn) / s);
    }
    if (rsv.length) { logM.push(Math.log(m)); logRS.push(Math.log(mean(rsv))); }
  }
  if (logM.length < 2) return NaN;
  return simpleOLS(logM, logRS).b;
}

const regimeOf = (h) => (h > TREND_HI ? 'trending' : h < REV_LO ? 'mean_reverting' : 'random_walk');

// ── Self-test (no DB) ────────────────────────────────────────────────────────
function runSelfTest() {
  console.log('=== Exp 13 self-test (synthetic; no DB) ===');
  let seed = 7;
  const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff - 0.5; };
  const N = 1500;
  const white = Array.from({ length: N }, () => rng());
  const persistent = []; let acc = 0;            // random-walk levels (highly persistent)
  for (let i = 0; i < N; i++) { acc += white[i]; persistent.push(acc); }
  const meanrev = []; let prev = 0;              // negative AR(1) → anti-persistent
  for (let i = 0; i < N; i++) { const y = -0.6 * prev + rng(); meanrev.push(y); prev = y; }

  const hP = hurstRS(persistent), hW = hurstRS(white), hM = hurstRS(meanrev);
  console.log(`  persistent (RW levels): H=${hP.toFixed(3)}  (expect > 0.55)`);
  console.log(`  white noise           : H=${hW.toFixed(3)}  (expect ≈ 0.50)`);
  console.log(`  mean-reverting AR(1)  : H=${hM.toFixed(3)}  (expect < 0.45)`);
  const ok = hP > hW && hW > hM && hW > 0.40 && hW < 0.60;
  console.log(ok ? '\n  ✅ SELFTEST PASS — estimator orders the three regimes and recovers H≈0.5 for noise.'
                 : '\n  ❌ SELFTEST FAIL — estimator did not order the regimes. Do NOT trust a real run.');
  process.exit(ok ? 0 : 1);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (SELFTEST) return runSelfTest();

  console.log('=== Experiment 13 — rolling Hurst regime on Nifty ===');
  console.log(`  Symbol: ${SYMBOL}   Window: ${WINDOW}d   Bands: <${REV_LO} mean-revert / >${TREND_HI} trend`);
  console.log(`  Window range: ${FROM || 'start'} → ${TO || 'today'}`);

  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  const params = [SYMBOL];
  let where = `symbol = $1 AND adj_close IS NOT NULL AND adj_close > 0`;
  if (FROM) { params.push(FROM); where += ` AND trade_date >= $${params.length}`; }
  if (TO) { params.push(TO); where += ` AND trade_date <= $${params.length}`; }
  const { rows } = await pool.query(
    `SELECT to_char(trade_date,'YYYY-MM-DD') AS d, adj_close AS px
       FROM research_prices WHERE ${where} ORDER BY trade_date ASC`, params);
  await pool.end();

  if (rows.length < WINDOW + 50) {
    console.error(`ERROR: only ${rows.length} ${SYMBOL} rows — need > ${WINDOW + 50}. Widen window or backfill.`);
    process.exit(1);
  }

  // Log returns + their dates.
  const ret = [], retDate = [];
  for (let i = 1; i < rows.length; i++) {
    ret.push(Math.log(Number(rows[i].px) / Number(rows[i - 1].px)));
    retDate.push(rows[i].d);
  }

  // Rolling Hurst.
  const series = []; // {date, h, regime}
  for (let i = WINDOW - 1; i < ret.length; i++) {
    const h = hurstRS(ret.slice(i - WINDOW + 1, i + 1));
    if (Number.isFinite(h)) series.push({ date: retDate[i], h, regime: regimeOf(h) });
  }

  const hs = series.map((s) => s.h);
  const fracTrend = series.filter((s) => s.regime === 'trending').length / series.length;
  const fracMR = series.filter((s) => s.regime === 'mean_reverting').length / series.length;
  const fracNeutral = series.filter((s) => s.regime === 'random_walk').length / series.length;
  const meanH = mean(hs), sdH = sdPop(hs);

  let verdict;
  if (fracTrend >= 0.20 && fracMR >= 0.20) verdict = { tag: 'REGIMES DETECTED', cls: 'ok' };
  else if (fracNeutral >= 0.80) verdict = { tag: 'NO DRIFT', cls: 'bad' };
  else verdict = { tag: 'WEAK DRIFT', cls: 'warn' };

  console.log(`\n— Rolling Hurst (${series.length} days, ${series[0].date} → ${series[series.length - 1].date}) —`);
  console.log(`  mean H: ${meanH.toFixed(3)}   sd H: ${sdH.toFixed(3)}`);
  console.log(`  trending (H>${TREND_HI}):      ${(fracTrend * 100).toFixed(1)}%`);
  console.log(`  random walk (${REV_LO}–${TREND_HI}): ${(fracNeutral * 100).toFixed(1)}%`);
  console.log(`  mean-reverting (H<${REV_LO}): ${(fracMR * 100).toFixed(1)}%`);
  console.log(`\n— Verdict (Exp13.md §5): ${verdict.tag} —`);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  let csv = 'date,hurst,regime\n';
  for (const s of series) csv += `${s.date},${s.h.toFixed(4)},${s.regime}\n`;
  writeFileSync(join(OUTPUT_DIR, 'exp13_hurst_series.csv'), csv);
  writeFileSync(join(OUTPUT_DIR, 'exp13_report.html'),
    buildHtml({ series, meanH, sdH, fracTrend, fracMR, fracNeutral, verdict }));

  console.log(`\n— Outputs —`);
  console.log(`  ${join(OUTPUT_DIR, 'exp13_report.html')}   ← open this in a browser (visual)`);
  console.log(`  ${join(OUTPUT_DIR, 'exp13_hurst_series.csv')}`);
  console.log(`\n  → Fill Exp13.md §6/§7/§8; log H13 in the playbook.`);
  console.log('Done.');
}

const __dir = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dir, 'output', 'exp13');

// ── HTML report ──────────────────────────────────────────────────────────────
function svgHurstChart(series) {
  const W = 820, H = 320, PL = 44, PR = 16, PT = 16, PB = 28;
  const n = series.length;
  const hs = series.map((s) => s.h);
  const yMin = Math.min(0.35, Math.min(...hs) - 0.03);
  const yMax = Math.max(0.85, Math.max(...hs) + 0.03);
  const xOf = (i) => PL + (i / (n - 1)) * (W - PL - PR);
  const yOf = (v) => PT + ((yMax - v) / (yMax - yMin)) * (H - PT - PB);
  // regime zone background bands
  const zone = (lo, hi, col) => `<rect x="${PL}" y="${yOf(hi)}" width="${W - PL - PR}" height="${yOf(lo) - yOf(hi)}" fill="${col}"/>`;
  const line = (v, col, lbl) => `<line x1="${PL}" y1="${yOf(v)}" x2="${W - PR}" y2="${yOf(v)}" stroke="${col}" stroke-width="1" stroke-dasharray="4 3"/><text x="${PL - 6}" y="${yOf(v) + 3}" fill="${col}" font-size="10" text-anchor="end">${lbl}</text>`;
  let path = '';
  for (let i = 0; i < n; i++) path += (i === 0 ? 'M' : 'L') + xOf(i).toFixed(1) + ' ' + yOf(hs[i]).toFixed(1) + ' ';
  const ticks = [0, Math.floor(n / 2), n - 1].map((i) => `<text x="${xOf(i)}" y="${H - 8}" fill="#64748b" font-size="10" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${series[i].date}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" style="background:#0b1120;border-radius:8px">
    ${zone(0.55, yMax, '#22c55e14')}${zone(0.45, 0.55, '#47556922')}${zone(yMin, 0.45, '#3b82f614')}
    ${line(0.55, '#22c55e', '0.55')}${line(0.5, '#94a3b8', '0.50')}${line(0.45, '#3b82f6', '0.45')}
    <path d="${path}" fill="none" stroke="#e2e8f0" stroke-width="1.3"/>
    ${ticks}
    <text x="${W - PR}" y="${PT + 12}" fill="#22c55e" font-size="11" text-anchor="end">trending ↑</text>
    <text x="${W - PR}" y="${H - PB - 4}" fill="#3b82f6" font-size="11" text-anchor="end">mean-reverting ↓</text>
  </svg>`;
}

function buildHtml({ series, meanH, sdH, fracTrend, fracMR, fracNeutral, verdict }) {
  const vcol = { ok: '#22c55e', warn: '#f59e0b', bad: '#ef4444' }[verdict.cls];
  return `<!doctype html><html><head><meta charset="utf-8"><title>Exp 13 — Hurst Regime</title>
<style>
  body{background:#070b14;color:#e2e8f0;font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;margin:0 auto;padding:28px;max-width:900px}
  h1{font-size:22px;margin:0 0 4px} h2{font-size:16px;margin:26px 0 10px;color:#cbd5e1}
  .sub{color:#64748b;font-size:12px;margin-bottom:18px}
  .verdict{padding:16px 20px;border-radius:10px;border:2px solid ${vcol};background:${vcol}14;margin:18px 0}
  .verdict .tag{font-size:26px;font-weight:700;color:${vcol}}
  .explain{background:#0b1120;border:1px solid #1e293b;border-radius:8px;padding:14px 16px;color:#94a3b8;font-size:13px}
  .mult{display:flex;gap:18px;flex-wrap:wrap;margin:14px 0} .mult div{background:#0b1120;border:1px solid #1e293b;border-radius:8px;padding:10px 16px;min-width:120px}
  .mult b{font-size:20px;display:block;font-family:ui-monospace,monospace}
  code{background:#0b1120;padding:1px 5px;border-radius:4px;color:#7dd3fc}
  .foot{color:#475569;font-size:11px;margin-top:28px;border-top:1px solid #1e293b;padding-top:14px}
</style></head><body>
  <h1>Experiment 13 — Nifty trending vs mean-reverting regimes (rolling Hurst)</h1>
  <div class="sub">Generated ${new Date().toISOString()} · ${series.length} days · ${series[0].date} → ${series[series.length - 1].date} · rolling ${WINDOW}-day window · read-only research run</div>

  <div class="verdict"><div class="tag">${verdict.tag}</div>
    <div style="color:#94a3b8;font-size:13px;margin-top:6px">mean H = ${meanH.toFixed(3)} · sd = ${sdH.toFixed(3)}. Trending ${(fracTrend * 100).toFixed(0)}% · random walk ${(fracNeutral * 100).toFixed(0)}% · mean-reverting ${(fracMR * 100).toFixed(0)}% of days.</div>
  </div>

  <div class="explain"><b>What this is.</b> The Hurst exponent (H) is one number that says how a series "remembers".
  <b>H ≈ 0.5</b> = a coin-flip random walk (don't time it). <b>H &gt; 0.55</b> = trending/momentum (a move tends to
  continue — trend-following works). <b>H &lt; 0.45</b> = mean-reverting (a move tends to snap back — pairs/reversion
  works, e.g. the <code>Exp 12</code> cointegration pairs). This chart rolls H through time to see whether Nifty
  <i>switches</i> regimes or sits at 0.5. Thresholds locked before the run (<code>Exp13.md §5</code>).</div>

  <h2>Rolling Hurst exponent</h2>
  ${svgHurstChart(series)}
  <div class="sub" style="margin-top:8px">White line = H on the trailing ${WINDOW} days. Green zone = trending, grey = random walk, blue = mean-reverting. Consecutive points share ${WINDOW - 1}/${WINDOW} of their data, so read regimes as multi-month stretches, not daily wiggles.</div>

  <div class="mult">
    <div>mean H<b>${meanH.toFixed(3)}</b></div>
    <div>% trending<b style="color:#22c55e">${(fracTrend * 100).toFixed(0)}%</b></div>
    <div>% random walk<b style="color:#94a3b8">${(fracNeutral * 100).toFixed(0)}%</b></div>
    <div>% mean-reverting<b style="color:#3b82f6">${(fracMR * 100).toFixed(0)}%</b></div>
  </div>

  <div class="foot">
    Method: Rescaled-Range (R/S) analysis (ep29) — mean-adjusted partial sums → adjusted range R=max(Z)−min(Z); R/S over log-spaced sub-windows; H = OLS slope of log(R/S) on log(window). Rolling ${WINDOW}-day window on ${SYMBOL} log returns. Descriptive estimate, no p-value; small windows inflate H; rolling values are autocorrelated. Caveats: <code>Exp13.md §9</code>. Read-only; Claude authors, Lijo runs.
  </div>
</body></html>`;
}

main().catch((e) => { console.error('Experiment failed:', e.message); console.error(e.stack); process.exit(1); });
