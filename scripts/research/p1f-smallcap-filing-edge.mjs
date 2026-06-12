#!/usr/bin/env node
//
// P1f — the small-cap filing edge probe (READ-ONLY). Ordered by BOTH fresh-eyes
// reviewers as the highest-priority cheap test ("everything else waits on that number").
// Blueprint §8.9 / §9; fresh-eyes log Round 4.
//
// QUESTION: filings arrive company-keyed and we hold daily prices — so, without any
// news tagging: (1) do exchange filings MOVE the small/illiquid names at all (day-0
// reaction vs placebo)? (2) is anything LEFT after day 0 (signed post-filing drift),
// i.e. does the "hours of lead on small caps" hope translate into a capturable window?
//
//   node scripts/research/p1f-smallcap-filing-edge.mjs                # real run
//   node scripts/research/p1f-smallcap-filing-edge.mjs --placebo      # matched random days (~0 expected)
//   node scripts/research/p1f-smallcap-filing-edge.mjs --selftest     # synthetic harness validation
//   flags: --since=2024-06-01  --until=2026-05-15  --gap=3
//
// METHOD (daily bars — honest limits):
//   events  = (symbol, IST filing date), deduped, declustered >= gap days; effective
//             day-0 = filing date for pre-open/market-hours filings, NEXT session for
//             post-close filings. Buckets: pre (<09:15 IST) / mkt (09:15-15:30) / post.
//   measure = |day-0 abnormal| (did it move at all) and SIGNED drift CAR(+1..+{3,5,10})
//             where sign = direction of the day-0 abnormal move (Exp16's EAR idiom).
//   slices  = illiquid half vs liquid half (ADV median split) x time bucket x
//             results-like filings vs all filings.
//   placebo = same machinery on random non-filing days per symbol.
// Intraday capture is NOT measurable here (daily bars); Exp17 covered large caps.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadEnvFile } from '../_seed-utils.mjs';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'output', 'p1f');

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const has = (n) => args.includes(`--${n}`);
const SINCE = flag('since', '2024-06-01');
const UNTIL = flag('until', '2026-05-15');
const GAP = Number(flag('gap', '3'));
const WINDOWS = [3, 5, 10];
const RESULTS_RE = /result|financial|earning|quarterly|q[1-4]\s|audited|un-?audited/i;

function mulberry32(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function toReturns(rows) {
  const dates = []; const ret = []; const turnover = [];
  for (let i = 1; i < rows.length; i++) {
    const a = Number(rows[i - 1].adj_close); const b = Number(rows[i].adj_close);
    if (a > 0 && b > 0) {
      dates.push(rows[i].d); ret.push(b / a - 1);
      turnover.push(Number(rows[i].close) * Number(rows[i].volume) || 0);
    }
  }
  return { dates, ret, turnover };
}
function abnormalSeries(series, bench) {
  const bmap = new Map(bench.dates.map((d, i) => [d, bench.ret[i]]));
  const dates = []; const abn = []; const turnover = [];
  for (let i = 0; i < series.dates.length; i++) {
    const br = bmap.get(series.dates[i]);
    if (br !== undefined) { dates.push(series.dates[i]); abn.push(series.ret[i] - br); turnover.push(series.turnover[i]); }
  }
  return { dates, abn, turnover };
}
function stats(vals) {
  const n = vals.length;
  if (n === 0) return { n: 0, mean: NaN, t: NaN, hit: NaN };
  const mean = vals.reduce((s, x) => s + x, 0) / n;
  const sd = Math.sqrt(vals.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1));
  return { n, mean, t: sd > 0 ? mean / (sd / Math.sqrt(n)) : NaN, hit: vals.filter((x) => x > 0).length / n };
}
const pct = (x) => `${(x * 100).toFixed(2)}%`;
const fmt = (s) => s.n ? `n=${String(s.n).padStart(5)}  mean=${pct(s.mean).padStart(7)}  t=${s.t.toFixed(2).padStart(6)}  hit=${(s.hit * 100).toFixed(0)}%` : 'n=0';

// effective day-0 index: first trading index >= date (pre/mkt) or > date (post)
function day0Index(series, ymd, bucket) {
  let lo = 0; let hi = series.dates.length - 1; let ans = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (series.dates[mid] >= ymd) { ans = mid; hi = mid - 1; } else lo = mid + 1; }
  if (ans < 0) return -1;
  if (bucket === 'post' && series.dates[ans] === ymd) ans += 1;
  return ans < series.dates.length ? ans : -1;
}

