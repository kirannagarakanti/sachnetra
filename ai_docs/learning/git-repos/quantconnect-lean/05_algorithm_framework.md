# The Algorithm Framework — `Algorithm.Framework/`

> Verified from source at clone `b27d79a0`. Useful to *understand* (it's a clean separation-of-concerns model), but **Kill for SachNetra now** — it's overkill for single-signal event studies.

## The five-stage pipeline

LEAN offers two ways to write a strategy: the classic monolithic `OnData` (you do everything), or the **Framework** — a modular pipeline where each stage is a swappable model. The stages and their interfaces (`Algorithm/`):

```
UniverseSelection  →  Alpha  →  PortfolioConstruction  →  Risk  →  Execution
  (what to watch)   (signal)     (target weights)      (caps)   (place orders)
```

| Stage | Interface | Job | Output |
|---|---|---|---|
| Universe Selection | `IUniverseSelectionModel` | pick which securities are in play (e.g. liquid top-N) | symbol set |
| **Alpha** | `IAlphaModel` | turn data into directional predictions | `Insight` objects |
| Portfolio Construction | `IPortfolioConstructionModel` | convert insights → target % weights | `PortfolioTarget` |
| Risk Management | `IRiskManagementModel` | clamp/override targets (drawdown, exposure) | adjusted targets |
| Execution | `IExecutionModel` | turn targets into actual orders, manage slicing | orders |

The framework drives these from the same event loop — `algorithm.OnFrameworkData(slice)` (called right after `OnData` at `AlgorithmManager.cs:562`) turns the crank.

---

## The Alpha → Insight contract (the important idea)

`Algorithm/Alphas/IAlphaModel.cs:33`:

```csharp
// called each time the algorithm receives data for subscribed securities
IEnumerable<Insight> Update(QCAlgorithm algorithm, Slice data);
```

An **`Insight`** is a *prediction*, not an order: it has a direction (Up/Down/Flat), a magnitude, a confidence, a weight, and crucially a **period** (how long the prediction is expected to hold). This cleanly separates *"I think X will rise over the next 5 days"* (alpha) from *"so buy ₹50k of it"* (portfolio construction). The same alpha can feed different sizing rules.

Example alpha models shipped in `Algorithm.Framework/Alphas/` (each in both `.cs` and `.py`): `ConstantAlphaModel`, `EmaCrossAlphaModel`, `MacdAlphaModel`, `RsiAlphaModel`, `HistoricalReturnsAlphaModel`, `BasePairsTradingAlphaModel`, `PearsonCorrelationPairsTradingAlphaModel`.

---

## Why this is genuinely good design

- **Testable in isolation** — swap the portfolio model without touching the signal; A/B two execution models on the same alpha.
- **Insight ≠ Order** — forces you to express a *belief with a horizon*, which is also how you'd evaluate signal quality (did the insight pay off over its period?).
- **Reusability** — a universe model and a risk model are written once, reused across strategies.

---

## Why it's a Kill for SachNetra *now*

| Reason | Detail |
|---|---|
| Wrong altitude | Our open question is *"does mid-cap PEAD even survive costs?"* — a single signal, one event study. The 5-stage ceremony adds structure we don't need yet. |
| Stack | It's C#/.NET interfaces; porting the framework to Node/TS is a large build for zero current ROI. |
| Our scripts are lighter | `scripts/research/exp16-midcap-pead.mjs` is a focused event study; that's the right tool for the validation question. |

**But borrow one concept**: the **Insight** abstraction (direction + magnitude + **horizon** + confidence) is a clean way to record a signal prediction so it can be scored later. If/when we have multiple live signals, recording each as an insight-with-horizon (rather than an immediate trade) is the pattern to copy — conceptually, not the C# class. Until then: **Park the concept, Kill the framework.**

---

## SachNetra mapping

| LEAN framework piece | SachNetra analog | Verdict |
|---|---|---|
| `IAlphaModel` / `Insight` | event-study signal in `exp16` (implicit) | Park concept (record direction+horizon) |
| `IUniverseSelectionModel` | "liquid half of Midcap 150" filter (PEAD finding) | already done bespoke |
| `IPortfolioConstructionModel` / `IRiskManagementModel` | none — we test signal, not sizing | Kill (no live book) |
| `IExecutionModel` | none — no execution lane | Kill / Park (V2 positioning) |
