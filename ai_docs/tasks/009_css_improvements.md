# Task 009 — CSS & UI Improvements
*SachNetra Adapt Sprint*

**Depends on**: Task 008 must be complete
**Estimated time**: 1.5 hours
**Prep doc**: 02_ui_design.md (mobile feed, state selector, detail screen)

---

## Context — Current State

**Feed card layout** (`src/app/data-loader.ts`, lines 1335-1365):
The `renderIndiaStoryCards()` method builds a card HTML template. The card structure is:
```
sn-story-card
  sn-story-card-body
    sn-story-content
      sn-story-badges
      sn-story-title
    sn-story-thumb          ← empty 52×52 placeholder (no icon inside)
  sn-story-footer            ← timestamp + actions
```
The design reference (`img-ref-06.jpeg`) shows each card should have a category-specific SVG icon inside the thumbnail box (e.g. map pin for Disaster, chart for Economy). Currently the `sn-story-thumb` div (line 1350) is empty — just a purple 52×52 square with nothing in it.

**EventCategory values** (from `src/types/index.ts` line 78-81):
```typescript
type EventCategory =
  | 'conflict' | 'protest' | 'disaster' | 'diplomatic' | 'economic'
  | 'terrorism' | 'cyber' | 'health' | 'environmental' | 'military'
  | 'crime' | 'infrastructure' | 'tech' | 'general';
```
The card reads `item.threat?.category ?? 'General'` and displays it as a badge. We'll also use this value to pick an SVG icon for the thumbnail.

**State selector** (`src/app/panel-layout.ts`, lines 355-393):
The state selector grid is toggled open/closed from the `sn-state-bar`. A "Done" button (`sn-state-done`, line 392) closes the grid. Cell taps select a state AND close the grid (via `closeStateGrid()` on line 682). The Done button is redundant since cell tap already closes. There is no close X button.

**State selector CSS** (main.css around lines 19093-19111):
`.sn-state-done` is a full-width purple button at the bottom of the grid.

**Story detail overlay** (`src/app/data-loader.ts`, lines 195-360):
The detail overlay layout is:
```
sn-detail (fixed full-screen)
  sn-detail-header (back button + share)
  sn-detail-body (scrollable)
    meta + title + separator
    snDetailCards (AI summary cards)
    sn-detail-sources (source info)      ← inside snDetailCards after AI load
  sn-detail-share (pinned WhatsApp button)
```
The sources section is rendered INSIDE `snDetailCards` (appended after AI summary at line 337-352). The `sn-detail-body` has `padding-bottom: 80px` (CSS line 19556) to make room for the WhatsApp button (`.sn-detail-share`). The `gap: 14px` on `.sn-detail-body` (CSS line 19553) also adds space. Combined, there is extra vertical space between the sources section and the WhatsApp share button.

## What This Task Does

1. **Feed card icons**: Populate the `sn-story-thumb` box with a category-specific SVG icon (matching the design reference). Each `EventCategory` maps to a unique inline SVG.
2. **State selector**: Remove the "Done" button. Add a close X button at the top-right of the state grid. Tapping any state selects it and closes the grid immediately (already works). Tapping X closes without changing selection.
3. **Detail screen gap**: Reduce the empty space between the sources section and the WhatsApp button by reducing `padding-bottom` on `.sn-detail-body` and adjusting the gap.

---

## Files To Open Before Starting

```
src/app/data-loader.ts       — story card template + detail overlay
src/app/panel-layout.ts      — state selector grid HTML + event handlers
src/styles/main.css           — all SachNetra CSS rules (end of file, ~line 19000+)
```

---

## Pattern To Follow

From `src/app/data-loader.ts`, the current story card template (line 1340-1364):
```typescript
return `
  <div class="sn-story-card" data-story-idx="${idx}" role="button" tabindex="0">
    <div class="sn-story-card-body">
      <div class="sn-story-content">
        <div class="sn-story-badges">
          <span class="sn-story-badge">${escapeHtml(category)}</span>
          <span class="sn-story-sources">${escapeHtml(item.source)}</span>
        </div>
        <p class="sn-story-title">${escapeHtml(item.title)}</p>
      </div>
      <div class="sn-story-thumb" aria-hidden="true"></div>
    </div>
    <div class="sn-story-footer">
      ...
    </div>
  </div>
