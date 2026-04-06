# Task 011 — Server-Side Digest for India Variant
*SachNetra Adapt Sprint*

**Depends on**: Task 002 + 002.5 must be complete (Indian RSS feeds wired + 403 fixes)
**Estimated time**: 1–2 hours
**Prep doc**: `ai_docs/tasks/002_indian_rss_feeds.md` (Lesson 3: per-feed fallback), `ai_docs/tasks/002_variant_wiring_analysis.md`

---

## Context — Current State

**The digest system** (`server/worldmonitor/news/v1/list-feed-digest.ts`):
The server has a feed digest endpoint at `/api/news/v1/list-feed-digest?variant=<name>`. It fetches ALL RSS feeds for a variant server-side, parses XML, classifies headlines, caches the result in Redis for 15 minutes, and returns one JSON blob. Every variant except India uses this.

Line 36 defines which variants are supported:
```typescript
const VALID_VARIANTS = new Set(['full', 'tech', 'finance', 'happy', 'commodity']);
```
`'india'` is NOT in this set. When the India client calls the endpoint, it falls through to `'full'` feeds (BBC, CNN, Guardian — wrong feeds).

**The server feeds config** (`server/worldmonitor/news/v1/_feeds.ts`):
Contains `VARIANT_FEEDS` with entries for `full`, `tech`, `finance`, `commodity`, `happy`. No `india` entry exists. A `gn()` helper on line 7-8 builds Google News RSS URLs with US locale (`hl=en-US&gl=US&ceid=US:en`).

**The client fallback** (`src/app/data-loader.ts`):
Because the digest returns no matching India categories, `loadNewsCategory()` falls into the per-feed fallback path (line 1086-1096). `isPerFeedFallbackEnabled()` (line 547-554) returns `true` for `SITE_VARIANT === 'india'`. The fallback is limited to `perFeedFallbackCategoryFeedLimit = 3` feeds per category (line 457).

**The result**: Only the first 3 feeds per category are fetched. The politics category has 10 feeds — positions 4-10 (ANI, Times of India, Hindustan Times, India Today, The Wire, Scroll, The Print) are never loaded. Each page load makes 12 individual HTTP requests from the browser instead of one cached API call.

**The client feeds** (`src/config/variants/india.ts` lines 167-205):
19 feeds across 5 categories: politics (10), disaster (2), economy (3), technology (2), government (2). Seven feeds use Google News proxy URLs (from Task 002.5 fix for 403s).

---

## What This Task Does

1. Adds `'india'` to `VALID_VARIANTS` in the digest handler so the server recognizes it.
2. Adds an `india` entry to `VARIANT_FEEDS` in `_feeds.ts` with all 19 feed URLs (mirroring `india.ts`).
3. Adds a `gnIn()` helper for Google News RSS with Indian locale (`hl=en&gl=IN&ceid=IN:en`).
4. Removes the India per-feed fallback override in `data-loader.ts` so India uses the digest like every other variant.

---

## Files To Open Before Starting

```
server/worldmonitor/news/v1/list-feed-digest.ts  — WRITE: add 'india' to VALID_VARIANTS (line 36)
server/worldmonitor/news/v1/_feeds.ts             — WRITE: add india feeds + gnIn() helper
src/app/data-loader.ts                            — WRITE: remove India fallback override (line 553)
src/config/variants/india.ts                      — READ: reference for feed URLs + names
```

---

## Pattern To Follow

From `server/worldmonitor/news/v1/_feeds.ts`, each variant in `VARIANT_FEEDS` follows this structure:

```typescript
export interface ServerFeed {
  name: string;
  url: string;
  lang?: string;
}

const gn = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

export const VARIANT_FEEDS: Record<string, Record<string, ServerFeed[]>> = {
  full: {
    politics: [
      { name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
      { name: 'AP News', url: gn('site:apnews.com') },
    ],
    // ... more categories
  },
  tech: {
    tech: [
      { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
    ],
    // ... more categories
  },
  // ... more variants
};
```

Key points:
- Feed `name` values MUST match the names in the client `india.ts` FEEDS exactly (the digest branch in `loadNewsCategory` filters by `enabledNames` which comes from the client FEEDS).
- Category keys MUST match the client FEEDS keys exactly (`politics`, `disaster`, `economy`, `technology`, `government`).
- URLs are raw strings (no `rss()` wrapper — the server fetches directly, not via rss-proxy).
- The existing `gn()` uses US locale. India feeds need `hl=en&gl=IN&ceid=IN:en`.

