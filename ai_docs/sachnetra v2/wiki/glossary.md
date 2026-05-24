# SachNetra Glossary — Trading & Quant Terms

**Audience:** Lijo (and anyone else who walks in cold). Written from "I have never traded a share in my life" — no assumed prior knowledge.

**How to use:** Skim by section, or grep for a term. When we hit a new term in any conversation, it gets added here. Format is **term — plain definition**, then *(Why it matters: ...)* when the implication isn't obvious.

**Last updated:** 2026-05-23 (seeded from the positioning conversation)

---

## 1. Strategy & Research Discipline

**Paper trading** — Pretending to trade. You write down what you would have bought and sold, and at what price, and track the imaginary P&L. No real money. *(Why it matters: tests whether a signal has edge, but does NOT test slippage, execution, or your own psychology — those only show up live.)*

**Live trading** — Real money in a real broker account, with real orders going to the exchange.

**Backtest** — Running your strategy on historical data to see what it *would have* done. Useful but dangerous if not done strictly (see *look-ahead bias*).

**Walk-forward** — A disciplined form of backtest. You train/tune the strategy on data from Jan–Jun, then test it on Jul (which it has never seen). Then roll forward: train Feb–Jul, test Aug. And so on. *(Why it matters: prevents you from fooling yourself by optimising on data the strategy already saw.)*

**Out-of-sample (OOS)** — Data the strategy was NOT trained on. The only honest test of edge. The opposite is **in-sample**, where you tuned the strategy.

**Look-ahead bias** — Accidentally using information in a backtest that wouldn't have been available in real time (e.g. using today's closing price to make today's open-of-day decision). Quietly destroys most amateur backtests.

