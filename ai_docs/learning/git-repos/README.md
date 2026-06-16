# Git Repos — Quant Reference Library

**Purpose.** A curated library of open-source GitHub repositories that teach or demonstrate quant, ML, and market-intelligence patterns. Each repo gets documented here so a **Gemini agent** (or any future session) can:

1. **Extract best practices** from the repo — architecture, testing, data hygiene, backtest discipline, deployment.
2. **Compare against SachNetra** — what we already do, what we do differently, what we're missing.
3. **Rate features** — Poor / Good / Better / Excellent for repo capabilities, SachNetra today, and target state ([`FEATURE_RUBRIC.md`](./FEATURE_RUBRIC.md)).
4. **Recommend improvements** — concrete, scoped suggestions with Pursue / Park / Kill verdicts plus a **Best to have in SachNetra** shortlist.

This folder sits alongside `videos/`, `articles/`, and `playlists/` in the learning journal. It is **not** a fork list or dependency manifest. We do not vendor these repos into production unless a task explicitly says so.

---

## Standing context (read first)

If you are an agent reading this at session start, load [`../README.md`](../README.md) for SachNetra standing context (V2 mission, research state, sacred files, Lijo vs James lanes).

**SachNetra surfaces to compare against** (non-exhaustive — expand as V2 grows):

| Area | Where to look |
|---|---|
| Intelligence pipeline | `scripts/seed-india-signals.mjs`, `scripts/_sentiment-chain.mjs`, `scripts/_india-market-keywords.mjs` |
| Research / backtests | `scripts/research/` |
| Market taxonomy | `shared/market-taxonomy.json` |
| DB schema | `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_db_schema.md` |
| Validation playbook | `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_research_playbook.md` |
| Research state | `ai_docs/sachnetra v2/wiki/syntheses/research_state_summary.md` |
| Collectors (FII, NSE, etc.) | `scripts/seed-*.mjs`, task files `ai_docs/tasks/V2-*.md` |
| Edge API / caching | `server/_shared/`, `server/worldmonitor/` |

**Sacred files** — never suggest edits to: `src/config/variants/{full,tech,finance}.ts`, `scripts/seed-insights.mjs`.

---

## Folder structure

```
ai_docs/learning/git-repos/
├── README.md              ← this file (workflow + topic taxonomy)
├── GEMINI_BRIEF.md        ← paste into Gemini first; comparison protocol
├── FEATURE_RUBRIC.md      ← Poor / Good / Better / Excellent definitions
├── _index.md              ← master catalog of all tracked repos
├── TEMPLATE_REPO.md       ← canonical entry template
└── <owner>-<repo>.md      ← one file per repo (kebab-case slug)
```

**Naming**: `<owner>-<repo>.md` using the GitHub slug (e.g. `quantopian-zipline.md`, `microsoft-qlib.md`). No date prefix — repos evolve; update `last_reviewed` in frontmatter instead.

---

## Topic taxonomy

Use these tags in frontmatter `tags:` (pick all that apply). Add new tags only when nothing below fits — then add a row to this table via README Changelog.

| Tag | Covers |
|---|---|
| `machine-learning` | General ML pipelines, feature engineering, model training |
| `artificial-intelligence` | LLM agents, NLP for finance, AI tooling |
| `artificial-intelligence-algorithms` | Search, planning, RL, agent orchestration |
| `artificial-neural-networks` | MLPs, CNNs, RNNs, transformers for time series / markets |
| `algorithms` | Classic CS algos, optimization, data structures (when finance-adjacent) |
| `linear-algebra` | Matrix methods, PCA, factor models, eigendecomposition |
| `probability` | Stochastic processes, distributions, Monte Carlo |
| `quant` | Broad quant finance (use with a narrower tag when possible) |
| `quantitative-finance` | Portfolio theory, risk, derivatives math |
| `option-pricing` | Black–Scholes, vol surfaces, Greeks, exotics |
| `algorithmic-trading` | Execution, backtesting frameworks, live trading infra |
| `stock-price-prediction` | Forecasting price/direction (treat skepticism as default) |
| `time-series` | ARIMA, GARCH, state-space, spectral (pairs with NPTEL playlist) |
| `backtesting` | Walk-forward, leakage guards, transaction costs |
| `data-engineering` | ETL, pipelines, storage patterns for market data |
| `india-markets` | NSE/BSE, Indian macro, rupee, local datasets |

