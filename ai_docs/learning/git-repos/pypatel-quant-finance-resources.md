---
github_url: https://github.com/PyPatel/Quant-Finance-Resources
owner: PyPatel
repo: Quant-Finance-Resources
license: Unknown
language: Markdown
last_commit: Unknown
stars: ~Unknown
audience: intermediate
tags: [quant, quantitative-finance, india-markets]
date_added: 2026-05-30
last_reviewed: 2026-05-30
status: documented
reviewed_by: gemini
---

# Quant-Finance-Resources — Curated reading list for STEM grads

> **Why Lijo added this**: To extract advanced resource recommendations from a practitioner (HFT quant focused on Indian Markets).

---

## TL;DR (3 bullets)

- A curated list of courses and books focused on math, AI, and quant finance.
- Excludes superficial/introductory materials in favor of deep-dive MIT/CMU courses and canonical texts.
- **Biggest caveat**: This is a reading list, not a codebase. There is no code architecture, data pipeline, or backtesting framework to extract.

---

## ELI12 — what is this repo?

This isn't a software repository with code you can run. It's a reading list put together by someone who trades stocks very quickly in India using computers. He listed the exact math, coding, and finance books and college courses (like from MIT) that he thinks other engineers should study if they want to do his job.

---

## Architecture snapshot

```
Quant-Finance-Resources/
└── README.md — A single markdown file listing resources
```

**Stack**: N/A (Markdown list)

**Entry points**: Read `README.md`

---

## Best practices extracted

> Each row must cite repo file path(s). Generic advice without a path is not allowed.

| # | Practice | Repo location | Why it matters |
|---|---|---|---|
| 1 | Filter for depth over "flavor" | `README.md` | Rejecting superficial Udemy/Coursera content in favor of rigorous OCW courses ensures fundamental mastery rather than API familiarity. |
| 2 | Heavy mathematical foundation | `README.md` | Emphasizing numerical linear algebra and probability before ML/finance models avoids black-box thinking. |

### Deep dives (optional)

*N/A - No code to deep dive into.*

---

## Feature quality assessment

> Rate every feature using [`FEATURE_RUBRIC.md`](./FEATURE_RUBRIC.md): **Poor / Good / Better / Excellent**. Justify each tier in one line. Cite repo paths and SachNetra paths.

### Repo features rated

| Feature | Repo tier | Repo location | Why this tier |
|---|---|---|---|
| Resource curation | Good | `README.md` | Provides a high signal-to-noise ratio list of foundational math and finance texts. |

### SachNetra today vs target

| Feature | SachNetra today | Repo reference | Target for us | Gap | Notes |
|---|---|---|---|---|---|
| Researcher onboarding/learning | Good | Good | Excellent | +1 | We have `ai_docs/learning/` (e.g. `playlists/nptel-ts-r/`), but can always integrate more rigorous theoretical foundations. |

---

## Best to have in SachNetra

> Max 10 rows. Sorted P0 (Excellent target, big gap) → P2 (Good nice-to-have). From repo learnings — what we should actually build or upgrade.

| Priority | Feature | Target tier | Today tier | Source (repo path) | Owner lane | Verdict |
|---|---|---|---|---|---|---|
| P2 | Audit MIT Math for Finance Course | Excellent | Good | `README.md` | Lijo | Park |
| P2 | Review "Analysis of Financial Time Series" | Excellent | Good | `README.md` | Lijo | Park |

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
| Focused learning path | Lists MIT/CMU rigorous courses | `ai_docs/learning/` directories | partial | Park — review Tsay's Time Series book for research. |

**What we already do well** (don't reinvent):
- We maintain a dedicated `learning/` journal alongside the codebase.

**What we're missing or doing differently**:
- We haven't formalized a math/stats prerequisite reading list for agent or operator, relying mostly on empirical experiments (`scripts/research/`).

---

## Improvement backlog

Actionable items derived from the comparison. Link V2 tasks when they exist.

| # | Item | Owner lane | Effort | Verdict | Notes |
|---|---|---|---|---|---|
| 1 | Add "Analysis of Financial Time Series" by Tsay to learning backlog | Lijo | M | Park | Could inform GARCH persistence handling in FII flow models. |

---

## Risks & limitations

- **License**: Unknown.
- **Maintenance**: Unclear, appears to be a static list.
- **Data assumptions**: N/A
- **Overfit risk**: N/A
- **Stack mismatch**: N/A

---

## So what for SachNetra?

**Experiments to add/kill**:
- N/A: No explicit trading strategies provided.

**Features / engineering to build**:
- N/A

**Data to capture**:
- N/A

**Pursue / Park / Kill** (pick exactly one):

- **Park** — The resource list is excellent for theoretical foundations, but there is no executable code or data pipeline to pursue immediately. The time series book recommendation should be parked for future study when refining GARCH models.

---

## Open questions (for next session)

- Should we integrate specific concepts from Tsay's "Analysis of Financial Time Series" into the existing FII flow analysis?

---

## Wiki impact

> Filled only if promoted. See [`../README.md`](../README.md) §3 (git-repos) and main learning README §3.

- **Created**: N/A
- **Updated**: N/A
- **Logged in**: N/A
- **Status after promote**: stays `documented`
