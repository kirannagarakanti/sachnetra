# Task V2-002 — Enrich Summary with Intelligence Signals
*SachNetra Adapt Sprint*

**Depends on**: Task V2-001 (Railway PostgreSQL must exist ✅)
**Estimated time**: 2–3 hours
**Prep doc**: `ai_docs/sachnetra v2/wiki/syntheses/V2_002_implementation_context.md`
**V1 or V2**: V2

---

## Context — Current State

V2-001 built the Railway cron (`seed-india-signals.mjs`) that scores market-moving
headlines with FinBERT and writes to `india_news_signals` every 10 minutes. However:

- FinBERT scores from a single headline alone — less accurate than Groq's multi-source context
- The existing India `brief` Groq call returns `{ summary, meaning }` only — no intelligence fields
- No enrichment path exists to upgrade FinBERT-scored PostgreSQL rows with Groq's richer extraction

**Edge runtime constraint (critical):**
`api/news/v1/[rpc].ts` sets `runtime: 'edge'`, which means `summarize-article.ts` runs in the
Vercel Edge V8 sandbox — not Node.js. The `pg` package (which uses `net`, `tls`, `crypto`) does
NOT work in edge runtime. The fire-and-forget enrichment must use Upstash Redis REST (HTTP),
and the PostgreSQL UPDATE must be done by the Railway cron, not the edge function.

**Revised scope vs original spec:**
The `V2_002_implementation_context.md` describes a separate "What It Means →" button that
fetches article HTML. That approach requires a second Groq call and article scraping. Instead,
V2-002 extends the EXISTING ✨ click to return all 6 intelligence fields in ONE Groq call —
simpler, fewer API calls, same user value, no article fetching.

---

## What This Task Does

- Extends the India variant `brief` Groq prompt to return 6 fields (`summary`, `meaning`,
  `sentiment`, `sentiment_score`, `companies_mentioned`, `event_type`)
- Updates `TwoSummaryResult` interface and `parseTwoSummaryResponse()` to handle 4 new fields
- `summarize-article.ts` encodes all 6 fields in the `summary` JSON string (backward-compatible)
- After a live (non-cached) India summary, fire-and-forget RPUSH to `news:enrich-queue:v1`
  via Upstash REST HTTP (edge-runtime compatible)
- `seed-india-signals.mjs` drains `news:enrich-queue:v1` at the start of each cron run
  and does PostgreSQL UPDATEs — upgrading FinBERT-scored rows with Groq's richer extraction

---

## Success Criteria

This task is complete when ALL of the following are true:

- [ ] `TwoSummaryResult` has 6 fields: `summary`, `meaning`, `sentiment`, `sentimentScore`, `companiesMentioned`, `eventType`
- [ ] India variant Groq `userPrompt` requests all 6 fields in its JSON schema
- [ ] `parseTwoSummaryResponse()` extracts all 6 fields, with safe defaults for missing/invalid values
- [ ] Non-cached India `brief` response encodes all 6 fields in the JSON `summary` string
- [ ] `pushEnrichmentQueue` in `summarize-article.ts` is never awaited in the hot path
- [ ] `seed-india-signals.mjs` has `drainEnrichQueue` called at start of `fetchSignals()`
- [ ] PostgreSQL UPDATE in `drainEnrichQueue` uses `WHERE headline_hash = $5` (no-op if row absent)
- [ ] `npm run typecheck` shows 0 errors
- [ ] `git diff scripts/seed-insights.mjs` shows nothing (sacred file unchanged)
- [ ] `git diff src/config/variants/` shows nothing (sacred files unchanged)

---

## Second-Order Impact

- **`src/services/summarization.ts` (frontend)**: Already parses `{ summary, meaning }` from JSON
  via `JSON.parse()`. New fields appear in the parsed object and are silently ignored until a
  future UI task displays them. No breaking change.
- **Cached responses**: Redis-cached responses from before this change contain only
  `{ summary, meaning }`. `parseTwoSummaryResponse()` fallbacks handle missing fields safely.
