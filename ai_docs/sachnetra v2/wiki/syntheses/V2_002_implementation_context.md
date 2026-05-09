---
tags: [sachnetra_v2, implementation, groq, redis, readability, on_demand_summary, intelligence]
source: [[V2_roadmap]], [[V2_001_implementation_context]], [[sachnetra_sentiment_architecture]]
last_updated: 2026-05-08
---
# V2-002 Implementation Context — Enrich Summary with Intelligence Signals

**TL;DR:** This document captures every decision, pattern, legal basis, prompt design, and code constraint needed to implement Task V2-002. It covers two tightly linked features: (1) enriching the existing cluster summary with all-source headlines, and (2) the on-demand "What It Means" deep analysis button. Read this BEFORE writing any code.

---

## 1. Why This Task Exists

### 1.1 The Problem with the Current Summary

V1 generates cluster summaries using a **single article's RSS description** from a cluster of 8+ sources. The other 7 sources are ignored. The summary therefore reflects one editorial angle instead of the ground truth.

**The fix (Cluster Summary Upgrade):** Send ALL cluster headlines to Groq together. More sources → more facts → more accurate summary. No additional data fetching needed — headlines are already in the digest.

### 1.2 The "What It Means" Gap

The existing ✨ summary answers *what happened*. It does not answer *so what?* — what does this story mean for ordinary Indians, which companies are affected, what might happen next.

**The fix:** An on-demand deep analysis triggered by user click. The agent fetches the full article text via Readability, sends it to Groq with a structured prompt, and returns a rich 6-field JSON analysis. Cached in Redis after the first hit — subsequent users get instant responses.

### 1.3 The Intelligence Enrichment Loop

When a user requests "What It Means," Groq returns structured metadata (sentiment, companies mentioned, event type). This data is richer than what FinBERT produces from the headline alone. A **fire-and-forget UPDATE** writes these richer fields back into `india_news_signals` — the same PostgreSQL row V2-001 created from the headline. The user never waits for this. If it fails, the summary still returns successfully.

---

## 2. Legal Basis — On-Demand Fetch Is Clean

This is **legally clean** under transformative use doctrine. The implementation mirrors Safari Reader Mode, Google Assistant, and Pocket:

| What we do | Why it's safe |
|------------|---------------|
| Fetch article URL only on user click | User-initiated, not bulk automated scraping |
| Read full text once, in memory only | Never stored; discarded after summarisation |
| Store ONLY the Groq-generated summary | Transformative use — summary ≠ reproduction |
| Always link back to original article | Attribution preserved |
| Redis cache stores summary, not article | No redistribution of original content |

**One-line rule:** Fetch → summarise → cache summary → discard article text. Never touch the original again.

---

## 3. Two Features, One Task

### Feature A — Cluster Summary Upgrade (Low effort, high impact)

Replace single-article summary prompt with a multi-headline prompt. No new API call. No new edge function. Change is localised to `_shared.ts`.

**Before:**
```
Summarise this article: [one RSS description]
```

**After:**
```
[Economic Times]: RBI raises repo rate 25bps, third hike this year
[The Hindu]: Reserve Bank increases key rate; EMIs set to rise
[Mint]: RBI MPC hikes rates unanimously; inflation still above target
[NDTV]: Home loan borrowers to feel pinch as RBI raises rates

These are 4 Indian news sources covering the same story.

What happened: (2 sentences, factual, synthesised from all sources)
Key detail: (one specific number or fact)
```

### Feature B — "What It Means" On-Demand Analysis (Medium effort, high value)

New Vercel edge function. User taps button → fetch article → Groq → Redis cache → return.

**Flow:**
```
User clicks "What it means →"
    ↓
POST /api/summarize-article { url, headline }
    ↓
Check Redis: article:summary:{sha256(url)}
    ↓ (cache miss)
Fetch article HTML (with timeout + User-Agent)
    ↓
Extract clean text via Readability / cheerio
    ↓
Send to Groq with structured prompt
    ↓
Parse JSON response
    ↓
Cache summary in Redis (TTL 24h) — NOT the article
    ↓
Fire-and-forget UPDATE india_news_signals (PostgreSQL)
    ↓
Return summary to user
```

---

## 4. The Groq Prompt (Locked Design)

### 4.1 Cluster Summary Prompt (Feature A)

```typescript
const clusterHeadlines = cluster.items.map(item =>
  `[${item.source}]: ${item.title}`
).join('\n');

const prompt = `
${clusterHeadlines}

These are ${cluster.items.length} Indian news sources covering the same story.

