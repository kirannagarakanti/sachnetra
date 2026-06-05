# QuantConnect / LEAN — Documentation Folder

**Repo**: https://github.com/QuantConnect/Lean
**Clone commit**: `b27d79a0` (2026-06-04) — read via shallow clone to `scratch/lean-src`, deleted after analysis
**License**: Apache-2.0
**Language**: C# (~94%) / Python (~5.6%, via pythonnet)
**Stars**: ~19.7k · ~13k commits · very active
**Documented**: 2026-06-05 (by Claude — read from source, not README)
**Rubric snapshot**: FEATURE_RUBRIC.md v1
**Parent summary**: [`../quantconnect-lean.md`](../quantconnect-lean.md)

---

## What This Folder Contains

Each file covers one subsystem in detail, grounded in the actual source files (paths are repo-relative to `github_url`; line numbers are from the `b27d79a0` clone). Read in order the first time; jump to a file for reference.

| File | What it covers |
|---|---|
| [01_architecture.md](./01_architecture.md) | Solution/project layout, the System-vs-Algorithm handler abstraction, how backtest and live share one engine, Launcher/config |
| [02_engine_event_loop.md](./02_engine_event_loop.md) | **The backtest loop** — `AlgorithmManager.Run`, the `TimeSlice` stream, Synchronizer + DataFeed, the 10-step per-slice sequence, the 4 look-ahead guardrails |
| [03_data_and_pit_integrity.md](./03_data_and_pit_integrity.md) | Lean data format, **`map_files`** (point-in-time ticker→entity), **`factor_files`** (split/dividend adjustment), `DataNormalizationMode` — the part SachNetra is missing |
| [04_orders_fills_costs.md](./04_orders_fills_costs.md) | Order types, `EquityFillModel`, slippage/fee/brokerage models, `BacktestingTransactionHandler` vs `BrokerageTransactionHandler` |
| [05_algorithm_framework.md](./05_algorithm_framework.md) | `Alpha → Insight → PortfolioConstruction → Risk → Execution → UniverseSelection` model separation |
| [06_sachnetra_comparison.md](./06_sachnetra_comparison.md) | Feature-by-feature: what to adopt (discipline) vs reject (the engine) |
| [07_sachnetra_application.md](./07_sachnetra_application.md) | Concrete port plan for the two Pursue items: no-look-ahead + cost helper, and an India "map file" |

---

## ELI12 (What This Repo Does)

LEAN is a **fair referee that replays stock-market history one frame at a time** to test whether a trading idea would have made money — without letting the idea cheat. On each frame it shows your strategy only what was visible *right then* (never tomorrow), lets it buy or sell, fills the order at a **realistic price with fees and slippage**, and quietly handles dividends, stock splits, and even tickers that changed which company they pointed to. Pros test on a laptop, then flip one switch and the *same code* trades live with a real broker. It's a big C# engine, so you plug into it — you don't copy it into a Node project.

It runs in two modes off **one engine**:
1. **Backtest** — data comes from files on disk, orders fill in a simulator.
2. **Live** — data comes from a broker feed, orders go to a real broker.
The strategy code and the event loop are identical; only the data source and the transaction handler swap.

---

## SachNetra Relevance Summary

| Pattern | Domain | Verdict | Priority |
|---|---|---|---|
| Structural no-look-ahead (time-sorted event stream) | research | **Pursue** | P1 — bake into `scripts/research/` shared helper |
| Mandatory transaction-cost + slippage in backtests | research | **Pursue** | P1 — no promote-to-signal without it |
| `map_files` — point-in-time ticker→entity history | data-engineering | **Pursue (after G4)** | P2 — fixes mid-cap PEAD join over 2009→now |
| `factor_files` — reproducible split/div adjustment | data-engineering | **Park** | verify `research_prices` first |
| Pluggable fill/slippage/fee model objects | research | Park | adopt concept, not the C# classes |
| Alpha→Portfolio→Risk→Execution framework | research | **Kill (for now)** | overkill for single-signal event studies |
| Port/host the LEAN engine in our stack | ops | **Kill** | C#/.NET vs Node/TS — huge cost, zero current need |
| Live broker execution layer | ops | **Park** | no execution lane under V2 positioning yet |

See [06_sachnetra_comparison.md](./06_sachnetra_comparison.md) for the full table and [07_sachnetra_application.md](./07_sachnetra_application.md) for implementation.

---

## Status

`documented` — not promoted to wiki. Candidate wiki concept if backlog #1 (India map file) graduates: **"point-in-time symbol identity"**. Promote only after one Pursue item is implemented.
