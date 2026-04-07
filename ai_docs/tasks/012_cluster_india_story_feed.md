# Task 012 — Cluster India Story Feed
*SachNetra Adapt Sprint*

**Depends on**: Task 011 must be complete (server-side digest for India)
**Estimated time**: 3–4 hours
**Prep doc**: None — this task follows from codebase analysis of the existing clustering pipeline

---

## Context — Current State

**The clustering system** (`src/services/clustering.ts` + `src/services/analysis-core.ts`):
A two-layer clustering pipeline already runs on every news load. Layer 1 (always): Jaccard title similarity with `SIMILARITY_THRESHOLD = 0.5`. Layer 2 (optional): semantic clustering via ML worker. The output is stored in `this.ctx.latestClusters` as `ClusteredEvent[]`.

**The India story feed** (`src/app/data-loader.ts` lines 1378–1450):
`renderIndiaStoryCards()` receives raw `NewsItem[]`, NOT clusters. It renders each item as a separate card. Duplicate stories about the same event appear as separate cards.

**Example visible in production** (Tamil Nadu cops death sentence):
- Card 1: Times of India — "9 cops get death penalty in Sathankulam custodial torture case"
- Card 2: The Hindu — "Top news of the day: Nine policemen sentenced to death..."
- Card 3: India Today — "9 Tamil Nadu cops get death sentence for 2020..."

All 3 are the same event but shown as 3 separate cards.

**The story detail overlay** (`openStoryDetail()` lines 252–417):
Takes a single `NewsItem`. Sends only that one headline to Groq:
```typescript
generateSummary([item.title, `${item.source}: ${item.title}`], undefined, 'india')
```
Groq gets 2 strings (same headline wrapped). It has no cross-source context. The SOURCE section shows only 1 source.

**The state filter** (`filterNewsByState()` in `src/services/rss.ts` lines 378–393):
Operates on `NewsItem[]` — filters individual items by title keyword match.

**Execution order in `loadNews()` (lines 1269–1315)**:
```
1. this.ctx.allNews = collectedNews;              ← line 1269
2. this.ctx.latestClusters = clusterNewsHybrid()   ← line 1278-1280
3. populateIndiaBrief(collectedNews)               ← line 1314
```
Clusters are available BEFORE the India feed renders. No timing issue.

---

## What This Task Does

1. Changes `renderIndiaStoryCards()` to render `ClusteredEvent[]` instead of raw `NewsItem[]`, deduplicating stories.
2. Adds a `filterClustersByState()` helper in `rss.ts` that filters clusters by checking if ANY item matches state keywords.
3. Updates `openStoryDetail()` to accept a `ClusteredEvent` (or stay as `NewsItem` with an optional `cluster` parameter), passing ALL headlines from the cluster to Groq for a multi-source summary.
4. Updates the SOURCE section in the detail overlay to list all sources in the cluster.
5. Shows a source count badge on story cards when `sourceCount > 1`.

---

## Files To Open Before Starting

```
src/app/data-loader.ts             — WRITE: renderIndiaStoryCards, openStoryDetail, refilterIndiaStories, populateIndiaBrief
src/services/rss.ts                — WRITE: add filterClustersByState() helper
src/types/index.ts                 — READ: ClusteredEvent interface (lines 119-136)
src/services/clustering.ts         — READ: understand clustering pipeline (no changes)
src/services/analysis-core.ts      — READ: understand clusterNewsCore algorithm (no changes)
src/utils/analysis-constants.ts    — READ: SIMILARITY_THRESHOLD, tokenize, jaccardSimilarity (no changes)
src/styles/main.css                — WRITE: minor CSS for source count badge
```

---

## Pattern To Follow

**ClusteredEvent interface** (from `src/types/index.ts` lines 119–136):
```typescript
export interface ClusteredEvent {
  id: string;
  primaryTitle: string;
  primarySource: string;
  primaryLink: string;
  sourceCount: number;
  topSources: Array<{ name: string; tier: number; url: string }>;
  allItems: NewsItem[];
  firstSeen: Date;
  lastUpdated: Date;
  isAlert: boolean;
  monitorColor?: string;
  velocity?: VelocityMetrics;
  threat?: ThreatClassification;
  lat?: number;
  lon?: number;
  lang?: string;
}
```

