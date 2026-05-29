#!/usr/bin/env node
//
// Experiment 14 — Do governance shocks move prices? (auditor / pledge event study)
// See: ai_docs/sachnetra v2/wiki/experiments/Exp14.md (pre-registered hypothesis,
//      verdict tiers §5, and caveat checklist §9 live there — read §1/§5/§9 before
//      interpreting any output below).
//
// HYPOTHESIS (locked in Exp14.md §1):
//   H14a — NSE filings classified as GOVERNANCE SHOCKS (auditor resignation,
//          promoter pledge increase) produce a NEGATIVE cumulative abnormal return
//          in POST [+1..+5] trading days, mean signed CAR distinguishable from 0 at
//          p<0.05.
//   H14b — for events with |CAR_POST| >= 150 bps gross, the effect survives a
//          concentration check (top-3 events / top-3 days dropped) AND beats a
//          round-trip cost floor of 50 bps on liquid (Nifty-50) names.
//   H14c — (v2, not run on v1) midcap |CAR_POST| >= 2x large-cap — blocked on G4.
//
// METHOD (Exp14.md §3) — narrowed re-use of the Exp 2 market-adjusted event study:
//   AR_t(stock) = log_return_t(stock) − log_return_t(^NSEI).
//   Event day 0 = first trading day on/after announced_at AT TIME ZONE 'Asia/Kolkata'.
//   PRE = CAR[−5..−1] ; DAY0 = AR[0] ; POST = CAR[+1..+5]  ← headline window (tradable).
//   Buckets (exact Exp 2 regex): auditor → /auditor/ ; promoter_pledge → /pledg|encumbr/.
//   Sub-tags (Exp14.md §3.2): auditor_resignation / auditor_change / pledge_increase /
//     pledge_release. PRIMARY analysis = auditor_resignation + pledge_increase only;
//     pledge_release is EXCLUDED from the primary test. SECONDARY = full buckets.
//   Dedupe by (symbol, event_day) keeping the earliest filing (Exp14.md §9).
//   Concentration check (Exp 10 §3.5 discipline): drop top-3 |POST CAR| events AND
//     top-3 trading days; the headline must survive for H14b.
//   Per-symbol cap: flag if >40% of a bucket's events come from one symbol.
//
// BOUNDARY (memory/feedback_v2_prod_execution + research playbook):
//   READ-ONLY on prod. SELECTs research_prices + india_bourse_announcements only.
//   Writes local files under output/exp14/. --selftest needs NO DB.
//
// USAGE
//   node scripts/research/exp14-governance-shock-event-study.mjs --selftest   # synthetic, no DB
//   node scripts/research/exp14-governance-shock-event-study.mjs              # full prod run
//   node scripts/research/exp14-governance-shock-event-study.mjs --from=2026-04-01
//   node scripts/research/exp14-governance-shock-event-study.mjs --bucket=auditor
//   node scripts/research/exp14-governance-shock-event-study.mjs --min-events=10

import { loadEnvFile } from '../_seed-utils.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

// ── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const SELFTEST = args.includes('--selftest');
const PRE = Math.max(1, Number(flag('pre', '5')));
const POST = Math.max(1, Number(flag('post', '5')));
const MIN_EVENTS = Number(flag('min-events', '10'));   // reporting gate; ✅ needs N>=20 (hardcoded §5)
const INDEX_SYMBOL = flag('index', '^NSEI');
const FROM = flag('from', null);
const TO = flag('to', null);
const BUCKET_FILTER = flag('bucket', null);            // 'auditor' | 'promoter_pledge' | null
if (flag('universe', null) === 'midcap150') {
  console.error('ERROR: --universe=midcap150 is BLOCKED until G4 (Exp14.md §3.1). v1 is Nifty-50 only. Aborting.');
  process.exit(1);
}

// Pre-registered constants (Exp14.md §3.4 / §3.5 / §5).
const N_SUPPORTED = 20;       // ✅ SUPPORTED minimum N
const N_BLOCKED = 10;         // below this in both buckets → ⬜ BLOCKED
const COST_FLOOR_BPS = 50;    // Nifty-50 round-trip (Exp14.md §3.5)
const GROSS_BPS_GATE = 150;   // |CAR_POST| gross gate for H14b
const NET_BPS_GATE = 50;      // net-of-cost gate for H14b
const HIT_AUDITOR = -0.015;   // POST CAR < −1.5% (Exp14.md §3.4)
const HIT_PLEDGE = -0.010;    // POST CAR < −1.0%

// ── Stats (no deps; mirrors Exp 2 / Exp 10) ───────────────────────────────────
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
function tStat(arr) {
  const n = arr.length;
  if (n < 2) return { n, mean: n ? arr[0] : NaN, sd: NaN, t: NaN, p: NaN };
  const m = mean(arr);
  const sd = Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1));
  if (sd === 0) return { n, mean: m, sd: 0, t: NaN, p: NaN };
  const t = m / (sd / Math.sqrt(n));
  return { n, mean: m, sd, t, p: twoSidedP(t) };
}
function twoSidedP(t) {
  const z = Math.abs(t);
  const erf = (x) => {
    const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const tt = 1 / (1 + p * x);
    return s * (1 - (((((a5 * tt + a4) * tt) + a3) * tt + a2) * tt + a1) * tt * Math.exp(-x * x));
  };
  return 2 * (1 - 0.5 * (1 + erf(z / Math.SQRT2)));
}
const pct = (x) => (x == null || !Number.isFinite(x) ? '—' : `${(x * 100).toFixed(2)}%`);
const bps = (x) => (x == null || !Number.isFinite(x) ? '—' : `${(x * 10000).toFixed(0)} bps`);
const stars = (p) => (p == null || !Number.isFinite(p) ? '' : p < 0.01 ? '***' : p < 0.05 ? '**' : p < 0.1 ? '*' : '');

// ── Bucket regexes (EXACT Exp 2 — do not change) ──────────────────────────────
const BUCKETS = [
  ['auditor', /auditor/],
  ['promoter_pledge', /pledg|encumbr/],
];
function classify(text) {
  const t = (text || '').toLowerCase();
  const hits = [];
  for (const [name, re] of BUCKETS) if (re.test(t)) hits.push(name);
  return hits;
}

