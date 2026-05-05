# SachNetra — Roadmap
*Prep Document 07 | The Adapt Sprint*

---

## The Adapt Sprint Methodology

SachNetra uses "The Adapt Sprint" — a structured workflow for adapting an existing open source codebase into a new product.

Three phases:

```
Phase 1: UNDERSTAND (complete)
  Deep-read WorldMonitor codebase docs
  Made all product decisions
  Created prep documents (this folder)

Phase 2: BOOTSTRAP (Task 000)
  AI reads prep docs + WorldMonitor codebase
  Generates workspace rules automatically
  Updates CLAUDE.md
  Project is now configured for IDE

Phase 3: EXECUTE (Tasks 001–018.5)
  Each task runs with permanent context from rules
  Each task is one focused unit of work
  Verification required before next task starts
  Tasks never combined
```

---

## V1 Status: ✅ LAUNCHED

**SachNetra V1 is live at sachnetra.com.**

All 19 tasks (including bug-fix sub-tasks) are complete and verified. The app has been deployed to Vercel with a custom domain, full Indian RSS feed coverage, AI summaries, timeline river, desktop layout, shareable story cards, and URL routing.

---

## Task Overview

```
Task 000 — Bootstrap & Rules Setup                    ✅ Complete
Task 001 — India Variant Scaffold                     ✅ Complete
Task 001.5 — Prep Doc Corrections                     ✅ Complete
Task 002 — Indian RSS Feeds                           ✅ Complete
Task 002.5 — Fix 403 Feeds                            ✅ Complete
Task 002v — Variant Wiring Analysis                   ✅ Complete (research task)
Task 003 — SachNetra Branding                         ✅ Complete
Task 004 — Mobile CSS                                 ✅ Complete
Task 005 — Two-Summary AI Prompt                      ✅ Complete
Task 006 — India Map Layers                           ✅ Complete
Task 007 — State Filtering                            ✅ Complete
Task 008 — Vercel Deployment                          ✅ Complete
Task 009 — CSS & UI Improvements                      ✅ Complete
Task 010 — State Filter Fixes                         ✅ Complete
Task 011 — Server-Side Digest for India               ✅ Complete
Task 012a — Cluster India Story Feed                  ✅ Complete
Task 012b — India Boundary Overlay                    ✅ Complete
Task 013a — Timeline River Feed                       ✅ Complete
Task 013b — Add Indian RSS Feeds (50+ sources)        ✅ Complete
Task 013.5 — Timeline Polish                          ✅ Complete
Task 014 — India Classifier Keywords                  ✅ Complete
Task 015 — Desktop Timeline CSS                       ✅ Complete
Task 016 — Desktop Header Cleanup & Sidebar           ✅ Complete
Task 016.5 — Sidebar Findings Polish                  ✅ Complete
Task 017 — URL Routing, Story Sharing & Domain        ✅ Complete
Task 018a — Improve Summary Prompt Quality            ✅ Complete
Task 018b — Shareable Story Card (Canvas)             ✅ Complete
Task 018.5 — Fix Summary Meaning Tone                 ✅ Complete
```

---

## Task 000 — Bootstrap & Rules Setup ✅

**Purpose**: Configure IDE for SachNetra. Run ONCE before any other task.

**Output created**:
```
.agents/rules/sachnetra-context.md
.agents/rules/sachnetra-boundaries.md
.agents/rules/sachnetra-patterns.md
.agents/rules/india-variant.md
CLAUDE.md (updated with SachNetra section)
```

---

## Task 001 — India Variant Scaffold ✅

**Purpose**: Create the india variant and make it load.

**Git commit**: `f0861996`, `dbff8d8f` — *Task 001 Completed*

**Files created/modified**:
```
src/config/variants/india.ts   CREATED — TypeScript variant config
src/App.ts                     MODIFIED — sachnetra.com hostname detection
CLAUDE.md                      MODIFIED — SachNetra section appended
```

---

## Task 001.5 — Prep Doc Corrections ✅

**Purpose**: Corrected factual errors discovered in prep docs during Task 001 execution.
*(Research/doc task — no code changes)*

---

