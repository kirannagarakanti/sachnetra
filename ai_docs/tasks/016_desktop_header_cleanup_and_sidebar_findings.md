# Task 016 — Desktop Header Cleanup + Sidebar Intelligence Findings
*SachNetra Adapt Sprint*

**Depends on**: Task 015 (Desktop Timeline CSS) must be complete
**Estimated time**: 2–3 hours
**Prep doc**: `015_desktop_timeline_css.md` (desktop layout context)

---

## Context — Current State

Task 015 is complete. The india variant desktop shows the timeline river + sidebar with Today's Brief. However, several WorldMonitor header elements are still visible that don't belong in SachNetra:

**Currently visible in the header (screenshot confirms):**
- `v2.6.5` — version badge (class: `.version`)
- `DEFCON 4 25%` — PizzINT indicator (class: `.pizzint-indicator`)
- Export icon — download dropdown with CSV/JSON (class: `.download-wrapper`, already hidden, but there may be a separate `.export-btn`)
- Historical Playback button — rewind/playback controls (class: `.history-controls`)
- Settings gear — unified settings mount (id: `#unifiedSettingsMount`, class: `.mobile-settings-btn`)
- Discord/Community widget — "Join the Discussion" floating pill (class: `.community-widget`)
- Pro banner — "Pro is coming" top bar (class: `.pro-banner`)
- Intel Findings badge — 🎯 badge in header-right (class: `.intel-findings-badge`) — **moving to sidebar**

**Sidebar current state:**
- Today's Brief card (`#snDesktopBriefText`) — working, populated by `populateIndiaBrief()`
- Empty space below the brief

**Intelligence Findings component** (`src/components/IntelligenceGapBadge.ts`):
- Exports class `IntelligenceFindingsBadge`
- Currently mounts itself into `.header-right` as a button + dropdown
- Data: merges `getRecentSignals()` (from `@/services/correlation`) + `getRecentAlerts(6)` (from `@/services/cross-module-integration`)
- Auto-refreshes every 3 minutes via `wm:intelligence-updated` event + `setInterval`
- Renders a list of prioritized findings with title, description, priority badge, time ago
- Has its own CSS: `.intel-findings-badge`, `.intel-findings-dropdown`, `.finding-item`, etc. (lines 13269–13600 in main.css)

## What This Task Does

### Removing (CSS `display: none !important`):

| Element | CSS Selector | Why hide |
|---------|-------------|----------|
| Version badge `v2.6.5` | `.version` | Not SachNetra branding |
| DEFCON indicator | `.pizzint-indicator` | WorldMonitor feature, not v1 |
| Pro banner | `.pro-banner` | WorldMonitor marketing |
| Intel Findings header badge | `.intel-findings-badge` | Moving to sidebar instead |
| Community widget | `.community-widget` | WorldMonitor Discord link |
| Settings gear | `.mobile-settings-btn`, `#unifiedSettingsMount` | No user settings for SachNetra v1 |
| Historical playback | `.history-controls` | WorldMonitor feature, not v1 |
| Export button | `.export-btn` | Not needed for news timeline |
| Beta badge | `.beta-badge` | WorldMonitor label |

### Adding:

| Element | Location | What it does |
|---------|----------|-------------|
| Intelligence Findings list | Sidebar, below Today's Brief | Shows trending topics with priority indicators (reuses existing `IntelligenceFindingsBadge` data) |

---

## Files To Open Before Starting

```
src/styles/main.css                                    — add hide rules + sidebar findings CSS
src/app/panel-layout.ts                                — modify setupDesktopIndiaLayout() to render findings in sidebar
src/components/IntelligenceGapBadge.ts                 — READ ONLY: understand rendering logic
```

---

## Pattern To Follow

### CSS hide — from existing desktop hide block (line 18891):
```css
  /* Hide elements not relevant for SachNetra desktop */
  [data-variant="india"] .variant-switcher,
  [data-variant="india"] .region-selector,
  ...
  [data-variant="india"] .search-mobile-fab { display: none !important; }
```

Extend this list with new selectors.

