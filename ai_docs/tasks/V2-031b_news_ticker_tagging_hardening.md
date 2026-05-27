# Task V2-031b — G1 News Ticker Tagging Hardening

*SachNetra Adapt Sprint — quant data layer (precision + recall fix on the V2-031 tagger; unblocks Exp 11)*

**Depends on**: V2-031 ✅ (deployed 2026-05-26)
**Estimated time**: 3–5 h engineering + 24h Lijo prod observation window
**Prep docs**: `scratch/V2-031b_gemini_rerun_instructions.md`, `scratch/V2-031b_research_log.md`, `scratch/V2-031b_parallel_prep_findings.md`, `ai_docs/sachnetra v2/wiki/experiments/exp11_brief.md` §3
**V1 or V2**: V2 (V2-031b — hardening pass on G1; not a new collector)

---

## Context Manifest

*Read these BEFORE any code work. Skip the "Don't load" list.*

### Load (in order)

1. `CLAUDE.md` — verify Sacred Files (this task touches **none** of them)
2. `.agents/rules/sachnetra-boundaries.md` — V2 scope guard
3. `.agents/rules/sachnetra-patterns.md` — seed script conventions
4. **Why this task exists:**
   - `ai_docs/sachnetra v2/wiki/experiments/exp11_brief.md` §3 — G1 gates blocking Exp 11
   - `scripts/research/output/exp11/coverage_check.md` — prod FP/TP sample (63% precision)
   - `scripts/research/output/exp11/coverage_slice.md` — post-deploy 13% 24h coverage
5. **V2-031 baseline (do not re-derive architecture):**
   - `ai_docs/tasks/V2-031_g1_g2_news_ticker_tagging.md` — Decisions 1–10
   - `scripts/build-equity-master.mjs` — build pipeline levers
   - `scripts/_india-market-keywords.mjs` — runtime matcher (word-boundary regex)
   - `shared/nse-equity-master.json` — current alias map
6. **Gemini v2 research deliverables (accepted 2026-05-27):**
   - `scratch/v2-031b_negative_keywords.json` — 99 build-time hardening actions (0 phantoms)
   - `scratch/v2-031b_positive_aliases.json` — 11 delta alias overlays
   - `scratch/v2-031b_regression_checklist.csv` — 30 prod sample rows annotated
   - `scratch/v2-031b_ticker_classification.csv` — 2,386-row classification
   - `scratch/v2-031b_short_tickers.csv` — ≤4 char symbol audit
   - `scratch/v2-031b_research_log.md` — prior art + recommendation
   - `scratch/V2-031b_parallel_prep_findings.md` — Claude build-chain map

### Don't load

- Full wiki syntheses (except `exp11_brief.md` above)
- V2-032+ task files, other collectors (V2-018, V2-030, …)
- `src/`, `api/`, variant configs — no frontend work
- HuggingFace / spaCy NER exploration — explicitly deferred (Decision 2 from V2-031 stands)

### Skill / template lineage

- Generated from: Gemini v2 recon + Claude parallel prep + `adapt_sprint_task.md`
- Prod boundary: `memory/feedback_v2_prod_execution.md` — agent writes code + local smoke tests; **Lijo runs deploy + prod verification**

---

## Context — Current State

V2-031 shipped 2026-05-26. Prod recon (2026-05-27) shows **G1 still fails Exp 11 gates**:

| Gate | Target | Measured (post-deploy) | Source |
|---|---|---|---|
| Precision | ≥90% | **~63%** (19/30 TP on spot-check) | `coverage_check.md` §11.3 |
| Coverage (24h) | ≥20% | **13.06%** | `coverage_slice.md` headline table |
| Coverage (7d blended) | ≥20% | 3.21% (misleading — mostly pre-deploy rows) | `coverage_slice.md` |

**Root cause (confirmed):** false positives from **bare symbol aliases** and **cascade single-word aliases** registered in `nse-equity-master.json` (e.g. `IPL`, `RAIN`/`Rain`, `Engineers`). The runtime matcher is word-boundary regex — it is working as designed; the alias map is too permissive.

**Recall gaps (coverage):** collision-filtered parent aliases (`L&T`, `SBI`, `HDFC`, bare `Siemens`) and brand/casing variants (`PhysicsWallah`, `JSW Utkal Steel`) missing from effective alias map.

**Forward-tag only:** no backfill ran on prod. Cutover detection in `coverage_slice.md` confirms step-change at 2026-05-26, not flat high line.

---

## What This Task Does

Harden the **build-time** alias map — not a new runtime architecture.

1. Extend `scripts/build-equity-master.mjs` to ingest Gemini v2 actions + alias overlays
2. Rebuild `shared/nse-equity-master.json` (+ `.collisions.log`)
3. Add local regression smoke test against `scratch/v2-031b_regression_checklist.csv`
4. **No DDL changes.** **No change to `seed-india-signals.mjs`.** Format stays bare NSE symbols (V2-031 Decision 4).

### Explicit non-goals

