# SachNetra V2 — India Data Pipelines (end-to-end)

> Every live `seed-india-*` collector + its one-time backfill, drawn from source on 2026-06-05.
> Companion: [`v2-intelligence-pipeline.md`](./v2-intelligence-pipeline.md) (the news/signals pipeline, drawn in full).
>
> **One shared spine.** Every collector is a thin `fetchFn` wrapped by `runSeed()`
> (`scripts/_seed-utils.mjs`). The wrapper owns the distributed lock, retries,
> graceful-fail, Redis status key, freshness metadata, and the `exit 0` contract.
> The **data** itself lands in **Railway PostgreSQL** inside `fetchFn`; the Redis
> "canonical key" is a **STATUS key only** (except `signals`, which also hydrates
> the live digest/threads keys). Each is a **separate Railway cron** for failure isolation.

---

## 0 · The shared `runSeed()` lifecycle (every pipeline runs inside this)

```mermaid
flowchart TD
    Cron["⏱ Railway cron\nrunSeed(domain,resource,key,fetchFn)"]
    Lock{"acquire distributed lock\n(Redis, 120s TTL)"}
    Skip["another run in progress\n→ exit 0"]
    Fetch["Phase 1 · withRetry(fetchFn)\n↳ scrape source → upsert PostgreSQL"]
    FetchFail["release lock\nextend existing key TTL\nexit 0 (fail gracefully)"]
    Publish["Phase 2 · atomicPublish(canonicalKey)\nvalidateFn(data)"]
    Extra["writeExtraKey() for each extraKeys\n(signals only: digest + threads)"]
    Meta["writeFreshnessMetadata(domain,resource,count,sourceVersion)"]
    Verify["verifySeedKey() best-effort read-back"]
    Done["release lock · exit 0"]

    Cron --> Lock
    Lock -->|held| Skip
    Lock -->|acquired| Fetch
    Fetch -->|throws| FetchFail
    Fetch -->|ok| Publish
    Publish -->|validation empty| Meta
    Publish -->|ok| Extra --> Meta --> Verify --> Done

    DB[("Railway PostgreSQL")]
    Fetch -. upsert .-> DB
```

**Invariant:** the cron **always `exit 0`** — a failed fetch never blocks the next run, and never crashes the Railway service. Stale data is preserved by extending the existing key's TTL.

---

## 1 · System map — all live India collectors

```mermaid
flowchart LR
    subgraph SRC["External sources"]
        RSS["Indian RSS feeds"]
        MC["Moneycontrol\n__NEXT_DATA__"]
        NSDL["NSDL FPI Monitor\n(ASP.NET)"]
        NSE["NSE India APIs\n(cookie warm-up)"]
        BIS["BIS SDMX API"]
        RBI["RBI WSS XLSX"]
        GRID["Grid-India / POSOCO\nPSP .xls"]
        NPCI["NPCI / NETC\nFASTag JSON"]
    end

    subgraph CRON["Separate Railway crons (runSeed)"]
        Sig["seed-india-signals · 10 min"]
        Flo["seed-india-flows · daily 14:00Z"]
        Ann["seed-india-announcements · hourly"]
        Opt["seed-india-options · daily 10:30Z"]
        Dea["seed-india-deals · daily 13:00Z"]
        Mac["seed-india-macro · weekly"]
        Wss["seed-india-rbi-wss · weekly Fri"]
        Ele["seed-india-electricity · daily 05:30Z"]
        Fas["seed-india-fastag · daily 06:30Z"]
    end

    DB[("Railway PostgreSQL\nIndia tables")]

    RSS --> Sig
    MC --> Flo
    NSDL -.backfill.-> Flo
    NSE --> Ann
    NSE --> Opt
    NSE --> Dea
    BIS --> Mac
    RBI --> Wss
    GRID --> Ele
    NPCI --> Fas

    Sig --> DB
    Flo --> DB
    Ann --> DB
    Opt --> DB
    Dea --> DB
    Mac --> DB
    Wss --> DB
    Ele --> DB
    Fas --> DB
```

