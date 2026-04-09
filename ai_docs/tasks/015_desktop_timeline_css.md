# Task 015 — Desktop Timeline CSS
*SachNetra Adapt Sprint*

**Depends on**: Task 013 (Timeline River Feed) must be complete
**Estimated time**: 4–6 hours
**Prep doc**: `02_ui_design.md` (brand, colors), `ai_docs/ui-docs-reference/sachnetra_hybrid_b_plus_c_desktop.html` (visual reference)

---

## Context — Current State

The india variant has a fully working **mobile** timeline experience (Tasks 004–014 complete):

- `src/styles/main.css` — 20,152 lines. All SachNetra styles live inside `@media (max-width: 768px)` blocks (lines 18845–20151). **Zero** desktop styles exist for the india variant.
- Lines 18829–18837: **Desktop-hide rules** (outside media query) set `display: none` on `.sn-state-bar`, `.sn-state-grid`, `.sn-feed`, `.sn-bottom-nav`, `.sn-map-tab`, `.sn-timeline-tab`, `.sn-states-tab`. This means **on desktop, the entire SachNetra mobile UI is hidden** and users see the default WorldMonitor desktop layout (map + panel grid).
- `src/app/panel-layout.ts` — Line 509–514: `setupMobileIndiaLayout()` only runs when `this.ctx.isMobile` is true. The HTML for the timeline tab, chips, river, state bar, bottom nav already exists in the DOM at all screen sizes (line 341–478), but it's hidden by the CSS desktop-hide rules.
- `src/app/data-loader.ts` — `renderTimelineRiver()` (line 1495) generates timeline HTML with classes: `.sn-tl-row`, `.sn-tl-dot`, `.sn-tl-content`, `.sn-tl-meta`, `.sn-tl-title`, `.sn-tl-footer`, `.sn-tl-pill`, `.sn-tl-alert`, `.sn-tl-cluster`, `.sn-tl-divider`. All CSS for these is inside `@media (max-width: 768px)`.
- Timeline chip filtering logic in `panel-layout.ts` (line 723–793) via `setupTimelineChips()` — only called from `setupMobileIndiaLayout()`, so only works on mobile.
- `isMobile` is set via `isMobileDevice()` from `src/utils/index.ts` using `MOBILE_BREAKPOINT_PX = 768`.

**Key constraint from the user**: V1 launch is April 10. No new features beyond what's already built. Map is skipped on desktop for v1 (stays mobile-only). Sidebar shows Today's Brief only (DEFCON, markets, alerts are post-v1).

## What This Task Does

