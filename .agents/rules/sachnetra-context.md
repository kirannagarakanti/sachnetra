# SachNetra — Project Context

## What It Is

SachNetra is a **news clarity tool for urban Indians**. Not a geopolitical dashboard. Not an OSINT tool. A calm, factual news aggregator that replaces anxiety-inducing TV news with clear, plain-language summaries.

**Tagline**: "See clearly" | सच्चनेत्र  
**Domain**: sachnetra.com (purchased)

## Who It's For (V1)

Urban India, English + Hindi, age 18–35:
- College students wanting quick news clarity
- Young professionals with no time to read multiple sources
- WhatsApp forward verifiers checking whether news is real

## Technical Approach

SachNetra is **NOT** a new application. It is a new **variant** inside the WorldMonitor codebase fork.

**One file controls everything**: `src/config/variants/india.ts`

The variant system already ships: `full`, `tech`, `finance`, `happy`.  
SachNetra adds: `india` → accessible at `sachnetra.com`

**Pattern to model**: `src/config/variants/tech.ts` (structure to copy)  
**Content reference**: `src/config/variants/full.ts` (study only, never write)

## Variant Detection

In `src/App.ts`:
```typescript
if (hostname.includes('sachnetra')) return 'india';
if (import.meta.env.VITE_VARIANT === 'india') return 'india';
```

## Dev Command

```bash
VITE_VARIANT=india npm run dev
```

---

## V2 Mission

V1 shipped a working India news aggregator. V2 transforms it into a **data collection engine** — every digest run permanently records signal data, independent of user activity. The news app remains the public face. The Railway PostgreSQL database accumulates the asset.

**The sentence:** SachNetra is the collection engine. The database is the asset. The quant system is the proof of value.

India's bilingual entity-aware sentiment data for Indian markets does not exist at production quality. SachNetra builds it as a byproduct of running the news app. The B2B quant product (IndiaSignal) is V3. V2 only starts the data collection.

## V2 Entry Points

- Intelligence pipeline: `scripts/seed-india-signals.mjs` — NEW Railway cron, reads Redis
- Data store: `india_news_signals` table on Railway PostgreSQL
- Hook point: reads `news:digest:v1:india:en` from Upstash Redis (already populated by digest)
- New sacred: `scripts/seed-insights.mjs` — never modify for V2 intelligence work; create a sibling instead
