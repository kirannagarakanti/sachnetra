---
github_url: https://github.com/owner/repo
owner: owner
repo: repo
license: MIT
language: Python
last_commit: YYYY-MM-DD
stars: ~0
audience: intermediate
tags: [quant, machine-learning, backtesting]
domains: [tagging, sentiment, research, data-engineering, ops]  # which SachNetra surfaces this repo touches
date_added: YYYY-MM-DD
last_reviewed: YYYY-MM-DD
status: raw
reviewed_by: gemini
evidence_checked: []  # e.g. [V2-031b, exp11/coverage_check.md] — REQUIRED before rating SachNetra today
---

# <Repo name> — <one-line purpose>

> **Why Lijo added this**: <one line — the SachNetra question this repo might answer>

---

## TL;DR (3 bullets)

- <what the repo is>
- <strongest best practice it demonstrates — name the **domain** (tagging / sentiment / research / …)>
- <biggest caveat or limitation>

---

## ELI12 — what is this repo?

<60 seconds of plain English. Pretend Lijo is 12. What problem does this repo solve? Who would clone it? What would they build with it?>

---

## Architecture snapshot

```
<repo>/
├── <key folder> — <what it does>
├── <key folder> — <what it does>
└── ...
```

**Stack**: <languages, key deps, runtime requirements>

**Entry points**: <main scripts, notebooks, or modules to read first>

---

## Evidence cross-check (required — before rating SachNetra)

> **Do not rate SachNetra "today" from repo README alone.** Load prod/task evidence first. If you cannot verify, write **unverified — needs Lijo** and cap SachNetra today at **Good** max.

| Claim about SachNetra | Evidence source | Measured value | Gate / target | Pass? |
|---|---|---|---|---|
| <e.g. G1 ticker precision> | `scripts/research/output/exp11/coverage_check.md` | <e.g. 63% pre-031b; post-031b clean> | ≥90% | Y / N / partial |
| <e.g. G1 coverage 24h> | `scripts/research/output/exp11/coverage_slice.md` | <e.g. 7.1% post-031b slice> | ≥20% | Y / N |
| <e.g. sentiment calibration> | `research_state_summary.md` Exp 3 | <e.g. 88% positive bias> | discriminating | N |

**Active tasks to cross-check** (grep `ai_docs/tasks/` before writing):
- Tagging: `V2-031`, `V2-031b`, `V2-031c` (if filed)
- Sentiment: `_sentiment-chain.mjs`, data gap **G6**
- Research: `exp11_brief.md`, relevant Exp##

**If this note contradicts prod data**: add a row to **Corrections log** (bottom) — do not leave wrong tiers in place.

---

## Domain map

> Repos often mix capabilities. **Split recommendations by domain** — do not let a sentiment-repo "fix" a tagging problem (or vice versa).

| Domain | What it covers in SachNetra | This repo relevant? |
|---|---|---|
| **Tagging (G1)** | Headline → NSE ticker via `nse-equity-master.json`, `_india-market-keywords.mjs` | Y / N / partial |
| **Sentiment (G6)** | FinBERT/LLM scoring, calibration, sector propagation via `_sentiment-chain.mjs` | Y / N / partial |
| **Research** | Backtests, experiments in `scripts/research/` | Y / N / partial |
| **Data engineering** | Collectors, schema, `seed-*.mjs` | Y / N / partial |
| **Product / UX** | Panels, alerts (low V2 priority) | Y / N / partial |

---

## Best practices extracted

> Each row must cite repo file path(s). Generic advice without a path is not allowed.

| # | Practice | Domain | Repo location | Why it matters |
|---|---|---|---|---|
| 1 | <pattern name> | tagging / sentiment / … | `path/to/file.py` | <one sentence> |
| 2 | | | | |
| 3 | | | | |

### Deep dives (optional)

<Expand 1–3 practices that are especially relevant to SachNetra. Keep snippets ≤5 lines. State which **domain** each deep dive applies to.>

---

## Design principles — reinforced or contradicted

> SachNetra's locked design: **deterministic extraction in code; LLM only for synthesis/scoring.** (V2-031 Decision 2: no NER in cron hot path.)

| Principle | Repo stance | SachNetra stance | Verdict |
|---|---|---|---|
| Deterministic ticker resolution (dict/fuzzy, not LLM guess) | <repo does X> | `build-equity-master.mjs` + word-boundary regex | Reinforces / Contradicts / N/A |
| LLM for synthesis only (summary, sentiment, not math) | | `_sentiment-chain.mjs`, `scripts/research/` | Reinforces / Contradicts / N/A |
| Precision before recall on tagging | | V2-031 Decision 6 | Reinforces / Contradicts / N/A |

**One-line design read**: <e.g. "Repo validates our dict-tagger approach; its NER is a fallback pattern only, not tier-1.">

---

## Feature quality assessment

> Rate using [`FEATURE_RUBRIC.md`](./FEATURE_RUBRIC.md): **Poor / Good / Better / Excellent**. Justify each tier. **SachNetra today** must cite evidence from §Evidence cross-check — never "perfect" or "robust" without gate numbers.

**Rating caps (SachNetra today)**:
- **Tagging** below G4 (≥90% precision) → cap at **Poor** or **Good**
- **Tagging** G4 pass but below G5 (≥20% coverage) → cap at **Good** (precision fixed, recall open)
- **Sentiment** with G6 positivity bias unresolved → cap at **Good**
- **Excellent today** only when prod gates pass AND path cited

### Repo features rated

| Feature | Domain | Repo tier | Repo location | Why this tier |
|---|---|---|---|---|
| <capability> | sentiment | Poor / Good / Better / Excellent | `path/in/repo` | <one line> |
| | | | | |