- **PostgreSQL UPDATE**: `WHERE headline_hash = $5` — if no matching row (celebrity story, or
  V2-001 cron hasn't run yet), the UPDATE is a no-op. Zero wasted writes.
- **Performance**: `pushEnrichmentQueue` is fire-and-forget (never awaited). User response
  latency is completely unchanged.
- **Variant bleed**: Change is inside `isIndiaVariant && mode === 'brief'` branch. Other
  variants (`full`, `tech`) are unaffected.
- **New env vars**: None. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` already
  exist in Vercel (for edge function) and Railway (for cron).

---

## Files To Open Before Starting

```
server/worldmonitor/news/v1/_shared.ts            — extend prompt + TwoSummaryResult + parser
server/worldmonitor/news/v1/summarize-article.ts  — add pushEnrichmentQueue (fire-and-forget)
scripts/seed-india-signals.mjs                    — add drainEnrichQueue at top of fetchSignals()
scripts/_seed-utils.mjs                           — READ ONLY: getRedisCredentials() reference
api/news/v1/[rpc].ts                              — READ ONLY: confirm runtime: 'edge' (never write)
```

---

## Pattern To Follow

### Upstash REST command (from `scripts/_sentiment-chain.mjs` DLQ push):
```javascript
await fetch(url, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(['RPUSH', 'news:enrich-queue:v1', JSON.stringify(payload)]),
  signal: AbortSignal.timeout(3_000),
});
```

### Edge-runtime SHA-256 (Web Crypto API — no node:crypto in edge):
```typescript
const data = new TextEncoder().encode(text.trim());
const buf = await crypto.subtle.digest('SHA-256', data);
const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
```

### fetch in edge runtime (CHROME_UA already imported in summarize-article.ts):
```typescript
await ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args))(url, { ... });
```

### Fire-and-forget pattern (never block the response):
```typescript
pushEnrichmentQueue(parsed, headlines[0] ?? '').catch(() => {});
```

### Pool pattern for Railway cron (matches existing `persistSignals`):
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
try {
  await pool.query(`UPDATE india_news_signals SET ...`, [...values]);
} finally {
  await pool.end();
}
```

---

## Implementation

### Phase 1: Extend prompt and parser (`_shared.ts`)
**Goal**: Groq returns 6 fields; interface and parser handle them cleanly

- [ ] **Step 1.1** — Update India brief `userPrompt` JSON schema
  - File: `server/worldmonitor/news/v1/_shared.ts`
  - Location: inside the `userPrompt` template literal (the block with `"summary":` and `"meaning":`)
  - Change: Add 4 new fields to the JSON object schema, with rules below existing rules

- [ ] **Step 1.2** — Update `TwoSummaryResult` interface
  - File: `server/worldmonitor/news/v1/_shared.ts`
  - Location: `export interface TwoSummaryResult` block (~line 201)
  - Change: Add `sentiment: string`, `sentimentScore: number | null`, `companiesMentioned: string[]`, `eventType: string`

- [ ] **Step 1.3** — Update `parseTwoSummaryResponse()` happy-path return
  - File: `server/worldmonitor/news/v1/_shared.ts`
  - Location: the `return { summary: ..., meaning: ... }` inside the `try` block (~line 221)
  - Change: Add 4 new fields with type-safe extraction and safe defaults

- [ ] **Step 1.4** — Update `parseTwoSummaryResponse()` fallback return
  - File: `server/worldmonitor/news/v1/_shared.ts`
  - Location: the `return { summary: rawResponse.trim(), meaning: '' }` in the `catch` block (~line 228)
  - Change: Add empty/null defaults for the 4 new fields

### Phase 2: Update server handler (`summarize-article.ts`)
**Goal**: Encode all 6 fields in response; fire-and-forget Redis queue push

- [ ] **Step 2.1** — Bump `max_tokens` for India brief
  - File: `server/worldmonitor/news/v1/summarize-article.ts`
  - Location: the `max_tokens` expression (~line 120): `(variant === 'india' && mode === 'brief') ? 500 : 100`
  - Change: `500` → `600` (4 new fields add ~80 tokens to response)

- [ ] **Step 2.2** — Add `pushEnrichmentQueue` helper function
  - File: `server/worldmonitor/news/v1/summarize-article.ts`
  - Where: Add as a module-level `async function` before the `summarizeArticle` export
  - What: Reads `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` from `process.env`,
    computes SHA-256 of the headline via Web Crypto API, RPUSH to `news:enrich-queue:v1`
  - Guards: return early if `!redisUrl || !redisToken || !firstHeadline || !parsed.sentiment`

- [ ] **Step 2.3** — Update the India brief response encoding
  - File: `server/worldmonitor/news/v1/summarize-article.ts`
  - Location: `if (variant === 'india' && mode === 'brief' && !isCached)` block (~line 177)
  - Change: Add 4 new fields to the `JSON.stringify({...})` call; add fire-and-forget call
    `pushEnrichmentQueue(parsed, headlines[0] ?? '').catch(() => {});`

### Phase 3: Drain enrich queue in Railway cron (`seed-india-signals.mjs`)
**Goal**: Each cron run upgrades FinBERT-scored rows with Groq intelligence from the queue

