# Task 014 — India Classifier Keywords
*SachNetra Adapt Sprint*

**Depends on**: Task 013 (Timeline River Feed) complete
**Estimated time**: 30 minutes
**Deploy required**: ✅ Vercel redeploy (server-side change)

---

## Context — Why This Exists

The server-side keyword classifier (`server/worldmonitor/news/v1/_classifier.ts`) was
originally built for a **global intelligence dashboard** (WorldMonitor). Its vocabulary is
geopolitics-heavy: missiles, coups, airstrikes, sanctions. It has almost no India-specific
financial, political, or crime vocabulary.

Result: **~90% of India news gets classified as `general`** (confidence: 0.3) because
headlines like "Nifty IT Index rises 2.50%" or "Assembly poll: campaigning ends" contain
zero matches in the existing keyword lists.

### The Two-Layer Fix

We handle this at two layers:

| Layer | Where | Effect |
|---|---|---|
| **Layer 1** (deployed Task 013) | `src/app/data-loader.ts` → `mapCategory()` | Source-name fallback — stories from LiveMint/Inc42/PIB go to correct chip even if classifier says `general`. **Instant, no redeploy.** |
| **Layer 2** (this task) | `server/worldmonitor/news/v1/_classifier.ts` | Keyword additions — stories get correct category embedded at ingestion. **Requires Vercel redeploy + Redis cache expiry (~10 min).** |

Layer 2 makes Layer 1 less necessary over time, but Layer 1 remains as a safety net.

---

## Files To Modify

```
server/worldmonitor/news/v1/_classifier.ts   — ONLY file to change
```

Do NOT touch:
- `src/config/variants/full.ts` — sacred
- `src/config/variants/tech.ts` — sacred
- `src/config/variants/finance.ts` — sacred

---

## What To Change

### 1. Add to `SHORT_KEYWORDS` set (word-boundary matching)

These are 3-char terms that need `\b` boundary matching to avoid false substring hits:

```typescript
// Add to existing SHORT_KEYWORDS set (around L177):
'epf', 'gst',
```

---

### 2. Add to `LOW_KEYWORDS` — Economic (confidence: 0.6)

```typescript
// India financial markets
'nifty': 'economic',
'sensex': 'economic',
'share market': 'economic',
'stock market': 'economic',
'income tax': 'economic',
'bank fd': 'economic',
'futures trade': 'economic',
'defence stock': 'economic',   // matches "defence stocks" too
'index fund': 'economic',
'epf': 'economic',             // word-boundary via SHORT_KEYWORDS
'gst': 'economic',             // word-boundary via SHORT_KEYWORDS
```

**Skip**: `interest rate` (already exists L127), `ipo` (already exists L157), `wage` (false positive — "wage war"), `agr` (too niche)

---

### 3. Add to `LOW_KEYWORDS` — Diplomatic (confidence: 0.6)

```typescript
// India elections + legislature
'assembly poll': 'diplomatic',
'lok sabha': 'diplomatic',
'rajya sabha': 'diplomatic',
'election commission': 'diplomatic',
'campaigning': 'diplomatic',
'repolls': 'diplomatic',
'union minister': 'diplomatic',
'bill passed': 'diplomatic',
'amendment bill': 'diplomatic',
```

**Watch**: `union minister` has low false-positive risk for India content. Keep at LOW (0.6), not higher.

---

### 4. Add new MEDIUM crime keywords (confidence: 0.7)

The current `crime` bucket only has `assassination` (in HIGH). These are strong unambiguous
crime signals in Indian news — promote directly to MEDIUM:

Add a new `CRIME_MEDIUM_KEYWORDS` block (or add to `MEDIUM_KEYWORDS`):

```typescript
// Add to MEDIUM_KEYWORDS (around L67):
'bribe': 'crime',
'police custody': 'crime',
'custodial': 'crime',       // "custodial death", "custodial torture"
'murder accused': 'crime',
```

---

### 5. Add to `LOW_KEYWORDS` — Crime (confidence: 0.6)

```typescript
'scam': 'crime',
'cancels bail': 'crime',
'arrested for': 'crime',     // phrase — safer than bare "arrested"
'held for': 'crime',         // phrase — safer than bare "held"
```