- No parallel runtime stoplist JSON loaded by `_india-market-keywords.mjs` (unless smoke tests prove build-time alone insufficient — unlikely)
- No HuggingFace/spaCy NER in the 10-min cron hot path
- No Hindi/multilingual tagging
- No historical backfill (Phase 4 optional — Lijo decision after gates pass)

---

## Locked Implementation Decisions

### D1 — All hardening flows through the build script

Load at build time:

- `scratch/v2-031b_negative_keywords.json` → apply `actions[]`
- `scratch/v2-031b_positive_aliases.json` → apply `alias_overlays`

Commit copies under `scripts/research/output/v2-031b/` after first successful build (same pattern as v2-031 recon artifacts) OR reference `scratch/` directly — **pick one path in PR; prefer `scripts/research/output/v2-031b/` for permanence.**

### D2 — Action types (from v2 schema)

| `action_type` | Build behavior |
|---|---|
| `drop_bare_symbol_alias` | Remove alias equal to ticker SYMBOL (case-sensitive match on alias string) |
| `drop_alias` | Remove specific alias string (`alias_to_drop` field) |

Apply actions **after** cascade + proposal overlay, **before** collision filter — except where noted below.

### D3 — Restore collision-filtered parent aliases via `INTENTIONAL_MULTI_TAG`

Extend the existing post-filter escape hatch in `build-equity-master.mjs`:

```js
const INTENTIONAL_MULTI_TAG = {
  'Tata Motors': ['TMCV', 'TMPV'],           // existing
  'L&T': ['LT'],
  'SBI': ['SBIN'],
  'HDFC': ['HDFCBANK'],                      // post-merger canonical
  'Siemens': ['SIEMENS'],                    // NOT ENRIN — see Risk note
};
```

Attach **after** collision filter (same as Tata Motors). Document in build log output.

**Risk note — Siemens vs ENRIN:** bare `siemens` is first-word-ambiguous between `SIEMENS` and `ENRIN`. Map `'Siemens': ['SIEMENS']` only. Headlines about Siemens Energy should match `ENRIN` via multi-word aliases (`Siemens Energy`, etc.). Regression row for Siemens Energy headlines is out of scope — flag if observed post-deploy.

### D4 — Apply positive overlays after collision filter

For each entry in `alias_overlays`:

- `add_aliases[]` → add to ticker entry (if not collision-blocked)
- `drop_aliases[]` → remove from ticker entry

Overlays in v2: `PWL`, `SIEMENS`, `JSWSTEEL`, `LT`, `SBIN`, `HDFCBANK`, `RELIANCE`, `JUBLFOOD`, `EICHERMOT`, `PAGEIND`, `CELLO`.

### D5 — Claude prep correction (implement even if v2 JSON omits)

Prod FP row 8 (`Rain Disrupts Life…`) matches cascade alias **`Rain`**, not symbol `RAIN` alone. Ensure build applies:

```json
{ "symbol": "RAIN", "action_type": "drop_alias", "alias_to_drop": "Rain" }
```

Same pattern for `DOLLAR` / alias `Dollar` if cascade present. Verify in rebuilt master before commit.

### D6 — PAGEIND: drop bare `Page`, keep `Jockey` + denylist_context

v2 actions include `drop_alias: "Page"` on PAGEIND. Preserve existing `denylist_context` and Jockey brand overlay.

### D7 — No `.NS` suffix regression

Output bare symbols only. Prod sample rows showing `BHARTIARTL.NS` are legacy/pre-G2 rows — forward tags must emit bare `BHARTIARTL`.

---

## Files To Open Before Starting

| File | Why |
|---|---|
| `scripts/build-equity-master.mjs` | Primary implementation surface |
| `scripts/_india-market-keywords.mjs` | Confirm no change needed unless smoke fails |
| `scripts/research/output/v2-031/alias_proposal.json` | Existing overlay source |
| `scratch/v2-031b_negative_keywords.json` | 99 hardening actions |
| `scratch/v2-031b_positive_aliases.json` | 11 recall overlays |
| `scratch/v2-031b_regression_checklist.csv` | Acceptance test vectors |
| `scripts/research/exp11-coverage-check.mjs` | Post-deploy prod gate script (Lijo) |

---

## Implementation Phases

### Phase 1 — Build script hardening

- [x] Add loader for v2 negative actions JSON
- [x] Add loader for v2 positive alias overlays JSON
- [x] Implement `drop_bare_symbol_alias` + `drop_alias` applicators
- [x] Extend `INTENTIONAL_MULTI_TAG` per D3
- [x] Add D5 RAIN/DOLLAR cascade alias drops if missing from JSON
- [x] Log action counts at build time (applied / skipped / unknown ticker)
- [x] Fail build if any action `symbol` not in master (phantom guard)

### Phase 2 — Rebuild + commit artifacts

