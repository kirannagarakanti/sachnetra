# Task V2-001 — Railway Setup + Data Foundation
*SachNetra Adapt Sprint*

**Depends on**: Task V2-000 (complete ✅ 2026-05-06)
**Estimated time**: 4–6 hours
**Prep doc**: `ai_docs/sachnetra v2/wiki/syntheses/V2_001_implementation_context.md`
**V1 or V2**: V2

---

## Context — Current State

V2-000 is complete. SachNetra currently generates intelligence signals only when a user
clicks a story. With near-zero users, most articles pass through the digest unscored —
**permanently lost data that can never be recovered for backtesting.**

The India digest already runs every 10 minutes and writes to Redis key
`news:digest:v1:india:en`. No script reads it for signal extraction.

- `scripts/seed-india-signals.mjs` — does NOT exist yet
- `scripts/_india-market-keywords.mjs` — does NOT exist yet
- `scripts/_sentiment-chain.mjs` — does NOT exist yet
- `shared/market-taxonomy.json` — does NOT exist yet
- `server/worldmonitor/news/v1/list-feed-digest.ts` — exists, `ParsedItem` interface
  has no `scrapedAt` field yet
- `pg` package — NOT in `package.json`
- `@xenova/transformers` — NOT in `package.json`

Railway PostgreSQL service: not yet provisioned.

---

## What This Task Does

- Installs `pg` and `@xenova/transformers` as dependencies
- Creates `shared/market-taxonomy.json` — keyword registry (market keywords, Nifty 50
  entity registry with alias→ticker mapping, sectors, event types)
- Creates `scripts/_india-market-keywords.mjs` — extraction helpers: `isMarketMoving`,
  `extractCompanies`, `extractSectors`, `detectEventType`, `detectRelevanceClassFromTitle`
- Creates `scripts/_sentiment-chain.mjs` — three-level fallback:
  HuggingFace FinBERT → Railway Xenova FinBERT → Groq → DLQ (zero data loss)
- Creates `scripts/seed-india-signals.mjs` — main Railway cron pipeline following exact
  `runSeed()` pattern from `seed-insights.mjs`
- Adds `scrapedAt: number` to `ParsedItem` in `list-feed-digest.ts` (2 lines only)

**Architecture**: Railway cron reads Redis → scores → writes to PostgreSQL.
Independent of user activity. Never touches the digest response path.

---

## Success Criteria

This task is complete when ALL of the following are true:

- [x] `pg` and `@xenova/transformers` are in `package.json`
- [x] `shared/market-taxonomy.json` exists with `market_keywords`, `nifty50_registry`,
      `sectors`, and `event_types` arrays
- [x] `scripts/_india-market-keywords.mjs` exports `isMarketMoving`, `extractCompanies`,
      `extractSectors`, `detectEventType`, `detectRelevanceClassFromTitle`
- [x] `scripts/_sentiment-chain.mjs` exports `scoreWithFallbackChain(text)`
      with all three model levels + DLQ
- [x] `scripts/seed-india-signals.mjs` runs without error: `node scripts/seed-india-signals.mjs`
- [x] At least one row in `india_news_signals` after first manual run
- [x] Running the script twice does NOT double the row count (`ON CONFLICT DO NOTHING` works)
- [x] `git diff server/worldmonitor/news/v1/list-feed-digest.ts` shows ONLY `scrapedAt`
      additions (exactly 2 lines)
- [x] `git diff scripts/seed-insights.mjs` shows nothing (sacred file unchanged)
- [x] `git diff scripts/_seed-utils.mjs` shows nothing (sacred file unchanged)
- [x] `git diff src/config/variants/` shows nothing (sacred files unchanged)
- [x] `npm run typecheck` shows 0 errors
- [x] Railway PostgreSQL service exists with `india_news_signals` table created
- [ ] Railway cron service created and configured to run every 10 minutes (pending GitHub push)

---

## Second-Order Impact

- **Affected consumers of `ParsedItem`**: the `scrapedAt` field is additive — existing
  consumers of `ParsedItem[]` will continue to work since they don't break on extra fields.
  Run `npm run typecheck` after the change to confirm.
- **Performance**: `seed-india-signals.mjs` is a standalone Railway cron. It never runs
  inside the digest response path. Zero impact on user-facing latency.
- **Variant bleed risk**: none — new scripts and `list-feed-digest.ts` change is additive
  only; no existing variant behaviour changes.
- **New env vars needed**:
  - `DATABASE_URL` — Railway PostgreSQL connection string (add to `.env.local` + Railway)
  - `HF_API_TOKEN` — HuggingFace API key (add to `.env.local` + Railway)
  - `GROQ_API_KEY` — already exists in `.env.local` (Level 3 fallback reuse)
  - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — already exist

