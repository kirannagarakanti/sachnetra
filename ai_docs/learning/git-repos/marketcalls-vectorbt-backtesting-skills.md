---
github_url: https://github.com/marketcalls/vectorbt-backtesting-skills
owner: marketcalls
repo: vectorbt-backtesting-skills
license: Unknown
language: Python
last_commit: Unknown
stars: ~148
audience: professional
tags: [backtesting, machine-learning, algorithmic-trading, india-markets]
date_added: 2026-05-30
last_reviewed: 2026-05-30
status: documented
reviewed_by: gemini
---

# VectorBT Backtesting Skills — AI Agent Skills for VectorBT

> **Why Lijo added this**: To extract robust backtesting patterns (walk-forward, fee modeling, Monte Carlo) and see how AI coding agents can automate strategy generation for SachNetra.

---

## TL;DR (3 bullets)

- A suite of prompt-driven "skills" for 40+ AI coding agents (Claude, Cursor, etc.) to generate, backtest, and optimize trading strategies using `vectorbt`.
- **Strongest best practice**: Comprehensive, market-specific fee modeling (delivery vs intraday vs F&O) and rigorous robustness testing (Monte Carlo trade shuffles, noise injection).
- **Biggest caveat**: Designed to be executed *by* an AI agent via prompt commands (`/backtest`), which means the output is templated code rather than a standalone application.

---

## ELI12 — what is this repo?

Imagine telling an AI, "Write a backtest for an EMA crossover strategy in India." This repo gives the AI the exact rules, fees, and code templates to do that perfectly every time using a very fast Python library called VectorBT. It forces the AI to include real-world costs and print out a professional tear sheet of the results.

---

## Architecture snapshot

```
vectorbt-backtesting-skills/
├── /skills             — Invocable commands like /backtest, /optimize
├── /templates          — 12 ready-made strategy templates (e.g., Donchian, Supertrend)
└── /rules              — 20 knowledge base files covering fees, lot sizes, constraints
```

**Stack**: Python, vectorbt, TA-Lib, QuantStats

**Entry points**: Installed via `npx skills`, interacted via AI IDE commands.

---

## Best practices extracted

> Each row must cite repo file path(s). Generic advice without a path is not allowed.

| # | Practice | Repo location | Why it matters |
|---|---|---|---|
| 1 | Granular Cost Modeling | `/rules` (Costs) | Applying precise Indian 4-segment transaction costs (0.111% delivery, 0.0225% intraday) prevents backtests from showing fake alpha. |
| 2 | Walk-Forward Validation | `/templates/walk-forward` | Rolling train/test optimization with Walk-Forward Efficiency (WFE) scoring ensures strategies aren't curve-fit to a single regime. |
| 3 | Robustness Testing | `/rules/validation` | Injecting noise, delaying entries, and shuffling trades via Monte Carlo proves if a strategy's edge is statistically significant. |

### Deep dives (optional)

- **Walk-forward Validation**: Instead of a single train-test split, this uses a rolling window to constantly re-optimize parameters, which closely mimics how a live strategy adapts to changing market conditions.

---

## Feature quality assessment

> Rate every feature using [`FEATURE_RUBRIC.md`](./FEATURE_RUBRIC.md): **Poor / Good / Better / Excellent**. Justify each tier in one line. Cite repo paths and SachNetra paths.

### Repo features rated

| Feature | Repo tier | Repo location | Why this tier |
|---|---|---|---|
| Fee Modeling | Excellent | `/rules` | Exact SEBI/NSE fee structures out-of-the-box. |
| Robustness Testing | Excellent | `/rules/validation` | Monte Carlo and noise injection are professional-grade checks against overfitting. |
| AI Agent Integration | Better | `skills.sh` | Innovative way to enforce coding standards for LLMs. |

### SachNetra today vs target