- [x] Verify `shared/nse-equity-master.json` diff is reviewable
- [x] Verify `shared/nse-equity-master.collisions.log` — expected ambiguous groups still dropped (`reliance`, `tata`, `adani`, …)
- [x] Spot-check seed FPs removed: IPL, TAKE, RAIN, FOCUS, MAMATA, RETAIL, MARATHON, ROUTE, TOTAL, ENGINERSIN (`Engineers` gone)
- [x] Spot-check recall restored: L&T, SBI, HDFC, PhysicsWallah, Siemens, JSW Utkal Steel

### Phase 3 — Local regression smoke test

Add `scripts/smoke-test-tagger-v2-031b.mjs` (NEW):

- [x] Read `scratch/v2-031b_regression_checklist.csv`
- [x] Run `extractCompanies(headline_snippet)` for each row
- [x] Compare against `v2_expected_result` column
- [x] Exit 0 only if ≥27/30 pass (90% gate) — **achieved 30/30** (after ITC `INTENTIONAL_MULTI_TAG` fix)
- [x] `npm run typecheck` + `npm run lint` + `node scripts/smoke-test-tagger.mjs` (V2-031 assertions still pass)

**ITC fix (pre-deploy):** added `'ITC': ['ITC']` to `INTENTIONAL_MULTI_TAG` — row 22 now passes (ITC vs ITCHOTELS first-word collision).

### Phase 4 — Lijo prod deploy + verification (NOT agent)

**Agent stops after Phase 3.** Lijo:

1. Merge + deploy (Railway picks up new `nse-equity-master.json` on next cron cycle)
2. Wait **24h** post-deploy
3. Run read-only probes:
   ```bash
   node scripts/research/exp11-coverage-check.mjs
   node scripts/research/exp11-coverage-slice.mjs
   ```
4. Paste outputs into `exp11_brief.md` §11.1–11.3
5. Manual precision eyeball on §11.3 sample (30 rows) — target ≥90%

### Phase 5 — Backfill (OPTIONAL — Lijo decides after gates pass)

Only if Phase 4 passes all gates **and** Exp 11 universe choice needs historical tagged rows.

- Reuse V2-031 `scripts/backfill-news-tags.mjs` pattern OR one-shot retag script
- **Not in agent scope for initial PR**

---

## Acceptance Gates

| # | Gate | Threshold | Measured by |
|---|---|---|---|
| G1 | Local regression smoke | ≥27/30 rows pass | `smoke-test-tagger-v2-031b.mjs` |
| G2 | Phantom symbols in actions | 0 | build-time guard |
| G3 | Seed FP block | 0/10 seed FPs tag on their prod headlines | smoke test rows 1,7,8,10,14,19,24,25,26,27 |
| G4 | Post-deploy precision | ≥90% | Lijo eyeball on `coverage_check.md` §11.3 |
| G5 | Post-deploy 24h coverage | ≥20% | `coverage_slice.md` headline 24h row |
| G6 | Routing | G4+G5 pass → **unblock Exp 11**; any fail → **V2-031c** |

---

## Verify (agent-local)

```bash
npm run typecheck
npm run lint
node scripts/build-equity-master.mjs
node scripts/smoke-test-tagger-v2-031b.mjs
```

Expected smoke output: `27/30 or better PASS`; list any `TP_PARTIAL → TP_FULL` upgrades (rows 12, 17, 21, 22).

---

## Verify (Lijo prod — post-merge)

```bash
node scripts/research/exp11-coverage-check.mjs
node scripts/research/exp11-coverage-slice.mjs
```

Update `exp11_brief.md` §11 and §5 precondition #1 status.

---

## Sacred Files

**None.** This task does not touch:

- `src/config/variants/full.ts` (or tech/finance)
- `scripts/seed-insights.mjs`

---

## Environment Variables

No new env vars. Uses existing Railway deploy path for `seed-india-signals.mjs`.

---

## Completion Log

| Date | Who | What |
|---|---|---|
| 2026-05-27 | Claude | Task file authored from accepted Gemini v2 deliverables + parallel prep |
| 2026-05-27 | Agent | Phases 1–3 complete: build hardening, master rebuild, smoke 29/30 pass |

---

## Known Follow-ups (out of scope)

- **V2-031c** — if coverage still <20% after alias hardening: body-text fetch (V2-031 Decision 3 deferral) or selective NER
- **Exp 11** — only after G4+G5 pass; see `exp11_brief.md` §5
- **`.NS` legacy rows** in prod — cosmetic; forward tags are bare per V2-031 G2

---

## Research Appendix — v2 Deliverable Summary

| Artifact | Count | Status |
|---|---|---|
| Hardening actions | 99 (95 drop_bare_symbol, 4 drop_alias) | ✅ 0 phantoms |
| Alias overlays | 11 tickers | ✅ validated |
| Classification CSV | 2,386 rows | ✅ |
| Short tickers CSV | 393 rows | ✅ |
| Regression checklist | 30 rows | ✅ |
| Research log citations | 12 (A1–A4) | ✅ |

**v2 fixes all 12 first-run flags** — see `scratch/v2-031b_research_log.md` Part F.
