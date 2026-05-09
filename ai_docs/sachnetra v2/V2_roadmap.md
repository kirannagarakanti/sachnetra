# SachNetra V2 — Roadmap
*Adapt Sprint | Generated 2026-05-05*

---

## V2 Mission

V1 shipped a working India news aggregator. V2 transforms it into a data collection engine — every digest run permanently records signal data, independent of user activity. The news app remains the public face. The PostgreSQL database accumulates the asset.

**The sentence:** SachNetra is the collection engine. The database is the asset. The quant system is the proof of value.

---

## Architecture Decisions (locked before coding)

| Decision | Answer |
|----------|--------|
| Database | Railway PostgreSQL (no Convex) |
| Intelligence pipeline | New Railway cron script — sibling to `seed-insights.mjs` |
| Hook point | Reads `news:digest:v1:india:en` from Redis (already populated by digest) |
| Sentiment model | HuggingFace FinBERT API (HF_API_TOKEN) — free tier first |
| Summaries (What Happened / What It Means) | On-demand per user click, Redis-cached after first hit |
| GoOut Hyderabad | Removed from V2 scope |
| Landing page | Last task — after real usage numbers exist |
| Convex | Not in V2. Railway PostgreSQL only. |

---

## Task Overview

```
Task V2-000 — V2 Bootstrap & Rules Update               [✅] Complete — 2026-05-06
Task V2-001 — Railway Setup + Data Foundation           [✅] Complete — 2026-05-07
Task V2-002 — Enrich Summary with Intelligence Signals  [✅] Complete — 2026-05-08
Task V2-003 — Related Stories on Story Detail           [ ] Not started
Task V2-004 — Feedback Buttons (👍👎)                   [ ] Not started
Task V2-005 — RSSHub on Railway (Government Sources)    [ ] Not started
Task V2-006 — New Stories Pill on Timeline              [ ] Not started
Task V2-007 — Hindi Language Support                    [ ] Not started
Task V2-008 — WhatsApp Daily Brief                      [ ] Not started
Task V2-009 — State Liveability Score                   [ ] Not started
Task V2-010 — Landing Page                              [ ] Not started
```

**Total estimated time:** 37–57 hours of focused work
**Actual (with debugging):** expect 1.5–2.5× estimate based on V1 precedent (~6 weeks part-time)

---

## Dependency Map

```
V2-000
  └─► V2-001 (Railway must exist before any data work)
        └─► V2-002 (PostgreSQL must exist to store enriched signals)
        └─► V2-004 (PostgreSQL must exist to store feedback)
        └─► V2-008 (PostgreSQL must exist to store subscribers)

V2-000
  └─► V2-003 (no DB dependency — keyword overlap only)
  └─► V2-006 (no DB dependency — sessionStorage only)
  └─► V2-007 (no DB dependency — locale file only)
  └─► V2-010 (no DB dependency — static HTML)

V2-001
  └─► V2-005 (Railway already running; add RSSHub to same project)

V2-009 — BLOCKED on architect weight definition (Daniel must decide)
```

---

## Task V2-000 — V2 Bootstrap & Rules Update

**Goal:** Update agent rules and CLAUDE.md to reflect V2 scope, architecture decisions, and new files before any V2 code runs.

**Depends on:** none
**Estimated time:** 1–2 hours
**V2**

### Files to touch:
```
.agents/rules/sachnetra-context.md     — add V2 mission, quant pivot context
.agents/rules/sachnetra-patterns.md   — add runSeed() pattern, Railway cron pattern
.agents/rules/sachnetra-boundaries.md — add india_news_signals schema, new scope guard
.agents/rules/india-variant.md        — note intelligence pipeline, new env vars
CLAUDE.md                              — add V2 section, Railway architecture
ai_docs/SACHNETRA_BUILD_GUIDE.md      — update V2 Build Plan to match this roadmap
```

### Prep docs relevant:
```
ai_docs/sachnetra v2/V2_roadmap.md    — this file (source of truth for V2)
ai_docs/sachnetra v2/wiki/syntheses/sachnetra_quant_pivot.md
ai_docs/sachnetra v2/wiki/syntheses/sachnetra_sentiment_architecture.md
```

