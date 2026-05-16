# Task V2-012 — Autonomous India Intelligence Pipeline
*SachNetra V2*

**Depends on**: V2-011 complete
**Estimated time**: 6–7 hours
**Prep doc**: `ai_docs/tasks/v2_architecture_analysis.md`, architecture diagrams (Images 10 + 11)
**V1 or V2**: V2

---

## Post-Implementation Corrections (2026-05-16)

> Implemented & validated in production 2026-05-16. This section records where the spec
> below diverged from reality. **Read this before following any step.** V2-013 and V2-014
> extend several of these same files and inherit these corrections.
>
> Status: all 7 code phases complete; pending operator sign-off (DB/Redis success-criteria
> spot-checks) + Step 6.2 Railway service removal. Actual effort ≫ the 6–7 h estimate —
> C4 was an unscoped redesign.

### C1 — Phase 1 migration must `ALTER`, not just `CREATE` (blocker)
`migrate-india-signals.mjs` only runs `CREATE TABLE IF NOT EXISTS`. The table already
exists and is populated, so that is a **no-op** — the 5 columns are NOT added and Step
1.2's "✓ Verified: 26 columns present" never happens (stays 21).
**Fix:** Step 1.1's "Do not change anything else in this file" is wrong. Append after the
`CREATE TABLE` block (keep the columns in `CREATE TABLE` too, for fresh installs):
```sql
ALTER TABLE india_news_signals ADD COLUMN IF NOT EXISTS ai_summary   TEXT DEFAULT NULL;
ALTER TABLE india_news_signals ADD COLUMN IF NOT EXISTS ai_meaning   TEXT DEFAULT NULL;
ALTER TABLE india_news_signals ADD COLUMN IF NOT EXISTS cluster_hash TEXT DEFAULT NULL;
ALTER TABLE india_news_signals ADD COLUMN IF NOT EXISTS feed_bucket  TEXT DEFAULT NULL;
ALTER TABLE india_news_signals ADD COLUMN IF NOT EXISTS thread_id    UUID DEFAULT NULL;
```
**V2-013/V2-014 extend this file — use create-then-`ALTER` for all new columns/tables.**

### C2 — Phase 2: `_feeds.ts` india has 5 buckets, schema allows 4
Live `_feeds.ts` `india:` includes a `government` bucket (DD News, PIB, MEA, MHA, NDMA)
not mentioned in Step 2.1; the Redis schema + `feed_bucket` contract permit only
`politics|economy|technology|disaster`.
**Fix:** full mirror chosen (~69 feeds); `government` remapped — DD News/PIB/MEA/MHA →
`politics`, NDMA → `disaster`. No 5th bucket. Step 5.1: import only `getAllFeeds` (not
`INDIA_FEEDS` — unused import is a biome error).

### C3 — Phase 4: Step 4.2 smoke expectation #3 is wrong
`"Mumbai floods displace thousands"` → **`info/general`**, not `medium/disaster`. `flood`
∈ `SHORT_KEYWORDS`, so its regex is `\bflood\b`, which does not match the plural
`"floods"`; `flooding` is a separate keyword. The port is faithful to `_classifier.ts`;
the expectation was hand-written without accounting for word-boundary short keywords.
**Fix:** use singular fixture `"Mumbai flood displaces thousands"` (→ `medium/disaster`)
or change the expected value to `info/general`.

### C4 — Phase 5: inline single-pass does not scale; redesigned to capture→enrich
Step 5.7's inline "Groq per new cluster" + single end-persist, and Second-Order Impact's
"~8–12 clusters per cycle," assumed the small starter feed list. The full 69-feed mirror
yields ~289 clusters; cold start = 289 sequential Groq+sentiment calls → cron timeout +
`runSeed` 3× retry storm with nothing persisted (observed in prod).
**Fix (implemented):**
- **Tier 1 capture** — dedup exact normalized-title reposts → cluster → tag (free keyword
  stack) → persist *all* rows immediately (idempotent `ON CONFLICT`). Completes in seconds.
- **Tier 2 enrich** — gate = `isMarketMoving` ∧ not true `EXCLUSIONS` noise ∧ not
  already-enriched; rank by `scoreImportance`; cap **60**/run; concurrency **8**;
  `scoreWithFallbackChain` + Groq → `UPDATE` primary rows (preserves user `groq-v2`).
- **Re-enrich-aware skip-known** replaces `skipKnownClusters`: "known" = primary row has
  `ai_summary` within 48 h. Market-moving clusters captured without `ai_summary` are
  retried next run until enriched or aged out. No coverage loss; backlog drains across runs.
- Resolves the **Step 5.7 vs Cluster Data Contract** contradiction in favour of the
  Contract (ai columns only for market-moving).
- `EXCLUSIONS` now **exported** from `_classifier.mjs` (data only; mirrors the TS const).
  Gate uses a true-noise check, not `level !== 'info'` (the latter also discards
  uncategorized market headlines — proven in prod: forced candidates to 0).
- Added `recordCount: d => d.inserted` to `runSeed` opts (else `seed_complete` /
  `seed-meta` report 0; health checks read it).

### C5 — Env: new variable (spec says "none")
"Environment Variables: No new env vars required" is outdated. **`GROQ_API_KEY_2`**
(optional) — second Groq key used by `callGroqForCluster` only on 429/5xx/network
failover; absent ⇒ single-key behavior. ToS caveat for multiple free-tier keys;
OpenRouter provider-failover is the sturdier long-term path (follow-up, out of scope).
`_sentiment-chain.mjs` deliberately NOT modified (out of V2-012 write scope).

### C6 — Phase 7: task's draft `cachedFetchJson(...,()=>null)` is unsafe — confirmed
The task asked to verify whether `cachedFetchJson` caches the null. **It does:** on a
`null` builder it writes a `__WM_NEG__` sentinel into the *same* key
(`news:digest:v1:india:en`) for 120 s and returns `null` for it thereafter — the first
Vercel cache-miss would clobber the Railway digest and starve the live site.
**Fix (implemented):** use the direct reader `getCachedJson(digestCacheKey)` (no write,
no sentinel, no rebuild) + a `'categories' in fresh` shape guard (also rejects legacy
sentinels). This is the task's own documented fallback path.

### Follow-ups (NOT V2-012 scope)
- Under-clustering (~289 clusters / 300 items): Jaccard 0.5 rarely merges reworded
  cross-outlet headlines → **V2-013** (entity/thread linking).
- `isMarketMoving` ~3 % hit rate: taxonomy tuning — separate task.
- `[enrich] Updated 0/N` Type-A drain mismatch: pre-existing logic; verify in DB.
- OpenRouter provider failover for Groq (sturdier than `GROQ_API_KEY_2`, no ToS question).

---

## Context Manifest
*Read these BEFORE any code work. Skip the "Don't load" list to save tokens.*

