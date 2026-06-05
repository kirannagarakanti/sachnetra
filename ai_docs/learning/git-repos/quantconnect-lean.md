---
github_url: https://github.com/quantconnect/lean
owner: quantconnect
repo: lean
license: Apache-2.0
language: C# (94%) / Python (5.6%)
last_commit: 2026 (active — ~13,194 commits on master)
stars: ~19.7k
audience: professional
tags: [algorithmic-trading, backtesting, quant, quantitative-finance, data-engineering]
domains: [research, data-engineering, tagging]
date_added: 2026-06-05
last_reviewed: 2026-06-05
status: documented
reviewed_by: claude
evidence_checked: [build-equity-master.mjs, shared/nse-equity-master.json, project_pead_midcap_finding, project_g1_post_deploy_state, "lean: Engine/AlgorithmManager.cs (cloned+read 2026-06-05)", "lean: Common/Orders/Fills/EquityFillModel.cs"]
---

# QuantConnect LEAN — event-driven, professional-grade algorithmic trading + backtest engine

> **Why Lijo added this**: LEAN is the reference standard for backtest fidelity (no look-ahead, survivorship-free data, cost/fill models). The question it answers: *what does a rigorous research harness owe us that `scripts/research/` doesn't have yet — and which parts are worth copying vs. which are a stack trap?*

> 📂 **Deep-dive folder**: [`quantconnect-lean/`](./quantconnect-lean/) — per-subsystem notes grounded in the cloned source (engine event loop, point-in-time data layer, fills/costs, framework, + SachNetra comparison & application plan). Start with its [README](./quantconnect-lean/README.md).

---

## TL;DR (3 bullets)

- LEAN is QuantConnect's open-source, event-driven backtesting + live-trading engine (C# core, Python via pythonnet), the engine behind QuantConnect's cloud. 19.7k stars, Apache-2.0, very actively maintained.
- **Strongest best practice (domain: data-engineering)**: point-in-time symbol integrity — `map_files` (ticker→entity history across renames/relistings) and `factor_files` (split/dividend adjustment) keep a backtest joining on the *right* security on the *right* date. This is the single most transferable idea for SachNetra.
- **Biggest caveat**: it is a heavy C#/.NET framework built to *run* strategies and execution, not an analytics library. Adopting the engine is a stack mismatch and a non-goal under V2 positioning (we're not building a trading platform). Copy the *discipline*, not the framework.

---

## ELI12 — what is this repo?

Imagine you have a trading idea and want to know if it would have made money — honestly, not by cheating. LEAN is the referee. You hand it your strategy and years of market history, and it replays the past one event at a time, only ever letting your strategy see what it could actually have known on that day (no peeking at the future). It also knows that "INFY" might have been a different company's ticker ten years ago, that a stock split makes old prices look ten times bigger, and that buying isn't free (fees, slippage). Pros use it to test on a laptop, then flip a switch to trade live with a real broker. It's big and written mostly in C#, so it's an engine you plug into, not a small script.

---

## Architecture snapshot

```
lean/
├── Engine/               — core event loop: data feed → algorithm → orders → results
├── Algorithm.Framework/  — modular strategy: Alpha → PortfolioConstruction → Risk → Execution models
├── Algorithm.CSharp/     — C# example strategies
├── Algorithm.Python/     — Python example strategies (pythonnet bridge)
├── Data/                 — Lean data format; map_files (ticker history), factor_files (splits/divs)
├── Brokerages/           — live broker connectors (same algo code backtest ↔ live)
├── Indicators/           — built-in technical indicators (warm-up aware)
├── Common/               — Symbol, Security, time/timezone, fill/slippage/fee models
├── ToolBox/              — data converters / downloaders into Lean format
└── Launcher/             — entry point; config-driven backtest vs live
```

**Stack**: C# / .NET (94%), Python via pythonnet (5.6%). Config-driven (`config.json`). Local CLI or QuantConnect cloud.