## Task 002 — Indian RSS Feeds ✅

**Purpose**: Populate india.ts with Indian news sources — NDTV, The Hindu, Indian Express, etc.

**Git commit**: `22bceab2` — *Task 002: Added Indian RSS feeds*

**Files modified**:
```
src/config/variants/india.ts    MODIFIED — FEEDS array (initial 19 feeds)
api/rss-proxy.js                MODIFIED — Indian domains added to Vercel allowlist
scripts/ais-relay.cjs           MODIFIED — Indian domains added to Railway allowlist
```

---

## Task 002.5 — Fix 403 Feeds ✅

**Purpose**: Several Indian news sites returned 403 Forbidden when fetched directly. Switched those feeds to Google News RSS proxy pattern (`gnIn('site:domain.com')`).

*(Sub-task — no separate git commit; part of Task 002 work)*

---

## Task 002v — Variant Wiring Analysis ✅

**Purpose**: Research task documenting how variant config, feeds, and panels wire together in the WorldMonitor codebase. Output used to plan Tasks 011–012.

---

## Task 003 — SachNetra Branding ✅

**Purpose**: Replace WorldMonitor branding with SachNetra visual identity.

**Git commit**: `5975a171` — *Task 3 completed*

**Brand implemented**:
```
Logo: Diya + eye mark (SVG)
Colors: Purple #7b7bff + Saffron #FF9933
Background: Deep dark #0a0812
Wordmark: SachNetra solid white
Subtitle: सच्चनेत्र (loading screen)
Tagline: See clearly
Time-aware greeting: "Here's India this morning/now/this evening/tonight"
```

**Files created/modified**:
```
public/sachnetra-logo.svg      CREATED — diya + eye mark
public/favicon.ico             REPLACED — SachNetra favicon
src/styles/main.css            MODIFIED — --sn-* CSS variables added
index.html                     MODIFIED — title, meta tags, favicon link
```

---

## Task 004 — Mobile CSS ✅

**Purpose**: Make SachNetra look and feel right on mobile (375px viewport).

**Git commit**: `152354b6` — *Task 004 Mobile CSS - Done*

**Implemented**:
```
Home screen:    Header → State selector → Today's Brief → Time-divided feed → Bottom nav
Story detail:   Back → Metadata → Title → What Happened → What This Means → Sources → Share button
State selector: Grid of 36 states + UTs, 2 columns
Bottom nav: 4 tabs — Home · Timeline · Map · States
Time dividers: Yesterday / This morning / This afternoon / Today
Story card: [Category badge] [Source count badge] → [Title 13px bold] → [Location · Time ago] [Thumbnail 52px]
```

---

## Task 005 — Two-Summary AI Prompt ✅

**Purpose**: Modify Groq/OpenRouter to return two summaries per story — "What Happened" (factual) and "What This Means" (practical).

**Git commit**: `1f85201b` — *Task 005 — Two-Summary AI Prompt, Done*

**Files modified**:
```
api/groq-summarize.js           MODIFIED — two-field JSON output prompt, v4 cache key
api/openrouter-summarize.js     MODIFIED — same changes
src/components/StoryDetail.ts   MODIFIED — display both summary fields
```

---

## Task 006 — India Map Layers ✅

**Purpose**: Configure map for India context — centered on India (zoom 4), state outlines, earthquake layer.

**Git commit**: `236e868e` — *Task006 - 007 - DONE*

**Files modified**:
```
src/config/variants/india.ts         MODIFIED — DEFAULT_MAP_LAYERS, MAP_CONFIG, INDIA_BOUNDARY_OVERLAY
src/config/map-layer-definitions.ts  MODIFIED — indiaStates layer entry
src/config/geo.ts                    MODIFIED — INDIA_MAP_VIEW, INDIA_REGIONAL_VIEWS
```

---

## Task 007 — State Filtering ✅

**Purpose**: State selector filters news feed by selected state. Tap Maharashtra — see only Maharashtra stories.

**Git commit**: `236e868e` — *Task006 - 007 - DONE*

