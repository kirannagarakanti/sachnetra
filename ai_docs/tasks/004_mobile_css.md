# Task 004 — Mobile CSS
*SachNetra Adapt Sprint*

**Depends on**: Task 003 (SachNetra Branding) must be complete
**Estimated time**: 6–8 hours
**Prep doc**: `02_ui_design.md` (home screen, story detail, state selector), `08_wireframes.md`
**Visual reference**: `ai_docs/ui-docs-reference/sachnetra_home_screen.html`, `sachnetra_story_detail (1).html`, `img-ref-06.jpeg`, `img-ref-08.jpeg`

---

## Context — Current State

The codebase is a desktop-first dashboard (WorldMonitor) with the india variant scaffolded (Tasks 001–003 complete). Current state:

- `src/styles/main.css` — 18,760 lines, **zero** mobile `@media` queries, **zero** `@media (max-width: ...)` rules
- `src/styles/panels.css` — no mobile media queries
- `src/styles/happy-theme.css` — uses `[data-variant="happy"]` CSS selectors (established pattern)
- `src/app/panel-layout.ts` — renders india-variant-specific HTML (SachNetra logo, footer, mobile menu title) via `SITE_VARIANT === 'india'` checks
- `src/app/app-context.ts` — `isMobile: boolean` field already exists (line 25)
- `src/utils/index.ts` — `isMobileDevice()` function and `MOBILE_BREAKPOINT_PX = 768` constant already defined
- `src/main.ts` — sets `document.documentElement.dataset.variant = SITE_VARIANT` (line 328), enabling CSS `[data-variant="india"]` selectors
- `src/components/MobileWarningModal.ts` — exported but never instantiated (dead code — no change needed)
- No bottom nav, story card, state selector, or time divider CSS/HTML exists yet
- Body has `overflow: hidden` preventing mobile scroll
- App layout uses `.panels-grid` (multi-column panel grid) and `.map-section` (full map)

## What This Task Does

1. Adds mobile-first CSS to `main.css` using `[data-variant="india"]` scoped media queries
2. Adds mobile-specific HTML to `panel-layout.ts` for india variant (bottom nav, state bar, news feed container, time dividers)
3. Adds tab switching and state selector toggle JavaScript in `panel-layout.ts`
4. Adds story detail CSS classes (CSS-only — data wiring is Task 5)
5. Hides desktop-only elements (panel grid, map section, variant switcher, etc.) on mobile

---

## Files To Open Before Starting

```
src/styles/main.css                     — add all mobile CSS here
src/styles/happy-theme.css              — reference pattern for [data-variant] CSS selectors (READ ONLY)
src/app/panel-layout.ts                 — add mobile HTML structure + JS behavior
src/app/app-context.ts                  — verify isMobile exists (likely no changes needed)
ai_docs/ui-docs-reference/sachnetra_home_screen.html    — pixel-perfect CSS values
ai_docs/ui-docs-reference/sachnetra_story_detail (1).html — pixel-perfect CSS values
ai_docs/prep/02_ui_design.md            — design spec
ai_docs/prep/08_wireframes.md           — layout spec
```

---

## Pattern To Follow

### CSS Scoping — from `happy-theme.css`:
```css
/* Scope variant-specific styles to the variant's data attribute */
[data-variant="happy"] .panel { ... }
[data-variant="happy"] .panel-header { ... }
```

For india mobile, combine variant + breakpoint:
```css
@media (max-width: 768px) {
  [data-variant="india"] .panels-grid { display: none; }
  [data-variant="india"] .sn-bottom-nav { display: flex; }
}
```

### HTML Injection — from `panel-layout.ts` line 128+:
```typescript
// Existing pattern: conditional HTML for india variant
${SITE_VARIANT === 'india' ? '' : `<div class="variant-switcher">...`}
${SITE_VARIANT === 'india'
  ? `<span class="logo sn-logo">...</span>`
  : '<span class="logo">MONITOR</span>'}
```