Respond in this exact JSON format:
{
  "what_happened": "2 sentences, factual, synthesised from all sources above",
  "key_detail": "one specific number, name, or fact from the headlines"
}

Rules: Be factual. No opinion. Combine facts from all sources. Plain language only.
`.trim();
```

### 4.2 "What It Means" Prompt (Feature B)

```typescript
const prompt = `
You are an Indian news analyst. A user wants to understand the real-world impact of this story.

Article text:
${articleText}

Respond in this exact JSON format:
{
  "what_happened": "2-3 sentences summarising the core facts",
  "what_it_means": "2-3 sentences on practical impact for ordinary Indians",
  "affected_sectors": ["banking", "real_estate"],
  "companies_mentioned": ["HDFC Bank", "LIC Housing Finance"],
  "sentiment": "positive | negative | neutral",
  "sentiment_score": -0.72,
  "event_type": "regulation | earnings | merger | policy | macro | management | other"
}

Rules:
- Use numbers when available (percentages, rupees, basis points)
- Plain language only — no jargon without explanation
- sentiment_score: +1.0 (very positive) to -1.0 (very negative)
- If unsure about a field, use null — never fabricate
`.trim();
```

### 4.3 Prompt Constraints

- Model: `llama-3.1-8b-instant` (Groq) — fast, cheap, sufficient for news analysis
- Temperature: 0.1 — deterministic, factual
- Max tokens: 400 — enforces brevity
- Response format: JSON only (`response_format: { type: 'json_object' }`)
- If Groq returns invalid JSON: return a graceful error to the user, do NOT crash

---

## 5. Architecture: What Changes Where

### 5.1 Server Layer Changes (`server/worldmonitor/news/v1/_shared.ts`)

**Feature A only touches this file.** The cluster prompt upgrade is entirely here.

Changes:
1. `buildClusterSummaryPrompt(items: ParsedItem[])` — new helper that takes all cluster items, formats the multi-headline string, returns the prompt
2. Replace the existing single-article prompt call with `buildClusterSummaryPrompt(cluster.items)`
3. `parseTwoSummaryResponse()` — add parsing for the 4 new intelligence fields returned by Feature B's prompt (`sentiment`, `sentiment_score`, `companies_mentioned`, `event_type`)

### 5.2 New Vercel Edge Function (`api/summarize-article.js`)

Feature B lives here. Plain JS only (Edge Function constraint — no TypeScript, no `../src/` imports).

```javascript
// api/summarize-article.js
import { corsHeaders } from './_cors.js';
import { rateLimit } from './_rate-limit.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // 1. CORS + rate limit
  // 2. Parse { url, headline } from request body
  // 3. Check Redis cache: article:summary:{sha256(url)}
  // 4. Cache hit → return immediately
  // 5. Cache miss → fetch article → extract text → Groq → parse → cache → return
  // 6. Fire-and-forget PostgreSQL UPDATE (do NOT await)
}
```

**Key edge function constraints (from AGENTS.md):**
- Plain JS only — no TypeScript
- Cannot import from `../src/` or `../server/` (different runtime)
- Only same-directory `_*.js` helpers and npm packages
- Always include `User-Agent` header in server-side fetch calls
- Use `(...args) => globalThis.fetch(...args)` — `fetch.bind(globalThis)` is BANNED

### 5.3 PostgreSQL Fire-and-Forget UPDATE

After returning the summary, update the PostgreSQL row if it exists. This enriches FinBERT-scored rows with Groq's richer extraction:

```javascript
// Fire-and-forget — never awaited, never blocks user response
updateSignalRecord({
  headlineHash: sha256(headline),
  sentimentLabel: parsed.sentiment,
  sentimentScore: parsed.sentiment_score,
  companiesMentioned: parsed.companies_mentioned,
  eventType: parsed.event_type,
}).catch(err => console.error('PG update failed (non-fatal):', err.message));
```

The UPDATE uses `headline_hash` as the lookup key. If no matching row exists (article wasn't market-moving, or V2-001 hasn't processed it yet), the UPDATE silently no-ops — this is correct behaviour.

### 5.4 Frontend Changes (`src/components/NewsPanel.ts`)

- Article card already shows RSS-based quick summary on click (unchanged)
- Add "What it means →" button below the existing summary
- On click: POST to `/api/summarize-article`, show loading state, render response
- Button state: loading → result → retry on error
- Cache hint: if the same article is clicked again in the same session, skip the API call and show the cached result (stored in memory/sessionStorage)

---

