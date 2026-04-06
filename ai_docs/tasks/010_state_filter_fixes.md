# Task 010 — State Filter Fixes
*SachNetra Adapt Sprint*

**Depends on**: Task 007 (state filtering) and Task 009 (CSS improvements) must be complete
**Estimated time**: 1–2 hours
**Prep doc**: 04_data_sources.md (INDIA_STATE_KEYWORDS), 07_roadmap.md (Task 007 spec)

---

## Context — Current State

The state filter (Task 007) is functional — selecting a state filters stories correctly by keyword matching against `INDIA_STATE_KEYWORDS`. However two display/accuracy issues exist:

**Issue 1 — Footer shows "India" instead of the selected state name**

`src/services/rss.ts:260-270`: Each RSS item gets `locationName` from `inferGeoHubsFromTitle()` — a **city-level** geo-hub index. "New Delhi" is a city so it resolves. "Kerala" is a **state name** and is NOT in the geo-hub index → `locationName` stays `undefined`.

`src/app/data-loader.ts:1395`: The card template does:
```typescript
const location = item.locationName || 'India';
```
When `locationName` is undefined, it falls back to `'India'` — even when the user has explicitly selected Kerala.

**Issue 2 — Delhi filter passes non-Delhi stories**

`src/config/variants/india.ts:90`: Delhi keywords include `'parliament'` and `'delhi'`.
`src/services/rss.ts:388-391`: The filter checks BOTH `item.title` AND `item.locationName`:
```typescript
stateKeywords.some(kw =>
  item.title.toLowerCase().includes(kw) ||
  (item.locationName && item.locationName.toLowerCase().includes(kw))
)
```

Many national-level stories get `locationName = "New Delhi"` from geo-hub inference (because their headlines mention institutions in Delhi). The `'delhi'` keyword then substring-matches `'new delhi'` in locationName, passing non-Delhi stories through the filter.

## What This Task Does

