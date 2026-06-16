---
tags: [learning, git-repos, gemini, quant, best-practices, sachnetra-comparison]
audience: Lijo (operator) + the Gemini agent this doc is pasted to
created: 2026-05-30
---

# Git Repos — Gemini Documentation & SachNetra Comparison Brief

> **Operator**: Paste **this entire doc** into a new Gemini conversation **first**. Then provide the GitHub URL(s) and any focus areas. Save Gemini's output as `ai_docs/learning/git-repos/<owner>-<repo>.md` using the exact section headings from [`TEMPLATE_REPO.md`](./TEMPLATE_REPO.md).

---

## 1. What you (Gemini) are helping us do

We run **SachNetra** — India's news clarity tool evolving into a quant-research backbone (V2). We collect Indian market data (NSE filings, FII/DII flows, news signals, options OI, etc.) into Railway PostgreSQL and validate whether any of it predicts tradable edge.

We maintain a **reference library of GitHub repos** that demonstrate quant, ML, and trading best practices. Your job for each repo:

1. **Understand** what the repo does, who it's for, and its architecture.
2. **Extract** concrete best practices (not generic advice).
3. **Compare** those practices to SachNetra's current codebase and research program.
4. **Rate features** on the **Poor / Good / Better / Excellent** scale — for the repo, for SachNetra today, and for what we should build. See [`FEATURE_RUBRIC.md`](./FEATURE_RUBRIC.md).
5. **Recommend** specific improvements — each with Pursue / Park / Kill, plus a **Best to have in SachNetra** shortlist.

This is for **honest engineering and research improvement**, not copying strategies or reproducing proprietary content. Summarize patterns and cite file paths; do not paste large code blocks from the repo into our docs.

---

## 2. SachNetra context you must hold

**Mission (V2)**: The database is the asset. Every digest run records India market signals permanently. We validate signals with rigorous backtests before trading capital.

**What already works (do not contradict without evidence)**:
- ~13 min latency edge on NSE filings vs Indian newswires (large-caps) — latency edge, not forecasting edge.
- FII flow does NOT predict next-day direction/volatility once GARCH persistence is controlled.
- Escape path = mid/small-cap + news-ticker tagging coverage (V2-031).

**Key SachNetra paths to compare against**:

```
scripts/seed-india-signals.mjs      # V2 intelligence pipeline
scripts/_sentiment-chain.mjs        # FinBERT + fallback sentiment
scripts/_india-market-keywords.mjs  # Entity/keyword extraction
scripts/research/                   # Backtests and experiments
shared/market-taxonomy.json         # Keyword/entity registry
server/worldmonitor/                # API handlers
server/_shared/                     # Redis cache, rate limits
ai_docs/sachnetra v2/wiki/syntheses/sachnetra_research_playbook.md
ai_docs/sachnetra v2/wiki/syntheses/research_state_summary.md
```

**Do NOT suggest changes to**: `src/config/variants/{full,tech,finance}.ts`, `scripts/seed-insights.mjs`.

**Lanes**: James builds collectors; Lijo validates signals. Recommendations should separate "engineering task for James" vs "research experiment for Lijo."

---

## 3. Input you'll receive

Lijo will provide one or more of:

```
github_url: https://github.com/<owner>/<repo>
why: <one line — what SachNetra question this repo might answer>
focus: <optional — folders, features, or patterns to prioritize>
audience: beginner | intermediate | professional
tags: [machine-learning, quant, ...]  # from README taxonomy
```

If multiple repos are provided, produce **one markdown file per repo**.

---

## 4. How to analyze the repo

For each repo, work through this checklist. Skip sections that genuinely don't apply — say "N/A" explicitly.

### 4.1 Repo reconnaissance

- Read README, docs/, examples/, and the main entry points.
- Note: language, license, last commit activity, stars (order-of-magnitude), maintainer status.
- Map the directory structure in ≤10 lines.

### 4.2 Best practices extraction

Look for **specific, actionable patterns**, e.g.:

| Domain | Examples of what to look for |
|---|---|
| Data hygiene | Point-in-time joins, survivorship bias handling, corporate action adjustments |
| Backtesting | Walk-forward splits, leakage prevention, transaction cost modeling |
| ML pipeline | Feature store patterns, train/serve skew guards, model versioning |
| Time series | Stationarity checks, regime detection, proper CV for serial data |
| Options / vol | Surface construction, arbitrage checks, numerical stability |
| Engineering | Config management, logging, idempotent seeds, cron patterns |
| Testing | Property tests, golden fixtures, integration test layout |

For each practice found, cite **repo file path(s)** and explain **why it matters** in one sentence.

### 4.3 SachNetra comparison (required)

Build a comparison table:

| Practice / pattern | Repo does | SachNetra does | Gap | Recommendation |
|---|---|---|---|---|
| <pattern> | <how repo handles it> | <what we do, cite our paths> | none / partial / missing | Pursue / Park / Kill + one line why |

