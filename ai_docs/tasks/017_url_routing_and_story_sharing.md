 # Task 017 — URL Routing, Story Sharing & Domain Setup
*SachNetra Adapt Sprint*

**Depends on**: Task 016.5 must be complete
**Estimated time**: 2–3 hours
**Prep doc**: Implementation plan — URL Routing, Story Sharing & Domain Setup

---

## Context — Current State

The SPA has no path-based routing for the India variant. All navigation (Home / Timeline / Map / States) happens via JS tab-switching that only shows/hides DOM elements — the browser URL stays at `/` (or shows map query params on desktop via `debouncedUrlSync`).

**Key files and their current behaviour:**

- `src/app/panel-layout.ts` — Mobile tabs are wired in `setupMobileIndiaLayout()` via the inner `activateTab()` function (line ~563). Currently does `t.classList.toggle('sn-nav-tab--active', isActive)` + section `display:block/none`. No URL touch.
- `src/app/event-handlers.ts` — `debouncedUrlSync` (line 98) calls `getShareUrl()` → `buildMapUrl()` → `history.replaceState`. This fires on every map pan/zoom and unconditionally overwrites the URL with `?lat=&lon=&zoom=&view=&layers=...`.
- `src/app/data-loader.ts` — `shareToWhatsApp()` (line 244) sends only `📰 *${title}*\n\n_Via SachNetra_ — India's clarity app\n🔗 sachnetra.com`. No story URL. `openStoryDetail()` (line 252) does `history.pushState(null, '', window.location.href)` — pushes the current URL just for back-button support.
- `src/App.ts` — `handleDeepLinks()` (line 717) only handles `?c=XX` country code and `?country=XX` params. No `/story` path handling.
- `middleware.ts` — Social bot OG handler only fires on `path === '/'` (line 71). WhatsApp links to `/story` or `/home` get no OG tags.
- `vercel.json` — The catch-all rewrite `/((?!api|assets|...).*) → /index.html` already handles all unknown paths. No change needed.

## What This Task Does

1. Adds path-based URL routing for India variant tabs: `/home`, `/timeline`, `/map`, `/states`
2. Suppresses the map `debouncedUrlSync` for the India variant so tab paths aren't overwritten
3. Generates shareable `/story?id=<slug>` URLs when opening a story detail overlay
4. Updates WhatsApp share to include the story URL so recipients can deep-link
5. Adds `/story` deep-link handler that restores the story on load (Option A — base64 of title)
6. Extends middleware OG handler for `/home` and `/story` paths so WhatsApp previews work
7. Documents DNS setup for `sachnetra.com` domain

---

## Files To Open Before Starting

```
src/app/panel-layout.ts     — tab activation logic (activateTab, setupMobileIndiaLayout, setupDesktopIndiaLayout)
src/app/event-handlers.ts   — debouncedUrlSync, setupUrlStateSync
src/app/data-loader.ts      — shareToWhatsApp, openStoryDetail
src/App.ts                  — handleDeepLinks
middleware.ts               — social bot OG handler
```

---

## Pattern To Follow

From `src/app/event-handlers.ts`, existing URL sync pattern:
```typescript
private readonly debouncedUrlSync = debounce(() => {
  const shareUrl = this.getShareUrl();
  if (!shareUrl) return;
  try { history.replaceState(null, '', shareUrl); } catch { }
}, 250);
```
Follow `history.replaceState` for same-page URL changes (no reload).
Follow `history.pushState` for forward navigation (story detail overlay — enables back-button).

From `src/app/data-loader.ts`, existing story overlay close pattern:
```typescript
const onPopState = () => closeOverlay();
history.pushState(null, '', window.location.href);
window.addEventListener('popstate', onPopState);
```
The story detail already uses pushState/popstate for back-button. We will change the URL that is pushed.

---

## Design Decision — Story Slug: Option A (base64 of title)

