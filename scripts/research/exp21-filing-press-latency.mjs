#!/usr/bin/env node
//
// Exp21 — Filing→Press latency by market-cap tier (the "head-start" measurement).
// READ-ONLY on prod. Measures, per material NSE filing, how long until our RSS
// press feeds first cover it, split by cap tier — does the head-start GROW as
// company size shrinks (the escape from the latency-vs-value squeeze)?
//
// Pre-registration: ai_docs/sachnetra v2/wiki/experiments/exp21_brief.md
// Scope: TIMING half only (needs announcements + news + tagging; NOT prices).
//        Whether the window is PROFITABLE = Exp22 (needs research_prices).
//
//   node scripts/research/exp21-filing-press-latency.mjs
//
// Outputs (scripts/research/output/exp21/):
//   exp21_events.csv         — every matched/missed event with lag + flags
//   exp21_summary.txt        — per-tier stats (median lag, CI, miss%, pre-covered%)
//   exp21_gemini_sample.json — stratified ~50-event sample in the web-recon schema
//                              (Gemini fills `web_findings`; we bucket A/B/C after)
//
// Design notes / caveats (pre-registered, exp21_brief §4):
//   - Primary clock = scraped_at (when WE ingested; reliable). published_at = cross-check.
//   - Lag is an absolute interval between two instants → timezone-agnostic; displayed IST.
//   - scraped_at is quantized to the ~10-min news cron → sub-10-min lags are floored.
//   - "first same-ticker news after filing" can mis-match a different event → flagged; the
//     Gemini web sample is the backstop.
//   - No clean Nifty-100 list → "large/other" is the complement of mid/small/micro (caveat);
//     the robust core is the monotonic trend across the 3 clean tiers.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvFile, loadSharedConfig } from '../_seed-utils.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const OUT_DIR = join(process.cwd(), 'scripts', 'research', 'output', 'exp21');
const MATCH_WINDOW_H = 48; // press must appear within 48h after the filing
const PRE_WINDOW_H = 24; // pre-filing coverage check window
const SAMPLE_TARGET = 50; // Gemini web-recon sample size

// Material filing categories (pre-registered include-set); routine/procedural excluded.
const MATERIAL_RE =
  /(financial result|unaudited|audited.*result|quarterly result|board meeting|outcome of board|order|awarded|bags|wins|contract|letter of intent|\bloi\b|acqui|merger|amalgamat|scheme of arrangement|divest|stake|fund rais|preferential|\bqip\b|rights issue|warrant|allot|credit rating|\brating\b|press release|investor presentation|earnings call)/i;
const EXCLUDE_RE =
  /(trading window|newspaper (publication|advertisement)|loss of (share|certificate)|duplicate (share|certificate)|book closure|record date|postal ballot|agm notice|egm notice)/i;

// ── tier lists ───────────────────────────────────────────────────────────────
function loadTickerSet(filename) {
  const raw = loadSharedConfig(filename);
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.symbols) ? raw.symbols : Object.values(raw);
  const set = new Set();
  for (const e of arr) {
    const sym = typeof e === 'string' ? e : (e?.symbol || e?.ticker || e?.nse_symbol);
    // tier lists carry ".NS" suffixes (e.g. "ACC.NS"); our announcement symbols
    // and news nse_tickers are BARE (G1 Decision 4) — strip it so they join.
    if (sym) set.add(String(sym).trim().toUpperCase().replace(/\.NS$/i, ''));
  }
  return set;
}
const MID = loadTickerSet('nifty-midcap150.json');
const SMALL = loadTickerSet('nifty-smallcap250.json');
const MICRO = loadTickerSet('nifty-microcap250.json');
function tierOf(sym) {
  const s = String(sym).toUpperCase();
  if (MID.has(s)) return 'mid';
  if (SMALL.has(s)) return 'small';
  if (MICRO.has(s)) return 'micro';
  return 'large/other'; // complement proxy — no clean Nifty-100 list (caveat)
}
const TIERS = ['large/other', 'mid', 'small', 'micro'];

// ── stats helpers ─────────────────────────────────────────────────────────────
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
function bootstrapMedianCI(xs, B = 2000) {
  if (xs.length < 5) return [null, null];
  const meds = [];
  for (let b = 0; b < B; b++) {
    const r = [];
    for (let i = 0; i < xs.length; i++) r.push(xs[(Math.random() * xs.length) | 0]);
    meds.push(median(r));
  }
  meds.sort((a, b) => a - b);
  return [meds[Math.floor(0.025 * B)], meds[Math.floor(0.975 * B)]];
}
// Mann–Whitney U (normal approx, two-sided) — "is group b shifted higher than a?"
function mannWhitney(a, b) {
  if (a.length < 5 || b.length < 5) return { p: null, note: 'n<5' };
  const all = [...a.map((v) => ({ v, g: 0 })), ...b.map((v) => ({ v, g: 1 }))].sort((x, y) => x.v - y.v);
  let i = 0;
  while (i < all.length) {
    let j = i;
    while (j < all.length && all[j].v === all[i].v) j++;
    const rank = (i + j + 1) / 2; // average rank for ties (1-based)
    for (let k = i; k < j; k++) all[k].rank = rank;
    i = j;
  }
  let R1 = 0;
  for (const x of all) if (x.g === 0) R1 += x.rank;
  const n1 = a.length, n2 = b.length;
  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const mu = (n1 * n2) / 2;
  const sigma = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = (U1 - mu) / sigma;
  const p = 2 * (1 - normCdf(Math.abs(z)));
  return { p, z };
}
const normCdf = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