// ── Governance sub-tags (Exp14.md §3.2 — locked) ──────────────────────────────
// Returns the set of sub-tags a single filing earns. Order matters: the "shock"
// directions (resignation / release) are tested before the benign ones so an
// "appointment to fill a vacancy caused by resignation" is tagged a resignation,
// and a "revocation of pledge" is tagged a release (excluded from the primary test).
const RE_AUD_RESIGN = /resign|vacated|discontinu/;
const RE_AUD_CHANGE = /appoint|change|reappoint/;
const RE_PLEDGE_RELEASE = /revoke|release|discharge/;
const RE_PLEDGE_INCREASE = /pledge|encumbr|margin call|invok/;
function subTags(text, buckets) {
  const t = (text || '').toLowerCase();
  const tags = [];
  if (buckets.includes('auditor')) {
    if (RE_AUD_RESIGN.test(t)) tags.push('auditor_resignation');
    else if (RE_AUD_CHANGE.test(t)) tags.push('auditor_change');
  }
  if (buckets.includes('promoter_pledge')) {
    if (RE_PLEDGE_RELEASE.test(t)) tags.push('pledge_release');
    else if (RE_PLEDGE_INCREASE.test(t)) tags.push('pledge_increase');
  }
  return tags;
}

// Unit registry: which test units exist, their family, and whether they are primary.
const UNITS = [
  { name: 'auditor_resignation', family: 'auditor', primary: true, hit: HIT_AUDITOR },
  { name: 'pledge_increase', family: 'promoter_pledge', primary: true, hit: HIT_PLEDGE },
  { name: 'auditor', family: 'auditor', primary: false, hit: HIT_AUDITOR },
  { name: 'promoter_pledge', family: 'promoter_pledge', primary: false, hit: HIT_PLEDGE },
  { name: 'auditor_change', family: 'auditor', primary: false, hit: HIT_AUDITOR },
  { name: 'pledge_release', family: 'promoter_pledge', primary: false, hit: HIT_PLEDGE },
];
function unitsForEvent(buckets, tags) {
  // Map an event's buckets+subtags to the unit names it contributes to.
  const out = new Set();
  if (buckets.includes('auditor')) out.add('auditor');               // secondary full bucket
  if (buckets.includes('promoter_pledge')) out.add('promoter_pledge');
  for (const tg of tags) out.add(tg);                                // sub-tags (incl. primary)
  return out;
}

// ── Forward/relative-day machinery (Exp 2) ────────────────────────────────────
function firstAtOrAfter(dates, target) {
  let lo = 0, hi = dates.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (dates[m] >= target) hi = m; else lo = m + 1; }
  return lo; // index of first date >= target (== dates.length if none)
}

// ── Core: build the governance event set (pure; selftest calls this directly) ──
// annRows : [{ symbol, ann_date 'YYYY-MM-DD', ts (epoch, for earliest-filing dedupe), category, subject }]
// bySym   : Map(priceSymbol -> { dates:[YYYY-MM-DD asc], rets:[number|null] })
// idxRet  : Map(date -> indexLogReturn)
// Returns { events, funnel } where each event is
//   { symbol, psym, eventDay, ann_date, category, subject, buckets:[], tags:[], pre, day0, post, full }.
function buildEvents(annRows, bySym, idxRet, { pre = PRE, post = POST } = {}) {
  const priceSymbols = new Set(bySym.keys());
  const funnel = { total: 0, governance: 0, priced: 0, deduped: 0, usable: 0, excluded: {} };
  const excl = (reason) => { funnel.excluded[reason] = (funnel.excluded[reason] || 0) + 1; };

  // 1) classify + price filter
  const candidates = [];
  for (const a of annRows) {
    funnel.total++;
    const buckets = classify(`${a.category} ${a.subject}`);
    if (buckets.length === 0) continue;          // not a governance filing
    funnel.governance++;
    const psym = `${a.symbol}.NS`;
    if (!priceSymbols.has(psym)) { excl('no_priced_symbol'); continue; }
    funnel.priced++;
    const tags = subTags(`${a.category} ${a.subject}`, buckets);
    candidates.push({ symbol: a.symbol, psym, ann_date: a.ann_date, ts: Number(a.ts) || 0, category: a.category, subject: a.subject, buckets, tags });
  }

  // 2) compute event day (first trading day on/after ann_date) per candidate
  for (const c of candidates) {
    const series = bySym.get(c.psym);
    const p0 = firstAtOrAfter(series.dates, c.ann_date);
    if (p0 >= series.dates.length) { c.skip = 'no_event_day'; continue; }
    c.p0 = p0;
    c.eventDay = series.dates[p0];
  }

  // 3) dedupe by (symbol, eventDay) keeping the earliest filing
  const byKey = new Map();
  for (const c of candidates) {
    if (c.skip) { excl(c.skip); continue; }
    const key = `${c.psym}|${c.eventDay}`;
    const prev = byKey.get(key);
    if (!prev) byKey.set(key, c);
    else {
      funnel.duplicates = (funnel.duplicates || 0) + 1;
      if (c.ts < prev.ts) byKey.set(key, c);   // keep earlier filing
    }
  }
  funnel.deduped = byKey.size;

  // 4) build AR window; require full ±window
  const events = [];
  for (const c of byKey.values()) {
    const series = bySym.get(c.psym);
    const p0 = c.p0;
    if (p0 - pre < 0 || p0 + post >= series.dates.length) { excl('incomplete_window'); continue; }
    let ok = true, preCar = 0, postCar = 0, day0 = 0, full = 0;
    for (let k = -pre; k <= post; k++) {
      const pos = p0 + k;
      const d = series.dates[pos];
      const sr = series.rets[pos];
      const ir = idxRet.get(d);
      if (sr == null || ir == null) { ok = false; break; }
      const ar = sr - ir;
      full += ar;
      if (k < 0) preCar += ar; else if (k === 0) day0 = ar; else postCar += ar;
    }
    if (!ok) { excl('missing_return'); continue; }
    funnel.usable++;
    events.push({ symbol: c.symbol, psym: c.psym, eventDay: c.eventDay, ann_date: c.ann_date,
      category: c.category, subject: c.subject, buckets: c.buckets, tags: c.tags,
      pre: preCar, day0, post: postCar, full });
  }
  return { events, funnel };
}