**Files created/modified**:
```
src/config/variants/india.ts    MODIFIED — INDIA_STATES list + INDIA_STATE_KEYWORDS (36 states + UTs)
src/services/rss.ts             MODIFIED — filterStoriesByState() function
src/components/StateSelector.ts CREATED — collapsible state picker UI component
src/app/app-context.ts          MODIFIED — selectedState field, localStorage persistence
```

---

## Task 008 — Vercel Deployment ✅

**Purpose**: Unblock API requests from sachnetra.com. The original codebase only allowed worldmonitor.app.

**Git commits**: `2bfd8fcc`, `44682d60`, `be1c73bf`, `e427b989`, `f7400949`, `0df9a395` — *Vercel deployment fixes*

**What was fixed**:
- CORS: Added `sachnetra.com` to `api/_cors.js` and `server/cors.ts`
- API key: Added `sachnetra.com` to `api/_api-key.js` trusted origins
- Middleware: Added `sachnetra.com` to host allowlist + OG metadata (`india` variant)
- CSP: Added `sachnetra.com` to `vercel.json` + `index.html` frame directives

**Vercel env vars configured by James**:
```
VITE_VARIANT=india
UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
GROQ_API_KEY / OPENROUTER_API_KEY
```

---

## Task 009 — CSS & UI Improvements ✅

**Purpose**: Category icons on story cards, improved state selector UX, detail screen gap fix.

**Git commit**: `b8e512c0` — *css improvements, state filter and category improvements*

**Implemented**:
- **Feed card icons**: 14 category-specific SVG icons in the purple thumbnail box (disaster=map pin, economic=chart, crime=lock, etc.)
- **State selector**: Replaced "Done" button with ×close button at top-right of state grid
- **Detail screen**: Fixed spacing between sources section and share button

---

## Task 010 — State Filter Fixes ✅

**Purpose**: Fixed two state filter bugs — footer showing "India" instead of selected state, and Delhi filter passing non-Delhi stories.

**Git commit**: Part of `b8e512c0`

**Fixes**:
- Footer location fallback now uses selected state name when no geo-hub city resolved
- `filterNewsByState()` simplified to title-only matching (removed `locationName` check that caused false positives)
- Removed `'parliament'` from Delhi keywords (national keyword causing leakage)

---

## Task 011 — Server-Side Digest for India ✅

**Purpose**: Added India variant to the server-side RSS digest, reducing page load from 12 individual HTTP requests to one cached API call.

**Git commits**: `42775368`, `9a06e720` — *india-digest-api, Vercel edge function - DONE*

**Files modified**:
```
server/worldmonitor/news/v1/list-feed-digest.ts  MODIFIED — added 'india' to VALID_VARIANTS
server/worldmonitor/news/v1/_feeds.ts             MODIFIED — added gnIn() helper + india feeds (19 feeds, 5 categories)
src/app/data-loader.ts                            MODIFIED — removed India per-feed fallback override
```

---

## Task 012a — Cluster India Story Feed ✅

**Purpose**: Changed story feed to render one card per clustered event instead of one card per raw item. Deduplicates duplicate coverage of the same story across sources.

**Git commits**: `bb12da1d`, `16a4c9a7`, `7e239b8d`, `8a3791c1` — *feed clustering completed*

**What changed**:
- `renderIndiaStoryCards()` now receives `ClusteredEvent[]` instead of raw `NewsItem[]`
- Multi-source summaries: Groq receives all headlines from the cluster (3 sources = 3 diverse perspectives)
- SOURCE section in story detail lists all sources with timestamps
- Source count badge appears on cards with multiple sources ("3 sources")

---

## Task 012b — India Boundary Overlay ✅

**Purpose**: Render India's official boundary (J&K + Ladakh as integral territory) over the basemap tiles which show disputed/international view.

**Git commits**: `66f1acfe`, `7e22bf88` — *India boundary overlay - DONE*

**Key decisions**:
- Used deck.gl `GeoJsonLayer` (NOT MapLibre `addSource`) — MapLibre GeoJSON web worker crashes in Vite dev mode
- GeoJSON hosted locally at `public/data/india-states.geojson` (simplemaps.com, 36 features)
- Always-on for India variant, not togglable