### Key decisions to encode in rules:
- Sacred files rule (full.ts, tech.ts, finance.ts) carries forward unchanged
- New sacred: never modify `scripts/seed-insights.mjs` for V2 intelligence work
- `seed-india-signals.mjs` is the V2 intelligence pipeline entry point
- `india_news_signals` is the only PostgreSQL table in V2-001
- GoOut Hyderabad is removed from all V2 scope guards

---

## Task V2-001 — Railway Setup + Data Foundation

**Status:** ✅ COMPLETE — 2026-05-07
**Goal:** Create the permanent data collection pipeline — a Railway cron script that reads every India digest from Redis, scores market-moving headlines with FinBERT, and writes signals to PostgreSQL. Runs every 10 minutes, independent of user activity.

**Depends on:** Task V2-000
**Estimated time:** 4–6 hours
**V2**

### What was built:
- `shared/market-taxonomy.json` — keyword registry (34 market keywords, 47 Nifty 50 entities, 7 sectors, 6 event types, systemic keywords)
- `scripts/_india-market-keywords.mjs` — extraction helpers: `isMarketMoving`, `extractCompanies`, `extractSectors`, `detectEventType`, `detectRelevanceClassFromTitle`
- `scripts/_sentiment-chain.mjs` — three-level fallback: HuggingFace FinBERT → Xenova FinBERT → Groq → DLQ (zero data loss)
- `scripts/seed-india-signals.mjs` — main Railway cron pipeline following exact `runSeed()` pattern
- `scripts/migrate-india-signals.mjs` — idempotent DDL runner for Railway PostgreSQL
- `server/worldmonitor/news/v1/list-feed-digest.ts` — added `scrapedAt: number` field (2 lines only)
- Railway PostgreSQL provisioned with `india_news_signals` table + 3 indexes

### Files created:
```
shared/market-taxonomy.json            — NEW (keyword/entity registry)
scripts/_india-market-keywords.mjs     — NEW (extraction helpers)
scripts/_sentiment-chain.mjs           — NEW (3-level sentiment fallback)
scripts/seed-india-signals.mjs         — NEW (Railway cron pipeline)
scripts/migrate-india-signals.mjs      — NEW (idempotent DDL runner)
```

### Files modified:
```
server/worldmonitor/news/v1/list-feed-digest.ts  — +2 lines (scrapedAt field only)
package.json                                      — pg ^8.20.0, @xenova/transformers ^2.17.2
```

### Key implementation notes:
- HuggingFace endpoint: `router.huggingface.co/hf-inference/` (not `api-inference.huggingface.co` — moved for fine-grained tokens)
- Local dev uses `DATABASE_PUBLIC_URL`; Railway cron uses internal `DATABASE_URL` — both handled via `DATABASE_PUBLIC_URL || DATABASE_URL`
- First run: 8 rows inserted; second run: 0 inserted (ON CONFLICT DO NOTHING confirmed)
- Sentiment model breakdown: finbert-hf (Level 1) active after token fix; groq-llama (Level 3) as fallback

### Files to READ (reference only, never write):
```
scripts/seed-insights.mjs              — copy runSeed() pattern exactly
scripts/_seed-utils.mjs                — runSeed, loadEnvFile, getRedisCredentials helpers
scripts/_clustering.mjs                — understand how digest items are shaped
server/worldmonitor/news/v1/_classifier.ts — understand existing keyword classification
```