1. Adds desktop CSS for the india variant timeline — un-hides the timeline tab and makes it the **primary view** on desktop (replacing the WorldMonitor panel grid)
2. Lays out the timeline river at ~70% width with category chips at the top, optimized for wide screens
3. Hides the bottom nav on desktop (desktop users don't need it — the timeline is always visible)
4. Ensures `setupTimelineChips()` also runs on desktop for the india variant (not just mobile)
5. Sidebar with Today's Brief at the top (reuses existing `populateIndiaBrief()` data)
6. Story detail opens as a **centered 640px modal** with semi-transparent backdrop — click outside to dismiss (not full-screen like mobile)

---

## Files To Open Before Starting

```
src/styles/main.css                                          — add all desktop CSS here
src/app/panel-layout.ts                                      — modify to call setupTimelineChips() on desktop
ai_docs/ui-docs-reference/sachnetra_hybrid_b_plus_c_desktop.html — visual reference for CSS values
src/app/data-loader.ts                                       — READ ONLY: understand timeline HTML structure
```

---

## Pattern To Follow

### CSS Scoping — from existing india mobile CSS (line 18829):
```css
/* Desktop-hide rules sit OUTSIDE the media query */
[data-variant="india"] .sn-state-bar,
[data-variant="india"] .sn-bottom-nav { display: none; }

/* Mobile rules sit INSIDE the media query */
@media (max-width: 768px) {
  [data-variant="india"] .sn-bottom-nav { display: flex; }
}
```

For desktop, add a **min-width** block:
```css
@media (min-width: 769px) {
  [data-variant="india"] .sn-timeline-tab { display: flex; }
  [data-variant="india"] .panels-grid { display: none !important; }
}
```

### JS pattern — from `panel-layout.ts` line 509:
```typescript
if (this.ctx.isMobile) {
  this.setupMobileMapToggle();
  if (SITE_VARIANT === 'india') {
    this.setupMobileIndiaLayout();
  }
}
```

Add an else-branch for desktop india:
```typescript
if (this.ctx.isMobile) {
  // ... existing mobile setup
} else if (SITE_VARIANT === 'india') {
  this.setupDesktopIndiaLayout();
}
```

---

## Implementation

### Phase 1: Desktop Layout Foundation (CSS)
**Goal**: On desktop, show timeline as primary view; hide WorldMonitor panel grid, bottom nav, state bar.

- [ ] **Step 1.1** — Add desktop india CSS block to `main.css`
  - File: `src/styles/main.css`
  - Where: Insert **before** the mobile `@media (max-width: 768px)` block at line 18845, **after** the desktop-hide rules at line 18837. Add a new section comment.
  - Add `@media (min-width: 769px)` block scoped to `[data-variant="india"]`:

  ```css
  /* ═══════════════════════════════════════════════════════════════════════════════
     SachNetra India — Desktop Layout
     Hybrid B+C: timeline river + sidebar placeholder
     ═══════════════════════════════════════════════════════════════════════════════ */
  @media (min-width: 769px) {

    /* --- Hide WorldMonitor desktop chrome, show timeline --- */
    [data-variant="india"] .panels-grid,
    [data-variant="india"] .map-section,
    [data-variant="india"] .site-footer,
    [data-variant="india"] .sn-bottom-nav,
    [data-variant="india"] .sn-state-bar,
    [data-variant="india"] .sn-state-grid,
    [data-variant="india"] .sn-map-tab,
    [data-variant="india"] .sn-states-tab,
    [data-variant="india"] .sn-feed { display: none !important; }

    /* --- Show the timeline tab as the main content --- */
    [data-variant="india"] .sn-timeline-tab {
      display: flex !important;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    /* --- Body + app scroll --- */
    [data-variant="india"] body {
      background: var(--sn-dark-bg);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    [data-variant="india"] #app {
      overflow: auto;
      overflow-x: hidden;
    }
    [data-variant="india"] .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    /* --- Header tweaks for india desktop --- */
    [data-variant="india"] .header {
      background: var(--sn-deep-bg);
      border-bottom: 0.5px solid var(--sn-border);
    }
    /* Hide elements not relevant for SachNetra desktop */
    [data-variant="india"] .variant-switcher,
    [data-variant="india"] .region-selector,
    [data-variant="india"] .status-indicator,
    [data-variant="india"] .search-btn,
    [data-variant="india"] .copy-link-btn,
    [data-variant="india"] .fullscreen-btn,
    [data-variant="india"] .download-wrapper,
    [data-variant="india"] .credit-link,
    [data-variant="india"] .github-link,
    [data-variant="india"] .search-mobile-fab { display: none !important; }
  }
  ```

- [ ] **Step 1.2** — Style the desktop timeline layout (two-column: river + sidebar)
  - File: `src/styles/main.css` (inside the same `@media (min-width: 769px)` block)
  - Add the two-column grid layout:

  ```css
    /* --- Desktop two-column: river (flex) + sidebar placeholder --- */
    [data-variant="india"] .sn-tl-desktop-wrap {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 260px;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    /* --- Chip bar --- */
    [data-variant="india"] .sn-tl-chips {
      display: flex;
      gap: 6px;
      padding: 10px 20px 8px;
      overflow-x: auto;
      scrollbar-width: none;
      background: var(--sn-deep-bg);
      border-bottom: 0.5px solid var(--sn-border);
      flex-shrink: 0;
    }
    [data-variant="india"] .sn-tl-chips::-webkit-scrollbar { display: none; }

    [data-variant="india"] .sn-tl-chip {
      padding: 5px 14px;
      border-radius: 14px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      border: 0.5px solid var(--sn-border);
      white-space: nowrap;
      background: transparent;
      color: var(--sn-text-muted);
      opacity: 0.35;
      transition: opacity 0.15s, border-color 0.15s, background 0.15s;
      font-family: inherit;
    }
    /* Active + category chip colors — reuse same values from mobile */
    [data-variant="india"] .sn-tl-chip.sn-tl-chip--active {
      opacity: 1; border-color: #7070c0; color: #b0b0e0; background: #1e1c3a;
    }
    [data-variant="india"] .sn-tl-chip--conflict.sn-tl-chip--active {
      border-color: #cc4444; color: #ff9090; background: #2a1010;
    }
    [data-variant="india"] .sn-tl-chip--economic.sn-tl-chip--active {
      border-color: #4a9930; color: #90d060; background: #1a2a10;
    }
    [data-variant="india"] .sn-tl-chip--tech.sn-tl-chip--active {
      border-color: #2288aa; color: #66bbdd; background: #102030;
    }
    [data-variant="india"] .sn-tl-chip--diplomatic.sn-tl-chip--active {
      border-color: #aa6820; color: #ffaa44; background: #2a1a08;
    }
    [data-variant="india"] .sn-tl-chip--environmental.sn-tl-chip--active {
      border-color: #208870; color: #55ccaa; background: #102820;
    }
    /* Inactive border hints */
    [data-variant="india"] .sn-tl-chip--conflict  { border-color: #6a2020; color: #ff7070; }
    [data-variant="india"] .sn-tl-chip--economic   { border-color: #2a5a18; color: #80cc40; }
    [data-variant="india"] .sn-tl-chip--tech       { border-color: #18405a; color: #50aacc; }
    [data-variant="india"] .sn-tl-chip--diplomatic { border-color: #5a3a10; color: #cc8830; }
    [data-variant="india"] .sn-tl-chip--environmental { border-color: #1a4a40; color: #40aa90; }

    /* --- River body --- */
    [data-variant="india"] .sn-tl-river {
      flex: 1;
      overflow-y: auto;
      padding-bottom: 24px;
    }
    [data-variant="india"] .sn-tl-river::-webkit-scrollbar { width: 3px; }
    [data-variant="india"] .sn-tl-river::-webkit-scrollbar-thumb { background: #2a2450; border-radius: 2px; }

    /* --- Time dividers --- */
    [data-variant="india"] .sn-tl-divider {
      display: flex; align-items: center; gap: 8px; padding: 12px 20px 6px;
    }
    [data-variant="india"] .sn-tl-divider-line { flex: 1; height: 0.5px; background: var(--sn-border); }
    [data-variant="india"] .sn-tl-divider-text {
      font-size: 10px; color: #3a3860; letter-spacing: 0.08em; white-space: nowrap;
    }

    /* --- Story rows --- */
    [data-variant="india"] .sn-tl-row {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 10px 20px; border-bottom: 0.5px solid #120f20;
      cursor: pointer; transition: background 0.1s;
    }
    [data-variant="india"] .sn-tl-row:hover { background: #110e20; }
    [data-variant="india"] .sn-tl-row.hidden { display: none; }
    [data-variant="india"] .sn-tl-row--alert {
      border-left: 2px solid #cc3333; padding-left: 18px;
    }

    /* --- Dots --- */
    [data-variant="india"] .sn-tl-dot {
      width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 5px;
    }
    [data-variant="india"] .sn-tl-dot--conflict     { background: #cc3333; }
    [data-variant="india"] .sn-tl-dot--economic      { background: #66bb33; }
    [data-variant="india"] .sn-tl-dot--tech          { background: #2299bb; }
    [data-variant="india"] .sn-tl-dot--diplomatic    { background: #cc8820; }
    [data-variant="india"] .sn-tl-dot--environmental { background: #22aa88; }
    [data-variant="india"] .sn-tl-dot--general       { background: #5050a0; }

    /* --- Row content --- */
    [data-variant="india"] .sn-tl-content { flex: 1; min-width: 0; }
    [data-variant="india"] .sn-tl-meta {
      display: flex; align-items: center; gap: 5px; margin-bottom: 3px; flex-wrap: wrap;
    }
    [data-variant="india"] .sn-tl-source { font-size: 10px; color: var(--sn-text-muted); }
    [data-variant="india"] .sn-tl-title {
      font-size: 13px; color: #d0cce8; line-height: 1.4; font-weight: 400;
    }
    [data-variant="india"] .sn-tl-footer {
      display: flex; align-items: center; gap: 8px; margin-top: 4px;
    }
    [data-variant="india"] .sn-tl-ago { font-size: 10px; color: #3a3860; }

    /* --- Pills --- */
    [data-variant="india"] .sn-tl-pill { font-size: 10px; padding: 1px 6px; border-radius: 8px; }
    [data-variant="india"] .sn-tl-pill--conflict     { background: #2a1010; color: #ff7070; }
    [data-variant="india"] .sn-tl-pill--economic      { background: #142210; color: #80cc40; }
    [data-variant="india"] .sn-tl-pill--tech          { background: #0a1a22; color: #55bbdd; }
    [data-variant="india"] .sn-tl-pill--diplomatic    { background: #221608; color: #ddaa44; }
    [data-variant="india"] .sn-tl-pill--environmental { background: #081a18; color: #44ccaa; }
    [data-variant="india"] .sn-tl-pill--general       { background: #161428; color: #8080bb; }

    /* --- Alert + cluster badges --- */
    [data-variant="india"] .sn-tl-alert {
      font-size: 10px; padding: 1px 6px; border-radius: 8px;
      background: #2a0a0a; color: #ff5050; border: 0.5px solid #441010;
    }
    [data-variant="india"] .sn-tl-cluster {
      font-size: 10px; padding: 1px 6px; border-radius: 8px;
      background: #1a1830; color: #7070b0;
    }

    /* --- Empty state --- */
    [data-variant="india"] .sn-empty {
      padding: 40px 20px; text-align: center;
      font-size: 13px; color: var(--sn-text-muted);
    }

    /* --- Sidebar: Today's Brief + future modules --- */
    [data-variant="india"] .sn-desktop-sidebar {
      border-left: 0.5px solid var(--sn-border);
      background: var(--sn-dark-bg);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      position: sticky;
      top: 0;
      height: calc(100vh - 40px); /* header height */
      padding: 16px;
      gap: 12px;
    }

    /* Today's Brief card in sidebar */
    [data-variant="india"] .sn-sidebar-brief {
      background: #13112a;
      border-radius: 10px;
      padding: 12px 14px;
      border: 0.5px solid #2a2848;
    }
    [data-variant="india"] .sn-sidebar-brief-label {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }
    [data-variant="india"] .sn-sidebar-brief-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--sn-purple);
      flex-shrink: 0;
    }
    [data-variant="india"] .sn-sidebar-brief-label span {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--sn-purple);
      font-weight: 600;
    }
    [data-variant="india"] .sn-sidebar-brief-text {
      font-size: 12px;
      color: #c8c0e8;
      line-height: 1.6;
    }

    /* --- Story detail: centered modal with backdrop --- */
    [data-variant="india"] .sn-detail {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
    }
    [data-variant="india"] .sn-detail-modal {
      width: 640px;
      max-width: 90vw;
      max-height: 80vh;
      background: var(--sn-deep-bg);
      border-radius: 14px;
      border: 0.5px solid var(--sn-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 16px 64px rgba(0, 0, 0, 0.5);
    }
    [data-variant="india"] .sn-detail-header {
      background: linear-gradient(180deg, #0d0a1f, #0a0812);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 0.5px solid var(--sn-border);
      flex-shrink: 0;
    }
    [data-variant="india"] .sn-detail-header-left {
      display: flex; align-items: center; gap: 10px;
    }
    [data-variant="india"] .sn-detail-back {
      width: 28px; height: 28px; border-radius: 50%;
      background: #1a1830; border: none;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #c8c0e8;
    }
    [data-variant="india"] .sn-detail-back:hover { background: #2a2450; }
    [data-variant="india"] .sn-detail-back svg { width: 12px; height: 12px; color: #c8c0e8; }
    [data-variant="india"] .sn-detail-back-label {
      font-size: 13px; color: var(--sn-text-secondary);
    }
    [data-variant="india"] .sn-detail-body {
      flex: 1; overflow-y: auto; padding: 20px;
    }
    [data-variant="india"] .sn-detail-meta {
      display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;
    }
    [data-variant="india"] .sn-detail-badge {
      font-size: 10px; background: var(--sn-border);
      color: var(--sn-text-secondary); padding: 2px 7px; border-radius: 4px;
    }
    [data-variant="india"] .sn-detail-info { font-size: 11px; color: var(--sn-text-muted); }
    [data-variant="india"] .sn-detail-source-count { font-size: 11px; color: var(--sn-text-muted); }
    [data-variant="india"] .sn-detail-title {
      font-size: 16px; font-weight: 500; color: var(--sn-text-primary); line-height: 1.4;
      margin-bottom: 12px;
    }
    [data-variant="india"] .sn-detail-sep {
      height: 0.5px; background: var(--sn-border); margin: 8px 0 12px;
    }
    /* What happened + What this means cards */
    [data-variant="india"] .sn-detail-what-happened {
      background: #13112a; border-radius: 10px; padding: 14px;
      border: 0.5px solid #2a2848; margin-bottom: 10px;
    }
    [data-variant="india"] .sn-detail-what-means {
      background: #0f1a0f; border-radius: 10px; padding: 14px;
      border: 0.5px solid #1a2e1a; margin-bottom: 10px;
    }
    [data-variant="india"] .sn-detail-card-label {
      display: flex; align-items: center; gap: 6px; margin-bottom: 8px;
    }
    [data-variant="india"] .sn-detail-card-dot {
      width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
    }
    [data-variant="india"] .sn-detail-what-happened .sn-detail-card-dot { background: var(--sn-purple); }
    [data-variant="india"] .sn-detail-what-means .sn-detail-card-dot { background: var(--sn-green); }
    [data-variant="india"] .sn-detail-what-happened .sn-detail-card-label span {
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
      color: var(--sn-purple); font-weight: 600;
    }
    [data-variant="india"] .sn-detail-what-means .sn-detail-card-label span {
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
      color: var(--sn-green); font-weight: 600;
    }
    [data-variant="india"] .sn-detail-card-text {
      font-size: 13px; line-height: 1.7; color: #c8c0e8;
    }
    [data-variant="india"] .sn-detail-what-means .sn-detail-card-text { color: #a8c8a8; }
    /* Sources list */
    [data-variant="india"] .sn-detail-sources { margin-top: 12px; }
    [data-variant="india"] .sn-detail-sources-label {
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
      color: var(--sn-text-muted); font-weight: 600; margin-bottom: 8px;
    }
    [data-variant="india"] .sn-detail-source-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 0; border-bottom: 0.5px solid #1a1830;
    }
    [data-variant="india"] .sn-detail-source-left { display: flex; align-items: center; gap: 6px; }
    [data-variant="india"] .sn-detail-source-dot {
      width: 4px; height: 4px; border-radius: 50%; background: var(--sn-text-muted);
    }
    [data-variant="india"] .sn-detail-source-link {
      font-size: 12px; color: var(--sn-purple); text-decoration: none;
    }
    [data-variant="india"] .sn-detail-source-link:hover { text-decoration: underline; }
    [data-variant="india"] .sn-detail-source-name { font-size: 12px; color: var(--sn-text-secondary); }
    [data-variant="india"] .sn-detail-source-time { font-size: 10px; color: var(--sn-text-muted); }
    /* WhatsApp share bar */
    [data-variant="india"] .sn-detail-share {
      padding: 10px 16px; border-top: 0.5px solid var(--sn-border); flex-shrink: 0;
    }
    [data-variant="india"] .sn-detail-whatsapp {
      width: 100%; padding: 10px; border-radius: 10px;
      background: linear-gradient(90deg, #25a244, #1da035);
      border: none; color: white; font-size: 13px; font-weight: 500;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    [data-variant="india"] .sn-detail-whatsapp:hover { filter: brightness(1.1); }
    /* Shimmer loading */
    [data-variant="india"] .sn-detail-shimmer--card {
      background: #13112a; border-radius: 10px; padding: 12px;
      display: flex; flex-direction: column; gap: 6px;
    }
    [data-variant="india"] .sn-detail-shimmer--bar {
      height: 12px; border-radius: 3px; background: var(--sn-border);
      animation: sn-shimmer 1.5s ease-in-out infinite;
    }
    [data-variant="india"] .sn-detail-shimmer--badge {
      height: 20px; width: 60px; border-radius: 4px; background: var(--sn-border);
      animation: sn-shimmer 1.5s ease-in-out infinite;
    }
    @keyframes sn-shimmer {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }

    /* Hide sidebar on narrower desktops */
    @media (max-width: 1024px) {
      [data-variant="india"] .sn-tl-desktop-wrap {
        grid-template-columns: 1fr;
      }
      [data-variant="india"] .sn-desktop-sidebar {
        display: none;
      }
    }
  }
  ```

### Phase 2: Desktop Layout HTML + JS Wiring
**Goal**: Add minimal HTML wrapper for two-column layout and wire up chip filtering on desktop.

- [ ] **Step 2.1** — Add `setupDesktopIndiaLayout()` to `panel-layout.ts`
  - File: `src/app/panel-layout.ts`
  - Where: After the `setupMobileIndiaLayout()` method (after line ~716)
  - Add new private method:

  ```typescript
  private setupDesktopIndiaLayout(): void {
    // Wire timeline chip filtering on desktop (reuses same logic as mobile)
    this.setupTimelineChips();

    // Wrap timeline river in a two-column container with sidebar
    const timelineTab = document.getElementById('snTimelineTab');
    if (timelineTab) {
      // Show timeline tab on desktop
      timelineTab.style.display = 'flex';

      const riverEl = timelineTab.querySelector('.sn-tl-river');

      if (riverEl) {
        // Create two-column wrapper
        const wrap = document.createElement('div');
        wrap.className = 'sn-tl-desktop-wrap';

        // River column (keep the river as-is)
        const riverCol = document.createElement('div');
        riverCol.style.cssText = 'display:flex;flex-direction:column;min-height:0;overflow:hidden;';
        riverCol.appendChild(riverEl);

        // Sidebar with Today's Brief
        const sidebar = document.createElement('div');
        sidebar.className = 'sn-desktop-sidebar';
        sidebar.id = 'snDesktopSidebar';
        sidebar.innerHTML = `
          <div class="sn-sidebar-brief">
            <div class="sn-sidebar-brief-label">
              <span class="sn-sidebar-brief-dot"></span>
              <span>TODAY'S BRIEF</span>
            </div>
            <p class="sn-sidebar-brief-text" id="snDesktopBriefText">Loading brief…</p>
          </div>
        `;

        wrap.appendChild(riverCol);
        wrap.appendChild(sidebar);
        timelineTab.appendChild(wrap);
      }
    }

    // Trigger timeline rendering (data may already be loaded)
    this.callbacks.renderTimeline?.();
  }
  ```

  ⚠️ **Desktop Today's Brief wiring**: The existing `populateIndiaBrief()` in `data-loader.ts` writes to `#snBriefText` (the mobile Home tab brief). For desktop, we also need to sync the brief text to `#snDesktopBriefText`. Add this line at the end of `populateIndiaBrief()`, after the brief text is set:
  ```typescript
  // Also populate desktop sidebar brief if present
  const desktopBrief = document.getElementById('snDesktopBriefText');
  if (desktopBrief && briefEl) desktopBrief.textContent = briefEl.textContent;
  ```

- [ ] **Step 2.2** — Call `setupDesktopIndiaLayout()` from `renderLayout()`
  - File: `src/app/panel-layout.ts`
  - Where: Line 509–514, where `isMobile` check exists
  - Change the existing code:

  **Before** (line 509–514):
  ```typescript
  if (this.ctx.isMobile) {
    this.setupMobileMapToggle();
    if (SITE_VARIANT === 'india') {
      this.setupMobileIndiaLayout();
    }
  }
  ```

  **After**:
  ```typescript
  if (this.ctx.isMobile) {
    this.setupMobileMapToggle();
    if (SITE_VARIANT === 'india') {
      this.setupMobileIndiaLayout();
    }
  } else if (SITE_VARIANT === 'india') {
    this.setupDesktopIndiaLayout();
  }
  ```

- [ ] **Step 2.3** — Ensure `renderTimelineRiver()` triggers on desktop
  - File: `src/app/data-loader.ts`
  - Where: `populateIndiaBrief()` method (line 1376)
  - Verify: Line 1376 already calls `this.renderTimelineRiver()` unconditionally (not guarded by `isMobile`). **No change needed** — just verify this is the case.

- [ ] **Step 2.4** — Wire desktop Today's Brief sync in `data-loader.ts`
  - File: `src/app/data-loader.ts`
  - Where: Inside `populateIndiaBrief()`, after the brief text is set (around line 1394–1401)
  - Add sync to desktop sidebar:
  ```typescript
  // Also populate desktop sidebar brief if present
  const desktopBrief = document.getElementById('snDesktopBriefText');
  if (desktopBrief && briefEl) desktopBrief.textContent = briefEl.textContent;
  ```

- [ ] **Step 2.5** — Add click-outside-to-dismiss for story detail on desktop
  - File: `src/app/data-loader.ts`
  - Where: Inside `openStoryDetail()`, after creating the overlay (around line 319)
  - The overlay element (`sn-detail`) becomes the backdrop. Wrap the existing inner content in a `.sn-detail-modal` container, and add click-outside detection:
  ```typescript
  // Desktop: wrap content in a modal container for centered display
  if (!isMobileDevice()) {
    const modal = document.createElement('div');
    modal.className = 'sn-detail-modal';
    // Move all children of overlay into the modal
    while (overlay.firstChild) modal.appendChild(overlay.firstChild);
    overlay.appendChild(modal);

    // Click outside modal (on backdrop) closes detail
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });
  }
  ```
  ⚠️ Import `isMobileDevice` at the top of the file if not already imported.

### Phase 3: responsiveness polish
**Goal**: Ensure clean behavior across viewport widths 769px–2560px.

- [ ] **Step 3.1** — Add max-width constraint for ultra-wide monitors
  - File: `src/styles/main.css` (inside the `@media (min-width: 769px)` block)
  - Constrain the timeline so it doesn't stretch infinitely on 4K:

  ```css
    /* Max-width for readability on ultra-wide monitors */
    [data-variant="india"] .sn-timeline-tab {
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }
  ```

---

## Read vs Write

**READ for reference (always allowed):**
- `src/config/variants/full.ts` — study pattern, never write
- `src/config/variants/tech.ts` — study pattern, never write
- `src/styles/happy-theme.css` — CSS `[data-variant]` scoping pattern
- `src/app/app-context.ts` — verify `isMobile` field
- `src/utils/index.ts` — `isMobileDevice()`, `MOBILE_BREAKPOINT_PX`
- `ai_docs/ui-docs-reference/*` — visual reference mockups

**WRITE only to these files:**
- `src/styles/main.css` — all desktop CSS
- `src/app/panel-layout.ts` — desktop setup method + wiring
- `src/app/data-loader.ts` — brief sync to desktop sidebar + story detail modal wrapper

**Never write to:**
- `src/config/variants/full.ts` — SACRED
- `src/config/variants/tech.ts` — SACRED
- `src/config/variants/finance.ts` — SACRED
- `src/config/variants/india.ts` — not needed for this task

---

## Verify

```bash
npm run typecheck   # Must show: 0 errors
```

In browser (`npm run dev` with `VITE_VARIANT=india`, desktop viewport ≥ 900px):

- [ ] WorldMonitor panel grid and map are **hidden**
- [ ] Timeline tab is **visible** as the primary content
- [ ] Category chips render horizontally at the top
- [ ] Chip filtering works (clicking a category toggles story visibility)
- [ ] Time bucket dividers render (JUST NOW, 1–3 HOURS AGO, etc.)
- [ ] Story rows render with dots, source, category pill, title, time
- [ ] Story rows are hoverable (subtle background highlight)
- [ ] Alert stories have red left border
- [ ] Clicking a story opens a **centered 640px modal** (not full-screen)
- [ ] Modal has dark semi-transparent backdrop
- [ ] Clicking the backdrop (outside modal) **dismisses** the detail
- [ ] "Back" button inside modal also dismisses it
- [ ] AI summary cards ("What happened" / "What this means") render inside modal
- [ ] WhatsApp share button renders at bottom of modal
- [ ] At 1025px+, sidebar shows with **Today's Brief** at the top
- [ ] Brief text matches the mobile Home tab brief (same content)
- [ ] At 769px–1024px, sidebar is hidden (single-column river)
- [ ] At ≤ 768px, mobile layout unchanged (bottom nav, state bar, full-screen detail)
- [ ] No horizontal scrollbar at any width
- [ ] SachNetra logo visible in header

### Debugging Checklist (if something looks wrong)

1. **Timeline blank on desktop?** — Check that `setupDesktopIndiaLayout()` is called. Add `console.log` in the method.
2. **Panel grid still showing?** — CSS specificity issue. The `.panels-grid { display: none !important }` rule needs `[data-variant="india"]` scoping.
3. **Chips not filtering?** — `setupTimelineChips()` not called on desktop. Verify the else-if branch runs.
4. **Story detail not opening?** — Story detail CSS is mobile-only. Add desktop rules from Phase 3.2.
5. **Timeline data empty?** — `renderTimelineRiver()` needs clusters. Check that `populateIndiaBrief()` ran (watch for console logs).
6. **Clear localStorage** — `localStorage.clear(); location.reload();`

---

## Completion Log

- [x] Phase 1 complete — Desktop layout CSS — 2026-04-09T02:09 IST
- [x] Phase 2 complete — HTML wrapper + JS wiring — 2026-04-09T02:14 IST
- [x] Phase 3 complete — Responsiveness polish (max-width folded into Phase 1) — 2026-04-09T02:17 IST
- [x] Typecheck: 0 errors — 2026-04-09T02:17 IST
- [ ] Browser verified — desktop
- [ ] Browser verified — mobile unchanged
- [ ] **TASK 015 COMPLETE** ✅

---

## Session Notes — Lessons Learned for Future Agents

*(Fill in remaining lessons after task completion)*

### Key decisions made (from design conversation)

1. **Today's Brief in sidebar (top)** — The user confirmed that the existing Today's Brief should be the first module in the desktop sidebar. No new data — we sync the same `generateDailyBrief()` output from the mobile Home tab to `#snDesktopBriefText`.

2. **Story detail = centered modal, not full-screen** — On mobile, `openStoryDetail()` creates a `position: fixed; inset: 0` overlay (full-screen takeover). On desktop, this feels overwhelming. Decision: wrap content in a `.sn-detail-modal` container (640px wide, max-height 80vh, centered) with `backdrop-filter: blur(4px)`. Clicking the dark backdrop dismisses the modal.

3. **Map skipped for v1** — The India map works on mobile (Map tab) but won't be added to desktop for April 10 launch. Risk: MapLibre container re-initialization, resize events, toggle state management. Post-v1, map will be accessible via a header toggle button that swaps between timeline and map views.

4. **Reuse mobile CSS values** — All dot colors, pill colors, chip colors, divider styles are identical to mobile. We duplicate them in the desktop media query block rather than moving them outside (to avoid breaking the mobile experience which is already tested).

5. **Timeline is primary on desktop** — Unlike WorldMonitor (map + panel grid), SachNetra desktop shows the timeline as the main view. The map, state bar, and bottom nav are all hidden on desktop.

6. **Sidebar hidden below 1025px** — On narrower desktop viewports (tablets, small laptops), the sidebar is hidden to give the river more space. The breakpoint is 1024px via a nested media query.

---

### Lesson 1 — Mobile story detail is full-screen, desktop needs a different treatment

**Problem**: The existing `openStoryDetail()` creates a `position: fixed; inset: 0` overlay that covers the entire viewport. On a 375px phone this is correct — it feels like a native page push. On a 1440px desktop, a full-screen dark overlay covering all content feels heavy and disorienting.

**Solution**: On desktop, wrap all detail content inside a `.sn-detail-modal` child element. The parent `.sn-detail` becomes a semi-transparent backdrop. Click detection on the backdrop (but not the modal) triggers `closeOverlay()`. The modal is sized at 640px × 80vh max, centered via flexbox.

**Future agents**: When a component is full-screen on mobile, always consider whether it should be a **centered modal** on desktop. Common pattern: keep the JS identical, conditionally wrap content in a `.modal` container using `isMobileDevice()`, and let CSS handle the layout difference.

---

### Lesson 2 — Don't build what you don't need 24 hours before launch

**Problem**: The hybrid B+C mockup showed a rich sidebar with DEFCON status, live alerts, market tickers, and today's brief. The temptation was to build all of it for desktop launch.

**Decision**: Only ship Today's Brief in the sidebar. Everything else is post-v1. The map was also skipped because reattaching MapLibre to a new container is a non-trivial operation that could introduce bugs the day before launch.

**Future agents**: When launch is imminent, only add features that reuse **existing data and rendering paths**. Today's Brief works because `populateIndiaBrief()` already generates the text — we just sync it to a second DOM element. Markets/DEFCON/alerts would require wiring entirely new data pipelines to desktop containers.

---

### Lesson 3 — Duplicating CSS between media queries is safer than refactoring

**Problem**: The timeline chips, dots, pills, and row styles are identical on mobile and desktop. The "clean" approach would be to move shared styles OUTSIDE both media queries. But the mobile CSS (18845–20151) has been tested over 15 tasks and is battle-hardened.

**Decision**: Duplicate the shared values in the `@media (min-width: 769px)` block. This adds ~100 lines of CSS but avoids any risk of breaking the mobile experience.

**Future agents**: In a 20,000+ line CSS file with complex specificity chains, refactoring "shared" styles out of a working media query is high-risk, low-reward — especially before launch. Duplicate now, refactor post-launch when you have time to QA both breakpoints thoroughly.
