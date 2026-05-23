#!/usr/bin/env node
//
// Experiment 4 — Does the bourse lead the newswire? (latency edge)
// See: ai_docs/sachnetra v2/wiki/syntheses/sachnetra_research_playbook.md
//
// HYPOTHESIS (falsifiable, with direction):
//   "For a given company, the NSE filing (announced_at) systematically PRECEDES
//    the matching news headline (published_at) by hours — i.e. the bourse leads
//    the newswire."
//
// WHY THIS MATTERS: this is the empirical core of Product A's latency thesis.
//   The pivot doc asserts "the market reacts in minutes after a filing;
//   journalists take hours." Exp 1/2/3 all found SachNetra's signals are
//   COINCIDENT with price, not leading. Exp 4 is different in kind: it does NOT
//   test prediction of price — it tests whether SachNetra's own filing feed beats
//   the *newswire*. That is a latency edge, not a forecasting edge, and it's the
//   one leading-signal claim untouched so far.
//
// METHOD — paired timestamp delta (no price needed):
//   • Match key: announcement.symbol  ∈  news.nse_tickers[]  (NSE trading symbol).
//     Optional --use-companies also matches announcement.company_name against
//     news.companies[] (looser; off by default).
//   • For each announcement, find the NEAREST news item for the same ticker whose
//     published_at falls within ±WINDOW hours of announced_at, and record the
//     SIGNED delta = published_at − announced_at (positive = news AFTER filing).
//   • The window is SYMMETRIC on purpose: we do not assume news comes after. If
//     rumours/leaks preceded filings, deltas would skew negative. The sign of the
//     median is therefore a genuine measurement, not a construction artefact.
//
// STATISTICS (robust + a sign test, because the delta distribution is heavy-tailed):
//   • median / percentile spread of the lead time (hours)
//   • mean delta with a t-stat vs 0 (parametric, reported but secondary)
//   • SIGN TEST: fraction of pairs with news-after-filing vs 50% coin flip
//     (binomial z) — the headline number. >50% and significant = bourse leads.
//   • a before/after histogram, and a per-category breakdown (Exp 2 buckets).
//
// HONESTY NOTE: announcements are a rolling ~30-day NSE window and sentiment/news
//   scoring only ramped mid-May 2026, so the symbol-matched pair count is small.
//   But the unit here is a TIMESTAMP DELTA, not a return regression, so even a
//   modest N yields a usable lead-time *distribution*. Treat this run as a method
//   pre-flight + baseline to repeat monthly, exactly as Exp 2/3.
//
// BOUNDARY: read-only. SELECTs only. Claude authors; Lijo runs.
// PREREQUISITE: none beyond india_bourse_announcements + india_news_signals.
//
// USAGE
//   node scripts/research/exp4-bourse-leads-news.mjs
//   node scripts/research/exp4-bourse-leads-news.mjs --window=72        # widen match window (h)
//   node scripts/research/exp4-bourse-leads-news.mjs --require-market-moving
//   node scripts/research/exp4-bourse-leads-news.mjs --use-companies     # also match company_name
//   node scripts/research/exp4-bourse-leads-news.mjs --time-col=scraped_at  # sensitivity (see caveat)

import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const WINDOW_H = Math.max(1, Number(flag('window', '48')));          // ± match window, hours
const WINDOW_S = WINDOW_H * 3600;
const MIN_EVENTS = Number(flag('min-events', '20'));                  // per-category guard
const REQUIRE_MM = args.includes('--require-market-moving');
const USE_COMPANIES = args.includes('--use-companies');
const TIME_COL = flag('time-col', 'published_at');                   // 'published_at' | 'scraped_at'
const FROM = flag('from', null);
const TO = flag('to', null);

if (!['published_at', 'scraped_at'].includes(TIME_COL)) {
  console.error(`ERROR: --time-col must be published_at or scraped_at (got "${TIME_COL}")`); process.exit(1);
}