### PostgreSQL schema (DDL to run on Railway):
```sql
CREATE TABLE india_news_signals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_hash    TEXT UNIQUE NOT NULL,
  scraped_at       TIMESTAMPTZ NOT NULL,
  published_at     TIMESTAMPTZ,
  processed_at     TIMESTAMPTZ DEFAULT NOW(),
  headline         TEXT NOT NULL,
  source_name      TEXT NOT NULL,
  article_url      TEXT,
  event_category   TEXT,
  threat_level     TEXT,
  is_market_moving BOOLEAN DEFAULT FALSE,
  nse_tickers      TEXT[],
  sectors          TEXT[],
  companies        TEXT[],
  sentiment_score  DECIMAL(5,4),
  sentiment_label  TEXT,
  relevance_class  TEXT,
  event_type       TEXT,
  entity_sentiment JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_signals_hash ON india_news_signals (headline_hash);
CREATE INDEX idx_signals_scraped ON india_news_signals (scraped_at DESC);
CREATE INDEX idx_signals_market ON india_news_signals (is_market_moving, scraped_at DESC);
```

### New environment variables:
| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | Railway + `.env.local` | Railway PostgreSQL connection string (includes SSL) |
| `HF_API_TOKEN` | Railway + `.env.local` | HuggingFace Inference API key (FinBERT) |
| `UPSTASH_REDIS_REST_URL` | Already in Railway | Existing Upstash Redis (copy from Vercel env) |
| `UPSTASH_REDIS_REST_TOKEN` | Already in Railway | Existing Upstash Redis token |

### Pattern to follow (from seed-insights.mjs):
```javascript
// seed-india-signals.mjs follows exact same shape:
import { loadEnvFile, getRedisCredentials, runSeed } from './_seed-utils.mjs';
loadEnvFile(import.meta.url);

// 1. readDigestFromRedis() — reads news:digest:v1:india:en
// 2. processSignals(items) — filter → score → extract → return rows
// 3. persistToPostgres(rows) — batch INSERT with ON CONFLICT DO NOTHING
// 4. runSeed('india', 'signals', CANONICAL_KEY, fetchSignals, { ... })
```

### Intelligence pipeline logic:
```
For each item in India digest:
  1. checkMarketKeywords(title) → is_market_moving boolean
     (RBI, SEBI, NSE, BSE, earnings, merger, IPO, rate, inflation, GDP keywords)
  
  If is_market_moving:
  2. sha256(title) → headline_hash (deduplication)
  3. scoreWithFinBERT(title) → { label, score }
     → POST https://api-inference.huggingface.co/models/ProsusAI/finbert
     → { label: "positive"|"negative"|"neutral", score: 0.0–1.0 }
     → convert: positive → +score, negative → -score, neutral → 0.0
  4. extractCompanies(title) → string[] (Nifty 50 keyword match)
  5. detectSectors(title) → string[] (banking, tech, infra, pharma, energy)
  6. INSERT INTO india_news_signals (...) ON CONFLICT (headline_hash) DO NOTHING
```

### Verification:
```bash
npm run typecheck         # 0 errors (script is plain JS — no typecheck needed)
node scripts/seed-india-signals.mjs   # Run manually
# Check Railway PostgreSQL: SELECT COUNT(*) FROM india_news_signals;
# Expect: rows appearing within first run
# Expect: digest response time unchanged (fire-and-forget confirmed)
```