### Load (in order)
1. `CLAUDE.md` — auto-loaded; verify Sacred Files list matches Phase 6's `seed-insights.mjs` reference
2. `.agents/rules/sachnetra-boundaries.md` — sacred-file rules (this task touches `_clustering.mjs` which `seed-insights.mjs` depends on — high bleed risk)
3. `.agents/rules/sachnetra-patterns.md` — `runSeed()` shape, `extraKeys` pattern (Phase 5.8 depends on this)
4. `ai_docs/tasks/v2_architecture_analysis.md` — prep doc; the architecture diagram (Images 10+11) this task implements
5. **Wiki — required reading:**
   - `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_sentiment_architecture.md` — why the pipeline writes to PostgreSQL + Redis independently
   - `ai_docs/sachnetra v2/wiki/syntheses/V2_001_implementation_context.md` — engineering standards inherited from V2-001
6. **Code files** — see "Files To Open Before Starting" section below

### Don't load (not relevant — skip to keep context tight)
- `ai_docs/prep/*` — V1 docs, superseded
- `wiki/concepts/{compounding,inflation,interest_rates,bonds_and_yields}.md` — domain knowledge, not needed for pipeline engineering
- `wiki/playbooks/personal_investing.md` — strategy, not engineering
- `ai_docs/dev_templates/*` — this task already exists; no template work needed
- All `tasks/00*_*.md` (V1 numeric tasks) — archived

### Skill / template lineage
- Generated by: `ai_docs/dev_templates/adapt_sprint_task.md` (or `/task` skill)
- Bugfix during execution: use `/bugfix` skill (loads `ai_docs/dev_templates/bugfix.md`)
- Commit at end: use `/git` skill (loads `ai_docs/dev_templates/git_workflow_commit.md`)

---

## Context — Current State

`seed-india-signals.mjs` reads from Redis key `news:digest:v1:india:en`, which is only
populated when `seed-india-digest.mjs` (warmup cron) or a user visit triggers Vercel to
fetch RSS. If the warmup cron is not deployed or fails, PostgreSQL gets no data for that
day — the root bug confirmed in production (2026-05-14: zero rows for the full day).

The architecture in this task eliminates that dependency completely. The signals cron
fetches RSS directly on Railway, writes to both PostgreSQL and Redis independently of
any user activity or Vercel availability.

**Files in their current state:**
- `scripts/seed-india-signals.mjs` — reads Redis, stores per-headline rows, no clustering
- `scripts/seed-india-digest.mjs` — warmup cron, calls Vercel API every 8 min
- `scripts/_clustering.mjs` — Jaccard clustering used by sacred `seed-insights.mjs`; keyword lists are global
- `scripts/migrate-india-signals.mjs` — DDL has 21 columns, missing ai_summary/ai_meaning/cluster_hash/feed_bucket/thread_id
- `server/worldmonitor/news/v1/list-feed-digest.ts` — cache miss triggers 25s RSS rebuild
- `server/worldmonitor/news/v1/_classifier.ts` — keyword threat classifier; needs an mjs sibling

---

## What This Task Does

- Adds 5 new columns to `india_news_signals`: `ai_summary`, `ai_meaning`, `cluster_hash`, `feed_bucket`, `thread_id` (nullable, reserved for V2-013 story threads — see `wiki/syntheses/cluster_story_entity_architecture.md`)
- Creates `scripts/_india-feeds.mjs` — India feed list with direct RSS URLs, category-tagged
- Refactors `scripts/_clustering.mjs` to take India-specific keywords via an **options bag** — sacred `seed-insights.mjs` keeps its current behavior unchanged
- Creates `scripts/_classifier.mjs` — mjs port of `_classifier.ts`'s `classifyByKeyword()`, so threat levels stay semantically correct in the Railway-written digest
- Rebuilds `scripts/seed-india-signals.mjs` to fetch RSS directly → cluster → skip known (by primary-title hash) → Groq per new cluster → write Postgres + Redis via `runSeed` extraKeys
- Keeps `drainEnrichQueue()` and its Type A path — Vercel ✨ button still pushes user enrichments. Removes only the dead Type B branch and `callGroqEnrich()` helper
- Retires `scripts/seed-india-digest.mjs` — signals cron now owns Redis writing
- Simplifies India cache-miss path in `list-feed-digest.ts` — never rebuilds; serves Redis → in-memory fallback → empty response

---

## drainEnrichQueue() — Explicit Decision

**Keep drainEnrichQueue. Keep Type A. Delete Type B branch and `callGroqEnrich()`.**

**Why**: `server/worldmonitor/news/v1/summarize-article.ts` (lines 47–60) actively pushes Type A items
(payloads carrying `sentiment_label`, `sentiment_score`, `companies`, `event_type`) to
`news:enrich-queue:v1` every time a user clicks ✨ on an article card. If the drain is removed:

- Items accumulate in Redis forever (no consumer)
- Memory grows; LRANGE/RPUSH eventually slow
- User enrichments never reach PostgreSQL — ✨ silently broken end-to-end

**Why remove Type B**: Type B was the "headline-only" code path that would call Groq from
inside the drain. Nothing in production pushes Type B today (`summarize-article.ts` always
includes `sentiment_label`). Removing it eliminates dead code and a duplicate Groq call site.

After this task: `drainEnrichQueue()` UPDATEs PostgreSQL rows from Type A payloads only.
The new per-cluster Groq call (Phase 5) is the *only* place Railway calls Groq.

---

## Success Criteria

This task is complete when ALL of the following are true:

- [ ] `node scripts/migrate-india-signals.mjs` runs cleanly; `ai_summary`, `ai_meaning`, `cluster_hash`, `feed_bucket`, `thread_id` columns exist in Railway PostgreSQL
- [ ] `node scripts/seed-india-signals.mjs` completes without reading Redis at all — logs `[rss] Fetched N items from M feeds`
- [ ] Railway logs show `[cluster] N new clusters | M skipped (known)` on every run
- [ ] Railway logs show `[groq] Called for N clusters` — never more than new cluster count
- [ ] `SELECT cluster_hash, ai_summary, feed_bucket FROM india_news_signals WHERE ai_summary IS NOT NULL LIMIT 5` returns rows
- [ ] After one cron run, `GET news:digest:v1:india:en` from Redis returns valid JSON matching the schema in this task file
- [ ] Redis JSON has `categories`, `feedStatuses`, `generatedAt`. Sampled `threat.level` values include `THREAT_LEVEL_CRITICAL` / `_HIGH` / `_MEDIUM` / `_LOW` / `_UNSPECIFIED` — not 100% UNSPECIFIED
- [ ] `node scripts/seed-india-signals.mjs` followed immediately by another run on the same headlines: second run skips all clusters from the first (48h window + stable primary-title hash)
- [ ] Add a single sentence to a primary headline of an existing cluster (e.g., via test fixture) and rerun — the cluster is still recognized as known (hash is title-normalized, not membership-dependent)
- [ ] `npx biome check scripts/seed-india-signals.mjs scripts/_india-feeds.mjs scripts/_clustering.mjs scripts/_classifier.mjs` shows 0 errors
- [ ] `npm run typecheck` shows 0 errors (list-feed-digest.ts change)
- [ ] `git diff src/services/clustering.ts` is empty — SPA clustering untouched
- [ ] `git diff scripts/seed-insights.mjs` is empty — sacred file untouched
- [ ] `node scripts/seed-insights.mjs` still runs without error after `_clustering.mjs` refactor (signature change is backward-compatible via default options)

