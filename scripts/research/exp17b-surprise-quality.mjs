#!/usr/bin/env node
//
// Experiment 17b — the "one cheap SUE shot" (surrogate). Read-only.
//
// WHY a surrogate: a proper time-series SUE needs a quarterly-EPS history we do NOT have — there is no
// fundamentals table, `has_xbrl` is unreliable (it's true even on "Delayed/Non-submission" notices that
// carry no financials), `attachment_url` is the PDF not the XBRL, and the Indian-API path needs a Lijo
// signup/key (see 2026-06-04_indian-api-probe.md). So EPS-SUE stays PARKED.
//
// What we CAN test cheaply with data in hand: the literature's standard surprise-QUALITY refinement —
// reactions backed by HIGH abnormal volume (real information / institutional conviction) are the ones that
// drift; LOW-volume reactions are noise that reverts. If even volume-confirmed top reactions fail to drift,
// the lane is firmly closed and a fancier SUE would not save it.
//
// METHOD: reuse Exp17's event build. relVol[r] = volume[r] / median(volume[r-20..r-1]). Among top-quintile
//   positive-EARcc events, split HIGH vs LOW relVol (median of the selected set) and compare next-session
//   market-adjusted continuation (and net of 250 bps). Also quantify the has_xbrl-quality caveat.
//
//   node scripts/research/exp17b-surprise-quality.mjs

