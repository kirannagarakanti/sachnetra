 # Task 013 — Timeline River Feed
*SachNetra Adapt Sprint*

**Depends on**: Task 012 (Cluster India Story Feed) must be complete
**Estimated time**: 2–3 hours
**Prep doc**: `ai_docs/ui-docs-reference/sachnetra_hybrid_timeline_final.html`

---

## Context — Current State

The mobile India variant has four bottom nav tabs: **Home**, **Timeline**, **Map**, **States**.

- **Home** tab works fully: state bar, Today's Brief, clustered story cards
- **Timeline** tab is a placeholder: `<div class="sn-empty">Timeline coming soon</div>` (panel-layout.ts L427-429)
- **Map** tab works (lazy-loaded DeckGL)
- **States** tab is a placeholder

The data layer is **100% complete**:
- `ctx.latestClusters` has all clustered events with `threat.category`, `lastUpdated`, `sourceCount`, `isAlert`
- `openStoryDetail(item, cluster)` is a working function at data-loader.ts L252 that renders a full detail overlay with AI summary, WhatsApp share, and back button
- `timeAgo()` helper at data-loader.ts L1479 formats relative timestamps
- `EventCategory` type includes: `conflict`, `protest`, `disaster`, `diplomatic`, `economic`, `terrorism`, `cyber`, `health`, `environmental`, `military`, `crime`, `infrastructure`, `tech`, `general`

The CSS has an existing timeline placeholder class at main.css L18321-18336 (`.cb-timeline-mount`) but this is for the desktop command bar, not the India variant.

## What This Task Does

1. Replaces the `snTimelineTab` placeholder with a hybrid river timeline: category filter chips at top + chronological story list + time group dividers
2. Adds ~180 lines of CSS for the river UI (filter chips, river items, time dividers, category dots/pills, alert treatment)
3. Adds a `renderTimelineRiver()` method to DataLoaderManager that renders all clusters from the last 24 hours sorted by time, with category filtering
4. Wires the Timeline tab to call `renderTimelineRiver()` when activated (and on data refresh)

---

## Files To Open Before Starting

```
src/app/panel-layout.ts     — Timeline tab HTML scaffold + tab switching logic
src/app/data-loader.ts      — Add renderTimelineRiver() and wire to loadNews()
src/styles/main.css          — Add India variant timeline CSS
```

---

## Pattern To Follow

### Story card rendering pattern (data-loader.ts L1399-1477)

The existing `renderIndiaStoryCards()` method is the model:
```typescript
private renderIndiaStoryCards(cardsEl: HTMLElement, clusters: ClusteredEvent[]): void {
    const filtered = filterClustersByState(clusters, this.ctx.selectedState, INDIA_STATE_KEYWORDS);
    const sorted = [...filtered]
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
      .slice(0, 20);

    cardsEl.innerHTML = sorted.map((cluster, idx) => {
      // ... render each card
    }).join('');

    // Attach tap handlers — pass cluster to detail
    cardsEl.querySelectorAll<HTMLElement>('.sn-story-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const idx = parseInt(card.dataset.storyIdx ?? '0', 10);
        const cluster = sorted[idx];
        if (cluster) openStoryDetail(cluster.allItems[0]!, cluster);
      });
    });
}
```

Follow this same pattern for the timeline river: render HTML, attach click handlers, reuse `openStoryDetail()`.

### CSS pattern (main.css India variant styles)

All India mobile styles are scoped inside `@media (max-width: 768px)` using `[data-variant="india"]` selectors. Use `--sn-*` CSS variables where available. Touch targets minimum 44px.

---

## Implementation

### Phase 1: Timeline HTML scaffold
**Goal**: Replace the "Timeline coming soon" placeholder with the river structure

