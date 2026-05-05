---
tags: [concept, finance, fixed-income, yields, interest-rates]
source: [[conversation.md]]
last_updated: 2026-05-05
---
# Bonds and Yields

**TL;DR:** Bond prices and yields move in opposite directions — when RBI raises rates, bond prices fall and yields rise, which is why rate decisions move the entire bond market.

## The Inverse Relationship (Most Important Fact)

- Bond pays fixed coupon (e.g., ₹100 face value, 7% coupon = ₹7/year fixed)
- If new bonds issue at 8%: old 7% bond is worth less → price falls
- If new bonds issue at 6%: old 7% bond is more attractive → price rises
- **Rule: Rate up → Bond price down → Yield up**

## Yield to Maturity (YTM)

- The effective annual return if you hold the bond to maturity
- Accounts for: coupon payments + capital gain/loss from buying below/above face value
- YTM = the market's current required return for that credit risk

## Duration: The Sensitivity Measure

- Duration = how many years of cash flows × their present value weighting
- Approximate rule: if duration = 7 years, a 1% rate rise → bond falls ~7%
- Long-duration bonds are more rate-sensitive than short-duration bonds
- India 10-year G-Sec = government benchmark bond, watched like Nifty for macro signals

## India Government Securities (G-Sec)

- Issued by RBI on behalf of Government of India
- Risk-free rate benchmark for all Indian lending
- Yield curve: plot of yields across different maturities
- Inverted yield curve (short > long) = recession signal
- Steep yield curve = growth expectation

## Classification for SachNetra

- **Event type**: `macro` or `regulation` (for RBI open market operations)
- **Relevance class**: B (systemic)
- **Market moving**: YES — 10-year G-Sec yield moves trigger bank stock reactions
- **Keywords**: `g-sec`, `government bonds`, `yield`, `bond prices`, `10-year`, `gsec`

## Connected Sectors for Signal Generation

```
RBI raises repo → G-Sec yields rise → Bank NIMs improve → Banking stocks: UP
                                     → Housing loan rates rise → NBFC/housing: DOWN
                                     → Bond portfolio value falls → Insurance cos: DOWN
```

## Linked Nodes

- [[interest_rates]]
- [[inflation]]
- [[reserve_bank_of_india]]
- [[quant_finance]]
- [[personal_investing]]
