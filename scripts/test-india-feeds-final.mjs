#!/usr/bin/env node
/**
 * FINAL test — all 45 new India feeds with corrected URLs.
 */

const feeds = [
  // economy (7)
  { name: 'Business Today', url: 'https://www.businesstoday.in/rssfeeds/?id=home', cat: 'economy' },
  { name: 'Financial Express', url: 'https://news.google.com/rss/search?q=site:financialexpress.com&hl=en&gl=IN&ceid=IN:en', cat: 'economy' },
  { name: 'Hindu Business Line', url: 'https://www.thehindubusinessline.com/?service=rss', cat: 'economy' },
  { name: 'Fortune India', url: 'https://prod-qt-images.s3.amazonaws.com/production/fortuneindia/feed.xml', cat: 'economy' },
  { name: 'The Ken', url: 'https://news.google.com/rss/search?q=site:the-ken.com&hl=en&gl=IN&ceid=IN:en', cat: 'economy' },
  { name: 'IBEF', url: 'https://news.google.com/rss/search?q=site:ibef.org&hl=en&gl=IN&ceid=IN:en', cat: 'economy' },
  { name: 'Business Talk Magazine', url: 'https://businesstalkmagazine.com/feed/', cat: 'economy' },
  // politics national (15)
  { name: 'New Indian Express', url: 'https://news.google.com/rss/search?q=site:newindianexpress.com&hl=en&gl=IN&ceid=IN:en', cat: 'politics' },
  { name: 'Deccan Herald', url: 'https://news.google.com/rss/search?q=site:deccanherald.com&hl=en&gl=IN&ceid=IN:en', cat: 'politics' },
  { name: 'ABP Live', url: 'https://news.abplive.com/home/feed', cat: 'politics' },
  { name: 'Zee News', url: 'https://news.google.com/rss/search?q=site:zeenews.india.com&hl=en&gl=IN&ceid=IN:en', cat: 'politics' },
  { name: 'The Quint', url: 'https://prod-qt-images.s3.amazonaws.com/production/thequint/feed.xml', cat: 'politics' },
  { name: 'Firstpost', url: 'https://news.google.com/rss/search?q=site:firstpost.com&hl=en&gl=IN&ceid=IN:en', cat: 'politics' },
  { name: 'DNA India', url: 'https://www.dnaindia.com/feeds/india.xml', cat: 'politics' },
  { name: 'News18', url: 'https://news.google.com/rss/search?q=site:news18.com&hl=en&gl=IN&ceid=IN:en', cat: 'politics' },
  { name: 'The Week', url: 'https://news.google.com/rss/search?q=site:theweek.in&hl=en&gl=IN&ceid=IN:en', cat: 'politics' },
  { name: 'Outlook India', url: 'https://news.google.com/rss/search?q=site:outlookindia.com&hl=en&gl=IN&ceid=IN:en', cat: 'politics' },
  { name: 'Frontline', url: 'https://frontline.thehindu.com/cover-story/feeder/default.rss', cat: 'politics' },
  { name: 'LiveLaw', url: 'https://news.google.com/rss/search?q=site:livelaw.in&hl=en&gl=IN&ceid=IN:en', cat: 'politics' },
  { name: 'The News Minute', url: 'https://news.google.com/rss/search?q=site:thenewsminute.com&hl=en&gl=IN&ceid=IN:en', cat: 'politics' },
  { name: 'AltNews', url: 'https://www.altnews.in/feed/', cat: 'politics' },
  { name: 'The Better India', url: 'https://thebetterindia.com/feed/', cat: 'politics' },
  // politics regional (10)
  { name: 'Tribune India', url: 'https://news.google.com/rss/search?q=site:tribuneindia.com&hl=en&gl=IN&ceid=IN:en', cat: 'politics' },
  { name: 'Telangana Today', url: 'https://telanganatoday.com/feed', cat: 'politics' },
  { name: 'Onmanorama', url: 'https://news.google.com/rss/search?q=site:onmanorama.com&hl=en&gl=IN&ceid=IN:en', cat: 'politics' },
  { name: 'Siasat', url: 'https://www.siasat.com/feed/', cat: 'politics' },
  { name: 'Bangalore Mirror', url: 'https://news.google.com/rss/search?q=site:bangaloremirror.indiatimes.com&hl=en&gl=IN&ceid=IN:en', cat: 'politics' },
  { name: 'Orissa Post', url: 'https://www.orissapost.com/feed/', cat: 'politics' },
  { name: 'NENews Online', url: 'https://nenow.in/feed', cat: 'politics' },
  { name: 'Daily Excelsior', url: 'https://www.dailyexcelsior.com/feed/', cat: 'politics' },
  { name: 'Greater Kashmir', url: 'https://prod-qt-images.s3.amazonaws.com/production/greaterkashmir/feed.xml', cat: 'politics' },
  { name: 'Amarujala', url: 'https://www.amarujala.com/rss/breaking-news.xml', cat: 'politics' },
  // technology (3 tech + 10 startups)
  { name: 'Entrackr', url: 'https://news.google.com/rss/search?q=site:entrackr.com&hl=en&gl=IN&ceid=IN:en', cat: 'technology' },
  { name: 'StartupTalky', url: 'https://startuptalky.com/rss/', cat: 'technology' },
  { name: 'TechCircle', url: 'https://news.google.com/rss/search?q=site:techcircle.in&hl=en&gl=IN&ceid=IN:en', cat: 'technology' },
  { name: 'Startup India Magazine', url: 'https://startupindiamagazine.com/feed/', cat: 'technology' },
  { name: 'Know Startup', url: 'https://knowstartup.com/feed/', cat: 'technology' },
  { name: 'OfficeChai', url: 'https://officechai.com/feed/', cat: 'technology' },
  { name: 'Indian Startup News', url: 'https://news.google.com/rss/search?q=site:indianstartupnews.com&hl=en&gl=IN&ceid=IN:en', cat: 'technology' },
  { name: 'Indian Web2', url: 'https://www.indianweb2.com/feeds/posts/default', cat: 'technology' },
  { name: 'The Tech Panda', url: 'https://thetechpanda.com/startups-businesses-funding-ma-accelerators/startup-stories-startups/feed/', cat: 'technology' },
  { name: 'Startup Reporter', url: 'https://startupreporter.in/feed/', cat: 'technology' },
  { name: 'Forbes India Startups', url: 'https://news.google.com/rss/search?q=site:forbesindia.com+startup&hl=en&gl=IN&ceid=IN:en', cat: 'technology' },
  { name: 'Startup India Gov', url: 'https://news.google.com/rss/search?q=site:startupindia.gov.in&hl=en&gl=IN&ceid=IN:en', cat: 'technology' },
  { name: 'Business Outreach', url: 'https://www.businessoutreach.in/startup/feed/', cat: 'technology' },
];