### Mobile-specific setup — from `panel-layout.ts` line 359:
```typescript
if (this.ctx.isMobile) {
  this.setupMobileMapToggle();
}
```

Follow this exact pattern for india mobile setup:
```typescript
if (this.ctx.isMobile && SITE_VARIANT === 'india') {
  this.setupMobileIndiaLayout();
}
```

---

## Implementation

### Phase 1: Mobile Layout Foundation (CSS)
**Goal**: Body scrolls on mobile, desktop elements hidden, india-specific backgrounds applied

- [ ] **Step 1.1** — Add india mobile base styles to `main.css`
  - File: `src/styles/main.css`
  - Where: Append after the existing `[data-theme="light"]` section (after line ~206)
  - Add section comment `/* SachNetra India — Mobile Layout */`
  - Add `@media (max-width: 768px)` block scoped to `[data-variant="india"]`:
    - `html, body` — `overflow: auto; overflow-x: hidden;`
    - `body` — `background: var(--sn-dark-bg); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 16px;`
    - `#app` — `overflow: auto; overflow-x: hidden; min-height: 100vh;`
    - Hide: `.panels-grid`, `.map-section`, `.site-footer`, `.variant-switcher`, `.region-selector`, `.status-indicator`, `.header-right`, `.credit-link`, `.github-link`, `.search-btn`, `.copy-link-btn`, `.fullscreen-btn`, `.download-wrapper`, `.search-mobile-fab`, `.mobile-settings-btn` — all `display: none !important`
    - `.header` — `background: linear-gradient(180deg, var(--sn-deep-bg) 0%, var(--sn-dark-bg) 100%); height: auto; padding: 14px 16px 10px;`
  - Use `--sn-*` CSS variables throughout. Never hardcode hex.

### Phase 2: Mobile Header + State Bar + Feed Container (HTML + JS)
**Goal**: India mobile layout renders correct HTML structure

- [ ] **Step 2.1** — Add mobile HTML to `renderLayout()` in `panel-layout.ts`
  - File: `src/app/panel-layout.ts`
  - Where: Inside the `renderLayout()` method, add india-mobile-specific content after the header div (around line 226)
  - Guard: `SITE_VARIANT === 'india' && this.ctx.isMobile`
  - Inject:
    - State selector bar: `<div class="sn-state-bar" id="snStateBar">` with star icon + "All India" + "Change state ▼"
    - State grid (hidden by default): `<div class="sn-state-grid" id="snStateGrid">` with 2-column grid of states
    - News feed container: `<div class="sn-feed" id="snFeed">` (empty, filled by data loader)
    - Today's Brief card placeholder: `<div class="sn-brief" id="snBrief">`
    - Time divider: `<div class="sn-time-divider">` using `getTimeDividerLabel()`
    - Bottom nav: `<nav class="sn-bottom-nav" id="snBottomNav">` with 4 tabs (Home/Timeline/Map/States) using SVG icons from mockup HTML

- [ ] **Step 2.2** — Add `setupMobileIndiaLayout()` method
  - File: `src/app/panel-layout.ts`
  - Add private method called after `renderLayout()` when `this.ctx.isMobile && SITE_VARIANT === 'india'`
  - Tab switching: click handlers on `.sn-nav-tab` to toggle active tab class + show/hide content sections
  - State bar toggle: click handler on `#snStateBar` to show/hide `#snStateGrid`
  - Map tab lazy-load: defer `MapContainer` initialization until Map tab first tapped

- [ ] **Step 2.3** — Add `getTimeDividerLabel()` utility function
  - File: `src/app/panel-layout.ts` (private static or module-level)
  - Implementation per roadmap:
    ```typescript
    function getTimeDividerLabel(): string {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 11)  return 'Yesterday';
      if (hour >= 11 && hour < 17) return 'This morning';
      if (hour >= 17 && hour < 22) return 'This afternoon';
      return 'Today';
    }
    ```

### Phase 3: State Bar + Bottom Nav + Feed CSS
**Goal**: All mobile components properly styled