## 6. Redis Caching Strategy

| Key pattern | TTL | Content |
|------------|-----|---------|
| `article:summary:{sha256(url)}` | 24h | Full Groq JSON response |
| `article:cluster:{clusterHash}` | 6h | Multi-source cluster summary |

**What is cached:** Only the Groq-generated summary object. Never the article HTML. Never the article text. The Redis entry is a JSON blob of our own words.

**Cache key:** SHA-256 of the article URL (not the headline — URLs are stable, headlines sometimes vary between sources for the same story).

**Cache hit path:** Check Redis first. If hit, return immediately without calling Groq or fetching the article. Most users who click "What it means" on a popular story will hit cache.

---

## 7. Article Fetching — Constraints and Safeguards

### 7.1 Fetch Constraints

```javascript
const response = await fetch(articleUrl, {
  headers: {
    'User-Agent': 'SachNetra/2.0 (+https://sachnetra.in)',
    'Accept': 'text/html,application/xhtml+xml',
  },
  signal: AbortSignal.timeout(8000), // 8s max — edge function has 10s limit
});
```

- Timeout: 8 seconds (Vercel Edge Functions have a 10s wall clock limit — leave buffer)
- User-Agent: always include (required by AGENTS.md for all server-side fetches)
- Only `text/html` — do not attempt to fetch PDFs or other MIME types
- If fetch fails (timeout, 403, 404, etc.): return a graceful error JSON, do not crash

### 7.2 Text Extraction

Use `cheerio` (already in package.json via other Edge Functions) to extract the article body:

```javascript
// Preferred approach: strip nav/header/footer/ads, extract article body
// Do NOT use firecrawl — explicitly banned in V2 scope guard
const $ = cheerio.load(html);
$('nav, header, footer, aside, script, style, .ad, .advertisement').remove();
const articleText = $('article, [role="main"], .article-body, main').text().trim();
```

**Text length cap:** Truncate at 4000 characters before sending to Groq. Most news articles are 600–800 words. 4000 chars covers all of them without hitting token limits.

---

## 8. Files To Touch

### 8.1 Feature A — Cluster Summary Upgrade

```
server/worldmonitor/news/v1/_shared.ts    — extend prompt, add buildClusterSummaryPrompt()
```

### 8.2 Feature B — "What It Means" Button

```
api/summarize-article.js                  — NEW Vercel edge function (plain JS)
src/components/NewsPanel.ts               — add "What it means →" button + loading state
src/styles/main.css                       — button styles using --sn-* variables
```

### 8.3 Optional (if proto fields are extended)

```
proto/worldmonitor/news/v1/summarize_article.proto  — add new response fields
src/generated/...                                    — regenerated (make generate)
```

> **Prefer adding fields to the existing untyped response object first.** Only extend the proto if the new fields are needed by the TypeScript type system. Avoid `make generate` unless necessary — it touches generated code.

---

## 9. Files That Must NEVER Be Modified

```
scripts/seed-insights.mjs             — sacred
scripts/_seed-utils.mjs               — sacred
src/config/variants/full.ts           — sacred
src/config/variants/tech.ts           — sacred
src/config/variants/finance.ts        — sacred
server/worldmonitor/news/v1/_feeds.ts — do not touch for V2-002
```

---

## 10. Environment Variables

No new environment variables required. All needed keys already exist:

| Variable | Status | Used for |
|----------|--------|---------|
| `GROQ_API_KEY` | Already in Vercel + Railway | Groq API calls |
| `UPSTASH_REDIS_REST_URL` | Already in Vercel | Redis cache reads/writes |
| `UPSTASH_REDIS_REST_TOKEN` | Already in Vercel | Redis auth |
| `DATABASE_URL` | Added in V2-001 | PostgreSQL UPDATE (fire-and-forget) |

---

## 11. UI Design Constraints

### 11.1 Button Placement

```
┌─────────────────────────────────────────┐
│ [Source] Headline text here             │
│                                         │
│ Quick summary (RSS-based, existing)...  │
│                                         │
│ [What it means →]   [👍] [👎]           │
└─────────────────────────────────────────┘
```

- `[What it means →]` is a text button, not an icon — clarity over cleverness
- Minimum touch target: 44px height (Apple HIG standard — already in the V1 design system)
- Use `--sn-purple` accent colour (check `src/styles/main.css` for exact token name)
- Loading state: spinner or "Thinking..." text inline — do not disable the card

### 11.2 Loading State

