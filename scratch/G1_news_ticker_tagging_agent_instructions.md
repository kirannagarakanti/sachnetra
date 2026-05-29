# G1 — News→Ticker Tagging — Parallel Agent Instructions

**Date:** 2026-05-29  
**Your lane:** G1 only (news ticker tagging on `india_news_signals`).  
**Do NOT touch:** Exp 14, price backfills (`research_prices`), `scripts/research/backfill-*`, G4/G7 symbol lists, sacred files.  
**Sibling work:** Another Claude instance is running Exp 14 + microcap price backfill — stay out of `scripts/research/output/exp14/` and `shared/nifty-microcap250.json`.

---

## 0. What G1 is (30 seconds)

**G1** = fix `india_news_signals.nse_tickers` so headlines map to the right NSE symbols.

| Metric | Gate | Prod today (2026-05-28 probe) |
|--------|------|-------------------------------|
| **Precision** | ≥90% | ~63% — IPL/cricket, MAMATA/politician, TAKE/common word, etc. |
| **Coverage (24h new rows)** | ≥20% | ~13% (forward tagger live since 2026-05-26) |

**Why it matters:** Exp 4/10/11/14 event studies need news⇄filings joins. Low coverage + junk tags make mid/small-cap latency experiments untestable.

**Architecture (locked — do not reinvent):** dictionary alias match in `scripts/_india-market-keywords.mjs` → `extractCompanies(headline)` → `seed-india-signals.mjs:341` writes `nse_tickers`. Master dictionary: `shared/nse-equity-master.json` built by `scripts/build-equity-master.mjs`. **Headline-only** (no article body in pipeline).

---

## 1. What's already done (read this first — don't redo)

| Milestone | Status | Commit / artifact |
|-----------|--------|-------------------|
| V2-031 initial tagger (2,386-name master, bare symbols, denylist) | ✅ CODE COMPLETE 2026-05-26 | `06f8ec4a` |
| V2-031b hardening (99 drop actions, 11 positive overlays, smoke 30/30) | ✅ CODE COMPLETE 2026-05-27 | `b169da0c` |
| Prod deploy of V2-031b master | ❓ **LIKELY NOT LIVE** | Latest `coverage_check.md` (2026-05-28) still shows `IPL`×96, `TAKE`, `MAMATA` FPs |

**Your default mission:** get V2-031b **verified on prod** and gates green. Only open new engineering (V2-031c) if gates fail **after** a confirmed deploy + 24h window.

---

## 2. Context Manifest — load in order

1. `CLAUDE.md` + `.agents/rules/sachnetra-boundaries.md` (sacred files)
2. `ai_docs/tasks/V2-031_g1_g2_news_ticker_tagging.md` — baseline architecture (Decisions 1–10)
3. `ai_docs/tasks/V2-031b_news_ticker_tagging_hardening.md` — **your primary task file**
4. `scripts/research/output/exp11/coverage_check.md` — prod FP evidence
5. `scripts/research/output/exp11/coverage_slice.md` — 24h coverage slice
6. `ai_docs/sachnetra v2/wiki/experiments/exp11_brief.md` §3 + §5 — gates + unblock criteria

**Code surfaces (only these for G1):**

```
scripts/build-equity-master.mjs          ← build-time hardening
scripts/_india-market-keywords.mjs       ← runtime matcher (usually no change post-031b)
shared/nse-equity-master.json            ← deployed artifact
scripts/research/output/v2-031b/         ← hardening JSON inputs
scripts/smoke-test-tagger.mjs
scripts/smoke-test-tagger-v2-031b.mjs
scripts/research/exp11-coverage-check.mjs
scripts/research/exp11-coverage-slice.mjs
```

**Don't load:** `src/`, `api/`, variant configs, HuggingFace/spaCy NER rabbit holes, Exp 14 scripts.

---

## 3. Sacred files — NEVER write

```
src/config/variants/full.ts | tech.ts | finance.ts
scripts/seed-insights.mjs
```

Also: **do not edit** `scripts/seed-india-signals.mjs` (format cascades through `extractCompanies`). **No prod DDL/backfill** unless Lijo explicitly asks.

---

## 4. Decision tree (follow in order)

### Step A — Confirm repo state (5 min)

```bash
git pull
npm run typecheck
npm run lint
node scripts/smoke-test-tagger.mjs
node scripts/smoke-test-tagger-v2-031b.mjs
node scripts/build-equity-master.mjs
```

Expected: typecheck/lint clean; V2-031 smoke passes; **v2-031b smoke ≥27/30** (target 30/30).

If smoke fails → fix build/master per `V2-031b_news_ticker_tagging_hardening.md` Phase 1–3. **Do not proceed to prod probes until local smoke is green.**

### Step B — Is V2-031b deployed to Railway prod?

Ask Lijo if unsure. Proxy check (read-only, needs `.env.local` → **real prod** `DATABASE_URL`):

```bash
node scripts/research/exp11-coverage-check.mjs
```

