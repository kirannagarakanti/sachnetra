# Task V2-031d — G1 Historical Re-Tag Backfill + Cutover

*SachNetra quant data layer — finish G1 by upgrading the ~70k historical `india_news_signals` rows to the current alias-driven tagger, so the joinable tagged set is no longer confined to recent rows. Unblocks the tagging half of [[Exp20]] (and every per-stock use of the news archive).*

**Depends on**: V2-031 ✅ (2026-05-26) · V2-031b ✅ (forward hardening, deployed) · V2-031c ✅ (micro-patch)
**Estimated time**: ~30 min Lijo prod execution (backfill is I/O-bound over ~70k rows) + read-only verification
**V1 or V2**: V2 (pipeline data task — writes `india_news_signals`)
**Prod boundary**: `memory/feedback_v2_prod_execution.md` — **Lijo runs all prod writes** (backfill + cutover SQL); agent provides code + read-only checks only.

---

## Context Manifest

*Read these BEFORE any code work. Skip the "Don't load" list.*

### Load (in order)
1. `CLAUDE.md` — Sacred Files check (this task touches **none**)
2. `.agents/rules/sachnetra-boundaries.md` — V2 scope guard
3. `memory/feedback_check_disk_before_prod_writes.md` — **why Phase 0 exists** (a prior backfill filled the volume → DB offline)
4. `scripts/backfill-news-tags.mjs` — the executor (already written; resume-safe)
5. `scripts/_india-market-keywords.mjs` — `extractCompanies()` = the current tagger this backfill applies
6. `ai_docs/tasks/V2-031b_news_ticker_tagging_hardening.md` — Phase 5 (backfill was deferred to "Lijo decides"); this task IS that decision
7. `ai_docs/sachnetra v2/wiki/experiments/exp20_brief.md` §1.1, §4.4 — the coverage blocker this unblocks

### Don't load
- `src/`, `api/`, variant configs — no frontend
- Other collectors (V2-018, V2-030, …), full wiki syntheses
- HuggingFace/spaCy NER — still deferred (V2-031 Decision 2 stands)

---

## Context — Current State (verified read-only, 2026-06-09)

| Fact | Value | Source |
|---|---|---|
| Live forward tagger | `extractCompanies()` (alias map + denylist + HTML-entity decode) — the GOOD tagger | `_india-market-keywords.mjs:90` |
| Forward write target | **`nse_tickers`** (v1) only | `seed-india-signals.mjs:341` |
| `nse_tickers_v2` shadow column | **exists, 0% populated** (DEFAULT NULL, never backfilled) | `check-sentiment-calibration.mjs` run |
| `india_news_signals` rows | ~70,426 | same |
| Tagged (nse_tickers) coverage | 4.5% overall (≈correct — ~95% of firehose is macro/non-company news) | same |

**The gap:** historical rows were tagged by *older* tagger versions (pre-V2-031b/c) or never re-tagged. The forward path is healthy; **history is stale.** Re-tagging history with the current `extractCompanies` is the remaining G1 work.

**Honest scope note (do not oversell):** this fixes the **tagging** pipe only. [[Exp20]]'s decisive ablation also needs the **sentiment-scoring** pipe widened (only **4.2%** of rows are scored at all → tagged∩scored = 429 rows). That is a **separate follow-up task** (`V2-031e`/G6-scoring, not this one). After this backfill, re-run `check-sentiment-calibration.mjs` to measure the new tagged∩scored cross-section before declaring Exp20 unblocked.

---

## What This Task Does

Populate `nse_tickers_v2` for all historical rows from the current tagger (safe shadow write), verify it ≥ the live `nse_tickers`, then cut over so one healthy column remains. **No code changes** — the executor and tagger already exist. This task is a **runbook + read-only verification harness**.

### Explicit non-goals
- No change to `seed-india-signals.mjs`, the tagger, or the alias map (those are correct and live).
- No sentiment-scoring coverage work (separate task — see scope note).
- No new collector, no DDL beyond the optional final `DROP COLUMN`.

---

## Implementation Phases

### Phase 0 — Disk preflight (Lijo, read-only) — MANDATORY
```bash
node scripts/research/check-db-space.mjs
```
- [ ] Confirm the Railway volume has comfortable free headroom before any write.
- [ ] The backfill is an **in-place UPDATE** of a `TEXT[]` column on ~70k rows (mostly small/empty arrays) — far lighter than a row-insert backfill, but **do not skip this** (the `feedback_check_disk_before_prod_writes` scar). If tight, grow the volume first; never auto-retry a failed write against the live DB.

