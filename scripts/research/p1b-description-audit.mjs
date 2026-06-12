#!/usr/bin/env node
//
// P1b — the feed body-text audit (READ-ONLY; network-out only). Blueprint §3 Phase 1.
// QUESTION: how much usable article text do the india-variant RSS feeds actually deliver
// in <description>/<content:encoded> (the fields the digest parser currently discards)?
// Decides: can the Mind read from feeds alone, or is URL-fetching load-bearing?
//
//   node scripts/research/p1b-description-audit.mjs
//
// Method: extract the india feed roster from server/worldmonitor/news/v1/_feeds.ts
// (incl. gn()/gnIn() Google-News query feeds), fetch each feed once, parse items,
// strip HTML from description/content:encoded, measure words per item. Report per
// source: items, % items with >=40 words ("usable"), median words. Google-News-proxy
// feeds are flagged separately (their descriptions are link-list snippets, not article text).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FEEDS_TS = join(__dirname, '..', '..', 'server', 'worldmonitor', 'news', 'v1', '_feeds.ts');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const USABLE_WORDS = 40;

function extractIndiaFeeds(src) {
  const start = src.indexOf('india:');
  if (start < 0) throw new Error('india variant not found in _feeds.ts');
  // slice until the next top-level variant key at same indent (e.g. "\n  full:" / "\n  tech:") or EOF
  const rest = src.slice(start);
  const endMatch = rest.slice(6).search(/\n {2}[a-z]+: \{/);
  const block = endMatch > 0 ? rest.slice(0, endMatch + 6) : rest;
  const feeds = [];
  const re = /\{ name: '([^']+)', url: (?:'([^']+)'|gn\('([^']+)'\)|gnIn\('([^']+)'\))/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const [, name, plain, gnQ, gnInQ] = m;
    if (plain) feeds.push({ name, url: plain, kind: 'direct' });
    else if (gnQ) feeds.push({ name, url: `https://news.google.com/rss/search?q=${encodeURIComponent(gnQ)}&hl=en-US&gl=US&ceid=US:en`, kind: 'gnews' });
    else if (gnInQ) feeds.push({ name, url: `https://news.google.com/rss/search?q=${encodeURIComponent(gnInQ)}&hl=en&gl=IN&ceid=IN:en`, kind: 'gnews' });
  }
  return feeds;
}

const strip = (html) => html
  .replace(/<!\[CDATA\[|\]\]>/g, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z#0-9]+;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const words = (t) => (t ? t.split(' ').filter(Boolean).length : 0);

function parseItems(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks.slice(0, 30)) {
    const get = (tag) => {
      const mm = b.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
      return mm ? strip(mm[1]) : '';
    };
    const desc = get('description') || get('summary');
    const content = get('content:encoded') || get('content');
    items.push({ descWords: words(desc), contentWords: words(content) });
  }
  return items;
}

async function auditFeed(f) {
  try {
    const resp = await fetch(f.url, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' }, signal: AbortSignal.timeout(15_000), redirect: 'follow' });
    if (!resp.ok) return { ...f, status: `HTTP ${resp.status}`, items: 0 };
    const xml = await resp.text();
    const items = parseItems(xml);
    if (items.length === 0) return { ...f, status: 'no items', items: 0 };
    const best = items.map((i) => Math.max(i.descWords, i.contentWords)).sort((a, b) => a - b);
    const usable = best.filter((w) => w >= USABLE_WORDS).length;
    return { ...f, status: 'ok', items: items.length, usablePct: Math.round((usable / items.length) * 100), medianWords: best[Math.floor(best.length / 2)], maxWords: best[best.length - 1] };
  } catch (e) {
    return { ...f, status: e.name === 'TimeoutError' ? 'timeout' : `error: ${e.message.slice(0, 40)}`, items: 0 };
  }
}

async function main() {
  const feeds = extractIndiaFeeds(readFileSync(FEEDS_TS, 'utf8'));
  console.log(`india-variant feeds found: ${feeds.length} (${feeds.filter((f) => f.kind === 'direct').length} direct RSS · ${feeds.filter((f) => f.kind === 'gnews').length} Google-News proxies)\n`);

  const results = [];
  const pool = 8;
  for (let i = 0; i < feeds.length; i += pool) {
    const batch = await Promise.all(feeds.slice(i, i + pool).map(auditFeed));
    results.push(...batch);
    process.stdout.write(`  fetched ${Math.min(i + pool, feeds.length)}/${feeds.length}\r`);
  }
  console.log('');

  const ok = results.filter((r) => r.status === 'ok');
  const direct = ok.filter((r) => r.kind === 'direct');
  const gnews = ok.filter((r) => r.kind === 'gnews');

  console.log(`=== P1b DESCRIPTION AUDIT (usable = >=${USABLE_WORDS} words in description/content) ===\n`);
  console.log('DIRECT RSS FEEDS (the ones that matter):');
  for (const r of direct.sort((a, b) => (b.usablePct || 0) - (a.usablePct || 0))) {
    console.log(`  ${String(r.usablePct).padStart(3)}% usable · median ${String(r.medianWords).padStart(4)}w · max ${String(r.maxWords).padStart(5)}w · ${r.items} items · ${r.name}`);
  }
  const dead = results.filter((r) => r.status !== 'ok');
  console.log(`\nGOOGLE-NEWS PROXY FEEDS: ${gnews.length} ok — descriptions are headline/link snippets (median ${gnews.length ? gnews.map((g) => g.medianWords).sort((a, b) => a - b)[Math.floor(gnews.length / 2)] : 0}w) → NOT body text; these need url_context fetching by design.`);
  console.log(`UNREACHABLE/BROKEN: ${dead.length}${dead.length ? ' — ' + dead.map((d) => `${d.name} (${d.status})`).join('; ') : ''}`);

  const usableDirect = direct.filter((r) => r.usablePct >= 50).length;
  console.log(`\nVERDICT INPUTS: ${direct.length} direct feeds reachable · ${usableDirect} of them deliver usable text on >=50% of items.`);
  console.log('Reading: if most company-news-bearing feeds are in the usable set, Tier-1 (feed-text-only) carries v1; url_context covers the gnews + thin tail.');
}

main().catch((e) => { console.error('P1b failed:', e.message); process.exit(2); });
