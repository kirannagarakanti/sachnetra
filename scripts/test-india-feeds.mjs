#!/usr/bin/env node
/**
 * Test all new India variant RSS feed URLs.
 * Checks: HTTP status, content-type, has XML/RSS content.
 * Usage: node scripts/test-india-feeds.mjs
 */

const feeds = [
  // --- economy (7 new) ---
  { name: 'Business Today', url: 'https://www.businesstoday.in/rssfeeds/?id=home', category: 'economy' },
  { name: 'Financial Express', url: 'https://news.google.com/rss/search?q=site:financialexpress.com&hl=en&gl=IN&ceid=IN:en', category: 'economy', proxy: true },
  { name: 'Hindu Business Line', url: 'https://www.thehindubusinessline.com/?service=rss', category: 'economy' },
  { name: 'Fortune India', url: 'https://prod-qt-images.s3.amazonaws.com/production/fortuneindia/feed.xml', category: 'economy' },
  { name: 'The Ken', url: 'https://news.google.com/rss/search?q=site:the-ken.com&hl=en&gl=IN&ceid=IN:en', category: 'economy', proxy: true },
  { name: 'IBEF', url: 'https://www.ibef.org/news.xml', category: 'economy' },
  { name: 'Business Talk Magazine', url: 'https://businesstalkmagazine.com/feed/', category: 'economy' },

  // --- politics (15 new national) ---
  { name: 'New Indian Express', url: 'https://www.newindianexpress.com/rss', category: 'politics' },
  { name: 'Deccan Herald', url: 'https://news.google.com/rss/search?q=site:deccanherald.com&hl=en&gl=IN&ceid=IN:en', category: 'politics', proxy: true },
  { name: 'ABP Live', url: 'https://news.abplive.com/home/feed', category: 'politics' },
  { name: 'Zee News', url: 'https://zeenews.india.com/rss', category: 'politics' },
  { name: 'The Quint', url: 'https://prod-qt-images.s3.amazonaws.com/production/thequint/feed.xml', category: 'politics' },
  { name: 'Firstpost', url: 'https://www.firstpost.com/commonfeeds/v1/mfp/rss/web-stories.xml', category: 'politics' },
  { name: 'DNA India', url: 'https://www.dnaindia.com/feeds/india.xml', category: 'politics' },
  { name: 'News18', url: 'https://www.news18.com/commonfeeds/v1/eng/rss/text.xml', category: 'politics' },
  { name: 'The Week', url: 'https://www.theweek.in/content/theweek/en/news.rss', category: 'politics' },
  { name: 'Outlook India', url: 'https://www.outlookindia.com/rss', category: 'politics' },
  { name: 'Frontline', url: 'https://frontline.thehindu.com/cover-story/feeder/default.rss', category: 'politics' },
  { name: 'LiveLaw', url: 'https://www.livelaw.in/rss-feed', category: 'politics' },
  { name: 'The News Minute', url: 'https://www.thenewsminute.com/rss.xml', category: 'politics' },
  { name: 'AltNews', url: 'https://www.altnews.in/feed/', category: 'politics' },
  { name: 'The Better India', url: 'https://thebetterindia.com/feed/', category: 'politics' },

  // --- politics (10 regional) ---
  { name: 'Tribune India', url: 'https://www.tribuneindia.com/rss/feed?catId=42', category: 'politics' },
  { name: 'Telangana Today', url: 'https://telanganatoday.com/feed', category: 'politics' },
  { name: 'Onmanorama', url: 'https://www.onmanorama.com/news.rss', category: 'politics' },
  { name: 'Siasat', url: 'https://www.siasat.com/feed/', category: 'politics' },
  { name: 'Bangalore Mirror', url: 'https://bangaloremirror.indiatimes.com/rssfeedstopstories.cms', category: 'politics' },
  { name: 'Orissa Post', url: 'https://www.orissapost.com/feed/', category: 'politics' },
  { name: 'NENews Online', url: 'https://nenow.in/feed', category: 'politics' },
  { name: 'Daily Excelsior', url: 'https://www.dailyexcelsior.com/feed/', category: 'politics' },
  { name: 'Greater Kashmir', url: 'https://prod-qt-images.s3.amazonaws.com/production/greaterkashmir/feed.xml', category: 'politics' },
  { name: 'Amarujala', url: 'https://www.amarujala.com/rss/breaking-news.xml', category: 'politics' },

  // --- technology (3 new tech) ---
  { name: 'Entrackr', url: 'https://entrackr.com/feed/', category: 'technology' },
  { name: 'StartupTalky', url: 'https://startuptalky.com/rss/', category: 'technology' },
  { name: 'TechCircle', url: 'https://news.google.com/rss/search?q=site:techcircle.in&hl=en&gl=IN&ceid=IN:en', category: 'technology', proxy: true },

  // --- technology (10 startups merged) ---
  { name: 'Startup India Magazine', url: 'https://startupindiamagazine.com/feed/', category: 'technology' },
  { name: 'Know Startup', url: 'https://knowstartup.com/feed/', category: 'technology' },
  { name: 'OfficeChai', url: 'https://officechai.com/feed/', category: 'technology' },
  { name: 'Indian Startup News', url: 'https://indianstartupnews.com/feed/', category: 'technology' },
  { name: 'Indian Web2', url: 'https://www.indianweb2.com/feeds/posts/default', category: 'technology' },
  { name: 'The Tech Panda', url: 'https://thetechpanda.com/startups-businesses-funding-ma-accelerators/startup-stories-startups/feed/', category: 'technology' },
  { name: 'Startup Reporter', url: 'https://startupreporter.in/feed/', category: 'technology' },
  { name: 'Forbes India Startups', url: 'https://news.google.com/rss/search?q=site:forbesindia.com+startup&hl=en&gl=IN&ceid=IN:en', category: 'technology', proxy: true },
  { name: 'Startup India Gov', url: 'https://www.startupindia.gov.in/content/sih/en/bloglist.feed', category: 'technology' },
  { name: 'Business Outreach', url: 'https://www.businessoutreach.in/startup/feed/', category: 'technology' },
];