**Skip**: `bail in` (false positive — "bank bail-in" is economic), `sent to custody` (covered by `police custody`), `suspended officer` (too broad)

---

### 6. Add to `EXCLUSIONS` array

```typescript
'ipl',
'cricket',
'bollywood',
't20',
'match preview',
'match report',
'reading list',
'books to read',
'writing skills',
```

**Skip**: `premier league` (low India relevance), `squad announce` (too niche), `stock market institute` (single ad article), `emerging as one of` (phrase fragment, too broad)

---

## Before / After Examples

| Headline | Before | After |
|---|---|---|
| "Nifty IT Index rises 2.50%" | `general` (0.3) | `economic` (0.6) via `nifty` |
| "GST Council to meet next week" | `general` (0.3) | `economic` (0.6) via `gst` |
| "Assembly poll: campaigning ends" | `general` (0.3) | `diplomatic` (0.6) via `campaigning` |
| "Lok Sabha session ends with key bills passed" | `general` (0.3) | `diplomatic` (0.6) via `lok sabha` |
| "Forest officer arrested for taking ₹50,000 bribe" | `general` (0.3) | `crime` (0.7) via `bribe` |
| "Sattankulam custodial deaths case" | `general` (0.3) | `crime` (0.7) via `custodial` |
| "Sukesh Chandrasekhar gets bail in AIADMK scam" | `general` (0.3) | `crime` (0.6) via `scam` |
| "IPL: Rajasthan Royals win over Mumbai Indians" | `general` (0.3) | excluded via `ipl` |

---

## What Does NOT Change

- The `confidence` scale and `ThreatLevel` type — unchanged
- The `classifyByKeyword()` function logic — unchanged
- The order of tier evaluation (CRITICAL → HIGH → MEDIUM → LOW) — unchanged
- The `TECH_*` keyword blocks — unchanged (tech variant specific)
- Layer 1 source-based fallback in `data-loader.ts` — remains as safety net

---

## Testing After Deploy

### Automated
```bash
npm run typecheck          # Must show: 0 errors
npm run test:data          # Existing classifier tests must pass
```

### Manual (after Vercel redeploy + ~10 min cache expiry)
- Check Timeline tab Economy chip: should show LiveMint, ET, Business Standard stories **with category `economic`**, not just via source-fallback
- Check Timeline tab Govt chip: PIB stories should show `diplomatic` from classifier, not source-fallback
- Check Conflict chip: ALERT border stories should still work
- Sports headlines (IPL, cricket) should no longer appear in Timeline

---

## History Notes — Decisions Made

### 2026-04-08 — Initial India keyword expansion
- **Rejected `wage`**: false positive with "wage war" → conflict, not economic
- **Rejected `ipo` from new adds**: already in `TECH_LOW_KEYWORDS` at L157
- **Rejected `interest rate` from new adds**: already in `LOW_KEYWORDS` at L127
- **Rejected `bail in` for crime**: overlaps with banking "bail-in" term → economic false positive
- **Promoted `bribe`, `police custody`, `custodial`, `murder accused` to MEDIUM**: these are unambiguous crime signals, unlike `scam` which can overlap with economic
- **Kept `union minister` at LOW (0.6)**: per Claude Code's recommendation — risk of editorial/opinion pieces slipping as diplomatic rather than general political noise if elevated
- **Source research method**: Used Claude Code with web search on Indian news archives (NDTV, The Hindu, LiveMint, Inc42 headline patterns) to validate keyword choices

### What we learned about the classifier architecture
- The classifier is **title-only** — it does not use the article body or source name
- The `source: 'keyword'` field in `ClassificationResult` means it IS the keyword classifier (vs a future ML classifier)
- It runs server-side on Vercel Edge — any change needs a **full redeploy** + Redis cache expiry (~10 min for news tier)
- Layer 1 (client-side source fallback in `mapCategory()`) is a fast workaround that bypasses this latency

---

## Completion Log

- [ ] Keywords added to `_classifier.ts`
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run test:data` — all tests pass
- [ ] Committed and pushed to main
- [ ] Vercel redeploy confirmed
- [ ] Cache expired (~10 min), Timeline chips verified in browser
- [ ] **TASK 014 COMPLETE** ✅
