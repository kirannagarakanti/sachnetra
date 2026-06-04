---
github_url: https://github.com/anirudhmb/equity-research-generator
owner: anirudhmb
repo: equity-research-generator
license: Unknown
language: Python
last_commit: Unknown
stars: ~Unknown
audience: intermediate
tags: [artificial-intelligence, india-markets, quant]
date_added: 2026-05-30
last_reviewed: 2026-05-30
status: documented
reviewed_by: gemini
---

# Equity Research Generator — Automated LangGraph Report Writer

> **Why Lijo added this**: To explore how LangGraph can be used to structure AI agent workflows specifically for Indian equity research, separating deterministic data collection from LLM synthesis.

---

## TL;DR (3 bullets)

- An automated equity research report generator for NSE/BSE markets using LangChain, LangGraph, and open-source LLMs.
- **Strongest best practice**: Strictly separating deterministic Python code (fetching data, calculating 18 financial ratios) from non-deterministic LLM calls (writing the report) within a LangGraph StateGraph.
- **Biggest caveat**: Designed around static MBA assignment outputs (Word/Excel generation) rather than a continuous, live-streaming database pipeline.

---

## ELI12 — what is this repo?

Imagine a robot financial analyst. Instead of asking ChatGPT to "analyze Reliance Industries" and getting a messy, hallucinated answer, this repo builds a disciplined assembly line using a tool called LangGraph. 
First, a worker fetches raw numbers from the internet. Second, a calculator cruncher computes exact ratios (no AI involved). Finally, a third worker (the AI) looks at all the exact numbers and writes a nicely formatted Word document explaining what they mean.

---

## Architecture snapshot

```
equity-research-generator/
├── /agents             — LangGraph nodes (data_collection, financial_analysis, report_writing)
├── /tools              — Reusable yfinance wrappers and ratio calculators
└── /generators         — Word (.docx) and Excel (.xlsx) output scripts
```

**Stack**: Python, LangChain, LangGraph, Groq/Gemini, Streamlit, yfinance

**Entry points**: `agents/graph.py` (defines the StateGraph)

---

## Best practices extracted

> Each row must cite repo file path(s). Generic advice without a path is not allowed.

| # | Practice | Repo location | Why it matters |
|---|---|---|---|
| 1 | Deterministic Node Isolation | `/agents/nodes/data_collection.py` | By forcing data collection and ratio calculation into strict Python functions without an LLM, the system eliminates mathematical hallucinations. |
| 2 | Unified State Schema | `/agents/state.py` | Passing a single `EquityResearchState` TypedDict through all nodes ensures the LLM writer in Node 3 has a perfectly typed payload of facts to synthesize. |
| 3 | Cost-Effective LLM Routing | `README.md` (Architecture) | Only activating the LLM for the final synthesis step (Node 3) drastically reduces token costs and execution time compared to a ReAct agent that loops constantly. |

### Deep dives (optional)

- **Sequential StateGraph**: The architecture explicitly rejects autonomous ReAct loops (where an agent decides what tool to call next) in favor of a rigid pipeline: `collect -> analyze -> write`. For structured finance reports, this rigidity is a feature, not a bug, because it guarantees the execution of all mandatory ratios (CAPM, DDM, Beta) before synthesis begins.

---

## Feature quality assessment

> Rate every feature using [`FEATURE_RUBRIC.md`](./FEATURE_RUBRIC.md): **Poor / Good / Better / Excellent**. Justify each tier in one line. Cite repo paths and SachNetra paths.

### Repo features rated

| Feature | Repo tier | Repo location | Why this tier |
|---|---|---|---|
| LangGraph State Schema | Excellent | `/agents/state.py` | Well-typed structure passing data between nodes without mutation errors. |
| Deterministic Math Nodes | Better | `/tools/ratio_calculator.py` | Calculates 18 ratios in raw Python before handing to the LLM. |
| Excel/Word Outputs | Poor | `/generators/` | Generating static files is an anti-pattern for our database-centric mission. |

### SachNetra today vs target