---

## Second-Order Impact

- **Affected consumers**: `list-feed-digest.ts` India cache-miss path changes; all other paths untouched. `seed-insights.mjs` consumes `_clustering.mjs` and must keep its current behavior — refactor is backward-compatible (no opts = world-monitor defaults).
- **Performance**: Redis write happens at end of each 10-min cron run via `runSeed` extraKeys. UI reads unchanged.
- **Groq cost**: 1 call per NEW cluster per 10-min cycle. Max ~8–12 clusters per cycle. Acceptable.
- **Variant bleed risk**: Eliminated by Fix #1 — India keyword lists never enter the global module.
- **event_category semantic stability**: `event_category` continues to mean "classifier output" (`conflict`, `disaster`, etc.). New column `feed_bucket` carries the source bucket (`politics`, `economy`, `technology`, `disaster`). Downstream analytics on `event_category` keep working.
- **New env vars needed**: None — all vars already present in Railway.
- **`seed-india-digest.mjs` retirement**: Remove from Railway services after deploying V2-012. Do NOT delete the file — rename it with a `_retired_` prefix comment at top.

---

## Redis JSON Schema — Source of Truth

The mjs cron's digest payload (written via `runSeed`'s `extraKeys` option) MUST produce this exact shape.
The consuming code is `list-feed-digest.ts` — it reads this key and returns it directly to the
browser. A field name or type mismatch causes silent broken UI cards with no error thrown.

```json
{
  "categories": {
    "politics": {
      "items": [
        {
          "source": "NDTV",
          "title": "string — the primary cluster headline",
          "link": "https://...",
          "publishedAt": 1747234567000,
          "isAlert": false,
          "threat": {
            "level": "THREAT_LEVEL_HIGH",
            "category": "conflict",
            "confidence": 0.8,
            "source": "keyword"
          },
          "locationName": ""
        }
      ]
    },
    "economy": { "items": [] },
    "technology": { "items": [] },
    "disaster": { "items": [] }
  },
  "feedStatuses": {
    "NDTV": "ok",
    "The Hindu": "empty",
    "LiveMint": "timeout"
  },
  "generatedAt": "2026-05-15T10:00:00.000Z"
}
```

**Field contracts — these are not optional:**

| Field | Type | Rule |
|---|---|---|
| `publishedAt` | number | Unix **milliseconds** — `new Date(pubDate).getTime()`. Never ISO string |
| `locationName` | string | Always `""` — always present, never null or omitted |
| `scrapedAt` | — | Does NOT appear in Redis JSON — internal only |
| `threat.level` | string | Must use proto enum: `THREAT_LEVEL_CRITICAL` / `_HIGH` / `_MEDIUM` / `_LOW` / `_UNSPECIFIED`. Must come from `classifyByKeyword()` mjs port — NOT hardcoded |
| `threat.category` | string | From classifier output: `conflict`, `protest`, `disaster`, `diplomatic`, `economic`, `terrorism`, `cyber`, `health`, `environmental`, `military`, `crime`, `infrastructure`, `tech`, `general` |
| `threat.source` | string | Only `"keyword"` or `"llm"` — no other values |
| `feedStatuses` | object | Every feed in `_india-feeds.mjs` must have a key: `"ok"`, `"empty"`, or `"timeout"` |
| `generatedAt` | string | ISO 8601 UTC — `new Date().toISOString()` |

**Threat level mapping (from `LEVEL_TO_PROTO` in list-feed-digest.ts):**
```js
const LEVEL_TO_PROTO = {
  critical: 'THREAT_LEVEL_CRITICAL',
  high:     'THREAT_LEVEL_HIGH',
  medium:   'THREAT_LEVEL_MEDIUM',
  low:      'THREAT_LEVEL_LOW',
  info:     'THREAT_LEVEL_UNSPECIFIED',
};
```

The mjs port (`_classifier.mjs`) must export an identical mapping. Default to
`'THREAT_LEVEL_UNSPECIFIED'` only when `classifyByKeyword()` returns `level: 'info'`.

---

## Cluster Data Contract

`india_news_signals` is per-headline. A cluster covers N headlines.

**`cluster_hash` is derived from the primary (representative) title only**, not from cluster
membership. This guarantees the hash is stable across runs even when cluster size shifts as
new headlines arrive. Definition:

```js
function normalizeTitle(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clusterHash(primaryTitle) {
  return createHash('sha256')
    .update(normalizeTitle(primaryTitle))
    .digest('hex')
    .slice(0, 16);
}
```

**Row population rules:**
- **Primary row** (`sorted[0]` from `clusterItems()`): gets `ai_summary`, `ai_meaning`, AND `cluster_hash`, AND `feed_bucket` populated
- **Secondary rows** (all other headlines in the cluster): get `cluster_hash` and `feed_bucket` populated — `ai_summary` and `ai_meaning` stay `NULL`

To query all headlines in a cluster:
```sql
SELECT * FROM india_news_signals WHERE cluster_hash = $1;
```

To get the summary for a cluster:
```sql
SELECT ai_summary, ai_meaning
FROM india_news_signals
WHERE cluster_hash = $1 AND ai_summary IS NOT NULL
LIMIT 1;
```

Single-headline stories (cluster of 1) are treated the same — they get all four columns populated if they are new and pass the market-moving check.

**Note on `event_category` vs `feed_bucket`:**
- `event_category` (existing column) = classifier output, e.g. `conflict`, `disaster`, `economic`
- `feed_bucket` (NEW column) = source category from `_india-feeds.mjs`, e.g. `politics`, `economy`, `technology`, `disaster`

These mean different things. Do not collapse them.

---

## Files To Open Before Starting

```
scripts/seed-india-signals.mjs          — file being rebuilt (read current state first)
scripts/_clustering.mjs                 — file being refactored to opts-bag (read keyword lists carefully)
scripts/migrate-india-signals.mjs       — DDL to extend with 5 new columns
scripts/seed-india-digest.mjs           — file being retired (read before marking retired)
scripts/_seed-utils.mjs                 — getRedisCredentials(), CHROME_UA, runSeed(), extraKeys pattern
scripts/_india-market-keywords.mjs      — isMarketMoving(), extractCompanies(), extractSectors()
scripts/_sentiment-chain.mjs            — scoreWithFallbackChain() — still used per new cluster
scripts/seed-insights.mjs               — READ ONLY; confirm refactored _clustering.mjs API stays compatible
server/worldmonitor/news/v1/list-feed-digest.ts  — read India cache-miss path (lines 279–301)
server/worldmonitor/news/v1/_classifier.ts       — source of truth for _classifier.mjs port
server/worldmonitor/news/v1/summarize-article.ts — confirm Type A push site (lines 47–60)
```