---

## Files To Open Before Starting

```
scripts/seed-insights.mjs                                              — copy runSeed() pattern EXACTLY
scripts/_seed-utils.mjs                                               — withRetry, sleep, getRedisCredentials
scripts/_clustering.mjs                                               — understand digest item shape
server/worldmonitor/news/v1/list-feed-digest.ts                       — ParsedItem interface + parseRssXml()
server/worldmonitor/news/v1/_classifier.ts                            — see \b word-boundary keyword pattern
ai_docs/sachnetra v2/wiki/syntheses/V2_001_implementation_context.md  — full spec (READ ONLY)
```

---

## Pattern To Follow

From `scripts/seed-insights.mjs` (lines 326–334) — every seed script follows this shape:

```javascript
import { loadEnvFile, getRedisCredentials, runSeed } from './_seed-utils.mjs';
loadEnvFile(import.meta.url);

const CANONICAL_KEY = 'news:signals:v1:india';
const CACHE_TTL = 1800;

async function fetchSignals() {
  // 1. Read news:digest:v1:india:en from Redis
  // 2. Filter + score + extract
  // 3. INSERT to PostgreSQL (fire-and-forget)
  // 4. Return summary object (written to Redis status key by runSeed)
}

function validate(data) {
  return typeof data?.processed === 'number';
}

runSeed('india', 'signals', CANONICAL_KEY, fetchSignals, {
  validateFn: validate,
  ttlSeconds: CACHE_TTL,
  sourceVersion: 'finbert-v1',
}).catch((err) => {
  console.error('FATAL:', err.message || err);
  process.exit(0);  // Railway cron MUST always exit 0
});
```

Digest shape (from `seed-insights.mjs` lines 223–233):
```javascript
// Digest is: { categories: { politics: { items: [...] }, ... } }
items = [];
for (const bucket of Object.values(digest.categories)) {
  if (Array.isArray(bucket.items)) items.push(...bucket.items);
}
```

Keyword matching — use `\b` word boundaries (from `_classifier.ts` pattern):
```javascript
const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'i');
return regex.test(title);
```

---

## Implementation

### Phase 1: Pre-flight — Install Dependencies
**Goal**: Ensure `pg` and `@xenova/transformers` are available before writing scripts

- [ ] **Step 1.1** — Install PostgreSQL client
  - Command: `npm install pg`
  - Adds `pg` to `package.json` dependencies
  - `pg` provides `Pool` class for `DATABASE_URL` connections

- [ ] **Step 1.2** — Install Xenova FinBERT (Level 2 fallback)
  - Command: `npm install @xenova/transformers`
  - Required for offline FinBERT fallback when HuggingFace API is unavailable
  - NOTE: Large package (~500MB on first model download). Railway downloads it once and caches.

- [ ] **Step 1.3** — Verify `.env.local` has required vars
  - Check that `DATABASE_URL` and `HF_API_TOKEN` are present
  - If missing, stop and tell Lijo — Railway credentials must be provisioned before Phase 7

---

### Phase 2: Create `shared/market-taxonomy.json`
**Goal**: Single source of truth for all keyword matching — no hardcoded arrays in scripts

- [ ] **Step 2.1** — Create `shared/market-taxonomy.json` (NEW FILE)
  - Contains: `market_keywords`, `nifty50_registry` (alias→ticker mapping),
    `sectors`, `event_types`, `systemic_keywords`
  - All keyword matching in `_india-market-keywords.mjs` reads from this file
  - Nifty 50 registry covers all 50 index constituents with common aliases

