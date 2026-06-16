#!/usr/bin/env node
//
// P1c-step-0 — direct-publisher RSS check (READ-ONLY; network-out only).
// Kimi round-7: "publishers may expose direct RSS that Google News aggregates but your
// roster bypasses — if they exist with body text, part of the core problem dissolves
// without fetch." Candidates: the big-4 proxied sources + Moneycontrol (top absent source).
//
//   node scripts/research/p1c0-direct-rss-check.mjs

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const USABLE = 40;

const CANDIDATES = [
  ['ET default', 'https://economictimes.indiatimes.com/rssfeedsdefault.cms'],
  ['ET markets', 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms'],
  ['ET company news', 'https://economictimes.indiatimes.com/news/company/rssfeeds/2143429.cms'],
  ['LiveMint markets', 'https://www.livemint.com/rss/markets'],
  ['LiveMint companies', 'https://www.livemint.com/rss/companies'],
  ['BS markets', 'https://www.business-standard.com/rss/markets-106.rss'],
  ['BS companies', 'https://www.business-standard.com/rss/companies-101.rss'],
  ['FE market (wp)', 'https://www.financialexpress.com/market/feed/'],
  ['FE industry (wp)', 'https://www.financialexpress.com/industry/feed/'],
  ['Moneycontrol latest', 'https://www.moneycontrol.com/rss/latestnews.xml'],
  ['Moneycontrol business', 'https://www.moneycontrol.com/rss/business.xml'],
  ['Moneycontrol results', 'https://www.moneycontrol.com/rss/results.xml'],
];

const strip = (h) => h.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const words = (t) => (t ? t.split(' ').filter(Boolean).length : 0);

async function check([name, url]) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, */*' }, signal: AbortSignal.timeout(15_000), redirect: 'follow' });
    if (!r.ok) return `  ${name.padEnd(22)} HTTP ${r.status}  (${url})`;
    const xml = await r.text();
    const items = (xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []).slice(0, 25);
    if (!items.length) return `  ${name.padEnd(22)} no items  (${url})`;
    const best = items.map((b) => {
      const g = (tag) => { const m = b.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')); return m ? words(strip(m[1])) : 0; };
      return Math.max(g('description'), g('content:encoded'), g('content'));
    }).sort((a, b) => a - b);
    const usable = best.filter((w) => w >= USABLE).length;
    return `  ${name.padEnd(22)} ${String(Math.round((usable / best.length) * 100)).padStart(3)}% usable · median ${String(best[Math.floor(best.length / 2)]).padStart(4)}w · max ${String(best[best.length - 1]).padStart(5)}w · ${best.length} items`;
  } catch (e) {
    return `  ${name.padEnd(22)} ${e.name === 'TimeoutError' ? 'timeout' : `error: ${e.message.slice(0, 50)}`}`;
  }
}

const results = await Promise.all(CANDIDATES.map(check));
console.log(`=== P1c-0 DIRECT-PUBLISHER RSS CHECK (usable = >=${USABLE} words) ===`);
for (const r of results) console.log(r);
console.log('\nReading: any source >=50% usable here can replace its gnews proxy in the roster — body text without fetch.');
