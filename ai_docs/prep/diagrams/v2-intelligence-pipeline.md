# V2 Intelligence Pipeline — `seed-india-signals.mjs`

> Autonomous Railway cron. Capture → Enrich → Thread → Digest.
> Drawn from `scripts/seed-india-signals.mjs` + `scripts/_sentiment-chain.mjs` (2026-06-05).
> Fire-and-forget: wrapped in `runSeed`, always `exit 0` so a failed cron never blocks the next.

```mermaid
flowchart TD
    Cron["⏱ Railway cron (~10 min)\nrunSeed('india','signals')"]

    subgraph DRAIN["Pre-step: drain enrich queue"]
        Q["Upstash Redis\nnews:enrich-queue:v1\n(Type A user ✨ enrichments)"]
        QUPD["UPDATE india_news_signals\nsentiment_model='groq-v2'\n(LTRIM on success)"]
        Q -->|"LRANGE ≤10"| QUPD
    end

    subgraph FETCH["fetchAllFeeds()"]
        Feeds["getAllFeeds() — Indian RSS\nconcurrency 20 · 5 items/feed · 8s timeout"]
        Dedup["dedupeByNormalizedTitle()\ncollapse syndication reposts"]
        Cluster["clusterItems()\n→ clusters + clusterHash"]
        Feeds --> Dedup --> Cluster
    end

    subgraph T1["TIER 1 — capture (no LLM)"]
        Build["buildCaptureRow() per item\nclassifyByKeyword · extractCompanies\nextractSectors · detectEventType\nisMarketMoving · relevance_class"]
        Insert["persistSignals()\nINSERT … ON CONFLICT(headline_hash) DO NOTHING"]
        Build --> Insert
    end

    subgraph T2["TIER 2 — enrich (bounded)"]
        Cand["candidates = market-moving\n∧ ¬excluded-noise ∧ ¬already-enriched\nrank by scoreImportance · cap 60 · conc 8"]
        Sent["scoreWithFallbackChain()"]
        Groq["callGroqForCluster()\nllama-3.1-8b-instant\nprimary key → fallback on 429/5xx"]
        Upd["UPDATE primary row\nai_summary · ai_meaning · sentiment_*\n(WHERE ai_summary IS NULL)"]
        Cand --> Sent --> Upd
        Cand --> Groq --> Upd
    end

    subgraph CHAIN["Sentiment fallback chain"]
        L1["1 · HuggingFace FinBERT API"]
        L2["2 · Railway Xenova FinBERT (local)"]
        L3["3 · Groq llama-3.1-8b"]
        L4["4 · Redis DLQ\nnews:dlq:india_signals"]
        L1 -->|fail| L2 -->|fail| L3 -->|fail| L4
    end

    subgraph THREAD["Thread linking + entities"]
        Link["linkClusters() — link/spawn threads\nsweepThreadStatus · resummarizeGrown\nbuildThreadsDigest · fanOutEntities"]
    end

    subgraph OUT["Redis writes (runSeed extraKeys, TTL 30m)"]
        R1["news:signals:v1:india\n(canonical)"]
        R2["news:digest:v1:india:en\n(buildDigest → 4 buckets)"]
        R3["news:threads:v1:india:en"]
    end

    DB[("Railway PostgreSQL\nindia_news_signals")]

    Cron --> DRAIN --> FETCH
    Cluster --> Build
    Insert --> DB
    Cluster --> Cand
    Sent -.-> CHAIN
    Upd --> DB
    QUPD --> DB
    Cluster --> Link
    Link --> DB
    Cluster --> R2
    Link --> R3
    Insert --> R1
```

## Key invariants
- **Tier 1 is total** — every headline row is persisted immediately, idempotent on `headline_hash`. No LLM gate.
- **Tier 2 is bounded** — only market-moving, non-noise, not-yet-enriched clusters; ranked, capped at 60/run (`GROQ_CAP`).
- **Re-enrich predicate** — a cluster is "done" only once its primary row has `ai_summary`; otherwise it stays a candidate for ≤48h (`SKIP_WINDOW_HOURS`).
- **Zero data loss** — sentiment falls HF → Xenova → Groq → DLQ; pipeline never throws.
- **Groq is the only Railway LLM call site** (`callGroqForCluster`), key failover primary → `GROQ_API_KEY_2` on 429/5xx/network.