**Mapping from NewsItem fields to ClusteredEvent fields:**
```
item.source        → cluster.primarySource
item.title         → cluster.primaryTitle
item.link          → cluster.primaryLink
item.pubDate       → cluster.lastUpdated
item.threat        → cluster.threat
item.locationName  → cluster.allItems[0].locationName (pick first with a value)
```

**Existing story card template** (line 1396–1420) — current single-item format:
```html
<div class="sn-story-card" data-story-idx="${idx}">
  <div class="sn-story-card-body">
    <div class="sn-story-content">
      <div class="sn-story-badges">
        <span class="sn-story-badge">${category}</span>
        <span class="sn-story-sources">${item.source}</span>
      </div>
      <p class="sn-story-title">${item.title}</p>
    </div>
    <div class="sn-story-thumb">${getCategoryIcon(category)}</div>
  </div>
  <div class="sn-story-footer">
    <span class="sn-story-meta">${ago} · ${location}</span>
    ...actions...
  </div>
</div>
```

---

## Implementation

### Phase 1: Add cluster-aware state filter
**Goal**: A helper function filters `ClusteredEvent[]` by state, checking ALL items in each cluster.

- [ ] **Step 1.1** — Add `filterClustersByState()` to `rss.ts`
  - File: `src/services/rss.ts`
  - After the existing `filterNewsByState()` function (line 393), add:
    ```typescript
    /**
     * Filter clusters by Indian state keywords.
     * Returns all clusters if stateCode is null/empty (All India).
     * A cluster matches if ANY of its allItems match a state keyword in title.
     */
    export function filterClustersByState(
      clusters: ClusteredEvent[],
      stateCode: string | null,
      keywords: Record<string, string[]>
    ): ClusteredEvent[] {
      if (!stateCode) return clusters;

      const stateKeywords = keywords[stateCode] || [];
      if (stateKeywords.length === 0) return clusters;

      return clusters.filter(cluster =>
        cluster.allItems.some(item =>
          stateKeywords.some(kw =>
            item.title.toLowerCase().includes(kw)
          )
        )
      );
    }
    ```
  - Add `import type { ClusteredEvent } from '@/types';` at the top of the file if not already imported.
  - Do not modify `filterNewsByState()` — it may still be used elsewhere.

### Phase 2: Update story card rendering to use clusters
**Goal**: The India feed renders one card per cluster instead of one card per raw item.

- [ ] **Step 2.1** — Change `renderIndiaStoryCards()` to accept and render clusters
  - File: `src/app/data-loader.ts`
  - Change the method signature from:
    ```typescript
    private renderIndiaStoryCards(cardsEl: HTMLElement, allNews: NewsItem[]): void {
    ```
    to:
    ```typescript
    private renderIndiaStoryCards(cardsEl: HTMLElement, clusters: ClusteredEvent[]): void {
    ```
  - Replace the body:
    - Use `filterClustersByState(clusters, ...)` instead of `filterNewsByState(allNews, ...)`
    - Sort by `cluster.lastUpdated` instead of `item.pubDate`
    - Map over clusters using `cluster.primaryTitle`, `cluster.primarySource`, `cluster.threat?.category`, `cluster.lastUpdated`
    - For location: check `cluster.allItems.find(i => i.locationName)?.locationName` then fall back to state name then 'India'
    - For the source badge: show `cluster.primarySource` (or `"${cluster.primarySource} + ${cluster.sourceCount - 1} more"` when `sourceCount > 1`)
    - For the source count: add a small badge `<span class="sn-story-source-count">${cluster.sourceCount} sources</span>` in the footer when `sourceCount > 1`
    - Store the cluster reference for tap handlers (keep `data-story-idx` pattern, but look up the cluster)

  - **Card template (cluster version)**:
    ```html
    <div class="sn-story-card" data-story-idx="${idx}">
      <div class="sn-story-card-body">
        <div class="sn-story-content">
          <div class="sn-story-badges">
            <span class="sn-story-badge">${category}</span>
            <span class="sn-story-sources">${primarySource}</span>
          </div>
          <p class="sn-story-title">${primaryTitle}</p>
        </div>
        <div class="sn-story-thumb">${getCategoryIcon(category)}</div>
      </div>
      <div class="sn-story-footer">
        <span class="sn-story-meta">${ago} · ${location}${sourceCount > 1 ? ` · ${sourceCount} sources` : ''}</span>
        ...actions...
      </div>
    </div>
    ```

