#!/usr/bin/env node
//
// P1d sample builder (READ-ONLY; network fetch only — no DB).
// Pre-registration: research-notes/2026-06-12_p1d-specialist-quality-brief.md (§6 method correction).
//
// Mirrors the Mind's C1 input EXACTLY: harvests recent articles from the publishers' DIRECT RSS feeds
// (not the pipeline's gnews-redirect rows), fetches each full body via the P1c own-fetch JSON-LD path,
// keeps the first N articles with >=120 body words (stratified across source), and writes a sample + a
// pasteable specialist prompt for the Antigravity (Gemini 3.5 Flash) run.
//
//   node scripts/research/p1d-sample-builder.mjs
//
// Output: scripts/research/output/p1d/p1d_sample.json  +  p1d_prompt.txt

import fs from 'node:fs';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const TARGET = 30;
const MIN_WORDS = 120;
const PER_SOURCE_CAP = 9;          // diversity guard (brief §6 stratification)
const PER_FEED_LINKS = 12;         // harvest depth per feed
const OUT_DIR = path.join('scripts', 'research', 'output', 'p1d');

// Direct publisher feeds validated in P1c (JSON-LD body works on all four).
const FEEDS = [
  ['Economic Times',    'https://economictimes.indiatimes.com/news/company/rssfeeds/2143429.cms'],
  ['Economic Times',    'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms'],
  ['Moneycontrol',      'https://www.moneycontrol.com/rss/business.xml'],
  ['Moneycontrol',      'https://www.moneycontrol.com/rss/results.xml'],
  ['LiveMint',          'https://www.livemint.com/rss/companies'],
  ['Business Standard', 'https://www.business-standard.com/rss/companies-101.rss'],
];

const wc = (t) => (t ? t.split(/\s+/).filter(Boolean).length : 0);
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const strip = (h) => h.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

function deepFindArticleBody(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const n of node) deepFindArticleBody(n, out); return; }
  if (typeof node.articleBody === 'string') out.push(node.articleBody);
  for (const k of Object.keys(node)) deepFindArticleBody(node[k], out);
}
function jsonldBody(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1].trim());
  const found = [];
  for (const b of blocks) {
    try { deepFindArticleBody(JSON.parse(b), found); }
    catch {
      const m = b.match(/"articleBody"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (m) found.push(m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\u[0-9a-f]{4}/gi, ' '));
    }
  }
  return (found.sort((a, b) => b.length - a.length)[0] || '').replace(/\s+/g, ' ').trim();
}
async function fetchBody(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(20_000), redirect: 'follow' });
    if (!r.ok) return { body: '', note: `HTTP ${r.status}` };
    return { body: jsonldBody(await r.text()), note: '' };
  } catch (e) { return { body: '', note: e.name === 'TimeoutError' ? 'timeout' : e.message.slice(0, 30) }; }
}

const PROMPT = `You are a financial-news specialist for the Indian equity market. Read the ARTICLE BODY below and
output ONE JSON object (no prose, no markdown fences) with EXACTLY these fields:

{
  "primary_entity": "the listed company the article is mainly about (ticker or name)",
  "event_type": "one of: results|order_win|mna|fundraise|rating|pledge|management_change|regulatory|guidance|legal|other|none",
  "stance": <number -1.0..+1.0; clearly bad for the company = negative, clearly good = positive, neutral = 0>,
  "magnitude": "low|med|high (how material to that company)",
  "novelty": <0.0..1.0; 0 = already-known/stale, 1 = genuinely new information>,
  "surprise": <0.0..1.0; 0 = in line with expectations, 1 = big surprise vs expectations>,
  "confidence": <0.0..1.0; your confidence in THIS record>,
  "factor_touches": [ {"factor":"crude|inr|repo|monsoon|...","sign":"+|-"} ],
  "rationale": "ONE sentence, grounded ONLY in the article text — no outside facts",
  "model_id": "gemini-3.5-flash"
}

Hard rules: rationale must cite only what the article says; never invent a number, date, or claim that is not
in the text; if the article names no clear listed company, primary_entity = "none" and event_type = "none".

Return the JSON for ARTICLE id={{ID}}.

--- ARTICLE BODY (id={{ID}}, source={{SOURCE}}) ---
{{BODY}}
--- END ARTICLE ---`;

async function harvestFeed([name, feed]) {
  try {
    const r = await fetch(feed, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, */*' }, signal: AbortSignal.timeout(15_000), redirect: 'follow' });
    if (!r.ok) return [];
    const xml = await r.text();
    const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
    const out = [];
    for (const it of items) {
      const lm = it.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || it.match(/<link[^>]*href=["']([^"']+)["']/i);
      const tm = it.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const href = lm && strip(lm[1]);
      if (href && /^https?:\/\//.test(href) && !/news\.google\.com/.test(href)) out.push({ source: name, headline: tm ? strip(tm[1]) : '', url: href });
      if (out.length >= PER_FEED_LINKS) break;
    }
    return out;
  } catch { return []; }
}

async function main() {
  // Interleave feeds so the harvest stays balanced across sources.
  const harvests = await Promise.all(FEEDS.map(harvestFeed));
  const queue = [];
  for (let i = 0; i < PER_FEED_LINKS; i++) for (const h of harvests) if (h[i]) queue.push(h[i]);

  const seen = new Set();
  console.log(`harvested ${queue.length} candidate links across ${FEEDS.length} feeds; fetching bodies…`);

  const kept = [];
  const perSource = {};
  let n = 0;
  for (const c of queue) {
    if (kept.length >= TARGET) break;
    if (seen.has(c.url)) continue;
    seen.add(c.url);
    const srcKey = hostOf(c.url);
    if ((perSource[srcKey] || 0) >= PER_SOURCE_CAP) continue;
    const { body, note } = await fetchBody(c.url);
    const words = wc(body);
    if (words < MIN_WORDS) { process.stderr.write(`  skip ${srcKey} ${words}w ${note} ${c.headline.slice(0, 50)}\n`); continue; }
    perSource[srcKey] = (perSource[srcKey] || 0) + 1;
    kept.push({ id: `p1d-${String(++n).padStart(2, '0')}`, source: c.source, headline: c.headline, url: c.url, body_words: words, body });
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'p1d_sample.json'), JSON.stringify(kept, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'p1d_prompt.txt'), PROMPT);

  console.log(`\nkept ${kept.length} articles (>=${MIN_WORDS} words)`);
  console.log('by source:', JSON.stringify(perSource));
  console.log(`\nwrote ${path.join(OUT_DIR, 'p1d_sample.json')} + p1d_prompt.txt`);
  console.log('Next: run each article body through Antigravity (Gemini 3.5 Flash) with p1d_prompt.txt → paste records back.');
}

main();