`;
```

The `sn-story-thumb` div is always rendered but empty. The design reference shows it should contain a category-specific SVG icon.

---

## Implementation

### Phase 1: Feed card — add category icons to the thumbnail box
**Goal**: Populate each card's `sn-story-thumb` with an SVG icon matching the story's `EventCategory`. Matches the design reference (img-ref-06.jpeg).

- [ ] **Step 1.1** — Add a `getCategoryIcon(category: string): string` helper function
  - File: `src/app/data-loader.ts`
  - Where: Just above the `renderIndiaStoryCards()` method, or near the top of the SachNetra helper section (around line 185).
  - What: A function that takes a category string and returns an inline SVG string.
  - Icon mapping (24×24 viewBox, stroke-based, `currentColor`):

| Category | Icon | SVG Description |
|---|---|---|
| `disaster` | 📍 Map pin | Teardrop pin with circle |
| `conflict` | ⚔️ Crossed swords | Two crossed diagonal lines |
| `protest` | ✊ Raised fist | Megaphone shape |
| `economic` | 📈 Chart line | Rising polyline chart |
| `diplomatic` | 🤝 Handshake | Two connected arcs |
| `terrorism` | ⚠️ Warning | Triangle with exclamation |
| `cyber` | 🛡️ Shield | Shield outline |
| `health` | ❤️ Heart | Heart or cross shape |
| `environmental` | 🌿 Leaf | Leaf shape |
| `military` | 🎖️ Shield star | Shield with star |
| `crime` | 🔒 Lock | Padlock outline |
| `infrastructure` | 🏗️ Building | Grid/building outline |
| `tech` | 💻 Monitor | Monitor with code |
| `general` | 📰 Newspaper | Document/page with lines |

  - All SVGs use: `width="24" height="24" viewBox="0 0 24 24" fill="none"`, strokes use `stroke="currentColor" stroke-width="1.5"`.

  ```typescript
  function getCategoryIcon(category: string): string {
    const cat = category.toLowerCase();
    switch (cat) {
      case 'disaster':
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2C9 2 7 5 7 8C7 12 12 18 12 18C12 18 17 12 17 8C17 5 15 2 12 2Z" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="12" cy="8" r="2" fill="currentColor"/></svg>';
      case 'conflict':
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 19L12 5L19 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><line x1="12" y1="12" x2="12" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>';
      case 'protest':
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 21L5 14L14 5L19 10L10 19L3 21Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M14 5L19 10" stroke="currentColor" stroke-width="1.5"/></svg>';
      case 'economic':
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><polyline points="3,17 8,12 13,15 21,7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
      case 'diplomatic':
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="8" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="16" cy="8" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M6 14C6 14 8 18 12 18C16 18 18 14 18 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>';
      case 'terrorism':
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3L22 20H2L12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/><line x1="12" y1="10" x2="12" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="17" r="0.8" fill="currentColor"/></svg>';
      case 'cyber':
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3L20 7V13C20 17 16 20 12 22C8 20 4 17 4 13V7L12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/></svg>';
      case 'health':
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 4H15V8H19V14H15V18H9V14H5V8H9V4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/></svg>';
      case 'environmental':
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 21C12 21 4 14 4 9C4 5 8 3 12 6C16 3 20 5 20 9C20 14 12 21 12 21Z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';
      case 'military':
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3L20 7V13C20 17 16 20 12 22C8 20 4 17 4 13V7L12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M12 8L13.5 11H16L14 13L15 16L12 14L9 16L10 13L8 11H10.5L12 8Z" fill="currentColor"/></svg>';
      case 'crime':
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="7" y="11" width="10" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M9 11V8C9 6 10.3 5 12 5C13.7 5 15 6 15 8V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>';
      case 'infrastructure':
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="4" y1="10" x2="20" y2="10" stroke="currentColor" stroke-width="1"/><line x1="12" y1="10" x2="12" y2="20" stroke="currentColor" stroke-width="1"/></svg>';
      case 'tech':
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="8" y1="20" x2="16" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="17" x2="12" y2="20" stroke="currentColor" stroke-width="1.5"/></svg>';
      default: // 'general' and any unknown
        return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" stroke-width="1"/><line x1="8" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="1"/><line x1="8" y1="16" x2="12" y2="16" stroke="currentColor" stroke-width="1"/></svg>';
    }
  }
  ```

