#!/usr/bin/env node
//
// P1a — the 20-pair post-publication drift gate (READ-ONLY premise probe).
// Blueprint: research-notes/2026-06-12_news-brain-build-blueprint.md §3 Phase 1.
//
// QUESTION: in India, does a big move in a prominent company (the HEAD of a
// well-known economic link) precede SAME-DIRECTION drift in the linked company
// AFTER the move is public — i.e., does the Cohen-Frazzini slow-diffusion premise
// hold here at all? This is a GATE PROBE, not a pre-registered experiment: it
// decides whether the Mind's ripple thesis deserves a build, nothing more.
//
//   node scripts/research/p1a-pair-drift-gate.mjs                 # the real run
//   node scripts/research/p1a-pair-drift-gate.mjs --placebo       # shuffled event dates (must be ~0)
//   node scripts/research/p1a-pair-drift-gate.mjs --selftest      # synthetic harness validation
//   flags: --shock=0.03  --since=2015  --gap=6
//
// METHOD (mirrors exp16/exp18 idiom):
//   events  = days where |head's market-adjusted return| >= shock (default 3%),
//             >= gap trading days apart per pair (declustering)
//   measure = linked name's market-adjusted CAR over +1..+{5,10,20}, SIGNED by the
//             direction of the head's day-0 move (positive = same-direction drift)
//   context = linked name's day-0 co-move (how much the market already priced)
//   slices  = pooled · per-pair · low-attention sleeve vs high-attention sleeve
//             (Madsen 2017: the alpha lives in low-attention links) · recency (2022+)
//
// READING THE GATE (suggested, not a registered pass bar):
//   ALIVE  — low-attention sleeve signed CAR(+5 or +10) positive with |t|>=2
//   WEAK   — positive but |t|<2 → consider more pairs/events before deciding
//   FLAT   — ~0 or negative → the directional-ripple trade premise fails; the
//            insight-engine / dataset-of-record case stands on its own merits.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadEnvFile } from '../_seed-utils.mjs';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'output', 'p1a');

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const has = (n) => args.includes(`--${n}`);
const SHOCK = Number(flag('shock', '0.03'));
const SINCE = flag('since', '2015-01-01');
const GAP = Number(flag('gap', '6'));
const WINDOWS = [5, 10, 20];

// ── the pair roster (editable; bare NSE symbols, .NS appended at load) ───────
// type: 'supply' = customer→supplier · 'group' = flagship→sibling/subsidiary
// attention: rough analyst-coverage flag for the linked name ('low' = the Madsen sleeve)
const PAIRS = [
  { head: 'MARUTI',     linked: 'MOTHERSON',  type: 'supply', attention: 'high', why: 'auto components; Maruti major customer' },
  { head: 'MARUTI',     linked: 'BOSCHLTD',   type: 'supply', attention: 'high', why: 'fuel systems/electricals to Maruti' },
  { head: 'MARUTI',     linked: 'SUBROS',     type: 'supply', attention: 'low',  why: 'AC systems; Maruti is the dominant customer' },
  { head: 'TATAMOTORS', linked: 'BHARATFORG', type: 'supply', attention: 'high', why: 'CV forgings' },
  { head: 'ASHOKLEY',   linked: 'JAMNAAUTO',  type: 'supply', attention: 'low',  why: 'CV leaf springs; AL a top customer' },
  { head: 'BAJAJ-AUTO', linked: 'ENDURANCE',  type: 'supply', attention: 'low',  why: '2W components; Bajaj a top customer' },
  { head: 'M&M',        linked: 'SWARAJENG',  type: 'supply', attention: 'low',  why: 'tractor engines effectively sole-customer M&M' },
  { head: 'EICHERMOT',  linked: 'GABRIEL',    type: 'supply', attention: 'low',  why: '2W/CV shock absorbers' },
  { head: 'HEROMOTOCO', linked: 'SUPRAJIT',   type: 'supply', attention: 'low',  why: '2W cables/components' },
  { head: 'RELIANCE',   linked: 'ALOKINDS',   type: 'group',  attention: 'low',  why: 'RIL promoter + principal customer' },
  { head: 'ADANIENT',   linked: 'ADANIPOWER', type: 'group',  attention: 'high', why: 'Adani flagship → sibling' },
  { head: 'ADANIENT',   linked: 'ADANIGREEN', type: 'group',  attention: 'high', why: 'Adani flagship → sibling' },
  { head: 'VEDL',       linked: 'HINDZINC',   type: 'group',  attention: 'high', why: 'parent → listed subsidiary' },
  { head: 'GRASIM',     linked: 'ULTRACEMCO', type: 'group',  attention: 'high', why: 'holding company link' },
  { head: 'BAJFINANCE', linked: 'BAJAJFINSV', type: 'group',  attention: 'high', why: 'holding structure (mechanical link)' },
  { head: 'JSWSTEEL',   linked: 'JSWENERGY',  type: 'group',  attention: 'high', why: 'JSW group siblings' },
  { head: 'TCS',        linked: 'TATAELXSI',  type: 'group',  attention: 'low',  why: 'Tata brand/info spillover into smaller sibling' },
  { head: 'HDFCBANK',   linked: 'HDFCAMC',    type: 'group',  attention: 'high', why: 'brand/group association' },
  { head: 'SBIN',       linked: 'SBILIFE',    type: 'group',  attention: 'high', why: 'parent → listed insurer' },
  { head: 'SBIN',       linked: 'SBICARD',    type: 'group',  attention: 'high', why: 'parent → listed cards co' },
];
const BENCH_CANDIDATES = ['^NSEI', 'NIFTYBEES.NS', '^CRSLDX'];

