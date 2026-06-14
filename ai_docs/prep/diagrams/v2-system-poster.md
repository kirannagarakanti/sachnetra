# SachNetra V2 — One-Page System Poster

> The whole collection engine on one canvas: every source → every cron → the database asset → consumers.
> Drawn from source 2026-06-05. Detail per pipeline: [`v2-india-pipelines.md`](./v2-india-pipelines.md) ·
> news internals: [`v2-intelligence-pipeline.md`](./v2-intelligence-pipeline.md).
>
> **Thesis (CLAUDE.md):** *SachNetra is the collection engine. The database is the asset. The quant system is the proof of value.*

```mermaid
flowchart LR
    %% ───────────── SOURCES ─────────────
    subgraph SRC["🌐 External sources"]
        direction TB
        RSS["Indian RSS feeds"]
        MC["Moneycontrol"]
        NSDL["NSDL FPI Monitor"]
        NSE["NSE India APIs\n(cookie warm-up)"]
        BIS["BIS SDMX"]
        RBI["RBI WSS XLSX"]
        GRID["Grid-India PSP .xls"]
        NPCI["NPCI/NETC JSON"]
        HF["HuggingFace FinBERT"]
        GROQ["Groq llama-3.1-8b"]
    end

    %% ───────────── SHARED SPINE ─────────────
    subgraph SPINE["⚙️ runSeed() — shared wrapper (lock · retry · graceful-fail · exit 0)"]
        direction TB
        Sig["seed-india-signals\n· 10 min"]
        Flo["seed-india-flows\n· daily 14:00Z"]
        Ann["seed-india-announcements\n· hourly"]
        Opt["seed-india-options\n· daily 10:30Z"]
        Dea["seed-india-deals\n· daily 13:00Z"]
        Mac["seed-india-macro\n· weekly"]
        Wss["seed-india-rbi-wss\n· weekly Fri"]
        Ele["seed-india-electricity\n· daily 05:30Z"]
        Fas["seed-india-fastag\n· daily 06:30Z"]
    end

    %% ───────────── DATABASE ASSET ─────────────
    subgraph DBA["🗄️ Railway PostgreSQL — the asset"]
        direction TB
        T1[("india_news_signals\n+ threads + entity_timeline")]
        T2[("india_institutional_flows\n+ india_flow_metrics")]
        T3[("india_bourse_announcements")]
        T4[("india_options_oi")]
        T5[("india_bulk_block_deals")]
        T6[("india_macro_rates + meta")]
        T7[("india_rbi_wss")]
        T8[("india_electricity_demand")]
        T9[("india_fastag_toll_volumes")]
    end

    %% ───────────── REDIS ─────────────
    subgraph RDS["⚡ Upstash Redis"]
        direction TB
        Dig["news:digest:v1:india:en\nnews:threads:v1:india:en"]
        Stat["news:*:v1:india\n(per-source STATUS keys)"]
    end

    %% ───────────── CONSUMERS ─────────────
    subgraph CONS["📊 Consumers — proof of value"]
        direction TB
        SPA["sachnetra.com SPA\n(India variant)"]
        Dash["sachnetra-dashboard\n(reads PG directly)"]
        Quant["Quant research lane\nresearch_prices · Exp1–16"]
    end

    %% source → cron
    RSS --> Sig
    MC --> Flo
    NSDL -. backfill .-> Flo
    NSE --> Ann & Opt & Dea
    BIS --> Mac
    RBI --> Wss
    GRID --> Ele
    NPCI --> Fas
    HF -. sentiment .-> Sig
    GROQ -. summary+sentiment .-> Sig

    %% cron → table
    Sig --> T1
    Flo --> T2
    Ann --> T3
    Opt --> T4
    Dea --> T5
    Mac --> T6
    Wss --> T7
    Ele --> T8
    Fas --> T9

    %% cron → redis
    Sig --> Dig
    Flo & Ann & Opt & Dea & Mac & Wss & Ele & Fas --> Stat

    %% downstream
    Dig --> SPA
    DBA --> Dash
    DBA --> Quant
    T1 --> SPA
```

## Reading the poster

- **Left → right = age of data lifecycle:** scrape → wrapped collector → durable store → display/research.
- **The spine is one function.** All 9 crons are thin `fetchFn`s inside `runSeed()`; only their source, table, and cadence differ. `signals` is the one that also hydrates live Redis digest/threads (the user-facing news); the other 8 write a **status key only** — their payload is the PostgreSQL rows.
- **Failure isolation:** every box in the spine is a **separate Railway cron**. One source breaking (NSE cookie wall, RBI not yet published, NPCI lag) fails that lane gracefully and never touches the others or the news pipeline.
- **The asset is the middle column.** Everything left of it is replaceable plumbing; everything right of it (SPA, dashboard, quant) is value extracted from the same store.

## The three jobs, in one sentence each
1. **Collection engine** (spine) — permanently record India market signals every run, independent of users.
2. **The asset** (PostgreSQL) — append-only, idempotent, revision-safe history nobody else is banking.
3. **Proof of value** (consumers) — the dashboard surfaces it; the quant lane (`research_prices`, Exp 1–16) proves a signal pays.