const fmtIst = (d) => (d ? new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 16).replace('T', ' ') : '');

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL/DATABASE_PUBLIC_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // News window floor — events can only be matched where we HAVE news.
  const { rows: [nw] } = await pool.query(
    `SELECT min(scraped_at) AS lo, max(scraped_at) AS hi FROM india_news_signals`);
  const newsLo = new Date(nw.lo);

  // 1) Tagged press rows in window → ticker → sorted timeline.
  const { rows: news } = await pool.query(
    `SELECT scraped_at, published_at, source_name, left(headline,120) AS headline, nse_tickers
       FROM india_news_signals
      WHERE scraped_at >= $1 AND array_length(nse_tickers,1) >= 1`, [newsLo]);
  const byTicker = new Map();
  for (const r of news) {
    for (const t of r.nse_tickers) {
      const k = String(t).toUpperCase();
      if (!byTicker.has(k)) byTicker.set(k, []);
      byTicker.get(k).push({ s: new Date(r.scraped_at), p: r.published_at ? new Date(r.published_at) : null, src: r.source_name, h: r.headline });
    }
  }
  for (const arr of byTicker.values()) arr.sort((a, b) => a.s - b.s);

  // 2) Material, tagged filings inside the news window.
  const { rows: anns } = await pool.query(
    `SELECT announcement_id, symbol, company_name, category, left(coalesce(subject,''),140) AS subject, announced_at
       FROM india_bourse_announcements
      WHERE announced_at >= $1 AND symbol IS NOT NULL`, [newsLo]);

  const events = [];
  for (const a of anns) {
    const cat = `${a.category || ''} ${a.subject || ''}`;
    if (!MATERIAL_RE.test(cat) || EXCLUDE_RE.test(cat)) continue;
    const sym = String(a.symbol).toUpperCase();
    const filed = new Date(a.announced_at);
    const tl = byTicker.get(sym) || [];

    // first press strictly after filing, within window
    const after = tl.find((n) => n.s > filed && (n.s - filed) <= MATCH_WINDOW_H * 3600e3);
    // pre-filing coverage: any same-ticker press in [filed - PRE, filed)
    const preCovered = tl.some((n) => n.s < filed && (filed - n.s) <= PRE_WINDOW_H * 3600e3);

    const lagMin = after ? Math.round((after.s - filed) / 60000) : null;
    const pubLagMin = after?.p ? Math.round((after.p - filed) / 60000) : null;
    events.push({
      event_id: a.announcement_id, ticker: sym, company: a.company_name,
      tier: tierOf(sym), category: a.category, subject: a.subject,
      filed, filedIst: fmtIst(filed),
      status: after ? 'matched' : 'RSS_MISS',
      our_catch_ist: after ? fmtIst(after.s) : '', our_source: after?.src || '',
      our_headline: after?.h || '', lag_min: lagMin,
      pub_catch_ist: after?.p ? fmtIst(after.p) : '', pub_lag_min: pubLagMin,
      pre_covered: preCovered,
    });
  }

  // ── per-tier stats (matched only for lag) ────────────────────────────────────
  const byTier = {};
  for (const t of TIERS) byTier[t] = events.filter((e) => e.tier === t);
  const lagByTier = {};
  for (const t of TIERS) lagByTier[t] = byTier[t].filter((e) => e.status === 'matched').map((e) => e.lag_min);

  let summary = '=== Exp21 — Filing→Press latency by cap tier (READ-ONLY) ===\n';
  summary += `news window: ${fmtIst(newsLo)} → now · material tagged events: ${events.length}\n`;
  summary += `primary clock = scraped_at (10-min cron quantized); published_at = cross-check\n\n`;
  summary += `tier          n   matched  miss%   pre-cov%   median_lag(min)  95%CI            \n`;
  summary += `------------  ---  -------  ------  --------   ---------------  -----------------\n`;
  for (const t of TIERS) {
    const ev = byTier[t]; const lags = lagByTier[t];
    const miss = ev.length ? (100 * ev.filter((e) => e.status === 'RSS_MISS').length / ev.length) : 0;
    const pre = ev.length ? (100 * ev.filter((e) => e.pre_covered).length / ev.length) : 0;
    const med = median(lags); const [lo, hi] = bootstrapMedianCI(lags);
    summary += `${t.padEnd(12)}  ${String(ev.length).padStart(3)}  ${String(lags.length).padStart(7)}  ${miss.toFixed(0).padStart(5)}%  ${pre.toFixed(0).padStart(6)}%   ${med == null ? 'n/a'.padStart(15) : String(med).padStart(15)}  ${lo == null ? '' : `[${lo}, ${hi}]`}\n`;
  }
  // monotonic trend tests (adjacent tiers, ascending size→down)
  summary += `\nDown-cap shift (Mann–Whitney, lag of B > A?):\n`;
  const order = ['large/other', 'mid', 'small', 'micro'];
  for (let i = 0; i < order.length - 1; i++) {
    const r = mannWhitney(lagByTier[order[i]], lagByTier[order[i + 1]]);
    summary += `  ${order[i]} vs ${order[i + 1]}: ${r.p == null ? r.note : `p=${r.p.toFixed(3)} (z=${r.z.toFixed(2)})`}\n`;
  }
  summary += `\nH21 reads: (a) median lag should rise large→mid→small→micro; (b) RSS_MISS = our feeds never caught it (Gemini web-sample sorts these into "missed by us" vs "filing-only"); (c) pre_covered = press knew BEFORE the filing (anti-edge — the filing was not the first source).\n`;
  summary += `Caveats: ~5-week depth (small n per tier); large/other = complement proxy (no Nifty-100 list); first-after-filing may mis-match a different event (Gemini sample is the backstop); does NOT test profitability (Exp22).\n`;

  // ── Gemini web-recon sample (stratified; oversample MISS) ─────────────────────
  const sample = [];
  const perTier = Math.ceil(SAMPLE_TARGET / TIERS.length);
  for (const t of TIERS) {
    const pool_t = [...byTier[t]];
    // prioritize a spread: all MISS first, then random matched
    const miss = pool_t.filter((e) => e.status === 'RSS_MISS');
    const matched = pool_t.filter((e) => e.status === 'matched').sort(() => Math.random() - 0.5);
    for (const e of [...miss, ...matched].slice(0, perTier)) {
      sample.push({
        event_id: e.event_id, company: e.company, ticker: e.ticker, tier: e.tier,
        subject: `${e.category || ''} — ${e.subject || ''}`.trim(),
        filing_time_ist: e.filedIst,
        our_rss_first_catch_ist: e.status === 'matched' ? e.our_catch_ist : 'MISS',
        our_rss_source: e.our_source || null,
        web_findings: {
          any_press_found: null, earliest_public_appearance_ist: null, earliest_outlet: null,
          earliest_url: null, timestamp_evidence: null, confidence: null,
          other_early_outlets: [], notes: null,
        },
      });
    }
  }

  // ── write outputs ────────────────────────────────────────────────────────────
  mkdirSync(OUT_DIR, { recursive: true });
  const csvHead = 'event_id,ticker,company,tier,status,filed_ist,our_catch_ist,lag_min,pub_lag_min,pre_covered,our_source,category,subject\n';
  const csvBody = events.map((e) => [
    e.event_id, e.ticker, `"${String(e.company || '').replace(/"/g, "'")}"`, e.tier, e.status,
    e.filedIst, e.our_catch_ist, e.lag_min ?? '', e.pub_lag_min ?? '', e.pre_covered,
    `"${String(e.our_source || '').replace(/"/g, "'")}"`, `"${String(e.category || '').replace(/"/g, "'")}"`,
    `"${String(e.subject || '').replace(/"/g, "'")}"`,
  ].join(',')).join('\n');
  writeFileSync(join(OUT_DIR, 'exp21_events.csv'), csvHead + csvBody);
  writeFileSync(join(OUT_DIR, 'exp21_summary.txt'), summary);
  writeFileSync(join(OUT_DIR, 'exp21_gemini_sample.json'), JSON.stringify({
    instructions: 'For each event, web-search the earliest PUBLIC appearance of this specific news. Fill ONLY web_findings. Every time MUST be backed by earliest_url + a quoted timestamp_evidence from the page; if no explicit timestamp is visible set confidence=low. any_press_found=false => filing-only. Do NOT invent timestamps.',
    schema_notes: 'times in IST "YYYY-MM-DD HH:MM". our_rss_first_catch_ist is when WE ingested it (MISS = our feeds never did). We bucket A/B/C after you return this.',
    sample: sample,
  }, null, 2));

  await pool.end();
  console.log(summary);
  console.log(`\nWrote:\n  ${join(OUT_DIR, 'exp21_events.csv')} (${events.length} events)\n  ${join(OUT_DIR, 'exp21_summary.txt')}\n  ${join(OUT_DIR, 'exp21_gemini_sample.json')} (${sample.length} events for Gemini)`);
}

main().catch((e) => { console.error('Exp21 failed:', e.message); process.exit(1); });
