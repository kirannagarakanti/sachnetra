# Task V2-005 — Government Sources + News Additions
*SachNetra Adapt Sprint*

**Depends on**: V2-000 must be complete
**Estimated time**: 1–2 hours
**Prep doc**: `ai_docs/sachnetra v2/V2_roadmap.md` — Task V2-005 section
**V1 or V2**: V2

---

## Architecture Decision

Original spec called for a self-hosted RSSHub Docker container on Railway. **Dropped.**
The public `rsshub.app` instance is already in `shared/rss-allowed-domains.json` and handles
low-traffic govt feeds with zero infra cost. No new Railway services, no Docker, no new env vars.

Self-hosting can be revisited in V3 if reliability becomes an issue at scale.

---

## Context — Current State

### Government section in `_feeds.ts` (India variant, line ~479)

Currently only 2 entries, both routing through Google News search (slow, filtered):

```typescript
government: [
  { name: 'DD News', url: gnIn('site:ddnews.gov.in') },
  { name: 'PIB',     url: gnIn('site:pib.gov.in') },
],
```

Problems with the current approach:
- Google News search delays press releases by 15–60 minutes vs. direct RSS
- Google filters/deduplicates — some press releases never appear
- PIB has a native RSS feed; no reason to use gnIn for it

### Politics section (line ~408)

25+ outlets already present. Two high-reach outlets missing:
- **Times Now** — large English TV news audience, not in feeds
- **Deccan Chronicle** — major South India paper, missing

### Allowlist current state

`shared/rss-allowed-domains.json` already contains:
- `rsshub.app` ✅ (line 41)
- `pib.gov.in` ✅ (line 158)
- `ddnews.gov.in` ✅ (line 157)

Missing (must add):
- `www.timesnownews.com`
- `www.deccanchronicle.com`

Note: MEA, MHA, NDMA use `gnIn()` (Google News search) — no new domains needed for those.
`pib.gov.in` is already in the allowlist for the PIB native RSS URL.

---

## What This Task Does

1. Upgrades the `government` category in the India `_feeds.ts` section:
   - PIB: replace gnIn search with native RSS (faster, direct)
   - MEA, MHA, NDMA: add via rsshub.app routes (after verifying each URL returns valid XML)
2. Adds Times Now and Deccan Chronicle to the `politics` category
3. Adds 5 new domains to `shared/rss-allowed-domains.json`
4. Syncs `api/_rss-allowed-domains.js` to match exactly

No new env vars. No Railway changes. No Docker.

---

## Success Criteria

This task is complete when ALL of the following are true:

- [ ] PIB entry in `government` uses native RSS URL, not gnIn
- [ ] MEA, MHA, NDMA entries added to `government` — each URL returns valid XML (verified)
- [ ] Times Now added to `politics` category
- [ ] Deccan Chronicle added to `politics` category
- [ ] `shared/rss-allowed-domains.json` contains all 5 new domains
- [ ] `api/_rss-allowed-domains.js` matches `shared/rss-allowed-domains.json` exactly
- [ ] `npm run typecheck` shows 0 errors
- [ ] `npx biome check .` shows 0 errors

---

## Second-Order Impact

- **Digest volume**: Adding 6 new feed entries will increase the number of articles fetched per digest run. Expect 10–30 extra items per 10-minute cycle. The clustering deduplication already handles this — no risk of flooding the UI.
- **Allowlist sync**: `api/_rss-allowed-domains.js` is the ESM runtime copy of the allowlist used by the Vercel edge function `rss-proxy.js`. If you forget to sync it, the new feeds will 403 in production even though they look correct locally.
- **Variant bleed risk**: `_feeds.ts` exports `VARIANT_FEEDS`. The `india` key is isolated — changes here cannot affect `full`, `tech`, or `finance` variants.
- **New env vars needed**: none

---

## Files To Open Before Starting

```
server/worldmonitor/news/v1/_feeds.ts   — write: government + politics sections
shared/rss-allowed-domains.json         — write: add 5 new domains
api/_rss-allowed-domains.js             — write: sync copy (must match allowlist)
```

**Read for reference (never write):**
```
src/config/variants/full.ts             — sacred, never write
src/config/variants/tech.ts             — sacred, never write
src/config/variants/finance.ts          — sacred, never write
```

---

## Pattern To Follow

### Three-file allowlist rule

`shared/rss-allowed-domains.json` is the source of truth. `api/_rss-allowed-domains.js` is the
ESM runtime copy. They must always be identical in content. Never edit `rss-proxy.js` or
`ais-relay.cjs` directly for allowlist changes.

Correct update sequence:
1. Add domain to `shared/rss-allowed-domains.json`
2. Add the same domain to `api/_rss-allowed-domains.js`
3. Never touch anything else for allowlist changes

### Current government section (before)

```typescript
government: [
  { name: 'DD News', url: gnIn('site:ddnews.gov.in') },
  { name: 'PIB',     url: gnIn('site:pib.gov.in') },
],
```

### Target government section (after)