// ── Per-unit analysis (event study stats + concentration + cost floor) ─────────
function analyzeUnit(def, recs) {
  const n = recs.length;
  const posts = recs.map((r) => r.post);
  const post = tStat(posts);
  const preS = tStat(recs.map((r) => r.pre));
  const d0 = tStat(recs.map((r) => r.day0));
  const hits = posts.filter((x) => x < def.hit).length;
  const hitRate = n ? hits / n : NaN;

  // concentration: drop top-3 by |POST|
  const byAbs = [...recs].sort((a, b) => Math.abs(b.post) - Math.abs(a.post));
  const dropEvArr = byAbs.slice(3).map((r) => r.post);
  const dropEv = tStat(dropEvArr);
  // concentration: drop top-3 trading days by event count
  const dayCounts = new Map();
  for (const r of recs) dayCounts.set(r.eventDay, (dayCounts.get(r.eventDay) || 0) + 1);
  const topDays = new Set([...dayCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d));
  const dropDayArr = recs.filter((r) => !topDays.has(r.eventDay)).map((r) => r.post);
  const dropDays = dropDayArr.length >= 2 ? tStat(dropDayArr) : { n: dropDayArr.length, mean: dropDayArr[0] ?? NaN, t: NaN, p: NaN };

  // per-symbol cap
  const symCounts = new Map();
  for (const r of recs) symCounts.set(r.symbol, (symCounts.get(r.symbol) || 0) + 1);
  let topSym = null, topSymN = 0;
  for (const [s, c] of symCounts) if (c > topSymN) { topSymN = c; topSym = s; }
  const topSymFrac = n ? topSymN / n : 0;

  // H14b cost floor (Exp14.md §3.5): negative drift, gross > 150 bps, survives
  // concentration, net of 50 bps cost > 50 bps.
  const grossBps = Math.abs(post.mean) * 10000;
  const negative = post.mean < 0;
  const grossPass = negative && grossBps > GROSS_BPS_GATE;
  const netPass = (grossBps - COST_FLOOR_BPS) > NET_BPS_GATE;
  // "survives concentration" = drop-top-3-events keeps the same (negative) sign and
  // does not collapse to insignificance (p stays < 0.10); same for drop-top-3-days
  // when that subset is testable.
  const evSurvive = dropEvArr.length >= 2 && dropEv.mean < 0 && Number.isFinite(dropEv.p) && dropEv.p < 0.10;
  const daySurvive = dropDayArr.length < 2 ? true : (dropDays.mean < 0 && Number.isFinite(dropDays.p) && dropDays.p < 0.10);
  const concSurvives = evSurvive && daySurvive;
  const h14b = grossPass && netPass && concSurvives;

  return { ...def, n, pre: preS, d0, post, hitRate, dropEv, dropDays, topSym, topSymN, topSymFrac, grossBps, negative, h14b, concSurvives, recs };
}

// ── Verdict (Exp14.md §5 — locked, no moving the goalposts) ───────────────────
function computeVerdict(unitMap) {
  const get = (n) => unitMap.get(n);
  const full = ['auditor', 'promoter_pledge'].map(get).filter(Boolean);
  const maxFullN = Math.max(0, ...full.map((u) => u.n));

  // ⬜ BLOCKED: N<10 in BOTH governance buckets after the funnel.
  if (maxFullN < N_BLOCKED) {
    return { tag: '⬜ BLOCKED', emoji: '⬜', cls: 'mut',
      line: `N<${N_BLOCKED} in both governance buckets (largest bucket N=${maxFullN}) — data-starved, not a market verdict. Re-run monthly.`,
      winners: [] };
  }

  // Candidate test units: primary sub-tags preferred, full buckets as backup.
  const cand = ['auditor_resignation', 'pledge_increase', 'auditor', 'promoter_pledge']
    .map(get).filter((u) => u && u.n >= N_BLOCKED);

  const supported = cand.filter((u) => u.n >= N_SUPPORTED && u.negative && u.post.p < 0.05 && u.h14b && u.concSurvives && u.topSymFrac <= 0.40);
  if (supported.length) {
    return { tag: '✅ SUPPORTED', emoji: '✅', cls: 'ok',
      line: `${supported.map((u) => u.name).join(', ')} — negative POST CAR p<0.05, N≥${N_SUPPORTED}, H14b cost floor passed, concentration-robust.`,
      winners: supported };
  }

  // Negative & significant (p<0.05): real direction, but either too small (H14b) or concentration-fragile.
  const negSig05 = cand.filter((u) => u.negative && u.post.p < 0.05);
  if (negSig05.length) {
    const fragile = negSig05.filter((u) => !u.concSurvives || u.topSymFrac > 0.40);
    if (fragile.length === negSig05.length) {
      return { tag: '🚩 SUSPECT', emoji: '🚩', cls: 'bad',
        line: `${fragile.map((u) => u.name).join(', ')} — negative POST CAR p<0.05 but concentration check fails or one symbol >40% of events.`,
        winners: fragile };
    }
    return { tag: '🟡 PROMISING', emoji: '🟡', cls: 'warn',
      line: `${negSig05.map((u) => u.name).join(', ')} — negative POST CAR p<0.05 but fails H14b cost/size floor.`,
      winners: negSig05 };
  }

  // Negative & marginally significant (p<0.10).
  const negSig10 = cand.filter((u) => u.negative && u.post.p < 0.10);
  if (negSig10.length) {
    return { tag: '🟡 PROMISING', emoji: '🟡', cls: 'warn',
      line: `${negSig10.map((u) => u.name).join(', ')} — negative POST CAR significant at p<0.10 (directionally consistent, not yet decisive).`,
      winners: negSig10 };
  }

  // Negative but underpowered (10 ≤ N < 20, not significant) → directionally consistent.
  const negUnder = cand.filter((u) => u.negative && u.n < N_SUPPORTED);
  if (negUnder.length) {
    return { tag: '🟡 PROMISING', emoji: '🟡', cls: 'warn',
      line: `${negUnder.map((u) => u.name).join(', ')} — negative POST CAR but N<${N_SUPPORTED} (underpowered, directionally consistent).`,
      winners: negUnder };
  }

  // Otherwise: powered nulls (N≥20, p>0.10) or positive drift (wrong sign).
  const positive = cand.filter((u) => !u.negative);
  return { tag: '❌ NULL', emoji: '❌', cls: 'bad',
    line: positive.length
      ? `POST CAR is positive (wrong sign) in ${positive.map((u) => u.name).join(', ')}; no governance bucket shows negative drift.`
      : `POST CAR indistinguishable from zero (p>0.10) in all governance buckets with N≥${N_BLOCKED}.`,
    winners: [] };
}