// ── stats helpers (no deps) ─────────────────────────────────────────────────
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo); };
function tStatVsZero(arr) {
  const n = arr.length; if (n < 2) return { n, mean: NaN, t: NaN, p: NaN };
  const m = mean(arr);
  const sd = Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1));
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
// Sign test: k successes (news-after) out of n, vs p0=0.5. Normal approx with z.
function signTest(k, n) {
  if (n === 0) return { k, n, frac: NaN, z: NaN, p: NaN };
  const frac = k / n;
  const z = (k - n / 2) / Math.sqrt(n / 4);
  return { k, n, frac, z, p: twoSidedP(z) };
}
const stars = (p) => (p < 0.01 ? '***' : p < 0.05 ? '**' : p < 0.1 ? '*' : '');
const h2 = (s) => (s / 3600).toFixed(2);

// ── category buckets (mirror Exp 2 for cross-experiment consistency) ────────
const BUCKETS = [
  ['auditor',           /auditor/],
  ['promoter_pledge',   /pledg|encumbr/],
  ['mgmt_change',       /resign|cessation|appoint|change in director|change in management|ceo|cfo|managing director|key managerial/],
  ['board_meeting',     /board meeting/],
  ['financial_results', /financial result|unaudited|audited.*result|quarterly result/],
  ['dividend',          /dividend/],
  ['buyback',           /buy.?back/],
  ['bonus_split',       /bonus|stock split|sub-division|subdivision/],
  ['credit_rating',     /credit rating|rating/],
  ['order_win',         /order|contract|bags |wins |awarded/],
  ['acquisition',       /acqui|merger|amalgamation|scheme of arrangement|stake/],
];
function classify(text) {
  const t = (text || '').toLowerCase();
  const hits = [];
  for (const [name, re] of BUCKETS) if (re.test(t)) hits.push(name);
  return hits;
}

// nearest index in a sorted array of epochs to `target`
function nearestIdx(epochs, target) {
  let lo = 0, hi = epochs.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (epochs[m] < target) lo = m + 1; else hi = m; }
  // candidates: lo (first >= target) and lo-1 (last < target)
  let best = -1, bestAbs = Infinity;
  for (const i of [lo - 1, lo]) {
    if (i < 0 || i >= epochs.length) continue;
    const d = Math.abs(epochs[i] - target);
    if (d < bestAbs) { bestAbs = d; best = i; }
  }
  return best;
}

