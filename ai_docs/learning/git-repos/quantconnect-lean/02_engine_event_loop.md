# The Backtest Event Loop — `Engine/AlgorithmManager.cs`

> Verified by reading the source at clone `b27d79a0` (2026-06-04). Line numbers below are from that file. This is the single most important subsystem to understand.

## The loop is one `foreach`

```csharp
// AlgorithmManager.cs:171
foreach (var timeSlice in Stream(algorithm, synchronizer, results, token))
{
    ...
}
```

Everything a backtest does happens inside this loop, once per `TimeSlice`. A backtest of 17 years of minute data is just this loop spinning millions of times.

### What feeds the loop

- **`Stream(...)`** pulls `TimeSlice` objects from a **Synchronizer** (`Engine/DataFeeds/SubscriptionSynchronizer.cs`). The synchronizer's job: take *every* data subscription (each security, each resolution, custom data, universe data) and **merge them into one sequence sorted by timestamp**.
- The data itself comes from an **`IDataFeed`** — in backtest that is **`FileSystemDataFeed.cs`**, which reads Lean-format files **lazily** (an enumerator, not a full load). Future bars are not in memory until the stream reaches them.
- A **`TimeSlice`** = a snapshot of everything occurring at one instant: a `Slice` (the bars/ticks the algorithm sees), securities-update data, universe data, corporate-action events, consolidator updates.

This is the foundation of the look-ahead guarantee: **the only thing the algorithm can ever touch is the current slice. The future literally hasn't been read off disk.**

---

## The 10-step sequence per slice

All line numbers from `AlgorithmManager.cs`:

| # | Step | Code (line) | Effect |
|---|---|---|---|
| 1 | **Advance the clock** | `algorithm.SetDateTime(time)` (224) | Algorithm's "now" = this slice's time |
| 2 | **Update prices** | `security.Update(update.Data, ...)` loop (245-253) | Each security's price/cache is set from **this slice only**; `TradeBuilder.SetMarketPrice` updated |
| 3 | **Interest + settlement scans** | `MarginInterestRateModel` / `SettlementModel.Scan` (256-266) | Borrow interest; T+N unsettled-cash release (hourly) |
| 4 | **Fill resting orders** | `transactions.ProcessSynchronousEvents()` (319) | Limit/stop orders checked against just-updated prices |
| 5 | **Margin calls** | `MarginCallModel.GetMarginCallOrders` (345-395) | Force-liquidate if over-leveraged; `OnMarginCall(Warning)` callbacks |
| 6 | **Universe changes** | `OnSecuritiesChanged` (398-418) | Add/remove securities selected by universe models |
| 7 | **Corporate actions applied** | `HandleDividends` / `HandleSplits` (422-426) | Dividend cash credited; share count & price adjusted on splits |
| 8 | **Corp-action callbacks** | `OnSplits` / `OnDividends` / `OnDelistings` (488-523) | Optional user handlers |
| 9 | **▶ USER STRATEGY** | `algorithm.OnData(algorithm.CurrentSlice)` (558) | **Your code runs here** — reads prices, places orders |
| 10a | **Fill new orders** | `transactions.ProcessSynchronousEvents()` (574) | Market orders just placed get filled (see 04) |
| 10b | **Record results** | `results.ProcessSynchronousEvents()` (578) | Sample equity curve, holdings, prices for chart + stats |

Note the **two** `ProcessSynchronousEvents()` calls (steps 4 and 10a): once *before* user code (to settle resting orders against new data) and once *after* (to fill the market orders the user just submitted). Between them sits `OnData` — the only place strategy logic lives.

Other things woven in: consolidators are updated (432-450) so multi-bar aggregations complete deterministically; custom-data event handlers fire (460-483); `SymbolChangedEvents` cancel open orders on the old symbol (294-314); a midnight scheduled event samples the equity curve daily (163-167).

---

## Warm-up and time pulses

- **Warm-up**: before the real start date, the loop runs with `algorithm.IsWarmingUp == true` so indicators fill their look-back windows without trading. Logged at 170.
- **Time pulses**: some slices are pure clock-advances with no data (`timeSlice.IsTimePulse`, 227-230) — the loop `continue`s after setting the time, so scheduled events still fire when markets are closed.

---

## The 4 guardrails that make a backtest honest

### 1. No look-ahead — *structural*, not a convention
The stream is time-sorted (Synchronizer) and read lazily (`FileSystemDataFeed`). `OnData` only ever gets `CurrentSlice`. There is **no API** to fetch a future bar inside the loop. Leakage is impossible by construction — you cannot accidentally peek even if you try.

### 2. Realistic fills — `Common/Orders/Fills/EquityFillModel.cs`
A market buy does **not** fill at a magic price (`MarketFill`, line 124):
```csharp
case OrderDirection.Buy:
    fill.FillPrice = GetBestEffortAskPrice(asset, order.Time, ...) + slip;   // ask + slippage  (:144)
case OrderDirection.Sell:
    fill.FillPrice = GetBestEffortBidPrice(asset, order.Time, ...) - slip;   // bid - slippage  (:148)
```
…and only if `IsExchangeOpen(asset, false)` (:133). Data is timestamped at each **bar's end**, so acting at bar T's close fills at bar T's close — info you genuinely had. (Details in 04.)

### 3. Corporate actions applied — `factor_files` + `map_files`
Steps 7-8 credit dividends and adjust for splits every slice; the data layer applies `factor_files` so a 2009 bar compares correctly to a 2026 bar, and `map_files` track ticker renames. (Details in 03.)

### 4. Portfolio kept honest — margin, settlement, margin calls
Steps 3 and 5 model borrow interest, T+N settlement, and forced liquidation. A backtest can go bust (line 196: stops if `TotalPortfolioValue <= 0`), just like reality.

---

## Why this matters for SachNetra

Our event studies (`scripts/research/exp14-governance-shock-event-study.mjs`, `exp16-midcap-pead.mjs`) compute windows around an event **by hand in JS**. That means:
- The "don't read t+1 at t" rule is **manual** — one off-by-one slice and the result is silently leaked.
- I saw **no transaction-cost model** — returns are gross, which flatters any signal.

LEAN shows the two cheap things worth copying (not the C# engine): a **time-ordered iterator that structurally forbids future reads**, and a **mandatory cost+slippage deduction** on every simulated trade. That is the Tier-1 Pursue in [07_sachnetra_application.md](./07_sachnetra_application.md).