**Option A (base64 encode the headline)** is the better choice for SachNetra because:
- **No backend needed** — the slug is self-contained; the app can decode it client-side and match against loaded clusters
- **Reliable** — base64 is deterministic; same title always produces the same slug
- **Deep-linkable now** — on load, decode slug → search loaded clusters by title → auto-open story detail
- **Compact** — a 60-char headline produces a ~80-char base64 slug, fits comfortably in WhatsApp messages
- **Graceful fallback** — if the story is no longer in the feed (24h+ old), user lands on `/home` with a toast "Story no longer available"

Option B (random slug) would need a database. Not worth it for V1.

---

## Implementation

### Phase 1: Tab URL Routing (Mobile + Desktop)
**Goal**: Tabs produce clean URLs — `/home`, `/timeline`, `/map`, `/states`

- [ ] **Step 1.1** — Add URL update to `activateTab()` in mobile layout
  - File: `src/app/panel-layout.ts`
  - Inside `setupMobileIndiaLayout() → activateTab()`, after the tab style toggle block and before the lazy map loader section, add:
    ```typescript
    // Update URL to reflect active tab
    const tabPath = tabKey === 'home' ? '/home' : `/${tabKey}`;
    try { history.replaceState(null, '', tabPath); } catch { /* ignore */ }
    ```

- [ ] **Step 1.2** — Read initial path on load to activate correct tab
  - File: `src/app/panel-layout.ts`
  - At the end of `setupMobileIndiaLayout()`, after the `setupTimelineChips()` call (line ~719), add:
    ```typescript
    // Activate tab matching the current URL path (e.g. /timeline → timeline tab)
    const initialPath = window.location.pathname.replace(/^\//, '') || 'home';
    const validTabs = ['home', 'timeline', 'map', 'states'];
    const startTab = validTabs.includes(initialPath) ? initialPath : 'home';
    if (startTab !== 'home') activateTab(startTab);
    // Always ensure /home is set when landing on root
    if (window.location.pathname === '/' || window.location.pathname === '') {
      try { history.replaceState(null, '', '/home'); } catch { /* ignore */ }
    }
    ```

- [ ] **Step 1.3** — Set desktop India URL to `/timeline` on init
  - File: `src/app/panel-layout.ts`
  - At the top of `setupDesktopIndiaLayout()` (line ~728), after the `setupTimelineChips()` call, add:
    ```typescript
    // Desktop India always shows timeline as primary view
    try { history.replaceState(null, '', '/timeline'); } catch { /* ignore */ }
    ```

### Phase 2: Suppress Map URL Sync for India
**Goal**: Prevent the map from overwriting tab paths with `?lat=&lon=&zoom=...`

- [x] **Step 2.1** — Guard `debouncedUrlSync`
  - File: `src/app/event-handlers.ts`
  - Add `SITE_VARIANT` import (if not already imported) from `@/config`
  - Modify the `debouncedUrlSync` debounce callback (line 98) to short-circuit for India:
    ```typescript
    private readonly debouncedUrlSync = debounce(() => {
      if (SITE_VARIANT === 'india') return; // India variant: tab routing owns the URL
      const shareUrl = this.getShareUrl();
      if (!shareUrl) return;
      try { history.replaceState(null, '', shareUrl); } catch { }
    }, 250);
    ```

- [x] **Step 2.2** — Skip `setupUrlStateSync()` for India
  - File: `src/app/event-handlers.ts`
  - Add early return at the top of `setupUrlStateSync()` (line 581):
    ```typescript
    setupUrlStateSync(): void {
      if (!this.ctx.map || SITE_VARIANT === 'india') return;
      // ... rest unchanged
    ```

### Phase 3: Story Detail Shareable URL
**Goal**: Opening a story pushes `/story?id=<slug>` to URL; WhatsApp share includes this URL

- [x] **Step 3.1** — Add `storySlug()` helper
  - File: `src/app/data-loader.ts`
  - Add after the `shareToWhatsApp` function (around line 249):
    ```typescript
    /** URL-safe base64 encoding of title for shareable story deep links. */
    function storySlug(title: string): string {
      return btoa(encodeURIComponent(title.trim().slice(0, 120)))
        .replace(/[+/=]/g, c => ({ '+': '-', '/': '_', '=': '' }[c] ?? ''));
    }

    /** Decode a story slug back to the original title. Returns null on failure. */
    function decodeStorySlug(slug: string): string | null {
      try {
        const base64 = slug.replace(/-/g, '+').replace(/_/g, '/');
        return decodeURIComponent(atob(base64));
      } catch { return null; }
    }
    ```

