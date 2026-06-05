# Data Layer & Point-in-Time Integrity — `Common/Data/Auxiliary/`

> **This is the highest-value subsystem for SachNetra.** It is the part we don't have, and it directly blocks an honest mid-cap PEAD backtest over 2009→now. Verified from source at clone `b27d79a0`.

## The problem LEAN solves

A backtest over many years hits two silent data bugs that flatter or corrupt results:

1. **Ticker reuse / renames.** A ticker is not a permanent identity. "FB" became "META"; in India a ticker can be reassigned or a company renamed/relisted. If you join "today's ticker" against an old date, you grab the **wrong company**.
2. **Splits & dividends.** A 1→10 split makes a ₹1000 share become 10 × ₹100. Un-adjusted, your strategy "sees" a 90% crash that never happened.

LEAN fixes both with two small, separate, date-keyed files per security.

---

## `map_files` — point-in-time ticker → entity

Source: `Common/Data/Auxiliary/MapFile.cs`, `MapFileRow.cs`.

A map file is a CSV of `{date, mapped symbol, primary exchange}` rows for one *permanent* security identity (the `Permtick`, e.g. `OIH.1`). From `MapFileRow.cs:24-47`:

```csharp
// Represents a single row in a map_file: {date, mapped symbol}
public DateTime Date { get; }
public string MappedSymbol { get; }
public Exchange PrimaryExchange { get; }
```

The lookup is the whole point — `MapFile.cs:106`:

```csharp
// returns the ticker this security traded under ON a given date
public string GetMappedSymbol(DateTime searchDate, string defaultReturnValue = "", ...)
```

The class also exposes `FirstDate`, `FirstTicker`, and `DelistingDate` (`MapFile.cs:42-54`) — so the engine knows when a security was born, what it was first called, and when it stopped trading. Iterating the rows gives the full rename history.

**Effect**: when the backtest asks for "AAPL on 1998-01-02", the map file resolves it to whatever ticker Apple actually used then, anchored to a stable internal identity (`SecurityIdentifier`). The ticker string is *display*; identity is permanent.

---

## `factor_files` — split/dividend adjustment, kept separate from raw price

Source: `Common/Data/Auxiliary/CorporateFactorProvider.cs` (a `FactorFile<CorporateFactorRow>`).

Raw prices are stored **unadjusted**. Adjustment is a *factor* looked up by date and normalization mode — `CorporateFactorProvider.cs:42`:

```csharp
public override decimal GetPriceFactor(DateTime searchDate, DataNormalizationMode dataNormalizationMode, ...)
{
    if (dataNormalizationMode == DataNormalizationMode.Raw) return 0;   // raw = no adjustment
    var factor = 1m;
    // walk factor rows backwards from most recent; pick SplitFactor or PriceScaleFactor
    //   SplitAdjusted / TotalReturn  → SplitFactor
    //   Adjusted / ScaledRaw         → PriceScaleFactor
    ...
}
```

`GetScalingFactors(date)` (`:81`) returns the combined `CorporateFactorRow(date, priceFactor, splitFactor, dividend)`. So the **same stored bar** can be served raw, split-adjusted, dividend-adjusted, or total-return — chosen per subscription via `DataNormalizationMode`.

**Why separate from price**: the raw price stays auditable forever; adjustments are reproducible and reversible; and total-return (dividends reinvested) is available for free. You never destructively overwrite history.

---

## The Lean data format (on disk)

Market data lives as zipped CSV under `Data/<securitytype>/<market>/<resolution>/<ticker>/<date>.zip`, with `map_files` and `factor_files` alongside per security. The format is point-in-time by design: the file you read for a date contains only what was knowable then, and the auxiliary files supply the identity + adjustment context.

`Engine/DataFeeds/FileSystemDataFeed.cs` reads these **lazily** through subscription enumerators — which is exactly why the event loop (02) cannot see the future.

---

## SachNetra gap analysis

| Capability | LEAN | SachNetra today | Evidence |
|---|---|---|---|
| Ticker→entity is date-versioned | `MapFile.GetMappedSymbol(date)` | **No** — `shared/nse-equity-master.json` is a current snapshot | `scripts/build-equity-master.mjs` builds from latest `EQUITY_L.csv`, deduped by `SYMBOL`; no effective dates, no rename history |
| Stable identity under rename | `SecurityIdentifier` / `Permtick` | No — ticker *is* the key | same |
| Split/div adjustment separate from raw | `factor_files` + `DataNormalizationMode` | **Unverified** in `research_prices` | not opened this session — verify before building |
| Delisting awareness | `MapFile.DelistingDate` | No | survivorship risk in any long backtest |

### Why this is a *latent* bug, not a today bug

For the **live** headline tagger, a current snapshot is correct — we tag today's news with today's tickers. The map-file gap only bites when we run a **historical** backtest that joins news/events to prices across years (mid-cap PEAD, `exp16`). Renamed/relisted mid-caps will mis-join or silently drop. So the fix is **gated on G4** (mid-cap prices) having a real consumer — see [07_sachnetra_application.md](./07_sachnetra_application.md), backlog #1.

### The India-flavoured version we'd build
A minimal "India map file": per security, rows of `{effective_date, nse_symbol, isin}` anchored on **ISIN** (the stable identity NSE/BSE share), sourced from NSE name-change / symbol-change circulars. Even a thin version (rename events only) removes the worst join errors. We do **not** need LEAN's full binary format — just the date-versioned identity idea.