| Feature | SachNetra today | Repo reference | Target for us | Gap | Notes |
|---|---|---|---|---|---|
| Agentic Workflow | Good | `/scripts/_sentiment-chain.mjs` | Excellent | +2 | We currently run simple sequential scripts; a formal StateGraph could make our NLP sentiment chains more resilient. |
| Deterministic Math | Excellent | `scripts/research/` | Better | 0 | We already separate hard backtest math from any AI analysis. |

---

## Best to have in SachNetra

> Max 10 rows. Sorted P0 (Excellent target, big gap) → P2 (Good nice-to-have). From repo learnings — what we should actually build or upgrade.

| Priority | Feature | Target tier | Today tier | Source (repo path) | Owner lane | Verdict |
|---|---|---|---|---|---|---|
| P1 | Typed State passing for NLP pipelines | Excellent | Good | `/agents/state.py` | James | Pursue |
| P2 | LangGraph Sequential Workflows | Excellent | Good | `/agents/graph.py` | James | Pursue |

---

## Do not build (Poor)

> Features rated **Poor** for SachNetra. Explicit kill list — prevents shiny-repo creep.

| Feature | Repo tier | Why Poor for us | Verdict |
|---|---|---|---|
| Static Document Generators | Good in repo | Generating Word and Excel files contradicts SachNetra V2's mission where the database itself is the asset. | Kill |

---

## SachNetra comparison

> Compare repo patterns to our codebase. Cite SachNetra paths or docs.

| Practice / pattern | Repo does | SachNetra does | Gap | Recommendation |
|---|---|---|---|---|
| Multi-step NLP | LangGraph StateGraph | Sequential Promises in `_sentiment-chain.mjs` | partial | Pursue — Formalize our sentiment pipeline using a state graph pattern. |
| Fact-checking LLMs | Separates math from text generation | Does not use LLMs for math | none | Park — We already follow this best practice. |

**What we already do well** (don't reinvent):
- We never rely on LLMs to perform trading math or calculate PnL; all backtesting logic lives strictly in deterministic scripts (`scripts/research/`).

**What we're missing or doing differently**:
- Our AI integration (`server/_shared/llm.ts`) is currently point-to-point. We haven't adopted a graph-based orchestration framework like LangGraph for complex, multi-agent reasoning tasks.

---

## Improvement backlog

Actionable items derived from the comparison. Link V2 tasks when they exist.

| # | Item | Owner lane | Effort | Verdict | Notes |
|---|---|---|---|---|---|
| 1 | Refactor `_sentiment-chain.mjs` to use a typed state object pattern | James | M | Pursue | To handle entity extraction and sentiment synthesis more cleanly. |

---

## Risks & limitations

- **License**: Unknown.
- **Maintenance**: Single author project, potentially unstable.
- **Data assumptions**: Relies heavily on `yfinance`, which is notoriously rate-limited and sometimes inaccurate for Indian small caps.
- **Overfit risk**: N/A
- **Stack mismatch**: LangGraph/Python vs our Node/TS pipeline, but the architectural pattern of StateGraphs translates perfectly to `@langchain/langgraph` in JS/TS.

---

## So what for SachNetra?

**Experiments to add/kill**:
- N/A

**Features / engineering to build**:
- Adopt the "StateGraph" architectural pattern for our existing Node.js sentiment pipelines.

**Data to capture**:
- N/A

**Pursue / Park / Kill** (pick exactly one):

- **Pursue** — Adopt the rigid sequential StateGraph pattern (deterministic data → typed state → LLM synthesis) to harden SachNetra's intelligence and sentiment pipelines in `scripts/_sentiment-chain.mjs`.

---

## Open questions (for next session)

- Is `@langchain/langgraph` for TypeScript mature enough to replace our custom Promise chains in the intelligence pipeline?

---

## Wiki impact

> Filled only if promoted. See [`../README.md`](../README.md) §3 (git-repos) and main learning README §3.

- **Created**: N/A
- **Updated**: N/A
- **Logged in**: N/A
- **Status after promote**: stays `documented`