**Entry points to read first**: `Engine/` (the event-driven loop), `Algorithm.Framework/` (Alpha/Portfolio/Risk/Execution separation), and `Data/` map/factor file handling — that last one is the part SachNetra should study.

---

## Evidence cross-check (required — before rating SachNetra)

> Do not rate SachNetra "today" from repo README alone. Loaded code/memory below; items I could not open this session are marked **unverified — needs Lijo** and capped at **Good**.

| Claim about SachNetra | Evidence source | Measured value | Gate / target | Pass? |
|---|---|---|---|---|
| Equity master is a current snapshot, no point-in-time ticker history | `scripts/build-equity-master.mjs` (read), `shared/nse-equity-master.json` | Built from latest `EQUITY_L.csv`, deduped by SYMBOL; no rename/relist history, no effective-date | (no formal gate) — LEAN `map_files` analog | N — gap confirmed |
| Mid-cap PEAD parked on price data (G4) | `project_pead_midcap_finding` (memory) | PEAD real but long-only; gated on G4 midcap prices | G4 backfill done | N — G4 deliverable written, not run |
| G1 tagging precision below G4 target | `project_g1_post_deploy_state` (memory) | 031b hardening live; residual FPs patched (URBANCO/NAVA) | ≥90% precision (G4) | partial — unverified this session |
| Research harness has cost/slippage/fill models | `scripts/research/exp16-midcap-pead.mjs:32,67,284` (read 2026-06-05) | exp16 nets 100/250bps round-trip, accepts only @250bps; signal T0→entry T+1, adj_close | costs in any promote-to-signal backtest | **Y — Better** (CORRECTION: earlier "no cost model" was wrong) |

**Active tasks / context cross-checked**: `build-equity-master.mjs` (G1 ticker resolution), memory `project_pead_midcap_finding`, `project_g1_post_deploy_state`, `project_strategy_reset`.

**If this note contradicts prod data**: append to Corrections log — do not silently re-tier.

---

## Domain map

| Domain | What it covers in SachNetra | This repo relevant? |
|---|---|---|
| **Tagging (G1)** | Headline → NSE ticker via `nse-equity-master.json`, `_india-market-keywords.mjs` | **partial** — LEAN's `map_files` = the point-in-time *symbol* layer we lack; but LEAN resolves by exchange code, not by parsing free-text headlines |
| **Sentiment (G6)** | FinBERT/LLM scoring via `_sentiment-chain.mjs` | **N** — LEAN has no NLP/sentiment |
| **Research** | Backtests/event studies in `scripts/research/` | **Y** — gold-standard backtest discipline (no look-ahead, costs, survivorship-free) |
| **Data engineering** | Collectors, schema, `seed-*.mjs`, `research_prices` | **Y** — `factor_files` (corp-actions adjustment) + Lean data format are directly instructive |
| **Product / UX** | Panels, alerts | **N** |

---

## Best practices extracted

> Each row cites repo file/area. Generic advice without a location is not allowed.

| # | Practice | Domain | Repo location | Why it matters |
|---|---|---|---|---|
| 1 | Point-in-time symbol mapping (ticker history across renames/relists) | data-engineering / tagging | `Data/` `map_files` + `Common/Symbol` | A backtest over 2009→now must join on the security that ticker *was* on that date — not today's holder of the ticker. |
| 2 | Separate corporate-action adjustment from raw price | data-engineering | `Data/` `factor_files` | Splits/dividends are applied as factors at read time, so raw stored prices stay auditable and adjustments are reproducible. |
| 3 | Event-driven loop with strict information barrier | research | `Engine/` | Data is delivered as time-ordered events; the algorithm physically cannot see future bars → no look-ahead leakage by construction. |
| 4 | Explicit fill / slippage / fee models | research | `Common/` order/fill models | A backtest without transaction costs is a fantasy; LEAN forces a cost model in the fill path. |
| 5 | Alpha → Portfolio → Risk → Execution model separation | research | `Algorithm.Framework/` | Signal generation is decoupled from sizing, risk caps, and order routing — each swappable and testable in isolation. |
| 6 | Same algorithm code path for backtest and live | research / ops | `Brokerages/` + `Launcher/` | One code path means the thing you validated is the thing you run — no "it worked in the notebook" drift. |

