# SachNetra — Project Context

## What It Is

SachNetra is a **news clarity tool for urban Indians**. Not a geopolitical dashboard. Not an OSINT tool. A calm, factual news aggregator that replaces anxiety-inducing TV news with clear, plain-language summaries.

**Dual identity:** the **front end** is a news-aggregation platform (sachnetra.com); **behind it** is a collection engine that records India's news *and* the market/alt-data the quant system needs to Railway PostgreSQL. The database is the asset; the quant system is the proof of value.

**Tagline**: "See clearly" | सच्चनेत्र  
**Domain**: sachnetra.com (purchased)

## Who It's For (V1)

Urban India, English + Hindi, age 18–35:
- College students wanting quick news clarity
- Young professionals with no time to read multiple sources
- WhatsApp forward verifiers checking whether news is real

> **V2 stance shift (positioning §3.1):** the consumer-growth features (Hindi, WhatsApp brief, landing page, feedback buttons) are **parked**. SachNetra is now *"be your own first customer"* — prove the quant signals by trading them on own capital, not a consumer/B2B product. The audience above is V1 history, not the current build target.

## Technical Approach

SachNetra began as a new **variant** inside the WorldMonitor codebase fork. It is now the **only deployed variant** — the other WorldMonitor variants (`full`/`tech`/`finance`/`commodity`/`happy`) are being removed (see `ai_docs/update-workflow/2026-06-11_claude-md-refresh-and-worldmonitor-cleanup.md`, Workstream B).

**One file controls the front end**: `src/config/variants/india.ts` → served at `sachnetra.com`.

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

SachNetra builds a point-in-time, entity-resolved record of India's news + market/alt-data as a byproduct of running the news app. **Positioning (§3.1, "be your own first customer"): prove the signals by trading them on own capital — NOT a B2B/consumer/SaaS product.** A B2B offering (IndiaSignal) is deferred indefinitely; build and validate the data first.

## V2 Entry Points

The pipeline is now **multi-script**, not a single Redis-reading cron:

- News pipeline: `scripts/seed-india-signals.mjs` (+ `_thread-linker.mjs`,
  `_entity-fan-out.mjs`) — Railway cron; cluster → thread → entity.
  V2-012/013/014 SHIPPED.
- Flows pipeline: `scripts/seed-india-flows.mjs` (V2-017) — a **separate
  daily** Railway cron. Non-news, **does NOT read Redis** — scrapes
  public FII/DII endpoints (Moneycontrol/NSE/BSE) → PostgreSQL directly.
  Failure-isolated from the news cron by design.
- More collectors (independent crons, one per source family): `seed-india-announcements`
  (NSE filings), `seed-india-deals` (bulk/block), `seed-india-electricity` (POSOCO),
  `seed-india-fastag` (NPCI), plus `seed-india-macro` / `-options` / `-rbi-wss`.
- Data store: Railway PostgreSQL — `india_news_signals`, `story_threads`,
  `entity_timeline`, `india_institutional_flows`, `india_announcements`,
  `india_bulk_block_deals`, electricity/FASTag tables, `research_prices`, …
- New collectors are independent: do NOT bolt non-news sources onto the
  news cron. One cron per source family.
- New sacred: `scripts/seed-insights.mjs` — never modify for V2 intelligence work; create a sibling instead