**Regime** — A market mood that lasts weeks or months. Examples: bull regime (prices trend up), bear regime (down), high-volatility regime (big swings), sideways regime (chop). *(Why it matters: a strategy that works in one regime can die in the next. If your paper-trading window is one month, you've probably only seen one regime.)*

**Edge / Alpha** — The bit of return your strategy generates *beyond what you'd get from buying-and-holding the index*. The whole game is to find and keep edge after costs.

**Sharpe ratio** — Annualised return divided by annualised volatility. A measure of return per unit of risk. Rough scale: **<0.5 = bad, 1.0 = decent, 1.5 = good, 2.0+ = excellent, 3.0+ = suspicious (probably a bug or look-ahead bias).**

**Drawdown** — The peak-to-trough fall in your equity curve. "Max drawdown 15%" means at the worst moment you were down 15% from your prior high. *(Why it matters: this is the number that determines whether you can psychologically and financially survive the strategy.)*

**Out-of-sample (live) Sharpe** — The Sharpe number your strategy actually achieves on money in a live account. Almost always lower than paper-trade Sharpe.

**Kill signal** — A pre-agreed threshold that, if breached, means you stop trading the strategy. E.g. "if live drawdown exceeds 20%, shut it down." Decided in advance, enforced without emotion.

---

## 2. Order Mechanics

**Order** — Your instruction to the broker: "buy 100 shares of Reliance at market price." Different *types* of orders exist (see below).

**Market order** — "Buy now at whatever price is available." Fast. Risky in illiquid stocks.

**Limit order** — "Buy at ₹2,500 or lower, otherwise don't buy." Safer but might not fill.

**Fill** — When your order actually executes. Partial fill = only some of it executed.

**Bid–ask spread** — The gap between the highest price someone is willing to pay (bid) and the lowest price someone is willing to sell (ask). *(Why it matters: every time you trade, you pay this spread. Wide spreads = expensive trading.)*

**Slippage** — The difference between the price you *expected* and the price you *got*. Caused by spread, market moving while your order arrives, or your order being big enough to move the market. *(Why it matters: this is the #1 reason paper Sharpe is higher than live Sharpe.)*

**Liquidity** — How easy it is to buy/sell without moving the price. Reliance is liquid. A small-cap traded 10,000 shares/day is illiquid.

**Market impact** — How much YOUR order moves the price. If you buy ₹10L of a small stock, the price goes up just because of your order. Big traders manage this carefully.

**Position** — What you currently own (or are short). "Long 100 Reliance" = you own 100 Reliance shares.

**Position sizing** — Deciding *how many shares* to buy. The strategy might say "buy Reliance" but it doesn't say "buy 100 or buy 10,000." Position sizing is the difference between blowing up and surviving.

**Stop-loss** — An automatic order to sell if the price drops to a pre-set level. "Buy at ₹2,500, stop-loss at ₹2,400" means if it falls to ₹2,400 the broker auto-sells. *(Why it matters: stop-losses don't always trigger at your level — in fast markets the price gaps through and you sell lower. Indian markets have this issue at open.)*

---

## 3. Indian Market Specifics

**MIS (Margin Intraday Square-off)** — A Zerodha order type for intraday trading. You can use leverage (e.g. ₹5 buying power for every ₹1 in your account) but the broker auto-closes the position at 3:20 PM. *(Why it matters: never carry MIS positions overnight — auto-closed at whatever price.)*

**CNC (Cash and Carry)** — Delivery-based trading. You actually buy the shares and they sit in your demat account. No leverage. Can hold forever.

**STT (Securities Transaction Tax)** — Government tax on every trade. Different rates for delivery vs intraday vs derivatives. Eats into edge.

**Brokerage** — What the broker charges you. Zerodha charges ₹0 for delivery and a flat ₹20 per intraday order. Cheap by global standards.

**SEBI charges, GST, stamp duty** — Smaller charges layered on top of brokerage. Always model them in your cost assumptions.

**T+1 settlement** — In India, when you buy a share today, it arrives in your demat account 1 working day later. You can sell it the same day (intraday) but for delivery, the shares clear T+1.

**Circuit limit** — Exchange-imposed max % price move per day. "5% upper circuit" means the stock cannot trade higher than +5% from yesterday's close. *(Why it matters: in a circuit-locked stock, you CANNOT sell. Liquidity goes to zero.)*

**Contract note** — Email/PDF the broker sends after market close listing every trade you did that day, all charges, and net amount. The "broker statement" of truth.

**Demat account** — Where your shares actually live. Separate from your trading account. Linked.

---

## 4. Risk & Infrastructure

**Kill switch** — Code (or human) that stops all trading immediately if something goes wrong (e.g. positions exceed risk limit, API error storm, wrong direction in market). *(Why it matters: every live system needs one. Most blow-ups are "I didn't have a kill switch.")*

**Risk limit** — A pre-set maximum on something. Examples: max loss per day, max position size in one stock, max gross exposure. Limits are enforced automatically before orders are placed.

**P&L (profit and loss)** — How much you made or lost. **Realised P&L** = locked in (already sold). **Unrealised P&L** = on paper (still holding).

**Sharpe attribution** — Comparing live Sharpe to paper Sharpe to figure out where the gap came from (slippage? bad fills? missed signals?). Critical first 3 months live.

**Broker API** — A way for code to send orders directly to the broker instead of clicking buttons in their app. Zerodha's API is called **Kite Connect** (₹2,000/month). IBKR has its own.

**Zerodha Kite Connect** — The retail-grade Indian broker API. Used by most algorithmic retail traders. Good documentation, decent reliability, REST + WebSocket.

**IBKR (Interactive Brokers)** — A more institutional-grade broker. Better for systematic strategies at scale, more friction to set up in India.

---

## 5. From SachNetra's Existing V2 Work

**FII / DII (Foreign / Domestic Institutional Investors)** — The "smart money" of Indian markets. Daily net-buy/sell flows are public. FIIs buying = bullish signal, often. (V2-017, V2-017b track this.)

**Bulk deal / Block deal** — Large trades that exchanges report separately. Bulk = >0.5% of company's shares. Block = ≥5L shares OR ≥₹5cr value in one trade. (V2-030 tracks these.)

**Open Interest (OI)** — In options/futures, total contracts currently open. Rising OI + rising price = strong trend; rising OI + falling price = bearish bet building. (V2-024 tracks this.)

**Implied Volatility (IV)** — The market's forecast of future volatility, read from option prices. "IV crush" = IV drops sharply, often after an earnings event.

**GARCH / GARCH-X** — A statistical model for forecasting volatility. The "X" version includes exogenous (external) variables. Used in Exp6/7 of the research layer.

**Newswire signal** — News flow as a predictor of price movement. Exp4 in the research layer showed it leads price for short windows. The seed of the current edge thesis.

---

## 6. Conventions In This Doc

- **₹** = Indian Rupees. **L** = lakh = 100,000. **cr** = crore = 10,000,000.
- **bps** = basis points = 1/100th of a percent. "100 bps = 1%."
- When a definition has a *(Why it matters: ...)* line, that's the non-obvious implication for OUR work specifically, not a textbook definition.

---

## How To Extend This

When you (or future-you) hits a term in a task file, research doc, or conversation that isn't here:

1. Add it under the right section (or make a new section).
2. Plain language definition first.
3. *(Why it matters)* second, if non-obvious.
4. Bump the "Last updated" date at the top.

Don't worry about polishing — a rough entry is better than no entry. Future-you will thank past-you.