function measure(series, idx, windows) {
  if (idx < 1 || idx + Math.max(...windows) >= series.abn.length) return null;
  const day0 = series.abn[idx];
  const sign = Math.sign(day0) || 1;
  const out = { day0Abs: Math.abs(day0), drift: {} };
  for (const w of windows) { let car = 0; for (let k = 1; k <= w; k++) car += series.abn[idx + k]; out.drift[w] = sign * car; }
  return out;
}

function runStudy(symbols, eventsBySym, { placebo = false, matched = false, seed = 11 } = {}) {
  const rng = mulberry32(seed);
  const out = [];
  for (const [sym, s] of symbols) {
    const evs = eventsBySym.get(sym) || [];
    for (const ev of evs) {
      let idx;
      const bucket = ev.bucket;
      if (placebo && !matched) {
        idx = 15 + Math.floor(rng() * (s.dates.length - 30));
      } else {
        idx = day0Index(s, ev.ymd, ev.bucket);
      }
      if (idx < 0) continue;
      const m = measure(s, idx, WINDOWS);
      if (!m) continue;
      if (!matched) {
        out.push({ sym, ymd: ev.ymd, bucket, isResults: ev.isResults, liq: s.liq, kind: placebo ? 'placebo' : 'real', ...m });
        continue;
      }
      // matched mode (Kimi's control): emit the REAL measurement AND a magnitude-matched
      // placebo — a random non-event day whose |day-0 abnormal| is within tolerance of the
      // real event's, at least 15 bars away. Widen tolerance once; skip if still none.
      out.push({ sym, ymd: ev.ymd, bucket, isResults: ev.isResults, liq: s.liq, kind: 'real', ...m });
      const target = m.day0Abs;
      const pick = (lo, hi) => {
        const cands = [];
        for (let j = 11; j < s.abn.length - 11; j++) {
          if (Math.abs(j - idx) <= 15) continue;
          const a = Math.abs(s.abn[j]);
          if (a >= lo && a <= hi) cands.push(j);
        }
        return cands.length ? cands[Math.floor(rng() * cands.length)] : -1;
      };
      let j = pick(target * 0.75, target * 1.33);
      if (j < 0) j = pick(target * 0.5, target * 2);
      if (j < 0) continue;
      const mp = measure(s, j, WINDOWS);
      if (mp) out.push({ sym, ymd: ev.ymd, bucket, isResults: ev.isResults, liq: s.liq, kind: 'matched', ...mp });
    }
  }
  return out;
}

// Kimi's magnitude buckets (fixed, pre-stated): <1.5% / 1.5–4% / >4% on day-0 |abnormal|
function magBucket(x) { return x < 0.015 ? '<1.5%' : x <= 0.04 ? '1.5-4%' : '>4%'; }

function reportMatched(events) {
  const real = events.filter((e) => e.kind === 'real');
  const pl = events.filter((e) => e.kind === 'matched');
  console.log(`\n=== P1f-v2 MAGNITUDE-MATCHED CONTROL (Kimi's test) · real ${real.length} · matched ${pl.length} ===`);
  const cell = (evs) => evs.filter((e) => e.liq === 'illiquid' && e.isResults);
  const r = cell(real); const p = cell(pl);
  console.log(`ILLIQUID x RESULTS — real n=${r.length}, matched-placebo n=${p.length}`);
  console.log(`  matched day-0 |abn|: real ${pct(stats(r.map((e) => e.day0Abs)).mean)} vs placebo ${pct(stats(p.map((e) => e.day0Abs)).mean)}  (must be ~equal for the control to be valid)`);
  for (const w of WINDOWS) {
    console.log(`  drift +1..+${String(w).padEnd(2)}  real ${fmt(stats(r.map((e) => e.drift[w])))}`);
    console.log(`              matched ${fmt(stats(p.map((e) => e.drift[w])))}`);
  }
  console.log('  — by Kimi’s magnitude buckets (drift +1..+3, real vs matched):');
  for (const b of ['<1.5%', '1.5-4%', '>4%']) {
    const rb = r.filter((e) => magBucket(e.day0Abs) === b);
    const pb = p.filter((e) => magBucket(e.day0Abs) === b);
    console.log(`    ${b.padEnd(7)} real    ${fmt(stats(rb.map((e) => e.drift[3])))}`);
    console.log(`    ${''.padEnd(7)} matched ${fmt(stats(pb.map((e) => e.drift[3])))}`);
  }
}

