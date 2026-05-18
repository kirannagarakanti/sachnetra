# SachNetra V2 Architecture Analysis

## 1. Current State of the Pipeline

The architecture has been successfully updated to resolve the three primary issues that were previously degrading SachNetra V2:

### A. Data Retention (Resolved "Market-Moving" Filter)
`scripts/seed-india-signals.mjs` now retains 100% of scraped headlines. The destructive filter was replaced with an `is_market_moving` boolean flag. All data is successfully persisted to PostgreSQL (`india_news_signals`) without data loss, and only market-moving news is automatically forwarded to the enrichment queue.

### B. Client Performance (Resolved 25-Second Cold Start)
The Vercel Edge function (`api/digest`) no longer absorbs the cost of data ingestion. A background service (`scripts/seed-india-digest.mjs`) running on Railway pre-warms the India digest in the Redis cache every 8 minutes. The Vercel API now acts primarily as a fast read-layer, guaranteeing sub-second load times for the frontend.

### C. Entity-Aware Sentiment (Resolved Alpha Generation Failure)
The system now successfully extracts per-entity sentiment. The `drainEnrichQueue()` function in the signals cron automatically processes market-moving items using the Groq LLM. It populates the `companies`, `sentiment_label`, `sentiment_score`, and `event_type` columns in PostgreSQL, aligning with quantitative finance requirements.

---

## 2. Architecture Diagram (Current)

Based on the latest codebase, here is the functional architecture of the SachNetra intelligence pipeline.

```mermaid
graph TD
    %% Ingestion Layer (Railway Background Cron)
    RSS["RSS Feeds\n(64 Sources)"]
    DigestCron["seed-india-digest.mjs\n(Every 8m)"]
    SignalsCron["seed-india-signals.mjs\n(Background Cron)"]
    Redis["Upstash Redis\n(Hot Cache)"]
    Postgres[(PostgreSQL\nindia_news_signals)]
    EnrichQueue["Enrich-Queue\n(Redis List)"]
    
    %% Async Enrichment (The Alpha Engine)
    LLM["Groq / Llama 3.1\n(Async Worker)"]
    
    %% Client Path (Instant)
    Browser["Browser\n(Client SPA)"]
    Vercel["Vercel Edge\n(/api/news/v1/list-feed-digest)"]

    %% Flow: Digest Pre-warming
    DigestCron -->|"GET /api/news/v1/list-feed-digest"| Vercel
    Vercel -->|"Fetch if Cache Miss"| RSS
    RSS -->|"Raw Headlines"| Vercel
    Vercel -->|"Set Cached Digest"| Redis

    %% Flow: Signals Ingestion & Storage
    SignalsCron -->|"Read Digest Items"| Redis
    SignalsCron -->|"Keyword Classify"| SignalsCron
    SignalsCron -->|"INSERT ALL (is_market_moving flag)"| Postgres
    SignalsCron -->|"Push ONLY market-moving"| EnrichQueue

    %% Flow: Entity-Aware Sentiment
    SignalsCron -->|"Drain"| EnrichQueue
    EnrichQueue -->|"Analyze Entities & Sentiment"| LLM
    LLM -->|"UPDATE sentiment_label, score, companies"| Postgres
    
    %% Flow: Client Read
    Browser -->|"GET /api/news/v1/list-feed-digest"| Vercel
    Vercel -->|"Instant Read (Hot Cache)"| Redis
```

---

## 3. Best Practices Maintained

- **Decoupled Ingestion:** The client is isolated from RSS parsing and Groq enrichment delays.
- **100% Data Capture:** Future quant modeling has access to all headlines, not just the currently defined "market-moving" ones.
- **Entity Granularity:** Sentiment is tied directly to NSE tickers, supporting advanced alpha generation.
