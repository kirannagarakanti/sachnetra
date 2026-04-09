# Task 013 — Add Indian RSS Feeds to SachNetra

**Status**: ✅ Complete  
**File**: `src/config/variants/india.ts`  
**Scope**: FEEDS object only — no new panels, no new category keys  
**Source**: `ai_docs/prep/indian_rss_feeds.json`

---

## Summary

Add curated feeds from the prep JSON into **existing** FEEDS categories in `india.ts`.
No new panels. No new FEEDS keys. Startups merge into `technology`. Regional feeds merge into `politics`.

---

## Duplicate Removal (14 feeds already exist)

| Feed | Existing In | Skip From JSON |
|------|-------------|----------------|
| NDTV Latest News | politics | news |
| The Hindu - National | politics | news |
| Indian Express | politics | news |
| Hindustan Times | politics | news |
| Times of India | politics | news |
| The Print | politics | news |
| India Today | politics | news |
| Scroll.in | politics | news |
| The Wire | politics | news |
| LiveMint | economy | business |
| Economic Times | economy | business |
| Business Standard | economy | business |
| YourStory | technology | startups |
| Inc42 | technology | startups |

---

## Feeds to Add

### `economy` — Adding 7 feeds (currently 3 → 10 total)

- [ ] Business Today — `https://www.businesstoday.in/rssfeeds/?id=home`
- [ ] Financial Express — Google News proxy (likely 403)
- [ ] Hindu Business Line — `https://www.thehindubusinessline.com/?service=rss`
- [ ] Fortune India — `https://prod-qt-images.s3.amazonaws.com/production/fortuneindia/feed.xml`
- [ ] The Ken — Google News proxy (paywall)
- [ ] IBEF — `https://www.ibef.org/news.xml`
- [ ] Business Talk Magazine — `https://businesstalkmagazine.com/feed/`

### `politics` — Adding 25 feeds (currently 10 → 35 total)

**National news outlets (15):**
- [ ] New Indian Express — `https://www.newindianexpress.com/rss`
- [ ] Deccan Herald — Google News proxy (likely 403)
- [ ] ABP Live — `https://news.abplive.com/home/feed`
- [ ] Zee News — `https://zeenews.india.com/rss`
- [ ] The Quint — `https://prod-qt-images.s3.amazonaws.com/production/thequint/feed.xml`
- [ ] Firstpost — `https://www.firstpost.com/commonfeeds/v1/mfp/rss/web-stories.xml`
- [ ] DNA India — `https://www.dnaindia.com/feeds/india.xml`
- [ ] News18 — `https://www.news18.com/commonfeeds/v1/eng/rss/text.xml`
- [ ] AltNews (fact-check) — `https://www.altnews.in/feed/`
- [ ] The Better India — `https://thebetterindia.com/feed/`
- [ ] LiveLaw — `https://www.livelaw.in/rss-feed`
- [ ] The News Minute — `https://www.thenewsminute.com/rss.xml`
- [ ] Frontline — `https://frontline.thehindu.com/cover-story/feeder/default.rss`
- [ ] The Week — `https://www.theweek.in/content/theweek/en/news.rss`
- [ ] Outlook India — `https://www.outlookindia.com/rss`

**Regional outlets merged into politics (10):**
- [ ] Telangana Today — `https://telanganatoday.com/feed`
- [ ] Bangalore Mirror — `https://bangaloremirror.indiatimes.com/rssfeedstopstories.cms`
- [ ] Siasat (Hyderabad) — `https://www.siasat.com/feed/`
- [ ] Orissa Post — `https://www.orissapost.com/feed/`
- [ ] NENews Online — `https://nenow.in/feed`
- [ ] Daily Excelsior (J&K) — `https://www.dailyexcelsior.com/feed/`
- [ ] Greater Kashmir — `https://prod-qt-images.s3.amazonaws.com/production/greaterkashmir/feed.xml`
- [ ] Onmanorama (Kerala) — `https://www.onmanorama.com/news.rss`
- [ ] Tribune India — `https://www.tribuneindia.com/rss/feed?catId=42`
- [ ] Amarujala (Hindi) — `https://www.amarujala.com/rss/breaking-news.xml`

### `technology` — Adding 13 feeds (currently 2 → 15 total)

**Tech/startup news (3):**
- [ ] Entrackr — `https://entrackr.com/feed/`
- [ ] StartupTalky — `https://startuptalky.com/rss/`
- [ ] TechCircle — Google News proxy (likely 403)

**Startups merged into technology (10):**
- [ ] Startup India Magazine — `https://startupindiamagazine.com/feed/`
- [ ] Know Startup — `https://knowstartup.com/feed/`
- [ ] OfficeChai — `https://officechai.com/feed/`
- [ ] Indian Startup News — `https://indianstartupnews.com/feed/`
- [ ] Indian Web2 — `https://www.indianweb2.com/feeds/posts/default`
- [ ] The Tech Panda — `https://thetechpanda.com/startups-businesses-funding-ma-accelerators/startup-stories-startups/feed/`
- [ ] Startup Reporter — `https://startupreporter.in/feed/`
- [ ] Forbes India Startups — Google News proxy (likely 403)
- [ ] Startup India (Govt.) — `https://www.startupindia.gov.in/content/sih/en/bloglist.feed`
- [ ] Business Outreach — `https://www.businessoutreach.in/startup/feed/`

---

## Feeds Skipped (with reason)