```typescript
// State machine: idle → loading → success | error
// idle: button visible
// loading: "Thinking..." + spinner, button disabled
// success: render what_happened + what_it_means sections
// error: "Could not analyse this article. Try again."
```

### 11.3 The Result Display

After "What It Means" returns:

```
What happened
RBI raised the repo rate by 25 basis points to 6.75%, the third consecutive hike 
this year. The decision was unanimous among MPC members.

What it means for you
Home loan EMIs will rise within 30 days as banks pass on the rate hike. 
HDFC Bank and SBI are expected to announce revised rates this week. 
Fixed deposit holders benefit — bank FD rates will likely cross 8%.

Affected: Banking · Real Estate
```

No raw JSON shown to users. Parse and render the structured fields.

---

## 12. Verification Checklist

```bash
# Feature A — Cluster summary
# Trigger a story card click → check that summary now references multiple sources
# Check Groq prompt in network tab or server logs — should show multiple [Source]: Headline lines

# Feature B — "What It Means"
# Click "What it means →" on any article card
# First click: should take 3-8 seconds (live fetch + Groq)
# Second click on same article: should return instantly (Redis cache hit)

# PostgreSQL update
# After a "What it means" click, query:
# SELECT sentiment_label, companies, event_type FROM india_news_signals 
# WHERE headline_hash = sha256(headline);
# Should show richer values than FinBERT-only run

# Edge function constraints
npm run typecheck:api        # 0 errors
# Check: api/summarize-article.js has no ../src/ imports

# Sacred files unchanged
git diff scripts/seed-insights.mjs          # Must show: nothing
git diff src/config/variants/               # Must show: nothing
```

---

## 13. What V2-002 Does NOT Include

- ❌ Source credibility score display (V3-006)
- ❌ Feedback buttons (V2-004 — separate task)
- ❌ Related stories section (V2-003 — separate task)
- ❌ Sentence-level entity-aware sentiment (V3 — full NLP pipeline)
- ❌ Article storage of any kind (legally and architecturally out of scope forever)
- ❌ Firecrawl (explicitly banned in V2 scope guard)
- ❌ Bulk pre-processing of articles (user-initiated only)

---

## 14. The Bigger Picture

V2-002 is the user-facing proof that the intelligence pipeline is real.

V2-001 built the silent engine. V2-002 puts a button on it.

When a user clicks "What it means" on an RBI rate hike story and reads *"Home loan EMIs will rise within 30 days — HDFC Bank and SBI expected to revise rates this week"* — that is the product. That is why SachNetra exists.

The PostgreSQL enrichment loop means every user click also sharpens the dataset. Articles that users care enough to deep-read get richer signal records. Over 6 months, `companies_mentioned` and `event_type` from Groq will significantly outperform FinBERT headline extraction alone.

## Linked Nodes
- [[V2_001_implementation_context]]
- [[sachnetra_sentiment_architecture]]
- [[sachnetra_quant_pivot]]
- [[sachnetra_db_schema]]