**NEVER open for writing:**
```
src/services/clustering.ts              — SPA frontend clustering, completely separate system
src/config/variants/full.ts             — sacred
src/config/variants/tech.ts             — sacred
src/config/variants/finance.ts          — sacred
scripts/seed-insights.mjs               — sacred
server/worldmonitor/news/v1/_classifier.ts  — TS source of truth; mjs port lives separately
```

---

## Pattern To Follow

### RSS fetch pattern (from `list-feed-digest.ts` fetchRssText):
```js
const resp = await fetch(url, {
  headers: {
    'User-Agent': CHROME_UA,
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
  signal: AbortSignal.timeout(8_000),
});
if (!resp.ok) return null;
return await resp.text();
```

### fast-xml-parser usage (already installed, package.json):
```js
import { XMLParser } from 'fast-xml-parser';
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const parsed = parser.parse(xmlText);
const items = parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? [];
```

### Redis write pattern — via runSeed `extraKeys`:
Do NOT raw-fetch Redis from inside `fetchSignals()`. Use `runSeed`'s built-in publish path
(`extraKeys` option) so payload size guards, validation, and locking apply.

```js
runSeed('india', 'signals', CANONICAL_KEY, fetchSignals, {
  validateFn,
  ttlSeconds: CACHE_TTL,
  sourceVersion: 'autonomous-v1',
  extraKeys: [
    { key: DIGEST_KEY, ttl: DIGEST_TTL, transform: (data) => data.digest },
  ],
});
```

`fetchSignals` returns `{ processed, marketMoving, inserted, ..., digest }`; the transform
extracts the digest shape for the second key.

### Groq call pattern (from `_sentiment-chain.mjs`):
```js
const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama-3.1-8b-instant',
    temperature: 0,
    max_tokens: 300,
    messages: [...],
  }),
  signal: AbortSignal.timeout(10_000),
});
```

---

## Implementation

> ⚠️ Read **Post-Implementation Corrections (2026-05-16)** near the top of this doc before
> executing any phase. C1 (Phase 1) and C6 (Phase 7) are blockers; C4 (Phase 5) is a redesign.

### Phase 1: Schema Migration
**Goal**: Add 5 new columns to `india_news_signals` (`ai_summary`, `ai_meaning`, `cluster_hash`, `feed_bucket`, `thread_id`).

`thread_id` is added now but stays NULL throughout V2-012 — it's reserved for V2-013 (story
threads). Adding it now avoids an expensive migration on a populated table later. See
`ai_docs/sachnetra v2/wiki/syntheses/cluster_story_entity_architecture.md` for the rationale.

- [ ] **Step 1.1** — Extend DDL in `scripts/migrate-india-signals.mjs`
  - File: `scripts/migrate-india-signals.mjs`
  - Add to the `DDL` constant, after the `entity_sentiment JSONB` line:
    ```sql
    ai_summary     TEXT DEFAULT NULL,
    ai_meaning     TEXT DEFAULT NULL,
    cluster_hash   TEXT DEFAULT NULL,
    feed_bucket    TEXT DEFAULT NULL,
    thread_id      UUID DEFAULT NULL,
    ```
  - Note: no `REFERENCES story_threads(thread_id)` FK yet — the `story_threads` table does not exist until V2-013. The column is a plain nullable UUID for now; V2-013 will add the FK constraint and start populating it.
  - Add after the existing index definitions:
    ```sql
    CREATE INDEX IF NOT EXISTS idx_signals_cluster
      ON india_news_signals (cluster_hash, scraped_at DESC)
      WHERE cluster_hash IS NOT NULL;
    ```
  - Do not change anything else in this file.

- [ ] **Step 1.2** — Run migration
  - Command: `node scripts/migrate-india-signals.mjs`
  - Expected: logs `✓ Table created` or `already exists`, then `✓ Verified: 26 columns present`
  - Verify in Railway console:
    ```sql
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'india_news_signals'
    ORDER BY ordinal_position;
    ```
    Must include all four new columns.

---

### Phase 2: India Feed List
**Goal**: Create `scripts/_india-feeds.mjs` — the Railway feed registry with direct RSS URLs and category tags.

- [ ] **Step 2.1** — Create `scripts/_india-feeds.mjs`
  - File: `scripts/_india-feeds.mjs` (NEW)
  - Structure: export `INDIA_FEEDS` object with category buckets matching `_feeds.ts` india section (`politics`, `economy`, `technology`, `disaster`)
  - Each feed entry shape: `{ name: string, url: string, type: 'direct' | 'google-news', category: string }`
  - `type: 'direct'` feeds are fetched normally; `type: 'google-news'` feeds get empty-response detection
  - Prefer direct RSS URLs over `gnIn()` where available. Known direct URLs to use:
    ```
    Economic Times:      https://economictimes.indiatimes.com/rssfeedsdefault.cms
    Business Standard:   https://www.business-standard.com/rss/home_page_top_stories.rss
    Indian Express:      https://indianexpress.com/feed/
    NDTV:                https://feeds.feedburner.com/ndtvnews-top-stories
    The Hindu:           https://www.thehindu.com/news/feeder/default.rss
    BusinessToday:       https://www.businesstoday.in/rssfeeds/?id=home
    Hindu Business Line: https://www.thehindubusinessline.com/?service=rss
    YourStory:           https://yourstory.com/feed
    Inc42:               https://inc42.com/feed/
    ```
  - For sources with no known direct URL, keep `gnIn()` with `type: 'google-news'`
  - Export helper: `export function getAllFeeds() { return Object.values(INDIA_FEEDS).flat(); }`

  Example structure:
  ```js
  const gnIn = (q) =>
    `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en&gl=IN&ceid=IN:en`;

  export const INDIA_FEEDS = {
    economy: [
      { name: 'Economic Times', url: 'https://economictimes.indiatimes.com/rssfeedsdefault.cms', type: 'direct', category: 'economy' },
      { name: 'LiveMint', url: gnIn('site:livemint.com'), type: 'google-news', category: 'economy' },
      // ...
    ],
    politics: [...],
    technology: [...],
    disaster: [...],
  };
  ```

  Add a sync comment at top of file:
  ```js
  // SYNC: When adding India feeds here, also update server/worldmonitor/news/v1/_feeds.ts
  // india: section. These two lists serve different consumers but must stay aligned.
  // TODO(post-V2-012): consolidate to a shared JSON manifest both files import.
  ```

---

### Phase 3: Refactor `_clustering.mjs` to Options Bag (No Global Mutation)
**Goal**: Make India-specific keyword changes additive via a per-call options bag.
`seed-insights.mjs` keeps current behavior with zero changes.