### SachNetra today vs target

| Feature | Domain | SachNetra today | Repo reference | Target for us | Gap | Evidence |
|---|---|---|---|---|---|---|
| <e.g. headline→ticker precision> | tagging | Poor / Good / … | <tier> | Better | +N | `coverage_check.md` §11.3 |
| <e.g. sector propagation> | sentiment | Good | Excellent | Excellent | +2 | not implemented |

---

## Best to have in SachNetra

> Max 10 rows. Sorted P0 → P2. **Each row must name its domain.** Do not list tagging fixes from a sentiment-only repo (or vice versa).

| Priority | Feature | Domain | Target tier | Today tier | Blocked by | Source (repo path) | Owner | Verdict |
|---|---|---|---|---|---|---|---|---|
| P0 | <e.g. sector propagation> | sentiment | Excellent | Good | G6 calibration optional | `path/in/repo` | James / Lijo | Pursue |
| P1 | <e.g. calibration anchors> | sentiment | Excellent | Good | — | | James | Pursue |
| P2 | | | Good | N/A | G5 coverage gate | | | Park |

**Blockers column**: name the gate or task that must pass first (e.g. `G5 coverage`, `V2-031c`, `Exp 11`).

---

## Do not build (Poor)

> Features rated **Poor for SachNetra** — explicit kill list.

| Feature | Domain | Repo tier | Why Poor for us | Verdict |
|---|---|---|---|---|
| <e.g. LLM-as-primary ticker tagger> | tagging | Good in repo | Contradicts V2-031 D2; 63% precision proved dict-first | Kill |
| | | | | |

---

## SachNetra comparison

> Compare repo patterns to our codebase. Cite SachNetra paths or docs.

| Practice / pattern | Domain | Repo does | SachNetra does | Gap | Recommendation |
|---|---|---|---|---|---|
| <e.g. walk-forward CV> | research | <how> | `scripts/research/...` | none / partial / missing | Pursue / Park / Kill — <why> |
| | | | | | |

**What we already do well** (don't reinvent — must cite path + evidence):
- <bullet>

**What we're missing or doing differently**:
- <bullet — separate by domain>

---

## Improvement backlog

| # | Item | Domain | Owner | Effort | Blocked by | Verdict | Notes |
|---|---|---|---|---|---|---|---|
| 1 | <specific change> | tagging / sentiment / … | James / Lijo | S/M/L | <gate or none> | Pursue | <V2-### link> |
| 2 | | | | | | Park | |
| 3 | | | | | | Kill | |

---

## Net verdict (3 lines — required)

> Claude-style bottom line. A human should get the action list from this block alone.

1. **Tier-1 (do now)**: <what to pursue immediately, with task link>
2. **Tier-2 (after gate)**: <what waits on G4/G5/G6/Exp##>
3. **Do not confuse**: <e.g. "This repo fixes sentiment, not tagging — keep dict tagger as primary">

---

## Risks & limitations

- **License**: <compatibility note if relevant>
- **Maintenance**: <active / stale / archived>
- **Data assumptions**: <markets, frequency, survivorship, etc.>
- **Overfit risk**: <especially for prediction repos>
- **Stack mismatch**: <e.g. Python/Pandas vs our Node/TS pipeline>
- **Evidence staleness**: <date prod metrics were checked; re-review trigger>

---

## So what for SachNetra?

**Experiments to add/kill**:
- Add: Exp## — <hypothesis>
- Kill: Exp## — <why>
- N/A: <if none>

**Features / engineering to build** (by domain):
- **Tagging**: <item or N/A>
- **Sentiment**: <item or N/A>
- **Research**: <item or N/A>

**Data to capture**:
- <new field / source> — gated by what?
- N/A: <if none>

**Pursue / Park / Kill** (pick exactly one for *this repo's primary lesson*):

> ⚠️ **Verdict gate — before writing "Pursue" (here OR in any Best-to-have / backlog row), it must clear ALL FOUR:**
> 1. **Data tier** — testable/buildable on data we have *today* (EOD `research_prices`, RSS, NSE/BSE APIs). NOT gated on Level-2/tick data or an execution engine → else **Park** with the gate named.
> 2. **Kill list** — not UI polish, not a `finance`/`full`/`tech` variant feature, not B2B/SaaS/consumer (see `positioning_v2.md`) → else **Kill**.
> 3. **Live consumer** — names a *current* experiment or task it moves (not a refuted/parked one — check the experiment is still alive before citing it). "Unblocks Exp X" requires Exp X to be on-focus → else **Park**.
> 4. **Right denominator** — if the verdict leans on the "20% headline-coverage gate", stop: that denominator is rejected (95% of news is systemic/untaggable; use recall-among-market-moving). Re-anchor or **Park**.
>
> Default to **Park**. Verify code claims against the actual files before asserting "SachNetra has zero/none of X". Dead `scratch/` links ≠ verified evidence.

- **Pursue** — <domain-specific; link a LIVE V2-### or backlog #N>
- **Park** — <blocked by which gate / no live consumer>
- **Kill** — <killed by which experiment or design decision, or which rule above it fails>

---

## Open questions (for next session)

- <question>

---

## Corrections log

> Append when prod data or a later review fixes an earlier claim. Never silently edit tiers without a log row.

| Date | What was wrong | Corrected to | Evidence |
|---|---|---|---|
| | | | |

---

## Wiki impact

> Filled only if promoted. See [`../README.md`](../README.md) §3 (git-repos) and main learning README §3.

- **Created**: [[concept_x]] / N/A
- **Updated**: [[entity_y]] / N/A
- **Logged in**: `wiki/log.md` on YYYY-MM-DD / N/A
- **Status after promote**: `promoted_to_wiki` / stays `documented`