**If `IPL` is still #1 in §11.2 with cricket-headline FPs in §11.3** → hardened master is **not** what cron is using. Stop coding; hand Lijo:

1. Merge `b169da0c` (or later) to the branch Railway deploys from
2. Confirm `shared/nse-equity-master.json` is in the deployed bundle
3. Wait **one full cron cycle** (10 min) + **24h** of new headlines

**Agent does not self-deploy prod.** Document status in task Completion Log.

### Step C — Post-deploy verification (24h after deploy)

```bash
node scripts/research/exp11-coverage-check.mjs
node scripts/research/exp11-coverage-slice.mjs
```

| Gate | Pass | Source |
|------|------|--------|
| G4 Precision | ≥90% on §11.3 sample (eyeball 30 rows) | `coverage_check.md` |
| G5 Coverage | ≥20% on **24h headline row** | `coverage_slice.md` |
| G3 Noise | `IPL`, `TAKE`, `MAMATA`, `FOCUS`, `RAIN`/`Rain` not in top-50 junk | `coverage_check.md` §11.2 |

Paste results into `exp11_brief.md` §11. Update `CLAUDE.md` V2-031b line when G4+G5 pass.

### Step D — Gates failed after confirmed deploy → V2-031c (engineering)

Only if Step B confirmed deploy AND Step C still fails:

1. Pull fresh FP headlines from `coverage_check.md` §11.3
2. For each FP, trace alias in `shared/nse-equity-master.json` (grep ticker + alias)
3. Add `drop_bare_symbol_alias` / `drop_alias` to `scripts/research/output/v2-031b/v2-031b_negative_keywords.json`
4. Rebuild + re-smoke (Step A)
5. **No parallel runtime stoplist** unless build-time alone cannot fix (task file says unlikely)

If coverage <20% but precision ≥90% → recall work: extend `v2-031b_positive_aliases.json` + `INTENTIONAL_MULTI_TAG` in `build-equity-master.mjs` (see V2-031b D3/D4). Do **not** add NER to the 10-min cron without a new task file.

### Step E — Gates passed → optional backfill + unblock

- Historical rows still mostly untagged (forward-only rollout). Optional: `scripts/backfill-news-tags.mjs` per V2-031 Decision 8 — **Lijo runs**, shadow column `nse_tickers_v2`
- Unblock **Exp 11** per `exp11_brief.md` §5
- **Do not** start Exp 11 in this lane unless asked — Exp 14 owns the other instance

---

## 5. Known FP patterns (pre-031b — verify gone post-deploy)

| Headline pattern | Wrong tag | Fix (031b) |
|------------------|-----------|------------|
| IPL 2026 cricket | `IPL` (India Pesticides) | `drop_bare_symbol_alias` on IPL |
| Mamata Banerjee politics | `MAMATA` (Mamata Machinery) | drop bare `MAMATA` |
| "could **take** a few days" | `TAKE` | drop bare `TAKE` |
| Rain disrupts life (weather) | `RAIN` via alias `Rain` | `drop_alias: "Rain"` |
| "in **focus**" market wrap | `FOCUS` | drop bare `FOCUS` |
| NH-44 highway | `NH` (Narayana Hrudayalaya) | may need 031c if still live |

Regression vectors: `scratch/v2-031b_regression_checklist.csv` (30 rows).

---

## 6. Out of scope (explicit)

- Exp 14 governance-shock re-run
- G4/G7 price universe / `research_prices` backfills
- OPS-001 research write guardrails (separate agent)
- DASH-001 dashboard (different repo `sachnetra-dashboard`)
- Article-body fetch / HF NER (V2-031c+ only, needs task file)
- Editing `seed-india-signals.mjs`, `src/`, sacred variants

---

## 7. Verify checklist (copy into your session report)

**Local (agent):**

- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — pass
- [ ] `node scripts/smoke-test-tagger.mjs` — pass
- [ ] `node scripts/smoke-test-tagger-v2-031b.mjs` — ≥27/30
- [ ] `git diff` shows no sacred files

**Prod (Lijo, after deploy):**

- [ ] `exp11-coverage-check.mjs` — §11.2 no IPL/TAKE/MAMATA dominance
- [ ] §11.3 precision ≥90%
- [ ] `exp11-coverage-slice.mjs` — 24h coverage ≥20%

---

## 8. First message to paste when opening the other Claude session

```
You own G1 (news→ticker tagging) only. Read scratch/G1_news_ticker_tagging_agent_instructions.md
then ai_docs/tasks/V2-031b_news_ticker_tagging_hardening.md.

V2-031b code is merged (b169da0c) but prod may not have the new nse-equity-master.json yet —
2026-05-28 coverage_check still shows IPL/TAKE/MAMATA false positives.

Start with Step A local smoke, then Step B deploy status with Lijo, then Step C after 24h.
Do not touch Exp 14, price backfills, or sacred files. Report back with gate table G3–G6.
```

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-29 | Created for parallel agent while Exp 14 runs in main session |