```typescript
government: [
  { name: 'DD News', url: gnIn('site:ddnews.gov.in') },
  { name: 'PIB',     url: 'https://www.pib.gov.in/ViewRss.aspx?reg=1&lang=1' },  // native RSS (verify Step 1.1)
  { name: 'MEA',     url: gnIn('site:mea.gov.in') },                              // JS app, no native RSS
  { name: 'MHA',     url: gnIn('site:mha.gov.in') },                              // no native RSS
  { name: 'NDMA',    url: gnIn('site:ndma.gov.in') },                             // JS app, no native RSS
],
```

### Politics additions (append to existing list)

```typescript
{ name: 'Times Now',        url: 'https://www.timesnownews.com/feeds/gns-en-latest.xml' },
{ name: 'Deccan Chronicle', url: 'https://www.deccanchronicle.com/rss_feed' },
```

---

## Implementation

### Phase 1: Verify all feed URLs before writing any code

**Goal**: Confirm every URL returns valid RSS/Atom XML before touching `_feeds.ts`.
A broken feed silently fails — the digest just skips it. Verify first, then code.

> **Pre-research finding (2026-05-09)**: RSSHub has NO documented routes for any Indian
> government ministry (MEA, MHA, NDMA). The rsshub project covers Chinese government sites
> but not Indian ones. Do not attempt rsshub routes — use native RSS or gnIn fallbacks below.

- [ ] **Step 1.1** — Verify PIB native RSS
  - The original `RssMain.aspx` URL is an older format. Current working URL pattern:
    `https://www.pib.gov.in/ViewRss.aspx?reg=1&lang=1`
  - Fetch that URL and confirm valid XML with `<item>` elements
  - If broken: fall back to `gnIn('site:pib.gov.in')` and note it here

- [ ] **Step 1.2** — MEA native RSS
  - Confirmed (2026-05-09): `mea.gov.in/rss-feeds.htm` is a JS-rendered web app — no extractable
    RSS URL. Use fallback: `gnIn('site:mea.gov.in')`

- [ ] **Step 1.3** — MHA native RSS
  - Confirmed (2026-05-09): No native RSS feed found. Use fallback: `gnIn('site:mha.gov.in')`

- [ ] **Step 1.4** — NDMA / SACHET disaster alerts RSS
  - Confirmed (2026-05-09): `sachet.ndma.gov.in` is a JS web app — no extractable RSS URL.
    Use fallback: `gnIn('site:ndma.gov.in')`

- [ ] **Step 1.5** — Verify Times Now RSS
  - Fetch: `https://www.timesnownews.com/feeds/gns-en-latest.xml`
  - Expect: valid XML with recent headlines

- [ ] **Step 1.6** — Verify Deccan Chronicle RSS
  - Fetch: `https://www.deccanchronicle.com/rss_feed`
  - Expect: valid XML with recent headlines

---

### Phase 2: Update `_feeds.ts`

**Goal**: Replace the government section and append to the politics section.

- [ ] **Step 2.1** — Replace PIB entry in government section
  - File: `server/worldmonitor/news/v1/_feeds.ts`
  - Find: `{ name: 'PIB', url: gnIn('site:pib.gov.in') },`
  - Replace with: `{ name: 'PIB', url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3' },`
  - (Only if Step 1.1 confirmed the URL works — otherwise leave as-is)

- [ ] **Step 2.2** — Add MEA, MHA, NDMA to government section
  - File: `server/worldmonitor/news/v1/_feeds.ts`
  - Append after the PIB line (inside `government: [...]`):
    ```typescript
    { name: 'MEA',  url: '<URL confirmed in Step 1.2>' },
    { name: 'MHA',  url: '<URL confirmed in Step 1.3>' },
    { name: 'NDMA', url: '<URL confirmed in Step 1.4>' },
    ```

- [ ] **Step 2.3** — Add Times Now and Deccan Chronicle to politics section
  - File: `server/worldmonitor/news/v1/_feeds.ts`
  - Append to the end of the `politics: [...]` array (before the closing `]`):
    ```typescript
    { name: 'Times Now',        url: 'https://www.timesnownews.com/feeds/gns-en-latest.xml' },
    { name: 'Deccan Chronicle', url: 'https://www.deccanchronicle.com/rss_feed' },
    ```
  - (Only add URLs confirmed working in Steps 1.5 and 1.6)

---

### Phase 3: Update `shared/rss-allowed-domains.json`

**Goal**: Add every new domain that appears in the URLs added in Phase 2.

- [ ] **Step 3.1** — Add new domains to the allowlist
  - File: `shared/rss-allowed-domains.json`
  - Only 2 new domains needed (MEA/MHA/NDMA use gnIn; pib.gov.in already present):
    ```json
    "www.timesnownews.com",
    "www.deccanchronicle.com"
    ```
  - Note: `pib.gov.in` and `rsshub.app` are already present — do NOT add duplicates
  - Note: gnIn feeds route through `news.google.com` which is already handled — no domain
    entry needed for MEA, MHA, or NDMA

---

### Phase 4: Sync `api/_rss-allowed-domains.js`