---

## Task 013a — Timeline River Feed ✅

**Purpose**: Built the Timeline tab — a chronological river of all stories from the last 24 hours with category filter chips and time-group dividers.

**Git commit**: `c51e978f` — *feat: Timeline River Feed (Tasks 013, 013.5, 014)*

**Implemented**:
- Category chip bar: All / Conflict / Economy / Tech / Govt / Environ
- Time buckets: JUST NOW (0–30min) / 1–3 HOURS AGO / EARLIER TODAY / YESTERDAY
- Cluster badges: "N sources" shown when sourceCount > 1
- Alert treatment: Red left border for `isAlert: true` clusters
- Client-side category fallback (`mapCategory()`) by source name — instant, no redeploy needed

---

## Task 013b — Add Indian RSS Feeds (50+ sources) ✅

**Purpose**: Expanded feed coverage from 19 feeds to 64 feeds across politics, economy, technology, disaster, government categories.

**Git commit**: `7a498357` — *New RSS feeds - DONE*

**Feed totals after this task**:
```
politics:   10 → 35 feeds (national + 10 regional outlets)
economy:     3 → 10 feeds
technology:  2 → 15 feeds (tech + startup news)
disaster:    2 → 2 (unchanged)
government:  2 → 2 (unchanged)
Total:      19 → 64 feeds
```

**Also added**: Clickable source links in story detail overlay (source name → original article URL)

---

## Task 013.5 — Timeline Polish ✅

**Purpose**: Fixed empty time-bucket dividers appearing in the timeline when no stories fell into a time window.

**Git commit**: Part of `c51e978f`

---

## Task 014 — India Classifier Keywords ✅

**Purpose**: Added India-specific keywords to the server-side classifier so stories get correct categories at ingestion instead of defaulting to `general`.

**Git commit**: Part of `c51e978f`

**Keywords added**:
- Economic: `nifty`, `sensex`, `gst`, `epf`, `income tax`, `stock market`, `bank fd`
- Diplomatic: `lok sabha`, `rajya sabha`, `assembly poll`, `campaigning`, `union minister`, `lok sabha`
- Crime (MEDIUM): `bribe`, `police custody`, `custodial`, `murder accused`
- Crime (LOW): `scam`, `arrested for`, `held for`, `cancels bail`
- Exclusions: `ipl`, `cricket`, `bollywood`, `t20`, `match preview`

---

## Task 015 — Desktop Timeline CSS ✅

**Purpose**: Built the desktop layout — timeline as primary view, two-column (river + sidebar), story detail as centered modal (not full-screen).

**Git commits**: `7d68ace9`, `5f74c9c6`, `c51e978f` — *Sticky article fix, Desktop styling*

**Implemented**:
- `@media (min-width: 769px)` block: WorldMonitor panel grid hidden, timeline shown
- Two-column grid: timeline river (flex) + 320px sidebar with Today's Brief
- Story detail: 640px centered modal with backdrop blur + click-outside-to-dismiss
- `setupDesktopIndiaLayout()` in panel-layout.ts
- Sidebar hidden at ≤1024px (single-column river)

---

## Task 016 — Desktop Header Cleanup & Sidebar Findings ✅

**Purpose**: Hide WorldMonitor header elements (DEFCON, Pro banner, settings gear, community widget, historical playback), add Intelligence Findings to sidebar.

**Git commit**: Part of `c51e978f` and desktop styling commits

**Hidden selectors added**:
```
.version, .pizzint-indicator, .pro-banner, .intel-findings-badge,
.community-widget, .mobile-settings-btn, #unifiedSettingsMount,
.history-controls, .export-btn, .beta-badge
```

**Sidebar modules added**:
- Today's Brief (synced from mobile brief generation)
- Intelligence Findings list (trending keywords + geo alerts from `getRecentSignals()` + `getRecentAlerts()`)

---

## Task 016.5 — Sidebar Findings Polish ✅

**Purpose**: Polished the sidebar Intelligence Findings rendering — layout, typography, hover states, count badge.

---

## Task 017 — URL Routing, Story Sharing & Domain ✅