### Deep dives

- **`map_files` / `factor_files` (domain: data-engineering).** LEAN stores, per security, the history of which ticker pointed at which entity over time, plus a separate factor series for splits/dividends. SachNetra's `build-equity-master.mjs` builds only a *current* snapshot (deduped by `SYMBOL`). For a one-shot live tagger that's fine; for a **PEAD backtest over 2009→now it is a latent join bug** — renamed/relisted mid-caps will mis-map. This is the highest-value lesson in the repo for us.
- **Event-driven information barrier (domain: research).** Our event studies (`exp14`, `exp16`) compute windows around an event in pandas/JS; the leakage guard is *manual*. LEAN makes it structural. We don't need LEAN, but our research harness should bake the same "cannot read t+1 at t" guarantee into shared helpers.

### Deep dive — how LEAN actually runs a backtest (verified from cloned source 2026-06-05)

> Read directly from the engine code, not the README. Paths are repo-relative to `github_url`. Clone was deleted after analysis (scratch is ephemeral), so line numbers reflect the 2026-06-05 master.

The whole backtest is **one time-ordered loop** in `Engine/AlgorithmManager.cs`. The master loop is a single `foreach` over a synchronized data stream (`AlgorithmManager.cs:171`):

```csharp
foreach (var timeSlice in Stream(algorithm, synchronizer, results, token))
```

A **`TimeSlice`** is a snapshot of everything that happened at one instant. The synchronizer (`Engine/DataFeeds/SubscriptionSynchronizer.cs`) merges every data subscription into one sequence sorted by timestamp; the feed (`Engine/DataFeeds/FileSystemDataFeed.cs`) reads Lean-format files **lazily**, so future bars literally aren't in memory yet.

**Order of operations per slice** (all in `AlgorithmManager.cs`):

| # | Step | Line | Effect |
|---|---|---|---|
| 1 | `algorithm.SetDateTime(time)` | :224 | Advance the algorithm clock to this slice |
| 2 | `security.Update(...)` over `SecuritiesUpdateData` | :245-253 | Set each security's price from **this slice only** |
| 3 | margin-interest + settlement scans | :256-266 | T+N cash settlement, borrow interest |
| 4 | `transactions.ProcessSynchronousEvents()` | :319 | Fill resting (limit/stop) orders vs updated price |
| 5 | margin calls | :345-395 | Force-liquidate if over-leveraged |
| 6 | `HandleDividends` / `HandleSplits` | :422-426 | Credit dividend cash; adjust share count/price on splits |
| 7 | `OnSplits/OnDividends/OnDelistings` | :488-523 | User corporate-action callbacks |
| 8 | **`algorithm.OnData(slice)`** | :558 | **User strategy runs — reads prices, places orders** |
| 9 | `transactions.ProcessSynchronousEvents()` | :574 | Fill the market orders the user just placed |
| 10 | `results.ProcessSynchronousEvents()` | :578 | Sample equity/holdings for chart + statistics |

**Four guardrails that make it honest:**
1. **No look-ahead (structural).** `OnData` only ever receives `CurrentSlice`; the stream is time-sorted and read lazily — there is no API to fetch a future bar. Leakage is impossible by construction, not by reviewer discipline.
2. **Realistic fills.** `Common/Orders/Fills/EquityFillModel.cs:124` (`MarketFill`): a buy fills at **ask + slippage** (`:144`), a sell at **bid − slippage** (`:148`), and only if `IsExchangeOpen` (`:133`). Slippage + fee + brokerage models are pluggable objects.
3. **Corporate actions applied, not ignored.** Dividends/splits handled every slice (step 6); raw prices stored, `factor_files` applied at read-time → a 2009 bar compares correctly to a 2026 bar.
4. **Backtest == live code path.** Same loop and strategy; only the data source + transaction handler swap (`BacktestingTransactionHandler` ↔ `BrokerageTransactionHandler` in `Engine/TransactionHandlers/`). What you validate is what you run.