- [ ] **Step 3.1** — Add `drainEnrichQueue()` function
  - File: `scripts/seed-india-signals.mjs`
  - Where: Before the `fetchSignals()` function
  - What: LRANGE `news:enrich-queue:v1` 0 -1, parse each item, UPDATE PostgreSQL
    (`sentiment_label`, `sentiment_score`, `companies`, `event_type`, `sentiment_model = 'groq-v2'`),
    then DEL the key. Entire function wrapped in try/catch — never throws.

- [ ] **Step 3.2** — Call `drainEnrichQueue()` at the start of `fetchSignals()`
  - File: `scripts/seed-india-signals.mjs`
  - Location: First statement of `fetchSignals()`, before `readDigestFromRedis()`
  - What: `await drainEnrichQueue();` — its own error handling means no impact on rest of run

---

## Before / After

### `_shared.ts` — `TwoSummaryResult` interface

**Before** (lines 201–204):
```typescript
export interface TwoSummaryResult {
  summary: string;
  meaning: string;
}
```

**After**:
```typescript
export interface TwoSummaryResult {
  summary: string;
  meaning: string;
  sentiment: string;
  sentimentScore: number | null;
  companiesMentioned: string[];
  eventType: string;
}
```

---

### `_shared.ts` — India `userPrompt` JSON schema

**Before** (the JSON object template in userPrompt):
```
{
  "summary": "2-3 sentences. What happened, where, when, key facts.",
  "meaning": "2-3 sentences. What this means for people in India right now."
}
```

**After**:
```
{
  "summary": "2-3 sentences. What happened, where, when, key facts.",
  "meaning": "2-3 sentences. What this means for people in India right now.",
  "sentiment": "positive | negative | neutral",
  "sentiment_score": 0.0,
  "companies_mentioned": ["Company Name"],
  "event_type": "earnings | regulation | policy | merger | macro | management | other"
}
```

Add these rules below the existing rules (before the final `Rules:`):
```
Rules for sentiment:
- sentiment must be exactly one of: positive, negative, neutral
- sentiment_score: +1.0 (very positive) to -1.0 (very negative). Use 0.0 for neutral.
- companies_mentioned: list Indian company names mentioned in the headlines. Empty array [] if none.
- event_type: choose the single best match from the allowed values. Use "other" if unsure.
- If unsure about any intelligence field, use null — never fabricate
```

---

### `_shared.ts` — `parseTwoSummaryResponse()` return

**Before** (happy-path return, ~line 221):
```typescript
return {
  summary: parsed.summary.trim(),
  meaning: parsed.meaning.trim(),
};
```

**After**:
```typescript
return {
  summary: parsed.summary.trim(),
  meaning: parsed.meaning.trim(),
  sentiment: typeof parsed.sentiment === 'string' ? parsed.sentiment : '',
  sentimentScore: typeof parsed.sentiment_score === 'number' ? parsed.sentiment_score : null,
  companiesMentioned: Array.isArray(parsed.companies_mentioned)
    ? (parsed.companies_mentioned as string[]).filter(c => typeof c === 'string')
    : [],
  eventType: typeof parsed.event_type === 'string' ? parsed.event_type : 'other',
};
```

**Before** (fallback return in catch, ~line 228):
```typescript
return {
  summary: rawResponse.trim(),
  meaning: '',
};
```

**After**:
```typescript
return {
  summary: rawResponse.trim(),
  meaning: '',
  sentiment: '',
  sentimentScore: null,
  companiesMentioned: [],
  eventType: 'other',
};
```

---

### `summarize-article.ts` — India brief response block

**Before** (lines 177–179):
```typescript
if (variant === 'india' && mode === 'brief' && !isCached) {
  const parsed = parseTwoSummaryResponse(result.summary);
  finalSummary = JSON.stringify({ summary: parsed.summary, meaning: parsed.meaning });
}
```

**After**:
```typescript
if (variant === 'india' && mode === 'brief' && !isCached) {
  const parsed = parseTwoSummaryResponse(result.summary);
  finalSummary = JSON.stringify({
    summary: parsed.summary,
    meaning: parsed.meaning,
    sentiment: parsed.sentiment,
    sentiment_score: parsed.sentimentScore,
    companies_mentioned: parsed.companiesMentioned,
    event_type: parsed.eventType,
  });
  pushEnrichmentQueue(parsed, headlines[0] ?? '').catch(() => {});
}
```

---

### New: `pushEnrichmentQueue` (add to `summarize-article.ts` before the export)

