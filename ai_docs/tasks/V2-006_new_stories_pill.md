# Task V2-006 — New Stories Pill on Timeline
*SachNetra Adapt Sprint*

**Depends on**: Task V2-000 must be complete ✅
**Estimated time**: 2–3 hours
**Prep doc**: `ai_docs/sachnetra v2/V2_roadmap.md` (Task V2-006 section)
**V2**

---

## Context — Current State

`renderTimelineRiver()` in `src/app/data-loader.ts` (line 1647) fully rebuilds `#snTlRiver` innerHTML on every call. It is called:

1. At the end of every `loadNews()` cycle (line 1524) — triggered by `RefreshScheduler` every **20 minutes** (`REFRESH_INTERVALS.feeds = 20 * 60 * 1000`)
2. On Timeline tab activation via `App.ts:renderTimeline` callback (line 471)

`ClusteredEvent.id` is a stable string identifier on every cluster. There is no pill element in the codebase — `#snTlNewPill` does not exist yet.

HTML structure of the timeline tab (`src/app/panel-layout.ts` line 430):
```html
<div class="sn-timeline-tab" id="snTimelineTab">
  <div class="sn-tl-chips" id="snTlChips">…chip buttons…</div>
  <div class="sn-tl-river" id="snTlRiver">…stories…</div>
</div>
```

On desktop, `panel-layout.ts` moves `#snTlRiver` into a `.sn-tl-desktop-wrap` grid child (lines 768–804). The pill must be anchored after `#snTlChips` (not before `#snTlRiver`) to survive the desktop rearrangement.

The pill must NOT be injected inside `#snTlRiver` — `riverEl.innerHTML` is fully replaced on every render.

---

## What This Task Does

- Adds a private `updateNewStoriesPill()` method to `DataLoader` in `data-loader.ts`
- On the first render, snapshots current cluster IDs to `sessionStorage['sn:tl-seen-ids']` (baseline, no pill shown)
- On every subsequent render, diffs current IDs against the snapshot; if `newCount > 0`, shows a green pill "↑ N new stories" anchored after `#snTlChips`
- Pill click: scrolls `#snTlRiver` to top, updates snapshot to mark all current stories as seen, hides pill
- Adds `.sn-tl-new-pill` and `.sn-tl-new-pill.visible` CSS classes to `main.css` (both desktop and mobile blocks)

---

## Success Criteria

- [ ] On first page load, no pill is shown on the Timeline tab
- [ ] After simulating a refresh (manually calling `renderTimelineRiver()` with new cluster data), the pill appears at the top of the timeline with correct count
- [ ] Pill click scrolls to top of river, hides pill, and updates sessionStorage
- [ ] Pill dismisses automatically on next render if no new stories remain
- [ ] Pill does NOT appear for non-India variants (guard already in `renderTimelineRiver()`)
- [ ] On desktop layout (≥769px), pill spans full width above the river column
- [ ] `npm run typecheck` shows 0 errors
- [ ] `npx biome check .` shows 0 errors
- [ ] No console errors at `VITE_VARIANT=india`

---

## Second-Order Impact

- **Affected consumers**: `renderTimelineRiver()` has no callers that depend on its return value. The method signature does not change. No impact on other files.
- **Performance**: `sessionStorage.getItem` + `JSON.parse` is synchronous and takes <1ms. No API calls. No DOM thrash (pill is a single element, not rebuilt on each render).
- **Variant bleed**: `renderTimelineRiver()` already returns early for non-India variants (`if (SITE_VARIANT !== 'india') return;`). Zero risk.
- **sessionStorage**: `sn:tl-seen-ids` stores a JSON array of cluster ID strings. SessionStorage quota (5MB) is far larger than needed. Wrapped in `try/catch` for private-browsing environments that block storage writes.
- **New env vars**: none

---

## Files To Open Before Starting

```
src/app/data-loader.ts           — renderTimelineRiver() starting at line 1647
src/app/panel-layout.ts          — desktop timeline setup starting at line 758
src/styles/main.css              — sn-tl-cluster styles around line 19132 (add pill after)
src/types/index.ts               — ClusteredEvent.id at line 120
```

---

## Pattern To Follow

**Existing `sn-tl-*` badge pattern** (`main.css` line 19132):
```css
[data-variant="india"] .sn-tl-cluster {
  font-size: 10px; padding: 1px 6px; border-radius: 8px;
  background: #1a1830; color: #7070b0;
}
```

**Existing hidden/visible pattern** (`main.css`):
```css
[data-variant="india"] .sn-tl-row.hidden { display: none; }
```
Follow `hidden`/`visible` class toggle, not `style.display` manipulation.