const TIMEOUT_MS = 10000;

async function testFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SachNetra/1.0; +https://sachnetra.com)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      redirect: 'follow',
    });

    clearTimeout(timer);

    const status = res.status;
    const contentType = res.headers.get('content-type') || '';
    const body = await res.text();
    const hasRss = body.includes('<rss') || body.includes('<feed') || body.includes('<channel') || body.includes('<item');
    const itemCount = (body.match(/<item/g) || body.match(/<entry/g) || []).length;

    return {
      name: feed.name,
      category: feed.category,
      proxy: feed.proxy ? 'yes' : 'no',
      status,
      hasRss: hasRss ? 'yes' : 'NO',
      items: itemCount,
      result: status === 200 && hasRss ? '✅' : status === 403 ? '🚫 403' : status === 200 ? '⚠️  no RSS' : `❌ ${status}`,
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      name: feed.name,
      category: feed.category,
      proxy: feed.proxy ? 'yes' : 'no',
      status: 0,
      hasRss: 'NO',
      items: 0,
      result: err.name === 'AbortError' ? '⏱️  timeout' : `❌ ${err.message.slice(0, 40)}`,
    };
  }
}

async function main() {
  console.log(`\nTesting ${feeds.length} new India feeds...\n`);

  // Test 5 at a time to avoid overwhelming
  const results = [];
  for (let i = 0; i < feeds.length; i += 5) {
    const batch = feeds.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(testFeed));
    results.push(...batchResults);
    process.stdout.write(`  ${results.length}/${feeds.length} tested\r`);
  }

  console.log('\n');
  console.table(results);

  const ok = results.filter(r => r.result === '✅').length;
  const fail = results.filter(r => r.result !== '✅').length;
  console.log(`\n✅ Working: ${ok}/${results.length}`);
  if (fail > 0) {
    console.log(`❌ Failed: ${fail}`);
    results.filter(r => r.result !== '✅').forEach(r => {
      console.log(`   ${r.name} (${r.category}) — ${r.result}`);
    });
  }
}

main();
