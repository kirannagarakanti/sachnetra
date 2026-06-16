---
github_url: https://github.com/marketcalls/openalgo
owner: marketcalls
repo: openalgo
license: Unknown
language: Python
last_commit: Unknown
stars: ~Unknown
audience: intermediate
tags: [algorithmic-trading, quant, india-markets]
date_added: 2026-05-30
last_reviewed: 2026-05-30
status: documented
reviewed_by: gemini
---

# OpenAlgo — Unified Broker API and Algorithmic Trading Platform

> **Why Lijo added this**: To study architectural patterns for unified broker routing, zeroMQ websocket streaming, and paper-trading sandboxes in Indian markets.

---

## TL;DR (3 bullets)

- A free, self-hosted algorithmic trading platform built on Python Flask + React 19 that provides a single unified REST and WebSocket API for 30+ Indian brokers.
- **Strongest best practice**: Normalizing websocket market data feeds across multiple brokers using a high-performance ZeroMQ message bus.
- **Biggest caveat**: Heavy feature footprint (visual builders, option tools) that caters to retail/no-code traders, which may add unnecessary bloat if deployed strictly for a programmatic research environment.

---

## ELI12 — what is this repo?

OpenAlgo is like a universal translator for Indian stock brokers. Instead of learning how to talk to Zerodha, Upstox, and AngelOne separately, you just talk to OpenAlgo, and it handles the rest. It also includes tools for you to write your trading code, build strategies by dragging and dropping boxes, and test your ideas with fake money in a sandbox before using real money.

---

## Architecture snapshot

```
openalgo/
├── /api/v1/          — Unified REST API layer for all 30+ brokers
├── /python           — Isolated Python strategy execution host
├── /flow             — Visual node-based strategy builder
└── /tools            — Real-time streaming option analytics dashboard
```

**Stack**: Python, Flask, React 19, ZeroMQ (message bus/websockets)

**Entry points**: `README.md`, REST API (`/api/v1/`), WebSocket proxy server (port 8765)

---

## Best practices extracted

> Each row must cite repo file path(s). Generic advice without a path is not allowed.

| # | Practice | Repo location | Why it matters |
|---|---|---|---|
| 1 | ZeroMQ-backed WebSocket Proxy | `README.md` (Architecture) | Distributing real-time normalized market data via a high-performance message bus prevents websocket bottlenecking across multiple consuming strategies. |
| 2 | Unified Broker Abstraction | `README.md` (Features) | Building a single REST contract for 30+ brokers ensures the execution engine isn't tightly coupled to one vendor, minimizing API breaking risk. |
| 3 | Dedicated Sandbox Environment | `README.md` (API Analyzer) | Implementing an exchange-aligned paper trading environment with isolated database tables prevents order contamination between live and test runs. |

### Deep dives (optional)

- **ZeroMQ normalized feeds**: By wrapping disparate broker websockets into a single ZMQ pub/sub layer, the system handles failovers and reconnection transparently to the strategies subscribing to it.

---

## Feature quality assessment

> Rate every feature using [`FEATURE_RUBRIC.md`](./FEATURE_RUBRIC.md): **Poor / Good / Better / Excellent**. Justify each tier in one line. Cite repo paths and SachNetra paths.

### Repo features rated

| Feature | Repo tier | Repo location | Why this tier |
|---|---|---|---|
| Unified Broker API | Excellent | `/api/v1/` | Eliminates broker lock-in and normalizes order/position payloads. |
| ZeroMQ WebSocket | Excellent | `README.md` | Robust, scalable way to distribute market data to multiple consumers. |
| Visual Strategy Builder | Poor | `/flow` | No-code drag-and-drop is an anti-pattern for rigorous programmatic research and version control. |
| Sandbox Execution | Better | API Analyzer | Essential for validating forward-execution logic before committing capital. |

### SachNetra today vs target

