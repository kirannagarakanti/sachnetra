# SachNetra Sentiment Architecture

This document outlines the architectural decisions for sentiment data collection in SachNetra V2, resolving the gap between user-triggered summaries and background data collection.

## The 17 V1 Architecture Clarifications

1. **Summaries are JIT:** Summaries are generated Just-In-Time on click, and Redis cached after first generation.
2. **"What Happened" & "What It Means":** Kept together on-demand in one JSON call. Not split.
3. **Caching:** Generated summaries are cached in Redis (Upstash). Same pattern already in V1.
4. **Priorities:** Syntheses win. Landing page comes last — Month 3 after real usage numbers.
5. **V2-001:** Data foundation (PostgreSQL `india_news_signals`) is the real V2-001.
6. **GoOut Hyd:** Removed entirely. Wrong project.
7. **Railway Account:** Free account required for deployment.
8. **Convex:** Installed but not wired up in V1. Deferred to V3. Use Redis for V2.
9. **Redis:** Upstash is already connected and working in V1.
10. **IndiaSignal (B2B):** This is V3. V2 builds the data collection foundation only (one table. Fire and forget).
11. **Database Schema:** One table only (`india_news_signals`). Simple schema. The 15-table schema is deferred to V3.
12. **FinBERT:** Start with keyword-based `is_market_moving` flag only. Layer FinBERT as a separate task after storage is proven working.
13. **WhatsApp Business API:** Deferred to Month 2. Start with zero users — don't build infrastructure before having users.
14. **RSS Feeds:** RSSHub government sources (PIB, RBI) are priority feeds. High signal, low noise.
15. **Feedback Buttons:** Frontend only for now. No database persistence yet. Just Redis increment.
16. **Server Digest:** Runs on a fixed 15-minute schedule. Do not change the cadence.
17. **Refresh Mechanism:** User opens app → gets whatever the last cached digest has. 15 minutes is acceptable.

## The No-Users Problem & The Two Tracks

**Current reality in V1:**
- Summaries only generate when users click.
- With very few users, most articles never get clicked and never get sentiment scored.
- Data collection depends on user behavior, meaning you are not in control of your own data pipeline.

To fix this, the intelligence pipeline must run independently of users via two separate triggers.

### TRIGGER 1 — User Clicks (Foreground Track)
- **When:** User taps a story card.
- **What:** Groq generates "What Happened" + "What It Means".
- **Where:** Stored in Redis cache.
- **Problem:** Zero users = zero sentiment data.

### TRIGGER 2 — Server Digest (Background Track - V2-001)
- **When:** Every 15 minutes automatically.
- **What:** FinBERT scores sentiment on market-moving articles.
- **Where:** Stored in PostgreSQL permanently.
- **Problem:** None. Runs whether anyone uses the app or not.

**The Background Track V2 (15 minutes, automatic):**
1. Fetches all RSS feeds
2. Clusters duplicate stories
3. Classifies categories
4. **[NEW]** For market-moving articles:
   - Score sentiment via FinBERT
   - Extract companies + sectors
   - INSERT into PostgreSQL permanently
5. Generates ONE global World Brief
6. Stores digest in Redis
7. App reads from this Redis cache

## The Missed Data Problem
Every article that passed through the digest in the last 30 days without being stored is permanently lost.
You cannot scrape the past. The data doesn't exist to recover.
However, every day without the PostgreSQL table is permanently lost data. The backtest run in October 2026 starts from whenever the switch is flipped. The only action available is starting storage immediately so you stop losing future data.

## Sentiment Data Options & Costs

| Option | Cost/month | Coverage | Quality |
|---|---|---|---|
| Groq (existing credits) | $0 | ~10% articles | Good |
| OpenRouter (free credits) | $0 | ~10% articles | Good |
| HuggingFace FinBERT | ~$3.60 | 100% articles | Best |
| Xenova (browser) | $0 | varies | Moderate |
| **Combined (Recommended)** | **~$3.60** | **100%** | **Best** |

### FinBERT on Railway Fallback Strategy
1. Try HuggingFace API (free tier: 30,000 chars/month).
2. If rate limited → use Railway-hosted Xenova/FinBERT (Railway free plan: 512MB RAM fits the 90MB model).
3. Zero cost after Railway is set up.

## The V2-001 Implementation

Scope for V2-001 Task:
1. PostgreSQL on Railway (`india_news_signals` table)
2. `server/intelligence-pipeline.ts` — new file
   - `checkMarketKeywords()` — keyword matching
   - `scoreWithFinBERT()` — HuggingFace API primary, Railway Xenova fallback
   - `extractCompanies()` — Nifty 50 keyword matching
   - `detectSectors()` — keyword rules
   - `persistSignal()` — INSERT to PostgreSQL
3. Modify `list-feed-digest.ts`
   - After `classifyByKeyword()` call `persistSignal()` async
   - Fire and forget, never blocks digest response

*(Note: Groq prompt modification, user-facing UI changes, and FinBERT on Railway are separate tasks to be done after V2-001 works.)*

## Linked Nodes
- [[sachnetra_quant_pivot]]
- [[sachnetra_schema_analysis]]
