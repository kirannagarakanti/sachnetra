# Task V2-003 — Related Stories
*SachNetra Adapt Sprint*

**Depends on**: V2-000 must be complete
**Estimated time**: 3–4 hours
**Prep doc**: N/A — all decisions captured below
**V1 or V2**: V2

---

## ⚠️ Implementation Correction (post Phase 1+2 revert)

Phase 1 and Phase 2 were initially implemented in `NewsPanel.ts`, rendering related stories
inline in the panel list cards. This was **wrong**. The design shows related stories inside the
**story detail overlay** (the full-screen view that opens when you tap a story card).

The story detail overlay is built by `openStoryDetail()` in `src/app/data-loader.ts` (line 282).
That is the correct target. The NewsPanel.ts changes have been reverted.

---

## Context — Current State

### The story detail overlay (`src/app/data-loader.ts`)

`openStoryDetail(item, cluster)` creates a full-screen overlay (`#snDetailOverlay`) when a
story card is tapped. It already renders:

1. Header with Back + Share buttons
2. Category badge, time, source count
3. Story headline
4. AI summary shimmer → then "WHAT HAPPENED" + "WHAT THIS MEANS" cards (loaded async)
5. Sources list (all cluster sources with tier + timestamp)
6. "Share Story" button fixed at bottom

**Missing**: a "RELATED STORIES" section below the sources list. The design
(`sachnetra_story_detail.html`) shows 2–3 story cards with headline + chevron, rendered
after sources.

### What triggers the overlay

Three call sites in `data-loader.ts`:
- Story cards tap (line ~1557): `openStoryDetail(cluster.allItems[0]!, cluster)`
- Insights panel tap (line ~1715): `openStoryDetail(entry.cluster.allItems[0]!, entry.cluster)`
- Deep-link restore (line ~581): `openStoryDetail(item, cluster)`

### The Jaccard utilities

`tokenize()` and `jaccardSimilarity()` already exist in `src/utils/analysis-constants.ts`.
Use them directly — do not copy or re-implement.

### NewsPanel.ts — current state after revert

The revert restores `NewsPanel.ts` to its original state:
- No `tokenize`/`jaccardSimilarity` import
- No `RelatedStory` type
- No `computeRelatedStories()` helper
- `PreparedCluster` has no `relatedStories` field
- `renderClusterHtml()` and `renderClusterHtmlSafely()` have original signatures

The `.related-stories` CSS block in `main.css` **stays** — the same class names are
used by the overlay.

---

## What This Task Does

- Adds a module-level `_latestClusters` variable to `data-loader.ts` that caches the
  current digest clusters whenever they are rendered
- Updates `openStoryDetail()` to compute Jaccard-based related stories from
  `_latestClusters` and inject them into the overlay HTML after the sources section
- The related stories section matches the design: "RELATED STORIES" label + 2–3 card rows
  each showing headline + chevron arrow, linking to the original article

No new API call. No new backend. Pure client-side Jaccard on already-loaded data.

---

## Success Criteria

This task is complete when ALL of the following are true:

- [x] Tapping a story card opens the detail overlay
- [x] The overlay shows "RELATED STORIES" section below the sources list when ≥1 related story exists
- [x] Each related story card shows the headline and opens the story detail overlay when tapped (not the raw article)
- [x] Stories with no keyword overlap above 0.2 show NO related stories section (no empty box)
- [x] The section does not appear on the shimmer/loading state — only after AI summary loads
- [x] `npm run typecheck` shows 0 errors
- [x] `npx biome check .` shows 0 errors (2 pre-existing complexity warnings in data-loader.ts, not from this task)
- [x] No console errors in browser at `VITE_VARIANT=india`

---

## Second-Order Impact

- **Affected consumers**: `openStoryDetail()` is a module-level function in `data-loader.ts`.
  Its signature change (adding `allClusters`) requires updating all 3 call sites within
  the same file.
- **Performance**: Jaccard computed once per overlay open, over ~50–100 clusters.
  O(n) tokenizations (pre-computed), O(n²) comparisons. < 5ms. Runs after AI fetch,
  not in the critical path.