// ── tiny deterministic RNG for placebo/selftest ──────────────────────────────
function mulberry32(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ── core machinery (pure functions over {dates[], ret[]} series) ─────────────
function toReturns(rows) {
  const dates = []; const ret = [];
  for (let i = 1; i < rows.length; i++) {
    const a = Number(rows[i - 1].adj_close); const b = Number(rows[i].adj_close);
    if (a > 0 && b > 0) { dates.push(rows[i].d); ret.push(b / a - 1); }
  }
  return { dates, ret };
}
function abnormalSeries(series, bench) {
  const bmap = new Map(bench.dates.map((d, i) => [d, bench.ret[i]]));
  const dates = []; const abn = [];
  for (let i = 0; i < series.dates.length; i++) {
    const br = bmap.get(series.dates[i]);
    if (br !== undefined) { dates.push(series.dates[i]); abn.push(series.ret[i] - br); }
  }
  return { dates, abn };
}
function findEvents(head, shock, gap, since) {
  const events = []; let lastIdx = -1e9;
  for (let i = 0; i < head.dates.length; i++) {
    if (head.dates[i] < since) continue;
    if (Math.abs(head.abn[i]) >= shock && i - lastIdx >= gap) { events.push(i); lastIdx = i; }
  }
  return events;
}
function measureEvent(head, linked, hIdx, windows) {
  const date = head.dates[hIdx];
  const lIdx = linked.dates.indexOf(date);
  if (lIdx < 0) return null;
  const sign = Math.sign(head.abn[hIdx]);
  const out = { date, headAbn0: head.abn[hIdx], linkedDay0: sign * linked.abn[lIdx], cars: {} };
  for (const w of windows) {
    if (lIdx + w >= linked.abn.length) return null; // need the full window
    let car = 0;
    for (let k = 1; k <= w; k++) car += linked.abn[lIdx + k];
    out.cars[w] = sign * car;
  }
  return out;
}
function stats(vals) {
  const n = vals.length;
  if (n === 0) return { n: 0, mean: NaN, t: NaN, hit: NaN };
  const mean = vals.reduce((s, x) => s + x, 0) / n;
  const sd = Math.sqrt(vals.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1));
  return { n, mean, t: sd > 0 ? mean / (sd / Math.sqrt(n)) : NaN, hit: vals.filter((x) => x > 0).length / n };
}
const pct = (x) => `${(x * 100).toFixed(2)}%`;
const fmt = (s) => s.n ? `n=${String(s.n).padStart(4)}  mean=${pct(s.mean).padStart(7)}  t=${s.t.toFixed(2).padStart(6)}  hit=${(s.hit * 100).toFixed(0)}%` : 'n=0';