**Purpose**: Added path-based URL routing, shareable story URLs, and WhatsApp deep-links.

**Git commits**: `bfdfb20e`, `234e6a8a`, `e7a4eb2d` — *fix: wire DataLoaderManager.init() + retry story deep-links (Task 017)*

**Implemented**:
- Tab routing: `/home`, `/timeline`, `/map`, `/states` via `history.replaceState`
- Story URLs: `/story?id=<base64slug>` pushed via `history.pushState` when story opens
- WhatsApp share: now includes story URL so recipients can deep-link
- Map URL sync suppressed for India variant (prevents `?lat=&lon=&zoom=` overwriting tab paths)
- Middleware OG handler extended to `/home`, `/timeline`, `/story` paths
- Story deep-link handler in `App.ts` (`tryOpenStoryFromSlug()`)
- Domain: sachnetra.com wired in Vercel dashboard with DNS A + CNAME records

---

## Task 018a — Improve Summary Prompt Quality ✅

**Purpose**: Rewrote the AI prompt rules to eliminate hallucination, banned phrases, and generic filler.

**Git commit**: `61701155` — *summary fix - DONE*

**Changes**:
- Anti-hallucination guard: "NEVER invent facts not present in the headlines"
- 6 banned phrases: "For ordinary Indians", "It's essential to stay informed", "consult a financial advisor", etc.
- Meaning classification step: `direct_impact` / `indirect_signal` / `informational_only`
- Entertainment stories → meaning: "" (green card hidden)
- `CACHE_VERSION` bumped to v7 (old low-quality summaries purged)

---

## Task 018b — Shareable Story Card (Canvas) ✅

**Purpose**: Built a branded Canvas 2D share card — replaces plain text WhatsApp share with a visual image card.

**Git commit**: `cec36a48` — *Shareable card - DONE*

**Card design**:
- 1080px wide, dynamic height (measured per story)
- 4 category themes: General (purple), Conflict (red), Economy (green), Government (gold)
- Topline gradient bar, mesh glow, category pill, headline (Syne 700), WHAT HAPPENED section
- SachNetra logo drawn inline via Canvas 2D (no async load)
- Share chain: Web Share API → clipboard → file download
- Button: "Share Story" (purple-to-saffron gradient)

**File created**: `src/services/sachnetra-share-card.ts`

---

## Task 018.5 — Fix Summary Meaning Tone ✅

**Purpose**: Fixed three bugs shipped by Task 018 — classification label leaking into output, meaning too often empty, and tone reading like a textbook.

**Git commit**: `117ca35e`, `322360c2` — *whats-message-fis-what-it-means-ignore, time buckets fix - DONE*

**Fixes**:
- "Do NOT include classification labels like 'direct_impact:' in your output"
- Meaning is now mandatory for all stories except entertainment/animal feel-good
- Tone rewritten: knowledgeable friend, 2-3 sentences, uses "you"/"your", no future speculation
- `CACHE_VERSION` bumped to v8

---

## V1 Launch Criteria — All Met ✅

```
FUNCTIONAL:
  ✓ All tasks complete and verified
  ✓ sachnetra.com loads without crash
  ✓ Indian news headlines visible on home screen (64 sources)
  ✓ AI summaries generating (What Happened + What This Means)
  ✓ State selector filters news correctly (36 states + UTs)
  ✓ Share button generates branded image card via Web Share API
  ✓ Map tab loads India map with official J&K/Ladakh boundaries
  ✓ Timeline tab: chronological river, category chips, time dividers
  ✓ Desktop layout: timeline river + sidebar with Today's Brief + Intel Findings
  ✓ URL routing: /home /timeline /map /states /story?id=<slug>
  ✓ Story sharing: WhatsApp includes deep-link URL
PERFORMANCE:
  ✓ Server-side digest reduces page load from 12 req → 1 cached call
  ✓ npm run typecheck — zero errors
  ✓ No console errors in production
BRAND:
  ✓ SachNetra logo visible (diya + eye mark)
  ✓ Loading screen shows correctly with time-aware greeting
  ✓ No WorldMonitor branding visible to users
OPEN SOURCE:
  ✓ MIT license file present
  ✓ README credits WorldMonitor by Elie Habib
  ✓ GitHub repo is public
```