From `src/app/data-loader.ts`, the client flow (line 1008-1038):
```typescript
// Digest branch: server already aggregated feeds — map proto items to client types
if (digest?.categories && category in digest.categories) {
  const items = (digest.categories[category]?.items ?? [])
    .map(protoItemToNewsItem)
    .filter(i => enabledNames.has(i.source));
  // ... render, no per-feed fallback needed
}
```
When the digest has matching categories, the per-feed fallback is never reached.

---

## Implementation

### Phase 1: Add India feeds to the server digest
**Goal**: The server recognizes `variant=india` and fetches all 19 Indian feeds server-side.

- [ ] **Step 1.1** — Add `'india'` to `VALID_VARIANTS`
  - File: `server/worldmonitor/news/v1/list-feed-digest.ts`
  - Line 36, change:
    ```typescript
    const VALID_VARIANTS = new Set(['full', 'tech', 'finance', 'happy', 'commodity']);
    ```
    to:
    ```typescript
    const VALID_VARIANTS = new Set(['full', 'tech', 'finance', 'happy', 'commodity', 'india']);
    ```
  - Do not change anything else in this file.

- [ ] **Step 1.2** — Add `gnIn()` helper for Indian locale Google News RSS
  - File: `server/worldmonitor/news/v1/_feeds.ts`
  - After the existing `gn()` helper (line 7-8), add:
    ```typescript
    const gnIn = (q: string) =>
      `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en&gl=IN&ceid=IN:en`;
    ```

- [ ] **Step 1.3** — Add `india` entry to `VARIANT_FEEDS`
  - File: `server/worldmonitor/news/v1/_feeds.ts`
  - After the `happy` entry's closing `},` (line 401), before the `};` that closes `VARIANT_FEEDS` (line 402), add:

    ```typescript
    india: {
      politics: [
        { name: 'NDTV', url: 'https://feeds.feedburner.com/ndtvnews-top-stories' },
        { name: 'The Hindu', url: 'https://www.thehindu.com/news/feeder/default.rss' },
        { name: 'Indian Express', url: gnIn('site:indianexpress.com India') },
        { name: 'ANI', url: 'https://www.aninews.in/rss/india.xml' },
        { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms' },
        { name: 'Hindustan Times', url: gnIn('site:hindustantimes.com India') },
        { name: 'India Today', url: 'https://www.indiatoday.in/rss/1206578' },
        { name: 'The Wire', url: 'https://thewire.in/feed' },
        { name: 'Scroll', url: 'https://scroll.in/feed' },
        { name: 'The Print', url: 'https://theprint.in/feed' },
      ],
      disaster: [
        { name: 'NDTV India', url: 'https://feeds.feedburner.com/ndtvnews-india-news' },
        { name: 'The Hindu Environment', url: 'https://www.thehindu.com/sci-tech/energy-and-environment/feeder/default.rss' },
      ],
      economy: [
        { name: 'LiveMint', url: gnIn('site:livemint.com') },
        { name: 'Economic Times', url: gnIn('site:economictimes.indiatimes.com') },
        { name: 'Business Standard', url: gnIn('site:business-standard.com') },
      ],
      technology: [
        { name: 'YourStory', url: 'https://yourstory.com/feed' },
        { name: 'Inc42', url: 'https://inc42.com/feed/' },
      ],
      government: [
        { name: 'DD News', url: gnIn('site:ddnews.gov.in') },
        { name: 'PIB', url: gnIn('site:pib.gov.in') },
      ],
    },
    ```

  - **Critical**: The `name` values must be identical to `india.ts` FEEDS names. The digest response is filtered by `enabledNames` on the client — a name mismatch means the item gets dropped.
  - Do not modify any existing variant entries.

### Phase 2: Update the client to use the digest
**Goal**: Remove the India per-feed fallback override so the client uses the server digest.