- [ ] **Step 2.2** — Update `populateIndiaBrief()` to pass clusters
  - File: `src/app/data-loader.ts`
  - In `populateIndiaBrief()` (line 1337), change the story card population:
    ```typescript
    // BEFORE
    if (cardsEl && allNews.length > 0) {
      this.renderIndiaStoryCards(cardsEl, allNews);
    }

    // AFTER
    if (cardsEl && this.ctx.latestClusters.length > 0) {
      this.renderIndiaStoryCards(cardsEl, this.ctx.latestClusters);
    }
    ```
  - The daily brief generation STAYS on `allNews` headlines — no change needed for that part.

- [ ] **Step 2.3** — Update `refilterIndiaStories()` to use clusters
  - File: `src/app/data-loader.ts`
  - In `refilterIndiaStories()` (line 1328), change:
    ```typescript
    // BEFORE
    const allNews = this.ctx.allNews;
    if (allNews.length === 0) return;
    ...
    this.renderIndiaStoryCards(cardsEl, allNews);

    // AFTER
    const clusters = this.ctx.latestClusters;
    if (clusters.length === 0) return;
    ...
    this.renderIndiaStoryCards(cardsEl, clusters);
    ```

- [ ] **Step 2.4** — Update tap handlers to pass cluster to story detail
  - File: `src/app/data-loader.ts`
  - In the tap handler section of `renderIndiaStoryCards()`, change:
    ```typescript
    // BEFORE
    const item = sorted[idx];
    if (item) openStoryDetail(item);

    // AFTER
    const cluster = sorted[idx];
    if (cluster) openStoryDetail(cluster.allItems[0]!, cluster);
    ```
  - WhatsApp share: use `cluster.primaryTitle` instead of `item.title`.

### Phase 3: Update story detail for multi-source context
**Goal**: Groq receives all headlines from the cluster. SOURCE section shows all sources.

- [ ] **Step 3.1** — Add optional `cluster` parameter to `openStoryDetail()`
  - File: `src/app/data-loader.ts`
  - Change signature from:
    ```typescript
    function openStoryDetail(item: NewsItem): void {
    ```
    to:
    ```typescript
    function openStoryDetail(item: NewsItem, cluster?: ClusteredEvent): void {
    ```
  - This keeps backward compatibility — existing callers pass just `item`.

- [ ] **Step 3.2** — Pass all cluster headlines to Groq
  - File: `src/app/data-loader.ts`
  - In `openStoryDetail()`, change the `generateSummary` call (line 346):
    ```typescript
    // BEFORE
    generateSummary([item.title, `${item.source}: ${item.title}`], undefined, 'india')

    // AFTER — send all headlines from the cluster for richer context
    const headlines = cluster && cluster.sourceCount > 1
      ? cluster.allItems.map(i => `${i.source}: ${i.title}`)
      : [item.title, `${item.source}: ${item.title}`];
    generateSummary(headlines, undefined, 'india')
    ```
  - When cluster has 3 sources, Groq gets 3 source-tagged headlines → much better "WHAT HAPPENED".