- [ ] **Step 1.2** — Replace the empty thumb div with the icon
  - File: `src/app/data-loader.ts`
  - What to do: In `renderIndiaStoryCards()` (around line 1350), change:
    ```html
    <div class="sn-story-thumb" aria-hidden="true"></div>
    ```
    to:
    ```html
    <div class="sn-story-thumb" aria-hidden="true">${getCategoryIcon(category)}</div>
    ```
  - The `category` variable already exists on line 1337: `const category = item.threat?.category ?? 'General';`

- [ ] **Step 1.3** — Update the `.sn-story-thumb` CSS to center the icon
  - File: `src/styles/main.css`
  - What to do: Add `display: flex; align-items: center; justify-content: center;` and `color: var(--sn-purple);` to the existing `.sn-story-thumb` rule (line 19358-19365).
  - Updated CSS:
    ```css
    [data-variant="india"] .sn-story-thumb {
      width: 52px;
      height: 52px;
      border-radius: 8px;
      background: #1e1830;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #7b7bff;
    }
    ```

### Phase 2: State selector — replace Done button with close X
**Goal**: Replace the Done button with a close X in the top-right corner of the state grid. Ensure tapping state selects + closes, tapping X closes without changing selection.

- [ ] **Step 2.1** — Replace the Done button with a close X button in the state grid HTML
  - File: `src/app/panel-layout.ts`
  - What to do: In the state grid HTML (around lines 355-393), make these changes:
    1. Add a header row inside `sn-state-grid` containing the label and a close X button, replacing the existing `<p>` label.
    2. Remove the `<button class="sn-state-done" id="snStateDone">Done</button>` (line 392).
  - Replace the block from line 356-392 with:
    ```html
    <div class="sn-state-grid-header">
      <p class="sn-state-grid-label">SELECT YOUR STATE</p>
      <button class="sn-state-grid-close" id="snStateClose" aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="sn-state-grid-cells">
      ... (existing cells unchanged)
    </div>
    ```
    (Remove the Done button entirely.)

- [ ] **Step 2.2** — Update event handler: replace `stateDone` with `snStateClose`
  - File: `src/app/panel-layout.ts`
  - What to do: In `setupMobileIndiaLayout()` (around line 619):
    1. Change `const stateDone = document.getElementById('snStateDone');` to `const stateClose = document.getElementById('snStateClose');`
    2. Change the `stateDone?.addEventListener(...)` block (lines 640-643) to use `stateClose`.

- [ ] **Step 2.3** — Add CSS for the state grid header and close button
  - File: `src/styles/main.css`
  - What to do: Add styles for `.sn-state-grid-header` and `.sn-state-grid-close` near the existing state grid styles. Replace the `.sn-state-done` styles.
    ```css
    [data-variant="india"] .sn-state-grid-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 4px 8px;
    }

    [data-variant="india"] .sn-state-grid-close {
      background: none;
      border: none;
      color: var(--sn-text-muted);
      cursor: pointer;
      padding: 8px;
      min-height: 44px;
      min-width: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-tap-highlight-color: transparent;
    }
    ```
  - Remove the `.sn-state-done` CSS rule.

### Phase 3: Detail screen — reduce gap between sources and WhatsApp button
**Goal**: Reduce the empty space between the sources section and the WhatsApp share button in the story detail overlay.

