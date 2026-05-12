# Task V2-011 — Pipeline Fixes (Data Loss + Warmup + Groq Auto-Enrich)
*SachNetra V2*

**Depends on**: V2-001 through V2-006 (complete)
**Estimated time**: 3–4 hours
**Prep doc**: `ai_docs/tasks/v2_architecture_analysis.md` + `ai_docs/ui-docs-reference/2conversaion.md`
**V1 or V2**: V2

---

## Context — Current State

Three confirmed bugs in the V2 intelligence pipeline:

**A. Data Loss**: `scripts/seed-india-signals.mjs` lines 171–176 check `isMarketMoving(title)` and `continue` (skip entirely) if false. Over 80% of headlines are dropped before reaching PostgreSQL. `is_market_moving` is hardcoded to `true` (line 200) — only market-moving items ever reach the DB.

**B. 25-Second Cold Start**: The India digest key `news:digest:v1:india:en` is NEVER pre-warmed by any cron. `seed-insights.mjs` (sacred — do not touch) only warms `news:digest:v1:full:en`. On every Redis cache miss (10-minute TTL), the Vercel edge function (`server/worldmonitor/news/v1/list-feed-digest.ts`) synchronously fetches 64 RSS feeds with a 25-second hard deadline. No Railway service runs for India digest warmup.

**C. Groq Enrichment is User-Gated**: The enrich queue (`news:enrich-queue:v1`) is only populated when a user clicks ✨ on a story (`server/worldmonitor/news/v1/summarize-article.ts` lines 218–228). Market-moving stories are never automatically Groq-enriched. `drainEnrichQueue()` in `seed-india-signals.mjs` lines 90–148 processes queue items but never calls Groq itself — it only applies already-computed Groq output.

**Pre-confirmed safe facts**:
- `persistSignals()` already uses `INSERT ... ON CONFLICT (headline_hash) DO NOTHING` — no schema change needed to store all headlines
- `entity_sentiment` JSONB column exists but is deferred — do NOT populate it in this task
- `GROQ_API_KEY` is available in Railway env (already used by `_sentiment-chain.mjs`)
- `API_BASE_URL` env var (default `https://api.worldmonitor.app`) is the pattern from `seed-insights.mjs`

---

## What This Task Does

- Removes the `isMarketMoving` gate from `seed-india-signals.mjs` so ALL headlines are stored with `is_market_moving` as a boolean flag.
- Makes sentiment scoring conditional — only market-moving items call `scoreWithFallbackChain()` (prevents cron timeout on 120+ items).
- Creates new `scripts/seed-india-digest.mjs` — standalone warmup cron that hits the India digest API endpoint every 8 minutes to keep Redis warm.
- Adds auto-push: after `persistSignals()`, market-moving items are pushed as `{ headline_hash, headline }` to `news:enrich-queue:v1`.
- Updates `drainEnrichQueue()` to handle two queue item types: Type A (from user ✨, already has Groq output) and Type B (from cron, raw headline that needs Groq call).
- Adds `callGroqEnrich(headline)` helper — minimal Groq call returning `{ companies, event_type, sentiment_label, sentiment_score }`.
- Adds `MAX_DRAIN_BATCH = 10` cap to bound Groq latency in drain (10 items × ~3s = ~30s max).
- Changes drain queue clear from `DEL` (wipes all) to `LTRIM MAX_DRAIN_BATCH -1` (removes only processed items, leaves overflow for next cycle).
- Adds `AND (sentiment_model IS NULL OR sentiment_model != 'groq-v2')` guard to drain UPDATE — prevents re-enriching already-processed rows.

---

## Success Criteria

This task is complete when ALL of the following are true:

- [ ] `node scripts/seed-india-signals.mjs` logs `Total rows: [N] | Market-moving: [M]` where N >> M (80%+ non-market-moving)
- [ ] PostgreSQL query `SELECT is_market_moving, COUNT(*) FROM india_news_signals WHERE scraped_at > NOW() - INTERVAL '15 minutes' GROUP BY is_market_moving` returns TWO rows (true + false)
- [ ] `node scripts/seed-india-digest.mjs` completes in <1s on warm cache (logs `CACHED`) and ~25s on cold (logs `REBUILT`)
- [ ] Enrich queue drain handles Type B items (cron-pushed) — Groq is called, PostgreSQL row is updated
- [ ] `npx biome check scripts/seed-india-signals.mjs scripts/seed-india-digest.mjs` shows 0 errors
- [ ] Railway service `seed-india-digest` created with `*/8 * * * *` schedule (Lijo to configure manually)

---

## Second-Order Impact

- **Affected consumers**: `seed-india-signals.mjs` only reads Redis + writes PostgreSQL. No frontend or API changes.
- **Performance**: Storing all headlines increases PostgreSQL writes by ~5x per cycle. ON CONFLICT DO NOTHING handles duplicates safely.
- **Groq cost**: Auto-push + drain adds up to 10 Groq calls per 10-minute cycle (bounded by MAX_DRAIN_BATCH). Acceptable for current usage.
- **Variant bleed risk**: None — all changes are in Railway scripts, not shared Vercel edge code.
- **New env vars needed**: `API_BASE_URL` in Railway for the warmup script (may already be present — check).

---

## Files To Open Before Starting

```
scripts/seed-india-signals.mjs          — main file for Phase 1 + Phase 3
scripts/_seed-utils.mjs                 — loadEnvFile, CHROME_UA, getRedisCredentials pattern
scripts/_sentiment-chain.mjs            — Groq call pattern to replicate in callGroqEnrich()
scripts/seed-insights.mjs               — warmDigestCache() pattern for Phase 2 (READ ONLY — sacred)
scripts/migrate-india-signals.mjs       — confirm entity_sentiment JSONB column is there (read only)
```

---

## Pattern To Follow

### Groq call pattern (from `_sentiment-chain.mjs`):
```javascript
const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama-3.1-8b-instant',
    temperature: 0,
    max_tokens: 200,
    messages: [/* ... */],
  }),
  signal: AbortSignal.timeout(10_000),
});
```

### Digest warmup pattern (from `seed-insights.mjs` warmDigestCache()):
```javascript
const resp = await fetch(`${apiBase}/api/news/v1/list-feed-digest?variant=india&lang=en`, {
  headers: { 'User-Agent': CHROME_UA },
  signal: AbortSignal.timeout(40_000),
});
```

### Redis RPUSH (single call for multiple items):
```javascript
body: JSON.stringify(['RPUSH', 'news:enrich-queue:v1', ...enrichItems]),
// enrichItems = array of JSON strings
```

### Redis LTRIM (trim processed items from queue head):
```javascript
body: JSON.stringify(['LTRIM', 'news:enrich-queue:v1', processedCount, -1]),
```

---

## Implementation

### Phase 1: Fix A — Remove Destructive Filter
**Goal**: Store ALL headlines in PostgreSQL. Market-moving is a flag, not a gate.

- [ ] **Step 1.1** — Add constant at top of file
  - File: `scripts/seed-india-signals.mjs`
  - What to do: Add `const MAX_DRAIN_BATCH = 10;` near the other constants at top of file

