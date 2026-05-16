#!/usr/bin/env node

// SYNC: When adding India feeds here, also update server/worldmonitor/news/v1/_feeds.ts
// india: section. These two lists serve different consumers but must stay aligned.
// TODO(post-V2-012): consolidate to a shared JSON manifest both files import.
//
// This file mirrors the FULL live _feeds.ts india: block (politics, economy,
// technology, disaster, government). The V2-012 Redis digest schema only permits
// four feed_bucket / category values (politics | economy | technology | disaster),
// so the five _feeds.ts `government` feeds are remapped here rather than introducing
// a fifth bucket: DD News / PIB / MEA / MHA → politics, NDMA → disaster.
//
// `type: 'google-news'` = URL built via gnIn() (Google News RSS search, prone to
// IP throttling — gets empty-response detection). `type: 'direct'` = publisher RSS.

const gnIn = (q) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en&gl=IN&ceid=IN:en`;

export const INDIA_FEEDS = {
  economy: [
    { name: 'LiveMint', url: gnIn('site:livemint.com'), type: 'google-news', category: 'economy' },
    { name: 'Economic Times', url: gnIn('site:economictimes.indiatimes.com'), type: 'google-news', category: 'economy' },
    { name: 'Business Standard', url: gnIn('site:business-standard.com'), type: 'google-news', category: 'economy' },
    { name: 'Business Today', url: 'https://www.businesstoday.in/rssfeeds/?id=home', type: 'direct', category: 'economy' },
    { name: 'Financial Express', url: gnIn('site:financialexpress.com'), type: 'google-news', category: 'economy' },
    { name: 'Hindu Business Line', url: 'https://www.thehindubusinessline.com/?service=rss', type: 'direct', category: 'economy' },
    { name: 'Fortune India', url: 'https://prod-qt-images.s3.amazonaws.com/production/fortuneindia/feed.xml', type: 'direct', category: 'economy' },
    { name: 'The Ken', url: gnIn('site:the-ken.com'), type: 'google-news', category: 'economy' },
    { name: 'IBEF', url: gnIn('site:ibef.org'), type: 'google-news', category: 'economy' },
    { name: 'Business Talk Magazine', url: 'https://businesstalkmagazine.com/feed/', type: 'direct', category: 'economy' },
  ],
  politics: [
    { name: 'NDTV', url: 'https://feeds.feedburner.com/ndtvnews-top-stories', type: 'direct', category: 'politics' },
    { name: 'The Hindu', url: 'https://www.thehindu.com/news/feeder/default.rss', type: 'direct', category: 'politics' },
    { name: 'Indian Express', url: gnIn('site:indianexpress.com India'), type: 'google-news', category: 'politics' },
    { name: 'ANI', url: 'https://www.aninews.in/rss/india.xml', type: 'direct', category: 'politics' },
    { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', type: 'direct', category: 'politics' },
    { name: 'Hindustan Times', url: gnIn('site:hindustantimes.com India'), type: 'google-news', category: 'politics' },
    { name: 'India Today', url: 'https://www.indiatoday.in/rss/1206578', type: 'direct', category: 'politics' },
    { name: 'New Indian Express', url: gnIn('site:newindianexpress.com'), type: 'google-news', category: 'politics' },
    { name: 'ABP Live', url: 'https://news.abplive.com/home/feed', type: 'direct', category: 'politics' },
    { name: 'Zee News', url: gnIn('site:zeenews.india.com'), type: 'google-news', category: 'politics' },
    { name: 'News18', url: gnIn('site:news18.com'), type: 'google-news', category: 'politics' },
    { name: 'The Quint', url: 'https://prod-qt-images.s3.amazonaws.com/production/thequint/feed.xml', type: 'direct', category: 'politics' },
    { name: 'Firstpost', url: gnIn('site:firstpost.com'), type: 'google-news', category: 'politics' },
    { name: 'DNA India', url: 'https://www.dnaindia.com/feeds/india.xml', type: 'direct', category: 'politics' },
    { name: 'The Week', url: gnIn('site:theweek.in'), type: 'google-news', category: 'politics' },
    { name: 'Outlook India', url: gnIn('site:outlookindia.com'), type: 'google-news', category: 'politics' },
    { name: 'Frontline', url: 'https://frontline.thehindu.com/cover-story/feeder/default.rss', type: 'direct', category: 'politics' },
    { name: 'LiveLaw', url: gnIn('site:livelaw.in'), type: 'google-news', category: 'politics' },
    { name: 'The Wire', url: 'https://thewire.in/feed', type: 'direct', category: 'politics' },
    { name: 'Scroll', url: 'https://scroll.in/feed', type: 'direct', category: 'politics' },
    { name: 'The Print', url: 'https://theprint.in/feed', type: 'direct', category: 'politics' },
    { name: 'The News Minute', url: gnIn('site:thenewsminute.com'), type: 'google-news', category: 'politics' },
    { name: 'AltNews', url: 'https://www.altnews.in/feed/', type: 'direct', category: 'politics' },
    { name: 'The Better India', url: 'https://thebetterindia.com/feed/', type: 'direct', category: 'politics' },
    { name: 'Deccan Herald', url: gnIn('site:deccanherald.com'), type: 'google-news', category: 'politics' },
    { name: 'Tribune India', url: gnIn('site:tribuneindia.com'), type: 'google-news', category: 'politics' },
    { name: 'Telangana Today', url: 'https://telanganatoday.com/feed', type: 'direct', category: 'politics' },
    { name: 'Onmanorama', url: gnIn('site:onmanorama.com'), type: 'google-news', category: 'politics' },
    { name: 'Siasat', url: 'https://www.siasat.com/feed/', type: 'direct', category: 'politics' },
    { name: 'Bangalore Mirror', url: gnIn('site:bangaloremirror.indiatimes.com'), type: 'google-news', category: 'politics' },
    { name: 'Orissa Post', url: 'https://www.orissapost.com/feed/', type: 'direct', category: 'politics' },
    { name: 'NENews Online', url: 'https://nenow.in/feed', type: 'direct', category: 'politics' },
    { name: 'Daily Excelsior', url: 'https://www.dailyexcelsior.com/feed/', type: 'direct', category: 'politics' },
    { name: 'Greater Kashmir', url: 'https://prod-qt-images.s3.amazonaws.com/production/greaterkashmir/feed.xml', type: 'direct', category: 'politics' },
    { name: 'Amarujala', url: 'https://www.amarujala.com/rss/breaking-news.xml', type: 'direct', category: 'politics' },
    { name: 'Times Now', url: 'https://www.timesnownews.com/feeds/gns-en-latest.xml', type: 'direct', category: 'politics' },
    { name: 'Deccan Chronicle', url: 'https://www.deccanchronicle.com/rss_feed', type: 'direct', category: 'politics' },
    // Remapped from _feeds.ts india.government (no `government` bucket in V2-012 schema)
    { name: 'DD News', url: gnIn('site:ddnews.gov.in'), type: 'google-news', category: 'politics' },
    { name: 'PIB', url: 'https://www.pib.gov.in/ViewRss.aspx?reg=1&lang=1', type: 'direct', category: 'politics' },
    { name: 'MEA', url: gnIn('site:mea.gov.in'), type: 'google-news', category: 'politics' },
    { name: 'MHA', url: gnIn('site:mha.gov.in'), type: 'google-news', category: 'politics' },
  ],
  technology: [
    { name: 'YourStory', url: 'https://yourstory.com/feed', type: 'direct', category: 'technology' },
    { name: 'Inc42', url: 'https://inc42.com/feed/', type: 'direct', category: 'technology' },
    { name: 'Entrackr', url: gnIn('site:entrackr.com'), type: 'google-news', category: 'technology' },
    { name: 'StartupTalky', url: 'https://startuptalky.com/rss/', type: 'direct', category: 'technology' },
    { name: 'TechCircle', url: gnIn('site:techcircle.in'), type: 'google-news', category: 'technology' },
    { name: 'Startup India Magazine', url: 'https://startupindiamagazine.com/feed/', type: 'direct', category: 'technology' },
    { name: 'Know Startup', url: 'https://knowstartup.com/feed/', type: 'direct', category: 'technology' },
    { name: 'OfficeChai', url: 'https://officechai.com/feed/', type: 'direct', category: 'technology' },
    { name: 'Indian Startup News', url: gnIn('site:indianstartupnews.com'), type: 'google-news', category: 'technology' },
    { name: 'Indian Web2', url: 'https://www.indianweb2.com/feeds/posts/default', type: 'direct', category: 'technology' },
    { name: 'The Tech Panda', url: 'https://thetechpanda.com/startups-businesses-funding-ma-accelerators/startup-stories-startups/feed/', type: 'direct', category: 'technology' },
    { name: 'Startup Reporter', url: 'https://startupreporter.in/feed/', type: 'direct', category: 'technology' },
    { name: 'Forbes India Startups', url: gnIn('site:forbesindia.com startup'), type: 'google-news', category: 'technology' },
    { name: 'Startup India Gov', url: gnIn('site:startupindia.gov.in'), type: 'google-news', category: 'technology' },
    { name: 'Business Outreach', url: 'https://www.businessoutreach.in/startup/feed/', type: 'direct', category: 'technology' },
  ],
  disaster: [
    { name: 'NDTV India', url: 'https://feeds.feedburner.com/ndtvnews-india-news', type: 'direct', category: 'disaster' },
    { name: 'The Hindu Environment', url: 'https://www.thehindu.com/sci-tech/energy-and-environment/feeder/default.rss', type: 'direct', category: 'disaster' },
    // Remapped from _feeds.ts india.government (NDMA = National Disaster Management Authority)
    { name: 'NDMA', url: gnIn('site:ndma.gov.in'), type: 'google-news', category: 'disaster' },
  ],
};

export function getAllFeeds() {
  return Object.values(INDIA_FEEDS).flat();
}