- **Variant bleed risk**: `openStoryDetail()` is only called for `SITE_VARIANT === 'india'`
  (it's wired inside the india-specific layout in `data-loader.ts`). No bleed to other variants.
- **New env vars needed**: none

---

## Files To Open Before Starting

```
src/app/data-loader.ts              — openStoryDetail() lives here (line 282)
src/styles/main.css                 — .related-stories CSS already present (from Phase 3)
src/utils/analysis-constants.ts    — read only; tokenize() and jaccardSimilarity()
```

---

## Pattern To Follow

### How openStoryDetail() builds the overlay HTML (current pattern)

The function builds `html` as a string, then writes it to `cardsContainer.innerHTML` once
after the async AI summary resolves. The sources section is the last thing appended:

```typescript
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

cardsContainer.innerHTML = html;   // ← inject related stories HTML before this line
```

### Design spec for related stories section (from sachnetra_story_detail.html)

```html
<div>
  <p style="font-size: 11px; color: #4a4870; text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 8px;">
    Related stories
  </p>
  <div style="display: flex; flex-direction: column; gap: 6px;">
    <div class="sn-detail-related-card">
      <p class="sn-detail-related-title">Bihar flood warning issued for 6 districts</p>
      <svg ...chevron... />
    </div>
    ...
  </div>
</div>
```

Use `--sn-*` CSS variables for all colours — never hardcode hex in JS template strings.

### Existing Jaccard utilities (read-only)

From `src/utils/analysis-constants.ts`:
```typescript
export function tokenize(text: string): Set<string>        // lowercase, strip punct, filter stop words
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number  // intersection / union
```

---

## Implementation

### Phase 0: Revert NewsPanel.ts to original state

**Goal**: Undo the wrong Phase 1+2 work. Restore `NewsPanel.ts` to exactly
what it was before this task touched it.

- [ ] **Step 0.1** — Remove `tokenize`/`jaccardSimilarity` import
  - File: `src/components/NewsPanel.ts`
  - Remove: `import { tokenize, jaccardSimilarity } from '@/utils/analysis-constants';`

- [ ] **Step 0.2** — Remove `RelatedStory`, constants, and `computeRelatedStories()`
  - File: `src/components/NewsPanel.ts`
  - Remove the `RelatedStory` interface, `RELATED_THRESHOLD`, `RELATED_MAX` constant,
    and the `computeRelatedStories()` function entirely.

- [ ] **Step 0.3** — Remove `relatedStories` from `PreparedCluster`
  - File: `src/components/NewsPanel.ts`
  - Restore `PreparedCluster` to:
    ```typescript
    interface PreparedCluster {
      cluster: ClusteredEvent;
      isNew: boolean;
      shouldHighlight: boolean;
      showNewTag: boolean;
    }
    ```

- [ ] **Step 0.4** — Remove `tokenMap` line and `relatedStories` field from `renderClusters()`
  - File: `src/components/NewsPanel.ts`
  - Remove `const tokenMap = new Map(sorted.map(c => [c.id, tokenize(c.primaryTitle)]));`
  - Remove `relatedStories: computeRelatedStories(cluster, sorted, tokenMap),` from the
    prepared object literal

- [ ] **Step 0.5** — Restore `renderClusterHtmlSafely()` signature
  - File: `src/components/NewsPanel.ts`
  - Remove `relatedStories: RelatedStory[]` parameter from the signature
  - Remove `relatedStories` from its call to `renderClusterHtml()`

- [ ] **Step 0.6** — Restore `renderClusterHtml()` signature and remove HTML injection
  - File: `src/components/NewsPanel.ts`
  - Remove `relatedStories: RelatedStory[]` parameter from the signature
  - Remove the `relatedStoriesHtml` build block
  - Remove `${relatedStoriesHtml}` from the returned template string

- [ ] **Step 0.7** — Restore both call sites of `renderClusterHtmlSafely()`
  - File: `src/components/NewsPanel.ts`
  - WindowedList callback: remove `prepared.relatedStories` argument
  - Direct render `.map()`: remove `p.relatedStories` argument

- [ ] **Step 0.8** — Verify revert is clean
  ```bash
  npm run typecheck   # Must show: 0 errors
  ```

### Phase 1: Add types + helper to data-loader.ts

**Goal**: Add the `RelatedStory` type and `computeRelatedStories()` inside
`data-loader.ts`, near the top of the file with other module-level declarations.
Also add the import for Jaccard utilities and the `_latestClusters` cache variable.

- [ ] **Step 1.1** — Add import for `tokenize` and `jaccardSimilarity`
  - File: `src/app/data-loader.ts`
  - Add alongside the existing TypeScript imports at the top:
    ```typescript
    import { tokenize, jaccardSimilarity } from '@/utils/analysis-constants';
    ```

- [ ] **Step 1.2** — Add `_latestClusters` module-level cache variable
  - File: `src/app/data-loader.ts`
  - Add near the top (before `openStoryDetail`):
    ```typescript
    let _latestClusters: ClusteredEvent[] = [];
    ```
  - This gets populated by the digest render path so `openStoryDetail()` always has
    the full current list without needing it passed as a parameter.

- [ ] **Step 1.3** — Add `RelatedStory` type, constants, and `computeRelatedStories()` helper
  - File: `src/app/data-loader.ts`
  - Add immediately above `openStoryDetail()` (line 282):
    ```typescript
    interface RelatedStory {
      title: string;
      link: string;
    }

    const RELATED_THRESHOLD = 0.2;
    const RELATED_MAX = 3;

    function computeRelatedStories(
      current: ClusteredEvent,
      all: ClusteredEvent[],
    ): RelatedStory[] {
      if (all.length === 0) return [];
      const tokenMap = new Map(all.map(c => [c.id, tokenize(c.primaryTitle)]));
      const tokensA = tokenMap.get(current.id) ?? tokenize(current.primaryTitle);
      return all
        .filter(other => other.id !== current.id)
        .map(other => ({
          story: { title: other.primaryTitle, link: other.primaryLink },
          score: jaccardSimilarity(tokensA, tokenMap.get(other.id) ?? tokenize(other.primaryTitle)),
        }))
        .filter(r => r.score >= RELATED_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .slice(0, RELATED_MAX)
        .map(r => r.story);
    }
    ```
  - Note: `source` field dropped vs. earlier plan — design shows headline + chevron only,
    no source label on related story cards.

### Phase 2: Update openStoryDetail() to render related stories

**Goal**: After the sources section is appended, compute and inject related stories HTML.

- [ ] **Step 2.1** — Set `_latestClusters` in the digest render path
  - File: `src/app/data-loader.ts`
  - Find where clusters are rendered into news panels (search for `.renderClusters(` or
    `.renderNews(`). When clustered data arrives from the digest, also set:
    ```typescript
    _latestClusters = clusters;   // keep in sync with latest digest
    ```
  - Only set it for the india variant digest path — check that the assignment is inside
    the india-specific render block.

- [ ] **Step 2.2** — Inject related stories HTML after sources section
  - **Note (post-browser fix)**: Cards must be `<button data-related-link="...">`, NOT `<a href="...">`.
    After `cardsContainer.innerHTML = html`, attach click handlers:
    ```typescript
    cardsContainer.querySelectorAll<HTMLElement>('.sn-detail-related-card[data-related-link]').forEach(card => {
      card.addEventListener('click', () => {
        const link = card.dataset.relatedLink;
        const target = _latestClusters.find(c => c.primaryLink === link);
        if (target?.allItems[0]) openStoryDetail(target.allItems[0], target);
      });
    });
    ```
    `openStoryDetail()` removes the existing overlay and creates a fresh one — safe to call recursively.
  - File: `src/app/data-loader.ts`
  - Inside `openStoryDetail()`, immediately before `cardsContainer.innerHTML = html;` (line 508),
    compute and append:
    ```typescript
    const related = cluster ? computeRelatedStories(cluster, _latestClusters) : [];
    if (related.length > 0) {
      html += `
        <div class="related-stories">
          <p class="related-stories-header">Related stories</p>
          <div class="related-stories-list">
            ${related.map(s => `
              <a class="sn-detail-related-card" href="${escapeHtml(s.link)}" target="_blank" rel="noopener">
                <p class="sn-detail-related-title">${escapeHtml(s.title)}</p>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M3 2L7 5L3 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                </svg>
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }

    cardsContainer.innerHTML = html;
    ```

### Phase 3: CSS for sn-detail-related-card

**Goal**: Style the related story cards inside the overlay to match the design.
The `.related-stories` and `.related-stories-header` classes are already in `main.css`
from the earlier (reverted) work — add only the overlay-specific card styles.

- [ ] **Step 3.1** — Add overlay card styles to `main.css`
  - File: `src/styles/main.css`
  - Where: after the existing `.related-story-title` block (after the `.related-stories` group)
  - What to add:
    ```css
    .related-stories-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .sn-detail-related-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: var(--sn-card-bg);
      border: 0.5px solid var(--sn-border);
      border-radius: 10px;
      padding: 10px 12px;
      text-decoration: none;
      color: inherit;
    }

    .sn-detail-related-card:hover {
      border-color: var(--sn-purple);
    }

    .sn-detail-related-title {
      font-size: 12px;
      color: var(--sn-text-primary);
      margin: 0;
      line-height: 1.4;
      flex: 1;
    }

    .sn-detail-related-card svg {
      flex-shrink: 0;
      color: var(--sn-text-muted);
    }
    ```

---

## Before / After

### `openStoryDetail()` — cardsContainer injection point

**Before** (line 506–508):
```typescript
      html += `
        <div class="sn-detail-sources">
          ...
        </div>
      `;

      cardsContainer.innerHTML = html;
```

**After**:
```typescript
      html += `
        <div class="sn-detail-sources">
          ...
        </div>
      `;

      const related = cluster ? computeRelatedStories(cluster, _latestClusters) : [];
      if (related.length > 0) {
        html += `
          <div class="related-stories">
            <p class="related-stories-header">Related stories</p>
            <div class="related-stories-list">
              ${related.map(s => `
                <a class="sn-detail-related-card" href="${escapeHtml(s.link)}" target="_blank" rel="noopener">
                  <p class="sn-detail-related-title">${escapeHtml(s.title)}</p>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M3 2L7 5L3 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                  </svg>
                </a>
              `).join('')}
            </div>
          </div>
        `;
      }

      cardsContainer.innerHTML = html;
```

---

## Error Scenarios

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Related stories section never appears | `_latestClusters` never set (Step 2.1 skipped) | Find the digest render path and add the assignment |
| Related stories always empty | Threshold too high for current digest | Lower `RELATED_THRESHOLD` from 0.2 to 0.15 |
| All stories show 3 related | Threshold too low | Raise to 0.25 or 0.3 |
| Empty `.related-stories` box visible | Guard `if (related.length > 0)` missing | Wrap the `html +=` in the guard |
| TypeScript error in data-loader.ts | `ClusteredEvent` not imported or import from wrong path | Check existing imports at top of `data-loader.ts` |
| Typecheck error after Phase 0 revert | Missed a revert step | Re-read NewsPanel.ts and compare against original |

---

## Environment Variables

No new env vars for this task.

| Variable | Where set | Purpose |
|----------|----------|---------|
| `VITE_VARIANT=india` | `.env.local` | Required to test india variant locally |

---

## Read vs Write

**READ for reference (always allowed):**
- `src/utils/analysis-constants.ts` — source of `tokenize` and `jaccardSimilarity`
- `src/config/variants/full.ts` — sacred, never write
- `src/config/variants/tech.ts` — sacred, never write

**WRITE only to:**
- `src/components/NewsPanel.ts` — Phase 0 revert only
- `src/app/data-loader.ts` — Phases 1–2
- `src/styles/main.css` — Phase 3 additions only

**Never write to:**
- `src/config/variants/full.ts`
- `src/config/variants/tech.ts`
- `src/config/variants/finance.ts`
- `src/utils/analysis-constants.ts`

---

## Verify

```bash
npm run typecheck     # Must show: 0 errors
npx biome check src/app/data-loader.ts src/components/NewsPanel.ts src/styles/main.css
```

In browser (`VITE_VARIANT=india npm run dev`):
- [ ] Tap a story card in any panel — overlay opens
- [ ] Scroll to bottom of overlay — "RELATED STORIES" section appears with 1–3 cards
- [ ] Each card shows headline text + chevron
- [ ] Tapping a related story card opens the correct article URL in a new tab
- [ ] Open a very niche story (e.g. a specific cricket result) — no related stories section appears
- [ ] No empty `.related-stories` box visible on any story

### Debugging Checklist

1. **Is `_latestClusters` populated?** — add `console.log(_latestClusters.length)` inside
   `openStoryDetail()` before the Jaccard call. If `0`, Step 2.1 assignment is missing.
2. **Is cluster being passed?** — the call sites must pass `cluster` (not just `item`).
   Check the 3 call sites still pass a `ClusteredEvent`.
3. **Threshold too high?** — log `scores` array before filtering; if all scores are 0.05–0.15,
   lower `RELATED_THRESHOLD` to 0.12.

---

## Completion Log

- [x] Phase 0 complete (NewsPanel.ts reverted) — 2026-05-09
- [x] Phase 1 complete (data-loader.ts types + helper) — 2026-05-09
- [x] Phase 2 complete (openStoryDetail() injection) — 2026-05-09
- [x] Phase 3 complete (CSS) — 2026-05-09
- [x] Typecheck: 0 errors — 2026-05-09
- [x] Biome: 0 errors (2 pre-existing complexity warnings, not caused by this task) — 2026-05-09
- [x] Browser verified — 2026-05-09
- [x] Post-browser fix: related story cards changed from `<a href>` (external nav) to `<button data-related-link>` with click handlers calling `openStoryDetail()` — 2026-05-09
- [x] Success Criteria: all checked — 2026-05-09
- [x] **TASK V2-003 COMPLETE** ✅