- [ ] **Step 3.1** — Add state bar CSS
  - File: `src/styles/main.css` (inside the `@media` block from Phase 1)
  - `.sn-state-bar` — `background: #13112a; border-radius: 10px; padding: 8px 12px; border: 0.5px solid #2a2848; margin: 0 16px 12px;`
  - `.sn-state-bar.expanded` — `border-color: var(--sn-purple);`
  - `.sn-state-grid` — `display: none; grid-template-columns: 1fr 1fr; gap: 6px; padding: 8px 16px;`
  - `.sn-state-grid.visible` — `display: grid;`
  - State cells — `background: var(--sn-card-bg); border-radius: 8px; padding: 10px 12px; border: 0.5px solid var(--sn-border);`
  - Selected cell — `background: #1a1040; border-color: var(--sn-purple);`

- [ ] **Step 3.2** — Add bottom nav CSS
  - File: `src/styles/main.css` (inside `@media` block)
  - `.sn-bottom-nav` — `position: fixed; bottom: 0; left: 0; right: 0; background: var(--sn-deep-bg); border-top: 0.5px solid var(--sn-border); padding: 8px 16px 12px; display: flex; justify-content: space-around; z-index: 100;`
  - `.sn-nav-tab` — `display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; cursor: pointer;`
  - `.sn-nav-tab span` — `font-size: 10px; color: var(--sn-text-muted);`
  - `.sn-nav-tab.active span` — `color: var(--sn-purple);`
  - `.sn-nav-tab.active svg` stroke — `var(--sn-purple)`
  - Feed container gets `padding-bottom: 60px` (space for fixed bottom nav)

- [ ] **Step 3.3** — Add Today's Brief CSS
  - `.sn-brief` — `background: #13112a; border-radius: 12px; padding: 12px 14px; margin: 0 16px 12px; border: 0.5px solid #2a2848;`
  - `.sn-brief-label` — purple dot (6px circle `var(--sn-purple)`) + `11px uppercase letter-spacing: 0.08em color: var(--sn-purple)`
  - `.sn-brief-text` — `13px color: #c8c0e8 line-height: 1.6`

- [ ] **Step 3.4** — Add time divider CSS
  - `.sn-time-divider` — `display: flex; align-items: center; gap: 8px; margin: 6px 16px;`
  - Flanking lines: `height: 1px; flex: 1; background: var(--sn-border);`
  - Label: `font-size: 11px; color: var(--sn-text-muted); text-transform: uppercase; letter-spacing: 0.1em;`

- [ ] **Step 3.5** — Add story card CSS
  - `.sn-story-card` — `background: var(--sn-card-bg); border-radius: 12px; padding: 12px 14px; margin: 0 16px 8px; border: 0.5px solid var(--sn-border);`
  - `.sn-story-card-body` — `display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;`
  - `.sn-story-badge` — `font-size: 10px; background: var(--sn-border); color: var(--sn-text-secondary); padding: 2px 7px; border-radius: 4px;`
  - `.sn-story-sources` — `font-size: 10px; color: var(--sn-text-muted);`
  - `.sn-story-title` — `font-size: 13px; font-weight: 500; color: var(--sn-text-primary); line-height: 1.4;`
  - `.sn-story-summary` — `font-size: 12px; color: #6b6090; line-height: 1.5;`
  - `.sn-story-thumb` — `width: 52px; height: 52px; border-radius: 8px; background: #1e1830; flex-shrink: 0;`
  - `.sn-story-footer` — `display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 0.5px solid var(--sn-border);`
  - `.sn-story-meta` — `font-size: 11px; color: var(--sn-text-muted);`
  - Min touch target: 44px on all interactive elements

### Phase 4: Story Detail CSS (CSS-only)
**Goal**: CSS classes ready for story detail screen (data wiring in Task 5)