- [ ] **Step 3.1** — Change `clusterItems()` signature
  - File: `scripts/_clustering.mjs`
  - Current signature: `export function clusterItems(items)`
  - New signature: `export function clusterItems(items, opts = {})`
  - `opts` is optional. When omitted, all behavior is identical to today.
  - Recognized fields (all optional):
    ```js
    {
      includeClusterHash: false,   // when true, returned object includes clusterHash + allTitles
    }
    ```

- [ ] **Step 3.2** — Change `scoreImportance()` signature
  - File: `scripts/_clustering.mjs`
  - Current signature: `export function scoreImportance(cluster)`
  - New signature: `export function scoreImportance(cluster, opts = {})`
  - Recognized fields (all optional):
    ```js
    {
      demoteKeywords: DEFAULT_DEMOTE_KEYWORDS,         // override list
      flashpointKeywords: DEFAULT_FLASHPOINT_KEYWORDS, // override list
    }
    ```
  - Rename module-level constants from `DEMOTE_KEYWORDS` → `DEFAULT_DEMOTE_KEYWORDS` and
    `FLASHPOINT_KEYWORDS` → `DEFAULT_FLASHPOINT_KEYWORDS`. Export both.
  - `scoreImportance` reads `opts.demoteKeywords ?? DEFAULT_DEMOTE_KEYWORDS` (same for flashpoint).
  - `selectTopStories` signature unchanged externally; pass an internal `opts` argument through if needed.

- [ ] **Step 3.3** — Add `cluster_hash` derivation inside `clusterItems()`
  - File: `scripts/_clustering.mjs`
  - Add `import { createHash } from 'node:crypto';` at top of file
  - Add helper:
    ```js
    function normalizeTitle(title) {
      return (title || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function computeClusterHash(primaryTitle) {
      return createHash('sha256')
        .update(normalizeTitle(primaryTitle))
        .digest('hex')
        .slice(0, 16);
    }
    ```
  - In the `clusters.map(group => {...})` return block, conditionally add fields ONLY when `opts.includeClusterHash === true`:
    ```js
    const base = {
      primaryTitle: primary.title,
      primarySource: primary.source,
      primaryLink: primary.link,
      pubDate: primary.pubDate,
      sourceCount: group.length,
      isAlert: group.some(i => i.isAlert),
    };
    if (opts.includeClusterHash) {
      base.clusterHash = computeClusterHash(primary.title);
      base.allTitles = group.map(i => i.title || '');
      base.allItems = group;  // needed to write secondary rows with full metadata
    }
    return base;
    ```
  - Default shape (when `opts.includeClusterHash` is falsy) is byte-identical to today's output. `seed-insights.mjs` is unaffected.

- [ ] **Step 3.4** — Sanity check `seed-insights.mjs` behavior
  - Do NOT modify `seed-insights.mjs`.
  - Run `node scripts/seed-insights.mjs` locally (dry-run if available, otherwise full run).
  - Confirm logs and Redis output match a known-good baseline. If any field is missing, your refactor broke the default code path — fix before continuing.

---

### Phase 4: Port Classifier to mjs
**Goal**: Threat levels in the Railway-written Redis digest come from the same keyword
classifier the Vercel `buildDigest()` uses. UI cards keep their visual semantics.

- [ ] **Step 4.1** — Create `scripts/_classifier.mjs` (NEW)
  - File: `scripts/_classifier.mjs`
  - Port `classifyByKeyword()` from `server/worldmonitor/news/v1/_classifier.ts`:
    - Copy `CRITICAL_KEYWORDS`, `HIGH_KEYWORDS`, `MEDIUM_KEYWORDS`, `LOW_KEYWORDS`, `EXCLUSIONS`, `SHORT_KEYWORDS` verbatim (drop TypeScript types)
    - Port `getKeywordRegex()` + `matchKeywords()` verbatim
    - Port `classifyByKeyword(title, variant)` — keep `variant` parameter even though we always pass `'india'` (so the TECH_* branches are reachable for future variants)
    - Tech-only keyword maps (`TECH_HIGH_KEYWORDS` etc.) — copy verbatim; never triggered for india, but keeps parity with the TS file
  - Add at bottom:
    ```js
    export const LEVEL_TO_PROTO = {
      critical: 'THREAT_LEVEL_CRITICAL',
      high:     'THREAT_LEVEL_HIGH',
      medium:   'THREAT_LEVEL_MEDIUM',
      low:      'THREAT_LEVEL_LOW',
      info:     'THREAT_LEVEL_UNSPECIFIED',
    };
    ```
  - Add a sync comment at top:
    ```js
    // SYNC: Port of server/worldmonitor/news/v1/_classifier.ts classifyByKeyword().
    // When updating keyword lists in either file, mirror the change here.
    // TODO(post-V2-012): consolidate to a shared JSON keyword manifest both files import.
    ```

- [ ] **Step 4.2** — Smoke test the port
  - Run a small ad-hoc check: feed 5 known India headlines through `classifyByKeyword()` from
    `_classifier.mjs` and confirm each produces the expected `(level, category)`. Examples:
    - `"Pakistan launches missile strike on India"` → `high` / `military` (HIGH_KEYWORDS: `missile`)
    - `"Sensex hits new high as Nifty rallies"` → `low` / `economic` (LOW_KEYWORDS: `sensex`, `nifty`)
    - `"Mumbai floods displace thousands"` → `medium` / `disaster` (MEDIUM_KEYWORDS: `flood`)
    - `"Bollywood star wedding draws crowd"` → `info` / `general` (EXCLUSIONS: `bollywood`, `wedding`)
    - `"India and US sign trade agreement"` → `low` / `diplomatic` (LOW_KEYWORDS: `agreement`)
  - If any mismatch, the port has drifted from the TS source — diff and fix.

---

### Phase 5: Rebuild `seed-india-signals.mjs`
**Goal**: Replace Redis-read pipeline with direct RSS fetch → cluster → skip known (by primary-title hash) → Groq per new cluster → write Postgres → write Redis digest via runSeed extraKeys.

This is the largest phase. Work function by function.

- [ ] **Step 5.1** — Update imports and constants
  - File: `scripts/seed-india-signals.mjs`
  - Add imports:
    ```js
    import { XMLParser } from 'fast-xml-parser';
    import { INDIA_FEEDS, getAllFeeds } from './_india-feeds.mjs';
    import { clusterItems } from './_clustering.mjs';
    import { classifyByKeyword, LEVEL_TO_PROTO } from './_classifier.mjs';
    ```
  - Remove `readDigestFromRedis()` (no longer reading from Redis)
  - Keep: `CANONICAL_KEY`, `CACHE_TTL`, `MAX_DRAIN_BATCH`, `sha256`
  - Add constants:
    ```js
    const DIGEST_KEY = 'news:digest:v1:india:en';
    const DIGEST_TTL = 1800;             // 30 min — survives 2 missed crons, gives stale-while-revalidate
    const FEED_TIMEOUT_MS = 8_000;
    const ITEMS_PER_FEED = 5;
    const SKIP_WINDOW_HOURS = 48;
    const BATCH_CONCURRENCY = 20;
    ```