### Phase 1 — Backfill the shadow column (Lijo, prod write)
```bash
node scripts/backfill-news-tags.mjs
```
- [ ] Writes `nse_tickers_v2` for every row where it is NULL (resume-safe; re-runnable).
- [ ] Watch the streamed per-batch coverage line; expect the final coverage to be in the **low-single-digit %** range on the full firehose (most news is macro) — a *higher* number than the current v1 4.5% on the same rows is the win.
- [ ] Leaves live `nse_tickers` **untouched** → zero risk to the running pipeline / dashboard.

### Phase 2 — Verify v2 ≥ v1 (agent writes; Lijo runs — READ-ONLY)
New script `scripts/research/check-g1-backfill.mjs` (SELECT-only) reports:
- [ ] Overall coverage: `nse_tickers_v2` non-empty vs `nse_tickers` non-empty (whole table + by month).
- [ ] **Net delta**: rows where v2 tags but v1 was empty (the recall gain) and rows where v1 tagged but v2 is now empty (regressions — must be ~0).
- [ ] Precision spot-check: print 30 random `(headline, nse_tickers, nse_tickers_v2)` rows for a Lijo eyeball.
- [ ] tagged∩scored count after backfill (feeds the Exp20 readiness call).

### Phase 3 — Cutover (Lijo, prod write — ONLY if Phase 2 passes)
```sql
-- copy the verified shadow tags onto the live column (upgrades history)
UPDATE india_news_signals
   SET nse_tickers = nse_tickers_v2
 WHERE nse_tickers_v2 IS NOT NULL;
```
- [ ] Forward writes continue to populate `nse_tickers` (good tagger) — no pipeline change needed.
- [ ] Keep `nse_tickers_v2` as a backup for ~1 week, then optionally:
```sql
ALTER TABLE india_news_signals DROP COLUMN nse_tickers_v2;
```
- [ ] **Skip cutover and STOP** if Phase 2 shows material regressions — file findings, don't force it.

### Phase 4 — Re-measure Exp20 readiness (Lijo, read-only)
```bash
node scripts/research/check-sentiment-calibration.mjs
```
- [ ] Read the new **tagged∩scored** cross-section. If still too thin for a per-day panel, the next task is **scoring coverage**, not more tagging. Record the verdict in `exp20_brief.md` §1.1.

---

## Acceptance Gates

| # | Gate | Threshold | Measured by |
|---|---|---|---|
| G1 | Disk headroom before write | comfortable free space | `check-db-space.mjs` |
| G2 | Backfill completes | all NULL `nse_tickers_v2` rows written (0 pending) | script final line |
| G3 | No tagging regression | rows where v1 tagged but v2 empty ≈ 0 | `check-g1-backfill.mjs` |
| G4 | Recall gain | `nse_tickers_v2` coverage ≥ `nse_tickers` coverage on history | `check-g1-backfill.mjs` |
| G5 | Precision | ≥90% on 30-row eyeball | Lijo |

---

## Verify (agent-local)
```bash
npm run typecheck
npm run lint
node scripts/research/check-g1-backfill.mjs   # SELECT-only; safe to dry-run logic locally if a DB URL is present
```

## Sacred Files
**None.** Does not touch `src/config/variants/*.ts` or `scripts/seed-insights.mjs`.

## Environment Variables
None new. Uses `DATABASE_PUBLIC_URL`/`DATABASE_URL` from `.env.local` (read by the existing scripts).

---

## Completion Log
| Date | Who | What |
|---|---|---|
| 2026-06-09 | Claude | Task authored. Verified read-only: `nse_tickers_v2` 0% populated; live tagger already on `nse_tickers`; reframed G1-finish as historical re-tag + cutover (not a v2 "deploy"). |

## Known Follow-ups (out of scope)
- **V2-031e / G6-scoring** — widen sentiment-scoring coverage (4.2% → higher) so Exp20's tagged∩scored cross-section is dense enough. The *other* half of the Exp20 unblock.
- **Exp20 Part B** — run only after both pipes (this task + scoring) clear coverage.
</content>