- [ ] **Step 1.1** — Update `snTimelineTab` HTML in `panel-layout.ts`
  - File: `src/app/panel-layout.ts`
  - Find L427-429:
    ```html
    <div class="sn-timeline-tab" id="snTimelineTab" style="display:none">
      <div class="sn-empty">Timeline coming soon</div>
    </div>
    ```
  - Replace with:
    ```html
    <div class="sn-timeline-tab" id="snTimelineTab" style="display:none">
      <div class="sn-tl-chips" id="snTlChips">
        <button class="sn-tl-chip sn-tl-chip--active" data-tl-cat="all">All</button>
        <button class="sn-tl-chip sn-tl-chip--conflict" data-tl-cat="conflict">Conflict</button>
        <button class="sn-tl-chip sn-tl-chip--economic" data-tl-cat="economic">Economy</button>
        <button class="sn-tl-chip sn-tl-chip--tech" data-tl-cat="tech">Tech</button>
        <button class="sn-tl-chip sn-tl-chip--diplomatic" data-tl-cat="diplomatic">Govt</button>
        <button class="sn-tl-chip sn-tl-chip--environmental" data-tl-cat="environmental">Environ</button>
      </div>
      <div class="sn-tl-river" id="snTlRiver">
        <div class="sn-empty">Loading timeline…</div>
      </div>
    </div>
    ```
  - Do not change anything else in this file except what is listed below.

- [ ] **Step 1.2** — Wire chip filtering and timeline data refresh in `setupMobileIndiaLayout()`
  - File: `src/app/panel-layout.ts`
  - Inside `setupMobileIndiaLayout()`, after the existing tab switching logic (around L612), add timeline chip filtering logic:
    - When Timeline tab is activated, call `this.callbacks.renderTimeline?.()` (new callback)
    - Attach click handlers to `.sn-tl-chip` buttons that toggle `sn-tl-chip--active` and filter `.sn-tl-row` items by `data-tl-cat`
    - "All" chip resets all filters (shows everything)
    - Category chips toggle on/off independently (when none are active, reset to "All")

- [ ] **Step 1.3** — Add `renderTimeline` callback
  - File: `src/app/panel-layout.ts`
  - Add `renderTimeline?: () => void;` to the `PanelLayoutCallbacks` interface (around L63-70)

### Phase 2: River renderer in data-loader
**Goal**: Render clustered events as a chronological river with time group dividers

- [ ] **Step 2.1** — Add `renderTimelineRiver()` method to `DataLoaderManager`
  - File: `src/app/data-loader.ts`
  - Add a new method after `renderIndiaStoryCards()` (after L1477):
  
  ```typescript
  /**
   * Render the Timeline tab river — chronological list of all stories
   * from the last 24 hours, with time group dividers and category filtering.
   * Does NOT apply state filtering (Timeline is all-India by design).
   */
  renderTimelineRiver(): void {
    if (SITE_VARIANT !== 'india') return;
    const riverEl = document.getElementById('snTlRiver');
    if (!riverEl) return;

    const now = Date.now();
    const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

    // Get all clusters from the last 24 hours, sorted newest first
    const clusters = this.ctx.latestClusters
      .filter(c => (now - c.lastUpdated.getTime()) < MAX_AGE_MS)
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());

    if (clusters.length === 0) {
      riverEl.innerHTML = '<div class="sn-empty">No stories in the last 24 hours.</div>';
      return;
    }

    // Bucket into time groups
    const buckets = this.bucketByTime(clusters, now);
    // Render HTML
    // Each story row: colored dot, source, category pill, alert badge?, cluster badge?, title, time ago
    // Attach click handlers reusing openStoryDetail()
  }
  ```

  - **Time bucketing logic**: Group clusters into:
    - "JUST NOW" — 0–30 minutes ago
    - "1–3 HOURS AGO" — 30 min to 3 hours
    - "EARLIER TODAY" — 3–12 hours
    - "YESTERDAY" — 12–24 hours
  
  - **Category mapping**: Map `EventCategory` to chip colors:
    | EventCategory | Chip/Dot class | Color |
    |---|---|---|
    | `conflict`, `military`, `terrorism`, `crime` | `conflict` | Red `#cc3333` |
    | `economic`, `infrastructure` | `economic` | Green `#66bb33` |
    | `tech`, `cyber` | `tech` | Blue `#2299bb` |
    | `diplomatic`, `protest` | `diplomatic` | Amber `#cc8820` |
    | `environmental`, `disaster`, `health` | `environmental` | Teal `#22aa88` |
    | `general` (fallback) | `general` | Purple `#5050a0` |
  
  - **Alert treatment**: If `cluster.isAlert` is true, add `sn-tl-row--alert` class (red left border)
  
  - **Cluster badge**: If `cluster.sourceCount > 1`, show a `${sourceCount} sources` badge

  - **Click handler**: Reuse `openStoryDetail(cluster.allItems[0]!, cluster)` — same pattern as Home tab