function runStudy(pairSeries, { placebo = false, seed = 42 } = {}) {
  const rng = mulberry32(seed);
  const events = [];
  for (const p of pairSeries) {
    let idxs = findEvents(p.head, SHOCK, GAP, SINCE);
    if (placebo) {
      // shift each event to a random index far from the true one (same series, fake dates)
      idxs = idxs.map(() => GAP + Math.floor(rng() * (p.head.dates.length - 25 - GAP))).sort((a, b) => a - b);
    }
    for (const i of idxs) {
      const m = measureEvent(p.head, p.linked, i, WINDOWS);
      if (m) events.push({ ...m, pair: `${p.meta.head}→${p.meta.linked}`, attention: p.meta.attention, type: p.meta.type });
    }
  }
  return events;
}

function report(events, label) {
  console.log(`\n=== ${label} · shock>=${pct(SHOCK)} · since ${SINCE} · gap ${GAP}d · ${events.length} events (${new Set(events.map((e) => e.date)).size} distinct days) ===`);
  console.log(`  day-0 co-move (context):       ${fmt(stats(events.map((e) => e.linkedDay0)))}`);
  for (const w of WINDOWS) console.log(`  signed POST CAR +1..+${String(w).padEnd(2)}        ${fmt(stats(events.map((e) => e.cars[w])))}`);
  for (const att of ['low', 'high']) {
    const sub = events.filter((e) => e.attention === att);
    console.log(`  — ${att === 'low' ? 'LOW-attention sleeve (the thesis)' : 'high-attention sleeve'}:`);
    for (const w of WINDOWS) console.log(`      +1..+${String(w).padEnd(2)}                   ${fmt(stats(sub.map((e) => e.cars[w])))}`);
  }
  const recent = events.filter((e) => e.date >= '2022-01-01');
  console.log(`  — recency slice (2022+): ${recent.length} events`);
  for (const w of WINDOWS) console.log(`      +1..+${String(w).padEnd(2)}                   ${fmt(stats(recent.map((e) => e.cars[w])))}`);
  console.log('  — per pair (CAR +1..+5):');
  const byPair = new Map();
  for (const e of events) { if (!byPair.has(e.pair)) byPair.set(e.pair, []); byPair.get(e.pair).push(e.cars[5]); }
  for (const [pair, vals] of [...byPair.entries()].sort()) console.log(`      ${pair.padEnd(24)} ${fmt(stats(vals))}`);
}