```json
{
  "market_keywords": [
    "rbi", "sebi", "nse", "bse", "nifty", "sensex",
    "earnings", "profit", "revenue", "quarterly results",
    "ipo", "merger", "acquisition", "takeover",
    "interest rate", "repo rate", "inflation", "gdp",
    "budget", "fiscal", "monetary policy",
    "fdi", "fii", "foreign investment",
    "bankruptcy", "insolvency", "default",
    "dividend", "buyback", "bonus shares",
    "debt", "credit rating", "downgrade", "upgrade"
  ],
  "nifty50_registry": [
    { "aliases": ["Reliance", "RIL", "Reliance Industries"], "ticker": "RELIANCE.NS" },
    { "aliases": ["TCS", "Tata Consultancy", "Tata Consultancy Services"], "ticker": "TCS.NS" },
    { "aliases": ["HDFC Bank", "HDFCBANK"], "ticker": "HDFCBANK.NS" },
    { "aliases": ["Infosys", "Infy"], "ticker": "INFY.NS" },
    { "aliases": ["ICICI Bank", "ICICIBANK"], "ticker": "ICICIBANK.NS" },
    { "aliases": ["Hindustan Unilever", "HUL", "Hindustan Lever"], "ticker": "HINDUNILVR.NS" },
    { "aliases": ["ITC"], "ticker": "ITC.NS" },
    { "aliases": ["SBI", "State Bank", "State Bank of India"], "ticker": "SBIN.NS" },
    { "aliases": ["Bajaj Finance", "BAJFINANCE"], "ticker": "BAJFINANCE.NS" },
    { "aliases": ["Bajaj Auto"], "ticker": "BAJAJ-AUTO.NS" },
    { "aliases": ["Bharti Airtel", "Airtel"], "ticker": "BHARTIARTL.NS" },
    { "aliases": ["Wipro"], "ticker": "WIPRO.NS" },
    { "aliases": ["Maruti", "Maruti Suzuki"], "ticker": "MARUTI.NS" },
    { "aliases": ["HCL Tech", "HCL Technologies", "HCLTECH"], "ticker": "HCLTECH.NS" },
    { "aliases": ["Tata Motors", "TATAMOTORS"], "ticker": "TATAMOTORS.NS" },
    { "aliases": ["Tata Steel", "TATASTEEL"], "ticker": "TATASTEEL.NS" },
    { "aliases": ["Kotak Mahindra", "Kotak Bank", "KOTAKBANK"], "ticker": "KOTAKBANK.NS" },
    { "aliases": ["Axis Bank", "AXISBANK"], "ticker": "AXISBANK.NS" },
    { "aliases": ["UltraTech Cement", "ULTRACEMCO"], "ticker": "ULTRACEMCO.NS" },
    { "aliases": ["Sun Pharma", "Sun Pharmaceutical", "SUNPHARMA"], "ticker": "SUNPHARMA.NS" },
    { "aliases": ["Asian Paints", "ASIANPAINT"], "ticker": "ASIANPAINT.NS" },
    { "aliases": ["Nestle India", "NESTLEIND"], "ticker": "NESTLEIND.NS" },
    { "aliases": ["Power Grid", "POWERGRID"], "ticker": "POWERGRID.NS" },
    { "aliases": ["NTPC"], "ticker": "NTPC.NS" },
    { "aliases": ["ONGC"], "ticker": "ONGC.NS" },
    { "aliases": ["Divis Lab", "Divi's Laboratories", "DIVISLAB"], "ticker": "DIVISLAB.NS" },
    { "aliases": ["Cipla"], "ticker": "CIPLA.NS" },
    { "aliases": ["Eicher Motors", "EICHERMOT"], "ticker": "EICHERMOT.NS" },
    { "aliases": ["Grasim", "GRASIM"], "ticker": "GRASIM.NS" },
    { "aliases": ["Hero MotoCorp", "Hero Honda", "HEROMOTOCO"], "ticker": "HEROMOTOCO.NS" },
    { "aliases": ["Hindalco", "HINDALCO"], "ticker": "HINDALCO.NS" },
    { "aliases": ["IndusInd Bank", "INDUSINDBK"], "ticker": "INDUSINDBK.NS" },
    { "aliases": ["JSW Steel", "JSWSTEEL"], "ticker": "JSWSTEEL.NS" },
    { "aliases": ["L&T", "Larsen & Toubro", "Larsen and Toubro", "LT"], "ticker": "LT.NS" },
    { "aliases": ["M&M", "Mahindra & Mahindra", "Mahindra", "MM"], "ticker": "M&M.NS" },
    { "aliases": ["Tech Mahindra", "TECHM"], "ticker": "TECHM.NS" },
    { "aliases": ["Titan", "TITAN"], "ticker": "TITAN.NS" },
    { "aliases": ["UPL"], "ticker": "UPL.NS" },
    { "aliases": ["Adani Ports", "ADANIPORTS"], "ticker": "ADANIPORTS.NS" },
    { "aliases": ["Adani Enterprises", "ADANIENT"], "ticker": "ADANIENT.NS" },
    { "aliases": ["Dr Reddy", "Dr. Reddy's", "DRREDDY"], "ticker": "DRREDDY.NS" },
    { "aliases": ["Bajaj Finserv", "BAJAJFINSV"], "ticker": "BAJAJFINSV.NS" },
    { "aliases": ["Britannia", "BRITANNIA"], "ticker": "BRITANNIA.NS" },
    { "aliases": ["Coal India", "COALINDIA"], "ticker": "COALINDIA.NS" },
    { "aliases": ["SBI Life", "SBILIFE"], "ticker": "SBILIFE.NS" },
    { "aliases": ["HDFC Life", "HDFCLIFE"], "ticker": "HDFCLIFE.NS" },
    { "aliases": ["Apollo Hospitals", "APOLLOHOSP"], "ticker": "APOLLOHOSP.NS" }
  ],
  "sectors": {
    "banking": ["bank", "nbfc", "rbi", "repo rate", "lending", "deposits", "npa", "loan"],
    "tech": ["software", "it services", "cloud", "digital", "tech", "infosys", "wipro", "tcs", "hcl"],
    "pharma": ["pharma", "drug", "medicine", "clinical trial", "fda", "patent", "healthcare"],
    "energy": ["oil", "gas", "petroleum", "ongc", "coal", "power", "electricity", "ntpc", "renewable"],
    "infra": ["infrastructure", "roads", "highway", "railway", "airport", "port", "construction", "cement"],
    "auto": ["automobile", "car", "truck", "ev", "electric vehicle", "maruti", "tata motors"],
    "fmcg": ["fmcg", "consumer goods", "hul", "itc", "nestle", "britannia", "dabur"]
  },
  "event_types": {
    "earnings": ["earnings", "quarterly results", "profit", "revenue", "q1", "q2", "q3", "q4", "net profit"],
    "regulation": ["sebi", "rbi", "regulation", "compliance", "penalty", "fine", "notice"],
    "merger": ["merger", "acquisition", "takeover", "buyout", "stake", "mou"],
    "policy": ["budget", "fiscal policy", "monetary policy", "rate cut", "rate hike", "repo"],
    "management": ["ceo", "cfo", "md", "board", "resign", "appoint", "chairman"],
    "macro": ["gdp", "inflation", "cpi", "iip", "trade deficit", "current account", "forex reserves"]
  },
  "systemic_keywords": ["rbi", "sebi", "gdp", "budget", "fiscal", "monetary policy", "inflation", "repo rate", "cpi"]
}
```

