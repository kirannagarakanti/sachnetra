---
tags: [entity, regulator, rbi, india, macro, monetary-policy]
source: [[conversation.md]]
last_updated: 2026-05-05
---
# Reserve Bank of India (RBI)

**TL;DR:** RBI is India's central bank and primary financial regulator — every policy decision is a Class B systemic signal affecting all banking stocks, and its repo rate (6.25% as of April 2026) is the single most important macro variable in India.

## Core Role

- Central bank of India — controls monetary policy
- Sets repo rate (benchmark overnight lending rate between RBI and banks)
- Regulates banking sector: licensing, capital requirements, NPA norms
- Manages foreign exchange reserves and rupee stability
- Issues circulars and policy documents that directly move markets

## Key Policy Instruments

| Instrument | Current (Apr 2026) | Effect When Changed |
|---|---|---|
| Repo Rate | 6.25% | Raised → credit costs rise; Cut → stimulus |
| Cash Reserve Ratio (CRR) | Variable | Higher → less bank lending capacity |
| Statutory Liquidity Ratio (SLR) | Variable | Higher → banks must hold more G-Secs |
| Open Market Operations | Ongoing | Manages liquidity in banking system |

## RBI Meeting Calendar (High-Value Signal Events)

- Monetary Policy Committee (MPC) meets 6 times/year
- Meeting outcome = Class B systemic event (affects all banking stocks)
- Three possible outcomes: rate hike / rate cut / hold
- April 2026 decision: HOLD at 6.25% (3rd consecutive hold, food inflation 8.2%)

## SachNetra Data Classification

- **Source credibility**: Highest (0.99) — official government body
- **Event type**: `regulation` or `macro`
- **Relevance class**: B (systemic — impacts entire banking and NBFC sector)
- **Processing mode**: Always FULL (sentiment + entities + ticker mapping)
- **Key RSS/API**: RBI website official press releases

## What RBI Publishes (SachNetra Data Sources)

| Source | Frequency | Signal Type |
|---|---|---|
| Monetary Policy Statement | 6x/year | Rate direction |
| RBI Bulletin | Monthly | Macro data compilation |
| SEBI-RBI joint circulars | Irregular | Regulatory action |
| Annual Report | Yearly | Long-term policy signals |
| Banking regulation circulars | Irregular | NPA norms, compliance |

## How RBI News Flows Through Markets

```
RBI holds rates at 6.25%
        ↓
Entity-aware sentiment splits:
  HDFCBANK.NS: +0.71 (deposit margins stable)
  LICHSGFIN.NS: -0.68 (no loan rate relief)
  SBIN.NS: +0.41 (government bank, stable NIM)
        ↓
Article-level sentiment: ≈ neutral (signals cancel)
Entity-level sentiment: actionable (different signals per ticker)
```

## SEBI (Related Entity)

- SEBI = Securities and Exchange Board of India
- Market regulator (RBI = banking regulator, SEBI = market regulator)
- SEBI penalties, circular, enforcement actions = Class B signals for affected sectors
- SEBI corporate filings portal = NSE/BSE announcement source

## Linked Nodes

- [[interest_rates]]
- [[inflation]]
- [[bonds_and_yields]]
- [[quant_finance]]
- [[sachnetra_quant_pivot]]