- [ ] **Step 1.2** — Fix the item loop in `fetchSignals()`
  - File: `scripts/seed-india-signals.mjs`
  - What to do: Find lines 171–210 (the `for (const item of items)` loop)
  - Change `if (!title || !isMarketMoving(title))` → `if (!title)`
  - After the if-block, add: `const marketMoving = isMarketMoving(title);`
  - Replace the single `const scored = await scoreWithFallbackChain(title);` call with:
    ```javascript
    let scored = null;
    if (marketMoving) {
      scored = await scoreWithFallbackChain(title);
      if (!scored) errors++;
    }
    ```
  - Change `is_market_moving: true` → `is_market_moving: marketMoving`
  - Remove the old `if (!scored) errors++;` line (it's now inside the if block)
  - Do not change anything else in this file yet.

- [ ] **Step 1.3** — Update the log line
  - File: `scripts/seed-india-signals.mjs`
  - Find the `console.log` that says `Market-moving:` (around line 212)
  - Change to: `console.log(\`  Total rows: ${rows.length} | Market-moving: ${rows.filter(r => r.is_market_moving).length} | Skipped (empty): ${skipped} | Score errors: ${errors}\`);`

---

### Phase 2: Fix B — India Digest Warmup Script
**Goal**: Pre-warm `news:digest:v1:india:en` on Railway so users never hit the 25-second cold build.

- [ ] **Step 2.1** — Create `scripts/seed-india-digest.mjs`
  - File: `scripts/seed-india-digest.mjs` (NEW)
  - Read `scripts/seed-insights.mjs` and `scripts/_seed-utils.mjs` first for the pattern
  - Structure:
    1. Import `loadEnvFile` and `CHROME_UA` from `./_seed-utils.mjs`
    2. Call `loadEnvFile(import.meta.url)` immediately
    3. Resolve `const apiBase = process.env.API_BASE_URL || 'https://api.worldmonitor.app';`
    4. `async function warmIndiaDigest()`:
       - GET `${apiBase}/api/news/v1/list-feed-digest?variant=india&lang=en`
       - Headers: `{ 'User-Agent': CHROME_UA }`
       - Timeout: `AbortSignal.timeout(40_000)` (generous for 25s build)
       - Measure duration: `const t0 = Date.now()` before fetch, `Date.now() - t0` after
       - Log: `India digest warm OK (${ms}ms) — ${ms > 5000 ? 'REBUILT' : 'CACHED'}` on success
       - Log: `console.warn('India digest warm failed: HTTP ${resp.status}')` on non-200
       - Catch errors: log warn, do not throw
    5. `async function main()`:
       - Log `=== India Digest Warmup ===`
       - `await warmIndiaDigest().catch(err => console.warn('Warm failed:', err.message))`
       - Log `=== Done ===`
       - `process.exit(0)` always (Railway cron must exit 0)
    6. `main();`

- [ ] **Step 2.2** — Railway setup (Lijo does this manually)
  - Create Railway service: `seed-india-digest`
  - Start command: `node scripts/seed-india-digest.mjs`
  - Cron schedule: `*/8 * * * *`
  - Env vars: inherit project env (ensure `API_BASE_URL` is set)

---

### Phase 3: Fix C — Auto-Push + Groq Drain
**Goal**: Market-moving stories get Groq-enriched automatically, not just on user clicks.

- [ ] **Step 3.1** — Add `callGroqEnrich()` helper
  - File: `scripts/seed-india-signals.mjs`
  - Add this function BEFORE `drainEnrichQueue()` (around line 88):
    ```javascript
    async function callGroqEnrich(headline) {
      const key = process.env.GROQ_API_KEY;
      if (!key) return null;
      try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            temperature: 0,
            max_tokens: 200,
            messages: [
              { role: 'system', content: 'Return ONLY valid JSON, no explanation.' },
              { role: 'user', content: `Analyze this financial headline:\n"${headline}"\n\nReturn JSON: {"companies": [], "event_type": "earnings|regulation|policy|merger|macro|management|other", "sentiment_label": "positive|negative|neutral", "sentiment_score": 0.0}` },
            ],
          }),
          signal: AbortSignal.timeout(10_000),
        });
        const data = await resp.json();
        return JSON.parse(data.choices?.[0]?.message?.content ?? 'null');
      } catch {
        return null;
      }
    }
    ```

- [ ] **Step 3.2** — Update `drainEnrichQueue()` — LRANGE cap
  - File: `scripts/seed-india-signals.mjs`
  - Find line 98: `body: JSON.stringify(['LRANGE', 'news:enrich-queue:v1', 0, -1])`
  - Change to: `body: JSON.stringify(['LRANGE', 'news:enrich-queue:v1', 0, MAX_DRAIN_BATCH - 1])`

- [ ] **Step 3.3** — Update drain item loop — Type A / Type B detection
  - File: `scripts/seed-india-signals.mjs`
  - Find the loop at lines 119–131. Replace the inner loop body entirely:
    ```javascript
    for (const raw of items) {
      try {
        const item = JSON.parse(raw);
        if (!item.headline_hash) continue;

        const isTypeA = item.sentiment_label !== undefined;
        const isTypeB = item.headline !== undefined && !isTypeA;

        let enriched = null;
        if (isTypeA) {
          enriched = {
            sentiment_label: item.sentiment_label,
            sentiment_score: item.sentiment_score,
            companies: item.companies ?? [],
            event_type: item.event_type,
          };
        } else if (isTypeB) {
          enriched = await callGroqEnrich(item.headline);
          if (enriched) enriched.companies = enriched.companies ?? [];
        }

        if (enriched) {
          const result = await pool.query(
            `UPDATE india_news_signals
             SET sentiment_label=$1, sentiment_score=$2, companies=$3,
                 event_type=$4, sentiment_model='groq-v2'
             WHERE headline_hash=$5
               AND (sentiment_model IS NULL OR sentiment_model != 'groq-v2')`,
            [enriched.sentiment_label, enriched.sentiment_score,
             enriched.companies, enriched.event_type, item.headline_hash]
          );
          if ((result.rowCount ?? 0) > 0) updated++;
        }
      } catch { /* skip malformed */ }
    }
    ```

- [ ] **Step 3.4** — Change `DEL` to `LTRIM` in drain
  - File: `scripts/seed-india-signals.mjs`
  - Find the `DEL` block (around lines 139–144): `body: JSON.stringify(['DEL', 'news:enrich-queue:v1'])`
  - Change to: `body: JSON.stringify(['LTRIM', 'news:enrich-queue:v1', items.length, -1])`
  - This removes only the processed items, leaving overflow for the next cycle.

- [ ] **Step 3.5** — Add auto-push AFTER `persistSignals()`
  - File: `scripts/seed-india-signals.mjs`
  - Find where `persistSignals(rows)` is called (likely in `runSeed()` or end of `fetchSignals()`)
  - Add this block immediately after `persistSignals(rows)` returns:
    ```javascript
    // Auto-push market-moving items to enrich queue for Groq enrichment
    const marketMovingRows = rows.filter(r => r.is_market_moving);
    if (marketMovingRows.length > 0) {
      const { url, token } = getRedisCredentials();
      const enrichItems = marketMovingRows.map(r =>
        JSON.stringify({ headline_hash: r.headline_hash, headline: r.headline })
      );
      await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['RPUSH', 'news:enrich-queue:v1', ...enrichItems]),
        signal: AbortSignal.timeout(5_000),
      }).catch(err => console.warn(`  [enrich] Auto-push failed (non-fatal): ${err.message}`));
      console.log(`  [enrich] Auto-pushed ${marketMovingRows.length} market-moving items to queue`);
    }
    ```
  - IMPORTANT: The `rows` objects must have a `headline` field. Confirm the `rows.push({...})` in `fetchSignals()` includes `headline: title`. If not, add it.

---

## Before / After

**Before** (filter in `seed-india-signals.mjs`):
```javascript
for (const item of items) {
  const title = (item.title || '').trim();
  if (!title || !isMarketMoving(title)) {
    skipped++;
    continue;
  }
  // ...
  const scored = await scoreWithFallbackChain(title);
  if (!scored) errors++;
  rows.push({ ..., is_market_moving: true, ... });
}
```

**After**:
```javascript
for (const item of items) {
  const title = (item.title || '').trim();
  if (!title) { skipped++; continue; }

  const marketMoving = isMarketMoving(title);
  // ...
  let scored = null;
  if (marketMoving) {
    scored = await scoreWithFallbackChain(title);
    if (!scored) errors++;
  }
  rows.push({ ..., is_market_moving: marketMoving, headline: title, ... });
}
```

---

## Error Scenarios

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| All rows have `is_market_moving = true` | Old code still running | Confirm `is_market_moving: marketMoving` line was changed |
| Cron times out | `scoreWithFallbackChain` called for all items | Confirm `if (marketMoving)` guard is in place |
| `India digest not found in Redis` error | Warmup script not running | Check Railway `seed-india-digest` service is active |
| Drain calls Groq but no DB update | Row already has `sentiment_model='groq-v2'` | Expected — the guard prevents re-enrichment |
| Groq returns null for Type B items | GROQ_API_KEY missing in Railway env | Add env var to Railway service |
| Queue grows unboundedly | LTRIM not applied, or script crashing before LTRIM | Check drain logs for error before LTRIM line |

---

## Environment Variables

| Variable | Where set | Purpose |
|----------|----------|---------|
| `GROQ_API_KEY` | Railway (already present) | Groq API for `callGroqEnrich()` in drain |
| `API_BASE_URL` | Railway (may need adding) | Digest endpoint for warmup script |
| `DATABASE_PUBLIC_URL` | Railway (already present) | PostgreSQL pool in drain |
| `UPSTASH_REDIS_REST_URL` | Railway (already present) | Redis for auto-push + drain |
| `UPSTASH_REDIS_REST_TOKEN` | Railway (already present) | Redis auth |

---

## Read vs Write

**READ for reference (always allowed):**
- `scripts/seed-insights.mjs` — study warmDigestCache() pattern, never write (SACRED)
- `scripts/_sentiment-chain.mjs` — study Groq call pattern
- `scripts/_india-market-keywords.mjs` — understand isMarketMoving()
- `scripts/migrate-india-signals.mjs` — confirm entity_sentiment column (do NOT populate it)
- `server/worldmonitor/news/v1/list-feed-digest.ts` — understand what the warmup call triggers (read only)

**WRITE only to:**
- `scripts/seed-india-signals.mjs`
- `scripts/seed-india-digest.mjs` (new file)

**Never write to:**
- `src/config/variants/full.ts` — sacred
- `src/config/variants/tech.ts` — sacred
- `src/config/variants/finance.ts` — sacred
- `scripts/seed-insights.mjs` — sacred
- `server/worldmonitor/news/v1/list-feed-digest.ts` — out of scope
- `server/worldmonitor/news/v1/summarize-article.ts` — out of scope (user ✨ path unchanged)

---

## Verify

```bash
npx biome check scripts/seed-india-signals.mjs scripts/seed-india-digest.mjs
node scripts/seed-india-digest.mjs   # Should complete; log REBUILT or CACHED
node scripts/seed-india-signals.mjs  # Check logs for Total rows >> Market-moving count
```

PostgreSQL (Railway console):
```sql
SELECT is_market_moving, COUNT(*)
FROM india_news_signals
WHERE scraped_at > NOW() - INTERVAL '15 minutes'
GROUP BY is_market_moving;
-- Must return 2 rows: true (small) and false (larger)
```

Enrich queue drain test (push a fake Type B item to Redis, then run script):
```
RPUSH news:enrich-queue:v1 '{"headline_hash":"test_hash_001","headline":"Reliance posts 20% profit surge in Q4"}'
```
Then run `node scripts/seed-india-signals.mjs` — drain should call Groq and log `Updated 1/1 rows`.

### Debugging Checklist

1. **Log: `Total rows: 0`** — Redis digest is empty. Run `node scripts/seed-india-digest.mjs` first to warm it.
2. **Log: `Market-moving: [same as Total rows]`** — filter change didn't apply. Check line 173.
3. **Log: `[enrich] Draining 0 items`** — nothing in queue yet. Normal on first run after Phase 3.
4. **Groq returns null in drain** — check GROQ_API_KEY in env. Add `console.log(!!process.env.GROQ_API_KEY)` temporarily.
5. **LTRIM error** — Upstash may require integer args. Confirm `items.length` is a number, not string.

---

## Completion Log

- [ ] Phase 1 complete — [timestamp]
- [ ] Phase 2 complete — [timestamp]
- [ ] Phase 3 complete — [timestamp]
- [ ] Biome: 0 errors — [timestamp]
- [ ] PostgreSQL shows both `true` + `false` rows — [timestamp]
- [ ] Drain handles Type B items (Groq called) — [timestamp]
- [ ] Railway `seed-india-digest` service created — [Lijo to confirm]
- [ ] **TASK V2-011 COMPLETE** ✅
