# Task 018 — Shareable Story Card (Canvas + Web Share API)
*SachNetra Adapt Sprint*

**Depends on**: Task 017 (story detail + share URL) — complete
**Estimated time**: 2–3 hours
**Reference design**: `ai_docs/ui-docs-reference/sachnetra_share_card_v3.html`

---

## Context — Current State

When a user opens a story detail and taps **Share on WhatsApp**, the app sends a plain text message with the headline + URL. There is no visual card image.

**Key files and their current behaviour:**

- `src/app/data-loader.ts` — `shareToWhatsApp()` (line 244) sends text-only WhatsApp message. `openStoryDetail()` (line 277) builds the full overlay with AI summary cards.
- `src/services/happy-share-renderer.ts` — Existing canvas card renderer for Happy variant. Uses Web Share API → clipboard → download fallback. **Pattern to follow.**
- `src/services/story-renderer.ts` — Existing canvas renderer for WorldMonitor country intel cards. Different design, not for India variant.
- `src/styles/main.css` — `.sn-detail-whatsapp` styles the green WhatsApp button (line 20413).
- `public/sachnetra-logo.svg` — SachNetra logo SVG (eye icon, 72×72, gradient fill).

## What This Task Does

1. Creates a Canvas 2D renderer that draws a branded share card matching `sachnetra_share_card_v3.html`
2. The card has 4 category colour themes: General (purple), Conflict (red), Economy (green), Government (gold)
3. Card includes: category pill, source, time, headline, "WHAT HAPPENED" AI summary, SachNetra logo footer
4. Replaces the WhatsApp text share button with a "Share Story" button using Web Share API (image)
5. Fallback chain: Web Share API → clipboard copy → file download

---

## Design Decision — Category Theme Mapping

The app has 13+ event categories. They map to 4 card colour themes:

| Card Theme | Accent Colour | Mapped Categories |
|---|---|---|
| General (default) | `#7c5cfc` purple | general, cyber, health, environmental, disaster, infrastructure |
| Conflict | `#cc2222` red | conflict, military, terrorism, protest, crime |
| Economy | `#22bb55` green | economic, trade, tech |
| Government | `#d49500` gold | diplomatic |

## Design Decision — Font Loading

Syne (headline) and DM Sans (body) are loaded **on-demand** via `FontFace` API only when the share button is tapped. This avoids impacting initial page load performance.

## Design Decision — Summary Fallback

If the user taps Share before the AI summary has loaded, the card renders without the "WHAT HAPPENED" section — headline only.

---

## Files To Open Before Starting

```
src/services/happy-share-renderer.ts   — pattern to follow (canvas + Web Share API)
src/services/sachnetra-share-card.ts    — NEW FILE (canvas renderer)
src/app/data-loader.ts                 — shareToWhatsApp, openStoryDetail
src/styles/main.css                    — share button styles
ai_docs/ui-docs-reference/sachnetra_share_card_v3.html — reference design
public/sachnetra-logo.svg              — logo asset
```

---

## Implementation

### Phase 1: Canvas Renderer — `src/services/sachnetra-share-card.ts`
**Goal**: Create the Canvas 2D renderer that draws the branded card matching the reference HTML

- [x] **1.1** — Create `src/services/sachnetra-share-card.ts` with scaffold + exports
- [x] **1.2** — Implement `resolveCardTheme()` — maps 13+ categories → 4 themes (general/conflict/econ/govt)
  ```typescript
  type CardTheme = 'general' | 'conflict' | 'econ' | 'govt';
  function resolveCardTheme(category: string): CardTheme {
    const cat = category.toLowerCase();
    if (['conflict','military','terrorism','protest','crime'].includes(cat)) return 'conflict';
    if (['economic','trade','tech'].includes(cat)) return 'econ';
    if (['diplomatic'].includes(cat)) return 'govt';
    return 'general';
  }
  ```
- [x] **1.3** — Implement on-demand font loading (Syne + DM Sans via `FontFace` API)
- [x] **1.4** — Draw card background (1080×1350, `#0f0b1e`, 22px rounded corners)
- [x] **1.5** — Draw topline gradient bar (2.5px, category-coloured)
  - General: `linear-gradient(90deg, #7c5cfc, #ff9a3c)`
  - Conflict: `linear-gradient(90deg, #cc2222, #7c5cfc 60%, #ff9a3c)`
  - Economy: `linear-gradient(90deg, #22bb55, #7c5cfc 70%, #ff9a3c)`
  - Government: `linear-gradient(90deg, #d49500, #7c5cfc 70%, #ff9a3c)`
- [x] **1.6** — Draw mesh glow (radial gradient, top-right, category accent at 4% opacity, 50px blur simulated)
- [x] **1.7** — Draw category pill badge (rounded pill, label, category colour border + bg)
- [x] **1.8** — Draw source + time metadata ("· The Hindu · 1m ago")
- [x] **1.9** — Draw headline title (Syne 700, centered, word-wrapped, max ~5 lines, `#f0eaff`)
- [x] **1.10** — Draw "WHAT HAPPENED" section:
  - Inner rounded card (`rgba(124,92,252,0.07)` bg, `rgba(124,92,252,0.14)` border)
  - Glowing dot (gradient for General, solid colour for others)
  - "WHAT HAPPENED" label (9.5px, uppercase, category-coloured with text-shadow)
  - Body text (12.5px, `#9085c0`, word-wrapped)