function report(events, label) {
  console.log(`\n=== ${label} · ${SINCE}→${UNTIL} · gap ${GAP}d · ${events.length} events ===`);
  const slice = (evs, name) => {
    console.log(`  ${name} (${evs.length} events)`);
    console.log(`    day-0 |abnormal|            ${fmt(stats(evs.map((e) => e.day0Abs)))}`);
    for (const w of WINDOWS) console.log(`    signed drift +1..+${String(w).padEnd(2)}       ${fmt(stats(evs.map((e) => e.drift[w])))}`);
  };
  slice(events, 'ALL filings, all names');
  slice(events.filter((e) => e.liq === 'illiquid'), 'ILLIQUID HALF (the hope)');
  slice(events.filter((e) => e.liq === 'liquid'), 'liquid half (control)');
  slice(events.filter((e) => e.liq === 'illiquid' && e.isResults), 'illiquid x RESULTS-like filings');
  for (const b of ['pre', 'mkt', 'post']) {
    const sub = events.filter((e) => e.liq === 'illiquid' && e.bucket === b);
    console.log(`  illiquid x bucket=${b.padEnd(4)} (${sub.length}):  drift+5 ${fmt(stats(sub.map((e) => e.drift[5])))}`);
  }
}

function selftest() {
  const rng = mulberry32(3);
  const gauss = () => { const u = Math.max(rng(), 1e-9); const v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const N = 1500; const dates = [];
  for (let i = 0; i < N; i++) dates.push(`2024-${String(100 + Math.floor(i / 28)).slice(1)}-${String(100 + (i % 28) + 1).slice(1)}`);
  // responsive: filing days get a +/-4% day-0 shock and 30% of it drifts over days 1..5
  const abnR = []; const abnN = []; const filDays = [];
  const shock = [];
  for (let i = 0; i < N; i++) { const sh = i % 30 === 10 ? (rng() > 0.5 ? 0.04 : -0.04) : 0; shock.push(sh); if (sh !== 0) filDays.push(i); }
  for (let i = 0; i < N; i++) {
    let drift = 0;
    for (let k = 1; k <= 5; k++) if (i - k >= 0) drift += 0.06 * shock[i - k];
    abnR.push(shock[i] + drift + 0.012 * gauss());
    abnN.push(0.012 * gauss());
  }
  const mk = (abn, liq) => ({ dates, abn, turnover: dates.map(() => 1), liq });
  const evs = filDays.map((i) => ({ ymd: dates[i], bucket: 'pre', isResults: true }));
  const symsR = new Map([['SYN_R', mk(abnR, 'illiquid')]]);
  const symsN = new Map([['SYN_N', mk(abnN, 'illiquid')]]);
  const em = new Map([['SYN_R', evs], ['SYN_N', evs]]);
  const r = runStudy(symsR, em); const nl = runStudy(symsN, em);
  const sR0 = stats(r.map((e) => e.day0Abs)); const sR5 = stats(r.map((e) => e.drift[5]));
  const sN5 = stats(nl.map((e) => e.drift[5]));
  console.log(`selftest responsive: day0|abn| ${fmt(sR0)} · drift+5 ${fmt(sR5)}  (expect day0 ~4%, drift ~+1.2%)`);
  console.log(`selftest null:       drift+5 ${fmt(sN5)}  (expect statistically ~0, |t|<2.5)`);
  const pass = sR0.mean > 0.03 && sR5.mean > 0.006 && sR5.t > 3 && Math.abs(sN5.t) < 2.5;
  console.log(pass ? 'SELFTEST PASS ✅' : 'SELFTEST FAIL ❌');
  process.exit(pass ? 0 : 1);
}

async function main() {
  if (has('selftest')) return selftest();
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(2); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // benchmark
  const { rows: bRows } = await pool.query(
    `SELECT to_char(trade_date,'YYYY-MM-DD') AS d, adj_close, close, volume FROM research_prices WHERE symbol='^NSEI' ORDER BY trade_date`);
  if (bRows.length < 250) { console.error('ERROR: ^NSEI benchmark missing'); process.exit(2); }
  const bench = toReturns(bRows);

  // priced symbols (bare names from announcements side are upper-cased; prices carry .NS)
  const { rows: symRows } = await pool.query(
    `SELECT DISTINCT symbol FROM research_prices WHERE symbol LIKE '%.NS'`);
  const priced = symRows.map((r) => r.symbol);

  // load prices + ADV per symbol
  const symbols = new Map();
  for (const ns of priced) {
    const { rows } = await pool.query(
      `SELECT to_char(trade_date,'YYYY-MM-DD') AS d, adj_close, close, volume FROM research_prices WHERE symbol=$1 ORDER BY trade_date`, [ns]);
    if (rows.length < 250) continue;
    const s = abnormalSeries(toReturns(rows), bench);
    if (s.dates.length < 250) continue;
    s.adv = s.turnover.reduce((a, x) => a + x, 0) / s.turnover.length;
    symbols.set(ns.replace(/\.NS$/, '').toUpperCase(), s);
  }
  const advs = [...symbols.values()].map((s) => s.adv).sort((a, b) => a - b);
  const advMed = advs[Math.floor(advs.length / 2)];
  for (const s of symbols.values()) s.liq = s.adv < advMed ? 'illiquid' : 'liquid';

  // filings for priced symbols, bucketed by IST time of day, deduped per (symbol, day)
  const { rows: annRows } = await pool.query(
    `SELECT upper(symbol) AS sym,
            to_char(announced_at AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD') AS ymd,
            min(to_char(announced_at AT TIME ZONE 'Asia/Kolkata','HH24:MI')) AS first_hm,
            bool_or(category ~* 'result|financial|earning' OR subject ~* 'result|financial|earning|quarterly|audited') AS is_results
       FROM india_bourse_announcements
      WHERE symbol IS NOT NULL
        AND announced_at >= $1::date AND announced_at < ($2::date + interval '1 day')
      GROUP BY 1, 2`, [SINCE, UNTIL]);

  const eventsBySym = new Map();
  let raw = 0;
  for (const a of annRows) {
    if (!symbols.has(a.sym)) continue;
    raw++;
    const bucket = a.first_hm < '09:15' ? 'pre' : a.first_hm <= '15:30' ? 'mkt' : 'post';
    if (!eventsBySym.has(a.sym)) eventsBySym.set(a.sym, []);
    eventsBySym.get(a.sym).push({ ymd: a.ymd, bucket, isResults: a.is_results });
  }
  // decluster per symbol
  let kept = 0;
  for (const arr of eventsBySym.values()) {
    arr.sort((x, y) => (x.ymd < y.ymd ? -1 : 1));
    let last = null; const out = [];
    for (const e of arr) {
      if (last && (new Date(e.ymd) - new Date(last)) / 864e5 < GAP) continue;
      out.push(e); last = e.ymd;
    }
    arr.length = 0; arr.push(...out); kept += out.length;
  }
  console.log(`symbols priced: ${symbols.size} (ADV median split) · filing event-days on priced names: ${raw} → ${kept} after ${GAP}d declustering`);

  const placebo = has('placebo');
  const matched = has('matched');
  const events = runStudy(symbols, eventsBySym, { placebo, matched });
  if (matched) {
    reportMatched(events);
    await pool.end();
    return;
  }
  report(events, placebo ? 'P1f PLACEBO (random non-filing days — expect ~0 / baseline)' : 'P1f SMALL-CAP FILING EDGE');

  if (!placebo) {
    mkdirSync(OUT_DIR, { recursive: true });
    const csv = ['symbol,date,bucket,is_results,liquidity,day0_abs,drift3,drift5,drift10',
      ...events.map((e) => `${e.sym},${e.ymd},${e.bucket},${e.isResults},${e.liq},${e.day0Abs.toFixed(5)},${e.drift[3].toFixed(5)},${e.drift[5].toFixed(5)},${e.drift[10].toFixed(5)}`)].join('\n');
    writeFileSync(join(OUT_DIR, 'p1f_events.csv'), csv);
    console.log(`\nevents written: ${join(OUT_DIR, 'p1f_events.csv')}`);
    console.log('READING: compare day-0 |abn| and signed drift vs the placebo run; the hope lives in the ILLIQUID half.');
  }
  await pool.end();
}

main().catch((e) => { console.error('P1f failed:', e.message); process.exit(2); });
