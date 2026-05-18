---
tags: [sachnetra_v2, implementation, railway, postgresql, finbert, intelligence_pipeline]
source: [[V2_roadmap]], [[sachnetra_sentiment_architecture]], [[academic_validation_entity_sentiment]]
last_updated: 2026-05-07
---
# V2-001 Implementation Context — Railway Setup + Data Foundation

**TL;DR:** This document captures every architectural decision, academic validation, engineering standard, and code pattern needed to implement Task V2-001. It is the single source of truth for the implementing agent. Read this BEFORE writing any code.

---

## 1. Why This Task Exists

SachNetra V1 only generates sentiment data when a user clicks a story. With near-zero users, most articles pass through the digest unscored — **permanently lost data**. Every day without PostgreSQL storage is data that can never be recovered for backtesting.

V2-001 creates a **background intelligence pipeline** that runs every 10 minutes on Railway, independent of user activity. It reads the existing India news digest from Redis, filters for market-moving articles, scores them with FinBERT, and writes the results to PostgreSQL permanently.

**The sentence:** "SachNetra is the collection engine. The database is the asset. The quant system is the proof of value."

---

## 2. Academic Research Validation

Indian quant finance research papers validate every design decision below:

### 2.1 Entity-Aware Sentiment (Most Important Finding)
Article-level sentiment is **useless** for alpha generation. One article can be bullish for one company and bearish for another. Example:
- "RBI raises rates — good for deposits, bad for home loans"
- **Wrong:** `article.sentiment = 0.02` (neutral — useless)
- **Right:** `HDFCBANK.NS → +0.71`, `LICHSGFIN.NS → -0.68`

**V2-001 Compromise:** Score the full headline with FinBERT. Attach the same score to ALL mentioned tickers in the `entity_sentiment` JSONB column. True sentence-level entity-aware scoring is deferred to V3.

### 2.2 Relevance Classes (Class A vs Class B)
- **Class A (Idiosyncratic):** Company-specific news. Affects only that stock. Example: "Tata Motors recalls 50,000 vehicles."
- **Class B (Systemic):** Market-wide news. Affects entire sector/market. Example: "RBI raises repo rate 25 basis points."

**Implementation rule:** If the article triggers a macro keyword (RBI, SEBI, GDP, budget), tag as `systemic`. If it only triggers a company name, tag as `idiosyncratic`. If it triggers both a sector keyword and company names, tag as `sector`.

### 2.3 Three-Timestamp Architecture
Backtesting requires strict chronological fidelity to avoid look-ahead bias:
1. `published_at` — when the news source released the article (from RSS `pubDate`)
2. `scraped_at` — when SachNetra's digest first saw the article (injected into Redis)
3. `processed_at` — when FinBERT finished scoring (PostgreSQL `DEFAULT NOW()`)

### 2.4 Event Types
News should be categorized: `earnings`, `regulation`, `merger`, `policy`, `management`, `macro`, `other`.

### 2.5 Entity Registry (Alias Mapping)
Indian companies have multiple names. Without a registry, entity extraction misses ~40% of mentions:
- "Hindustan Unilever" = "HUL" = "HINDUNILVR.NS"
- "Tata Consultancy" = "TCS" = "TCS.NS"
- "State Bank" = "SBI" = "SBIN.NS"

---

## 3. Four Non-Negotiable Engineering Standards

### 3.1 Timestamps — No Shortcuts
**Problem:** If the digest fetches at 10:00 but the seed script runs at 10:05, using `new Date()` makes `scraped_at` permanently 5 minutes late. In quant finance, 5 minutes is a lifetime.

**Solution:** Modify `list-feed-digest.ts` to inject `scrapedAt: Date.now()` into each `ParsedItem` right after RSS parsing. The seed script reads `item.scrapedAt` from Redis.

**Exact change to `list-feed-digest.ts`** (one field addition in `parseRssXml`, line ~181):
```typescript
// In parseRssXml(), inside items.push({...}):
items.push({
  source: feed.name,
  title,
  link,
  publishedAt,
  scrapedAt: Date.now(),  // ← ADD THIS LINE
  isAlert,
  level: threat.level,
  category: threat.category,
  confidence: threat.confidence,
  classSource: 'keyword',
});
```

Also add `scrapedAt: number;` to the `ParsedItem` interface (line ~52).

**This is the ONLY change to `list-feed-digest.ts`. Nothing else.**

### 3.2 Keyword Matching — Word Boundaries
**Problem:** `text.includes('ipo')` matches "l**ipo**suction" as market-moving.

**Solution:** Use regex with `\b` word boundaries:
```javascript
const marketRegex = new RegExp(`\\b(${MARKET_KEYWORDS.join('|')})\\b`, 'i');
return marketRegex.test(text);
```

**All keywords must live in `shared/market-taxonomy.json`**, not hardcoded in scripts. This makes the taxonomy auditable, versioned, and expandable by contributors without touching code.

### 3.3 Sentiment Fallback Chain — Three Levels
Never rely on a single model. Store which model was used for every scored article.

