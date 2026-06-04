---
github_url: https://github.com/marketcalls/opengreeks
owner: marketcalls
repo: opengreeks
license: MIT
language: Rust
last_commit: Unknown
stars: ~8
audience: professional
tags: [quant, option-pricing, quantitative-finance]
date_added: 2026-05-30
last_reviewed: 2026-05-30
status: documented
reviewed_by: gemini
---

# OpenGreeks — High-Performance Options Pricing & Greeks

> **Why Lijo added this**: To evaluate a high-speed replacement for `vollib` to accelerate options analytics and Greeks computations for Indian derivatives.

---

## TL;DR (3 bullets)

- A Rust-based drop-in replacement for `py_vollib` that computes Black-76, Black-Scholes, and BSM models.
- **Strongest best practice**: Re-writing compute-heavy numerical finance functions in Rust and exposing them via PyO3, achieving up to 183x speedups over Python/Cython equivalents.
- **Biggest caveat**: Very focused scope. It does exactly one thing (options math) and relies entirely on external libraries to feed it clean data.

---

## ELI12 — what is this repo?

When you trade stock options, you need complex math (called "Greeks") to figure out their exact price and risk. Usually, Python does this math slowly. This library does the exact same math, but it's written in a super-fast language called Rust. It drops right into your Python code and makes everything up to 180 times faster without changing any of the answers.

---

## Architecture snapshot

```
opengreeks/
├── /src              — Rust core containing Black-76, BSM mathematical models
├── /python           — PyO3 bindings mirroring the exact py_vollib API
└── /bench            — Parity and speed validation against vollib 1.0.7
```

**Stack**: Rust, PyO3, Python, NumPy

**Entry points**: `import opengreeks.black76` (Drop-in replacement for `vollib.black`)

---

## Best practices extracted

> Each row must cite repo file path(s). Generic advice without a path is not allowed.

| # | Practice | Repo location | Why it matters |
|---|---|---|---|
| 1 | API Parity for Migration | `README.md` (Inspired by) | Matching exact function names, argument order, and numerical conventions of the legacy library (`vollib`) makes adoption frictionless. |
| 2 | Extreme Dependency Reduction | `README.md` (Dependencies) | Replacing 7 brittle dependencies (including scipy/pandas) with a single Rust binary + numpy eliminates environment nightmares. |
| 3 | Exacting Edge-Case Validation | `/bench/RESULTS.md` | Validating 29 edge cases to 14 decimal digits of precision proves the Rust rewrite didn't introduce floating-point errors. |

### Deep dives (optional)

- **Rust + PyO3**: Offloading mathematical bottlenecks to Rust allows a system to process a full 200-strike NIFTY option chain in ~0.3 ms instead of ~9 ms. This is the difference between real-time streaming analytics and laggy batch updates.

---

## Feature quality assessment

> Rate every feature using [`FEATURE_RUBRIC.md`](./FEATURE_RUBRIC.md): **Poor / Good / Better / Excellent**. Justify each tier in one line. Cite repo paths and SachNetra paths.

### Repo features rated

| Feature | Repo tier | Repo location | Why this tier |
|---|---|---|---|
| Performance (Speed) | Excellent | `README.md` | 183x speedup on vega calculations is transformative for real-time IV surfaces. |
| Accuracy | Excellent | `/bench/RESULTS.md` | Bit-for-bit identical to canonical `vollib`. |
| API Design | Excellent | `README.md` | Drop-in replacement requires zero logic refactoring. |

### SachNetra today vs target

| Feature | SachNetra today | Repo reference | Target for us | Gap | Notes |
|---|---|---|---|---|---|
| Options Pricing Engine | Good | N/A | Excellent | +1 | If we calculate live IV/Greeks for NIFTY options, adopting this Rust core drastically reduces CPU load. |

---

## Best to have in SachNetra

> Max 10 rows. Sorted P0 (Excellent target, big gap) → P2 (Good nice-to-have). From repo learnings — what we should actually build or upgrade.

| Priority | Feature | Target tier | Today tier | Source (repo path) | Owner lane | Verdict |
|---|---|---|---|---|---|---|
| P0 | OpenGreeks Engine | Excellent | Good | `README.md` | James | Pursue |

---

## Do not build (Poor)

> Features rated **Poor** for SachNetra. Explicit kill list — prevents shiny-repo creep.

| Feature | Repo tier | Why Poor for us | Verdict |
|---|---|---|---|
| N/A | N/A | N/A | N/A |

---

## SachNetra comparison

> Compare repo patterns to our codebase. Cite SachNetra paths or docs.

| Practice / pattern | Repo does | SachNetra does | Gap | Recommendation |
|---|---|---|---|---|
| High-performance Math | Rust PyO3 bindings | Node.js/TS or basic Python | missing | Pursue — Use `opengreeks` anywhere we calculate implied volatility or option Greeks in Python backtests or data pipelines. |

**What we already do well** (don't reinvent):
- We keep our edge APIs lightweight (`server/worldmonitor/`).

**What we're missing or doing differently**:
- If our data collectors or researchers (`scripts/research/`) are using standard Python options math, they are likely wasting compute time.

---

## Improvement backlog

Actionable items derived from the comparison. Link V2 tasks when they exist.

| # | Item | Owner lane | Effort | Verdict | Notes |
|---|---|---|---|---|---|
| 1 | Swap `vollib` for `opengreeks` in all Python options research scripts | Lijo | S | Pursue | Instant performance gain with zero logic change. |

---

## Risks & limitations

- **License**: MIT.
- **Maintenance**: Looks stable and well-tested.
- **Data assumptions**: None; purely mathematical.
- **Overfit risk**: N/A
- **Stack mismatch**: We use a lot of TypeScript/Node, so this specifically benefits our Python-based data-science and backtesting layers, not necessarily the edge API layer.

---

## So what for SachNetra?

**Experiments to add/kill**:
- N/A

**Features / engineering to build**:
- N/A

**Data to capture**:
- N/A

**Pursue / Park / Kill** (pick exactly one):

- **Pursue** — We should immediately adopt `opengreeks` to replace any Python-based options pricing (like `vollib` or `scipy`-based Black-Scholes implementations) in our research and data pipeline to drastically reduce CPU overhead when calculating NIFTY IV surfaces.

---

## Open questions (for next session)

- Do we need a WebAssembly (WASM) or Node.js native binding of OpenGreeks to run IV calculations directly in our TypeScript edge functions?

---

## Wiki impact

> Filled only if promoted. See [`../README.md`](../README.md) §3 (git-repos) and main learning README §3.

- **Created**: N/A
- **Updated**: N/A
- **Logged in**: N/A
- **Status after promote**: stays `documented`