- [ ] **Step 5.2** — Add `fetchAllFeeds()` function
  - File: `scripts/seed-india-signals.mjs`
  - Replaces `readDigestFromRedis()`
  - Logic:
    1. Get all feeds from `getAllFeeds()`
    2. Fetch each feed in parallel via `Promise.allSettled` in batches of `BATCH_CONCURRENCY`, with `FEED_TIMEOUT_MS` per fetch
    3. For `type: 'google-news'` feeds: if response has 0 items after parsing, log `[warn] gnIn throttle suspected: <name>` and mark status `'empty'`
    4. Parse XML with `fast-xml-parser`
    5. Return `{ items: ParsedItem[], feedStatuses: Record<string, 'ok' | 'empty' | 'timeout'> }`
  - Each `ParsedItem` shape:
    ```js
    {
      title: string,
      link: string,
      pubDate: string,       // raw string from RSS
      publishedAt: number,   // Date.getTime() — Unix ms
      scrapedAt: number,     // Date.now() — needed by persistSignals
      source: string,        // feed.name
      feedBucket: string,    // feed.category — 'politics' | 'economy' | 'technology' | 'disaster'
      isAlert: false,        // set after threat classification in writeDigestToRedis
    }
    ```
  - Skip items with no `title` or no valid `pubDate` (same rule as `list-feed-digest.ts` line 174)
  - Log: `[rss] Fetched N items from M feeds (K ok, L empty, P timeout)`

- [ ] **Step 5.3** — Add `skipKnownClusters()` function
  - File: `scripts/seed-india-signals.mjs`
  - Takes an array of `clusterHash` strings
  - Queries Postgres with 48-hour window:
    ```js
    const { rows } = await pool.query(
      `SELECT cluster_hash FROM india_news_signals
       WHERE cluster_hash = ANY($1)
         AND scraped_at > NOW() - INTERVAL '${SKIP_WINDOW_HOURS} hours'`,
      [clusterHashes]
    );
    return new Set(rows.map(r => r.cluster_hash));
    ```
  - Returns a `Set<string>` of already-known hashes
  - Log: `[cluster] N new clusters | M skipped (known)`

- [ ] **Step 5.4** — Add `callGroqForCluster()` function
  - File: `scripts/seed-india-signals.mjs`
  - Takes `primaryTitle: string`, returns `{ ai_summary: string, ai_meaning: string } | null`
  - One Groq call per new cluster only
  - Prompt:
    ```
    System: Return ONLY valid JSON, no explanation.
    User: Analyze this India news headline:
    "<primaryTitle>"

    Return JSON:
    {
      "ai_summary": "1-2 sentence factual summary of what happened",
      "ai_meaning": "1 sentence on market or political significance for India"
    }
    ```
  - On any error: return `null` — never throw. The row gets inserted without ai fields.

- [ ] **Step 5.5** — Add `buildDigest()` function (note: shadows nothing — internal to this file)
  - File: `scripts/seed-india-signals.mjs`
  - Takes `clusters` and `feedStatuses`. Returns the exact Redis JSON shape.
  - For each cluster, classify the primary title to produce a real threat level:
    ```js
    function buildDigestItem(cluster) {
      const classification = classifyByKeyword(cluster.primaryTitle, 'india');
      return {
        source: cluster.primarySource,
        title: cluster.primaryTitle,
        link: cluster.primaryLink,
        publishedAt: new Date(cluster.pubDate).getTime(),
        isAlert: classification.level === 'critical' || classification.level === 'high',
        threat: {
          level: LEVEL_TO_PROTO[classification.level],
          category: classification.category,
          confidence: classification.confidence,
          source: 'keyword',
        },
        locationName: '',
      };
    }
    ```
  - Group items by their **`feed_bucket`** (the source category, e.g. `politics`, `economy`)
    into the `categories` object. The bucket is the UI grouping; `threat.category` is the
    semantic categorization. These are intentionally different.
  - Set `feedStatuses` from the fetch step
  - Set `generatedAt: new Date().toISOString()`
  - Return the digest object — do NOT write Redis here. Writing happens via `runSeed` extraKeys.

- [ ] **Step 5.6** — Update `persistSignals()` to handle the new columns
  - File: `scripts/seed-india-signals.mjs`
  - The function receives rows that now include `ai_summary`, `ai_meaning`, `cluster_hash`, `feed_bucket`
  - Add 4 fields to the INSERT column list and values array
  - `COLS` constant changes from 17 to 21
  - `ON CONFLICT (headline_hash) DO NOTHING` — unchanged

- [ ] **Step 5.7** — Rebuild `fetchSignals()` (the main orchestration function)
  - File: `scripts/seed-india-signals.mjs`
  - New sequence:
    ```
    1. drainEnrichQueue()                              — Type A user enrichments only
    2. { items, feedStatuses } = await fetchAllFeeds()
    3. clusters = clusterItems(items, { includeClusterHash: true })
    4. knownHashes = await skipKnownClusters(clusters.map(c => c.clusterHash))
    5. newClusters = clusters.filter(c => !knownHashes.has(c.clusterHash))
    6. for each NEW cluster:
         a. scoreWithFallbackChain(primaryTitle) if isMarketMoving(primaryTitle)
         b. callGroqForCluster(primaryTitle)
         c. build primary row + secondary rows (secondaries get cluster_hash + feed_bucket only)
    7. persistSignals(allRows)
    8. digest = buildDigest(clusters, feedStatuses)
    9. return { processed, marketMoving, inserted, skipped, errors, digest }
    ```
  - **For each row going to Postgres**: set `event_category` from `classifyByKeyword(title, 'india').category` (the classifier output). Set `feed_bucket` from `item.feedBucket` (the source category). These are populated from different sources, on purpose.
  - Log at each step: `[rss]`, `[cluster]`, `[groq]`, `[postgres]` prefixes. Don't log `[redis]` from inside `fetchSignals` — `runSeed` handles publish logging.

- [ ] **Step 5.8** — Wire up `runSeed` with `extraKeys` for the Redis digest write
  - File: `scripts/seed-india-signals.mjs`
  - Replace the bottom `runSeed(...)` call with:
    ```js
    function validate(data) {
      return typeof data?.processed === 'number';
    }

    runSeed('india', 'signals', CANONICAL_KEY, fetchSignals, {
      validateFn: validate,
      ttlSeconds: CACHE_TTL,
      sourceVersion: 'autonomous-v1',
      extraKeys: [
        {
          key: DIGEST_KEY,
          ttl: DIGEST_TTL,
          transform: (data) => data.digest,
        },
      ],
    }).catch((err) => {
      console.error('FATAL:', err.message || err);
      process.exit(0); // Railway cron must always exit 0
    });
    ```
  - This guarantees: payload size guard, validation gate, lock acquisition, and freshness metadata
    apply to the digest write — for free, via the existing `runSeed` machinery.

