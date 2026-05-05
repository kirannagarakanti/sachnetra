# UI Improvement Template — SachNetra

> **Goal:** Transform generic or broken UI into polished, SachNetra-branded interfaces.
> AI builds the structure. Human design sense creates the refinement.

---

## Context

SachNetra's design system is minimal and intentional:
- **Dark-first** — deep dark `#0a0812` background, not pure black
- **Two colours only** — Purple `--sn-purple` (#7b7bff) + Saffron `--sn-saffron` (#FF9933)
- **No Tailwind** — raw CSS with `--sn-*` CSS variables and `[data-variant="india"]` selectors
- **Mobile-first** — 375px base, `@media (min-width: 769px)` for desktop
- **Class-based Preact components** — Panel subclasses, not functional components with hooks

---

## Step 1: Understand the Current State

Before suggesting anything, read the target component fully:

```
1. Read the component file (src/components/ComponentName.ts)
2. Read src/styles/main.css — understand current --sn-* vars in use
3. Look at similar working components for pattern reference
4. Take note of what specifically looks wrong:
   - Generic colours (not using --sn-* vars)?
   - Inconsistent spacing?
   - Wrong font sizes for mobile?
   - Touch targets under 44px?
   - Missing [data-variant="india"] scoping?
```

---

## Step 2: Pattern Detection — What Looks Generic?

Flag these patterns for elimination:

**❌ Anti-patterns to remove:**
- Hardcoded hex colours not in the `--sn-*` system
- Multiple competing accent colours (SachNetra uses 2: purple + saffron)
- Inline styles on DOM elements
- CSS class toggling via JS for branding (use `[data-variant="india"]` selectors instead)
- Touch targets under 44px on interactive elements
- Text under 13px on mobile
- Unscoped CSS that bleeds into WorldMonitor variants
- `!important` overrides stacking up

**✅ SachNetra design patterns:**
- `--sn-purple` for primary actions, active states, pills
- `--sn-saffron` for alerts, highlights, emphasis
- `--sn-bg` (#0a0812) for page background
- Card backgrounds: slightly lighter than bg (use rgba white overlays)
- Border: `1px solid rgba(255,255,255,0.08)` — subtle, not harsh
- Hover: opacity shift or subtle scale, never colour swap
- Font: system font stack (inherited from WorldMonitor), bold for headings
- Loading states: pulsing opacity, not skeleton boxes
- Time-aware UI: greetings, time dividers in local IST

---

## Step 3: Transformation Plan

Present a clear plan before touching any code:

```
## UI Improvement Plan: [Component Name]

**What looks wrong:**
- [Issue 1 — specific]
- [Issue 2 — specific]

**Changes:**
- [Change 1 — file, what, why]
- [Change 2 — file, what, why]

**SachNetra design principles applied:**
- [Which --sn-* vars will be used]
- [Mobile vs desktop breakpoint]
- [Scoping approach for [data-variant="india"]]

**Files to touch:**
- src/styles/main.css — [what changes]
- src/components/X.ts — [what changes]

Say "proceed" to implement.
```

Wait for Lijo/James to confirm before writing any code.

---

## Step 4: Implementation

**CSS conventions:**
```css
/* ✅ Correct — scoped to india variant */
[data-variant="india"] .sn-story-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
}

/* ✅ Correct — using CSS vars */
.sn-category-pill {
  background: var(--sn-purple);
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 20px;
}

/* ✅ Correct — mobile-first */
.sn-story-title {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}
@media (min-width: 769px) {
  .sn-story-title { font-size: 15px; }
}

/* ❌ Wrong — hardcoded, unscoped */
.story-card {
  background: #1a1a2e;
  color: #7b7bff;
}
```

**Touch targets:**
```css
/* Minimum 44px for any tappable element */
.sn-tab-btn {
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**Dark mode comfort (already dark — avoid harsh contrasts):**
```css
/* ✅ Comfortable */
background: rgba(255, 255, 255, 0.06);
color: rgba(255, 255, 255, 0.85);

/* ❌ Harsh */
background: #000000;
color: #ffffff;
```

---

## Step 5: Validation Checklist

After implementing:

- [ ] `npm run typecheck` — 0 errors (if .ts files touched)
- [ ] `npm run lint` — Biome clean
- [ ] Mobile (375px): touch targets ≥ 44px, text ≥ 13px, no horizontal scroll
- [ ] Desktop (1280px): two-column layout preserved
- [ ] No hardcoded colours outside `--sn-*` system
- [ ] CSS scoped under `[data-variant="india"]` (doesn't break tech/finance variants)
- [ ] Visual: does it look intentionally designed, not AI-generated?

---

## Step 6: After Implementation

Report back:
```
✅ UI improvement complete

What changed:
  • src/styles/main.css — [description]
  • src/components/X.ts — [description]

Design decisions:
  • [Why these spacing values]
  • [Why this colour choice]
  • [Mobile vs desktop difference]

Please check in browser:
  📱 Mobile (375px)
  🖥️ Desktop (1280px)
  Both should feel intentional and on-brand.
```

---

## SachNetra Component Reference

Study these before designing anything new:

| Component | File | What to learn |
|-----------|------|---------------|
| Story card | src/components/StoryDetail.ts | Two-summary layout, share button |
| State selector | src/components/StateSelector.ts | Grid layout, close button |
| Timeline river | src/components/IndiaTimeline.ts | Category chips, time dividers |
| Share card | src/services/sachnetra-share-card.ts | Canvas 2D brand treatment |
| Bottom nav | src/styles/main.css | Tab layout, active state |