- [ ] **Step 4.1** — Add story detail CSS
  - File: `src/styles/main.css` (inside `@media` block)
  - `.sn-detail` — full-screen overlay (`position: fixed; inset: 0; z-index: 200; background: var(--sn-dark-bg); display: flex; flex-direction: column;`)
  - `.sn-detail-header` — back button + share icon, `background: linear-gradient(180deg, var(--sn-deep-bg), var(--sn-dark-bg)); padding: 14px 16px 12px; border-bottom: 0.5px solid var(--sn-border);`
  - `.sn-detail-back` — `28px circle, #1a1830 bg`
  - `.sn-detail-body` — `flex: 1; overflow-y: auto; padding: 16px;`
  - `.sn-detail-title` — `font-size: 16px; font-weight: 500; color: var(--sn-text-primary); line-height: 1.4;`
  - `.sn-what-happened` — `background: #13112a; border-radius: 12px; padding: 14px; border: 0.5px solid #2a2848;`
    - Label: purple dot + "WHAT HAPPENED" in `var(--sn-purple)`, 11px uppercase
    - Text: `13px; color: #c8c0e8; line-height: 1.7;`
  - `.sn-what-means` — `background: #0f1a0f; border-radius: 12px; padding: 14px; border: 0.5px solid #1a2e1a;`
    - Label: green dot + "WHAT THIS MEANS" in `var(--sn-green)`, 11px uppercase
    - Text: `13px; color: #a8c8a8; line-height: 1.7;`
  - `.sn-sources-list` — collapsible sources section with tier badges
  - `.sn-whatsapp-btn` — `background: linear-gradient(90deg, #25a244, #1da035); border-radius: 10px; padding: 12px; color: white; font-size: 13px; font-weight: 500;` pinned at bottom
  - `.sn-skeleton` — shimmer loading animation (`@keyframes sn-shimmer { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }`)

---

## Read vs Write

**READ for reference (always allowed):**
- `src/config/variants/full.ts` — study pattern, never write
- `src/config/variants/tech.ts` — study pattern, never write
- `src/styles/happy-theme.css` — CSS `[data-variant]` scoping pattern
- `src/components/Panel.ts` — base panel class reference
- `src/utils/index.ts` — `isMobileDevice()`, `MOBILE_BREAKPOINT_PX`
- `ai_docs/ui-docs-reference/*` — visual reference mockups

**WRITE only to these files:**
- `src/styles/main.css` — all mobile CSS
- `src/app/panel-layout.ts` — mobile HTML structure + JS behavior

**Never write to:**
- `src/config/variants/full.ts` — SACRED
- `src/config/variants/tech.ts` — SACRED
- `src/config/variants/finance.ts` — SACRED
- `src/config/variants/india.ts` — not needed for this task
- `src/App.ts` — not needed (MobileWarningModal is dead code)
- `src/app/app-context.ts` — `isMobile` already exists, no changes needed

---

## Verify

```bash
npm run typecheck   # Must show: 0 errors
```

In browser (`npm run dev` with `VITE_VARIANT=india`, Chrome DevTools → iPhone SE 375px):

- [ ] App renders at 375px without horizontal scroll
- [ ] SachNetra header visible with logo, search icon, bell icon
- [ ] State bar shows "★ All India · Change state ▼"
- [ ] Tapping state bar expands 2-column grid of states
- [ ] Tapping "Done" or a state collapses the grid
- [ ] Today's Brief card visible with purple dot + text
- [ ] Time divider text shows (e.g., "This morning")
- [ ] Story cards show category badge, title, summary, thumbnail, meta
- [ ] Bottom nav shows 4 tabs: Home · Timeline · Map · States
- [ ] Tapping each tab switches visible content
- [ ] Map tab does NOT load map until first tap
- [ ] News feed scrolls smoothly
- [ ] No desktop panel grid visible
- [ ] Touch targets ≥ 44px height
- [ ] No text smaller than 11px

### Debugging Checklist (if something looks wrong)