**SachNetra read**: guardrails (1) and (2) are exactly what `scripts/research/` lacks — our exp14/exp16 enforce the no-future-read window *manually* and show no transaction-cost model. That is the Tier-1 Pursue (backlog #2). The C# engine itself stays Kill (stack mismatch); copy the two guarantees as a small shared JS helper.

---

## Design principles — reinforced or contradicted

> SachNetra's locked design: deterministic extraction in code; LLM only for synthesis/scoring (V2-031 D2: no NER in cron hot path).

| Principle | Repo stance | SachNetra stance | Verdict |
|---|---|---|---|
| Deterministic security resolution (dict/registry, not guess) | `map_files` resolve symbols by registry + date — fully deterministic | `build-equity-master.mjs` + word-boundary regex | **Reinforces** |
| Add the *time dimension* to identity | Ticker↔entity is a function of date | `nse-equity-master.json` is timeless (current snapshot) | **Contradicts (gap)** — we lack the date axis |
| Costs/leakage are non-optional in backtests | Engine forces fill model + event barrier | event studies exist; cost model not evident | **Reinforces a gap** — make costs mandatory |
| LLM for synthesis only, not math/identity | LEAN has no LLM; pure deterministic | `_sentiment-chain.mjs` (LLM scoring only) | **Reinforces** |

**One-line design read**: LEAN strongly validates our deterministic-tagging stance and adds the one axis we're missing — *time-versioned* symbol identity — while reminding us our backtests need structural (not manual) leakage and cost guards.

---

## Feature quality assessment

> Tiers per `FEATURE_RUBRIC.md`. SachNetra "today" cites evidence above; unverified items capped at **Good**.

### Repo features rated

| Feature | Domain | Repo tier | Repo location | Why this tier |
|---|---|---|---|---|
| Point-in-time symbol mapping | data-engineering | Excellent | `Data/` map_files | Best-in-class; solves a problem most retail backtests ignore. |
| Corporate-action factor files | data-engineering | Excellent | `Data/` factor_files | Clean separation of raw vs adjusted, reproducible. |
| Event-driven leakage barrier | research | Excellent | `Engine/` | Look-ahead bias eliminated by construction. |
| Fill / slippage / fee models | research | Better | `Common/` models | Solid, configurable; defaults still need calibration to a venue. |
| Alpha/Portfolio/Risk/Execution split | research | Better | `Algorithm.Framework/` | Clean architecture; some ceremony for simple studies. |
| Backtest↔live same code path | ops | Better | `Brokerages/` | Powerful, but only matters once you trade live (not our lane yet). |
| Full live-execution engine | ops | Good (for us) | `Brokerages/`, `Launcher/` | Excellent in repo; not on SachNetra's path under V2 positioning. |

### SachNetra today vs target

| Feature | Domain | SachNetra today | Repo reference | Target for us | Gap | Evidence |
|---|---|---|---|---|---|---|
| Point-in-time ticker identity | data-engineering | Poor — current snapshot only | Excellent | Better | +2 | `build-equity-master.mjs` |
| Corporate-action handling in `research_prices` | data-engineering | **Better — VERIFIED 2026-06-05** | Excellent | Better | 0 | `backfill-research-prices.mjs:138`, `g4-backfill-midcap-prices.mjs:166`, `exp16:17,197-205` — adj_close throughout |
| Backtest leakage guard | research | Good — manual per-experiment | Excellent | Better | +1 | `exp14`/`exp16` scripts |
| Transaction-cost model in backtests | research | Poor — not evident | Better | Better | +1 | `scripts/research/` |
| Live execution engine | ops | N/A (not built, not wanted) | Better | N/A | — | `positioning_v2` |

---

## Best to have in SachNetra

> Max 10 rows. Sorted P0 → P2. Each row names its domain.

| Priority | Feature | Domain | Target tier | Today tier | Blocked by | Source (repo path) | Owner | Verdict |
|---|---|---|---|---|---|---|---|---|
| P1 | Point-in-time NSE symbol/rename history ("map file" for India) | data-engineering | Better | Poor | G4 midcap prices (needs the join to matter) | `Data/` map_files | James/Lijo | **Pursue** (when G4 runs) |
| P1 | Shared leakage-guard + cost helper for `scripts/research/` | research | Better | Good | none | `Engine/` + `Common/` models | James | **Pursue** |
| P2 | Reproducible split/dividend factor layer for `research_prices` | data-engineering | Better | Good (unverified) | verify current handling first | `Data/` factor_files | James | Park |

---

## Do not build (Poor)

| Feature | Domain | Repo tier | Why Poor for us | Verdict |
|---|---|---|---|---|
| Port/host the LEAN engine in our stack | ops | Excellent in repo | C#/.NET framework; our pipeline is Node/TS edge. Huge surface for zero current need. | **Kill** |
| Live broker execution layer | ops | Better in repo | No execution lane yet ("be your own first customer" ≠ build a trading platform); premature. | **Park** (not Kill — may matter post-proof) |
| Full Alpha/Portfolio/Risk/Execution framework for our event studies | research | Better in repo | Overkill ceremony for single-signal PEAD validation; our `scripts/research/` scripts are lighter and adequate. | **Kill** for now |

---

## SachNetra comparison

| Practice / pattern | Domain | Repo does | SachNetra does | Gap | Recommendation |
|---|---|---|---|---|---|
| Symbol identity over time | data-engineering | map_files (date-versioned) | `nse-equity-master.json` current snapshot | missing (time axis) | **Pursue** — capture rename/relist history before/with G4 PEAD backtest |
| Corp-action adjustment | data-engineering | factor_files, read-time | unverified in `research_prices` | unknown | Verify first, then Park/Pursue |
| Look-ahead prevention | research | structural (event loop) | manual per experiment | partial | **Pursue** — shared helper to enforce |
| Transaction costs in backtest | research | mandatory fill model | not evident | missing | **Pursue** — add cost stub before promoting any signal |
| Deterministic resolution (no LLM guess) | tagging | registry-based | dict + regex | none | Already aligned — don't reinvent |

**What we already do well** (cite path + evidence):
- Deterministic, registry-driven ticker resolution with collision filtering (`build-equity-master.mjs`, `_india-market-keywords.mjs`) — same philosophy LEAN uses for symbols.
- An explicit experiment program with kill criteria (`scripts/research/`, research playbook) — LEAN gives an engine, not a research *discipline*; we have the discipline.

**What we're missing or doing differently**:
- **data-engineering**: no point-in-time ticker history; our identity layer is timeless.
- **research**: leakage and transaction-cost guards are manual/absent, not structural.

---

## Improvement backlog

| # | Item | Domain | Owner | Effort | Blocked by | Verdict | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Build India "map file": ticker→entity rename/relist history (ISIN-anchored) | data-engineering | James/Lijo | M | G4 run gives it a consumer | Pursue | Anchor on ISIN; NSE name-change circulars are the source. Feeds mid-cap PEAD join. |
| 2 | Shared research helper: enforce no-future-read window + cost stub | research | James | S/M | none | Pursue | Bakes LEAN's two best guarantees into `scripts/research/` without the framework. |
| 3 | Verify `research_prices` corp-action adjustment is split/div-correct | data-engineering | Lijo | S | none | Pursue | Cheap check; gates whether #2's factor-layer work is needed. |

---

## Net verdict (3 lines — required)

1. **Tier-1 (do now)**: Steal two LEAN ideas into `scripts/research/` as a small shared helper — a structural no-look-ahead window and a mandatory transaction-cost stub (backlog #2). No framework adoption; pure discipline transfer.
2. **Tier-2 (after gate)**: Build an India point-in-time symbol/rename history (backlog #1) — Pursue once **G4** runs and a mid-cap PEAD backtest actually needs the time-correct join; until then the gap is latent, not active.
3. **Do not confuse**: LEAN is a backtest/execution *engine*, not a tagging or sentiment fix. Do not port it, do not build live execution now (Kill/Park) — copy the data-integrity discipline only.

---

## Risks & limitations

- **License**: Apache-2.0 — permissive; safe to learn from. (We are not vendoring it.)
- **Maintenance**: Very active (~13k commits, large community).
- **Data assumptions**: Built around US/global equities, forex, options, crypto in QC's data lake; **no native NSE/BSE India coverage** in the open repo — the *patterns* transfer, the data does not.
- **Overfit risk**: Engine is neutral; overfit risk lives in the strategies you run on it, not LEAN itself.
- **Stack mismatch**: C#/.NET (Python only via pythonnet) vs our Node/TS edge runtime — adoption cost is high, which is why the verdict is "copy discipline, not code".
- **Evidence staleness**: SachNetra side checked 2026-06-05 against `build-equity-master.mjs` and memory; PEAD/G1 prod gates not re-measured this session — re-review when G4 runs.

---

## So what for SachNetra?

**Experiments to add/kill**:
- Add: none new — but **harden the existing PEAD/event-study harness** with LEAN's leakage + cost guarantees before the next mid-cap run.
- Kill: none.

**Features / engineering to build** (by domain):
- **Tagging**: N/A directly (LEAN resolves by code, not free text) — but the time-axis insight feeds the symbol layer.
- **Sentiment**: N/A.
- **Research**: shared no-look-ahead + transaction-cost helper (backlog #2).
- **Data engineering**: India point-in-time symbol/rename history, ISIN-anchored (backlog #1).

**Data to capture**:
- NSE ticker rename/relist history (effective dates), ISIN-keyed — gated by G4 having a consumer for it.

**Pursue / Park / Kill** (this repo's primary lesson):

> Verdict-gate check for the primary "Pursue": (1) **Data tier** — the research-discipline helper is buildable on data we have today (EOD `research_prices`) ✅; the symbol-history piece needs G4's consumer → that one is Park-until-G4, named. (2) **Kill list** — not UI, not a finance/full/tech variant, not B2B/SaaS ✅. (3) **Live consumer** — moves the mid-cap PEAD work (`project_pead_midcap_finding`, `project_strategy_reset`), which is on-focus ✅. (4) **Right denominator** — verdict does not lean on the 20% headline-coverage gate ✅.

- **Pursue** — research-discipline transfer: structural leakage guard + mandatory cost stub in `scripts/research/` (backlog #2). Clears all four gates today.
- **Park** — India point-in-time symbol/rename history (backlog #1): real, but its only consumer is a mid-cap PEAD backtest blocked on **G4**. Build it with/after G4.
- **Kill** — porting the LEAN engine or building a live execution layer now: stack mismatch + no execution lane under V2 positioning.

---

## Open questions (for next session)

- Does `research_prices` already store split/dividend-adjusted bars, or raw? (Determines whether a factor-file layer is needed at all.)
- Is there an ISIN column anywhere in the NSE master feed we could anchor a rename history to, or do we need NSE name-change circulars as a separate source?
- For mid-cap PEAD 2009→now, how many tickers in our universe actually changed symbol/relisted? (Sizes the latent join bug.)

---

## Corrections log

| Date | What was wrong | Corrected to | Evidence |
|---|---|---|---|
| | | | |

---

## Wiki impact

> Filled only if promoted.

- **Created**: N/A (concept "point-in-time symbol mapping" is a candidate if backlog #1 graduates)
- **Updated**: N/A
- **Logged in**: N/A
- **Status after promote**: stays `documented`