**Goal**: Keep the ESM runtime copy in sync with the JSON source of truth.

- [ ] **Step 4.1** — Add the same domains to the JS copy
  - File: `api/_rss-allowed-domains.js`
  - This file exports the same list as an ESM array. Add the same domains you added in Step 3.1.
  - Read the file first to confirm the current format — it should be an `export default [...]`
    or a `const ALLOWED = [...]` array.
  - Add the same domains in the same position (alphabetical or appended to end — match the
    existing ordering convention in the file).

- [ ] **Step 4.2** — Cross-check both files are in sync
  - After editing both files, mentally diff them: every domain in the JSON must appear in the JS.
  - A mismatch here causes silent 403s in production for the new feeds.

---

## Before / After

### `_feeds.ts` — government section

**Before:**
```typescript
government: [
  { name: 'DD News', url: gnIn('site:ddnews.gov.in') },
  { name: 'PIB',     url: gnIn('site:pib.gov.in') },
],
```

**After:**
```typescript
government: [
  { name: 'DD News', url: gnIn('site:ddnews.gov.in') },
  { name: 'PIB',     url: 'https://www.pib.gov.in/ViewRss.aspx?reg=1&lang=1' },
  { name: 'MEA',     url: gnIn('site:mea.gov.in') },
  { name: 'MHA',     url: gnIn('site:mha.gov.in') },
  { name: 'NDMA',    url: gnIn('site:ndma.gov.in') },
],
```

### `_feeds.ts` — politics section (tail end)

**Before:**
```typescript
  { name: 'Amarujala',        url: 'https://www.amarujala.com/rss/breaking-news.xml' },
],
```

**After:**
```typescript
  { name: 'Amarujala',        url: 'https://www.amarujala.com/rss/breaking-news.xml' },
  { name: 'Times Now',        url: 'https://www.timesnownews.com/feeds/gns-en-latest.xml' },
  { name: 'Deccan Chronicle', url: 'https://www.deccanchronicle.com/rss_feed' },
],
```

---

## Error Scenarios

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| New feed returns 403 in production | Domain missing from `api/_rss-allowed-domains.js` | Add the domain; the JSON and JS must match |
| Feed URL added but stories never appear | URL returns non-RSS HTML (not XML) | Re-verify the URL; switch to gnIn fallback |
| Typecheck error in `_feeds.ts` | Invalid TypeScript syntax in added entries | Check trailing commas and quote consistency |
| `mea.gov.in` stories not appearing | rsshub route not found / returns 404 | Fall back to `gnIn('site:mea.gov.in')` |
| Duplicate domains in allowlist | Added domain already present | Remove the duplicate; both files must have no duplicates |

---

## Environment Variables

No new env vars for this task.

| Variable | Where set | Purpose |
|----------|----------|---------|
| `VITE_VARIANT=india` | `.env.local` | Required to test india variant locally |

---

## Read vs Write

**READ for reference (always allowed):**
- `src/config/variants/full.ts` — sacred, never write
- `src/config/variants/tech.ts` — sacred, never write
- `src/config/variants/finance.ts` — sacred, never write

**WRITE only to:**
- `server/worldmonitor/news/v1/_feeds.ts` — Phases 2
- `shared/rss-allowed-domains.json` — Phase 3
- `api/_rss-allowed-domains.js` — Phase 4

**Never write to:**
- `api/rss-proxy.js`
- `scripts/ais-relay.cjs`
- `scripts/seed-insights.mjs`
- Any file in `src/config/variants/`

---

## Verify

```bash
npm run typecheck     # Must show: 0 errors
npx biome check server/worldmonitor/news/v1/_feeds.ts shared/rss-allowed-domains.json api/_rss-allowed-domains.js
```

Manual spot-check (no dev server needed — these are server-side feed definitions):
- [ ] `_feeds.ts` — `government` array has 5 entries (DD News, PIB, MEA, MHA, NDMA)
- [ ] `_feeds.ts` — `politics` array ends with Times Now and Deccan Chronicle
- [ ] `shared/rss-allowed-domains.json` — contains `mea.gov.in`, `mha.gov.in`, `ndma.gov.in`, `www.timesnownews.com`, `www.deccanchronicle.com` (or only confirmed ones)
- [ ] `api/_rss-allowed-domains.js` — same domains present, no mismatches with JSON file
- [ ] No domain appears twice in either allowlist file

---

## Completion Log

- [x] Phase 1 complete (all URLs verified — MEA/MHA/NDMA confirmed JS apps, gnIn fallback used) — 2026-05-09
- [x] Phase 2 complete (`_feeds.ts` updated) — 2026-05-09
- [x] Phase 3 complete (`shared/rss-allowed-domains.json` updated) — 2026-05-09
- [x] Phase 4 complete (`api/_rss-allowed-domains.js` synced) — 2026-05-09
- [x] Typecheck: 0 errors — 2026-05-09
- [x] Biome: 0 errors — 2026-05-09
- [x] Manual spot-check: all items checked — 2026-05-09
- [x] **TASK V2-005 COMPLETE** ✅