1. **No mobile styles?** — Check `document.documentElement.dataset.variant` === `'india'` in console
2. **Desktop layout showing?** — Check viewport width is ≤ 768px (DevTools device toolbar)
3. **Panel grid visible?** — `.panels-grid { display: none }` not applying — check CSS specificity
4. **Bottom nav missing?** — HTML not injected — check `SITE_VARIANT === 'india' && this.ctx.isMobile` guard
5. **Clear localStorage** — `localStorage.clear(); location.reload();` — stale cached panel settings can interfere

---

### Phase 5: India keyword enrichment — threat classifier
**Goal**: Improve category accuracy for India-variant stories by adding Indian-specific keywords to the existing `MEDIUM_KEYWORDS` and `LOW_KEYWORDS` maps in `src/services/threat-classifier.ts`.

**Write only to**: `src/services/threat-classifier.ts`
**Do not**: change map structure, rename keys, or touch `CRITICAL_KEYWORDS`, `HIGH_KEYWORDS`, or any `TECH_*` maps.

- [x] **Step 5.1** — Add to `MEDIUM_KEYWORDS` (lines 165–199)
  - **Indian politics**: `parliament`, `lok sabha`, `rajya sabha`, `minister`, `chief minister`, `bjp`, `congress`, `modi`, `kejriwal`, `policy` → `'diplomatic'`
  - **Indian economy**: `gst`, `rbi`, `rupee`, `sensex`, `nifty`, `crore`, `lakh`, `startup`, `funding`, `ipo`, `budget` → `'economic'`
  - **Indian disaster/environment**: `cyclone`, `landslide` → `'disaster'`; `ngt`, `forest` → `'environmental'`
  - **Indian tech/education**: `dpdp` → `'tech'`; `ugc`, `nta`, `upsc` → `'diplomatic'`
  - ⚠️ `election` was **NOT** added to MEDIUM — it already exists in `LOW_KEYWORDS` (line 202). Adding it to MEDIUM would shadow the LOW entry but is a duplicate. Leave as-is.