### Sidebar content — from existing brief card pattern in `setupDesktopIndiaLayout()`:
```typescript
sidebar.innerHTML = `
  <div class="sn-sidebar-brief">
    <div class="sn-sidebar-brief-label">
      <span class="sn-sidebar-brief-dot"></span>
      <span>TODAY'S BRIEF</span>
    </div>
    <p class="sn-sidebar-brief-text" id="snDesktopBriefText">Loading brief…</p>
  </div>
`;
```

Add a second block below the brief for Intelligence Findings.

---

## Implementation

### Phase 1: Hide remaining WorldMonitor header elements (CSS)
**Goal**: Clean up the header — only SachNetra logo should remain.

- [ ] **Step 1.1** — Extend the desktop hide list in `main.css`
  - File: `src/styles/main.css`
  - Where: Inside `@media (min-width: 769px)`, the existing hide block at line ~18891
  - Add these selectors to the existing comma-separated list:

  ```css
  [data-variant="india"] .version,
  [data-variant="india"] .pizzint-indicator,
  [data-variant="india"] .pro-banner,
  [data-variant="india"] .intel-findings-badge,
  [data-variant="india"] .community-widget,
  [data-variant="india"] .mobile-settings-btn,
  [data-variant="india"] #unifiedSettingsMount,
  [data-variant="india"] .history-controls,
  [data-variant="india"] .export-btn,
  [data-variant="india"] .beta-badge
  ```

  Do not remove any existing selectors. Only add to the list.

### Phase 2: Add Intelligence Findings to the sidebar (CSS + JS)
**Goal**: Show a scrollable list of trending intelligence findings below Today's Brief in the desktop sidebar.

- [ ] **Step 2.1** — Add sidebar findings CSS
  - File: `src/styles/main.css`
  - Where: Inside `@media (min-width: 769px)`, after the `.sn-sidebar-brief-text` rule (line ~19098)
  - Add:

  ```css
    /* Intelligence Findings in sidebar */
    [data-variant="india"] .sn-sidebar-findings {
      background: #13112a;
      border-radius: 10px;
      padding: 12px 14px;
      border: 0.5px solid #2a2848;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    [data-variant="india"] .sn-sidebar-findings-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      margin-bottom: 10px;
      flex-shrink: 0;
    }
    [data-variant="india"] .sn-sidebar-findings-label-left {
      display: flex; align-items: center; gap: 6px;
    }
    [data-variant="india"] .sn-sidebar-findings-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #e08040;
      flex-shrink: 0;
    }
    [data-variant="india"] .sn-sidebar-findings-label span {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #e08040;
      font-weight: 600;
    }
    [data-variant="india"] .sn-sidebar-findings-count {
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 8px;
      background: #2a1a08;
      color: #e08040;
      font-weight: 600;
    }
    [data-variant="india"] .sn-sidebar-findings-list {
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }
    [data-variant="india"] .sn-sidebar-findings-list::-webkit-scrollbar { width: 2px; }
    [data-variant="india"] .sn-sidebar-findings-list::-webkit-scrollbar-thumb {
      background: #2a2450; border-radius: 2px;
    }
    [data-variant="india"] .sn-sidebar-finding {
      padding: 8px 0;
      border-bottom: 0.5px solid #1a1830;
      cursor: pointer;
      transition: background 0.1s;
    }
    [data-variant="india"] .sn-sidebar-finding:hover {
      background: #1a1835;
      margin: 0 -6px;
      padding-left: 6px;
      padding-right: 6px;
      border-radius: 6px;
    }
    [data-variant="india"] .sn-sidebar-finding:last-child { border-bottom: none; }
    [data-variant="india"] .sn-sidebar-finding-header {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;
      margin-bottom: 4px;
    }
    [data-variant="india"] .sn-sidebar-finding-title {
      font-size: 11px; color: #d0cce8; line-height: 1.3; font-weight: 500;
      flex: 1; min-width: 0;
    }
    [data-variant="india"] .sn-sidebar-finding-priority {
      font-size: 8px; padding: 1px 5px; border-radius: 6px;
      text-transform: uppercase; font-weight: 700; flex-shrink: 0;
      letter-spacing: 0.05em;
    }
    [data-variant="india"] .sn-sidebar-finding-priority.high {
      background: #2a1010; color: #ff7070;
    }
    [data-variant="india"] .sn-sidebar-finding-priority.critical {
      background: #3a0a0a; color: #ff4040;
    }
    [data-variant="india"] .sn-sidebar-finding-priority.medium {
      background: #2a1a08; color: #ddaa44;
    }
    [data-variant="india"] .sn-sidebar-finding-priority.low {
      background: #141428; color: #8080bb;
    }
    [data-variant="india"] .sn-sidebar-finding-desc {
      font-size: 10px; color: #8880b0; line-height: 1.4;
      display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden;
    }
    [data-variant="india"] .sn-sidebar-finding-time {
      font-size: 9px; color: #3a3860; margin-top: 3px;
    }
    [data-variant="india"] .sn-sidebar-findings-empty {
      font-size: 11px; color: #3a3860; text-align: center;
      padding: 16px 0;
    }
  ```