async function main() {
  console.log('=== Experiment 4 — does the bourse lead the newswire? (latency edge) ===');
  console.log(`  Match: announcement.symbol ∈ news.nse_tickers[]${USE_COMPANIES ? ' (+ company_name ∈ companies[])' : ''}`);
  console.log(`  News time column: ${TIME_COL}${TIME_COL === 'scraped_at' ? '  ⚠ reflects OUR collection latency, not the newswire (see caveat)' : ''}`);
  console.log(`  Match window: ±${WINDOW_H}h   News filter: ${REQUIRE_MM ? 'market-moving only' : 'all scored news'}`);
  console.log(`  Announcement window: ${FROM || 'start'} → ${TO || 'today'}`);
  console.log(`  delta = ${TIME_COL} − announced_at   (POSITIVE = news AFTER filing = bourse leads)`);

  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // ── News: ticker(s) + publish/scrape epoch ──
  const { rows: newsRows } = await pool.query(
    `SELECT EXTRACT(EPOCH FROM ${TIME_COL})::float AS ts,
            nse_tickers, companies
       FROM india_news_signals
      WHERE ${TIME_COL} IS NOT NULL
        AND (nse_tickers IS NOT NULL${USE_COMPANIES ? ' OR companies IS NOT NULL' : ''})
        ${REQUIRE_MM ? 'AND is_market_moving' : ''}
      ORDER BY ts ASC`);

  // ── Announcements: symbol + announced epoch + text ──
  const annParams = [];
  let annWhere = `symbol IS NOT NULL`;
  if (FROM) { annParams.push(FROM); annWhere += ` AND announced_at >= $${annParams.length}`; }
  if (TO) { annParams.push(TO); annWhere += ` AND announced_at <= $${annParams.length}`; }
  const { rows: annRows } = await pool.query(
    `SELECT symbol, company_name, category, subject,
            EXTRACT(EPOCH FROM announced_at)::float AS ts
       FROM india_bourse_announcements WHERE ${annWhere} ORDER BY ts ASC`, annParams);
  await pool.end();

  // ── Index news by ticker (and optionally by company name), sorted by time ──
  // News nse_tickers carry the Yahoo exchange suffix (e.g. 'SBIN.NS'); announcement
  // symbols are bare ('SBIN'). Canonicalise both to the bare upper-cased symbol so
  // the two sources actually join.
  const norm = (s) => (s || '').trim().toUpperCase().replace(/\.(NS|BO)$/, '');
  const byTicker = new Map();   // TICKER -> sorted epochs[]
  const byCompany = new Map();  // COMPANY -> sorted epochs[]
  const pushTo = (map, key, ts) => { if (!key) return; if (!map.has(key)) map.set(key, []); map.get(key).push(ts); };
  for (const r of newsRows) {
    const ts = Number(r.ts);
    for (const t of r.nse_tickers || []) pushTo(byTicker, norm(t), ts);
    if (USE_COMPANIES) for (const c of r.companies || []) pushTo(byCompany, norm(c), ts);
  }
  for (const m of [byTicker, byCompany]) for (const arr of m.values()) arr.sort((a, b) => a - b);

  // ── Pair each announcement with its nearest in-window news item ──
  const deltas = [];                 // signed seconds, all matched pairs
  const byBucket = new Map();        // bucket -> deltas[]
  const addB = (name, d) => { if (!byBucket.has(name)) byBucket.set(name, []); byBucket.get(name).push(d); };

  let withSymbol = 0, tickerMatchable = 0, matched = 0;
  for (const a of annRows) {
    withSymbol++;
    const sym = norm(a.symbol);
    const candidates = byTicker.get(sym);
    let epochs = candidates;
    if ((!epochs || !epochs.length) && USE_COMPANIES) epochs = byCompany.get(norm(a.company_name));
    if (!epochs || !epochs.length) continue;
    tickerMatchable++;

    const at = Number(a.ts);
    const i = nearestIdx(epochs, at);
    if (i < 0) continue;
    const delta = epochs[i] - at;            // signed seconds
    if (Math.abs(delta) > WINDOW_S) continue; // nearest news is outside the match window
    matched++;
    deltas.push(delta);
    addB('ALL', delta);
    for (const b of classify(`${a.category} ${a.subject}`)) addB(b, delta);
  }

  // ── Report ──
  console.log(`\n  Announcements with a symbol: ${withSymbol}`);
  console.log(`  ...whose ticker appears in any news item: ${tickerMatchable}`);
  console.log(`  ...with a nearest news item inside ±${WINDOW_H}h (matched pairs): ${matched}`);
  if (matched < 5) {
    console.log('\n  ⬜ Too few matched pairs to say anything. Widen --window or let the collectors run longer.');
    console.log('\nDone.'); return;
  }

  const after = deltas.filter((d) => d > 0).length;
  const before = deltas.filter((d) => d < 0).length;
  const sim = deltas.length - after - before;            // exact ties (rare)
  const sign = signTest(after, after + before);          // ties excluded from sign test
  const tt = tStatVsZero(deltas);

  console.log(`\n— Lead-time distribution (hours; + = bourse leads news) —`);
  console.log(`  n=${deltas.length}`);
  console.log(`  median = ${h2(median(deltas))} h`);
  console.log(`  mean   = ${h2(tt.mean)} h   (t vs 0 = ${tt.t.toFixed(2)}, p≈${tt.p.toFixed(3)} ${stars(tt.p)})`);
  console.log(`  spread: p10=${h2(quantile(deltas, 0.10))}  p25=${h2(quantile(deltas, 0.25))}  p75=${h2(quantile(deltas, 0.75))}  p90=${h2(quantile(deltas, 0.90))} h`);

  console.log(`\n— Sign test: does news land AFTER the filing more than a coin flip? —`);
  console.log(`  news AFTER filing:  ${after}`);
  console.log(`  news BEFORE filing: ${before}${sim ? `   (exact ties: ${sim})` : ''}`);
  console.log(`  fraction after = ${(sign.frac * 100).toFixed(1)}%   z=${sign.z.toFixed(2)}  p≈${sign.p.toFixed(3)} ${stars(sign.p)}`);

  // before/after histogram
  const edges = [-Infinity, 0, 3600, 6 * 3600, 24 * 3600, Infinity];
  const labels = ['news BEFORE filing (<0)', '0–1h after', '1–6h after', '6–24h after', '>24h after'];
  const counts = new Array(labels.length).fill(0);
  for (const d of deltas) for (let b = 0; b < labels.length; b++) if (d > edges[b] && d <= edges[b + 1]) { counts[b]++; break; }
  console.log(`\n— When does the matching headline arrive? —`);
  for (let b = 0; b < labels.length; b++) {
    const bar = '█'.repeat(Math.round((counts[b] / deltas.length) * 40));
    console.log(`  ${labels[b].padEnd(24)} ${String(counts[b]).padStart(5)}  ${bar}`);
  }

  // per-category median lead (guarded by min-events)
  console.log(`\n— Lead time by announcement category (min ${MIN_EVENTS} pairs) —`);
  console.log(`  Bucket               N     median(h)  mean(h)   %after`);
  console.log('  ' + '─'.repeat(56));
  const catRows = [];
  for (const [name, ds] of byBucket) {
    if (ds.length < MIN_EVENTS) continue;
    const aft = ds.filter((d) => d > 0).length;
    const bef = ds.filter((d) => d < 0).length;
    catRows.push({ name, n: ds.length, med: median(ds), mean: mean(ds), pAfter: aft / (aft + bef || 1) });
  }
  catRows.sort((a, b) => b.med - a.med);
  if (!catRows.length) console.log('  (no category cleared the threshold — too few matched pairs yet)');
  for (const r of catRows) {
    console.log(`  ${r.name.padEnd(18)} ${String(r.n).padStart(5)}   ${h2(r.med).padStart(8)}  ${h2(r.mean).padStart(8)}   ${(r.pAfter * 100).toFixed(0)}%`);
  }

  // ── Verdict ──
  console.log(`\n— Verdict —`);
  if (matched < 30) {
    console.log(`  ⬜ INCONCLUSIVE — only ${matched} matched pairs. Method validated; treat as a baseline.`);
    console.log(`     The unit is a timestamp delta (not a return), so the distribution above is still`);
    console.log(`     informative — but re-run monthly as announcements + scored news accumulate.`);
  } else if (sign.p < 0.05 && sign.frac > 0.5) {
    console.log(`  ✅ Bourse appears to LEAD the newswire: ${(sign.frac * 100).toFixed(0)}% of headlines land after the filing,`);
    console.log(`     median lead ${h2(median(deltas))}h (sign-test p≈${sign.p.toFixed(3)}). The latency thesis is supported.`);
  } else {
    console.log(`  🟡 No clear lead established (fraction-after ${(sign.frac * 100).toFixed(0)}%, p≈${sign.p.toFixed(3)}).`);
    console.log(`     Either the edge isn't there or matching noise/data volume is masking it.`);
  }
  console.log(`\n  CAVEATS: (1) matched on ticker+nearest-time — a news item may be reporting a`);
  console.log(`  DIFFERENT event than the nearest filing (matching noise). (2) published_at is the`);
  console.log(`  feed's stated time; if it's actually our fetch time the lead is overstated — re-run`);
  console.log(`  with --time-col=scraped_at as a sensitivity check (that column is OUR latency, an`);
  console.log(`  upper bound on lead). (3) one news item can match multiple nearby filings.`);
  console.log(`\n  → Log to the Hypothesis Register in sachnetra_research_playbook.md (row H4).`);
  console.log('\nDone.');
}

main().catch((e) => { console.error('Experiment failed:', e.message); process.exit(1); });
