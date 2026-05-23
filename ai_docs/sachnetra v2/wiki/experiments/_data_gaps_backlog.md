---
tags: [experiment, sachnetra, research, backlog, data-gaps, action-items, task-staging]
source: [[sachnetra_research_playbook]]
related: [[Exp1]], [[Exp2]], [[Exp3]], [[Exp4]]
status: LIVING — append as each experiment surfaces a gap
last_updated: 2026-05-22
audience: Lijo, James, future Claude Code sessions
---

# Data-Layer Gaps & Action Items — Backlog (staging for a future bundled task)

> **Why this doc exists.** Every experiment in the research program (`[[sachnetra_research_playbook]]`)
> surfaces concrete data-collection / data-quality gaps that block stronger validation. Rather than
> file a task per gap mid-research, we **accumulate them here**. Lijo will author **one bundled
> implementation task** after running Exp 5–~9, drawing from this list. This is the source of truth
> for that future task — keep it current.
>
> **Not a task file.** No implementation steps here — just the gap, the evidence, the owner, and what
> it unblocks. The task file (when written) lives in `ai_docs/tasks/` and follows
> `ai_docs/dev_templates/adapt_sprint_task.md`.

---

## How to read the Owner column

- **James** — prod pipeline / collector work (`india_*` tables, seed scripts). Implements per
  [[feedback-task-authoring-vs-impl]].
- **Claude (research lane)** — `scripts/research/*` + `research_*` tables only; never touches prod
  `india_*` tables. Claude authors, **Lijo runs** ([[feedback-v2-prod-execution]]).
- **Research check** — an analysis/calibration step, not an engineering change.

---

## The backlog (as of Exp 4, 2026-05-22)

| # | Gap | Surfaced by | Evidence (numbers) | Subsystem | Owner | Leverage | What it unblocks |
|---|---|---|---|---|---|---|---|
| **G1** | **`india_news_signals.nse_tickers` tagging coverage is ~1.7%, large-cap only** | Exp 4 | 301 / 17,461 news rows have a non-empty `nse_tickers`; all are Nifty large-caps (ITC, RELIANCE, SBIN…). `companies` is no better (~2.1%). | News enrichment pipeline | **James** | **HIGHEST** | The mid/small-cap rerun of Exp 4 (the *valuable* "beat journalists by hours" case). Also unblocks any future per-ticker news↔price/announcement join. |
| **G2** | **Ticker format mismatch across tables** | Exp 4 | News stores Yahoo-suffixed `SBIN.NS`; announcements store bare `SBIN`; `research_prices` uses `*.NS`. Mismatch silently zeroed Exp 4's first run. | News pipeline / shared convention | **James** | Med | Any join between `india_news_signals` ↔ `india_bourse_announcements`. Pick one canonical form (bare NSE symbol) at write time, or document the divergence loudly. |
| **G3** | **DII flows barely collected** | Exp 1 | `india_institutional_flows`: ~3,965 FII rows vs **~31 DII rows**. Collection bug, not a market fact. | FII/DII collector (V2-017) | **James** | High (for DII) | All DII research (the DII variant of Exp 1 is currently untestable at n=31). |
| **G4** | **`research_prices` is Nifty-50 only** | Exp 2 | Announcements span 2,104 symbols; only 46 Nifty-50 names + ^NSEI priced → **96% (16,617/17,322) of filings unpriceable**. | Research scripts (`backfill-research-prices.mjs`) | **Claude (research lane)** | Med | Category-level Exp 2 (Product A core); any single-stock event study beyond large-caps. Widen to Nifty 200/500. |
| **G5** | **`TATAMOTORS.NS` missing from prices** | Exp 1 | Yahoo 404 — post-demerger ticker rename. The one missing Nifty-50 name. | Research scripts / `market-taxonomy.json` | **Claude (research lane)** | Low | Tata Motors single-stock work; tidies the price universe. |
| **G6** | **Sentiment scorer positivity bias** | Exp 3 | 14 of 16 daily-mean sentiment values positive (~88%); series mean +0.21. A scorer positive 88% of the time has weak discriminating power. | Sentiment scorer (`_sentiment-chain.mjs` / FinBERT) | **Research check** (then maybe James) | Low–Med | Trustworthy use of sentiment as a model feature. Needs a calibration spot-check (raw-score distribution + labelled sample) BEFORE sentiment becomes an input. |