// ── selftest: synthetic series with a KNOWN injected lag-drift ───────────────
function selftest() {
  const rng = mulberry32(7);
  const gauss = () => { const u = Math.max(rng(), 1e-9); const v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const N = 2600; const dates = []; const bench = [];
  for (let i = 0; i < N; i++) { dates.push(`2016-${String(100 + Math.floor(i / 26)).slice(1)}-${String(100 + (i % 26) + 1).slice(1)}`); bench.push(0.009 * gauss()); }
  const hAbn = []; const shocks = [];
  for (let i = 0; i < N; i++) { const sh = i % 40 === 20 ? (rng() > 0.5 ? 0.05 : -0.05) : 0; shocks.push(sh); hAbn.push(sh + 0.012 * gauss()); }
  // responsive linked: 40% co-move day0, +30% of the shock diffuses over days 1..5 (the CF underreaction shape)
  const lResp = []; const lInd = [];
  for (let i = 0; i < N; i++) {
    let diff = 0;
    for (let k = 1; k <= 5; k++) if (i - k >= 0) diff += 0.06 * shocks[i - k];
    lResp.push(0.4 * shocks[i] + diff + 0.011 * gauss());
    lInd.push(0.011 * gauss());
  }
  const mk = (abn) => ({ dates, abn });
  const meta = { head: 'SYN_H', linked: 'SYN_L', attention: 'low', type: 'supply' };
  const evResp = runStudy([{ head: mk(hAbn), linked: mk(lResp), meta }]);
  const evInd = runStudy([{ head: mk(hAbn), linked: mk(lInd), meta: { ...meta, linked: 'SYN_IND' } }]);
  const sResp = stats(evResp.map((e) => e.cars[5]));
  const sInd = stats(evInd.map((e) => e.cars[5]));
  console.log(`selftest responsive: ${fmt(sResp)}   (expect strongly positive — injected ~+1.5% over +5)`);
  console.log(`selftest independent: ${fmt(sInd)}   (expect statistically ~0, i.e. |t|<2.5)`);
  const pass = sResp.n > 20 && sResp.mean > 0.008 && sResp.t > 3 && Math.abs(sInd.t) < 2.5;
  console.log(pass ? 'SELFTEST PASS ✅' : 'SELFTEST FAIL ❌');
  process.exit(pass ? 0 : 1);
}

async function main() {
  if (has('selftest')) return selftest();

  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(2); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // benchmark
  let bench = null; let benchSym = null;
  for (const b of BENCH_CANDIDATES) {
    const { rows } = await pool.query(
      `SELECT to_char(trade_date,'YYYY-MM-DD') AS d, adj_close FROM research_prices WHERE symbol=$1 ORDER BY trade_date`, [b]);
    if (rows.length > 250) { bench = toReturns(rows); benchSym = b; break; }
  }
  if (!bench) { console.error(`ERROR: no benchmark found (tried ${BENCH_CANDIDATES.join(', ')})`); process.exit(2); }

  const load = async (sym) => {
    for (const s of [`${sym}.NS`, sym]) {
      const { rows } = await pool.query(
        `SELECT to_char(trade_date,'YYYY-MM-DD') AS d, adj_close FROM research_prices WHERE symbol=$1 ORDER BY trade_date`, [s]);
      if (rows.length > 250) return toReturns(rows);
    }
    return null;
  };

  const pairSeries = []; const unpriced = [];
  for (const p of PAIRS) {
    const h = await load(p.head); const l = await load(p.linked);
    if (!h || !l) { unpriced.push(`${p.head}→${p.linked}${!h ? ` (head ${p.head} missing)` : ''}${!l ? ` (linked ${p.linked} missing)` : ''}`); continue; }
    pairSeries.push({ head: abnormalSeries(h, bench), linked: abnormalSeries(l, bench), meta: p });
  }
  console.log(`benchmark: ${benchSym} · pairs priced: ${pairSeries.length}/${PAIRS.length}`);
  if (unpriced.length) console.log(`  unpriced (skipped): ${unpriced.join('; ')}`);

  const placebo = has('placebo');
  const events = runStudy(pairSeries, { placebo });
  report(events, placebo ? 'P1a PLACEBO (random event dates — expect ~0)' : 'P1a PAIR-DRIFT GATE');

  if (!placebo) {
    mkdirSync(OUT_DIR, { recursive: true });
    const csv = ['pair,type,attention,date,head_abn0,linked_day0,car5,car10,car20',
      ...events.map((e) => `${e.pair},${e.type},${e.attention},${e.date},${e.headAbn0.toFixed(5)},${e.linkedDay0.toFixed(5)},${e.cars[5].toFixed(5)},${e.cars[10].toFixed(5)},${e.cars[20].toFixed(5)}`)].join('\n');
    writeFileSync(join(OUT_DIR, 'p1a_events.csv'), csv);
    console.log(`\nevents written: ${join(OUT_DIR, 'p1a_events.csv')}`);
    console.log('\nGATE READING — ALIVE if the LOW-attention sleeve +5/+10 is positive with |t|>=2; verify the placebo is ~0 before believing anything.');
  }
  await pool.end();
}

main().catch((e) => { console.error('P1a failed:', e.message); process.exit(2); });