- **Phase 1**: When a state filter is active and a story has no `locationName`, use the selected state's display name as the fallback instead of hardcoding `'India'`.
- **Phase 2**: Tighten `filterNewsByState()` to only match on `item.title`, not `item.locationName`. Remove `'parliament'` from Delhi keywords (it's a national keyword, not Delhi-specific).

---

## Files To Open Before Starting

```
src/app/data-loader.ts          — card template with location fallback (line 1395)
src/services/rss.ts              — filterNewsByState function (line 378–394)
src/config/variants/india.ts     — INDIA_STATES list + INDIA_STATE_KEYWORDS (line 37–119)
```

---

## Pattern To Follow

From `src/config/variants/india.ts`, the state name lookup pattern:
```typescript
export const INDIA_STATES: ReadonlyArray<{ code: string; name: string; city: string }> = [
  { code: 'KL', name: 'Kerala', city: 'Thiruvananthapuram' },
  { code: 'DL', name: 'Delhi', city: 'New Delhi' },
  // ...
];
```

`selectedState` is a 2-letter code like `'KL'` or `null` (All India).
Lookup: `INDIA_STATES.find(s => s.code === selectedState)?.name`

---

## Implementation

### Phase 1: Fix footer location fallback when state filter is active
**Goal**: When user selects Kerala and a story matched by title keyword (not geo-hub), show "Kerala" instead of "India".

- [ ] **Step 1.1** — Import `INDIA_STATES` in data-loader.ts
  - File: `src/app/data-loader.ts`
  - Line 154 already imports `INDIA_STATE_KEYWORDS` from the same file.
  - Add `INDIA_STATES` to that import:
    ```typescript
    import { INDIA_STATE_KEYWORDS, INDIA_STATES } from '@/config/variants/india';
    ```

- [ ] **Step 1.2** — Update location fallback in `renderIndiaStoryCards`
  - File: `src/app/data-loader.ts`
  - Current (line 1395):
    ```typescript
    const location = item.locationName || 'India';
    ```
  - Replace with:
    ```typescript
    const location = item.locationName
      || (this.ctx.selectedState && INDIA_STATES.find(s => s.code === this.ctx.selectedState)?.name)
      || 'India';
    ```
  - This resolves: no locationName + state filter active → state name. No locationName + no filter → `'India'`.

- [ ] **Verify Phase 1**: `npm run typecheck` → 0 errors

---

### Phase 2: Tighten state filter to prevent false positives
**Goal**: Delhi filter should not pass stories that merely have `locationName = "New Delhi"` set by geo-hub inference.

- [ ] **Step 2.1** — Remove locationName matching from `filterNewsByState`
  - File: `src/services/rss.ts`
  - Current (line 388–393):
    ```typescript
    return items.filter(item =>
      stateKeywords.some(kw =>
        item.title.toLowerCase().includes(kw) ||
        (item.locationName && item.locationName.toLowerCase().includes(kw))
      )
    );
    ```
  - Replace with (title-only matching):
    ```typescript
    return items.filter(item =>
      stateKeywords.some(kw =>
        item.title.toLowerCase().includes(kw)
      )
    );
    ```
  - **Why**: `locationName` comes from geo-hub inference which maps cities, not states. A story about Assam elections that happens to mention a Delhi institution gets `locationName = "New Delhi"`, then passes the Delhi filter. Title-only matching is more accurate — if a story is about Kerala, "Kerala" appears in the headline.

- [ ] **Step 2.2** — Remove `'parliament'` from Delhi keywords
  - File: `src/config/variants/india.ts`
  - Current (line 90):
    ```typescript
    'DL': ['delhi', 'new delhi', 'ncr', 'lutyen', 'parliament', 'rashtrapati'],
    ```
  - Replace with:
    ```typescript
    'DL': ['delhi', 'new delhi', 'ncr', 'lutyen', 'rashtrapati'],
    ```
  - **Why**: "Parliament" appears in national political headlines regardless of state. It leaks non-Delhi stories into the Delhi filter.

- [ ] **Verify Phase 2**: `npm run typecheck` → 0 errors

---

## Before / After

**Before** (`data-loader.ts:1395`):
```typescript
const location = item.locationName || 'India';
```

**After**:
```typescript
const location = item.locationName
  || (this.ctx.selectedState && INDIA_STATES.find(s => s.code === this.ctx.selectedState)?.name)
  || 'India';
```

---

**Before** (`rss.ts:388-393`):
```typescript
return items.filter(item =>
  stateKeywords.some(kw =>
    item.title.toLowerCase().includes(kw) ||
    (item.locationName && item.locationName.toLowerCase().includes(kw))
  )
);
```

**After**:
```typescript
return items.filter(item =>
  stateKeywords.some(kw =>
    item.title.toLowerCase().includes(kw)
  )
);
```

---

**Before** (`india.ts:90`):
```typescript
'DL': ['delhi', 'new delhi', 'ncr', 'lutyen', 'parliament', 'rashtrapati'],
```

**After**:
```typescript
'DL': ['delhi', 'new delhi', 'ncr', 'lutyen', 'rashtrapati'],
```

---

## Read vs Write

**READ for reference (always allowed):**
- `src/config/variants/full.ts` — study pattern, never write
- `src/config/variants/tech.ts` — study pattern, never write
- `src/services/geo-hub-index.ts` — understand inferGeoHubsFromTitle

**WRITE only to files explicitly listed:**
- `src/app/data-loader.ts` — import + location fallback
- `src/services/rss.ts` — simplify filter function
- `src/config/variants/india.ts` — remove 'parliament' from Delhi keywords

**Never write to:**
- `src/config/variants/full.ts` — sacred
- `src/config/variants/tech.ts` — sacred
- `src/config/variants/finance.ts` — sacred

---

## Verify

```bash
npm run typecheck   # Must show: 0 errors
```

In browser (with state filter):
- [ ] Select Kerala → story cards show "Kerala" in footer (not "India")
- [ ] Select Delhi → only Delhi-related stories appear (no Assam/Baramati leakage)
- [ ] Select All India → all stories show, locations display geo-hub city or "India"
- [ ] Select Maharashtra → stories show "Maharashtra" when no city resolved

---

## Completion Log

- [x] Phase 1 complete — footer location fallback — 2026-04-06
- [x] Phase 2 complete — filter tightening — 2026-04-06
- [x] Typecheck: 0 errors — 2026-04-06
- [ ] Browser verified
- [ ] **TASK 010 COMPLETE** ✅