- [ ] **Step 3.3** — Show all sources in the SOURCE section
  - File: `src/app/data-loader.ts`
  - In the `.then()` callback that builds the source HTML (lines 394–408), change:
    ```typescript
    // BEFORE — single source row
    html += `
      <div class="sn-detail-sources">
        <div class="sn-detail-sources-header">
          <span class="sn-detail-sources-label">Source</span>
        </div>
        <div class="sn-detail-source-list">
          <div class="sn-detail-source-row">
            <div class="sn-detail-source-left">
              <span class="sn-detail-source-dot"></span>
              <span class="sn-detail-source-name">${escapeHtml(source)}</span>
            </div>
            <span class="sn-detail-source-time">${timeAgo}</span>
          </div>
        </div>
      </div>
    `;

    // AFTER — list all sources from cluster (fall back to single source)
    const sources = cluster && cluster.sourceCount > 1
      ? cluster.topSources
      : [{ name: source, tier: 0, url: item.link }];

    const sourceRows = sources.map(s => {
      const sItem = cluster?.allItems.find(i => i.source === s.name);
      const sMs = sItem ? Date.now() - new Date(sItem.pubDate).getTime() : ms;
      const sMins = Math.floor(sMs / 60000);
      let sAgo: string;
      if (sMins < 60) sAgo = `${sMins}m ago`;
      else { const hrs = Math.floor(sMins / 60); sAgo = hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`; }
      return `
        <div class="sn-detail-source-row">
          <div class="sn-detail-source-left">
            <span class="sn-detail-source-dot"></span>
            <span class="sn-detail-source-name">${escapeHtml(s.name)}</span>
          </div>
          <span class="sn-detail-source-time">${sAgo}</span>
        </div>
      `;
    }).join('');

    html += `
      <div class="sn-detail-sources">
        <div class="sn-detail-sources-header">
          <span class="sn-detail-sources-label">SOURCE</span>
        </div>
        <div class="sn-detail-source-list">
          ${sourceRows}
        </div>
      </div>
    `;
    ```

### Phase 4: Add imports and ensure typing
**Goal**: All new references compile correctly.

- [ ] **Step 4.1** — Add `ClusteredEvent` import to `data-loader.ts` if not already present
  - File: `src/app/data-loader.ts`
  - Check existing imports from `@/types`. `ClusteredEvent` should already be imported (it's used in line 1278). If not, add it.

- [ ] **Step 4.2** — Add `filterClustersByState` import to `data-loader.ts`
  - File: `src/app/data-loader.ts`
  - In the import block that already has `filterNewsByState`, add `filterClustersByState`:
    ```typescript
    import { ..., filterNewsByState, filterClustersByState } from '@/services/rss';
    ```

- [ ] **Step 4.3** — Ensure `cluster` variable is accessible in the `.then()` callback of `openStoryDetail()`
  - The `cluster` parameter is declared in the outer function scope and is accessible inside the `.then()` closure. No extra work needed — just verify the variable is referenced correctly.

---

## Before / After

### Story card feed (visual)

**Before** (3 separate cards for same event):
```
┌──────────────────────────────┐
│ [general]  Times of India    │
│ 9 cops get death penalty...  │
│ 1h ago · India               │
├──────────────────────────────┤
│ [general]  The Hindu         │
│ Top news of the day: Nine    │
│ policemen sentenced to...    │
│ 53m ago · India              │
├──────────────────────────────┤
│ [general]  India Today       │
│ 9 Tamil Nadu cops get death  │
│ sentence for 2020...         │
│ 1h ago · India               │
└──────────────────────────────┘
```

**After** (1 clustered card):
```
┌──────────────────────────────┐
│ [crime]  Times of India      │
│ 9 cops get death penalty in  │
│ Sathankulam custodial...     │
│ 53m ago · India · 3 sources  │
└──────────────────────────────┘
```

### Story detail — SOURCE section

**Before** (1 source):
```
SOURCE
• Times of India    1h ago
```

**After** (all sources from cluster):
```
SOURCE
• Times of India    1h ago
• The Hindu         53m ago
• India Today       1h ago
```

### Groq input

**Before** (2 nearly-identical strings):
```
["9 cops get death penalty...", "Times of India: 9 cops get death penalty..."]
```

**After** (3 diverse source perspectives):
```
["Times of India: 9 cops get death penalty in Sathankulam...",
 "The Hindu: Nine policemen sentenced to death in Sattankulam...",
 "India Today: 9 Tamil Nadu cops get death sentence for 2020..."]