- [ ] **Step 2.1** — Remove the India override in `isPerFeedFallbackEnabled()`
  - File: `src/app/data-loader.ts`
  - Lines 547-554, change:
    ```typescript
    private isPerFeedFallbackEnabled(): boolean {
      // Desktop: server digest has fewer categories than client FEEDS config.
      // Enable per-feed RSS fallback so missing categories fetch directly.
      if (isDesktopRuntime()) return true;
      // India variant: no server-side digest exists for india categories.
      // Enable per-feed fallback so feeds load directly via rss-proxy.
      if (SITE_VARIANT === 'india') return true;
      return isFeatureEnabled('newsPerFeedFallback');
    }
    ```
    to:
    ```typescript
    private isPerFeedFallbackEnabled(): boolean {
      // Desktop: server digest has fewer categories than client FEEDS config.
      // Enable per-feed RSS fallback so missing categories fetch directly.
      if (isDesktopRuntime()) return true;
      return isFeatureEnabled('newsPerFeedFallback');
    }
    ```
  - Remove the 2 India comment lines and the `if` statement. The server digest now covers India.
  - Do not change anything else in this file.

---

## Before / After

### `server/worldmonitor/news/v1/list-feed-digest.ts` line 36

**Before**:
```typescript
const VALID_VARIANTS = new Set(['full', 'tech', 'finance', 'happy', 'commodity']);
```

**After**:
```typescript
const VALID_VARIANTS = new Set(['full', 'tech', 'finance', 'happy', 'commodity', 'india']);
```

---

### `server/worldmonitor/news/v1/_feeds.ts` lines 7-8

**Before**:
```typescript
const gn = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
```