```typescript
async function pushEnrichmentQueue(parsed: TwoSummaryResult, firstHeadline: string): Promise<void> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken || !firstHeadline || !parsed.sentiment) return;

  const data = new TextEncoder().encode(firstHeadline.trim());
  const buf = await crypto.subtle.digest('SHA-256', data);
  const headlineHash = Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const payload = JSON.stringify({
    headline_hash: headlineHash,
    sentiment_label: parsed.sentiment,
    sentiment_score: parsed.sentimentScore,
    companies: parsed.companiesMentioned,
    event_type: parsed.eventType,
  });

  await ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args))(redisUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['RPUSH', 'news:enrich-queue:v1', payload]),
    signal: AbortSignal.timeout(3_000),
  });
}
```

---

### New: `drainEnrichQueue` (add to `scripts/seed-india-signals.mjs` before `fetchSignals`)

```javascript
async function drainEnrichQueue() {
  const { url, token } = getRedisCredentials();

  let items = [];
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['LRANGE', 'news:enrich-queue:v1', 0, -1]),
      signal: AbortSignal.timeout(5_000),
    });
    if (!resp.ok) return;
    const data = await resp.json();
    items = Array.isArray(data.result) ? data.result : [];
  } catch (err) {
    console.warn(`  [enrich] Queue read failed (non-fatal): ${err.message}`);
    return;
  }

  if (items.length === 0) return;
  console.log(`  [enrich] Draining ${items.length} items from queue`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  let updated = 0;
  try {
    for (const raw of items) {
      try {
        const item = JSON.parse(raw);
        if (!item.headline_hash) continue;
        const result = await pool.query(
          `UPDATE india_news_signals
           SET sentiment_label = $1, sentiment_score = $2, companies = $3,
               event_type = $4, sentiment_model = 'groq-v2'
           WHERE headline_hash = $5`,
          [item.sentiment_label, item.sentiment_score, item.companies ?? [], item.event_type, item.headline_hash]
        );
        if ((result.rowCount ?? 0) > 0) updated++;
      } catch { /* skip malformed item, continue */ }
    }
  } finally {
    await pool.end();
  }

  // Clear queue only after successful processing
  try {
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['DEL', 'news:enrich-queue:v1']),
      signal: AbortSignal.timeout(3_000),
    });
  } catch { /* non-fatal — items stay in queue, will be re-processed next run */ }

  console.log(`  [enrich] Updated ${updated}/${items.length} PostgreSQL rows (groq-v2)`);
}
```

---

## Error Scenarios

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| TypeScript error on `TwoSummaryResult` | New fields added to interface but not all call sites updated | `npm run typecheck` shows exact file:line — fix each |
| `parseTwoSummaryResponse` returns empty companies | LLM returned `null` instead of `[]` | Covered: `Array.isArray(x) ? x.filter(...) : []` |
| `pushEnrichmentQueue` silently no-ops | `UPSTASH_REDIS_REST_URL` or `_TOKEN` not in Vercel env | Check Vercel dashboard → Environment Variables |
| PostgreSQL rows not being enriched | `drainEnrichQueue` not called, or cron not running | Check Railway cron logs for `[enrich]` lines |
| Queue grows unboundedly | Cron stopped or DEL failing after partial update | `LLEN news:enrich-queue:v1` in Upstash console; items are re-processed on next run (safe) |
| Frontend only shows old `{ summary, meaning }` | Response is served from Redis cache (pre-change) | Live on first cache miss; or bump `CACHE_VERSION` in `summary-cache-key.ts` to force re-generation |
| `crypto.subtle` TypeScript error | Edge type lib doesn't include Web Crypto global | Add `"lib": ["ES2020", "DOM"]` to tsconfig if missing |

---

## Environment Variables

No new variables needed. All exist:

| Variable | Where set | Used in |
|----------|-----------|---------|
| `UPSTASH_REDIS_REST_URL` | Vercel + Railway | `pushEnrichmentQueue` (edge), `drainEnrichQueue` (cron) |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel + Railway | Same |
| `DATABASE_PUBLIC_URL` / `DATABASE_URL` | Railway | `drainEnrichQueue` PostgreSQL UPDATE |
| `GROQ_API_KEY` | Vercel | Groq summarization call (already in use) |

---

## Read vs Write

**READ for reference (never write):**
- `scripts/_seed-utils.mjs` — `getRedisCredentials()` reference only
- `scripts/seed-insights.mjs` — SACRED, never write
- `api/news/v1/[rpc].ts` — read to confirm `runtime: 'edge'`, never write
- `src/config/variants/full.ts` — SACRED
- `src/config/variants/tech.ts` — SACRED