async function testFeed(f) {
  try {
    const res = await fetch(f.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SachNetra/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.text();
    const hasRss = body.includes('<item') || body.includes('<entry');
    const items = (body.match(/<item/g) || body.match(/<entry/g) || []).length;
    return { name: f.name, cat: f.cat, status: res.status, items, result: res.status === 200 && hasRss ? '✅' : `❌ ${res.status}` };
  } catch (err) {
    return { name: f.name, cat: f.cat, status: 0, items: 0, result: `❌ ${err.message.slice(0, 30)}` };
  }
}

async function main() {
  console.log(`\nFINAL TEST — All ${feeds.length} new India feeds\n`);
  const results = [];
  for (let i = 0; i < feeds.length; i += 5) {
    const batch = feeds.slice(i, i + 5);
    results.push(...await Promise.all(batch.map(testFeed)));
    process.stdout.write(`  ${results.length}/${feeds.length}\r`);
  }
  console.log('\n');
  console.table(results);
  const ok = results.filter(r => r.result === '✅').length;
  console.log(`\n✅ ${ok}/${results.length} feeds working`);
  if (ok < results.length) {
    console.log('\nFailed:');
    results.filter(r => r.result !== '✅').forEach(r => console.log(`  ${r.name} (${r.cat}) — ${r.result}`));
  }
}
main();
