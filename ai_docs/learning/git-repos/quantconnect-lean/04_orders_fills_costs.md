# Orders, Fills & Transaction Costs — `Common/Orders/`

> Verified from source at clone `b27d79a0`. The lesson here: **a backtest without a cost model is a fantasy** — LEAN forces one in the fill path.

## Order types (`Common/Orders/`)

LEAN ships a full order vocabulary, each its own class:
`MarketOrder`, `LimitOrder`, `StopMarketOrder`, `StopLimitOrder`, `LimitIfTouchedOrder`, `MarketOnOpenOrder`, `MarketOnCloseOrder`, plus combo orders (`ComboMarketOrder`, `ComboLimitOrder`, `ComboLegLimitOrder`) for multi-leg options.

There are also broker-specific `*OrderProperties` (time-in-force, routing) — including **`IndiaOrderProperties.cs`**, which encodes NSE/BSE product types (MIS/CNC/NRML). LEAN already models the India venue at the order level.

---

## Fill models — `Common/Orders/Fills/`

The fill model converts an order + current market data into an `OrderEvent` (filled price + quantity). Hierarchy: `IFillModel` → `FillModel` → `EquityFillModel` / `FutureFillModel` / `FutureOptionFillModel` / `ImmediateFillModel`.

`EquityFillModel.MarketFill` (`EquityFillModel.cs:124`) is the canonical path:

```csharp
public override OrderEvent MarketFill(Security asset, MarketOrder order)
{
    if (order.Status == OrderStatus.Canceled) return fill;
    if (!IsExchangeOpen(asset, false)) return fill;            // :133 can't trade closed market

    var slip = asset.SlippageModel.GetSlippageApproximation(asset, order);  // :136

    switch (order.Direction)
    {
        case OrderDirection.Buy:
            fill.FillPrice = GetBestEffortAskPrice(asset, order.Time, ...) + slip;  // :144 pay the ask
            break;
        case OrderDirection.Sell:
            fill.FillPrice = GetBestEffortBidPrice(asset, order.Time, ...) - slip;  // :148 hit the bid
            break;
    }
    fill.FillQuantity = order.Quantity;
    fill.Status = OrderStatus.Filled;                          // :155
    return fill;
}
```

Key honesty properties baked in:
- **Spread cost** — buys pay ask, sells receive bid (not midpoint).
- **Slippage** — added/subtracted via a pluggable `SlippageModel`.
- **Market-hours gate** — `IsExchangeOpen` blocks impossible fills.
- **Stop/limit semantics** — `StopMarketFill` (`:180`) models gap risk: if a bar opens through your stop, you fill at the *open*, not the trigger (see the remarks block at `:165-178`). No optimistic fills.

`ImmediateFillModel` is the simple variant; the equity model adds the realistic microstructure.

---

## Fees — `Common/Orders/Fees/`

Dozens of venue-specific fee models (`InteractiveBrokersFeeModel`, `BinanceFeeModel`, `AlpacaFeeModel`, …). Each implements `IFeeModel.GetOrderFee(...)` returning a currency-denominated fee that reduces cash on fill. Default backtests still attach a fee model — you opt out deliberately, not by accident.

---

## Slippage — `Common/Orders/Slippage/`

Pluggable `ISlippageModel` (e.g. `ConstantSlippageModel`, `VolumeShareSlippageModel`). The fill model calls it (`EquityFillModel.cs:136`) so slippage assumptions are explicit and swappable, never hard-coded.

---

## Transaction handlers — backtest vs live

`Engine/TransactionHandlers/`:
- **`BacktestingTransactionHandler`** — processes orders synchronously inside the loop (steps 4 & 10a in 02), running the fill models against current data.
- **`BrokerageTransactionHandler`** — routes real orders to a broker and listens for real fill events.

Same `ITransactionHandler` interface, same order objects — so the strategy code is identical backtest vs live. This is the order-side half of the "backtest == live" guarantee (the data-side half is in 01/02).

---

## SachNetra gap analysis

| Capability | LEAN | SachNetra today | Recommendation |
|---|---|---|---|
| Transaction cost in backtest | mandatory fee model | **not evident** in `scripts/research/` | **Pursue** — add a cost stub before any promote-to-signal |
| Spread cost (buy ask / sell bid) | `EquityFillModel` | gross returns only | Pursue — even a fixed bps haircut |
| Slippage model | pluggable `ISlippageModel` | none | Pursue — constant-bps is enough to start |
| Gap-aware stop fills | `StopMarketFill` | N/A (we don't simulate execution) | N/A — we test signal, not execution |
| India order semantics | `IndiaOrderProperties` | N/A | N/A until/unless we trade live (Park) |

**Net**: we are not building an execution simulator. But mid-cap names are *less liquid* — spread + slippage there is large, and a gross-return PEAD backtest will overstate edge. A simple **fixed cost+slippage haircut** (e.g. round-trip bps tuned to mid-cap liquidity) is the cheap, correct thing to copy. Detail in [07_sachnetra_application.md](./07_sachnetra_application.md).
