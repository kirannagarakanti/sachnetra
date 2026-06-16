#!/usr/bin/env node
//
// P1c — Gemini url_context fetch probe (READ-ONLY; network-out only).
// Blueprint Phase-1: "Can Gemini fetch Indian outlets?" — the decisive feasibility test for the
// Mind's fetch path, made load-bearing by P1b (the core business feeds = thin gnews proxies, so
// the specialist MUST fetch the body for LiveMint/ET/BS/FE-class sources).
//
// Method: harvest N real ARTICLE urls from each source's direct RSS, ask Gemini Flash to fetch +
// extract each via the url_context tool, and tabulate per source: retrieval-success %, paywall/
// thin rate, and median extracted body words. Honours blueprint v0.1 §6 (per-source success
// tracker) and the cost envelope (Flash free tier, hard request cap).
//
//   node scripts/research/p1c-url-context-probe.mjs
//
// Needs GEMINI_API_KEY in .env.local. Writes nothing — stdout table only.

import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const MODEL = 'gemini-2.5-flash';
const PER_SOURCE = 8;          // articles probed per source
const USABLE_WORDS = 120;      // body counts as "fetched" only above this
const REQ_TIMEOUT = 60_000;
const THROTTLE_MS = 7_000;     // free-tier Flash ~10 RPM — stay under it
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const key = (fs.readFileSync('.env.local', 'utf8').match(/GEMINI_API_KEY=(\S+)/) || [])[1];
if (!key) { console.error('GEMINI_API_KEY missing from .env.local'); process.exit(1); }
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

// Load-bearing sources (P1b: gnews proxies + fetch-dependent) harvested from their DIRECT publisher feeds
// so url_context sees a real publisher URL, not a news.google.com redirect.
const SOURCES = [
  ['Economic Times', 'https://economictimes.indiatimes.com/news/company/rssfeeds/2143429.cms'],
  ['Moneycontrol',   'https://www.moneycontrol.com/rss/business.xml'],
  ['LiveMint',       'https://www.livemint.com/rss/companies'],
  ['Business Std',   'https://www.business-standard.com/rss/companies-101.rss'],
  ['Financial Exp',  'https://www.financialexpress.com/industry/feed/'],
  ['Hindu BizLine',  'https://www.thehindubusinessline.com/markets/feeder/default.rss'],
  // FE + Business Today direct feeds serve an HTML bot-wall (not RSS) — they live in our roster as
  // gnews proxies for exactly this reason; not harvestable here.
];

const strip = (h) => h.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const words = (t) => (t ? t.split(/\s+/).filter(Boolean).length : 0);

async function harvest([name, feed]) {
  try {
    const r = await fetch(feed, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, */*' }, signal: AbortSignal.timeout(15_000), redirect: 'follow' });
    if (!r.ok) return { name, links: [], note: `feed HTTP ${r.status}` };
    const xml = await r.text();
    const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
    const links = [];
    for (const it of items) {
      const m = it.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || it.match(/<link[^>]*href=["']([^"']+)["']/i);
      const href = m && strip(m[1]);
      if (href && /^https?:\/\//.test(href) && !/news\.google\.com/.test(href)) links.push(href);
      if (links.length >= PER_SOURCE) break;
    }
    return { name, links, note: links.length ? '' : 'no direct article links' };
  } catch (e) {
    return { name, links: [], note: e.name === 'TimeoutError' ? 'feed timeout' : `feed err: ${e.message.slice(0, 40)}` };
  }
}

async function probe(url) {
  const prompt = `Fetch the news article at this URL and output ONLY its full article body text verbatim, no summary, no commentary, no headline. If you cannot access it or it is paywalled, output exactly "BLOCKED".\nURL: ${url}`;
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], tools: [{ url_context: {} }], generationConfig: { temperature: 0 } }),
      signal: AbortSignal.timeout(REQ_TIMEOUT),
    });
    const j = await r.json();
    if (j.error) return { status: 'APIERR', w: 0, detail: `${r.status} ${j.error.status || ''} ${j.error.message?.slice(0, 50)}` };
    if (!j.candidates?.length) return { status: 'APIERR', w: 0, detail: `no-cand finish=${JSON.stringify(j.promptFeedback || j).slice(0, 60)}` };
    const c = j.candidates?.[0];
    const meta = c?.urlContextMetadata?.urlMetadata?.[0]?.urlRetrievalStatus || 'NO_META';
    const text = (c?.content?.parts || []).map((p) => p.text || '').join(' ');
    const w = words(text);
    const blocked = /^\s*BLOCKED\s*$/i.test(text.trim());
    let status;
    if (meta.includes('ERROR')) status = 'RETR_ERR';
    else if (blocked) status = 'BLOCKED';
    else if (w >= USABLE_WORDS) status = 'OK';
    else status = 'THIN';
    return { status, w, meta };
  } catch (e) {
    return { status: e.name === 'TimeoutError' ? 'TIMEOUT' : 'ERR', w: 0, detail: e.message?.slice(0, 50) };
  }
}

console.log(`=== P1c — Gemini url_context fetch probe (${MODEL}, OK = >=${USABLE_WORDS} body words) ===\n`);

const harvested = await Promise.all(SOURCES.map(harvest));
let totalReq = 0;

for (const { name, links, note } of harvested) {
  if (!links.length) { console.log(`  ${name.padEnd(15)} — skipped (${note})`); continue; }
  const results = [];
  for (const u of links) {
    const res = await probe(u);
    results.push(res); totalReq++;
    if (!['OK', 'BLOCKED', 'RETR_ERR', 'THIN'].includes(res.status)) process.stderr.write(`    [${name}] ${res.status}: ${res.detail || ''}  ${u.slice(0, 70)}\n`);
    await sleep(THROTTLE_MS);  // respect free-tier RPM
  }
  const tally = (s) => results.filter((x) => x.status === s).length;
  const oks = results.filter((x) => x.status === 'OK');
  const medW = oks.length ? oks.map((x) => x.w).sort((a, b) => a - b)[Math.floor(oks.length / 2)] : 0;
  const pct = Math.round((tally('OK') / results.length) * 100);
  console.log(
    `  ${name.padEnd(15)} ${String(pct).padStart(3)}% OK  (${results.length} probed)` +
    `  · OK ${tally('OK')} / blocked ${tally('BLOCKED')} / retr-err ${tally('RETR_ERR')} / thin ${tally('THIN')} / fail ${tally('TIMEOUT') + tally('ERR') + tally('APIERR')}` +
    (medW ? `  · median ${medW}w` : ''),
  );
}

console.log(`\n${totalReq} url_context calls. Reading: a source >=50% OK can carry the specialist via fetch;`);
console.log('high blocked/retr-err = paywall or bot-wall → that source stays headline+snippet only (P1b fallback).');
