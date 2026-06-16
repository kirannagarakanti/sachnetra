#!/usr/bin/env node
//
// Experiment 17 — GATE 0 for the (B) intraday-latency-capture bet.
// Pre-question: BEFORE spending on minute data, does the day-0 results reaction
// on liquid mid-caps (a) clear the 100-250 bps cost wall often enough, (b) sit
// in a CAPTURABLE place (intraday) vs a non-capturable overnight GAP, and (c)
// CONTINUE (drift) rather than REVERSE (overreaction)? Daily data only, read-only.
//
// Decisive because: (B) only works if there is a cost-clearing, persistent
// intraday move. If the reaction clusters below cost, or is all locked in the
// opening gap, or reverses next session — KILL (B), don't buy intraday data.
//
// METHOD (per-event, liquid Midcap-150, results filings):
//   reaction day r:
//     - INTRADAY filing (09:15-15:30 IST, trading day)  -> r = filing day (reaction same session)
//     - else (after-close / pre-open / weekend / holiday) -> r = first trading day AFTER the filing
//   components on day r (raw OHLC; flagged — see note):
//     gap    = O[r]/C[r-1] - 1     (jump into r; for after-close filers this is NON-capturable — you buy the open)
//     intra  = C[r]/O[r]   - 1     (in-session move on r; for intraday filers the post-filing move ⊆ this = capture ceiling)
//     EARcc  = adjC[r]/adjC[r-1] - 1 - benchSret[r]   (market-adjusted close-to-close reaction = selection signal)
//   continuation (next session r+1): contN = C[r+1]/C[r] - 1 - bench   (drift>0) vs (reversal<0)
//
// NOTE on adjustment: EARcc uses adj_close (consistent). gap/intra use RAW open & close — within a single
//   day/overnight these share an adjustment basis EXCEPT on ex-split/ex-div dates; excluding |EARcc|>25%
//   (§5b, NSE circuit) drops the split artifacts, dividends are accepted noise. Fine for a magnitude screen.
//
// BOUNDARY: READ-ONLY (SELECTs only). Writes a CSV to output/exp17/.
//   node scripts/research/exp17-intraday-reaction-gate.mjs

import { loadEnvFile } from '../_seed-utils.mjs';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'output', 'exp17');

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const SYMBOLS_FILE = flag('symbols-file', 'shared/nifty-midcap150.json');
const EAR_CAP = Number(flag('ear-cap', '0.25'));        // §5b: drop split/relisting artifacts
const QUINTILE = Number(flag('quintile', '0.2'));       // "events we'd trade" = top-quintile positive EARcc
const COST_LO = Number(flag('cost-lo', '0.015'));       // 150 bps screen (capture half of this clears 75)
const COST_HI = Number(flag('cost-hi', '0.025'));       // 250 bps conservative wall