import { loadEnvFile } from '../_seed-utils.mjs';
import { readFileSync } from 'node:fs';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const QUINTILE = 0.2, EAR_CAP = 0.25, COST_HI = 0.025, VOL_LOOKBACK = 20;
const RESULTS_RE = /financial result|unaudited|audited.*result|quarterly result/;
const DELAY_RE = /delay|non-submission|non submission|reasons for/;

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const median = (a) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); const i = s.length >> 1; return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2; };
function quantile(s, q) { if (!s.length) return NaN; const p = (s.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (p - lo); }
function tStat(a) { if (a.length < 2) return { n: a.length, mean: NaN, t: NaN }; const m = mean(a), s = sd(a); return { n: a.length, mean: m, t: m / (s / Math.sqrt(a.length)) }; }
const pctf = (x) => `${(x * 100).toFixed(2)}%`;
function normalizeYahoo(s) { s = String(s).trim().toUpperCase(); return !s ? null : (s.startsWith('^') || s.endsWith('.NS') || s.endsWith('.BO')) ? s : `${s}.NS`; }
function loadUniverse(p) { const raw = JSON.parse(readFileSync(p, 'utf8')); const arr = Array.isArray(raw) ? raw : (raw.registry || raw.symbols || []); return [...new Set(arr.map((e) => (typeof e === 'string' ? e : e.ticker || e.symbol)).map(normalizeYahoo).filter(Boolean))]; }
function firstAtOrAfter(d, t) { let lo = 0, hi = d.length; while (lo < hi) { const m = (lo + hi) >> 1; if (d[m] >= t) hi = m; else lo = m + 1; } return lo; }
const bucketOf = (t, dow) => (dow === 0 || dow === 6) ? 'weekend' : t < '09:15' ? 'pre-open' : t <= '15:30' ? 'intraday' : 'after-close';

async function main() {
  console.log('=== Experiment 17b — cheap SUE-shot surrogate: does VOLUME-CONFIRMED reaction drift? ===\n');
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  const universe = loadUniverse('shared/nifty-midcap150.json');
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  const { rows: pr } = await pool.query(
    `SELECT symbol, to_char(trade_date,'YYYY-MM-DD') d, open, close, adj_close, volume
       FROM research_prices WHERE symbol = ANY($1) ORDER BY symbol, trade_date ASC`, [universe]);
  const bySym = new Map();
  for (const r of pr) { if (!bySym.has(r.symbol)) bySym.set(r.symbol, { dates: [], o: [], c: [], adj: [], sret: [], turn: [], vol: [] });
    const x = bySym.get(r.symbol); const adj = r.adj_close == null ? null : Number(r.adj_close); const prev = x.adj.length ? x.adj[x.adj.length - 1] : null;
    x.dates.push(r.d); x.o.push(r.open == null ? null : Number(r.open)); x.c.push(r.close == null ? null : Number(r.close)); x.adj.push(adj);
    x.vol.push(r.volume == null ? null : Number(r.volume));
    x.sret.push(prev != null && adj != null && prev > 0 ? adj / prev - 1 : null);
    x.turn.push(r.close != null && r.volume != null ? Number(r.close) * Number(r.volume) : null); }
  const acc = new Map();
  for (const s of universe) { const x = bySym.get(s); if (!x) continue; for (let i = 0; i < x.dates.length; i++) { const v = x.sret[i]; if (v == null) continue; const a = acc.get(x.dates[i]) || { s: 0, n: 0 }; a.s += v; a.n++; acc.set(x.dates[i], a); } }
  const benchSret = new Map([...acc].map(([d, a]) => [d, a.s / a.n]));
  const amihud = [];
  for (const s of universe) { const x = bySym.get(s); if (!x) continue; const v = []; for (let i = 0; i < x.dates.length; i++) { const a = x.sret[i], t = x.turn[i]; if (a == null || t == null || t <= 0) continue; v.push(Math.abs(a) / t); } if (v.length >= 60) amihud.push({ s, il: mean(v) }); }
  const med = quantile(amihud.map((a) => a.il).sort((a, b) => a - b), 0.5);
  const liquid = new Set(amihud.filter((a) => a.il < med).map((a) => a.s));

  const { rows: ann } = await pool.query(
    `SELECT symbol, category, subject, to_char((announced_at AT TIME ZONE 'Asia/Kolkata')::date,'YYYY-MM-DD') ann_date,
            to_char((announced_at AT TIME ZONE 'Asia/Kolkata'),'HH24:MI') ann_time, extract(dow from (announced_at AT TIME ZONE 'Asia/Kolkata'))::int dow
       FROM india_bourse_announcements WHERE symbol IS NOT NULL`);
  // XBRL-quality caveat: how many has_xbrl results rows are actually non-financial delay notices?
  const { rows: xq } = await pool.query(
    `SELECT count(*) FILTER (WHERE has_xbrl)::int total_xbrl,
            count(*) FILTER (WHERE has_xbrl AND lower(category) ~ 'delay|non-submission|reasons for')::int delay_xbrl
       FROM india_bourse_announcements WHERE lower(category) ~ 'financial result|unaudited|audited.*result|quarterly result' OR lower(subject) ~ 'financial result|unaudited|audited.*result|quarterly result'`);
  await pool.end();

  const events = [];
  for (const a of ann) {
    if (!RESULTS_RE.test(`${a.category} ${a.subject}`.toLowerCase())) continue;
    const sym = `${a.symbol}.NS`; if (!liquid.has(sym)) continue; const x = bySym.get(sym); if (!x) continue;
    const b = bucketOf(a.ann_time, a.dow); const fi = firstAtOrAfter(x.dates, a.ann_date);
    let r; if (b === 'intraday' && x.dates[fi] === a.ann_date) r = fi; else r = x.dates[fi] > a.ann_date ? fi : fi + 1;
    if (r < VOL_LOOKBACK + 1 || r + 1 >= x.dates.length) continue;
    const Cprev = x.c[r - 1], C = x.c[r], Cnext = x.c[r + 1], adjPrev = x.adj[r - 1], adj = x.adj[r];
    if ([Cprev, C, Cnext, adjPrev, adj].some((v) => v == null || v <= 0)) continue;
    const earcc = adj / adjPrev - 1 - (benchSret.get(x.dates[r]) ?? 0);
    if (Math.abs(earcc) > EAR_CAP) continue;
    const past = x.vol.slice(r - VOL_LOOKBACK, r).filter((v) => v != null && v > 0);
    const relVol = x.vol[r] != null && past.length >= 10 ? x.vol[r] / median(past) : null;
    if (relVol == null) continue;
    const contN = Cnext / C - 1 - (benchSret.get(x.dates[r + 1]) ?? 0);
    events.push({ sym, b, earcc, relVol, contN });
  }

  console.log(`has_xbrl quality caveat: of ${xq[0].total_xbrl} has_xbrl results rows, ${xq[0].delay_xbrl} (${(100 * xq[0].delay_xbrl / xq[0].total_xbrl).toFixed(0)}%) are "delay/non-submission" notices with NO financials → has_xbrl is NOT a clean "EPS present" flag.\n`);
  console.log(`Usable events (with 20d volume baseline): ${events.length}\n`);

  for (const scope of ['intraday', 'all']) {
    const base = scope === 'intraday' ? events.filter((e) => e.b === 'intraday') : events;
    const cut = quantile(base.map((e) => e.earcc).sort((a, b) => a - b), 1 - QUINTILE);
    const sel = base.filter((e) => e.earcc >= cut);
    const vmed = median(sel.map((e) => e.relVol));
    const hi = sel.filter((e) => e.relVol >= vmed), lo = sel.filter((e) => e.relVol < vmed);
    const sAll = tStat(sel.map((e) => e.contN)), sHi = tStat(hi.map((e) => e.contN)), sLo = tStat(lo.map((e) => e.contN));
    console.log(`── [${scope}] top-quintile positive EARcc (N=${sel.length}, median relVol=${vmed.toFixed(1)}x) — next-session drift ──`);
    console.log(`   all selected   : ${pctf(sAll.mean).padStart(8)} (t=${sAll.t.toFixed(2)})  net@250=${pctf(sAll.mean - COST_HI)}`);
    console.log(`   HIGH vol (≥med): ${pctf(sHi.mean).padStart(8)} (t=${sHi.t.toFixed(2)}, N=${sHi.n})  net@250=${pctf(sHi.mean - COST_HI)}  ← the "real surprise" subset`);
    console.log(`   LOW  vol (<med): ${pctf(sLo.mean).padStart(8)} (t=${sLo.t.toFixed(2)}, N=${sLo.n})  net@250=${pctf(sLo.mean - COST_HI)}`);
    const v = sHi.mean > 0.015 && sHi.t > 1.5 ? '🟢 high-vol reactions DRIFT — a SUE-grade signal may be worth building' : sHi.mean > 0 ? '~ high-vol leans positive but not cost-clearing/significant' : '🔴 even volume-confirmed reactions do NOT drift';
    console.log(`   → ${v}\n`);
  }
  console.log('Done.');
}
main().catch((e) => { console.error('Experiment failed:', e.message); process.exit(1); });