// ── Output paths ───────────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dir, 'output', 'exp14');

// ── CSV builders ────────────────────────────────────────────────────────────────
const csvCell = (v) => { if (v == null) return ''; const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csvRow = (a) => a.map(csvCell).join(',') + '\n';
const fx = (v, d = 6) => (v == null || !Number.isFinite(v) ? '' : v.toFixed(d));

function buildEventsCsv(events) {
  let out = csvRow(['symbol', 'event_day', 'ann_date', 'buckets', 'sub_tags', 'category', 'subject', 'PRE_car', 'DAY0_ar', 'POST_car']);
  for (const e of [...events].sort((a, b) => a.post - b.post)) {
    out += csvRow([e.symbol, e.eventDay, e.ann_date, e.buckets.join('|'), e.tags.join('|'), e.category, e.subject,
      fx(e.pre), fx(e.day0), fx(e.post)]);
  }
  return out;
}
function buildSummaryCsv(units) {
  let out = csvRow(['unit', 'family', 'primary', 'n', 'pre_mean', 'pre_t', 'pre_p', 'day0_mean', 'day0_t', 'day0_p',
    'post_mean', 'post_t', 'post_p', 'hit_rate', 'post_drop_top3ev_mean', 'drop_ev_t', 'drop_ev_p',
    'post_drop_top3day_mean', 'drop_day_t', 'drop_day_p', 'top_symbol', 'top_symbol_frac', 'gross_bps', 'h14b_pass', 'conc_survives']);
  for (const u of units) {
    out += csvRow([u.name, u.family, u.primary, u.n,
      fx(u.pre.mean), fx(u.pre.t, 3), fx(u.pre.p, 4), fx(u.d0.mean), fx(u.d0.t, 3), fx(u.d0.p, 4),
      fx(u.post.mean), fx(u.post.t, 3), fx(u.post.p, 4), fx(u.hitRate, 3),
      fx(u.dropEv.mean), fx(u.dropEv.t, 3), fx(u.dropEv.p, 4),
      fx(u.dropDays.mean), fx(u.dropDays.t, 3), fx(u.dropDays.p, 4),
      u.topSym, fx(u.topSymFrac, 3), fx(u.grossBps, 1), u.h14b, u.concSurvives]);
  }
  return out;
}

// ── HTML report (self-contained inline CSS+SVG; Exp 12 style) ─────────────────
function badge(text, cls) {
  const col = { ok: '#22c55e', warn: '#f59e0b', bad: '#ef4444', mut: '#475569' }[cls] || '#475569';
  return `<span style="background:${col}22;color:${col};border:1px solid ${col};padding:1px 7px;border-radius:10px;font-size:11px;white-space:nowrap">${text}</span>`;
}

function svgBarChart(units) {
  const chartable = units.filter((u) => u.n >= 1);
  if (!chartable.length) return '<div class="explain">No governance buckets had any usable events to chart.</div>';
  const W = 840, H = 380, PL = 64, PR = 20, PT = 26, PB = 88;
  const vals = chartable.flatMap((u) => [u.pre.mean, u.d0.mean, u.post.mean]).filter((x) => Number.isFinite(x));
  const maxAbs = Math.max(0.005, ...vals.map(Math.abs)) * 1.25;
  const groups = chartable.length;
  const gW = (W - PL - PR) / groups;
  const barW = Math.max(8, Math.min(26, gW / 4.2));
  const plotTop = PT, plotBot = H - PB;
  const yOf = (v) => plotTop + ((maxAbs - v) / (2 * maxAbs)) * (plotBot - plotTop);
  const zeroY = yOf(0);
  const series = [['pre', 'PRE', '#64748b'], ['d0', 'DAY0', '#3b82f6'], ['post', 'POST', '#f59e0b']];

  let bars = '';
  chartable.forEach((u, gi) => {
    const gx = PL + gi * gW + gW / 2;
    series.forEach((s, si) => {
      const m = u[s[0]].mean;
      if (!Number.isFinite(m)) return;
      const x = gx + (si - 1) * (barW + 3) - barW / 2;
      const y = yOf(Math.max(0, m));
      const h = Math.abs(yOf(m) - zeroY);
      const star = stars(u[s[0]].p);
      bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0.5, h).toFixed(1)}" fill="${s[2]}" rx="2"/>`;
      const lblY = m >= 0 ? y - 3 : y + h + 11;
      bars += `<text x="${(x + barW / 2).toFixed(1)}" y="${lblY.toFixed(1)}" fill="#94a3b8" font-size="9" text-anchor="middle">${(m * 10000).toFixed(0)}${star}</text>`;
    });
    const name = u.name.replace(/_/g, ' ');
    bars += `<text x="${gx.toFixed(1)}" y="${(H - PB + 24).toFixed(1)}" fill="#cbd5e1" font-size="11" text-anchor="middle">${name}</text>`;
    bars += `<text x="${gx.toFixed(1)}" y="${(H - PB + 40).toFixed(1)}" fill="#64748b" font-size="10" text-anchor="middle">n=${u.n}${u.primary ? ' · primary' : ''}</text>`;
  });

  const yticks = [maxAbs, maxAbs / 2, 0, -maxAbs / 2, -maxAbs].map((v) =>
    `<line x1="${PL}" y1="${yOf(v).toFixed(1)}" x2="${W - PR}" y2="${yOf(v).toFixed(1)}" stroke="${v === 0 ? '#475569' : '#1e293b'}" stroke-width="${v === 0 ? 1.4 : 1}"/>` +
    `<text x="${PL - 6}" y="${(yOf(v) + 3).toFixed(1)}" fill="#64748b" font-size="9" text-anchor="end">${(v * 10000).toFixed(0)}</text>`).join('');

  const legend = series.map((s, i) =>
    `<rect x="${PL + i * 120}" y="6" width="11" height="11" fill="${s[2]}" rx="2"/><text x="${PL + i * 120 + 16}" y="15" fill="#94a3b8" font-size="11">${s[1]} CAR (bps)</text>`).join('');

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" style="background:#0b1120;border-radius:8px">
    ${legend}${yticks}${bars}
    <text x="14" y="${((plotTop + plotBot) / 2).toFixed(1)}" fill="#64748b" font-size="10" transform="rotate(-90 14 ${((plotTop + plotBot) / 2).toFixed(1)})" text-anchor="middle">abnormal return (bps)</text>
  </svg>`;
}

function buildHtmlReport({ units, allUnits, funnel, verdict, topEvents, priceSymbols, dateFrom, dateTo }) {
  const vcol = { ok: '#22c55e', warn: '#f59e0b', bad: '#ef4444', mut: '#475569' }[verdict.cls];

  const funnelRows = [
    ['Total announcements in window', funnel.totalAnnouncements],
    ['…classified as governance (auditor / pledge)', funnel.governance],
    ['…on a priced (Nifty-50) symbol', funnel.priced],
    ['…after dedupe by (symbol, event day)', funnel.deduped],
    ['…usable (full ±5 window present)', funnel.usable],
  ].map(([k, v]) => `<tr><td>${k}</td><td class="num">${v}</td></tr>`).join('');
  const exclRows = Object.entries(funnel.excluded || {}).map(([k, v]) =>
    `<tr><td style="color:#64748b">excluded: ${k.replace(/_/g, ' ')}</td><td class="num" style="color:#64748b">${v}</td></tr>`).join('');

  const unitRows = allUnits.map((u) => {
    const tag = u.primary ? badge('primary', 'ok') : badge('secondary', 'mut');
    const small = u.n < MIN_EVENTS ? badge(`N<${MIN_EVENTS}`, 'warn') : '';
    const fld = (s) => Number.isFinite(s.mean) ? `${(s.mean * 10000).toFixed(0)}${stars(s.p)}` : '—';
    return `<tr>
      <td>${u.name.replace(/_/g, ' ')}</td><td>${tag} ${small}</td><td class="num">${u.n}</td>
      <td class="num">${fld(u.pre)}</td><td class="num">${fld(u.d0)}</td>
      <td class="num"><b>${fld(u.post)}</b></td>
      <td class="num">${Number.isFinite(u.post.t) ? u.post.t.toFixed(2) : '—'}</td>
      <td class="num">${Number.isFinite(u.hitRate) ? (u.hitRate * 100).toFixed(0) + '%' : '—'}</td>
      <td class="num">${u.n >= 2 && Number.isFinite(u.dropEv.mean) ? (u.dropEv.mean * 10000).toFixed(0) + stars(u.dropEv.p) : '—'}</td>
      <td>${u.h14b ? badge('H14b ✓', 'ok') : (u.n >= N_BLOCKED ? badge('H14b ✗', 'mut') : '')}${u.topSymFrac > 0.40 && u.n >= N_BLOCKED ? ' ' + badge(`${u.topSym} ${(u.topSymFrac * 100).toFixed(0)}%`, 'bad') : ''}</td>
    </tr>`;
  }).join('');

  const topRows = topEvents.map((e) =>
    `<tr><td>${e.symbol}</td><td>${e.eventDay}</td><td>${e.tags.join(', ') || e.buckets.join(', ')}</td>
     <td class="num" style="color:${e.post < 0 ? '#ef4444' : '#22c55e'}">${(e.post * 10000).toFixed(0)} bps</td>
     <td style="color:#64748b;font-size:12px">${(e.subject || '').slice(0, 90)}</td></tr>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Exp 14 — Governance Shock Event Study</title>