| Feature | SachNetra today | Repo reference | Target for us | Gap | Notes |
|---|---|---|---|---|---|
| Backtest Fee Modeling | Good | `/rules/costs` | Excellent | +1 | We model slippage, but precise 4-segment fee modelling could tighten our estimates in `scripts/research/`. |
| Walk-Forward / Monte Carlo | Good | `/templates/walk-forward` | Excellent | +1 | We do some out-of-sample validation, but systematic Monte Carlo trade shuffles would increase confidence. |

---

## Best to have in SachNetra

> Max 10 rows. Sorted P0 (Excellent target, big gap) → P2 (Good nice-to-have). From repo learnings — what we should actually build or upgrade.

| Priority | Feature | Target tier | Today tier | Source (repo path) | Owner lane | Verdict |
|---|---|---|---|---|---|---|
| P0 | Walk-forward and Monte Carlo validation suite | Excellent | Good | `/templates/walk-forward` | Lijo | Pursue |
| P1 | Standardized Indian Fee Model | Excellent | Good | `/rules` | Lijo | Pursue |
| P2 | AI Agent Skill definitions for SachNetra | Better | N/A | `/skills` | James | Park |

---

## Do not build (Poor)

> Features rated **Poor** for SachNetra. Explicit kill list — prevents shiny-repo creep.

| Feature | Repo tier | Why Poor for us | Verdict |
|---|---|---|---|
| Generic indicator templates (e.g., RSI, Supertrend) | Good in repo | We test signals (news, flows, OI) not retail TA indicators which have decayed alpha. | Kill |

---

## SachNetra comparison

> Compare repo patterns to our codebase. Cite SachNetra paths or docs.

| Practice / pattern | Repo does | SachNetra does | Gap | Recommendation |
|---|---|---|---|---|
| Backtest Validation | Monte Carlo, WFE, Noise | Standard out-of-sample in `scripts/research/` | partial | Pursue — Adopt Monte Carlo trade shuffling for signal validation. |
| Transaction Costs | 4-segment Indian fee model | Flat bps slippage | partial | Pursue — Integrate exact SEBI/exchange fee math into our PnL calculations. |

**What we already do well** (don't reinvent):
- Using rigorous evidence-based backtesting rather than blindly trusting simple crossovers.

**What we're missing or doing differently**:
- Systematic Walk-Forward Efficiency (WFE) scoring on every backtest.
- Feeding AI agents explicit rules on our backtesting constraints before they write code.

---

## Improvement backlog

Actionable items derived from the comparison. Link V2 tasks when they exist.

| # | Item | Owner lane | Effort | Verdict | Notes |
|---|---|---|---|---|---|
| 1 | Build Monte Carlo trade shuffle validation into `scripts/research/` | Lijo | M | Pursue | Essential for statistical significance of our NLP/news signals. |
| 2 | Update backtest fee calculations to match SEBI 4-segment model | Lijo | S | Pursue | |

---

## Risks & limitations

- **License**: Unknown.
- **Maintenance**: Active.
- **Data assumptions**: Relies on data feeds like OpenAlgo or yfinance being perfectly clean.
- **Overfit risk**: Addressed heavily in the repo via WFE, but user can still ignore the warnings.
- **Stack mismatch**: We use Node/TS for pipelines, but our backtesting might be Python/Pandas based so this is compatible.

---

## So what for SachNetra?

**Experiments to add/kill**:
- Add: Exp — Run Monte Carlo noise injection on our best-performing news sentiment strategy to verify the Sharpe ratio holds up.

**Features / engineering to build**:
- Standardized fee model utility for research scripts.

**Data to capture**:
- N/A

**Pursue / Park / Kill** (pick exactly one):

- **Pursue** — Adopt the robust validation patterns (Monte Carlo, Walk-Forward, exact Indian fee modeling) into SachNetra's `scripts/research/` to harden our strategy evaluation.

---

## Open questions (for next session)

- Should we create our own `skills.sh` definitions for SachNetra so our AI coding agents automatically know our DB schemas and research playbooks?

---

## Wiki impact

> Filled only if promoted. See [`../README.md`](../README.md) §3 (git-repos) and main learning README §3.

- **Created**: N/A
- **Updated**: N/A
- **Logged in**: N/A
- **Status after promote**: stays `documented`