---

## Survivorship-bias ceiling (note, not a fixable "gap")

Flagged by Exp 2 / Exp 4 and worth carrying into the task discussion: `research_prices` (Yahoo) holds
only the **current** Nifty universe. Delisted / blown-up names — exactly where auditor-resignation and
promoter-pledge alpha lives — are absent. Widening to Nifty 200/500 (G4) helps breadth but does **not**
fix survivorship; a true fix needs a point-in-time universe (hard with free data). Treat as a known
ceiling on any single-stock filing study, not a backlog item to "close."

---

## The pattern across all four experiments (the meta-finding)

Every experiment's bottleneck has been **data coverage or calendar time, not method**:

| Exp | Verdict | The binding data gap |
|---|---|---|
| 1 | ❌ FII doesn't lead direction (coincident only) | G3 (DII uncollected) |
| 2 | ⬜ inconclusive | G4 (Nifty-only prices) + rolling-30-day announcement window (time) |
| 3 | ⬜ inconclusive | series only 16 days old (time) + G6 (positivity bias) |
| 4 | 🟡 first leading signal, but gated | G1 (tagging 1.7%) + G2 (format) |
| 5 | ⏸ deferred (not run) | sentiment too young for tails (time) — revisit ~Aug 2026 |
| 6 | 🟡 supported *unconditionally* (tempered by Exp 7) | **none new** |
| 7 | ❌ null — \|flow\| not incremental to GARCH | **none new** |

Note: Exp 6 and Exp 7 (FII flow → volatility, and its GARCH-X control) surfaced **no new data gap** — both
ran on data we already own. Exp 7 showed Exp 6's signal is not incremental to GARCH vol-persistence.
Their follow-ups (fix the GARCH-X self-test, Student-t/GJR refinements) are *method* extensions, not
data-collection tasks — they stay in the research lane, not the James bundled task.

**Implication for the future task:** the highest-value engineering investment is **G1 (ticker tagging
coverage)** — it's the gate on the only *leading* signal the program has found. G2 rides along (same
subsystem). G3 is independent and high-value for DII. G4/G5 are Claude's research lane (don't put them
in a James task). G6 is a research check, not a build.

---

## Two gaps already addressed (don't re-file)

- **Exp 4's `.NS`-suffix bug in the research script** is FIXED in `scripts/research/exp4-bourse-leads-news.mjs`
  (`norm()` strips `.NS`/`.BO`). G2 is the *broader, prod-side* version of standardizing this — still open.
- The empty-join was diagnosed and the evidence preserved in `[[Exp4]]` §14 (the temp probe was deleted).

---

## When you author the bundled task

1. Re-read this table + the §"Action items" section of each `Exp*.md` for the latest numbers (they
   change as collectors run — e.g. G1's 1.7% and G3's 31 rows will move).
2. Decide scope (one focused task vs. split) — the Step 0 analysis already done on 2026-05-22 favored a
   **focused G1+G2 news-tagging task** with the rest as this backlog; revisit after Exp 5–9.
3. Keep Claude-lane items (G4/G5) OUT of the James task — they're `scripts/research/` work Lijo runs.
4. Follow `ai_docs/dev_templates/adapt_sprint_task.md`; file under `ai_docs/tasks/`.

---

## Changelog
| Date | Change |
|---|---|
| 2026-05-22 | Created after Exp 1–4. Logged gaps G1–G6, the survivorship ceiling, the cross-experiment meta-finding, and the two already-addressed items. Staging ground for the bundled task Lijo will author after Exp 5–~9. |