- [ ] **Step 3.1** — Reduce `padding-bottom` on `.sn-detail-body`
  - File: `src/styles/main.css`
  - What to do: Change `padding-bottom: 80px;` (line 19556) to `padding-bottom: 16px;` on `.sn-detail-body`. The WhatsApp button is positioned `sticky` at bottom, so only a small gap is needed.

---

## Before / After

### Feed card icons (data-loader.ts)

**Before**:
```typescript
        <div class="sn-story-thumb" aria-hidden="true"></div>
```

**After**:
```typescript
        <div class="sn-story-thumb" aria-hidden="true">${getCategoryIcon(category)}</div>
```

**New helper function** (added near line 185):
```typescript
function getCategoryIcon(category: string): string { /* switch on category, returns SVG */ }
```

### State selector (panel-layout.ts)

**Before**:
```html
<div class="sn-state-grid" id="snStateGrid">
  <p class="sn-state-grid-label">SELECT YOUR STATE</p>
  <div class="sn-state-grid-cells">
    ... cells ...
  </div>
  <button class="sn-state-done" id="snStateDone">Done</button>
</div>
```

**After**:
```html
<div class="sn-state-grid" id="snStateGrid">
  <div class="sn-state-grid-header">
    <p class="sn-state-grid-label">SELECT YOUR STATE</p>
    <button class="sn-state-grid-close" id="snStateClose" aria-label="Close">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
  <div class="sn-state-grid-cells">
    ... cells ...
  </div>
</div>
```

### Detail screen gap (main.css)

**Before**:
```css
[data-variant="india"] .sn-detail-body {
  /* ... */
  padding-bottom: 80px; /* space for WhatsApp button */
}
```

**After**:
```css
[data-variant="india"] .sn-detail-body {
  /* ... */
  padding-bottom: 16px;
}
```

---

## Read vs Write

**READ for reference (always allowed):**
- `src/config/variants/full.ts` — study pattern, quote from it, never write
- `src/config/variants/tech.ts` — study pattern, quote from it, never write

**WRITE only to files explicitly listed in this task:**
- `src/app/data-loader.ts` — add `getCategoryIcon()` helper + populate thumb div with SVG icons
- `src/app/panel-layout.ts` — state selector grid: remove Done, add close X
- `src/styles/main.css` — thumb centering CSS, state grid close button CSS, reduce detail screen gap

**Never write to:**
- `src/config/variants/full.ts` — sacred, existing live variant
- `src/config/variants/tech.ts` — sacred, existing live variant
- `src/config/variants/finance.ts` — sacred, existing live variant

---

## Verify

```bash
npm run typecheck   # Must show: 0 errors
```

In browser (npm run dev with VITE_VARIANT=india):
- [ ] Feed cards: each card shows a category-specific SVG icon in the purple thumbnail box (not empty anymore)
- [ ] State selector: Done button is gone; close X appears at top-right of state grid
- [ ] State selector: tapping a state selects it and closes the grid
- [ ] State selector: tapping X closes the grid without changing the selected state
- [ ] Detail screen: reduced gap between sources section and WhatsApp button
- [ ] All existing functionality unchanged (back button, share, AI summary loading)

### Debugging Checklist (if something looks wrong)

1. **Console errors** — check for null references from removed element IDs
2. **State selector not closing** — verify `snStateClose` event listener is wired
3. **Detail scroll cut off** — if padding-bottom is too small, content may be hidden behind WhatsApp button

⚠️ **After ANY change to panel definitions in `panels.ts`:**
Always tell James to run `localStorage.clear()` + hard refresh.
(This task does NOT modify `panels.ts`, so no cache clear needed.)

---

## Completion Log

- [x] Phase 1 complete — Category icons in feed card thumbnails — 2026-04-04
- [x] Phase 2 complete — State selector X button (Done removed) — 2026-04-04
- [x] Phase 3 complete — Detail screen gap fixed — 2026-04-04
- [x] Phase 4 complete — Icon redesign: 30px `currentColor` SVGs, new diplomatic podium icon — 2026-04-05
  - Switch wrapped in IIFE; `c` injected via `.replace('<svg ', '<svg style="color:${c}" ')` so `CATEGORY_ICON_COLOR` map still drives colour without `noUnusedLocals` errors
