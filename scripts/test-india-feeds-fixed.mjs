#!/usr/bin/env node
/**
 * Re-test all 15 fixed India feeds (now using Google News proxy).
 */

const feeds = [
  { name: 'IBEF', url: 'https://news.google.com/rss/search?q=site:ibef.org&hl=en&gl=IN&ceid=IN:en' },
  { name: 'New Indian Express', url: 'https://news.google.com/rss/search?q=site:newindianexpress.com&hl=en&gl=IN&ceid=IN:en' },
  { name: 'Zee News', url: 'https://news.google.com/rss/search?q=site:zeenews.india.com&hl=en&gl=IN&ceid=IN:en' },
  { name: 'Firstpost', url: 'https://news.google.com/rss/search?q=site:firstpost.com&hl=en&gl=IN&ceid=IN:en' },
  { name: 'News18', url: 'https://news.google.com/rss/search?q=site:news18.com&hl=en&gl=IN&ceid=IN:en' },
  { name: 'The Week', url: 'https://news.google.com/rss/search?q=site:theweek.in&hl=en&gl=IN&ceid=IN:en' },
  { name: 'Outlook India', url: 'https://news.google.com/rss/search?q=site:outlookindia.com&hl=en&gl=IN&ceid=IN:en' },
  { name: 'LiveLaw', url: 'https://news.google.com/rss/search?q=site:livelaw.in&hl=en&gl=IN&ceid=IN:en' },
  { name: 'The News Minute', url: 'https://news.google.com/rss/search?q=site:thenewsminute.com&hl=en&gl=IN&ceid=IN:en' },
  { name: 'Tribune India', url: 'https://news.google.com/rss/search?q=site:tribuneindia.com&hl=en&gl=IN&ceid=IN:en' },
  { name: 'Onmanorama', url: 'https://news.google.com/rss/search?q=site:onmanorama.com&hl=en&gl=IN&ceid=IN:en' },
  { name: 'Bangalore Mirror', url: 'https://news.google.com/rss/search?q=site:bangaloremirror.indiatimes.com&hl=en&gl=IN&ceid=IN:en' },
  { name: 'Entrackr', url: 'https://news.google.com/rss/search?q=site:entrackr.com&hl=en&gl=IN&ceid=IN:en' },
  { name: 'Indian Startup News', url: 'https://news.google.com/rss/search?q=site:indianstartupnews.com&hl=en&gl=IN&ceid=IN:en' },
  { name: 'Startup India Gov', url: 'https://news.google.com/rss/search?q=site:startupindia.gov.in&hl=en&gl=IN&ceid=IN:en' },
];

async function testFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SachNetra/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.text();
    const hasRss = body.includes('<item') || body.includes('<entry');
    const items = (body.match(/<item/g) || body.match(/<entry/g) || []).length;
    return { name: feed.name, status: res.status, hasRss: hasRss ? 'yes' : 'NO', items, result: res.status === 200 && hasRss ? '✅' : `❌ ${res.status}` };
  } catch (err) {
    return { name: feed.name, status: 0, hasRss: 'NO', items: 0, result: `❌ ${err.message.slice(0, 30)}` };
  }
}

async function main() {
  console.log(`\nRe-testing ${feeds.length} fixed feeds (Google News proxy)...\n`);
  const results = await Promise.all(feeds.map(testFeed));
  console.table(results);
  const ok = results.filter(r => r.result === '✅').length;
  console.log(`\n✅ Working: ${ok}/${results.length}`);
  if (ok < results.length) {
    results.filter(r => r.result !== '✅').forEach(r => console.log(`   ❌ ${r.name} — ${r.result}`));
  }
}
main();