- [x] **1.11** — Draw divider (gradient line: transparent → border → transparent)
- [x] **1.12** — Draw footer:
  - Load `/sachnetra-logo.svg` as `HTMLImageElement` → draw 34×34 into rounded rect
  - "SachNetra" (Syne 700, 14px, `#f0eaff`)
  - "सच्चनेत्र · See clearly" (10px, `#4a4270`)
  - "sachnetra.com" right-aligned (10px, `#4a4270`)
- [x] **1.13** — Implement `renderSachNetraShareCard()` export — orchestrates all draw steps
- [x] **1.14** — Handle fallback: if no summary text, skip "WHAT HAPPENED" section (headline-only card)

### Phase 2: Web Share API — `shareStoryCard()`
**Goal**: Share the rendered card via native share sheet with fallback chain

- [x] **2.1** — Add `shareStoryCard()` export in `sachnetra-share-card.ts`:
  ```typescript
  export async function shareStoryCard(opts: ShareCardData): Promise<void> {
    const canvas = await renderSachNetraShareCard(opts);
    const blob = await canvasToBlob(canvas);
    const file = new File([blob], `sachnetra-story-${Date.now()}.png`, { type: 'image/png' });
    // Web Share API → clipboard → download
  }
  ```
- [x] **2.2** — Implement fallback chain (same pattern as `happy-share-renderer.ts` lines 201-232):
  1. `navigator.share({ files: [file], text: title })` — native share sheet
  2. `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])` — clipboard
  3. Anchor download fallback
- [x] **2.3** — File naming: `sachnetra-story-{timestamp}.png`

### Phase 3: Wire into Story Detail — `data-loader.ts`
**Goal**: Replace WhatsApp text share with the new card share

- [x] **3.1** — Remove `shareToWhatsApp()` function (line 244–250)
- [x] **3.2** — Add import: `import { shareStoryCard } from '@/services/sachnetra-share-card';`
- [x] **3.3** — In `openStoryDetail()`, add a closure variable `let currentSummary = '';` to capture AI summary text when it loads
- [x] **3.4** — After `generateSummary()` resolves, store: `currentSummary = summaryText;`
- [x] **3.5** — Replace bottom share button HTML (lines 336–341):
  ```html
  <div class="sn-detail-share">
    <button class="sn-detail-share-btn" id="snDetailShareCard">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Share Story</span>
    </button>
  </div>
  ```
- [x] **3.6** — Update event listeners (header + bottom button) to call:
  ```typescript
  shareStoryCard({
    title: item.title,
    category: item.threat?.category ?? 'general',
    source: item.source,
    timeAgo,
    summary: currentSummary || undefined,
  });
  ```
- [x] **3.7** — Update share button on story card list (line 1558–1563) — replace `shareToWhatsApp` call with `shareStoryCard` call

### Phase 4: Update CSS — `main.css`
**Goal**: Style the new share button with the purple-to-saffron gradient

- [x] **4.1** — Replace `.sn-detail-whatsapp` styles (lines 20413–20443) with:
  ```css
  [data-variant="india"] .sn-detail-share-btn {
    background: linear-gradient(110deg, #7c5cfc 0%, #ff9a3c 130%);
    border-radius: 14px;
    padding: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    cursor: pointer;
    border: none;
    width: 100%;
    min-height: 44px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    letter-spacing: 0.02em;
    box-shadow: 0 4px 24px rgba(124, 92, 252, 0.3);
    transition: all 0.2s;
    -webkit-tap-highlight-color: transparent;
  }
  ```
- [x] **4.2** — Add hover/active states:
  ```css
  [data-variant="india"] .sn-detail-share-btn:hover {
    box-shadow: 0 6px 32px rgba(124, 92, 252, 0.45);
    transform: translateY(-1px);
  }
  [data-variant="india"] .sn-detail-share-btn:active {
    transform: translateY(0);
    opacity: 0.9;
  }
  ```
- [x] **4.3** — Keep `.sn-detail-share` container styles (sticky bottom, safe-area-inset)

### Phase 5: Typecheck + Test
**Goal**: Verify everything compiles and renders correctly

- [ ] **5.1** — Run `npm run typecheck` — must show 0 errors
- [ ] **5.2** — Test: open story detail → wait for summary → tap "Share Story" → verify share sheet with card image
- [ ] **5.3** — Test: tap "Share Story" before summary loads → verify card renders with headline-only
- [ ] **5.4** — Test all 4 category themes (conflict, economic, diplomatic, general)
- [ ] **5.5** — Test: verify SachNetra logo renders in card footer
- [ ] **5.6** — Test desktop fallback (clipboard copy or download)

---

## Read vs Write

**READ for reference (always allowed):**
- `src/services/happy-share-renderer.ts` — pattern to follow
- `src/services/story-renderer.ts` — canvas utility reference
- `src/components/StoryModal.ts` — Web Share API pattern
- `ai_docs/ui-docs-reference/sachnetra_share_card_v3.html` — design reference
- `public/sachnetra-logo.svg` — logo asset

**WRITE only to files listed in this task:**
- `src/services/sachnetra-share-card.ts` — **NEW** (Phase 1 + 2)
- `src/app/data-loader.ts` — wire share button (Phase 3)
- `src/styles/main.css` — share button CSS (Phase 4)

---

## Completion Log

- [x] Phase 1 complete — Canvas renderer — 2026-04-10
- [x] Phase 2 complete — Web Share API — 2026-04-10
- [x] Phase 3 complete — Wire into story detail — 2026-04-10
- [x] Phase 4 complete — CSS update — 2026-04-10
- [ ] Phase 5 complete — Verified
- [ ] **TASK 018 COMPLETE** ✅