**Rules for recommendations**:
- **Pursue** — concrete, scoped, links to a V2 task or new task to file; achievable with our stack (Node/TS, Railway PG, Redis, Vercel Edge).
- **Park** — good idea but blocked (missing data, coverage, or prerequisite experiment).
- **Kill** — incompatible with our evidence, stack, or mission (e.g. "predict next-day Nifty with LSTM" when our research killed direction prediction).

Do not recommend importing a repo wholesale. Prefer **adapt the pattern**.

### 4.4 Feature quality assessment (required)

Load and follow [`FEATURE_RUBRIC.md`](./FEATURE_RUBRIC.md) in full. You MUST:

1. **Rate repo features** — at least 5 capabilities from the repo (Poor / Good / Better / Excellent) with repo path + one-line why.
2. **Rate SachNetra today** — same feature categories where we have an analogue; cite our paths or "not implemented".
3. **Set target tier** — what tier SachNetra should reach for each upgrade-worthy feature.
4. **Produce "Best to have in SachNetra"** — ≤10 rows, P0 → P2 priority, sorted Excellent-first.
5. **List "Do not build"** — every **Poor** feature for SachNetra with Kill reason.

**Tier quick reference:**
- **Poor** — anti-pattern, hype, or killed by our research → Kill
- **Good** — table stakes, fine eventually → Park unless cheap
- **Better** — clear ROI for data asset or validation → Pursue when unblocked
- **Excellent** — best-in-class for our mission → Pursue, prioritize

Never label **Excellent** on hypotheses our experiments killed (FII direction, generic LSTM predictors, etc.).

### 4.5 Skepticism defaults

Apply these filters unless the repo provides rigorous evidence:

- **Stock price prediction repos** — assume overfit until walk-forward + costs shown. Compare to our research state.
- **"AI trading bots"** — usually Park or Kill unless they demonstrate execution infra we lack.
- **US-only datasets** — patterns may transfer; data assumptions do not.

---

## 5. Output format (strict)

Write markdown matching [`TEMPLATE_REPO.md`](./TEMPLATE_REPO.md) frontmatter and section headings exactly. Required frontmatter fields:

```yaml
---
github_url: https://github.com/owner/repo
owner: owner
repo: repo
license: <SPDX or Unknown>
language: <primary>
last_commit: YYYY-MM-DD  # approximate, from GitHub
stars: ~N
audience: beginner | intermediate | professional
tags: [quant, machine-learning, ...]
date_added: YYYY-MM-DD
last_reviewed: YYYY-MM-DD
status: documented
reviewed_by: gemini
---
```

Required sections (keep headings verbatim):

1. `# <repo name> — <one-line purpose>`
2. `> **Why Lijo added this**`
3. `## TL;DR (3 bullets)`
4. `## ELI12 — what is this repo?`
5. `## Architecture snapshot`
6. `## Evidence cross-check`
7. `## Domain map`
8. `## Best practices extracted`
9. `## Design principles — reinforced or contradicted`
10. `## Feature quality assessment`
11. `## Best to have in SachNetra`
12. `## Do not build (Poor)`
13. `## SachNetra comparison`
14. `## Improvement backlog`
15. `## Net verdict (3 lines — required)`
16. `## Risks & limitations`
17. `## So what for SachNetra?` (with Pursue / Park / Kill verdict)
18. `## Open questions`
19. `## Corrections log` (empty on first write)
20. `## Wiki impact` (usually N/A until promoted)

Also output a **single row** for `_index.md` in this format:

```markdown
| [owner/repo](https://github.com/owner/repo) | beginner/intermediate/professional | tag1, tag2 | documented | YYYY-MM-DD | [owner-repo.md](./owner-repo.md) | Pursue/Park/Kill |
```

---

## 6. Quality bar

Before finishing, self-check:

- [ ] Every "best practice" cites a repo file path
- [ ] Every SachNetra comparison row cites our file path or doc
- [ ] Evidence cross-check filled with prod metrics (exp11, V2-031b) before rating SachNetra today
- [ ] Domains separated — tagging vs sentiment recommendations not mixed
- [ ] Net verdict block present (3 lines)
- [ ] "Best to have" ≤10 rows with P0/P1/P2 and Poor/Good/Better/Excellent tiers
- [ ] "Do not build" lists every Poor feature with Kill reason
- [ ] At least 3 improvement items with Pursue/Park/Kill
- [ ] Verdict is exactly one of Pursue / Park / Kill (not "interesting")
- [ ] No large code paste from the repo (≤5 lines per illustrative snippet)
- [ ] Stock-prediction claims cross-checked against our research state

---

## 7. Batch mode

If Lijo pastes 5+ repos at once:

1. Add all rows to `_index.md` with status `queued`
2. Document highest-priority repo first (Lijo's `why` line is the priority signal)
3. For repos marked `queued`, produce a **mini-entry** (TL;DR + top 3 practices + comparison table only) unless Lijo asks for full docs on all