- [x] **Step 5.2** — Add to `LOW_KEYWORDS` (lines 201–229)
  - **Indian governance/judiciary**: `scheme`, `yojana`, `supreme court`, `high court` → `'diplomatic'`
  - **Indian science/tech**: `isro`, `semiconductor`, `ai model` → `'tech'`
  - ⚠️ `startup` and `ai model` also exist in `TECH_LOW_KEYWORDS` — keeping them in `LOW_KEYWORDS` too is intentional (the `india` variant doesn't use `TECH_*` maps, so this is the only way these get matched for India stories).

- [x] **Verify**: `npm run typecheck` → 0 errors

---

## Completion Log

- [x] Phase 1 complete — Mobile layout foundation CSS — 2026-03-21 17:10 IST
- [x] Phase 2 complete — Mobile HTML + JS (header, state bar, feed, bottom nav) — 2026-03-23 12:15 IST
- [x] Phase 3 complete — Component CSS (state bar, bottom nav, brief, time dividers, story cards) — 2026-03-23 12:15 IST
- [x] Phase 4 complete — Story detail CSS (CSS-only) — 2026-03-23 13:25 IST
- [x] Phase 5 complete — India keyword enrichment in threat classifier — 2026-04-05
- [x] Typecheck: 0 errors — 2026-04-05
- [x] **TASK 004 COMPLETE** ✅ — 2026-03-23 13:35 IST

---

## Session Notes — Lessons Learned for Future Agents

### Lesson 1 — Mobile-only HTML must be hidden on desktop by default

**Problem**: We injected mobile-specific HTML (state bar, state grid, feed container, bottom nav) into `panel-layout.ts` for the India variant. The CSS for these elements was **inside** the `@media (max-width: 768px)` block. On desktop (>768px), the HTML rendered unstyled at the bottom of the page — raw text like "LadakhLeh", "Done", "TODAY'S BRIEF", "Loading stories…", and the bottom nav tabs appeared as plain text in the bottom-left corner.

**Root cause**: CSS rules inside a media query don't apply outside it. The mobile elements had no `display: none` rule at desktop widths.

**Solution**: Add a default `display: none` rule **outside** the media query for all mobile-only elements:
```css
/* Hidden on desktop by default */
[data-variant="india"] .sn-state-bar,
[data-variant="india"] .sn-feed,
[data-variant="india"] .sn-bottom-nav { display: none; }

@media (max-width: 768px) {
  /* Re-show on mobile */
  [data-variant="india"] .sn-state-bar { display: block; }
  [data-variant="india"] .sn-bottom-nav { display: flex; }
}
```

**Future agents**: When adding mobile-only HTML that exists in the DOM at all screen sizes, **always** add a desktop `display: none` rule outside the media query first, then override it inside the media query. Never assume that "it's inside the media query so it won't show on desktop" — the HTML still renders unstyled.

---

### Lesson 2 — Existing CSS rules can silently hide new elements

**Problem**: After adding the SachNetra header logo in Phase 1, the logo was invisible on mobile. The header showed nothing — just empty space. Desktop view showed it fine.

**Root cause**: An existing rule at line ~11450 in `main.css`:
```css
@media (max-width: 768px) {
  .logo { display: none; }
}
```
This existed to hide the WorldMonitor "MONITOR" text on mobile. But our SachNetra logo used `<span class="logo sn-logo">`, which **also matched** `.logo` and got hidden.

**Solution**: Override with higher specificity + `!important`:
```css
@media (max-width: 768px) {
  [data-variant="india"] .sn-logo {
    display: flex !important;
  }
}
```

**Future agents**: Before adding any new element, **search the entire CSS file** for existing rules that match the element's classes. In a 19,000+ line CSS file, there are many mobile overrides you won't know about. Run a quick search for the class name before assuming your new styles will apply.

---

### Lesson 3 — State grid should overlay, not push content

**Problem**: When the state selector expanded, it pushed the Today's Brief card and all content below it downward, making the user lose their scroll position. On the 4th screenshot the user sent, the state grid was inline and the rest of the page was pushed way down.

**Root cause**: The state grid was rendered inline in the DOM flow (`display: block` when open), which naturally pushed sibling elements down.

**Solution**: Make the state grid an absolute overlay:
```css
[data-variant="india"] .sn-state-grid {
  position: absolute;
  left: 16px; right: 16px;
  z-index: 30;
  max-height: 70vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
}
```

**Future agents**: Any expandable selector/dropdown on mobile should use `position: absolute` or `position: fixed` so it overlays content rather than pushing it. Include `max-height` + `overflow-y: auto` so the overlay doesn't exceed viewport height.

---

### Lesson 4 — Include all states from day one

**Problem**: The initial state grid only had 12 states (the "biggest" ones). The user noticed that Telangana, Andhra Pradesh, and many others were missing. We had a dummy "+ 24 more states & UTs" placeholder.

**Root cause**: We hard-coded only major states as a shortcut, planning to add the rest "later." But the grid is a static HTML list — there's no dynamic loading or pagination. All states should have been included from the start.

**Solution**: Added all 28 states + 4 major UTs (Delhi, J&K, Ladakh) = 32 entries in the grid. Removed the "+ 24 more" placeholder entirely.

**Future agents**: India has 28 states and 8 union territories. When building any state selector for the India variant, include **all** of them. Don't skip "smaller" states — users from Nagaland, Sikkim, and Mizoram deserve equal representation. The grid is scrollable, so length isn't a UX problem.

---

### Lesson 5 — Use `!important` sparingly but know when it's the right tool

**Problem**: Several elements (hamburger button, mobile menu, pro banner) kept appearing on mobile despite being in our hide list. Every time we fixed one, another would appear.

**Root cause**: Existing mobile media queries in `main.css` had rules like:
```css
@media (max-width: 768px) {
  .hamburger-btn { display: flex; }
}
```
These rules existed for the WorldMonitor mobile experience. Our `display: none` rules had equal or lower specificity, so the existing `display: flex` won.

**Solution**: Use `!important` on the hide rules:
```css
[data-variant="india"] .hamburger-btn,
[data-variant="india"] .mobile-menu { display: none !important; }
```

**Future agents**: In a large CSS file with existing mobile rules, you will inevitably hit specificity conflicts. The pattern is:
1. First try: Add your rule with `[data-variant="india"]` prefix (higher specificity)
2. If that doesn't work: Check if there's an existing `!important` or a more specific selector
3. Last resort: Use `!important` on your override — but **only** for hide/show overrides, not for styling properties

---

### Lesson 6 — Phase 8 CSS-only work still needs careful class naming

**Problem**: The story detail screen CSS (Phase 8) had no visible output because the story detail view isn't wired to data yet (that's Task 5). But we needed to ensure the CSS class names wouldn't conflict with anything existing.