const RESULTS_RE = /financial result|unaudited|audited.*result|quarterly result/;
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const median = (a) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); const i = s.length >> 1; return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2; };
function quantile(sorted, q) { if (!sorted.length) return NaN; const p = (sorted.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (p - lo); }
function tStat(a) { if (a.length < 2) return { n: a.length, mean: NaN, t: NaN }; const m = mean(a), s = sd(a); return { n: a.length, mean: m, t: m / (s / Math.sqrt(a.length)) }; }
const pctf = (x) => `${(x * 100).toFixed(2)}%`;
const shareGt = (a, thr) => (a.length ? a.filter((x) => Math.abs(x) > thr).length / a.length : NaN);

function normalizeYahoo(s) { s = String(s).trim().toUpperCase(); return !s ? null : (s.startsWith('^') || s.endsWith('.NS') || s.endsWith('.BO')) ? s : `${s}.NS`; }
function loadUniverse(p) { const raw = JSON.parse(readFileSync(p, 'utf8')); const arr = Array.isArray(raw) ? raw : (raw.registry || raw.symbols || []); return [...new Set(arr.map((e) => (typeof e === 'string' ? e : e.ticker || e.symbol)).map(normalizeYahoo).filter(Boolean))]; }
function firstAtOrAfter(dates, t) { let lo = 0, hi = dates.length; while (lo < hi) { const m = (lo + hi) >> 1; if (dates[m] >= t) hi = m; else lo = m + 1; } return lo; }

function bucketOf(timeHHMM, dow) {
  if (dow === 0 || dow === 6) return 'weekend';
  if (timeHHMM < '09:15') return 'pre-open';
  if (timeHHMM <= '15:30') return 'intraday';
  return 'after-close';
}

async function main() {
  console.log('=== Experiment 17 — Gate 0: is the intraday results reaction worth capturing? ===\n');
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL not set'); process.exit(1); }
  const universe = loadUniverse(SYMBOLS_FILE);
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  const { rows: priceRows } = await pool.query(
    `SELECT symbol, to_char(trade_date,'YYYY-MM-DD') d, open, high, low, close, adj_close, volume
       FROM research_prices WHERE symbol = ANY($1) ORDER BY symbol, trade_date ASC`, [universe]);
  const bySym = new Map();
  for (const r of priceRows) {
    if (!bySym.has(r.symbol)) bySym.set(r.symbol, { dates: [], o: [], c: [], adj: [], sret: [], turn: [] });
    const x = bySym.get(r.symbol); const adj = r.adj_close == null ? null : Number(r.adj_close);
    const prev = x.adj.length ? x.adj[x.adj.length - 1] : null;
    x.dates.push(r.d); x.o.push(r.open == null ? null : Number(r.open)); x.c.push(r.close == null ? null : Number(r.close)); x.adj.push(adj);
    x.sret.push(prev != null && adj != null && prev > 0 ? adj / prev - 1 : null);
    x.turn.push(r.close != null && r.volume != null ? Number(r.close) * Number(r.volume) : null);
  }

  // eqw benchmark daily simple return (adj_close based)
  const acc = new Map();
  for (const sym of universe) { const x = bySym.get(sym); if (!x) continue;
    for (let i = 0; i < x.dates.length; i++) { const s = x.sret[i]; if (s == null) continue; const a = acc.get(x.dates[i]) || { s: 0, n: 0 }; a.s += s; a.n++; acc.set(x.dates[i], a); } }
  const benchSret = new Map([...acc].map(([d, a]) => [d, a.s / a.n]));

  // Amihud-median liquidity filter (tradeable subset)
  const amihud = [];
  for (const sym of universe) { const x = bySym.get(sym); if (!x) continue; const v = [];
    for (let i = 0; i < x.dates.length; i++) { const s = x.sret[i], t = x.turn[i]; if (s == null || t == null || t <= 0) continue; v.push(Math.abs(s) / t); }
    if (v.length >= 60) amihud.push({ sym, il: mean(v) }); }
  const med = quantile(amihud.map((a) => a.il).sort((a, b) => a - b), 0.5);
  const liquid = new Set(amihud.filter((a) => a.il < med).map((a) => a.sym));
  console.log(`Liquid universe: ${liquid.size}/${universe.length} (Amihud below median)\n`);

  const { rows: ann } = await pool.query(
    `SELECT symbol, category, subject,
            to_char((announced_at AT TIME ZONE 'Asia/Kolkata')::date,'YYYY-MM-DD') ann_date,
            to_char((announced_at AT TIME ZONE 'Asia/Kolkata'),'HH24:MI') ann_time,
            extract(dow from (announced_at AT TIME ZONE 'Asia/Kolkata'))::int dow
       FROM india_bourse_announcements WHERE symbol IS NOT NULL`);
  await pool.end();

  const events = [];
  let scanned = 0, notRes = 0, notLiq = 0, noBars = 0, capped = 0;
  for (const a of ann) {
    if (!RESULTS_RE.test(`${a.category} ${a.subject}`.toLowerCase())) { notRes++; continue; }
    scanned++;
    const sym = `${a.symbol}.NS`; if (!liquid.has(sym)) { notLiq++; continue; }
    const x = bySym.get(sym); if (!x) { notLiq++; continue; }
    const bucket = bucketOf(a.ann_time, a.dow);
    const fileIdx = firstAtOrAfter(x.dates, a.ann_date);
    // reaction day r: intraday filing on its own trading day reacts same session; else next trading day
    let r;
    if (bucket === 'intraday' && x.dates[fileIdx] === a.ann_date) r = fileIdx;
    else r = x.dates[fileIdx] > a.ann_date ? fileIdx : fileIdx + 1;
    if (r < 1 || r + 1 >= x.dates.length) { noBars++; continue; }
    const Cprev = x.c[r - 1], O = x.o[r], C = x.c[r], Cnext = x.c[r + 1];
    const adjPrev = x.adj[r - 1], adj = x.adj[r];
    if ([Cprev, O, C, Cnext, adjPrev, adj].some((v) => v == null || v <= 0)) { noBars++; continue; }
    const earcc = adj / adjPrev - 1 - (benchSret.get(x.dates[r]) ?? 0);
    if (Math.abs(earcc) > EAR_CAP) { capped++; continue; }
    const gap = O / Cprev - 1;
    const intra = C / O - 1;
    const contN = Cnext / C - 1 - (benchSret.get(x.dates[r + 1]) ?? 0);
    events.push({ sym, annDate: a.ann_date, bucket, rDate: x.dates[r], earcc, gap, intra, contN });
  }
  console.log(`Results filings: ${scanned}  ·  dropped illiquid ${notLiq} · no-bars ${noBars} · |EAR|>${EAR_CAP} ${capped}`);
  console.log(`Usable events: ${events.length}\n`);

  const yrs = (() => { const ds = events.map((e) => e.annDate).sort(); return (new Date(ds[ds.length - 1]) - new Date(ds[0])) / (365.25 * 864e5) || 1; })();

  // ── per-bucket reaction profile ──
  console.log('── Reaction by filing time-of-day (EARcc = market-adj close-to-close on reaction day) ──');
  console.log(`   ${'bucket'.padEnd(12)} ${'N'.padStart(5)} ${'/yr'.padStart(5)}  ${'med|EAR|'.padStart(8)} ${'>1.5%'.padStart(6)} ${'>2.5%'.padStart(6)}  ${'med|intra|'.padStart(9)} ${'med|gap|'.padStart(8)}  capturable`);
  for (const b of ['intraday', 'after-close', 'pre-open', 'weekend']) {
    const ev = events.filter((e) => e.bucket === b); if (!ev.length) continue;
    const ear = ev.map((e) => e.earcc);
    const note = b === 'intraday' ? 'intra = T0 ceiling' : b === 'after-close' || b === 'weekend' ? 'gap = NON-capturable' : 'open gap';
    console.log(`   ${b.padEnd(12)} ${String(ev.length).padStart(5)} ${(ev.length / yrs).toFixed(0).padStart(5)}  ${pctf(median(ear.map(Math.abs))).padStart(8)} ${(100 * shareGt(ear, COST_LO)).toFixed(0).padStart(5)}% ${(100 * shareGt(ear, COST_HI)).toFixed(0).padStart(5)}%  ${pctf(median(ev.map((e) => Math.abs(e.intra)))).padStart(9)} ${pctf(median(ev.map((e) => Math.abs(e.gap)))).padStart(8)}  ${note}`);
  }
  console.log('');

  // ── how much of the after-close reaction is locked in the non-capturable gap ──
  const ac = events.filter((e) => e.bucket === 'after-close');
  if (ac.length) {
    const gapAbs = mean(ac.map((e) => Math.abs(e.gap))), intraAbs = mean(ac.map((e) => Math.abs(e.intra)));
    console.log(`── After-close filers (66%): mean|gap|=${pctf(gapAbs)} vs mean|intra|=${pctf(intraAbs)}  →  ~${(100 * gapAbs / (gapAbs + intraAbs)).toFixed(0)}% of the move is NON-capturable overnight gap\n`);
  }

  // ── the bet: top-quintile POSITIVE EARcc on INTRADAY filers — continuation vs reversal ──
  console.log('── The (B) bet: top-quintile positive EARcc, INTRADAY filers — does it CONTINUE or REVERSE? ──');
  for (const scope of ['intraday', 'all']) {
    const base = scope === 'intraday' ? events.filter((e) => e.bucket === 'intraday') : events;
    const cut = quantile(base.map((e) => e.earcc).sort((a, b) => a - b), 1 - QUINTILE);
    const sel = base.filter((e) => e.earcc >= cut);
    const cont = tStat(sel.map((e) => e.contN));            // next-session market-adj drift
    const contNet = mean(sel.map((e) => e.contN)) - COST_HI; // after 250bps
    const intraCeil = sel.map((e) => e.intra);              // T0 capture ceiling for these events
    const verdict = cont.mean <= 0 ? '🚩 REVERSES (overreaction — B dead)' : cont.mean > COST_HI ? '✓ continues & clears 250bps' : cont.mean > COST_LO ? '~ continues, clears ~150 not 250' : '✗ continues but < cost';
    console.log(`   [${scope.padEnd(8)}] cutoff EARcc=${pctf(cut)}  N=${sel.length}  ·  next-session drift mean=${pctf(cont.mean)} (t=${cont.t.toFixed(2)})  net@250bps=${pctf(contNet)}  ·  med|T0 intra ceiling|=${pctf(median(intraCeil.map(Math.abs)))}  →  ${verdict}`);
  }
  console.log('');

  // ── verdict ──
  const intr = events.filter((e) => e.bucket === 'intraday');
  const intrTail = shareGt(intr.map((e) => e.earcc), COST_HI);
  const cutI = quantile(intr.map((e) => e.earcc).sort((a, b) => a - b), 1 - QUINTILE);
  const selI = intr.filter((e) => e.earcc >= cutI);
  const contMean = mean(selI.map((e) => e.contN));
  const green = intrTail >= 0.15 && contMean > COST_LO;
  console.log('=== GATE 0 VERDICT ===');
  console.log(`   intraday events with |EARcc|>250bps: ${(100 * intrTail).toFixed(0)}%  ·  top-quintile next-session drift: ${pctf(contMean)} (vs cost ${pctf(COST_LO)}-${pctf(COST_HI)})`);
  console.log(`   → ${green ? '🟢 GREEN — a cost-clearing, continuing intraday reaction exists. Buy minute data for event windows (Gate 1 / Exp18).'
    : '🔴 RED — reaction clusters below cost and/or does not continue. Do NOT buy intraday data; (B) loses to the squeeze.'}`);
  console.log('   (Gate 0 is a daily-data screen — the exact post-filing-minute capture is Gate 1\'s question.)');

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const csv = ['symbol,ann_date,bucket,reaction_date,earcc,gap,intra,continuation_next',
    ...events.map((e) => [e.sym, e.annDate, e.bucket, e.rDate, e.earcc.toFixed(5), e.gap.toFixed(5), e.intra.toFixed(5), e.contN.toFixed(5)].join(','))].join('\n');
  writeFileSync(join(OUTPUT_DIR, 'exp17_events.csv'), csv);
  console.log(`\n  Wrote ${join(OUTPUT_DIR, 'exp17_events.csv')}\nDone.`);
}
main().catch((e) => { console.error('Experiment failed:', e.message); process.exit(1); });