```

---

## `renderIndiaStoryCards()` — full before/after

**Before** (`data-loader.ts` lines 1378–1450):
```typescript
private renderIndiaStoryCards(cardsEl: HTMLElement, allNews: NewsItem[]): void {
  const filtered = filterNewsByState(allNews, this.ctx.selectedState, INDIA_STATE_KEYWORDS);
  const sorted = [...filtered]
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 20);
  // ... renders individual items
  // tap handler: openStoryDetail(item)
}
```

**After**:
```typescript
private renderIndiaStoryCards(cardsEl: HTMLElement, clusters: ClusteredEvent[]): void {
  const filtered = filterClustersByState(clusters, this.ctx.selectedState, INDIA_STATE_KEYWORDS);
  const sorted = [...filtered]
    .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
    .slice(0, 20);
  // ... renders clusters with sourceCount badge
  // tap handler: openStoryDetail(cluster.allItems[0]!, cluster)
}
```

---

## Read vs Write

**READ for reference (always allowed):**
- `src/config/variants/full.ts` — study pattern, never write
- `src/config/variants/tech.ts` — study pattern, never write
- `src/config/variants/india.ts` — read for state keywords import
- `src/services/clustering.ts` — understand pipeline, no changes
- `src/services/analysis-core.ts` — understand clusterNewsCore, no changes
- `src/utils/analysis-constants.ts` — understand threshold/tokenizer, no changes
- `src/types/index.ts` — reference ClusteredEvent type, no changes

**WRITE only to files explicitly listed in this task:**
- `src/app/data-loader.ts` — renderIndiaStoryCards, openStoryDetail, refilterIndiaStories, populateIndiaBrief
- `src/services/rss.ts` — add filterClustersByState()
- `src/styles/main.css` — minor CSS for source count in footer (if needed)

**Never write to:**
- `src/config/variants/full.ts` — sacred, existing live variant
- `src/config/variants/tech.ts` — sacred, existing live variant
- `src/config/variants/finance.ts` — sacred, existing live variant
- `src/services/clustering.ts` — no changes needed
- `src/services/analysis-core.ts` — no changes needed
- `src/types/index.ts` — ClusteredEvent already has everything we need

---

## Verify

```bash
npm run typecheck   # Must show: 0 errors
```

In browser (npm run dev with VITE_VARIANT=india):
- [ ] Duplicate stories collapsed: "9 cops" story appears as 1 card, not 3
- [ ] Card shows source count: "3 sources" in footer when cluster has multiple sources
- [ ] Single-source stories look identical to before (no "1 source" badge)
- [ ] Tap a clustered card → detail opens with correct title
- [ ] Detail SOURCE section lists all sources (e.g., Times of India, The Hindu, India Today)
- [ ] Detail "WHAT HAPPENED" is richer (Groq got 3 headlines, not 1)
- [ ] State filter still works: select Tamil Nadu → see only Tamil Nadu stories
- [ ] State filter works on clusters: cluster shows if ANY item matches the state
- [ ] "All India" shows all clusters
- [ ] WhatsApp share uses the primary title
- [ ] Total card count is lower than before (deduplication working)
- [ ] Today's Brief (AI daily summary) still generates correctly

### Debugging Checklist (if something looks wrong)

1. **Cards still show duplicates** — `renderIndiaStoryCards` may still receive `allNews` instead of `latestClusters`. Check `populateIndiaBrief()` and `refilterIndiaStories()`.
2. **Zero cards showing** — `this.ctx.latestClusters` may be empty. Check console for `[App] Clustering failed` error. Clustering runs at line 1278 — if it throws, clusters stay empty.
3. **State filter returns nothing** — `filterClustersByState` checks `cluster.allItems[].title`. Verify Tamil Nadu keywords match at least one item title in the cluster.
4. **Detail shows only 1 source** — The `cluster` parameter may not be passed through to `openStoryDetail`. Check the tap handler is passing `cluster` as second arg.
5. **Groq summary is the same as before** — `headlines` array may still be `[item.title, ...]` instead of `cluster.allItems.map(...)`. Check the conditional.
6. **Clear localStorage** — `localStorage.clear(); location.reload();`

**Red herrings to ignore:**
- `[feeds] 103 unique sources / 200 total` — always shows FULL_FEEDS count, not variant
- Different `sourceCount` numbers between feeds — clustering is approximate (Jaccard threshold 0.5)

Do not move to the next task until all checks pass.

---

## Completion Log

- [x] Phase 1 complete — filterClustersByState added — 2026-04-06T22:51:00
- [x] Phase 2 complete — Story cards render clusters — 2026-04-06T22:58:00
- [x] Phase 3 complete — Detail overlay multi-source — 2026-04-06T23:01:00
- [x] Phase 4 complete — Imports + typing verified — 2026-04-06T23:01:00
- [x] Typecheck: 0 errors — 2026-04-06T23:01:00
- [x] Browser verified — 2026-04-06T23:18:00
- [x] **TASK 012 COMPLETE** ✅