**Solution**: All story detail classes used a dedicated prefix: `sn-detail-*` (e.g., `.sn-detail-header`, `.sn-detail-what-happened`, `.sn-detail-whatsapp`). This avoids any chance of collision with existing WorldMonitor classes or the home screen `sn-*` classes.

**Naming convention established**:
| Scope | Prefix | Example |
|---|---|---|
| Home screen feed | `sn-` | `.sn-story-card`, `.sn-brief` |
| State selector | `sn-state-` | `.sn-state-bar`, `.sn-state-grid` |
| Bottom nav | `sn-nav-` | `.sn-nav-tab` |
| Story detail | `sn-detail-` | `.sn-detail-what-happened` |

**Future agents**: When adding CSS for a new SachNetra screen/feature, use a specific sub-prefix (e.g., `sn-search-*` for search, `sn-profile-*` for profiles). Don't reuse existing class names from other screens.

---

### Lesson 7 — `display: ''` is not `display: block` — empty string falls through to CSS

**Problem**: After fixing the desktop leakage (Lesson 1), the Timeline, Map, and States tabs showed completely blank dark screens. No placeholder text was visible.

**Root cause**: The tab switching code used:
```typescript
el.style.display = key === tabKey ? '' : 'none';
```
Setting `display: ''` **removes** the inline style entirely. This is normally fine — the element falls through to its CSS-defined display value. But our CSS had `display: none` (the desktop-hide rule from Lesson 1). So the cascade was:
1. JS sets `display: ''` → removes inline style
2. CSS `[data-variant="india"] .sn-timeline-tab { display: none }` kicks in
3. Element stays hidden

**Solution**: Use an explicit value instead of empty string:
```typescript
el.style.display = key === tabKey ? 'block' : 'none';
```

**Future agents**: Never use `el.style.display = ''` as a "show" action when there are CSS rules that might hide the element. Always use the explicit display type (`'block'`, `'flex'`, `'grid'`). The empty-string trick only works when the CSS default for that element is visible.

---

### Lesson 8 — Don't remove placeholder UI before the real feature is wired

**Problem**: The Map tab showed a blank screen even after fixing Lesson 7. The "Tap to load map" placeholder text was missing.

**Root cause**: The lazy-load code immediately ran on first tap and **removed** the placeholder:
```typescript
if (tabKey === 'map' && !mapInitialized) {
  mapInitialized = true;
  if (mapPlaceholder) mapPlaceholder.remove();  // ← deleted the only visible content
}
```
It also tried to show `#mapSection`, but that element was hidden by Phase 1's CSS (`.map-section { display: none !important }`). So: placeholder removed + map section hidden = blank screen.

**Solution**: Comment out the lazy-load logic entirely until Task 6 (map integration) wires the actual map. Keep the placeholder visible:
```typescript
// When map integration is ready (Task 6), uncomment:
// document.querySelector('.sn-map-placeholder')?.remove();
```

**Future agents**: When building a multi-tab layout, never remove placeholder content until the real feature is wired and rendering. Placeholder → blank is worse than placeholder → placeholder. Leave TODO comments for the future task to uncomment the wiring code.