```
Level 1: HuggingFace FinBERT API (HF_API_TOKEN)
  ↓ on failure
Level 2: Railway Xenova FinBERT (@xenova/transformers, already in package.json)
  ↓ on failure  
Level 3: Groq llama-3.1-8b-instant (GROQ_API_KEY already exists)
  ↓ on failure
Dead Letter Queue (news:dlq:india_signals in Redis)
```

Each level uses exponential backoff: wait 2s, then 4s, then 8s before moving to next level.

**Store `sentiment_model TEXT` in PostgreSQL** — tracks which model scored each row. Enables accuracy comparison later.

### 3.4 Dead Letter Queue (DLQ) — Zero Data Loss
**Problem:** If HuggingFace rate-limits at 10:00, a fire-and-forget script silently loses 100 articles forever.

**Solution:** After all three fallback levels fail:
```javascript
await redis.lpush('news:dlq:india_signals', JSON.stringify({
  text,
  articleUrl,
  sourceName,
  scrapedAt,
  publishedAt,
  failed_at: Date.now(),
  reason: 'all_models_failed',
  attempts: 3
}));
```
Never crash the pipeline. Never silently discard failed articles.

---

## 4. Existing Codebase Patterns (READ ONLY — Never Modify These)

### 4.1 `scripts/seed-insights.mjs` — The Pattern to Copy
Every seed script follows the `runSeed()` shape:
```javascript
import { loadEnvFile, getRedisCredentials, runSeed } from './_seed-utils.mjs';
loadEnvFile(import.meta.url);

const CANONICAL_KEY = 'news:signals:v1:india';

async function fetchSignals() {
  // 1. Read digest from Redis
  // 2. Process articles
  // 3. Persist to PostgreSQL
  // 4. Return summary object
}

function validate(data) { return /* validation logic */; }

runSeed('india', 'signals', CANONICAL_KEY, fetchSignals, {
  validateFn: validate,
  ttlSeconds: 1800,
  sourceVersion: 'finbert-v1',
}).catch((err) => {
  console.error('FATAL:', err.message || err);
  process.exit(0); // Railway cron must ALWAYS exit 0
});
```

Key properties:
- `loadEnvFile(import.meta.url)` at the top
- `runSeed()` handles locking, retry, Redis publish, freshness metadata
- `.catch(() => process.exit(0))` — Railway cron must not crash non-zero

### 4.2 How Digest Items Are Shaped
The India digest lives at Redis key `news:digest:v1:india:en`. Its shape:
```json
{
  "categories": {
    "politics": { "items": [ParsedItem, ...] },
    "economic": { "items": [ParsedItem, ...] },
    ...
  },
  "feedStatuses": { "The Hindu": "ok", ... },
  "generatedAt": "2026-05-07T10:00:00.000Z"
}
```

Each `ParsedItem` has:
```typescript
{
  source: string;      // "The Hindu", "Economic Times"
  title: string;       // headline text
  link: string;        // article URL
  publishedAt: number; // epoch ms (from RSS pubDate)
  scrapedAt: number;   // epoch ms (ADDED BY US in V2-001)
  isAlert: boolean;
  level: ThreatLevel;
  category: string;    // from _classifier.ts
  confidence: number;
  classSource: 'keyword' | 'llm';
}
```

### 4.3 `_seed-utils.mjs` — Available Helpers
- `loadEnvFile(metaUrl)` — loads `.env.local`
- `getRedisCredentials()` — returns `{ url, token }` from env
- `runSeed(domain, resource, key, fetchFn, opts)` — orchestrates locking, retry, publish
- `withRetry(fn, maxRetries, delayMs)` — exponential backoff (already built!)
- `sleep(ms)` — promise-based delay

### 4.4 `_classifier.ts` — Existing Keyword Classification
Already uses regex with word boundaries via `getKeywordRegex()`. Already has Indian financial market keywords (nifty, sensex, share market, stock market, gst, epf). The seed script should reference this pattern but NOT import from it (TypeScript vs plain JS).

---

## 5. PostgreSQL Schema (DDL)

Run this on Railway PostgreSQL:
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
  sentiment_model  TEXT,
  relevance_class  TEXT,
  event_type       TEXT,
  entity_sentiment JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_signals_hash ON india_news_signals (headline_hash);