- [ ] **Step 5.9** — Simplify `drainEnrichQueue()` — Type A only
  - File: `scripts/seed-india-signals.mjs`
  - **Keep the function.** Vercel's `summarize-article.ts` still pushes Type A items every ✨ click.
  - Remove the `callGroqEnrich(item.headline)` branch (Type B handling)
  - Keep only Type A: items where `item.sentiment_label !== undefined` (user ✨ enrichments)
  - Remove the `callGroqEnrich()` helper function entirely — no longer needed
  - Remove the auto-push block after `persistSignals()` in the legacy code — no longer needed (Groq now called inline per cluster via `callGroqForCluster()`)
  - The LRANGE cap, LTRIM, and PostgreSQL UPDATE logic remain unchanged

---

### Phase 6: Retire `seed-india-digest.mjs`
**Goal**: Mark the warmup cron as retired — signals cron now owns Redis writing.

- [ ] **Step 6.1** — Add retirement header to `seed-india-digest.mjs`
  - File: `scripts/seed-india-digest.mjs`
  - Add at the very top of the file (before the imports):
    ```js
    // RETIRED — V2-012 (2026-05-15)
    // seed-india-signals.mjs now fetches RSS directly and writes to Redis every 10 min
    // via runSeed extraKeys. This warmup script is redundant. Do not deploy. Do not delete —
    // kept for reference. To re-enable, remove this comment and re-add the Railway cron service.
    ```
  - Do not change anything else in the file.

- [ ] **Step 6.2** — Railway service removal (Lijo does this manually)
  - Remove the `seed-india-digest` Railway cron service
  - The `seed-india-signals` cron remains on its existing schedule

---

### Phase 7: Simplify `list-feed-digest.ts` India Cache-Miss
**Goal**: Never rebuild the India digest from Vercel. Railway owns it. Serve cached → stale → empty.

- [ ] **Step 7.1** — Add India-specific short-circuit in `listFeedDigest()`
  - File: `server/worldmonitor/news/v1/list-feed-digest.ts`
  - Find `listFeedDigest()` function (line 279).
  - Add an India branch BEFORE the existing `cachedFetchJson` call:
    ```ts
    const variant = VALID_VARIANTS.has(req.variant) ? req.variant : 'full';
    const lang = req.lang || 'en';
    const digestCacheKey = `news:digest:v1:${variant}:${lang}`;
    const fallbackKey = `${variant}:${lang}`;

    // India variant: Railway worker (seed-india-signals.mjs) is the sole writer.
    // Never rebuild from Vercel. Serve order: fresh Redis → stale in-memory → empty.
    if (variant === 'india') {
      try {
        // Direct Redis read — no rebuild fallback.
        const fresh = await cachedFetchJson<ListFeedDigestResponse>(
          digestCacheKey,
          600,
          async () => null  // builder returns null; never rebuilds
        );
        if (fresh) {
          if (fallbackDigestCache.size > 50) fallbackDigestCache.clear();
          fallbackDigestCache.set(fallbackKey, { data: fresh, ts: Date.now() });
          return fresh;
        }
      } catch {
        // Fall through to stale
      }
      const stale = fallbackDigestCache.get(fallbackKey);
      if (stale) {
        const ageMs = Date.now() - stale.ts;
        console.warn(`[digest] India: Redis miss — serving stale in-memory (${Math.round(ageMs / 1000)}s old)`);
        return stale.data;
      }
      console.warn('[digest] India: Redis miss and no in-memory stale — returning empty digest');
      return { categories: {}, feedStatuses: {}, generatedAt: new Date().toISOString() };
    }
    // Non-india variants — original code path below, unchanged
    ```
  - **Verify behavior of `cachedFetchJson` with a builder that returns `null`** before merging:
    if `cachedFetchJson` *caches* the null and starves subsequent reads, replace this call
    with a direct Redis read helper from `server/_shared/redis` (e.g., `getJson(key)`). The
    intent is "read Redis, never trigger any rebuild path."
  - Do not change `buildDigest()` itself.
  - Do not change the cache read/write logic for any other variant.

---

## Before / After (Key Changes)

**Before** — `seed-india-signals.mjs` fetchSignals():
```js
async function fetchSignals() {
  await drainEnrichQueue();
  const digest = await readDigestFromRedis();  // ← depends on user activity
  if (!digest) throw new Error('India digest not found in Redis');
  // ...extracts items from digest.categories...
}
```

**After**:
```js
async function fetchSignals() {
  await drainEnrichQueue();                     // Type A user enrichments only
  const { items, feedStatuses } = await fetchAllFeeds();  // ← autonomous RSS fetch
  const clusters = clusterItems(items, { includeClusterHash: true });
  const knownHashes = await skipKnownClusters(clusters.map(c => c.clusterHash));
  const newClusters = clusters.filter(c => !knownHashes.has(c.clusterHash));
  // ... Groq per new cluster, persist primary + secondary rows ...
  const digest = buildDigest(clusters, feedStatuses);
  return { processed, marketMoving, inserted, skipped, errors, digest };
}

runSeed('india', 'signals', CANONICAL_KEY, fetchSignals, {
  validateFn,
  ttlSeconds: CACHE_TTL,
  extraKeys: [{ key: DIGEST_KEY, ttl: DIGEST_TTL, transform: (d) => d.digest }],
});
```

**`_clustering.mjs` API**:
```js
// Before:
clusterItems(items)           → cluster (no clusterHash)
scoreImportance(cluster)      → number  (uses module-level DEMOTE_KEYWORDS, FLASHPOINT_KEYWORDS)

// After:
clusterItems(items, opts?)    → cluster (+ clusterHash + allItems when opts.includeClusterHash)
scoreImportance(cluster, opts?) → number  (uses opts.demoteKeywords ?? DEFAULT_DEMOTE_KEYWORDS, etc.)
```

`seed-insights.mjs` calls `clusterItems(items)` / `scoreImportance(cluster)` with no opts → behavior unchanged.

---

## Error Scenarios

