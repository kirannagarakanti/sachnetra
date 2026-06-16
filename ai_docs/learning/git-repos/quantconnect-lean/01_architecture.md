# Architecture — QuantConnect / LEAN

## Solution Structure (top-level projects)

```
Lean/
├── Launcher/                  # entry point — reads config.json, wires handlers, starts Engine
├── Engine/                    # the heart: the run loop + all the swappable handlers
│   ├── AlgorithmManager.cs    #   THE event loop (see 02_engine_event_loop.md)
│   ├── Engine.cs              #   top-level orchestrator (Run)
│   ├── Setup/                 #   BacktestingSetupHandler vs BrokerageSetupHandler
│   ├── DataFeeds/             #   FileSystemDataFeed (backtest) / LiveTradingDataFeed; Synchronizer
│   ├── TransactionHandlers/   #   BacktestingTransactionHandler vs BrokerageTransactionHandler
│   ├── Results/               #   BacktestingResultHandler vs LiveTradingResultHandler
│   ├── RealTime/              #   scheduled-event handler
│   └── HistoricalData/        #   history request provider
├── Common/                    # shared domain model (no engine deps)
│   ├── Data/                  #   Slice, BaseData, Auxiliary/ (map_files, factor_files)
│   ├── Orders/                #   order types, Fills/, Fees/, Slippage/
│   ├── Securities/            #   Security, Cash, Portfolio, margin/settlement models
│   └── Symbol / SecurityIdentifier
├── Algorithm/                 # QCAlgorithm base class + framework interfaces (IAlphaModel, ...)
├── Algorithm.Framework/       # concrete framework models: Alphas/ Portfolio/ Risk/ Execution/ Selection/
├── Algorithm.CSharp/          # ~hundreds of example + regression algorithms (C#)
├── Algorithm.Python/          # same in Python
├── Indicators/                # technical indicators (warm-up aware)
├── Brokerages/                # broker connectors (paper + live); BrokerageModel rules
├── Data/                      # sample market data + the Lean data format on disk
├── ToolBox/                   # data downloaders/converters into Lean format
├── Optimizer/                 # parameter optimization
├── Report/                    # backtest report generation
├── Research/                  # Jupyter/QuantBook research environment
└── Tests/                     # large test suite incl. regression-algorithm harness
```

**Stack**: C# / .NET. Python algorithms run through **pythonnet** (the Python `QCAlgorithm` calls into the same C# engine). Config-driven via `Launcher/config.json`.

---

## The Core Idea: Handlers Are Swappable

LEAN's whole design is **one engine + a set of interfaces**, where backtest and live just plug in different implementations of the same interfaces. This is why "it worked in backtest" is meaningful — the *strategy* and the *loop* never change.

| Interface | Backtest implementation | Live implementation |
|---|---|---|
| `ISetupHandler` | `BacktestingSetupHandler` | `BrokerageSetupHandler` |
| `IDataFeed` | `FileSystemDataFeed` (reads files) | `LiveTradingDataFeed` (broker stream) |
| `ITransactionHandler` | `BacktestingTransactionHandler` (simulated fills) | `BrokerageTransactionHandler` (real orders) |
| `IResultHandler` | `BacktestingResultHandler` | `LiveTradingResultHandler` |
| `IRealTimeHandler` | scans past scheduled events | fires on wall clock |

`Engine.cs` reads which set to use from config, builds the `AlgorithmManager`, and calls `Run`. The algorithm author writes the *same* `QCAlgorithm` subclass either way.

> **SachNetra read**: this is the "same code path, backtest == live" principle. We have no live lane yet (V2 positioning: be our own first customer first), so this is *Park*, not something to build today. But the interface-swap discipline is worth remembering when we eventually paper-trade a proven signal.

---

## Two Handler Families (System vs Algorithm)

`Engine/LeanEngineSystemHandlers.cs` and `Engine/LeanEngineAlgorithmHandlers.cs` group the handlers:
- **System handlers** — infrastructure that exists before any algorithm loads (job queue, API, messaging, leanManager).
- **Algorithm handlers** — the per-run pieces above (data feed, transactions, results, setup, realtime).

The split lets QuantConnect run the *same* engine as a single laptop process **or** as a distributed cloud node, by swapping system handlers (e.g. a real queue vs a console queue) without touching algorithm logic.

---

## Backtest vs Live — What Actually Differs

| Concern | Backtest | Live |
|---|---|---|
| Time source | data-driven (advances to next data point) | wall-clock (`DateTime.UtcNow`) |
| Data | Lean files on disk, read lazily | broker websocket / data provider |
| Fills | simulated by fill/slippage/fee models | real broker fill events |
| Speed | as fast as the CPU can churn slices | real time |
| Look-ahead risk | prevented structurally (02) | N/A (future doesn't exist yet) |

The single most important consequence: **a backtest is just the live loop fed from files with a simulated broker.** Everything in `02_engine_event_loop.md` is that loop.

---

## SachNetra mapping

| LEAN concept | SachNetra analog | Note |
|---|---|---|
| `Launcher` + `config.json` | `scripts/seed-*.mjs` invoked by Railway cron | we are seed-script driven, not a single configurable engine |
| Handler interfaces (swap backtest/live) | none | we have no execution engine; research and prod are separate code |
| `Common/Data/Auxiliary` map/factor files | `shared/nse-equity-master.json` (snapshot only) | **the gap** — see 03 |
| `Algorithm.Framework` models | `scripts/research/exp*.mjs` (bespoke per experiment) | we don't need the framework; our scripts are lighter |