CREATE INDEX idx_signals_scraped ON india_news_signals (scraped_at DESC);
CREATE INDEX idx_signals_market ON india_news_signals (is_market_moving, scraped_at DESC);
```

**Note:** `sentiment_model TEXT` was added beyond the original roadmap DDL. It tracks which fallback model scored each row (`finbert-hf`, `finbert-railway`, or `groq-llama`).

---

## 6. Files To Create

### 6.1 `shared/market-taxonomy.json` — Keyword Registry
Contains: `market_keywords`, `nifty50_registry` (alias→ticker mapping), `sectors`, `event_types`. All keyword matching reads from this file. No hardcoded arrays in scripts.

### 6.2 `scripts/_india-market-keywords.mjs` — Extraction Functions
Imports `market-taxonomy.json`. Exports:
- `isMarketMoving(title)` — regex word-boundary check against market keywords
- `extractCompanies(title)` — returns `[{ name, ticker }]` from Nifty 50 registry
- `extractSectors(title)` — returns `string[]` of matched sectors
- `detectEventType(title)` — returns event type string
- `detectRelevanceClass(sectors, companies)` — returns `systemic | idiosyncratic | sector`

### 6.3 `scripts/_sentiment-chain.mjs` — Fallback Orchestrator
Exports `scoreWithFallbackChain(text, redis)`. Tries HuggingFace → Xenova → Groq → DLQ.

### 6.4 `scripts/seed-india-signals.mjs` — Main Pipeline
Follows `runSeed()` pattern exactly. Reads digest → filters → scores → inserts to PostgreSQL.

---

## 7. Files To Modify

### 7.1 `server/worldmonitor/news/v1/list-feed-digest.ts`
**Minimal change.** Two additions only:
1. Add `scrapedAt: number;` to `ParsedItem` interface
2. Add `scrapedAt: Date.now(),` to `items.push()` in `parseRssXml()`

**Verify with:** `git diff server/worldmonitor/news/v1/list-feed-digest.ts` — must show ONLY the `scrapedAt` additions.

---

## 8. Files That Must NEVER Be Modified
- `scripts/seed-insights.mjs` — sacred, pattern reference only
- `scripts/_seed-utils.mjs` — shared infrastructure
- `src/config/variants/full.ts`, `tech.ts`, `finance.ts` — sacred
- `server/worldmonitor/news/v1/_classifier.ts` — reference only

---

## 9. Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | Railway + `.env.local` | Railway PostgreSQL connection string |
| `HF_API_TOKEN` | Railway + `.env.local` | HuggingFace Inference API key |
| `GROQ_API_KEY` | Already exists | Groq API key (fallback Level 3) |
| `UPSTASH_REDIS_REST_URL` | Already exists | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Already exists | Upstash Redis token |

---

## 10. Intelligence Pipeline Logic

```
For each item across ALL categories in the India digest:

  1. isMarketMoving(title) → boolean
     Uses regex \b word boundaries against shared/market-taxonomy.json
     
  If true:
  2. sha256(title) → headline_hash (deduplication key)
  
  3. scoreWithFallbackChain(title) → { label, score, confidence, model }
     Level 1: HuggingFace FinBERT API
     Level 2: Railway Xenova FinBERT  
     Level 3: Groq llama-3.1-8b-instant
     Level 4: DLQ push (zero data loss)
     
  4. extractCompanies(title) → [{ name, ticker }]
  5. extractSectors(title) → string[]
  6. detectEventType(title) → string
  7. detectRelevanceClass(sectors, companies) → string
  
  8. Build entity_sentiment JSONB:
     [{ "ticker": "RELIANCE.NS", "sentiment": -0.43, "model": "finbert-hf" }]
     (V2 compromise: same score for all mentioned tickers)
     
  9. INSERT INTO india_news_signals (...) 
     ON CONFLICT (headline_hash) DO NOTHING
```

---

## 11. Verification Checklist

```bash
# Sacred files unchanged
git diff scripts/seed-insights.mjs          # Must show: nothing
git diff scripts/_seed-utils.mjs            # Must show: nothing  
git diff src/config/variants/               # Must show: nothing

# Digest change is minimal
git diff server/worldmonitor/news/v1/list-feed-digest.ts
# Must show ONLY: scrapedAt additions (2 lines)

# Typecheck
npm run typecheck                           # 0 errors

# Manual run
node scripts/seed-india-signals.mjs         # Runs without error

# PostgreSQL verification
# SELECT COUNT(*) FROM india_news_signals;  # Rows appear
# Run seed script twice — row count should NOT double (ON CONFLICT works)

# DLQ verification  
# Temporarily break HF_API_TOKEN
# Confirm failed articles appear in news:dlq:india_signals
```

---

## 12. What V2-001 Does NOT Include

- ❌ Groq prompt changes (V2-002)
- ❌ UI feedback buttons (V2-004)
- ❌ Any frontend changes
- ❌ RSSHub (V2-005)
- ❌ Sentence-level entity-aware sentiment (V3)
- ❌ The full 15-table database schema (V3)
- ❌ Modifying `seed-insights.mjs` or variant configs

---

## 13. The Bigger Picture

After 6 months of data collection, the `india_news_signals` table produces a flattened time-series view:
```sql
SELECT nse_tickers, scraped_at, sentiment_score, relevance_class, event_type
FROM india_news_signals
WHERE is_market_moving = TRUE
ORDER BY scraped_at;
```
This is the exact format WorldQuant Brain expects for Alpha signal submissions. V2-001 is the foundation that makes everything else possible.

## Linked Nodes
- [[sachnetra_sentiment_architecture]]
- [[sachnetra_quant_pivot]]
- [[sachnetra_db_schema]]
- [[academic_validation_entity_sentiment]]