| Feature | SachNetra today | Repo reference | Target for us | Gap | Notes |
|---|---|---|---|---|---|
| Broker abstraction | Good | `/api/v1/` | Better | +1 | We mostly rely on a few feeds. Abstracting execution could decouple us from specific brokers. |
| Live streaming architecture | Good | ZeroMQ | Excellent | +2 | We use Redis in `server/_shared/`, but adopting ZMQ for high-frequency tick distribution could be useful if latency requirements tighten. |
| Forward-testing sandbox | Poor | API Analyzer | Better | +2 | Our focus is `scripts/research/` (historical). Forward paper-trading is currently missing. |

---

## Best to have in SachNetra

> Max 10 rows. Sorted P0 (Excellent target, big gap) → P2 (Good nice-to-have). From repo learnings — what we should actually build or upgrade.

| Priority | Feature | Target tier | Today tier | Source (repo path) | Owner lane | Verdict |
|---|---|---|---|---|---|---|
| P1 | Forward-testing Sandbox | Better | Poor | API Analyzer | James | Pursue |
| P2 | Unified Order Abstraction | Better | Good | `/api/v1/` | James | Park |
| P2 | ZMQ Pub/Sub for Ticks | Excellent | Good | ZeroMQ Proxy | James | Park |

---

## Do not build (Poor)

> Features rated **Poor** for SachNetra. Explicit kill list — prevents shiny-repo creep.

| Feature | Repo tier | Why Poor for us | Verdict |
|---|---|---|---|
| Visual / No-Code Strategy Builder | Good in repo | GUI-based builders cannot be rigorously version controlled, peer-reviewed, or integrated with our deep CLI backtesting framework (`scripts/research/`). | Kill |

---

## SachNetra comparison

> Compare repo patterns to our codebase. Cite SachNetra paths or docs.

| Practice / pattern | Repo does | SachNetra does | Gap | Recommendation |
|---|---|---|---|---|
| Live Market Data Bus | ZMQ pub/sub proxy | Redis caching in `server/_shared/` | partial | Park — Redis meets our current needs unless we need extreme high-frequency tick multiplexing. |
| Execution Mocking | Full API Analyzer Sandbox | Relies on historical backtests | missing | Pursue — Create a forward-testing paper broker module. |
| Broker Integration | Normalizes 30+ brokers | Direct integration where needed | partial | Park — We don't need 30 brokers, but an execution interface is useful. |

**What we already do well** (don't reinvent):
- Redis-backed caching and stampede protection handle our current web traffic well (`server/_shared/redis.ts`).

**What we're missing or doing differently**:
- We lack an execution-layer sandbox. All our validation happens over historical databases (e.g., `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_research_playbook.md`).

---

## Improvement backlog

Actionable items derived from the comparison. Link V2 tasks when they exist.

| # | Item | Owner lane | Effort | Verdict | Notes |
|---|---|---|---|---|---|
| 1 | Implement forward-testing paper broker engine | James | L | Pursue | To validate strategies out-of-sample in real time. |
| 2 | Standardize order execution interface (Broker API) | James | M | Park | Build an interface before we connect our first live broker. |

---

## Risks & limitations

- **License**: Unknown.
- **Maintenance**: Looks actively maintained but requires investigating the underlying broker SDKs' reliability.
- **Data assumptions**: Heavily tied to Indian broker APIs which can be unstable or have low rate limits.
- **Overfit risk**: N/A
- **Stack mismatch**: Python Flask vs our Node.js / TypeScript edge architecture.

---

## So what for SachNetra?

**Experiments to add/kill**:
- N/A

**Features / engineering to build**:
- Forward-testing execution sandbox (paper broker module) to complement historical backtesting.

**Data to capture**:
- N/A

**Pursue / Park / Kill** (pick exactly one):

- **Pursue** — Forward-testing execution sandbox architecture. We should file a task to build a paper-trading engine that matches our execution interface so we can run strategies live without capital risk.

---

## Open questions (for next session)

- Is it worth hosting a Python sidecar specifically to leverage OpenAlgo's unified broker API instead of reinventing it in TypeScript?

---

## Wiki impact

> Filled only if promoted. See [`../README.md`](../README.md) §3 (git-repos) and main learning README §3.

- **Created**: N/A
- **Updated**: N/A
- **Logged in**: N/A
- **Status after promote**: stays `documented`