| Pipeline | Cadence | Source | Table | Idempotency |
|---|---|---|---|---|
| signals | 10 min | RSS | `india_news_signals` | `ON CONFLICT(headline_hash) DO NOTHING` |
| flows | daily ~14:00Z | Moneycontrol `__NEXT_DATA__` | `india_institutional_flows` (+ `india_flow_metrics`) | upsert, source-priority guard |
| announcements | hourly | NSE `/api/corporate-announcements` | `india_bourse_announcements` | upsert on `announcement_id` |
| options | daily ~10:30Z | NSE option-chain v3 | `india_options_oi` | upsert on `(date,symbol,expiry)` |
| deals | daily ~13:00Z | NSE bulk/block CSV | `india_bulk_block_deals` | upsert |
| macro | weekly | BIS SDMX | `india_macro_rates` + `…_series_meta` | upsert on `(series,period)` |
| rbi-wss | weekly Fri | RBI WSS XLSX | `india_rbi_wss` | upsert on `release_date` |
| electricity | daily ~05:30Z | Grid-India PSP `.xls` | `india_electricity_demand` | `ON CONFLICT DO NOTHING` |
| fastag | daily ~06:30Z | NPCI/NETC JSON | `india_fastag_toll_volumes` | upsert |

> `seed-india-digest.mjs` is **RETIRED** (V2-012) — `seed-india-signals` now hydrates the digest key directly. Not shown.

---

## 2 · FII/DII flows — `seed-india-flows` (+ NSDL backfill)

```mermaid
flowchart TD
    Cron["⏱ daily ~14:00Z (post-close)"]
    Fetch["fetchMoneycontrol()\nGET moneycontrol.com → parse __NEXT_DATA__\nprops.pageProps.FiiDiiData.fiiDiiData[]"]
    NoData{"array empty?\n(NoFlowDataError)"}
    Skip["holiday / pre-publish\n→ written:0, exit 0"]
    Map["mapRow(): 1 row → FII + DII\n(cash segment)"]
    MaxDate["SELECT MAX(flow_date)\nkeep only rows > maxDate"]
    Upsert["UPSERT india_institutional_flows\nsource='moneycontrol'\n(guard: nsdl rows not overwritten)"]
    Mat["materializeFlowMetrics()\nINSERT … india_flow_metrics\nFROM india_flow_absorption_v1"]
    DB[("india_institutional_flows\n+ india_flow_metrics")]

    Cron --> Fetch --> NoData
    NoData -->|yes| Skip
    NoData -->|no| Map --> MaxDate --> Upsert --> DB
    Upsert --> Mat --> DB

    subgraph BF["One-time backfills (Lijo runs once, idempotent)"]
        BNsdl["backfill-nsdl-fpi-history\nNSDL FPI Monitor, month-end walk\nJan 1999→today · 1.5s pacing\nre-handshake/50 · source='nsdl' (FALSE provisional)"]
        BMc["backfill-india-flows\nMoneycontrol recent-window walk"]
    end
    BNsdl -->|"source='nsdl' supersedes moneycontrol"| DB
    BMc --> DB
```

**Key points:** `net` falls back to `buy − sell` when absent. `source` priority — `nsdl` (authoritative, non-provisional) overwrites `moneycontrol`; the upsert `WHERE` guard enforces it so the backfill can run anytime. Metrics (`absorption_ratio`, MTD nets) are materialized from a view on every run.

---

## 3 · NSE bourse announcements — `seed-india-announcements` (+ backfill)

```mermaid
flowchart TD
    Cron["⏱ hourly (captures filings within ~1h)"]
    Warm["warmUpNSE()\nGET nseindia.com → collect Set-Cookie\n(nsit, nseappid, …)"]
    Window["2-day IST window\nyesterday → today (DD-MM-YYYY)"]
    Fetch["fetchNSEAnnouncements({from,to,cookie})\nGET /api/corporate-announcements?index=equities\n+ Referer + Cookie"]
    Wall{"HTTP 401/403?\n(cookie wall)"}
    Rewarm["re-warm cookie once\n+ retry"]
    Map["mapRow(): seq_id→id, sort_date→IST ts\nsymbol, company, isin, category, attachment_url"]
    Empty{"rows empty?"}
    Skip["weekend/holiday/none\n→ written:0, exit 0"]
    Upsert["upsertAnnouncements()\nbatched · idempotent on announcement_id"]
    DB[("india_bourse_announcements")]

    Cron --> Warm --> Window --> Fetch --> Wall
    Wall -->|yes| Rewarm --> Map
    Wall -->|no| Map
    Fetch --> Empty
    Empty -->|yes| Skip
    Empty -->|no| Map --> Upsert --> DB

    BF["backfill-india-announcements\nsame warm-up + windowed walk\n(append-only, 17,322 rows backfilled)"] --> DB
```