### Success criteria:
- [ ] Railway project exists with PostgreSQL service running
- [ ] `india_news_signals` table created with all indexes
- [ ] `seed-india-signals.mjs` runs without error on manual execution
- [ ] At least one row in PostgreSQL after first run
- [ ] `ON CONFLICT DO NOTHING` confirmed (run twice, row count doesn't double)
- [ ] Railway cron configured at same interval as digest (10 minutes)
- [ ] `list-feed-digest.ts` is UNCHANGED (verify with git diff)
- [ ] `seed-insights.mjs` is UNCHANGED (verify with git diff)

---

## Task V2-002 — Enrich Summary with Intelligence Signals

**Goal:** Extend the existing India ✨ click (single Groq call) to return 6 intelligence fields
instead of 2. Fire-and-forget push to Redis enrich queue; Railway cron drains queue and UPDATEs
PostgreSQL rows with Groq's richer extraction — upgrading FinBERT-only scored rows.

**Depends on:** Task V2-001 (PostgreSQL must exist)
**Estimated time:** 2–3 hours
**Task file:** `ai_docs/tasks/V2-002_enrich_summary_intelligence.md`
**V2**

### Architecture decision (2026-05-08):
Original spec described a separate "What It Means →" button that fetched full article HTML.
Revised: extend the EXISTING ✨ Groq call to return all 6 fields in ONE API call — no second
button, no article scraping, no extra latency. The `meaning` field already answers "what it means."

`api/news/v1/[rpc].ts` sets `runtime: 'edge'` — pg (Node.js) is unavailable in the edge handler.
Fire-and-forget uses Upstash REST HTTP (RPUSH to queue). Railway cron processes the queue.

### What this task does:
- Extends India `brief` Groq prompt to return 6 fields: `summary`, `meaning`, `sentiment`,
  `sentiment_score`, `companies_mentioned`, `event_type`
- Updates `TwoSummaryResult` interface and `parseTwoSummaryResponse()` in `_shared.ts`
- `summarize-article.ts`: encodes all 6 fields in response JSON; fire-and-forget RPUSH to
  `news:enrich-queue:v1` via Upstash REST (edge-runtime compatible)
- `seed-india-signals.mjs`: drains `news:enrich-queue:v1` at cron start; PostgreSQL UPDATE
  sets `sentiment_model = 'groq-v2'` on enriched rows

### Files to touch:
```
server/worldmonitor/news/v1/_shared.ts            — extend prompt + TwoSummaryResult + parser
server/worldmonitor/news/v1/summarize-article.ts  — pushEnrichmentQueue (fire-and-forget)
scripts/seed-india-signals.mjs                    — drainEnrichQueue at top of fetchSignals()
```

### Groq response shape (6 fields, same call as existing ✨):
```json
{
  "summary": "2–3 sentences. What happened, where, when.",
  "meaning": "2–3 sentences. What this means for people in India right now.",
  "sentiment": "positive | negative | neutral",
  "sentiment_score": -0.72,
  "companies_mentioned": ["HDFC Bank", "Reliance"],
  "event_type": "earnings | regulation | policy | merger | macro | management | other"
}
```

### Key constraints:
- `api/news/v1/[rpc].ts` is `runtime: 'edge'` — never use `pg` or Node.js built-ins in server handlers
- `pushEnrichmentQueue` must be fire-and-forget (`.catch(() => {})`) — never blocks user response
- SHA-256 in edge runtime: use `crypto.subtle.digest` (Web Crypto API), not `node:crypto`
- `fetch` in edge runtime: `(...args) => globalThis.fetch(...args)` pattern (already in codebase)
- PostgreSQL UPDATE is `WHERE headline_hash = $5` — no-op if row absent (celebrity stories)
- Proto extension NOT needed — all fields carried in existing `summary` JSON string

---

## Task V2-003 — Related Stories on Story Detail

**Goal:** Show 2–3 related story headlines below the story summary in the story detail panel, using keyword overlap (Jaccard similarity, no ML).

**Depends on:** Task V2-000
**Estimated time:** 3–4 hours
**V2**

### What this task does:
- Computes keyword overlap between the current story and all other digest items at render time
- Shows 2–3 related story cards with headline + source only (no summary)
- Jaccard threshold: 0.15–0.35 (tuned to avoid showing duplicates, catch genuine relations)
- Pure client-side: no new API call, uses already-loaded digest items

### Files to touch:
```
src/components/NewsPanel.ts (or story detail component)  — add related stories section
src/styles/main.css                                       — related story card styles
```

### Pattern:
```typescript
// Reuse existing Jaccard/clustering logic already in the codebase
// Do NOT write a new clustering implementation
// Read _clustering.mjs to understand the existing Jaccard approach
```

---

## Task V2-004 — Feedback Buttons (👍👎)

**Goal:** Add thumbs up/down on each story card; store votes to Railway PostgreSQL to build a source credibility index over time.

**Depends on:** Task V2-001 (PostgreSQL must exist)
**Estimated time:** 3–5 hours
**V2**

### What this task does:
- Adds 👍 / 👎 buttons to story card UI (below the card, small, 44px touch target)
- New Vercel function `api/feedback.js` — accepts `{ headline_hash, vote: 1 | -1, source_name }`
- New Railway PostgreSQL table `article_feedback`
- localStorage tracks what the user already voted (prevents duplicate votes, no auth needed)
- Buttons show muted counts after voting

### Files to touch:
```
api/feedback.js                   — NEW Vercel edge function (plain JS)
src/components/NewsPanel.ts       — add feedback button UI
src/styles/main.css               — button styles (use --sn-* variables)
```

### New PostgreSQL table:
```sql
CREATE TABLE article_feedback (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_hash  TEXT NOT NULL,
  source_name    TEXT NOT NULL,
  vote           SMALLINT NOT NULL CHECK (vote IN (1, -1)),
  voted_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_feedback_source ON article_feedback (source_name, voted_at DESC);
```

### Key constraint:
No auth required. No user accounts. Votes are anonymous. localStorage prevents re-voting from same device. This is a credibility signal over aggregates, not per-user tracking.

---

## Task V2-005 — RSSHub on Railway (Government Sources)

**Goal:** Deploy RSSHub on Railway to expose PIB, MEA, MHA, and NDMA press releases as RSS feeds; wire them into the India digest.

**Depends on:** Task V2-001 (Railway project already exists — add RSSHub to same project)
**Estimated time:** 4–6 hours
**V2**

### What this task does:
- Deploys RSSHub Docker container as a new Railway service in existing project
- Adds 4 government source feeds to `server/worldmonitor/news/v1/_feeds.ts` India section
- Adds government domains to `shared/rss-allowed-domains.json` AND `api/_rss-allowed-domains.js`
- Configures Railway service URL as `RSSHUB_BASE_URL` env var

### Files to touch:
```
server/worldmonitor/news/v1/_feeds.ts          — add PIB, MEA, MHA, NDMA feed entries
shared/rss-allowed-domains.json                — add government domains
api/_rss-allowed-domains.js                   — sync copy (ESM)
```

### Government feeds to add:
```
PIB (Press Information Bureau)  — pib.gov.in
MEA (Ministry of External Affairs) — mea.gov.in
MHA (Ministry of Home Affairs)  — mha.gov.in
NDMA (National Disaster Management) — ndma.gov.in
```

### Key constraint:
Three-file allowlist rule applies. `shared/rss-allowed-domains.json` is source of truth. `api/_rss-allowed-domains.js` is the ESM copy. Never edit `rss-proxy.js` or `ais-relay.cjs` directly for allowlist changes.

---

## Task V2-006 — New Stories Pill on Timeline

**Goal:** Show a green "N new stories" pill on the timeline when background refresh finds new clusters since the user last loaded the page.

**Depends on:** Task V2-000
**Estimated time:** 2–3 hours
**V2**

### What this task does:
- Tracks seen story IDs in `sessionStorage` on page load
- Background refresh (existing 10-minute digest poll) compares new digest items against sessionStorage
- If new clusters found: render green pill "3 new stories" at top of timeline
- User clicks pill → page scrolls to newest items, pill dismisses
- No backend needed — pure frontend

### Files to touch:
```
src/components/TimelinePanel.ts (or timeline component)  — add pill logic
src/styles/main.css                                       — pill styles (--sn-purple, 44px)
```

---

## Task V2-007 — Hindi Language Support

**Goal:** Add Hindi (hi) locale so users can switch UI labels to Hindi; headlines remain in English.

**Depends on:** Task V2-000
**Estimated time:** 3–4 hours
**V2**

### What this task does:
- Creates `public/locales/hi/translation.json` (or `src/locales/hi.json` — check i18next config)
- Translates all UI labels (panel names, button text, state names, category labels)
- Headlines, summaries, and article content remain in English
- Adds Hindi toggle to settings panel
- Persists language choice in localStorage

### Files to touch:
```
public/locales/hi/translation.json     — NEW locale file (check exact path from i18next config)
src/components/SettingsPanel.ts        — add language toggle
src/styles/main.css                    — RTL/Devanagari font-size adjustments if needed
```

### Key note:
i18next is already installed in V1. Confirm the exact locale file path by checking the existing English locale file first. Do not assume a path — read the i18next config.

---

## Task V2-008 — WhatsApp Daily Brief

**Goal:** Automated 7am digest sent via WhatsApp Business API; users opt in by submitting their phone number — no account required.

**Depends on:** Task V2-001 (PostgreSQL must exist for subscriber storage)
**Estimated time:** 5–8 hours
**V2**

### What this task does:
- New Vercel function `api/whatsapp-subscribe.js` — accepts `{ phone }`, validates, INSERTs to PostgreSQL
- New Railway PostgreSQL table `whatsapp_subscribers`
- New Railway cron script `scripts/seed-whatsapp-brief.mjs` — runs at 7am IST
  - Reads today's top 5 stories from `news:insights:v1` (already in Redis from seed-insights)
  - Formats a concise brief (5 headlines + 1 summary sentence)
  - Sends via Twilio WhatsApp API or WABA
- Opt-in UI: small phone input in settings panel or dedicated subscribe card

### Files to touch:
```
api/whatsapp-subscribe.js              — NEW Vercel function (plain JS)
scripts/seed-whatsapp-brief.mjs       — NEW Railway cron script
src/components/SettingsPanel.ts        — add opt-in UI
src/styles/main.css                    — subscribe form styles
```

### New PostgreSQL table:
```sql
CREATE TABLE whatsapp_subscribers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        TEXT UNIQUE NOT NULL,
  subscribed   BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ
);
```

### New environment variables:
| Variable | Where | Purpose |
|----------|-------|---------|
| `TWILIO_ACCOUNT_SID` | Railway + Vercel | Twilio account |
| `TWILIO_AUTH_TOKEN` | Railway + Vercel | Twilio auth |
| `TWILIO_WHATSAPP_FROM` | Railway + Vercel | WhatsApp sender number |

### Key constraint:
Phone number validation is mandatory before INSERT. Reject numbers that are not valid E.164 format. Rate-limit `api/whatsapp-subscribe.js` to prevent abuse (use existing `api/_rate-limit.js` pattern).

---

## Task V2-009 — State Liveability Score

**Goal:** Show a 4-bar score (Safety · Governance · Infrastructure · Economy) for each Indian state in the state selector or a dedicated state detail view.

**Depends on:** Task V2-000
**Estimated time:** 6–10 hours
**V2**

### BLOCKED — Architect Gate Required

**Daniel must define the following before the task file is generated:**
1. Data sources for each of the 4 components (NCRB, Cloudflare, startup signals — exact APIs/files)
2. Weight definitions per component (how much each sub-indicator contributes)
3. Update frequency (static annual, or live)
4. Where the scores display (state selector tooltip? Dedicated panel? Map overlay?)
5. Confirm: 4 bars per state — NO single reductive composite number

Do not generate the task file until these decisions are locked in writing.

### What this task does (once unblocked):
- Defines static score data in `src/config/state-scores.ts`
- Adds 4-bar score UI to state selector or state detail
- No external API calls in V2 — scores are manually curated from annual datasets
- Dynamic scoring from live APIs is V3

---

## Task V2-010 — Landing Page

**Goal:** Marketing page at sachnetra.in/ (or sachnetra.com/); app moves to /app.

**Depends on:** Task V2-000 (and real usage data — do not build until you have numbers)
**Estimated time:** 4–6 hours
**V2**

### Build trigger:
Do not start this task until you have at least 30 days of real user activity data from V2-001 through V2-005. The landing page copy must reference real numbers (signals collected, sources tracked, users reached).

### What this task does:
- `landing/index.html` — plain HTML/CSS/JS, no Vite bundle, no framework
- App moves to `/app` route in `vercel.json`
- Landing page: hero ("See India clearly"), features, open source CTA, subscribe form
- OG image, favicon, meta tags for sharing

### Files to touch:
```
landing/index.html                     — NEW plain HTML file
landing/style.css                      — NEW plain CSS (no --sn-* vars, standalone)
vercel.json                            — update routing: / → landing, /app → Vite SPA
```

### Key constraint:
Landing page must NOT import the Vite JS bundle. Plain HTML/CSS/JS only. No Preact, no TypeScript. The app (Vite bundle) only loads at `/app`.

---

## Time Summary

| Task | Estimate | Category |
|------|----------|----------|
| V2-000 Bootstrap | 1–2 h | Setup |
| V2-001 Railway + Data Foundation | 4–6 h | Infrastructure |
| V2-002 Enrich Summary | 2–3 h | Intelligence |
| V2-003 Related Stories | 3–4 h | Feature |
| V2-004 Feedback Buttons | 3–5 h | Feature |
| V2-005 RSSHub Government Sources | 4–6 h | Infrastructure |
| V2-006 New Stories Pill | 2–3 h | Feature |
| V2-007 Hindi Language | 3–4 h | Feature |
| V2-008 WhatsApp Brief | 5–8 h | Feature |
| V2-009 State Liveability (BLOCKED) | 6–10 h | Feature |
| V2-010 Landing Page | 4–6 h | Marketing |
| **Total** | **37–57 h** | |

**Expected actual time (V1 precedent):** 60–100 hours across 6–10 weeks part-time.

---

## V2 Scope Guard

Stop and tell Daniel if any task pulls toward these:

```
❌ Graph database, knowledge graph (V3)
❌ IndiaSignal B2B product (V3 — build data first, productise later)
❌ LAC/LOC or LWE map layers (legal review required first)
❌ Indian military bases on map
❌ Communal incident tracker (human review pipeline required)
❌ Firecrawl scraping
❌ Election monitor
❌ GoOut Hyderabad (removed from V2)
❌ Modifying src/config/variants/full.ts, tech.ts, or finance.ts (sacred, always)
❌ Modifying scripts/seed-insights.mjs for V2 intelligence work
```

**In scope for V2:**
```
✅ V2-000 — Bootstrap & rules update
✅ V2-001 — Railway PostgreSQL + seed-india-signals.mjs
✅ V2-002 — Enrich Groq summary with intelligence fields
✅ V2-003 — Related stories (keyword overlap)
✅ V2-004 — Feedback buttons (👍👎)
✅ V2-005 — RSSHub on Railway (PIB, MEA, MHA, NDMA)
✅ V2-006 — New stories pill
✅ V2-007 — Hindi language
✅ V2-008 — WhatsApp daily brief
✅ V2-009 — State liveability score (BLOCKED pending architect gate)
✅ V2-010 — Landing page (BLOCKED pending usage data)
```

---

## V3 Backlog (Not Tasked)

```
V3-001 — IndiaSignal B2B API (entity sentiment endpoint)
V3-002 — Corporate filing intelligence (NSE/BSE PDF OCR pipeline)
V3-003 — Xenova/FinBERT on Railway (replace HuggingFace API dependency)
V3-004 — pgvector embeddings + semantic search
V3-005 — Article clustering in PostgreSQL (beyond Jaccard)
V3-006 — Source credibility scoring (aggregated feedback → trust index)
V3-007 — Backtesting dashboard (entity_sentiment_timeseries view)
V3-008 — Hindi RSS feeds (vernacular sentiment advantage)
V3-009 — Push notifications (Web Push API)
V3-010 — Tender & Scheme Alerts (GeM API, paid feature)
V3-011 — Hyderabad city dashboard
```

---

## How to Start V2

```
Step 1 — Generate task file
  Use /task or open: ai_docs/dev_templates/adapt_sprint_task.md
  Say: "Generate the task file for Task V2-000"

Step 2 — Review and approve
  Daniel reviews before any code runs.
  Say "proceed" to execute.

Step 3 — Verify
  npm run typecheck    # 0 errors
  npm run lint         # Biome — must pass

Step 4 — Next task
  Do not start V2-001 until V2-000 completion log is signed off.
```