**After** (add below existing `gn`):
```typescript
const gn = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

const gnIn = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en&gl=IN&ceid=IN:en`;
```

---

### `server/worldmonitor/news/v1/_feeds.ts` — after line 401

**Before** (end of VARIANT_FEEDS):
```typescript
    community: [
      { name: 'Yes! Magazine', url: 'https://www.yesmagazine.org/feed' },
      { name: 'Shareable', url: 'https://www.shareable.net/feed/' },
    ],
  },
};
```

**After**:
```typescript
    community: [
      { name: 'Yes! Magazine', url: 'https://www.yesmagazine.org/feed' },
      { name: 'Shareable', url: 'https://www.shareable.net/feed/' },
    ],
  },

  india: {
    politics: [
      { name: 'NDTV', url: 'https://feeds.feedburner.com/ndtvnews-top-stories' },
      // ... (19 feeds across 5 categories — full content in Step 1.3)
    ],
    // ...
  },
};
```

---

### `src/app/data-loader.ts` lines 547-554

**Before**:
```typescript
private isPerFeedFallbackEnabled(): boolean {
  // Desktop: server digest has fewer categories than client FEEDS config.
  // Enable per-feed RSS fallback so missing categories fetch directly.
  if (isDesktopRuntime()) return true;
  // India variant: no server-side digest exists for india categories.
  // Enable per-feed fallback so feeds load directly via rss-proxy.
  if (SITE_VARIANT === 'india') return true;
  return isFeatureEnabled('newsPerFeedFallback');
}
```

**After**:
```typescript
private isPerFeedFallbackEnabled(): boolean {
  // Desktop: server digest has fewer categories than client FEEDS config.
  // Enable per-feed RSS fallback so missing categories fetch directly.
  if (isDesktopRuntime()) return true;
  return isFeatureEnabled('newsPerFeedFallback');
}
```

---

## Read vs Write

**READ for reference (always allowed):**
- `src/config/variants/full.ts` — study pattern, never write
- `src/config/variants/tech.ts` — study pattern, never write
- `src/config/variants/india.ts` — read feed names + URLs for accuracy
- `server/worldmonitor/news/v1/handler.ts` — verify wiring (already done, no changes needed)
- `server/worldmonitor/news/v1/_shared.ts` — understand shared utilities
- `server/worldmonitor/news/v1/_classifier.ts` — understand classification (no changes needed)

**WRITE only to files explicitly listed in this task:**
- `server/worldmonitor/news/v1/list-feed-digest.ts` — add 'india' to VALID_VARIANTS
- `server/worldmonitor/news/v1/_feeds.ts` — add gnIn() helper + india entry to VARIANT_FEEDS
- `src/app/data-loader.ts` — remove India per-feed fallback override

**Never write to:**
- `src/config/variants/full.ts` — sacred, existing live variant
- `src/config/variants/tech.ts` — sacred, existing live variant
- `src/config/variants/finance.ts` — sacred, existing live variant
- `src/config/variants/india.ts` — no changes needed (client feeds stay as-is)
- `src/services/rss.ts` — no changes needed
- `api/rss-proxy.js` — no changes needed (server fetches directly, not via rss-proxy)
- `shared/rss-allowed-domains.json` — no changes needed (allowlist is for rss-proxy, not server)

---

## Verify

```bash
npm run typecheck   # Must show: 0 errors
```

In browser (npm run dev with VITE_VARIANT=india):
- [ ] Console shows `[News] Digest fetched: 5 categories` (not 0 or falling through to full)
- [ ] Network tab: ONE request to `/api/news/v1/list-feed-digest?variant=india` returning 200
- [ ] Network tab: ZERO `rss-proxy` requests (no per-feed fallback happening)
- [ ] All 5 panels show content: Politics, Disaster, Economy, Technology, Government
- [ ] Politics panel shows articles from The Print, The Wire, Scroll (positions 8-10, previously dropped)
- [ ] All 10 politics sources appear (NDTV, The Hindu, Indian Express, ANI, Times of India, Hindustan Times, India Today, The Wire, Scroll, The Print)

### Debugging Checklist (if something looks wrong)

Follow this sequence — it catches 90% of variant bugs:

1. **Console: `[News] Digest fetched: N categories`** — should say 5. If 0, the server doesn't have India feeds. If it says 13 (full's count), VALID_VARIANTS wasn't updated.
2. **Console: `[News] Digest missing for "politics"`** — this means the digest didn't include the category. Check that `_feeds.ts` category keys match exactly: `politics`, `disaster`, `economy`, `technology`, `government`.
3. **Console: `using per-feed fallback`** — this means the client is STILL falling back. Check that `isPerFeedFallbackEnabled()` no longer returns `true` for India.
4. **Network tab: rss-proxy requests appearing** — same as #3, fallback is still active.
5. **Panels empty but digest OK** — feed `name` mismatch between `_feeds.ts` and `india.ts`. The digest filter (`enabledNames.has(i.source)`) drops items where names don't match exactly.
6. **Clear localStorage** — `localStorage.clear(); location.reload();`

**Red herrings to ignore:**
- `[feeds] 103 unique sources / 200 total` — always shows FULL_FEEDS count, not variant
- LIVE NEWS ticker (Bloomberg/CNN) — separate live TV system, not RSS
- `india.ts` `DEFAULT_PANELS` export — dead code, not wired to panel-layout

⚠️ **This task does NOT modify `panels.ts`, so no localStorage clear needed for panel changes.** However, if you were previously using per-feed fallback, the persistent digest cache (`digest:last-good` in IndexedDB) may contain stale full-variant data. Clear localStorage if the first load shows wrong feeds.

Do not move to the next task until all checks pass.

---

## Variant Wiring Check

| What | Routing file | Status |
|------|-------------|--------|
| FEEDS | `src/config/feeds.ts` | ✅ Already wired (Task 002) |
| DEFAULT_PANELS | `src/config/panels.ts` | ✅ Already wired (Task 002) |
| DEFAULT_MAP_LAYERS | `src/config/panels.ts` | ✅ Already wired (Task 001) |
| Per-feed fallback | `src/app/data-loader.ts` | 🔄 CHANGING: removing India override (Phase 2) |
| Domain allowlist | `shared/rss-allowed-domains.json` + `api/_rss-allowed-domains.js` | ✅ Already done (Task 002) — NOT NEEDED for server digest (server fetches directly) |
| Variant detection | `src/config/variant.ts` | ✅ Already done (Task 001) |
| **Server digest variants** | `server/worldmonitor/news/v1/list-feed-digest.ts` | 🔄 CHANGING: adding 'india' (Phase 1) |
| **Server feed config** | `server/worldmonitor/news/v1/_feeds.ts` | 🔄 CHANGING: adding india feeds (Phase 1) |

---

## Completion Log

- [x] Phase 1 complete — Server digest updated — 2026-04-06T16:45:00
- [x] Phase 2 complete — Client fallback removed — 2026-04-06T16:51:00
- [x] Typecheck: 0 errors — 2026-04-06T16:51:30
- [ ] Browser verified — [timestamp]
- [ ] **TASK 011 COMPLETE** ✅
