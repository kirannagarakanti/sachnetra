# Bug Triage & Fix — SachNetra

> **Goal:** Get to the solution fast. Start with quick triage, expand only if needed.

---

## STEP 1: Critical Info (Required)

**What's the actual error?**
- **Error message:** [Exact error text / console output / screenshot]
- **When it happens:** [Page load, button click, state change, specific action]
- **Where you see it:** [Browser console, Network tab, Vercel function logs, terminal]
- **Environment:** [Mobile / Desktop · Chrome / Safari · dev / prod · which variant]

**Can you reproduce it?**
- [ ] Always
- [ ] Sometimes — under these conditions: [describe]
- [ ] Only in production (not dev)

---

## STEP 2: Quick Assessment

Based on the error, this looks like:
- [ ] **Simple Fix** — typo, wrong CSS var, obvious one-liner
- [ ] **Type Error** — TypeScript mismatch, wrong interface
- [ ] **RSS / Feed Issue** — 403 feed, allowlist gap, Google News proxy needed
- [ ] **Variant Wiring** — data defined in india.ts but not routed through feeds.ts / panels.ts
- [ ] **API / Edge Function** — Vercel function error, CORS, rate limit, missing env var
- [ ] **Cache Issue** — stale Redis cache, wrong CACHE_VERSION, needs localStorage clear
- [ ] **Complex System Issue** — requires deeper investigation

---

## STEP 3: Immediate Action

### IF SIMPLE FIX:
Fix it now. Show the before/after diff.

### IF RSS / FEED ISSUE:
```
1. Check the feed URL directly in browser
2. If 403 → use Google News RSS proxy:
   news.google.com/rss/search?q=site:domain.com&hl=en&gl=IN&ceid=IN:en
3. Check allowlist (THREE files must all be updated in sync):
   shared/rss-allowed-domains.json     ← source of truth
   api/_rss-allowed-domains.js         ← ESM copy for Vercel edge
   (api/rss-proxy.js imports from above — do NOT edit inline)
```

### IF VARIANT WIRING:
```
Trace the import chain:
  data-loader.ts → FEEDS from @/config → config/index.ts → feeds.ts → variant ternary
  panel-layout.ts → DEFAULT_PANELS from @/config → config/index.ts → panels.ts → variant ternary

Check each step — india.ts exports can be dead code if panels.ts doesn't import them.
```

### IF CACHE ISSUE:
```
1. Bump CACHE_VERSION in groq-summarize.js / openrouter-summarize.js
2. Or tell James: localStorage.clear() + hard refresh
3. For Redis: old summaries will expire naturally (TTL ~4h) or bump CACHE_VERSION
```

### IF API / EDGE FUNCTION:
```
1. Check Vercel function logs (vercel logs --follow)
2. Verify env vars are set in Vercel dashboard
3. Check CORS: api/_cors.js has sachnetra.com? api/_api-key.js?
4. Test endpoint directly: curl https://sachnetra.com/api/health
```

### IF COMPLEX → continue to Deep Investigation below.

---

## DEEP INVESTIGATION (Complex Issues Only)

### A: Reproduce Exactly
Before touching code, write down the exact reproduction steps:
```
1. Open sachnetra.com on mobile Chrome
2. Tap "Maharashtra" in state selector
3. Wait 3 seconds
4. Error: [exact message]
```

### B: Flow Analysis
Trace the full data path:
```
[User Action] → [Component] → [Service] → [API] → [ERROR]
     ↓               ↓           ↓          ↓
[Expected]      [Expected]  [Expected] [Expected]
     ↓               ↓           ↓          ↓
[Actual]        [Actual]    [Actual]   [Actual]
```

### C: Sachnetra Debugging Checklist

Follow this sequence — catches 90% of India variant bugs:

1. **Console: `[App] Variant check:`** — confirms variant is `india`
2. **Console: `[News] Digest missing for "X"`** — categories match FEEDS keys → routing works
3. **Console: `using per-feed fallback` vs `fallback disabled`** — RSS fetching on?
4. **Network tab: filter `rss-proxy`** — zero requests = fallback disabled. 200 vs 403?
5. **Panels visible?** — data arriving but no panels → check `panels.ts` INDIA_PANELS
6. **Clear localStorage** — `localStorage.clear(); location.reload();`

**Red herrings to ignore:**
- `[feeds] 103 unique sources / 200 total` — always shows FULL_FEEDS count, not india
- LIVE NEWS ticker (Bloomberg/CNN) — separate live TV system, not RSS
- `india.ts` DEFAULT_PANELS export — dead code, panels.ts is source of truth

### D: Solution Options

Present 2–3 options with trade-offs before implementing:

#### Option 1: [Quick Fix]
**What:** [Description]
**Risk:** Low/Medium/High
**Scope:** 1–2 files
**Downside:** [Any tech debt?]

#### Option 2: [Proper Fix]
**What:** [Description]
**Risk:** Low/Medium/High
**Scope:** [Files affected]
**Downside:** [Time cost?]

**Recommended:** Option [X] because [reason].

---

## Implementation Checklist

**Before fixing:**
- [ ] Read `.agents/rules/sachnetra-boundaries.md` — never write to sacred files
- [ ] Understand the full change needed
- [ ] Know how to verify the fix

**After fixing:**
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — Biome clean
- [ ] Test in browser (mobile + desktop)
- [ ] Check for similar issues in related files

---

## Known Sachnetra Gotchas

1. **403 from Indian RSS feeds** — Cloud IPs blocked. Use Google News RSS proxy.

2. **SVG gradient ID conflicts** — Same SVG in multiple DOM locations = broken gradients.
   Prefix gradient IDs per context (`sn-`, `snf-`, `snl-`).

3. **Allowlist is 3 files, not 1** — `shared/rss-allowed-domains.json` is source of truth.
   `api/_rss-allowed-domains.js` is the ESM copy. Never edit rss-proxy.js inline.

4. **india.ts exports can be dead code** — `DEFAULT_PANELS` in india.ts is metadata.
   `panels.ts` is the actual source of truth. Always trace the import chain.

5. **Branding lives in layout, not variant config** — Header/footer/favicon:
   `panel-layout.ts`, `main.css`, `variant-meta.ts`, `index.html`. Not in india.ts.

6. **Loading screen must be inline** — Anything visible before JS bundle loads must be
   inline in `index.html`, not imported from modules.

7. **localStorage caches panel settings** — After changing `panels.ts`, tell James to
   run `localStorage.clear()` + hard refresh.

8. **Edge functions are plain JS** — `api/*.js` files cannot import from `src/`.
   No TypeScript, no path aliases. Self-contained only.

9. **CACHE_VERSION controls Redis TTL** — Bump it when changing AI prompt format
   to purge stale summaries. Current: v8 (as of Task 018.5).

---

## If It's a Simple Fix (1–2 lines)
Show the fix immediately:
> "Found the issue — it's [description]. Here's the fix: [before/after]. Applying now."

## If It's Complex (3+ lines or multiple files)
> "This needs a proper task. Creating task file using adapt_sprint_task.md."