---

### Phase 3: Create `scripts/_india-market-keywords.mjs`
**Goal**: All keyword extraction functions — single import for the seed script

- [ ] **Step 3.1** — Create `scripts/_india-market-keywords.mjs` (NEW FILE)
  - Imports `shared/market-taxonomy.json` via `loadSharedConfig` from `_seed-utils.mjs`
  - All regex uses `\b` word boundaries — no substring false positives

```javascript
#!/usr/bin/env node

import { loadSharedConfig } from './_seed-utils.mjs';

const taxonomy = loadSharedConfig('market-taxonomy.json');

const marketRegex = new RegExp(
  `\\b(${taxonomy.market_keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i'
);

export function isMarketMoving(title) {
  return marketRegex.test(title);
}

export function extractCompanies(title) {
  const found = [];
  for (const entry of taxonomy.nifty50_registry) {
    for (const alias of entry.aliases) {
      const re = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(title)) {
        found.push({ name: entry.aliases[0], ticker: entry.ticker });
        break;
      }
    }
  }
  return found;
}

export function extractSectors(title) {
  const found = [];
  for (const [sector, keywords] of Object.entries(taxonomy.sectors)) {
    const re = new RegExp(
      `\\b(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
      'i'
    );
    if (re.test(title)) found.push(sector);
  }
  return found;
}

export function detectEventType(title) {
  for (const [type, keywords] of Object.entries(taxonomy.event_types)) {
    const re = new RegExp(
      `\\b(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
      'i'
    );
    if (re.test(title)) return type;
  }
  return 'other';
}

export function detectRelevanceClassFromTitle(title, sectors, companies) {
  const systemicRegex = new RegExp(
    `\\b(${taxonomy.systemic_keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'i'
  );
  if (systemicRegex.test(title)) return 'systemic';
  if (sectors.length > 0 && companies.length > 0) return 'sector';
  if (companies.length > 0) return 'idiosyncratic';
  return 'systemic';
}
```

---

### Phase 4: Create `scripts/_sentiment-chain.mjs`
**Goal**: Three-level fallback orchestrator — HuggingFace → Xenova → Groq → DLQ

- [ ] **Step 4.1** — Create `scripts/_sentiment-chain.mjs` (NEW FILE)
  - Exports single function: `scoreWithFallbackChain(text)`
  - Each level uses `withRetry` from `_seed-utils.mjs` for exponential backoff
  - Level 4 (DLQ) is fire-and-forget — never throws

```javascript
#!/usr/bin/env node

import { withRetry, getRedisCredentials, CHROME_UA } from './_seed-utils.mjs';

const HF_FINBERT_URL = 'https://api-inference.huggingface.co/models/ProsusAI/finbert';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DLQ_KEY = 'news:dlq:india_signals';

function normaliseScore(label, score) {
  const l = label.toLowerCase();
  if (l === 'positive') return +Math.abs(score).toFixed(4);
  if (l === 'negative') return -Math.abs(score).toFixed(4);
  return 0.0;
}

async function scoreHuggingFace(text) {
  const token = process.env.HF_API_TOKEN;
  if (!token) throw new Error('HF_API_TOKEN not set');

  const resp = await fetch(HF_FINBERT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: text }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) throw new Error(`HuggingFace API: HTTP ${resp.status}`);
  const data = await resp.json();

  // FinBERT returns [[{label, score}, ...]] — pick highest confidence
  const results = Array.isArray(data[0]) ? data[0] : data;
  const top = [...results].sort((a, b) => b.score - a.score)[0];
  return {
    label: top.label.toLowerCase(),
    score: normaliseScore(top.label, top.score),
    confidence: top.score,
    model: 'finbert-hf',
  };
}

async function scoreXenova(text) {
  const { pipeline } = await import('@xenova/transformers');
  const classifier = await pipeline('text-classification', 'ProsusAI/finbert');
  const result = await classifier(text);
  const top = Array.isArray(result) ? result[0] : result;
  return {
    label: top.label.toLowerCase(),
    score: normaliseScore(top.label, top.score),
    confidence: top.score,
    model: 'finbert-railway',
  };
}

async function scoreGroq(text) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');

  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'User-Agent': CHROME_UA,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are a financial sentiment classifier. Reply with ONLY a JSON object: {"label": "positive"|"negative"|"neutral", "score": 0.0-1.0}',
        },
        {
          role: 'user',
          content: `Classify the sentiment of this financial news headline: "${text}"`,
        },
      ],
      max_tokens: 50,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) throw new Error(`Groq API: HTTP ${resp.status}`);
  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content?.trim();
  const parsed = JSON.parse(raw);
  return {
    label: parsed.label,
    score: normaliseScore(parsed.label, parsed.score),
    confidence: parsed.score,
    model: 'groq-llama',
  };
}

export async function scoreWithFallbackChain(text) {
  const { url, token } = getRedisCredentials();

  // Level 1: HuggingFace FinBERT API
  try {
    return await withRetry(() => scoreHuggingFace(text), 2, 2000);
  } catch (err) {
    console.warn(`  [sentiment] HuggingFace failed: ${err.message}`);
  }

  // Level 2: Railway Xenova FinBERT (local model)
  try {
    return await withRetry(() => scoreXenova(text), 1, 4000);
  } catch (err) {
    console.warn(`  [sentiment] Xenova failed: ${err.message}`);
  }

  // Level 3: Groq llama-3.1-8b-instant
  try {
    return await withRetry(() => scoreGroq(text), 1, 8000);
  } catch (err) {
    console.warn(`  [sentiment] Groq failed: ${err.message}`);
  }

  // Level 4: DLQ — zero data loss, never throws
  try {
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['LPUSH', DLQ_KEY, JSON.stringify({
        text,
        failed_at: Date.now(),
        reason: 'all_models_failed',
        attempts: 3,
      })]),
      signal: AbortSignal.timeout(5_000),
    });
    console.warn(`  [sentiment] Pushed to DLQ: ${DLQ_KEY}`);
  } catch {
    // Best-effort DLQ push — never fail the pipeline
  }

  return null;
}
```

---

### Phase 5: Create `scripts/seed-india-signals.mjs`
**Goal**: Main Railway cron pipeline following exact `runSeed()` pattern

- [ ] **Step 5.1** — Create `scripts/seed-india-signals.mjs` (NEW FILE)
  - Copy `runSeed()` call structure from `seed-insights.mjs` lines 326–334 exactly
  - Digest extraction from `seed-insights.mjs` lines 223–233 exactly
  - `persistSignals()` uses batch INSERT with `ON CONFLICT DO NOTHING`

```javascript
#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { loadEnvFile, getRedisCredentials, runSeed } from './_seed-utils.mjs';
import {
  isMarketMoving,
  extractCompanies,
  extractSectors,
  detectEventType,
  detectRelevanceClassFromTitle,
} from './_india-market-keywords.mjs';
import { scoreWithFallbackChain } from './_sentiment-chain.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);

const { Pool } = pg;
const CANONICAL_KEY = 'news:signals:v1:india';
const DIGEST_KEY = 'news:digest:v1:india:en';
const CACHE_TTL = 1800;

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

async function readDigestFromRedis() {
  const { url, token } = getRedisCredentials();
  const resp = await fetch(`${url}/get/${encodeURIComponent(DIGEST_KEY)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5_000),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function persistSignals(rows) {
  if (rows.length === 0) return 0;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const COLS = 17;
    const placeholders = rows
      .map((_, i) => {
        const base = i * COLS;
        const params = Array.from({ length: COLS }, (__, j) => `$${base + j + 1}`);
        return `(${params.join(',')})`;
      })
      .join(',');

    const values = rows.flatMap(r => [
      r.headline_hash,
      r.scraped_at,
      r.published_at,
      r.headline,
      r.source_name,
      r.article_url,
      r.event_category,
      r.threat_level,
      r.is_market_moving,
      r.nse_tickers,
      r.sectors,
      r.companies,
      r.sentiment_score,
      r.sentiment_label,
      r.sentiment_model,
      r.relevance_class,
      r.event_type,
    ]);

    const result = await pool.query(
      `INSERT INTO india_news_signals
        (headline_hash, scraped_at, published_at, headline, source_name, article_url,
         event_category, threat_level, is_market_moving, nse_tickers, sectors, companies,
         sentiment_score, sentiment_label, sentiment_model, relevance_class, event_type)
       VALUES ${placeholders}
       ON CONFLICT (headline_hash) DO NOTHING`,
      values
    );
    return result.rowCount ?? 0;
  } finally {
    await pool.end();
  }
}

async function fetchSignals() {
  const digest = await readDigestFromRedis();
  if (!digest) throw new Error('India digest not found in Redis');

  // Extract items from all category buckets — same pattern as seed-insights.mjs lines 223-233
  const items = [];
  if (digest.categories && typeof digest.categories === 'object') {
    for (const bucket of Object.values(digest.categories)) {
      if (Array.isArray(bucket.items)) items.push(...bucket.items);
    }
  }

  if (items.length === 0) throw new Error('Digest has no items');
  console.log(`  Digest items: ${items.length}`);

  const rows = [];
  let skipped = 0;
  let errors = 0;

  for (const item of items) {
    const title = (item.title || '').trim();
    if (!title || !isMarketMoving(title)) {
      skipped++;
      continue;
    }

    const companies = extractCompanies(title);
    const sectors = extractSectors(title);
    const eventType = detectEventType(title);
    const relevanceClass = detectRelevanceClassFromTitle(title, sectors, companies);
    const headlineHash = sha256(title);

    const scored = await scoreWithFallbackChain(title);
    if (!scored) errors++;

    rows.push({
      headline_hash: headlineHash,
      scraped_at: item.scrapedAt
        ? new Date(item.scrapedAt).toISOString()
        : new Date().toISOString(),
      published_at: item.publishedAt
        ? new Date(item.publishedAt).toISOString()
        : null,
      headline: title,
      source_name: item.source || '',
      article_url: item.link || null,
      event_category: item.category || null,
      threat_level: item.level || null,
      is_market_moving: true,
      nse_tickers: companies.map(c => c.ticker),
      sectors,
      companies: companies.map(c => c.name),
      sentiment_score: scored?.score ?? null,
      sentiment_label: scored?.label ?? null,
      sentiment_model: scored?.model ?? null,
      relevance_class: relevanceClass,
      event_type: eventType,
    });
  }

  console.log(`  Market-moving: ${rows.length} | Skipped: ${skipped} | Score errors: ${errors}`);

  const inserted = await persistSignals(rows);
  console.log(`  Inserted: ${inserted} new rows (ON CONFLICT skipped duplicates)`);

  return { processed: items.length, marketMoving: rows.length, inserted, skipped, errors };
}

function validate(data) {
  return typeof data?.processed === 'number';
}

runSeed('india', 'signals', CANONICAL_KEY, fetchSignals, {
  validateFn: validate,
  ttlSeconds: CACHE_TTL,
  sourceVersion: 'finbert-v1',
}).catch((err) => {
  console.error('FATAL:', err.message || err);
  process.exit(0); // Railway cron must always exit 0
});
```

---

### Phase 6: Modify `list-feed-digest.ts` — Add `scrapedAt` (2 lines only)
**Goal**: Inject accurate scrape timestamp into each ParsedItem so the seed script gets real timing

- [ ] **Step 6.1** — Add `scrapedAt: number` to `ParsedItem` interface
  - File: `server/worldmonitor/news/v1/list-feed-digest.ts`
  - Location: inside the `interface ParsedItem` block, after `publishedAt: number;` (line ~57)
  - Do not change anything else in the interface

- [ ] **Step 6.2** — Add `scrapedAt: Date.now()` inside `items.push()`
  - File: `server/worldmonitor/news/v1/list-feed-digest.ts`
  - Location: inside `items.push({...})` in `parseRssXml()`, after `publishedAt,` (~line 185)
  - Do not change anything else in this file

- [ ] **Step 6.3** — Verify: `git diff server/worldmonitor/news/v1/list-feed-digest.ts`
  - Must show ONLY 2 lines added
  - Nothing else must change in this file

---

### Phase 7: Railway PostgreSQL Setup (Manual — Lijo performs these steps)
**Goal**: Provision Railway PostgreSQL, run DDL, configure cron

- [ ] **Step 7.1** — Create Railway project + PostgreSQL service
  - Railway dashboard → New Project → Add PostgreSQL
  - Copy `DATABASE_URL` from Railway Variables tab → add to `.env.local`
  - Copy `DATABASE_URL` to Railway cron service env vars

- [ ] **Step 7.2** — Run DDL on Railway PostgreSQL

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

- [ ] **Step 7.3** — Configure Railway cron
  - Deploy `seed-india-signals.mjs` on Railway cron service
  - Cron schedule: `*/10 * * * *` (every 10 minutes, matches digest interval)
  - Required env vars on Railway cron:
    - `DATABASE_URL`
    - `HF_API_TOKEN`
    - `UPSTASH_REDIS_REST_URL`
    - `UPSTASH_REDIS_REST_TOKEN`
    - `GROQ_API_KEY` (fallback Level 3)

---

## Before / After

**Before** (`server/worldmonitor/news/v1/list-feed-digest.ts`, lines 52–62):
```typescript
interface ParsedItem {
  source: string;
  title: string;
  link: string;
  publishedAt: number;
  isAlert: boolean;
  level: ThreatLevel;
  category: string;
  confidence: number;
  classSource: 'keyword' | 'llm';
}
```

**After**:
```typescript
interface ParsedItem {
  source: string;
  title: string;
  link: string;
  publishedAt: number;
  scrapedAt: number;          // epoch ms, set at RSS parse time for quant timestamp fidelity
  isAlert: boolean;
  level: ThreatLevel;
  category: string;
  confidence: number;
  classSource: 'keyword' | 'llm';
}
```

**Before** (`parseRssXml()` items.push, lines 181–191):
```typescript
items.push({
  source: feed.name,
  title,
  link,
  publishedAt,
  isAlert,
  level: threat.level,
  category: threat.category,
  confidence: threat.confidence,
  classSource: 'keyword',
});
```

**After**:
```typescript
items.push({
  source: feed.name,
  title,
  link,
  publishedAt,
  scrapedAt: Date.now(),
  isAlert,
  level: threat.level,
  category: threat.category,
  confidence: threat.confidence,
  classSource: 'keyword',
});
```

---

## Error Scenarios

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `HF_API_TOKEN not set` | Env var missing | Add to `.env.local` + Railway vars |
| `DATABASE_URL not set` | Railway not provisioned | Complete Phase 7 first |
| `connection refused` on pg | Wrong URL or missing SSL | Check Railway URL; SSL is set to `rejectUnauthorized: false` in script |
| `all_models_failed` pushed to DLQ | All 3 sentiment APIs unavailable | Check `news:dlq:india_signals` in Redis; retry when APIs recover |
| TypeScript error on `scrapedAt` | Interface or push() not updated | Ensure BOTH changes in Step 6.1 and 6.2 are present |
| `Digest has no items` | India digest not in Redis | Trigger digest manually: `list-feed-digest?variant=india&lang=en` |
| `relation "india_news_signals" does not exist` | DDL not run | Run Phase 7.2 DDL on Railway PostgreSQL |
| `Cannot find module 'pg'` | Phase 1 not complete | Run `npm install pg` |

---

## Environment Variables

| Variable | Where set | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | `.env.local` + Railway | Railway PostgreSQL connection string |
| `HF_API_TOKEN` | `.env.local` + Railway | HuggingFace Inference API (FinBERT Level 1) |
| `GROQ_API_KEY` | Already in `.env.local` | Groq API — Level 3 fallback (reused from V1) |
| `UPSTASH_REDIS_REST_URL` | Already in `.env.local` | Upstash Redis — read digest |
| `UPSTASH_REDIS_REST_TOKEN` | Already in `.env.local` | Upstash Redis token |

---

## Read vs Write

**READ for reference (never write):**
- `scripts/seed-insights.mjs` — SACRED, pattern reference only
- `scripts/_seed-utils.mjs` — shared infrastructure, never write
- `scripts/_clustering.mjs` — digest shape reference only
- `server/worldmonitor/news/v1/_classifier.ts` — keyword pattern reference only
- `src/config/variants/full.ts` — SACRED
- `src/config/variants/tech.ts` — SACRED
- `src/config/variants/finance.ts` — SACRED

**WRITE only to these files:**
- `shared/market-taxonomy.json` (CREATE NEW)
- `scripts/_india-market-keywords.mjs` (CREATE NEW)
- `scripts/_sentiment-chain.mjs` (CREATE NEW)
- `scripts/seed-india-signals.mjs` (CREATE NEW)
- `server/worldmonitor/news/v1/list-feed-digest.ts` (2-line addition only)

**Never write to:**
- `src/config/variants/full.ts` — SACRED
- `src/config/variants/tech.ts` — SACRED
- `src/config/variants/finance.ts` — SACRED
- `scripts/seed-insights.mjs` — SACRED
- `scripts/_seed-utils.mjs` — shared infrastructure

---

## Verify

```bash
# Sacred files unchanged
git diff scripts/seed-insights.mjs          # Must show: nothing
git diff scripts/_seed-utils.mjs            # Must show: nothing
git diff src/config/variants/               # Must show: nothing

# list-feed-digest.ts change is minimal
git diff server/worldmonitor/news/v1/list-feed-digest.ts
# Must show ONLY: scrapedAt additions (2 lines)

# TypeScript check
npm run typecheck                           # 0 errors

# Manual pipeline run (requires DATABASE_URL in .env.local)
node scripts/seed-india-signals.mjs

# PostgreSQL verification
# SELECT COUNT(*) FROM india_news_signals;
# Run twice — row count should NOT double (ON CONFLICT working)
# SELECT DISTINCT sentiment_model FROM india_news_signals;
# Shows which fallback model scored each row

# DLQ verification (optional)
# Temporarily set HF_API_TOKEN=invalid and GROQ_API_KEY=invalid
# Confirm failed articles appear in Redis key: news:dlq:india_signals
```

---

## Implementation Notes (Actual vs Spec)

### HuggingFace endpoint changed
The spec used `https://api-inference.huggingface.co/models/ProsusAI/finbert`.
HuggingFace moved Inference Providers to a new router URL. The working URL is:
`https://router.huggingface.co/hf-inference/models/ProsusAI/finbert`
Updated in `scripts/_sentiment-chain.mjs`. Fine-grained tokens with "Make calls to
Inference Providers" permission are required — classic read tokens do not work.

### DATABASE_PUBLIC_URL required for local runs
Railway's `DATABASE_URL` uses the internal hostname (`postgres.railway.internal`)
which is only reachable from within Railway's private network. For local dev and the
migration script, `DATABASE_PUBLIC_URL` (Railway's public proxy URL) must be added
to `.env.local`. Both `migrate-india-signals.mjs` and `seed-india-signals.mjs` use
`DATABASE_PUBLIC_URL || DATABASE_URL` so Railway cron (which uses the internal URL)
continues to work without any change.

### Migration script added
`scripts/migrate-india-signals.mjs` was created as an idempotent DDL runner
(`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). Run once locally to
provision the table. Safe to re-run — no destructive operations.

### Digest key requires browser-origin trigger locally
`news:digest:v1:india:en` is written to Redis when the RPC is called with a trusted
Origin header. The middleware at `middleware.ts` blocks requests with no/short UA.
To refresh the digest during local testing:
```javascript
fetch('https://sachnetra.com/api/news/v1/list-feed-digest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Origin': 'https://sachnetra.com',
             'Referer': 'https://sachnetra.com/', 'User-Agent': '<browser UA>' },
  body: JSON.stringify({ variant: 'india', lang: 'en' }),
})
```
On Railway the digest key is populated by user visits to sachnetra.com automatically.

### Sentiment model performance
- Level 1 (finbert-hf): ~4s total run for 80 items — all market-moving articles
- Level 3 (groq-llama): ~73s total — used when HF token lacked Inference permission
- Level 2 (xenova): not usable locally (model download needed); works on Railway after first cache

---

## Completion Log

- [x] Phase 1 complete (pg + @xenova/transformers installed) — 2026-05-07
- [x] Phase 2 complete (shared/market-taxonomy.json) — 2026-05-07
- [x] Phase 3 complete (scripts/_india-market-keywords.mjs) — 2026-05-07
- [x] Phase 4 complete (scripts/_sentiment-chain.mjs) — 2026-05-07
- [x] Phase 5 complete (scripts/seed-india-signals.mjs) — 2026-05-07
- [x] Phase 6 complete (list-feed-digest.ts scrapedAt — 2 lines) — 2026-05-07
- [ ] Phase 7 complete (Railway PostgreSQL ✅ + DDL ✅ + cron service ⏳ pending push)
- [x] Typecheck: 0 errors — 2026-05-07
- [x] Sacred files verified unchanged — 2026-05-07
- [x] Manual seed run: success — 2026-05-07 (8 rows inserted, ON CONFLICT verified)
- [x] PostgreSQL rows confirmed — 2026-05-07 (finbert-hf: 2, groq-llama: 6)
- [ ] **TASK V2-001 COMPLETE** ✅ — pending Railway cron service + GitHub push
