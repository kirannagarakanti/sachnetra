---
date_started: 2026-05-30
date_last_updated: 2026-06-04
total_repos: 10
documented: 10
tags: [quant, machine-learning, quantitative-finance, algorithmic-trading]
status: in_progress
---

# Git Repos — Master Catalog

> **Purpose**: Single grep-friendly table of all quant/ML GitHub repos in our reference library. Gemini (or any agent) updates this when a repo is added or re-reviewed.

**How to add a repo**: See [`README.md`](./README.md). Paste [`GEMINI_BRIEF.md`](./GEMINI_BRIEF.md) into Gemini, provide the URL, save output as `<owner>-<repo>.md`, add a row below.

---

## By topic (quick filter)

| Topic tag | Repos | Notes |
|---|---|---|
| `machine-learning` | 0 | |
| `artificial-intelligence` | 0 | |
| `artificial-intelligence-algorithms` | 0 | |
| `artificial-neural-networks` | 0 | |
| `algorithms` | 0 | |
| `linear-algebra` | 0 | |
| `probability` | 0 | |
| `quant` | 0 | |
| `quantitative-finance` | 0 | |
| `option-pricing` | 0 | |
| `algorithmic-trading` | 0 | |
| `stock-price-prediction` | 0 | Treat with skepticism — see research state |
| `time-series` | 0 | Pairs with NPTEL playlist in `../playlists/nptel-ts-r/` |
| `backtesting` | 0 | |
| `data-engineering` | 0 | |
| `india-markets` | 0 | |

---

## All repos

| Repo | Audience | Tags | Status | Last reviewed | Doc | Verdict |
|---|---|---|---|---|---|---|
| [PyPatel/Quant-Finance-Resources](https://github.com/PyPatel/Quant-Finance-Resources) | intermediate | quant, quantitative-finance, india-markets | documented | 2026-05-30 | [pypatel-quant-finance-resources.md](./pypatel-quant-finance-resources.md) | Park |
| [marketcalls/openalgo](https://github.com/marketcalls/openalgo) | intermediate | algorithmic-trading, quant, india-markets | documented | 2026-05-30 | [marketcalls-openalgo.md](./marketcalls-openalgo.md) | Pursue |
| [marketcalls/vectorbt-backtesting-skills](https://github.com/marketcalls/vectorbt-backtesting-skills) | professional | backtesting, machine-learning, algorithmic-trading | documented | 2026-05-30 | [marketcalls-vectorbt-backtesting-skills.md](./marketcalls-vectorbt-backtesting-skills.md) | Pursue |
| [marketcalls/opengreeks](https://github.com/marketcalls/opengreeks) | professional | quant, option-pricing | documented | 2026-05-30 | [marketcalls-opengreeks.md](./marketcalls-opengreeks.md) | Pursue |
| [anirudhmb/equity-research-generator](https://github.com/anirudhmb/equity-research-generator) | intermediate | artificial-intelligence, india-markets, quant | documented | 2026-05-30 | [anirudhmb-equity-research-generator.md](./anirudhmb-equity-research-generator.md) | Pursue |
| [harshbokadia/financial-sentiment-intelligence](https://github.com/harshbokadia/financial-sentiment-intelligence) | professional | alternative-data, nlp, indian-markets | documented | 2026-05-30 | [harshbokadia-financial-sentiment-intelligence.md](./harshbokadia-financial-sentiment-intelligence.md) | Pursue |
| [harshbokadia/fin-RiskLens](https://github.com/harshbokadia/fin-RiskLens) | professional | quant, portfolio-optimization, capm | documented | 2026-05-30 | [harshbokadia-fin-risklens.md](./harshbokadia-fin-risklens.md) | Pursue |
| [harshbokadia/credit_risk_model_project](https://github.com/harshbokadia/credit_risk_model_project) | professional | machine-learning, xgboost, business-impact | documented | 2026-05-30 | [harshbokadia-credit-risk-model.md](./harshbokadia-credit-risk-model.md) | Pursue |
| [buzzsubash/algo_trading_strategies_india](https://github.com/buzzsubash/algo_trading_strategies_india) | intermediate | algorithmic-trading, option-pricing, india-markets, quant | documented | 2026-05-30 | [buzzsubash-algo-trading-strategies-india.md](./buzzsubash-algo-trading-strategies-india.md) | Park |
| [LLMQuant/quant-mind](https://github.com/LLMQuant/quant-mind) | professional | quant, machine-learning, data-engineering, artificial-intelligence, backtesting | documented | 2026-06-04 | [llmquant-quant-mind.md](./llmquant-quant-mind.md) | Pursue |
| _— add rows below —_ | | | queued | | | |

---

## Queued (URL only — not yet documented)

Paste URLs here before Gemini runs. Move to **All repos** when documented.

```
# Example:
# https://github.com/owner/repo — why: backtest leakage patterns for scripts/research/
https://github.com/marketcalls/openbull — why: Options trading platform with strategy builder and multi-broker support.
https://github.com/marketcalls/openadvisor — why: Personal ML-based stock recommendation platform.
```

---

## Cross-repo synthesis (running)

> Refreshed when 3+ repos share a topic. Not append-only — rewrite bullets to reflect current read.

**Patterns we keep seeing across repos**:
- _(none yet)_

**Patterns SachNetra already matches**:
- Idempotent seed scripts with `runSeed()` shape (`scripts/seed-*.mjs`)
- Redis-backed caching with stampede protection (`server/_shared/`)
- Explicit experiment program with kill criteria (`scripts/research/`, research playbook)

**Top improvement themes** (aggregate from improvement backlogs):
- _(none yet)_

**Best to have in SachNetra** (aggregate P0 items across all repo docs — refresh when 2+ repos documented):
- _(none yet)_

**Do not build** (Poor features seen repeatedly across repos):
- _(none yet)_

---

## Changelog

| Date | Change |
|---|---|
| 2026-05-30 | Initial catalog — taxonomy + empty tables |