- [ ] **Step 2.2** — Add findings HTML to sidebar in `setupDesktopIndiaLayout()`
  - File: `src/app/panel-layout.ts`
  - Where: Inside `setupDesktopIndiaLayout()`, in `sidebar.innerHTML`
  - Append after the `sn-sidebar-brief` div:

  ```html
  <div class="sn-sidebar-findings">
    <div class="sn-sidebar-findings-label">
      <div class="sn-sidebar-findings-label-left">
        <span class="sn-sidebar-findings-dot"></span>
        <span>INTELLIGENCE FINDINGS</span>
      </div>
      <span class="sn-sidebar-findings-count" id="snSidebarFindingsCount">0</span>
    </div>
    <div class="sn-sidebar-findings-list" id="snSidebarFindingsList">
      <div class="sn-sidebar-findings-empty">Scanning…</div>
    </div>
  </div>
  ```

- [ ] **Step 2.3** — Populate sidebar findings from IntelligenceFindingsBadge data
  - File: `src/app/panel-layout.ts`
  - Where: Inside `setupDesktopIndiaLayout()`, after appending the sidebar to the DOM
  - Add a recurring update function that reads the existing findings data:

  ```typescript
  // Populate sidebar Intelligence Findings — reuses existing data flow
  const updateSidebarFindings = () => {
    const listEl = document.getElementById('snSidebarFindingsList');
    const countEl = document.getElementById('snSidebarFindingsCount');
    if (!listEl) return;

    // Read findings from the existing IntelligenceFindingsBadge instance
    const signals = getRecentSignals();
    const alerts = getRecentAlerts(6);

    // ... merge, sort, render into listEl
  };

  // Update on data refresh events + initial
  document.addEventListener('wm:intelligence-updated', updateSidebarFindings);
  updateSidebarFindings();
  ```

  ⚠️ Import `getRecentSignals` from `@/services/correlation` and `getRecentAlerts` from `@/services/cross-module-integration` at the top of `panel-layout.ts`.

  Build each finding as:
  ```html
  <div class="sn-sidebar-finding" data-finding-id="${id}">
    <div class="sn-sidebar-finding-header">
      <span class="sn-sidebar-finding-title">${icon} ${title}</span>
      <span class="sn-sidebar-finding-priority ${priority}">${priority}</span>
    </div>
    <div class="sn-sidebar-finding-desc">${description}</div>
    <div class="sn-sidebar-finding-time">${timeAgo}</div>
  </div>
  ```

### Phase 3: Fix Intelligence Findings data pipeline + polish (CSS + JS)
**Goal**: Make findings actually populate with data. Currently shows "Scanning… 0" because the correlation/alert pipeline never runs for the India variant.

#### Root Cause Analysis

The data pipeline chain:

```
loadPredictions() → runCorrelationAnalysis() → addToSignalHistory() → wm:intelligence-updated event
     ↑                        ↑                        ↑
  NEVER RUNS           NEVER RUNS              NEVER CALLED
  for India            for India               for India
```

**Why**: `loadPredictions()` is gated behind `shouldLoad('polymarket')` (line 655 of `data-loader.ts`). This calls `isPanelNearViewport('polymarket')` which checks if a panel with key `'polymarket'` exists in `this.ctx.panels`. **The India variant has no polymarket panel → returns false → `loadPredictions()` never runs → correlation analysis never fires → signals/alerts arrays stay empty.**