**WRITE only to:**
- `server/worldmonitor/news/v1/_shared.ts` — prompt + interface + parser (Phases 1.1–1.4)
- `server/worldmonitor/news/v1/summarize-article.ts` — max_tokens + pushEnrichmentQueue (Phase 2)
- `scripts/seed-india-signals.mjs` — drainEnrichQueue + call site (Phase 3)

**Never write to:**
- `proto/worldmonitor/news/v1/summarize_article.proto` — proto is locked; `summary` field carries all JSON data, no proto extension needed
- `src/services/summarization.ts` — frontend already handles JSON in `summary`; no change needed
- `api/news/v1/[rpc].ts` — do not change `runtime: 'edge'`
- `scripts/seed-insights.mjs` — SACRED
- `src/config/variants/full.ts`, `tech.ts`, `finance.ts` — SACRED

---

## Verify

```bash
npm run typecheck    # Must show: 0 errors

# Sacred files check
git diff scripts/seed-insights.mjs      # Must show: nothing
git diff src/config/variants/           # Must show: nothing
```

**Manual browser check (after `npm run dev` — Lijo/James run this):**
1. Click ✨ on any India story
2. Network tab → filter `news/v1` → inspect RPC response `summary` field
3. The `summary` field value should be JSON parseable with 6 keys:
   `summary`, `meaning`, `sentiment`, `sentiment_score`, `companies_mentioned`, `event_type`
4. Click ✨ again on the same story — should return from cache; all 6 fields preserved

**Redis check (Upstash console):**
- After a fresh ✨ click: `LLEN news:enrich-queue:v1` should be ≥ 1
- After next cron run: `LLEN news:enrich-queue:v1` should be 0

**PostgreSQL check (after cron runs):**
```sql
SELECT headline, sentiment_label, sentiment_model, companies, event_type
FROM india_news_signals
WHERE sentiment_model = 'groq-v2'
ORDER BY processed_at DESC
LIMIT 10;
```
Rows with `sentiment_model = 'groq-v2'` confirm enrichment is working.

---

## Completion Log

- [x] Phase 1 complete — 2026-05-08 23:12
- [x] Phase 2 complete — 2026-05-08 23:17
- [x] Phase 3 complete — 2026-05-08 23:22
- [x] Typecheck: 0 errors — 2026-05-08 23:22
- [x] Sacred files verified unchanged — 2026-05-08 23:22
- [x] Network tab: 6 fields confirmed in summary JSON — 2026-05-09
- [x] Redis queue increments on ✨ click — 2026-05-09
- [x] PostgreSQL `groq-v2` rows confirmed after cron — 2026-05-09
- [x] "WHAT THIS MEANS" card rendering confirmed in browser — 2026-05-09

### Bugs fixed during verification (2026-05-09)

**Root cause 1 — render code commented out:**
The `if (meaningText)` block in `data-loader.ts` (around line 450–462) was commented
out at the end of Task 018 with the note "model not ready". The meaning field was
being received correctly from Groq all along — it just never rendered. Fix: uncommented
the block and added the green dot class to match the ✨ button style.

**Root cause 2 — stale IndexedDB cache:**
`summaryResultBreaker` uses `persistCache: true` which writes to IndexedDB (not
localStorage). `localStorage.clear()` does not touch IndexedDB. Old entries with
`meaning: undefined` were being hydrated on every page reload and served for the
full 2-hour TTL. Fix: bumped `CACHE_VERSION` v9 → v10 (changes the cache key,
busting IndexedDB entries alongside Redis).

**Prompt hardening — LLM returning empty meaning:**
Groq was returning `"meaning": ""` or `null` for some stories (especially local
civic stories) because `"unknown fields use null"` in the intelligence rule made it
treat `meaning` as optional. Fixes applied:
- JSON schema comment changed to `"REQUIRED. Never empty."`
- Rules header: `Rules for meaning (REQUIRED — never null, never empty string)`
- Added: "Every story has an impact. Write 2-3 sentences no matter what."
- Local stories rule: "explain what residents of that city should know or do differently"
- Removed `"unknown fields use null"` — replaced with explicit per-field defaults

**Server-side guard added (`summarize-article.ts`):**
India brief responses with empty `meaning` are now rejected before Redis caching.
The fetcher returns `null` → `cachedFetchJsonWithMeta` treats as a miss → falls
through to the next provider. Prevents empty-meaning entries from ever entering Redis.

**Client-side guard added (`summarization.ts`):**
`summaryResultBreaker` `shouldCache` now refuses to persist India results with
`meaning` empty/undefined to IndexedDB:
`shouldCache: (result) => result !== null && (SITE_VARIANT !== 'india' || Boolean(result.meaning))`

- [x] **TASK V2-002 COMPLETE** ✅