| Symptom | Likely cause | Fix |
|---|---|---|
| `[warn] gnIn throttle suspected: LiveMint` in logs | Google rate-limited Railway IP | Expected — continue. Monitor frequency. Find direct RSS URL for that source |
| `Total rows: 0` after rebuild | All feeds timing out | Check Railway network — can it reach external URLs? |
| Redis write succeeds but UI shows old data | TTL or key mismatch | Verify `DIGEST_KEY = 'news:digest:v1:india:en'` exactly; check `DIGEST_TTL` is 1800 |
| UI cards show broken data silently | Redis JSON shape mismatch | Check `publishedAt` is number not string; check `locationName: ''` present; check `threat.level` is proto enum string |
| All threat.level are UNSPECIFIED | `_classifier.mjs` not wired up | Confirm `import { classifyByKeyword, LEVEL_TO_PROTO } from './_classifier.mjs'` and that `buildDigestItem` calls it |
| `cluster_hash` column missing error | Migration not run | Run `node scripts/migrate-india-signals.mjs` |
| Second cron run re-processes all clusters | `skipKnownClusters` not working | Check column exists; confirm 48h window; confirm hash is over normalized primary title (not membership) |
| `seed-insights.mjs` breaks after refactor | `_clustering.mjs` default code path changed | `clusterItems(items)` with no opts MUST return the original shape. Diff and fix. |
| `ai_summary` is NULL for all rows | Groq key missing or quota | Check `GROQ_API_KEY` in Railway env; check Groq quota dashboard |
| ✨ enrichments stop reaching Postgres | `drainEnrichQueue` removed or Type A branch deleted | Confirm `drainEnrichQueue` still runs first in `fetchSignals` and Type A branch is intact |
| `event_category` taxonomy changed | `event_category` populated from `feedBucket` instead of classifier | These are distinct columns. `event_category` = classifier output. `feed_bucket` = source bucket. Don't swap them. |

---

## Environment Variables

| Variable | Where set | Purpose |
|---|---|---|
| `DATABASE_PUBLIC_URL` | Railway (already present) | PostgreSQL pool for Postgres writes |
| `UPSTASH_REDIS_REST_URL` | Railway (already present) | Redis for digest write |
| `UPSTASH_REDIS_REST_TOKEN` | Railway (already present) | Redis auth |
| `GROQ_API_KEY` | Railway (already present) | Groq per-cluster enrichment |
| `HF_API_TOKEN` | Railway (already present) | FinBERT sentiment fallback chain |

No new env vars required.

---

## Read vs Write

**READ for reference (always allowed):**
- `scripts/seed-insights.mjs` — sacred, study only; confirms `_clustering.mjs` API compatibility
- `scripts/_sentiment-chain.mjs` — understand fallback chain
- `server/worldmonitor/news/v1/_feeds.ts` — read india feed list to populate `_india-feeds.mjs`
- `server/worldmonitor/news/v1/_classifier.ts` — source of truth for `_classifier.mjs` port
- `server/worldmonitor/news/v1/summarize-article.ts` — confirm Type A push site
- `src/services/clustering.ts` — confirm it's the SPA service, never write to it

**WRITE only to:**
- `scripts/migrate-india-signals.mjs`
- `scripts/_india-feeds.mjs` (new)
- `scripts/_classifier.mjs` (new)
- `scripts/_clustering.mjs` (refactor to opts bag — defaults preserve current behavior)
- `scripts/seed-india-signals.mjs`
- `scripts/seed-india-digest.mjs` (retirement header only)
- `server/worldmonitor/news/v1/list-feed-digest.ts` (India branch only)

**Never write to:**
- `src/config/variants/full.ts` — sacred
- `src/config/variants/tech.ts` — sacred
- `src/config/variants/finance.ts` — sacred
- `scripts/seed-insights.mjs` — sacred
- `server/worldmonitor/news/v1/_classifier.ts` — TS source of truth
- `src/services/clustering.ts` — SPA clustering, completely separate system

---

## Verify

```bash
npm run typecheck     # Must show: 0 errors
npx biome check scripts/seed-india-signals.mjs scripts/_india-feeds.mjs scripts/_clustering.mjs scripts/_classifier.mjs
node scripts/migrate-india-signals.mjs
node scripts/seed-india-signals.mjs   # Watch logs for all pipeline stages
node scripts/seed-insights.mjs        # Confirm sacred file still works after _clustering refactor
```

Railway PostgreSQL checks:
```sql
-- Confirm new columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'india_news_signals'
ORDER BY ordinal_position;
-- Expect 26 columns total including ai_summary, ai_meaning, cluster_hash, feed_bucket, thread_id

-- Confirm cluster data is being stored
SELECT cluster_hash, feed_bucket, event_category, ai_summary, ai_meaning
FROM india_news_signals
WHERE cluster_hash IS NOT NULL
ORDER BY scraped_at DESC
LIMIT 10;
-- Confirm: feed_bucket in (politics, economy, technology, disaster)
-- Confirm: event_category is classifier output (conflict, disaster, economic, ...)

-- Confirm skip-known is working (run cron twice, second run inserts 0)
SELECT COUNT(*) FROM india_news_signals
WHERE scraped_at > NOW() - INTERVAL '5 minutes';

-- Confirm primary-title hash is stable (same cluster across two runs hits the same hash)
SELECT cluster_hash, COUNT(*) AS rows_per_cluster
FROM india_news_signals
WHERE scraped_at > NOW() - INTERVAL '1 hour'
GROUP BY cluster_hash
ORDER BY rows_per_cluster DESC
LIMIT 10;
```

Redis check (Upstash console or CLI):
```
GET news:digest:v1:india:en
TTL news:digest:v1:india:en   # should be ≤ 1800, > 0
```
Validate returned JSON has `categories`, `feedStatuses`, `generatedAt`.
Validate `publishedAt` is a number. Validate `locationName` is present on every item.
Validate threat levels span the proto enum range (not all UNSPECIFIED).

Git checks — confirm sacred-file invariants:
```bash
git diff src/services/clustering.ts    # Must be empty
git diff scripts/seed-insights.mjs     # Must be empty
git diff src/config/variants/full.ts   # Must be empty
git diff src/config/variants/tech.ts   # Must be empty
git diff src/config/variants/finance.ts  # Must be empty
git diff server/worldmonitor/news/v1/_classifier.ts  # Must be empty
```

---

## Completion Log

- [ ] Phase 1 complete — [timestamp]
- [ ] Phase 2 complete — [timestamp]
- [ ] Phase 3 complete — [timestamp]
- [ ] Phase 4 complete — [timestamp]
- [ ] Phase 5 complete — [timestamp]
- [ ] Phase 6 complete — [timestamp]
- [ ] Phase 7 complete — [timestamp]
- [ ] Typecheck: 0 errors — [timestamp]
- [ ] Biome: 0 errors — [timestamp]
- [ ] `seed-insights.mjs` still runs cleanly after `_clustering.mjs` refactor — [timestamp]
- [ ] Railway cron run verified (logs show all pipeline stages) — [timestamp]
- [ ] PostgreSQL shows `cluster_hash`, `feed_bucket`, `ai_summary` populated — [timestamp]
- [ ] Redis digest JSON validated against schema; threat levels span proto enum range — [timestamp]
- [ ] Re-run with same RSS state inserts 0 new rows (skip-known confirmed) — [timestamp]
- [ ] All sacred-file `git diff` checks empty — [timestamp]
- [ ] `seed-india-digest` Railway service removed — [Lijo to confirm]
- [ ] **TASK V2-012 COMPLETE** ✅
