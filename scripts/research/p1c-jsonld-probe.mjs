#!/usr/bin/env node
//
// P1c-step-2 — JSON-LD articleBody extraction probe (READ-ONLY; network only).
// Antigravity's agent retrieved Moneycontrol via raw HTTP + JSON-LD `articleBody` parse — a FREE,
// no-LLM path that the Gemini url_context tool could NOT reach (MC bot-walls Google's fetcher).
// This checks how far that own-fetcher path carries across the 5 load-bearing sources.
//
//   node scripts/research/p1c-jsonld-probe.mjs

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const URLS = [
  ['ET',          'https://economictimes.indiatimes.com/news/company/corporate-trends/indian-firms-raise-3-76-bn-via-ecbs-in-april-reliance-industries-air-india-indian-oil-renew-surya-roshni-renewable-energy/articleshow/131663383.cms'],
  ['Moneycontrol','https://www.moneycontrol.com/news/business/tata-elxsi-q4-net-profit-revenue-decline-qoq-firm-declares-dividendrs-70-per-share_17532061.html'],
  ['LiveMint',    'https://www.livemint.com/companies/news/singapore-court-stays-order-to-jail-byju-raveendran-lawyer-says-11781262374652.html'],
  ['BusinessStd', 'https://www.business-standard.com/companies/news/goldman-sachs-morgan-stanley-others-buy-2-3-stake-in-lenskart-126061101314_1.html'],
  ['HinduBL',     'https://www.thehindubusinessline.com/markets/forex/rupee-rallies-as-oil-slump-sparks-unwinding-of-dollar-longs/article71093244.ece'],
];

const wc = (t) => (t ? t.split(/\s+/).filter(Boolean).length : 0);

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
    try { const d = JSON.parse(b); deepFindArticleBody(d, found); }
    catch {
      const m = b.match(/"articleBody"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (m) found.push(m[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').replace(/\\u[0-9a-f]{4}/gi, ' '));
    }
  }
  return found.sort((a, b) => b.length - a.length)[0] || '';
}

for (const [name, u] of URLS) {
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(20_000), redirect: 'follow' });
    const html = await r.text();
    const hasLD = /application\/ld\+json/i.test(html);
    const body = jsonldBody(html);
    console.log(`${name.padEnd(13)} HTTP ${r.status} | ${String(Math.round(html.length / 1024)).padStart(4)}kb | ld+json:${hasLD ? 'yes' : 'NO '} | articleBody:${String(wc(body)).padStart(4)}w | ${body.slice(0, 64).replace(/\s+/g, ' ')}`);
  } catch (e) {
    console.log(`${name.padEnd(13)} ERR ${e.message.slice(0, 50)}`);
  }
}