The only signal that previously appeared ("crore" Trending) was a `keyword_spike` from `drainTrendingSignals()` — these are rare, independent of the prediction pipeline, and only fire when a term suddenly trends.

#### Fix Strategy

Call `runCorrelationAnalysis()` directly after news loads for the India variant, bypassing the `shouldLoad('polymarket')` gate. This is safe because:
- The India variant already loads news (line 641: always loaded)
- `runCorrelationAnalysis()` uses `this.ctx.latestClusters` and `this.ctx.allNews` (both populated by news loading)
- It doesn't need prediction markets data — `analyzeCorrelationsCore()` works with empty predictions
- CII analysis + keyword spikes + geo convergence all run inside `runCorrelationAnalysis()`

- [ ] **Step 3.1** — Trigger correlation analysis after India news loads
  - File: `src/app/data-loader.ts`
  - Where: Inside `loadAllData()`, after the `tasks` array is built (around line 678), add:

  ```typescript
  // India variant: run correlation analysis even without polymarket panel
  // (polymarket gate blocks it, but India still needs keyword spikes, CII, and geo convergence)
  if (SITE_VARIANT === 'india') {
    tasks.push({
      name: 'correlationAnalysis',
      task: runGuarded('correlationAnalysis', () => this.runCorrelationAnalysis()),
    });
  }
  ```

  This adds `runCorrelationAnalysis()` to the parallel task list for India. It'll run after `loadNews()` completes and populates `this.ctx.allNews`.

  ⚠️ **Placement**: Must go AFTER the `if (SITE_VARIANT !== 'happy')` block closes (line 678) and BEFORE the tasks are awaited. The news task (line 641) runs first and populates `this.ctx.allNews`, then correlation analysis uses that data.

  Actually, a safer approach: call it after news finishes, not in parallel. Check if there's a callback or await pattern.

  **Revised approach** — Call it inside `loadNews()` completion path for India:

  Look for where `loadNews()` finishes and the news data is populated. After the India timeline is rendered, add `void this.runCorrelationAnalysis();` — similar to how `loadPredictions()` calls it at line 1944.

  - Find the India-specific news loading path (search for `populateIndiaTimeline` or the India news render call)
  - After that call completes, add: `void this.runCorrelationAnalysis();`

- [ ] **Step 3.2** — Increase sidebar width from 260px to 320px
  - File: `src/styles/main.css`
  - Where: `[data-variant="india"] .sn-tl-desktop-wrap` grid-template-columns
  - Change: `grid-template-columns: minmax(0, 1fr) 260px` → `grid-template-columns: minmax(0, 1fr) 320px`

- [ ] **Step 3.3** — Increase SachNetra logo icon size
  - File: `src/styles/main.css`
  - Where: `.sn-header-icon` or the `<img>` in the header (set via inline `width="26" height="26"`)
  - Change to `width="30" height="30"` (may need CSS override if inline attributes win)

---

## Before / After

**Before** (header):
```
[SachNetra logo] [v2.6.5] [DEFCON 4 25%]     [🎯3] [⏪] [⬇] [⚙]
[Pro is coming — Reserve your spot →]
```

**After** (header):
```
[SachNetra logo (larger)]
```

**Before** (sidebar — 260px, findings empty):
```
┌─────────────────┐
│ TODAY'S BRIEF    │
│ The RSS chief... │
│                  │
│ INTEL FINDINGS 0 │
│ 📡 Scanning…     │
│                  │
│  (empty space)   │
└─────────────────┘
```

**After** (sidebar — 320px, findings populated):
```
┌──────────────────────┐
│ TODAY'S BRIEF         │
│ The RSS chief...      │
│                       │
│ INTEL FINDINGS      3 │
│ 🔥 "crore" Trending   │
│    7 mentions in 2h   │
│    A 75-year-old...   │
│    2m ago             │
│ 📊 "iran" Trending    │
│    10 mentions...     │
│    5m ago             │
│ 🌍 Geo Alert: IN      │
│    Events detected... │
│    8m ago             │
└──────────────────────┘
```

---

## Read vs Write