### Current Flow (What V2-001 built)                                                                                                                                                                                              
  Every 10 min (Railway cron)                                                                                   
    → reads news:digest:v1:india:en from Redis
    → for each headline: if isMarketMoving(title) → FinBERT score → INSERT to india_news_signals

  User clicks ✨ on a story card
    → Groq call with all cluster headlines → returns { summary, meaning }
    → cached in Redis for 24h
    → user sees "what happened" + "what it means"

  ---
  Your Questions — Answers

  1. "Why call Groq twice? Can't we do it on the first click?"

  You're right. The simpler design is better.

  The V2_002_implementation_context.md describes an ambitious version with a separate "What It Means →" button  
  that fetches the full article text. But looking at the actual CLAUDE.md task definition for V2-002, the core  
  ask is just:

  ▎ Extend the Groq prompt to return 4 new JSON fields + fire-and-forget PostgreSQL UPDATE

  We already call Groq on the first ✨ click and it returns { summary, meaning }. We just need to extend that   
  SAME call to also return:

  {
    "summary": "...",
    "meaning": "...",
    "sentiment": "positive | negative | neutral",
    "sentiment_score": -0.72,
    "companies_mentioned": ["HDFC Bank"],
    "event_type": "regulation"
  }

  One call. Six fields. The fire-and-forget PostgreSQL UPDATE runs after the response is sent. No second button.
   No article fetching. The meaning field already covers "what it means" — we don't need a separate deep        
  analysis button for this task.

  The article-fetching version can be a later V3 feature if the shallow analysis proves insufficient.

  2. "Can we classify categories during the cron and skip celebrity/sports for Groq?"

  Yes — this is the right architecture. Here's the problem it solves:

  When a user clicks ✨ on a Bollywood gossip story, we fire-and-forget a PostgreSQL UPDATE with Groq's
  extracted intelligence. But that UPDATE is only useful for market-relevant stories. Groq extracting
  companies_mentioned = [] and event_type = "other" from a celebrity story is a wasted enrichment.

  The solution is a skip_enrichment flag:

  During cron (V2-001 enhanced):
    → detect category (celebrity, sports, crime, market, politics, etc.)
    → isMarketMoving() already does this for market keywords
    → add skipCategories list to market-taxonomy.json
    → store category in DB OR just don't INSERT non-market rows at all (current behavior)

  On first click ✨:
    → if headline_hash NOT in india_news_signals → skip PostgreSQL UPDATE entirely
    → (row doesn't exist = wasn't market-moving → no enrichment needed)

  The beauty is: this is already handled. The cron only INSERTs is_market_moving = true rows. The
  fire-and-forget UPDATE in V2-002 uses headline_hash as the key — if no row exists (celebrity story), the      
  UPDATE no-ops silently. Zero wasted calls.

  What you might want to add is a skip_enrichment flag for stories that ARE market-moving but don't benefit from
   company/event extraction (e.g. macro stories about GDP). But that's optional.

  3. Smaller models — best practices

  ┌─────────────────────────────┬───────────────────────────┬──────────────────────────────────────────────┐    
  │            Task             │           Model           │                     Why                      │    
  ├─────────────────────────────┼───────────────────────────┼──────────────────────────────────────────────┤    
  │ Sentiment scoring (cron)    │ FinBERT via HuggingFace   │ Specialist financial model, very accurate    │    
  │                             │                           │ for news                                     │    
  ├─────────────────────────────┼───────────────────────────┼──────────────────────────────────────────────┤    
  │ Summary + intelligence (on  │ llama-3.1-8b-instant on   │ Already in use, fast, cheap, sufficient      │    
  │ click)                      │ Groq                      │                                              │    
  ├─────────────────────────────┼───────────────────────────┼──────────────────────────────────────────────┤    
  │ Category classification     │ No model — keyword regex  │ isMarketMoving() pattern already works       │    
  │                             │                           │ perfectly for this                           │    
  └─────────────────────────────┴───────────────────────────┴──────────────────────────────────────────────┘    

  You don't need a model for category filtering. A keyword list in market-taxonomy.json with skip_categories:   
  ["celebrity", "sports", "film", "cricket"] + regex match is faster, free, and more predictable.

  ---
  V2-003 and V2-004 Clarification

  V2-003 — Related Stories:
  - Pure client-side. No API call. No new backend.
  - Uses the Jaccard similarity logic already in _clustering.mjs (that's how clusters are formed)
  - Shows 2–3 related headlines below the story detail — just headlines + source, no summary
  - Simplest task in the V2 backlog after V2-002

  V2-004 — Feedback Buttons (👍👎):
  - Adds thumbs up/down on story cards
  - New api/feedback.js Vercel edge function (plain JS, same pattern as other api/ functions)
  - New PostgreSQL table article_feedback (separate from india_news_signals)
  - localStorage prevents duplicate votes from same device — no auth needed
  - The votes build a source credibility score over time (the data asset, not V2 UI)
  - Independent of V2-002 and V2-003 — can be done in any order

  ---
  Recommended V2-002 Scope (Revised from Original Spec)

  The simpler, better V2-002:

  Phase 1 — Extend India prompt (_shared.ts)
  - Add 4 new fields to the existing JSON: sentiment, sentiment_score, companies_mentioned, event_type
  - Update parseTwoSummaryResponse() + TwoSummaryResult interface to include them

  Phase 2 — Fire-and-forget PostgreSQL UPDATE (summarize-article.ts)
  - After returning summary, run UPDATE on india_news_signals WHERE headline_hash = sha256(headline)
  - Uses pg (already in package.json from V2-001)
  - Never awaited, never blocks user

  No new button. No article fetching. No second Groq call. No new edge function.

  ---
  Do you want me to proceed with creating the V2-002 task file using this revised, simpler scope? Or do you want
   to keep the "What It Means →" button concept (Feature B from the implementation context) for a later task?   

✻ Churned for 2m 4s                           

────────────────────────────────────────────────────────────────────────────────────────────────────────────────
❯ proceed with creating the V2-002 task file using this revised, simpler scope 
─────────────────────────────────────────────────────────────────────────────────────

###