**Audience levels** (frontmatter `audience:`):

- `beginner` — tutorials, courses, notebooks with heavy explanation
- `intermediate` — working code, assumes stats/ML basics
- `professional` — production-grade or research-grade systems

---

## Feature quality rubric

Every repo entry rates features on four tiers. Full definitions: [`FEATURE_RUBRIC.md`](./FEATURE_RUBRIC.md).

| Tier | Meaning | Typical verdict |
|---|---|---|
| **Poor** | Wrong for us — anti-pattern, hype, or killed by evidence | Kill |
| **Good** | Table stakes — worth having eventually | Park |
| **Better** | Meaningful upgrade for data asset or signal validation | Pursue when unblocked |
| **Excellent** | Best-in-class for SachNetra's V2 mission | Pursue — prioritize |

Each documented repo MUST include:
- **Feature quality assessment** — repo vs SachNetra today vs target
- **Best to have in SachNetra** — ≤10 prioritized features (P0 → P2)
- **Do not build (Poor)** — explicit kill list

---

## Workflow

### 1. Add a repo (Lijo)

Provide the agent (or Gemini) with:

- GitHub URL
- One line: **why this repo** (what SachNetra question it might answer)
- Optional: specific folders/files to focus on

Say: *"Document this repo. Use the git-repos template and run the SachNetra comparison."*

### 2. Document (Gemini or agent)

Follow [`GEMINI_BRIEF.md`](./GEMINI_BRIEF.md) if using Gemini. Otherwise:

1. Create `<owner>-<repo>.md` from [`TEMPLATE_REPO.md`](./TEMPLATE_REPO.md).
2. Fill every required section — especially **Best practices extracted**, **Feature quality assessment**, **Best to have in SachNetra**, and **SachNetra comparison**.
3. Add a row to [`_index.md`](./_index.md).
4. Set `status: documented`.

### 3. Compare & recommend (non-skippable)

Every entry MUST include:

- **What SachNetra already does** — cite actual paths, not vibes.
- **Gap analysis** — table of repo pattern vs our pattern vs recommendation.
- **Improvement backlog** — each item tagged Pursue / Park / Kill with rationale.

Do not recommend "use this repo's stock predictor" without linking to our research state (most price-prediction repos fail out-of-sample — see [`research_state_summary.md`](../../sachnetra%20v2/wiki/syntheses/research_state_summary.md)).

### 4. Promote (optional)

Promote to wiki ONLY when the repo introduces a **concept**, **entity** (tool/framework), or **playbook** rule worth canonizing — same protocol as [`../README.md`](../README.md) §3.

Most repo entries stay `documented` forever. That's fine — they're reference material for future implementation tasks.

### 5. Re-review (periodic)

When a repo gets a major release or we change SachNetra architecture materially:

- Bump `last_reviewed` in frontmatter
- Refresh **SachNetra comparison** and verdicts
- Set `status: re-reviewed`

---

## Status lifecycle

| status | meaning |
|---|---|
| `queued` | URL logged in `_index.md`, not yet documented |
| `documented` | Template fully filled, comparison complete |
| `re-reviewed` | Updated after repo or SachNetra change |
| `promoted_to_wiki` | Concept/entity/playbook graduated to wiki |

---

## What this folder is NOT

- **Not a license audit.** Note license in frontmatter; legal review is out of scope here.
- **Not an auto-import list.** Forking or vendoring requires a filed V2 task.
- **Not a substitute for experiments.** "Repo X does Y" ≠ "Y works on SachNetra data."

---

## Changelog

| Date | Change | Why |
|---|---|---|
| 2026-05-30 | Initial creation — README, GEMINI_BRIEF, _index, TEMPLATE_REPO | Lijo wants a structured place for quant GitHub repos with Gemini-driven SachNetra comparison. |
| 2026-05-30 | Added FEATURE_RUBRIC.md + feature tiers in template/brief | Agent rates features Poor/Good/Better/Excellent and outputs "Best to have in SachNetra" shortlist. |
| 2026-05-30 | TEMPLATE_REPO: evidence cross-check, domain map, design principles, net verdict, corrections log | Prevent Gemini from overstating SachNetra (e.g. "perfect tagging" without gate data). |