- [ ] **Step 2.2** — Wire `renderTimelineRiver()` into the news load cycle
  - File: `src/app/data-loader.ts`
  - Inside `populateIndiaBrief()` (around L1365), after rendering story cards, also call:
    ```typescript
    this.renderTimelineRiver();
    ```
  - This ensures the timeline updates whenever new data arrives.

- [ ] **Step 2.3** — Wire the callback in App.ts or wherever `PanelLayoutCallbacks` is constructed
  - File: `src/App.ts` (or wherever callbacks are wired)
  - Add `renderTimeline: () => this.dataLoader.renderTimelineRiver()` to the callbacks object

### Phase 3: CSS for timeline river
**Goal**: Style the chips, river items, time dividers, category dots/pills, and alert treatment

- [ ] **Step 3.1** — Add timeline river CSS to `main.css`
  - File: `src/styles/main.css`
  - Add inside the existing `@media (max-width: 768px)` block, after the story card styles (around L19420):
  
  Styles needed (all scoped with `[data-variant="india"]`):
  
  **Chip bar** (`.sn-tl-chips`):
  - Horizontal scroll, `display: flex`, `gap: 6px`, `overflow-x: auto`, `scrollbar-width: none`
  - Padding 10px 16px, sticky at the top of the timeline tab
  
  **Individual chips** (`.sn-tl-chip`):
  - `padding: 4px 12px`, `border-radius: 16px`, `font-size: 11px`
  - Each category gets its own border/text/bg color (matching the mockup)
  - `.sn-tl-chip--active` gets full opacity + brighter border
  - Inactive chips get `opacity: 0.35`
  - `white-space: nowrap`, `min-height: 32px` (within 44px tap zone with padding)
  
  **River body** (`.sn-tl-river`):
  - `flex: 1`, `overflow-y: auto`, `padding-bottom: 80px` (clearance for bottom nav)
  
  **Time dividers** (`.sn-tl-divider`):
  - Flex row with two lines and centered text label
  - `font-size: 10px`, `color: #3a3860`, `letter-spacing: 0.07em`
  
  **Story rows** (`.sn-tl-row`):
  - `display: flex`, `gap: 10px`, `padding: 9px 16px`
  - `border-bottom: 0.5px solid #120f20`
  - Tap highlight: `transition: background 0.1s`
  - `.sn-tl-row--alert`: `border-left: 2px solid #cc3333`
  - `.sn-tl-row.hidden`: `display: none` (for filtering)
  
  **Category dots** (`.sn-tl-dot`):
  - `width: 7px`, `height: 7px`, `border-radius: 50%`, `margin-top: 5px`
  - Color per category (red, green, blue, amber, teal, purple)
  
  **Category pills** (`.sn-tl-pill`):
  - `font-size: 10px`, `padding: 1px 6px`, `border-radius: 8px`
  - Color per category with subtle background
  
  **Alert badge** (`.sn-tl-alert`):
  - `background: #2a0a0a`, `color: #ff5050`, `border: 0.5px solid #441010`
  
  **Cluster badge** (`.sn-tl-cluster`):
  - `background: #1a1830`, `color: #7070b0`

---

## Before / After

**Before** (`panel-layout.ts` L427-429):
```html
<div class="sn-timeline-tab" id="snTimelineTab" style="display:none">
  <div class="sn-empty">Timeline coming soon</div>
</div>
```

**After**:
```html
<div class="sn-timeline-tab" id="snTimelineTab" style="display:none">
  <div class="sn-tl-chips" id="snTlChips">
    <button class="sn-tl-chip sn-tl-chip--active" data-tl-cat="all">All</button>
    <button class="sn-tl-chip sn-tl-chip--conflict" data-tl-cat="conflict">Conflict</button>
    <button class="sn-tl-chip sn-tl-chip--economic" data-tl-cat="economic">Economy</button>
    <button class="sn-tl-chip sn-tl-chip--tech" data-tl-cat="tech">Tech</button>
    <button class="sn-tl-chip sn-tl-chip--diplomatic" data-tl-cat="diplomatic">Govt</button>
    <button class="sn-tl-chip sn-tl-chip--environmental" data-tl-cat="environmental">Environ</button>
  </div>
  <div class="sn-tl-river" id="snTlRiver">
    <div class="sn-empty">Loading timeline…</div>
  </div>
</div>
```