**Why hourly:** the alpha is "filings lead news by hours" — a once-daily run throws away the lead time. Append-only upsert makes the overlapping 2-day window free.

---

## 4 · NSE options OI (EOD) — `seed-india-options`

```mermaid
flowchart TD
    Cron["⏱ daily ~10:30Z / 16:00 IST (post-close)\nNo backfill — live-only source"]
    Warm["warmUpNSE() → cookie"]
    Loop["for symbol in NIFTY, BANKNIFTY, FINNIFTY"]
    Info["fetchContractInfo(symbol)\n→ expiryDates (take nearest 3)"]
    Chain["fetchOptionChainV3({symbol,expiry,cookie})\n(1.1s pacing between calls)"]
    Rewarm["on 401/403 → re-warm cookie once + retry"]
    Agg["computeAggregates(chain)\ntotal CE/PE OI · PCR · max_pain\nATM strike · ATM CE/PE IV"]
    Stale{"snapshot_date < today?"}
    SkipStale["market closed today\n→ written:0, exit 0"]
    Upsert["UPSERT india_options_oi\non (snapshot_date,symbol,expiry_date)"]
    DB[("india_options_oi")]

    Cron --> Warm --> Loop --> Info --> Chain
    Chain -.401/403.-> Rewarm --> Agg
    Chain --> Agg --> Stale
    Stale -->|yes| SkipStale
    Stale -->|no| Upsert --> DB
    Upsert --> Loop
```

**Captures:** 3 indices × 3 expiries = up to 9 rows/day (front weekly + next + monthly = term structure). Idempotent — same-day re-run refreshes, never duplicates.

---

## 5 · NSE bulk & block deals — `seed-india-deals`

```mermaid
flowchart TD
    Cron["⏱ daily ~13:00Z / 18:30 IST (post-close)"]
    Warm["warmUpNSE() → cookie"]
    Window["2-day IST window (DD-MM-YYYY)"]
    Loop["for type in bulk_deals, block_deals"]
    Fetch["fetchDeals({dealType,from,to,cookie})\n→ CSV text"]
    Retry{"401/403 or TimeoutError?"}
    Rewarm["re-warm cookie once + retry"]
    Parse["parseDealsCsv(csv, label)"]
    Upsert["upsertDeals() · idempotent"]
    DB[("india_bulk_block_deals")]

    Cron --> Warm --> Window --> Loop --> Fetch --> Retry
    Retry -->|yes| Rewarm --> Parse
    Retry -->|no| Parse --> Upsert --> DB
    Upsert --> Loop
```

**Note:** NSE's bot wall sometimes *hangs* instead of returning 401/403 — `TimeoutError` is treated as a cookie wall and triggers one re-warm + retry.

---

## 6 · BIS India macro rates — `seed-india-macro` (+ backfill)

```mermaid
flowchart TD
    Cron["⏱ weekly"]
    Start["startPeriod = currentYear − 3\n(rolling 3yr revision window)"]
    Fetch["fetchAllSeries({startPeriod})\nBIS SDMX API · all SERIES[]"]
    Guard{"okCount == 0?"}
    Fail["throw → runSeed graceful-fail"]
    Facts["FACT_UPSERT india_macro_rates\non (series_code, time_period)"]
    MetaT["META_UPSERT india_macro_series_meta\nlabel/unit/frequency/revises per series"]
    DB[("india_macro_rates\n+ india_macro_series_meta")]

    Cron --> Start --> Fetch --> Guard
    Guard -->|yes| Fail
    Guard -->|no| Facts --> MetaT --> DB

    BF["backfill-india-macro\nsame SDMX fetch, wider startPeriod"] --> DB
```

**Revision-safe:** re-fetches the trailing 3 years every week and upserts, so BIS's late revisions overwrite cleanly.

---

## 7 · RBI Weekly Statistical Supplement — `seed-india-rbi-wss` (+ backfill)