---

## V2 Backlog (Post-Launch)

Build these after V1 has real users and feedback:

```
Landing Page
  → Public marketing page at sachnetra.com/
  → Separate from the app (currently app loads at root)
  → Hyderabad/India-specific positioning
  → Event discovery and news intelligence angle

GoOut Hyd Integration (in progress)
  → Pearl String UI Foundation
  → Event-forward positioning

RSSHub on Railway
  → PIB, MEA, MHA, NDMA press releases
  → Government sources as RSS feeds
  → Deploy Docker container, write connectors

Related Stories on Story Detail
  → Currently removed for V1

Mini Map on Story Detail
  → Show where the story is happening

WhatsApp Brief Delivery
  → Automated morning brief at 7am
  → Users opt-in via phone number

Hindi Language Support
  → Add hi.json locale file
  → Hindi UI labels

LAC/LOC Border Layers
  → Research editorial policy first
  → Source authoritative GeoJSON

State Liveability Score
  → Positive framing — higher score = better place to live
  → 4 components: Safety, Governance, Infrastructure, Economy
  → Data: NCRB annual, Cloudflare outages, startup activity signals
  → UI: 4 bars per state, no single reductive number
  → Architect must define weights before building

Tender & Scheme Alerts (paid feature)
  → Small businesses: GeM tenders filtered by sector/state
  → Researchers: Government scheme tracking
  → Journalists: Policy change monitoring
  → Delivery: Email digest or in-app alerts
  → Price point: ₹199–499/month
  → Requires: GeM API access, MyScheme API, notification system

Redis Article Storage
  → Full schema with three timestamps
  → Article routing system (full/basic/minimal processing modes)
  → Mozilla Readability for full article text extraction
  → Sentiment scoring via @xenova/transformers

"New Stories" Pill on Timeline
  → Green "N new" pill indicating unread stories
  → Requires tracking seen stories in sessionStorage
```

---

## V3 Backlog (After V2 Has Users)

```
Government variant (BharatBuild or similar)
  → Schemes, tenders, auctions, good news
  → Separate brand, same codebase

Firecrawl + Gemini extraction agent
  → Scrape unstructured government sources
  → LLM extracts structured events

Knowledge graph / all-seeing eye
  → Graphiti for temporal entity relationships
  → Pattern detection across 6 months of data
  → Natural language queries

Communal incident tracker
  → Requires human review pipeline
  → Legal review before building

Internet shutdown monitor
  → SFLC.in data source
  → Significant in India context
```

---

## Time Estimates Summary — V1 Actual

```
Task 000: Bootstrap              30 min
Task 001: Variant scaffold        2–3 hours
Task 001.5: Prep doc corrections  30 min
Task 002: RSS feeds               3–4 hours
Task 002.5: Fix 403 feeds         1 hour
Task 003: Branding                4–6 hours
Task 004: Mobile CSS              6–8 hours
Task 005: Two-summary AI          4–5 hours
Task 006: Map layers              5–6 hours
Task 007: State filtering         6–8 hours
Task 008: Vercel deployment       2–3 hours
Task 009: CSS improvements        1.5 hours
Task 010: State filter fixes      1–2 hours
Task 011: Server-side digest      1–2 hours
Task 012a: Cluster feed           3–4 hours
Task 012b: India boundary         2–3 hours
Task 013a: Timeline river         2–3 hours
Task 013b: Add 45 more feeds      2 hours
Task 013.5: Timeline polish       30 min
Task 014: Classifier keywords     30 min
Task 015: Desktop timeline CSS    4–6 hours
Task 016: Desktop header + sidebar 2–3 hours
Task 016.5: Sidebar polish        1 hour
Task 017: URL routing + sharing   2–3 hours
Task 018a: Prompt quality         1–2 hours
Task 018b: Shareable card         2–3 hours
Task 018.5: Fix meaning tone      30 min
─────────────────────────────────────────
Total V1 (estimated):            67–89 hours
Realistic with debugging:        6 weeks part-time
```