**Existing `onclick`/`onkeydown` pattern** (`data-loader.ts` line 1772):
```typescript
riverEl.querySelectorAll<HTMLElement>('.sn-tl-row').forEach(row => {
  const handler = () => { ... };
  row.addEventListener('click', handler);
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
  });
});
```
Use `pill.onclick` / `pill.onkeydown` properties (not `addEventListener`) so re-renders replace handlers without stacking duplicates.

---

## Implementation

### Phase 1: CSS Pill Styles
**Goal**: Add visual pill styles to main.css — both desktop and mobile blocks.

- [ ] **Step 1.1** — Add desktop pill styles to `src/styles/main.css`
  - File: `src/styles/main.css`
  - Location: after the `.sn-tl-cluster` block (around line 19135)
  - What to add:
    ```css
    [data-variant="india"] .sn-tl-new-pill {
      display: none;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 16px;
      background: var(--sn-green, #22c55e);
      color: #0a0812;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      flex-shrink: 0;
    }
    [data-variant="india"] .sn-tl-new-pill.visible { display: flex; }
    ```

- [ ] **Step 1.2** — Add mobile pill styles to `src/styles/main.css`
  - File: `src/styles/main.css`
  - Location: inside the `@media (max-width: 768px)` block, after the equivalent `.sn-tl-cluster` mobile styles (around line 20733)
  - What to add (same rules, mobile block):
    ```css
    [data-variant="india"] .sn-tl-new-pill {
      display: none;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 16px;
      background: var(--sn-green, #22c55e);
      color: #0a0812;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      flex-shrink: 0;
    }
    [data-variant="india"] .sn-tl-new-pill.visible { display: flex; }
    ```

### Phase 2: Pill Logic in data-loader.ts
**Goal**: Snapshot cluster IDs on first render, diff on subsequent renders, show/hide pill.

- [ ] **Step 2.1** — Add `updateNewStoriesPill()` private method to `DataLoader`
  - File: `src/app/data-loader.ts`
  - Location: Insert as a new private method directly before `renderTimelineRiver()` (before line 1641)
  - What to add:
    ```typescript
    private updateNewStoriesPill(currentIds: string[]): void {
      const SEEN_KEY = 'sn:tl-seen-ids';
      const chipsEl = document.getElementById('snTlChips');
      if (!chipsEl) return;

      let pill = document.getElementById('snTlNewPill');
      if (!pill) {
        pill = document.createElement('div');
        pill.id = 'snTlNewPill';
        pill.className = 'sn-tl-new-pill';
        pill.setAttribute('role', 'button');
        pill.setAttribute('tabindex', '0');
        pill.setAttribute('aria-live', 'polite');
        chipsEl.insertAdjacentElement('afterend', pill);
      }

      const seenRaw = sessionStorage.getItem(SEEN_KEY);
      if (seenRaw === null) {
        try { sessionStorage.setItem(SEEN_KEY, JSON.stringify(currentIds)); } catch { /* private browsing */ }
        return;
      }

      const seenIds = new Set<string>(JSON.parse(seenRaw) as string[]);
      const newCount = currentIds.filter(id => !seenIds.has(id)).length;

      if (newCount <= 0) {
        pill.classList.remove('visible');
        return;
      }

      pill.textContent = `↑ ${newCount} new ${newCount === 1 ? 'story' : 'stories'}`;
      pill.classList.add('visible');

      const dismiss = () => {
        try { sessionStorage.setItem(SEEN_KEY, JSON.stringify(currentIds)); } catch { /* private browsing */ }
        pill!.classList.remove('visible');
        document.getElementById('snTlRiver')?.scrollTo({ top: 0, behavior: 'smooth' });
      };
      pill.onclick = dismiss;
      pill.onkeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dismiss(); }
      };
    }
    ```

- [ ] **Step 2.2** — Call `updateNewStoriesPill()` from `renderTimelineRiver()`
  - File: `src/app/data-loader.ts`
  - Location: Inside `renderTimelineRiver()`, after `clusters` is computed and before `if (clusters.length === 0)`
  - Current code (lines 1656–1660):
    ```typescript
    const clusters = this.ctx.latestClusters
      .filter(c => (now - c.lastUpdated.getTime()) < MAX_AGE_MS)
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

    if (clusters.length === 0) {
    ```
  - New code:
    ```typescript
    const clusters = this.ctx.latestClusters
      .filter(c => (now - c.lastUpdated.getTime()) < MAX_AGE_MS)
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

    this.updateNewStoriesPill(clusters.map(c => c.id));

    if (clusters.length === 0) {
    ```
  - Do not change anything else in `renderTimelineRiver()`.

---

## Before / After

**Before** (`data-loader.ts`, lines 1656–1662):
```typescript
    const clusters = this.ctx.latestClusters
      .filter(c => (now - c.lastUpdated.getTime()) < MAX_AGE_MS)
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

    if (clusters.length === 0) {
      riverEl.innerHTML = '<div class="sn-empty">No stories in the last 24 hours.</div>';
      return;
    }
```