```mermaid
flowchart TD
    Cron["⏱ weekly Fri ~12:30Z / 18:00 IST"]
    Friday["latestFridayIST() → release_date"]
    Resolve["resolveLatestRelease(friday)\nscrape RBI detail page → XLSX url"]
    NoRel{"url null?"}
    Skip["not yet published / holiday\n→ written:0, exit 0"]
    Download["downloadWorkbook(url) → buffer"]
    Parse["parseWss(buffer) — label-guarded\nbank_credit, deposits, CiC, reserve_money,\nM3, forex (INR cr + USD mn) + as-on dates"]
    Upsert["UPSERT india_rbi_wss\non release_date (DO UPDATE — RBI revises)"]
    DB[("india_rbi_wss")]

    Cron --> Friday --> Resolve --> NoRel
    NoRel -->|yes| Skip
    NoRel -->|no| Download --> Parse --> Upsert --> DB

    BF["backfill-india-rbi-wss\nwalk past Fridays → resolve/parse/upsert"] --> DB
```

---

## 8 · POSOCO / Grid-India electricity — `seed-india-electricity`

```mermaid
flowchart TD
    Cron["⏱ daily ~05:30Z / 11:00 IST\n(report for yesterday publishes 09:30–10:30 IST)"]
    Target["target_date = today_IST − 1 day"]
    List["listFilesForMonth({fiscalYear,month})"]
    Pick["pickXlsForDate() — latest revision\nfor target_date"]
    NoFile{"no XLS yet?"}
    Skip["publish delay / holiday\n→ written:0, exit 0"]
    Download["downloadXls(FilePath) → bytes"]
    ParseP["parseDailyPsp(buf)\nSection A (6 region/national rows)\nSection C (36–39 state rows)"]
    XCheck["cross-check filename date\nvs in-file target_date (warn-only)"]
    Upsert["upsertElectricity() · ON CONFLICT DO NOTHING"]
    DB[("india_electricity_demand")]

    Cron --> Target --> List --> Pick --> NoFile
    NoFile -->|yes| Skip
    NoFile -->|no| Download --> ParseP --> XCheck --> Upsert --> DB
```

---

## 9 · NPCI / NETC FASTag toll volumes — `seed-india-fastag`

```mermaid
flowchart TD
    Cron["⏱ daily ~06:30Z / 12:00 IST\n(NPCI data lags 3–4 days; timing flexible)\nNo warm-up, no cookie"]
    Today["today_IST → year, month, fiscal-year range"]
    FetchD["fetchDailyMonth({year,monthName})\n→ daily JSON"]
    FetchM["fetchMonthly(fyRange)\n→ monthly JSON"]
    ParseD["parseDailyPayload()"]
    ParseM["parseMonthlyPayload()"]
    EmptyQ{"both empty?"}
    Skip["→ written:0, exit 0"]
    Sanity{"sanityCheckMonthly()\nunit-conversion ok?"}
    SkipS["→ written:0, skipped:'sanity-fail'"]
    Upsert["upsertFastag(daily ++ monthly) · idempotent"]
    DB[("india_fastag_toll_volumes")]

    Cron --> Today --> FetchD --> ParseD --> EmptyQ
    Today --> FetchM --> ParseM --> EmptyQ
    EmptyQ -->|yes| Skip
    EmptyQ -->|no| Sanity
    Sanity -->|no| SkipS
    Sanity -->|yes| Upsert --> DB
```

**Guard:** a monthly unit-conversion sanity check runs *before* touching the DB, so a unit drift writes nothing rather than poisoning the series.

---

## Cross-cutting patterns (true for every collector)

1. **Thin `fetchFn`, fat wrapper** — all lock/retry/TTL/freshness logic lives once in `runSeed()`.
2. **Data → PostgreSQL, Redis key → status only** (except `signals`).
3. **Idempotent upserts** keyed on a natural business key — re-runs and overlapping windows are free.
4. **Holiday/pre-publish = clean no-op** (`written:0`, `exit 0`), never an error.
5. **NSE family shares the cookie warm-up** + 401/403 re-warm-once retry (announcements, options, deals).
6. **Separate cron per source** — one source breaking never touches the others or the news pipeline.
7. **Backfills mirror the live fetch**, just walk a historical window; safe to re-run; Lijo runs them once against prod after review.