**READ for reference (always allowed):**
- `src/components/IntelligenceGapBadge.ts` — rendering logic, data merging pattern
- `src/services/correlation.ts` — `getRecentSignals()` API
- `src/services/cross-module-integration.ts` — `getRecentAlerts()` API
- `src/config/variants/full.ts` — sacred, never write
- `src/config/variants/tech.ts` — sacred, never write

**WRITE only to these files:**
- `src/styles/main.css` — extend hide list + sidebar findings CSS + width/logo tweaks
- `src/app/panel-layout.ts` — sidebar findings HTML + data wiring
- `src/app/data-loader.ts` — trigger correlation analysis for India variant

**Never write to:**
- `src/config/variants/full.ts` — SACRED
- `src/config/variants/tech.ts` — SACRED
- `src/config/variants/finance.ts` — SACRED
- `src/components/IntelligenceGapBadge.ts` — leave existing component untouched

---

## Verify

```bash
npm run typecheck   # Must show: 0 errors
```

In browser (`npm run dev` with `VITE_VARIANT=india`, desktop viewport ≥ 1025px):

- [ ] Header shows ONLY: SachNetra logo — larger icon (30px)
- [ ] No "Pro is coming" banner
- [ ] No "Join the Discussion" floating widget
- [ ] No Historical Playback button
- [ ] Sidebar: wider (320px instead of 260px)
- [ ] Sidebar: Today's Brief card visible at top
- [ ] Sidebar: Intelligence Findings card visible below brief
- [ ] Findings show trending topics with priority badges (HIGH/MEDIUM/LOW) — **not empty**
- [ ] Findings populate within ~30s of page load
- [ ] Click a finding → description expands to full text
- [ ] Findings count badge updates (e.g., "3")
- [ ] At ≤ 768px: mobile layout unchanged
- [ ] No console errors
- [ ] Other variants (full, tech, finance) unchanged — no regressions

### Debugging Checklist

1. **Elements still showing?** — Check CSS specificity. Use browser DevTools to inspect which rule wins. May need `!important`.
2. **Findings still empty?** — Open console, run `getRecentSignals()` and `getRecentAlerts(6)`. If both return `[]`, the pipeline isn't firing. Check if `runCorrelationAnalysis()` is being called.
3. **Findings not updating?** — Verify `wm:intelligence-updated` event listener is attached.
4. **Clear localStorage** — `localStorage.clear(); location.reload();`

---

## Completion Log

- [x] Phase 1 complete — Header cleanup (10 selectors added)
- [x] Phase 2 complete — Sidebar Intelligence Findings (CSS + HTML + JS)
- [ ] Phase 3 complete — Data pipeline fix + sidebar width + logo size
- [ ] Typecheck: 0 errors
- [ ] Browser verified — desktop (findings populated)
- [ ] Browser verified — mobile unchanged
- [ ] **TASK 016 COMPLETE** ✅

---

## Session Notes — Lessons Learned for Future Agents

### Key decisions made

1. **Hide, don't remove** — WorldMonitor elements (DEFCON, settings, export, historical playback) are hidden via CSS `display: none !important`, not removed from the DOM or JS. This keeps the india variant as a CSS-only fork, not a code fork. Other variants still use these elements.

2. **Sidebar findings are read-only** — We don't instantiate a new `IntelligenceFindingsBadge` for the sidebar. Instead, we directly call the underlying data functions (`getRecentSignals()`, `getRecentAlerts()`) and render our own simpler HTML. This avoids coupling to the badge component's internal state.

3. **Intel findings description is clamped** — Each finding's description is clamped to 2 lines via `-webkit-line-clamp` to keep the sidebar compact. Click to expand reveals the full text.

4. **Historical playback class** — The correct CSS class is `.playback-control` (from `PlaybackControl.ts`), NOT `.history-controls`. Always verify class names by reading the component source.

5. **Data pipeline gating** — The India variant has no `polymarket` panel, which means `shouldLoad('polymarket')` returns false, which gates `loadPredictions()`, which is the ONLY caller of `runCorrelationAnalysis()`. This silently blocks the entire intelligence pipeline. **Lesson: when reusing data from another variant, trace the full data chain to ensure the source actually runs.**