<style>
  body{background:#070b14;color:#e2e8f0;font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;margin:0 auto;padding:28px;max-width:920px}
  h1{font-size:22px;margin:0 0 4px} h2{font-size:16px;margin:28px 0 10px;color:#cbd5e1}
  .sub{color:#64748b;font-size:12px;margin-bottom:20px}
  .verdict{padding:16px 20px;border-radius:10px;border:2px solid ${vcol};background:${vcol}14;margin:18px 0}
  .verdict .tag{font-size:26px;font-weight:700;color:${vcol}}
  .explain{background:#0b1120;border:1px solid #1e293b;border-radius:8px;padding:14px 16px;color:#94a3b8;font-size:13px}
  table{border-collapse:collapse;width:100%;font-size:13px;margin-top:6px}
  th,td{text-align:left;padding:6px 9px;border-bottom:1px solid #1e293b} th{color:#94a3b8;font-weight:600}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;font-family:ui-monospace,Menlo,monospace}
  .grid{display:flex;gap:20px;flex-wrap:wrap} .grid>div{flex:1;min-width:300px}
  code{background:#0b1120;padding:1px 5px;border-radius:4px;color:#7dd3fc}
  .foot{color:#475569;font-size:11px;margin-top:30px;border-top:1px solid #1e293b;padding-top:14px}
</style></head><body>
  <h1>Experiment 14 — Do governance shocks move prices?</h1>
  <div class="sub">Generated ${new Date().toISOString()} · auditor / promoter-pledge event study · window ${dateFrom || 'start'} → ${dateTo || 'today'} · ${priceSymbols} priced symbols (Nifty-50, v1) · market control ${INDEX_SYMBOL} · read-only research run</div>

  <div class="verdict"><div class="tag">${verdict.tag}</div>
    <div style="color:#94a3b8;font-size:13px;margin-top:6px">${verdict.line}</div>
  </div>

  <div class="explain"><b>What this tests.</b> When a company files an <b>auditor resignation</b> or a <b>promoter pledge increase</b>,
  does the stock <b>drift down</b> in the five trading days <i>after</i> the filing (POST), enough to trade net of costs?
  The bars below are the average market-adjusted move in each window (PRE = the five days before, DAY0 = filing day,
  POST = the five days after — the only window an outsider could trade). Negative POST bars are the hypothesised edge.
  Verdict rules were locked <i>before</i> the run (<code>Exp14.md §5</code>); a low event count returns <b>⬜ BLOCKED</b>, which is
  expected this early (Exp 2 showed governance buckets had N&lt;10 on one month of filings).</div>

  <h2>Mean abnormal return by window</h2>
  ${svgBarChart(units.length ? units : allUnits)}
  <div class="sub" style="margin-top:8px">Numbers above each bar are bps; * p&lt;0.10, ** p&lt;0.05, *** p&lt;0.01 (cross-sectional t vs 0). Primary buckets = auditor_resignation + pledge_increase (the H14a test). Secondary = full Exp 2 buckets.</div>

  <div class="grid">
    <div>
      <h2>Data reality — the funnel</h2>
      <table><tbody>${funnelRows}${exclRows}</tbody></table>
    </div>
    <div>
      <h2>Top events by |POST CAR|</h2>
      ${topRows ? `<table><thead><tr><th>symbol</th><th>event day</th><th>tag</th><th class="num">POST</th><th>subject</th></tr></thead><tbody>${topRows}</tbody></table>` : '<div class="explain">No usable events.</div>'}
    </div>
  </div>

  <h2>Per-bucket statistics</h2>
  <table><thead><tr>
    <th>bucket / sub-tag</th><th>kind</th><th class="num">N</th>
    <th class="num">PRE</th><th class="num">DAY0</th><th class="num">POST</th><th class="num">POST&nbsp;t</th>
    <th class="num">hit</th><th class="num">POST&minus;top3</th><th>flags</th>
  </tr></thead><tbody>${unitRows || '<tr><td colspan="10" style="color:#64748b">No governance events classified.</td></tr>'}</tbody></table>
  <div class="sub" style="margin-top:8px">All means in bps. "hit" = % events with POST CAR below the bucket threshold (auditor &lt;−1.5%, pledge &lt;−1.0%). "POST−top3" = POST mean after dropping the 3 largest |POST| events (concentration check). H14b ✓ = negative drift &gt;150 bps gross, survives concentration, &gt;50 bps net of a 50 bps round-trip cost.</div>

  <div class="foot">
    Method: market-adjusted event study (AR = stock log-return − ${INDEX_SYMBOL} log-return), event day 0 = first trading day on/after the IST filing date, POST = CAR[+1..+5] (no look-ahead). Buckets reuse the exact Exp 2 regexes; sub-tags per Exp14.md §3.2. Dedupe by (symbol, event day) keeping the earliest filing. Concentration check + per-symbol cap per Exp 10 discipline. v1 universe = Nifty-50 priced names only — survivorship-biased toward survivors; the names where auditor/pledge alpha lives (distressed mid/small caps) are mostly unpriced. Caveats: <code>Exp14.md §9</code>. Read-only; all writes are local files.
  </div>
</body></html>`;
}

// ── Self-test (no DB): validated-estimator gate (Exp 9 / Exp 12 discipline) ───
function runSelfTest() {
  console.log('=== Exp 14 self-test (synthetic; no DB) ===');
  let pass = true;
  const check = (label, cond) => { console.log(`  ${cond ? '✓' : '✗'} ${label}`); if (!cond) pass = false; };

  // (1) Classification + sub-tag direction.
  const cAR = classify('Resignation of Statutory Auditor');
  check('auditor resignation → auditor bucket', cAR.includes('auditor'));
  check('auditor resignation → auditor_resignation sub-tag', subTags('Resignation of Statutory Auditor', cAR).includes('auditor_resignation'));
  const cAC = classify('Appointment of Statutory Auditor');
  check('auditor appointment → auditor_change (not resignation)', subTags('Appointment of Statutory Auditor', cAC).join() === 'auditor_change');
  const cPI = classify('Creation of pledge / encumbrance over promoter shares');
  check('pledge creation → promoter_pledge bucket', cPI.includes('promoter_pledge'));
  check('pledge creation → pledge_increase sub-tag', subTags('Creation of pledge / encumbrance over promoter shares', cPI).includes('pledge_increase'));
  const cPR = 'Revocation / release of pledge over shares';
  check('pledge revocation → pledge_release (excluded from primary)', subTags(cPR, classify(cPR)).join() === 'pledge_release');
  check('non-governance filing → no bucket', classify('Board meeting to consider quarterly results').length === 0);

  // (2) Build a synthetic price universe + index, then synthetic events.
  // ^NSEI flat (0 return); stock returns crafted so POST CAR is a known negative number.
  const N = 60;
  const dates = Array.from({ length: N }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`);
  const idxRet = new Map(dates.map((d) => [d, 0]));
  // Stock "PLEDGEY.NS": flat except a −0.5%/day drift on the 5 POST days of its event.
  const bySym = new Map();
  const mk = (sym, retAt) => {
    const rets = dates.map((d, i) => retAt(i, d));
    bySym.set(sym, { dates: [...dates], rets });
  };
  // Event day index 20 for PLEDGEY; POST days 21..25 get −0.005 each → POST CAR = −0.025 (−250 bps).
  mk('PLEDGEY.NS', (i) => (i >= 21 && i <= 25 ? -0.005 : 0));
  // Event day index 20 for AUDITY; POST days 21..25 get −0.004 each → −200 bps.
  mk('AUDITY.NS', (i) => (i >= 21 && i <= 25 ? -0.004 : 0));
  // Three "outlier" symbols with huge negative POST so the concentration check has something to drop.
  for (const s of ['OUT1.NS', 'OUT2.NS', 'OUT3.NS']) mk(s, (i) => (i >= 21 && i <= 25 ? -0.05 : 0));
  // A symbol whose filing falls on the SAME event day twice (dedupe target).
  mk('DUPEY.NS', (i) => (i >= 21 && i <= 25 ? -0.006 : 0));

  const ev = (symbol, subject, ts) => ({ symbol, ann_date: dates[20], ts, category: '', subject });
  const annRows = [
    ev('PLEDGEY', 'Creation of pledge over promoter shareholding', 100),
    ev('AUDITY', 'Resignation of Statutory Auditor', 100),
    ev('OUT1', 'Creation of pledge / encumbrance', 100),
    ev('OUT2', 'Creation of pledge / encumbrance', 100),
    ev('OUT3', 'Creation of pledge / encumbrance', 100),
    // Two filings, same symbol, same event day — earliest (ts=50) must win.
    ev('DUPEY', 'Creation of pledge over shares (first, earliest)', 50),
    ev('DUPEY', 'Creation of pledge over shares (second, later)', 999),
  ];

  const { events, funnel } = buildEvents(annRows, bySym, idxRet, { pre: 5, post: 5 });
  check('all 6 distinct symbols produce a usable event', funnel.usable === 6);
  check('dedupe collapsed the 2 DUPEY filings to 1', (funnel.duplicates || 0) === 1);
  const dupey = events.find((e) => e.symbol === 'DUPEY');
  check('dedupe kept the earliest DUPEY filing', dupey && /earliest/.test(dupey.subject));

  // Event-study math: PLEDGEY POST CAR ≈ −0.025, PRE ≈ 0, DAY0 ≈ 0.
  const pledgey = events.find((e) => e.symbol === 'PLEDGEY');
  check('PLEDGEY POST CAR ≈ −250 bps', Math.abs(pledgey.post - (-0.025)) < 1e-9);
  check('PLEDGEY PRE CAR ≈ 0 (no pre-trend / no look-ahead)', Math.abs(pledgey.pre) < 1e-9);
  check('PLEDGEY DAY0 ≈ 0', Math.abs(pledgey.day0) < 1e-9);

  // Build the pledge_increase unit and run the concentration check.
  const pledgeRecs = events.filter((e) => e.tags.includes('pledge_increase'));
  check('pledge_increase unit has 5 events (PLEDGEY+OUT1-3+DUPEY)', pledgeRecs.length === 5);
  const pledgeUnit = analyzeUnit(UNITS.find((u) => u.name === 'pledge_increase'), pledgeRecs);
  check('pledge_increase POST mean is negative', pledgeUnit.post.mean < 0);
  // Dropping the top-3 |POST| (the three −5%/day outliers) must isolate exactly the two
  // non-outlier events (PLEDGEY −250 bps, DUPEY −300 bps) — derive the expectation from data.
  const expectedDrop = mean(pledgeRecs.filter((e) => !e.symbol.startsWith('OUT')).map((e) => e.post));
  check('concentration drop-top-3 isolates the non-outlier mean', Math.abs(pledgeUnit.dropEv.mean - expectedDrop) < 1e-9);
  check('drop-top-3 differs from full mean (outliers detected)', Math.abs(pledgeUnit.dropEv.mean - pledgeUnit.post.mean) > 1e-6);

  // auditor_resignation primary unit present.
  const audRecs = events.filter((e) => e.tags.includes('auditor_resignation'));
  check('auditor_resignation unit has 1 event (AUDITY)', audRecs.length === 1);

  console.log(pass ? '\n  ✅ SELFTEST PASS — classification, dedupe, event-study math, and concentration check all behave.'
                   : '\n  ❌ SELFTEST FAIL — do NOT trust a prod run until this passes.');
  process.exit(pass ? 0 : 1);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (SELFTEST) return runSelfTest();

  console.log('=== Experiment 14 — governance shock event study (auditor / pledge) ===');
  console.log(`  Windows: PRE[−${PRE}..−1]  DAY0[0]  POST[+1..+${POST}]   Reporting min-events: ${MIN_EVENTS}  (✅ needs N≥${N_SUPPORTED})`);
  console.log(`  Abnormal return = stock log_return − ${INDEX_SYMBOL} log_return (market-adjusted)`);
  console.log(`  Window: ${FROM || 'start'} → ${TO || 'today'}${BUCKET_FILTER ? `   Bucket filter: ${BUCKET_FILTER}` : ''}`);

  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set in .env.local'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // Prices grouped by symbol + index return map (Exp 2 method).
  const { rows: priceRows } = await pool.query(
    `SELECT symbol, to_char(trade_date,'YYYY-MM-DD') AS d, log_return AS r
       FROM research_prices ORDER BY symbol, trade_date ASC`);
  const bySym = new Map();
  for (const row of priceRows) {
    if (!bySym.has(row.symbol)) bySym.set(row.symbol, { dates: [], rets: [] });
    const o = bySym.get(row.symbol); o.dates.push(row.d); o.rets.push(row.r == null ? null : Number(row.r));
  }
  const idx = bySym.get(INDEX_SYMBOL);
  if (!idx) { console.error(`ERROR: no ${INDEX_SYMBOL} in research_prices. Run backfill-research-prices.mjs (Exp 0) first.`); await pool.end(); process.exit(1); }
  const idxRet = new Map(idx.dates.map((d, i) => [d, idx.rets[i]]));
  const priceSymbolCount = bySym.size - 1; // minus the index

  // Total announcements in window (for an honest funnel) + governance subset.
  const winParams = [];
  let winWhere = `symbol IS NOT NULL`;
  if (FROM) { winParams.push(FROM); winWhere += ` AND announced_at >= $${winParams.length}`; }
  if (TO) { winParams.push(TO); winWhere += ` AND announced_at <= $${winParams.length}`; }
  const { rows: totalRows } = await pool.query(
    `SELECT count(*)::int AS n FROM india_bourse_announcements WHERE ${winWhere}`, winParams);
  const totalAnnouncements = totalRows[0]?.n ?? 0;

  // Governance announcements. Pre-filter to the two buckets at SQL level for speed.
  const annParams = [];
  let annWhere = `symbol IS NOT NULL AND (lower(category) ~ 'auditor|pledg|encumbr' OR lower(subject) ~ 'auditor|pledg|encumbr')`;
  if (FROM) { annParams.push(FROM); annWhere += ` AND announced_at >= $${annParams.length}`; }
  if (TO) { annParams.push(TO); annWhere += ` AND announced_at <= $${annParams.length}`; }
  const { rows: annRows } = await pool.query(
    `SELECT symbol, category, subject,
            EXTRACT(EPOCH FROM announced_at)::float AS ts,
            to_char((announced_at AT TIME ZONE 'Asia/Kolkata')::date,'YYYY-MM-DD') AS ann_date
       FROM india_bourse_announcements WHERE ${annWhere}`, annParams);
  await pool.end();

  const annDates = annRows.map((a) => a.ann_date).filter(Boolean).sort();
  const dateFrom = FROM || annDates[0] || null;
  const dateTo = TO || annDates[annDates.length - 1] || null;

  const { events, funnel } = buildEvents(annRows, bySym, idxRet, { pre: PRE, post: POST });
  funnel.totalAnnouncements = totalAnnouncements;

  // Assemble per-unit records.
  const unitRecs = new Map(UNITS.map((u) => [u.name, []]));
  for (const e of events) {
    for (const name of unitsForEvent(e.buckets, e.tags)) {
      if (unitRecs.has(name)) unitRecs.get(name).push(e);
    }
  }
  let analyzed = UNITS.map((def) => analyzeUnit(def, unitRecs.get(def.name)));
  if (BUCKET_FILTER) analyzed = analyzed.filter((u) => u.family === BUCKET_FILTER);
  const unitMap = new Map(analyzed.map((u) => [u.name, u]));
  const verdict = computeVerdict(unitMap);

  // Reportable units (>= min-events) for the chart; keep all for the table.
  const reportable = analyzed.filter((u) => u.n >= MIN_EVENTS);

  // ── Console report ──
  console.log(`\n— Data reality (the funnel) —`);
  console.log(`  Total announcements in window:                   ${funnel.totalAnnouncements}`);
  console.log(`  …classified as governance (auditor / pledge):   ${funnel.governance}`);
  console.log(`  …on a priced (Nifty-50) symbol:                 ${funnel.priced}`);
  console.log(`  …after dedupe by (symbol, event day):           ${funnel.deduped}  (duplicates merged: ${funnel.duplicates || 0})`);
  console.log(`  …usable (full ±${PRE}/${POST} window present):           ${funnel.usable}`);
  for (const [k, v] of Object.entries(funnel.excluded || {})) console.log(`     excluded — ${k.padEnd(18)} ${v}`);
  console.log(`  NOTE: v1 prices = ${priceSymbolCount} Nifty-50 names + ${INDEX_SYMBOL}; survivorship-biased toward survivors.`);

  console.log(`\n— Per-bucket / sub-tag stats (all means in bps; * p<.10 ** p<.05 *** p<.01) —`);
  console.log(`  ${'unit'.padEnd(20)} ${'kind'.padStart(9)} ${'N'.padStart(4)}  ${'PRE'.padStart(8)} ${'DAY0'.padStart(8)} ${'POST'.padStart(8)} ${'t'.padStart(6)}  ${'hit'.padStart(5)}  ${'POST−top3'.padStart(10)}  H14b`);
  console.log('  ' + '─'.repeat(96));
  const fb = (s) => Number.isFinite(s.mean) ? `${(s.mean * 10000).toFixed(0)}${stars(s.p)}` : '—';
  for (const u of analyzed.sort((a, b) => (b.primary - a.primary) || (a.post.mean - b.post.mean))) {
    const kind = u.primary ? 'primary' : 'secondary';
    const hit = Number.isFinite(u.hitRate) ? `${(u.hitRate * 100).toFixed(0)}%` : '—';
    const dropM = u.n >= 2 && Number.isFinite(u.dropEv.mean) ? `${(u.dropEv.mean * 10000).toFixed(0)}${stars(u.dropEv.p)}` : '—';
    const flags = `${u.h14b ? '✓' : (u.n >= N_BLOCKED ? '✗' : '·')}${u.topSymFrac > 0.40 && u.n >= N_BLOCKED ? ` ⚠${u.topSym} ${(u.topSymFrac * 100).toFixed(0)}%` : ''}`;
    console.log(`  ${u.name.padEnd(20)} ${kind.padStart(9)} ${String(u.n).padStart(4)}  ${fb(u.pre).padStart(8)} ${fb(u.d0).padStart(8)} ${fb(u.post).padStart(8)} ${(Number.isFinite(u.post.t) ? u.post.t.toFixed(2) : '—').padStart(6)}  ${hit.padStart(5)}  ${dropM.padStart(10)}  ${flags}`);
  }

  // Top events by |POST CAR|.
  const topEvents = [...events].sort((a, b) => Math.abs(b.post) - Math.abs(a.post)).slice(0, 8);
  if (topEvents.length) {
    console.log(`\n— Top events by |POST CAR| —`);
    for (const e of topEvents) console.log(`  ${e.symbol.padEnd(12)} ${e.eventDay}  ${(e.post * 10000).toFixed(0).padStart(6)} bps  [${(e.tags.join(',') || e.buckets.join(','))}]  ${(e.subject || '').slice(0, 60)}`);
  }

  console.log(`\n— Verdict (Exp14.md §5): ${verdict.tag} —`);
  console.log(`  ${verdict.line}`);

  // ── Write outputs ──
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, 'exp14_events.csv'), buildEventsCsv(events));
  writeFileSync(join(OUTPUT_DIR, 'exp14_summary.csv'), buildSummaryCsv(analyzed));
  const html = buildHtmlReport({ units: reportable, allUnits: analyzed, funnel, verdict, topEvents, priceSymbols: priceSymbolCount, dateFrom, dateTo });
  writeFileSync(join(OUTPUT_DIR, 'exp14_report.html'), html);

  console.log(`\n— Outputs —`);
  console.log(`  ${join(OUTPUT_DIR, 'exp14_report.html')}   ← open this in a browser (visual)`);
  console.log(`  ${join(OUTPUT_DIR, 'exp14_events.csv')}    (${events.length} rows)`);
  console.log(`  ${join(OUTPUT_DIR, 'exp14_summary.csv')}`);
  console.log(`\n  → Fill Exp14.md §6/§7/§8 with the numbers above; log H14 in the playbook.`);
  console.log('Done.');
}

main().catch((e) => { console.error('Experiment failed:', e.message); console.error(e.stack); process.exit(1); });