- [x] Typecheck: 0 errors — 2026-04-05
- [x] **TASK 009 COMPLETE** ✅

---

## Lessons Learned — For Future Agents

### Lesson 1 — Always read the predecessor task before writing a new one

**Problem**: Task 009 was written without reading Task 004 (`004_mobile_css.md`). Task 004 contained the full design spec for the detail overlay, the established HTML structure, the CSS class naming convention, and 8 detailed lessons learned from building the same screen.

**What was missed**:
- Task 004 Phase 4 described the exact detail overlay structure: `.sn-detail-body` → `#snDetailCards` (bare wrapper div) → individual cards rendered via `innerHTML`. This was the direct cause of the gap bug below.
- Task 004 established the `sn-detail-*` CSS naming convention that was already in use.
- Task 004 Lesson 3 already described the overlay/push pattern for dropdowns — directly applicable to the state grid.

**Root cause**: The task author only read the current codebase files, not the task history.

**Solution**: Before writing any new SachNetra task, always read the full chain of predecessor tasks:
```
001 → 002 → 003 → 004 → 005 → ... → current
```
Filter for tasks with overlapping feature areas (e.g., any task touching the detail screen, state selector, or feed cards).

---

### Lesson 2 — `gap` on a parent only affects direct children, not grandchildren

**Problem**: The detail screen showed zero spacing between "What Happened", "What This Means", and Sources. The initial diagnosis was wrong — we assumed `padding-bottom: 80px` on `.sn-detail-body` was the culprit and kept reducing it (80px → 16px → 24px), but that only affects the space **after the last card**, not between cards.

**Root cause**: `.sn-detail-body` had `gap: 14px` and `display: flex; flex-direction: column`. But all three AI cards (`sn-detail-what-happened`, `sn-detail-what-means`, `sn-detail-sources`) are injected as children of **`#snDetailCards`** — a single bare `<div>` that is itself one direct child of `.sn-detail-body`. The gap applied between `.sn-detail-body`'s direct children only (meta, title, sep, `#snDetailCards`, share bar) — not between the cards *inside* `#snDetailCards`.

**Solution**: Add `display: flex; flex-direction: column; gap: 14px` directly on `#snDetailCards`:
```css
[data-variant="india"] #snDetailCards {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
```

**Future agents**: Whenever cards/sections aren't spacing correctly, always check **which element is the actual parent** of the items you want to space. Use browser DevTools to inspect — `gap` is invisible if you're looking at the wrong ancestor.

---

### Lesson 3 — Read the full HTML structure before diagnosing a CSS spacing issue

**Problem**: We diagnosed the detail screen gap as a `padding-bottom` issue (Task 009's original spec said "reduce `padding-bottom: 80px`"). This was partially correct for the gap *below* the last card, but completely missed the gap issue *between* cards.

**Root cause**: The task was written from reading the CSS file (`padding-bottom: 80px` was visible) without tracing the actual HTML structure in `data-loader.ts` to understand what `#snDetailCards` was and what it contained.

**Solution**: Before writing a CSS fix for a spacing issue:
1. Find the HTML in `data-loader.ts` or `panel-layout.ts` that generates the element
2. Trace the structure: what is the parent? what are the children? are there wrapper divs?
3. **Then** diagnose where the gap needs to be applied

The correct mental model for the detail screen:
```
.sn-detail (fixed overlay)
  .sn-detail-header
  .sn-detail-body (flex col, gap:14px — between meta/title/sep/#snDetailCards/share)
    .sn-detail-meta
    .sn-detail-title
    .sn-detail-sep
    #snDetailCards (flex col, gap:14px — between the 3 AI cards)
      .sn-detail-what-happened
      .sn-detail-what-means
      .sn-detail-sources
  .sn-detail-share (sticky bottom — outside the scroll body)
```