**Before** (`data-loader.ts`):
```
(no renderTimelineRiver method exists)
```

**After**:
```typescript
renderTimelineRiver(): void {
  // Renders all clusters from the last 24 hours into #snTlRiver
  // Time-bucketed: "JUST NOW" | "1–3 HOURS AGO" | "EARLIER TODAY" | "YESTERDAY"
  // Category-filtered via data-tl-cat attributes
  // Click handler: openStoryDetail(cluster.allItems[0]!, cluster)
}
```

---

## Read vs Write

**READ for reference (always allowed):**
- `src/config/variants/full.ts` — study pattern, quote from it, never write
- `src/config/variants/tech.ts` — study pattern, quote from it, never write
- `src/config/variants/india.ts` — FEEDS, INDIA_STATE_KEYWORDS reference
- `src/types/index.ts` — EventCategory, ClusteredEvent type definitions
- `server/worldmonitor/news/v1/_classifier.ts` — category keyword mapping
- `ai_docs/ui-docs-reference/sachnetra_hybrid_timeline_final.html` — design reference

**WRITE only to files explicitly listed in this task:**
- `src/app/panel-layout.ts` — Timeline HTML scaffold + chip wiring + callback
- `src/app/data-loader.ts` — `renderTimelineRiver()` method + wiring
- `src/styles/main.css` — Timeline river CSS
- `src/App.ts` — Wire `renderTimeline` callback (one line)

**Never write to:**
- `src/config/variants/full.ts` — sacred, existing live variant
- `src/config/variants/tech.ts` — sacred, existing live variant
- `src/config/variants/finance.ts` — sacred, existing live variant

---

## Design Decisions

1. **No state filter on Timeline** — Timeline shows all-India, regardless of the Home tab's state selector. This is intentional: the Home tab is for state-filtered news, the Timeline is for chronological browsing across all categories.

2. **"All" chip = default** — When the user enters the Timeline tab, "All" is active. User can tap category chips to toggle specific categories on/off. When no chips are active, revert to "All".

3. **24-hour window** — Only show stories from the last 24 hours. This prevents stale content from appearing in the timeline.

4. **Reuse openStoryDetail()** — Tapping a story opens the existing detail overlay with AI summary, WhatsApp share, and back button. No new detail view needed.

5. **Category grouping** — The 14 EventCategory values are mapped to 6 chip categories to avoid chip overflow. See mapping table in Step 2.1.

6. **No "new stories" pill in v1** — The mockup shows a "3 new" green pill. Defer this to a follow-up — it requires tracking which stories the user has already seen (sessionStorage or similar).

---

## Verify

```bash
npm run typecheck   # Must show: 0 errors
```

In browser (npm run dev with VITE_VARIANT=india):
- [ ] Timeline tab shows river with real stories sorted newest first
- [ ] Time group dividers show correct buckets ("JUST NOW", "1–3 HOURS AGO", etc.)
- [ ] Category chips filter stories correctly (toggle on/off)
- [ ] "All" chip resets to show everything
- [ ] Alert stories have red left border
- [ ] Cluster stories show "N sources" badge
- [ ] Tapping a story opens the existing detail overlay with AI summary
- [ ] Back button in detail overlay returns to Timeline tab (not Home)
- [ ] 24-hour cutoff works — no stories older than 24 hours appear
- [ ] Chips scroll horizontally on narrow screens
- [ ] No TypeScript errors after all changes

### Debugging Checklist (if something looks wrong)

1. **Empty timeline** — Check `ctx.latestClusters.length` in console. If 0, news hasn't loaded yet.
2. **Categories all showing "general"** — Check that `cluster.threat?.category` is populated. May need to wait for AI classification cache.
3. **Stories don't open on tap** — Check that `openStoryDetail` is imported at the call site (it's file-scoped, not exported).
4. **Chips don't filter** — Check `data-tl-cat` attribute matches the category values in the rendered rows.

---

## Completion Log

- [ ] Phase 1 complete — [timestamp]
- [ ] Phase 2 complete — [timestamp]
- [ ] Phase 3 complete — [timestamp]
- [ ] Typecheck: 0 errors — [timestamp]
- [ ] Browser verified — [timestamp]
- [ ] **TASK 013 COMPLETE** ✅