| Category | Feed | Reason |
|----------|------|--------|
| business | NextWhatBusiness, SugerMint, PPN Solutions, Paypii | Niche blogs, not news |
| business | Paytm Blog, Instamojo, KredX, Indifi, ZipLoan | Product/fintech blogs |
| business | Chaaipani, EarnKaro, Gaurav Tiwari | Personal blogs |
| business | Taxila Business School, Indian Women Blog | Niche audience |
| business | CEO Review, Insights Success, Decision Maker | Low-quality magazine sites |
| business | TradeIndia, Airtel Business, Karbon, MyMoney | B2B/product blogs |
| business | MarketVein, Our Business Ladder, Insellers | Low traffic |
| business | Indian Business Council, Indian Chamber | Low update frequency |
| business | Business Connect India (both) | Low-quality aggregators |
| business | Trak.in Business, Mashable India | Aggregators / poor RSS |
| news | ScoopWhoop, Social Samosa | Entertainment, not news |
| news | Milli Gazette, Organiser, OpIndia, TFI Post | Highly partisan — not suitable for "clarity" tool |
| news | Deccan Chronicle, Times Now, India TV | Poor RSS structure / homepage-only URLs |
| news | AsianAge, NewsX, Editorji | Low RSS reliability |
| news | India.com, Rediff | Aggregators / outdated |
| news | OneIndia, Jagran English, Patrika | Poor English RSS quality |
| news | National Herald, Tehelka, The Probe | Low update frequency / niche |
| regional | Rising Kashmir, Kashmir Reader, Kashmir Observer, Kashmir News | Too many J&K papers — keeping Greater Kashmir + Daily Excelsior |
| regional | State Times, Early Times, JK Newsline, The Northlines | Same as above |
| regional | Sentinel Assam, Sangai Express, Morung Express, Arunachal Times | NE India papers — keeping NENews as representative |
| regional | Sikkim Express, Assam Times, The News Mill | Same NE rationale |
| regional | Star of Mysore, YoVizag, Chandigarh Metro, Chandigarh City News | City-level papers, too niche for V1 |
| regional | Bangalore Today, The Live Nagpur, Odisha Barta | Low traffic / duplicate coverage |
| startups | Way2World, Taalk, FeedMyStartup, TechPluto, TechSutram | Very low traffic / defunct |
| startups | Startup Lab, Startup Buzz, Startup Gig | Low update frequency |
| startups | Trak.in Startups | Aggregator, quality concerns |

---

## Google News Proxy Strategy

These feeds will use `rss('https://news.google.com/rss/search?q=site:domain.com&hl=en&gl=IN&ceid=IN:en')`:

1. Financial Express (`financialexpress.com`)
2. The Ken (`the-ken.com`)
3. Deccan Herald (`deccanherald.com`)
4. TechCircle (`techcircle.in`)
5. Forbes India (`forbesindia.com`)

All other feeds use direct RSS URLs wrapped in `rss()`.

---

## Execution Checklist

- [x] Update `FEEDS.economy` — add 7 feeds
- [x] Update `FEEDS.politics` — add 25 feeds (15 national + 10 regional)
- [x] Update `FEEDS.technology` — add 13 feeds (3 tech + 10 startups)
- [x] Run `npm run typecheck` — no errors (exit code 0)
- [x] Verify dev server loads (`npm run dev` — already running)
- [x] Spot-check feed count in browser console — `[News] Digest fetched: 5 categories`, 65 items indexed ✓

---

## Totals

| Category | Before | After |
|----------|--------|-------|
| politics | 10 | 35 |
| disaster | 2 | 2 (unchanged) |
| economy | 3 | 10 |
| technology | 2 | 15 |
| government | 2 | 2 (unchanged) |
| **Total** | **19** | **64** |

Adding **45 curated feeds** from the 153 in the JSON. **14 duplicates removed**, **94 skipped** (niche/partisan/defunct/poor RSS).

---

## Lessons Learned

### 1. Client vs Server feed config — both must be updated
The architecture has **two separate feed configs** that must stay in sync:

| File | Purpose |
|------|---------|
| `src/config/variants/india.ts` | Client-side fallback (used only when server digest fails) |
| `server/worldmonitor/news/v1/_feeds.ts` | Server-side digest (this is what actually fetches articles) |

We initially only updated the client-side config. Since the server digest always succeeded, the client never fell back — so the new 45 feeds were silently ignored for ~8 hours. **Always update both files together.**

### 2. Direct RSS URLs vs Google News proxy
Of the 45 new feeds, **15 failed** on first test (403s and 404s from direct RSS URLs). All 15 were fixed by switching to the Google News RSS proxy pattern: `gnIn('site:domain.com')`. This confirms that **most Indian news sites block server-side RSS requests** — prefer the proxy by default for new feeds.

### 3. Feed URL testing script
Created `scripts/test-india-feeds.mjs` — a standalone Node.js script that tests all feed URLs by checking HTTP status, content-type, and RSS item count. Run with `node scripts/test-india-feeds.mjs`. This should be used **before deploying** any new feed additions.

### 4. Clickable source links in story detail
**Added**: Source names in the story detail overlay are now clickable links that open the original article in a new tab.

**Files modified:**
- `src/app/data-loader.ts` (lines ~403–427) — source rows now render as `<a>` tags with `target="_blank"` linking to the article URL via `sItem.link`
- `src/styles/main.css` — added `.sn-detail-source-link` style (purple text `#a78bfa`, dashed underline, tap feedback) and `.sn-detail-source-row[data-url]` interactive state

**Behavior:** Each source name resolves its URL from the cluster item's `link` field. If no URL is available, it falls back to plain text (non-clickable). The entire row also has a subtle active state on tap.