- [x] **Step 3.2** — Update `shareToWhatsApp()` to accept a story URL
  - File: `src/app/data-loader.ts`
  - Change signature and body (line 244):
    ```typescript
    function shareToWhatsApp(title: string, storyUrl?: string): void {
      const url = storyUrl ?? 'https://sachnetra.com';
      const text = encodeURIComponent(
        `📰 *${title}*\n\n_Via SachNetra_ — India's clarity app\n🔗 ${url}`
      );
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
    ```

- [x] **Step 3.3** — Push `/story?id=<slug>` in `openStoryDetail()`
  - File: `src/app/data-loader.ts`
  - Replace the existing `history.pushState(null, '', window.location.href);` line (line 349) with:
    ```typescript
    const slug = storySlug(item.title);
    const storyUrl = `${window.location.origin}/story?id=${slug}`;
    history.pushState({ storyId: slug }, '', storyUrl);
    ```

- [x] **Step 3.4** — Pass `storyUrl` to share button event handlers
  - File: `src/app/data-loader.ts`
  - Update both share button listeners (lines 353–358) to pass `storyUrl`:
    ```typescript
    document.getElementById('snDetailShareHeader')?.addEventListener('click', () => {
      shareToWhatsApp(item.title, storyUrl);
    });
    document.getElementById('snDetailWhatsApp')?.addEventListener('click', () => {
      shareToWhatsApp(item.title, storyUrl);
    });
    ```

- [x] **Step 3.5** — Restore tab URL on overlay close
  - File: `src/app/data-loader.ts`
  - In the `closeOverlay` callback (line 333), restore the tab path:
    ```typescript
    const closeOverlay = () => {
      overlay.remove();
      window.removeEventListener('popstate', onPopState);
      // Restore tab URL — on mobile, check active tab; on desktop, use /timeline
      if (SITE_VARIANT === 'india') {
        const activeTab = document.querySelector('.sn-nav-tab--active') as HTMLElement | null;
        const tabKey = activeTab?.dataset.tab ?? 'home';
        const tabPath = tabKey === 'home' ? '/home' : `/${tabKey}`;
        try { history.replaceState(null, '', tabPath); } catch { /* ignore */ }
      }
    };
    ```
  - Ensure `SITE_VARIANT` is imported at the top (it already is, from `@/config`).

### Phase 4: Story Deep-Link Handler
**Goal**: When user opens a `/story?id=<slug>` link, decode slug and try to auto-open the matching story

- [x] **Step 4.1** — Add `/story` deep-link handling in `handleDeepLinks()`
  - File: `src/App.ts`
  - Inside `handleDeepLinks()` (line 717), add a new block **before** the existing country-brief deep link check:
    ```typescript
    // SachNetra India: story deep-link — /story?id=<slug>
    if (SITE_VARIANT === 'india' && url.pathname === '/story') {
      const slugParam = url.searchParams.get('id');
      if (slugParam) {
        // Decode slug to title; will attempt match after data loads
        this.pendingDeepLinkStorySlug = slugParam;
        // Set URL to /home temporarily — story overlay will push /story back when opened
        try { history.replaceState(null, '', '/home'); } catch { /* ignore */ }
        setTimeout(() => {
          this.tryOpenStoryFromSlug(slugParam);
        }, 3000); // wait for data to load
        return;
      }
    }
    ```

- [x] **Step 4.2** — Add `tryOpenStoryFromSlug()` helper
  - File: `src/App.ts`
  - Add after `handleDeepLinks()`:
    ```typescript
    private pendingDeepLinkStorySlug: string | null = null;

    private tryOpenStoryFromSlug(slug: string): void {
      // Decode slug back to title
      let title: string | null = null;
      try {
        const base64 = slug.replace(/-/g, '+').replace(/_/g, '/');
        title = decodeURIComponent(atob(base64));
      } catch { /* invalid slug */ }

      if (!title) return;

      // Search loaded clusters for a matching title
      const cluster = this.state.latestClusters.find(
        c => c.allItems.some(i => i.title === title)
      );
      if (cluster) {
        const item = cluster.allItems.find(i => i.title === title) ?? cluster.allItems[0];
        if (item) {
          // Import openStoryDetail dynamically to avoid circular deps
          import('@/app/data-loader').then(m => {
            // Call the module-level openStoryDetail if exported, else fallback
          }).catch(() => {});
        }
      }
      // If not found, user stays on /home — story may have rotated out
    }
    ```
  - **Note**: Full auto-open requires exporting `openStoryDetail` from data-loader. If this creates a circular import issue, the V1 fallback is simply landing on `/home` — the URL still gives the user context that a story was shared. We can wire auto-open in a follow-up.

### Phase 5: Middleware OG for Story & Home Paths
**Goal**: WhatsApp/Telegram bots get proper OG meta when scraping `/story` or `/home` URLs

- [x] **Step 5.1** — Extend social bot OG check
  - File: `middleware.ts`
  - Change the path check on line 71 from:
    ```typescript
    if (path === '/' && SOCIAL_PREVIEW_UA.test(ua)) {
    ```
    to:
    ```typescript
    if ((path === '/' || path === '/home' || path === '/timeline' || path.startsWith('/story')) && SOCIAL_PREVIEW_UA.test(ua)) {
    ```

- [x] **Step 5.2** — Add the middleware matcher paths
  - File: `middleware.ts`
  - Update the `config.matcher` array (line 140) to include the new paths:
    ```typescript
    export const config = {
      matcher: ['/', '/home', '/timeline', '/story', '/api/:path*', '/favico/:path*'],
    };
    ```

---

## Before / After

**Before** (`panel-layout.ts` — `activateTab` function, line ~563):
```typescript
const activateTab = (tabKey: string) => {
  // Update tab button styles
  tabs.forEach((t) => {
    const isActive = t.dataset.tab === tabKey;
    t.classList.toggle('sn-nav-tab--active', isActive);
  });

  // Show/hide sections
  for (const [key, el] of Object.entries(sections)) {
    if (!el) continue;
    el.style.display = key === tabKey ? 'block' : 'none';
  }
```

**After**:
```typescript
const activateTab = (tabKey: string) => {
  // Update tab button styles
  tabs.forEach((t) => {
    const isActive = t.dataset.tab === tabKey;
    t.classList.toggle('sn-nav-tab--active', isActive);
  });

  // Show/hide sections
  for (const [key, el] of Object.entries(sections)) {
    if (!el) continue;
    el.style.display = key === tabKey ? 'block' : 'none';
  }

  // Update URL to reflect active tab
  const tabPath = tabKey === 'home' ? '/home' : `/${tabKey}`;
  try { history.replaceState(null, '', tabPath); } catch { /* ignore */ }
```

---

**Before** (`event-handlers.ts` — `debouncedUrlSync`, line 98):
```typescript
private readonly debouncedUrlSync = debounce(() => {
  const shareUrl = this.getShareUrl();
  if (!shareUrl) return;
  try { history.replaceState(null, '', shareUrl); } catch { }
}, 250);
```

**After**:
```typescript
private readonly debouncedUrlSync = debounce(() => {
  if (SITE_VARIANT === 'india') return; // India variant: tab routing owns the URL
  const shareUrl = this.getShareUrl();
  if (!shareUrl) return;
  try { history.replaceState(null, '', shareUrl); } catch { }
}, 250);
```

---

**Before** (`data-loader.ts` — `shareToWhatsApp`, line 244):
```typescript
function shareToWhatsApp(title: string): void {
  const text = encodeURIComponent(
    `📰 *${title}*\n\n_Via SachNetra_ — India's clarity app\n🔗 sachnetra.com`
  );
  window.open(`https://wa.me/?text=${text}`, '_blank');
}
```

**After**:
```typescript
function shareToWhatsApp(title: string, storyUrl?: string): void {
  const url = storyUrl ?? 'https://sachnetra.com';
  const text = encodeURIComponent(
    `📰 *${title}*\n\n_Via SachNetra_ — India's clarity app\n🔗 ${url}`
  );
  window.open(`https://wa.me/?text=${text}`, '_blank');
}
```

---

## Read vs Write

**READ for reference (always allowed):**
- `src/config/variants/full.ts` — sacred, never write
- `src/config/variants/tech.ts` — sacred, never write
- `src/config/variants/finance.ts` — sacred, never write
- `src/utils/urlState.ts` — study `buildMapUrl` pattern
- `vercel.json` — confirm catch-all rewrite covers new paths (no change needed)

**WRITE only to files explicitly listed in this task:**
- `src/app/panel-layout.ts` — tab URL routing (Phase 1)
- `src/app/event-handlers.ts` — suppress map URL sync (Phase 2)
- `src/app/data-loader.ts` — story slug, share URL, overlay URL (Phase 3)
- `src/App.ts` — story deep-link handler (Phase 4)
- `middleware.ts` — extend OG handler paths (Phase 5)

**Never write to:**
- `src/config/variants/full.ts` — sacred, existing live variant
- `src/config/variants/tech.ts` — sacred, existing live variant
- `src/config/variants/finance.ts` — sacred, existing live variant
- `vercel.json` — not needed, catch-all already covers new paths

---

## Domain Setup (Manual — Not Code)

**Use `sachnetra.com`** (already wired in middleware → `india` variant)

In Vercel dashboard:
1. Project → Settings → Domains → Add `sachnetra.com` + `www.sachnetra.com`
2. At domain registrar, add DNS records:
   - `A` record for `@` → `76.76.21.21`
   - `CNAME` for `www` → `cname.vercel-dns.com`
3. Vercel auto-provisions SSL. No code change needed.
4. `sachnetra.in` → can add as redirect later (registrar 301 → sachnetra.com)

---

## Verify

```bash
npm run typecheck   # Must show: 0 errors
```

In browser (`npm run dev` with `VITE_VARIANT=india`):
- [ ] Landing on `/` redirects URL to `/home` — Home tab is active
- [ ] Tapping Timeline tab → URL becomes `/timeline`
- [ ] Tapping Map tab → URL becomes `/map`
- [ ] Tapping States tab → URL becomes `/states`
- [ ] Tapping Home tab → URL becomes `/home`
- [ ] Opening a story detail → URL becomes `/story?id=<base64slug>`
- [ ] Pressing back from story detail → URL returns to previous tab path
- [ ] WhatsApp share button includes the story URL in the message
- [ ] Desktop view → URL shows `/timeline` on load
- [ ] Desktop view → URL never shows `?lat=&lon=&zoom=...` params
- [ ] Pasting `/timeline` in address bar → Timeline tab activates on load
- [ ] Pasting `/story?id=<slug>` → loads `/home` (story auto-open is best-effort)

### Debugging Checklist (if something looks wrong)

1. **URL stuck at `/`** → `activateTab()` isn't reaching the `replaceState` line. Check `SITE_VARIANT === 'india'` is truthy.
2. **URL shows `?lat=&lon=&zoom=...`** → `debouncedUrlSync` guard isn't firing. Check `SITE_VARIANT` import in event-handlers.ts.
3. **WhatsApp share shows `sachnetra.com` instead of `/story?id=...`** → `storyUrl` variable isn't reaching `shareToWhatsApp`. Check it's declared before the event listener wiring.
4. **Back button doesn't work from story detail** → `popstate` listener was removed too early. Check `closeOverlay` logic.
5. **localStorage** — Clear localStorage + hard refresh if tabs behave unexpectedly after code change.

---

## Completion Log

- [ ] Phase 1 complete — Tab URL routing
- [x] Phase 2 complete — Suppress map URL sync — 2026-04-09
- [x] Phase 3 complete — Story shareable URL — 2026-04-09
- [x] Phase 4 complete — Story deep-link handler — 2026-04-09
- [x] Phase 5 complete — Middleware OG paths — 2026-04-09
- [x] Typecheck: 0 errors — 2026-04-09
- [ ] Browser verified (mobile)
- [ ] Browser verified (desktop)
- [ ] **TASK 017 COMPLETE** ✅