**After**:
```typescript
    const clusters = this.ctx.latestClusters
      .filter(c => (now - c.lastUpdated.getTime()) < MAX_AGE_MS)
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

    this.updateNewStoriesPill(clusters.map(c => c.id));

    if (clusters.length === 0) {
      riverEl.innerHTML = '<div class="sn-empty">No stories in the last 24 hours.</div>';
      return;
    }
```

---

## Error Scenarios

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Pill never appears after refresh | `sn:tl-seen-ids` not set on first render — sessionStorage blocked | Check private browsing mode; confirm `sessionStorage.setItem` doesn't throw |
| Pill appears on first page load | `sn:tl-seen-ids` has stale data from a previous session | This should not happen — sessionStorage clears on tab/window close. If it does, check `sessionStorage.clear()` is not being called elsewhere |
| Pill is inside the river (buried in stories) | `insertAdjacentElement('afterend', pill)` targeted wrong element | Verify `#snTlChips` exists in DOM at call time |
| Pill count is wrong (inflated) | Clusters from previous render cycles contaminating `latestClusters` | Check `this.ctx.latestClusters` is properly reset between `loadNews()` calls |
| TypeScript error on `JSON.parse` | Strict typing issue with `as string[]` cast | Wrap parse in `Array.isArray` guard |
| Biome lint error: `no-unsafe-assignment` | `JSON.parse` returns `any` | Add `as string[]` cast after parse |

---

## Environment Variables

No new environment variables. This is a pure client-side feature.

| Variable | Where set | Purpose |
|----------|----------|---------|
| `VITE_VARIANT=india` | `.env.local` | Required to test india variant locally |

---

## Read vs Write

**READ for reference (always allowed):**
- `src/config/variants/full.ts` — never write
- `src/config/variants/tech.ts` — never write
- `src/types/index.ts` — ClusteredEvent.id confirmation, read only
- `src/app/panel-layout.ts` — desktop timeline setup, read only

**WRITE only to files explicitly listed in this task:**
- `src/app/data-loader.ts` — add `updateNewStoriesPill()` + one-line call in `renderTimelineRiver()`
- `src/styles/main.css` — add `.sn-tl-new-pill` and `.sn-tl-new-pill.visible` styles

**Never write to:**
- `src/config/variants/full.ts` — sacred
- `src/config/variants/tech.ts` — sacred
- `src/config/variants/finance.ts` — sacred
- `scripts/seed-insights.mjs` — sacred
- `src/app/panel-layout.ts` — read-only for this task

---

## Verify

```bash
npm run typecheck     # Must show: 0 errors
npx biome check .     # Must show: 0 errors
```

In browser (`VITE_VARIANT=india`):
- [ ] Navigate to Timeline tab — no pill visible on first load
- [ ] Open browser console, run: `sessionStorage.removeItem('sn:tl-seen-ids')` then hard-refresh — confirms first-render snapshot
- [ ] To simulate new stories: open console, set `sessionStorage.setItem('sn:tl-seen-ids', '[]')` then trigger a news refresh — pill should appear with count equal to current cluster count
- [ ] Click pill — river scrolls to top, pill disappears
- [ ] Confirm pill is above the river and below the chips on both mobile (375px) and desktop (>769px)
- [ ] Confirm non-India variant (`VITE_VARIANT=full`) shows no pill and no console errors

### Debugging Checklist (if pill doesn't appear)

1. **`sessionStorage.getItem('sn:tl-seen-ids')`** — `null` means snapshot was not written (first-render path correct, but verify next call runs diff)
2. **`this.ctx.latestClusters.length`** — log in `renderTimelineRiver()` — confirms clusters exist
3. **`document.getElementById('snTlNewPill')`** — confirms pill was inserted in DOM
4. **`pill.className`** — confirms `.visible` was added
5. **Check `scheduleRefresh('news', ..., REFRESH_INTERVALS.feeds)`** — `feeds = 20 min`; don't wait 20 min to test; override interval manually or trigger via `loadNews()` directly in console

---

## Completion Log

- [x] Phase 1 complete — 2026-05-09 16:26
- [x] Phase 2 complete — 2026-05-09 16:26
- [x] Typecheck: 0 errors — 2026-05-09 16:26
- [x] Biome: 0 errors (2 pre-existing warnings on unrelated functions) — 2026-05-09 16:26
- [ ] Browser verified (mobile + desktop) — [timestamp]
- [ ] Success Criteria: all checked — [timestamp]
- [ ] CLAUDE.md V2 task status updated — [timestamp]
- [ ] **TASK V2-006 COMPLETE** ✅
