# V2-031b Parallel Prep Findings

*Claude prep while Gemini reruns v2 deliverables — 2026-05-27*
*Purpose: map prod FPs/TPs → equity master → build-script levers so the implementation task can be authored in one pass when Gemini v2 lands.*

---

## 1. How tagging works today (end-to-end)

```
NSE EQUITY_L.csv
  → scripts/build-equity-master.mjs
  → shared/nse-equity-master.json (aliases + optional denylist_context)

seed-india-signals.mjs:329
  → extractCompanies(title) in _india-market-keywords.mjs
  → word-boundary regex, case-insensitive, per alias
  → nse_tickers: bare symbols at line 341
```

**V2-031b extends the BUILD, not a parallel runtime stoplist file.**

Runtime matcher (`_india-market-keywords.mjs`) is ~85 lines and already correct for word-boundary matching. The bugs are in **what aliases get into the master**.

---

## 2. Build script levers (where V2-031b changes go)

| Lever | Location | What it does today | V2-031b use |
|---|---|---|---|
| `HARD_DROP_ALIASES` | build-equity-master.mjs:62 | Drops generic words (`india`, `company`, …) | Extend cautiously — not the main FP fix |
| Collision filter 6(a) | build-equity-master.mjs:213 | Drops multi-ticker + first-word ambiguous aliases | Already blocks `siemens`, `jsw`, `reliance`, `tata`, … |
| `DENYLIST_CONTEXT` | build-equity-master.mjs:50 | 6 tickers require context words at runtime | Extend for high-FP symbols that must keep a risky alias |
| `alias_proposal.json` overlay | build-equity-master.mjs:172 | Brand aliases (Royal Enfield, Jockey, Airtel, …) | Merge Gemini v2 `alias_overlays` here |
| Symbol auto-alias | build-equity-master.mjs:166 | Every ticker gets its SYMBOL added as alias | **Root cause of IPL/TAKE/RAIN FPs** — needs conditional drop |
| Cascade aliases | generateCascadeAliases() | Strips suffixes → `"Rain"` from Rain Industries | **Root cause of RAIN/ENGINERSIN FPs** — needs alias drop list |
| `INTENTIONAL_MULTI_TAG` | build-equity-master.mjs:77 | Tata Motors → TMCV + TMPV | Leave alone |

**Proposed new build-time sets (implementation):**

```js
// Drop bare SYMBOL from aliases when symbol is high-FP-risk
BARE_SYMBOL_DROP = new Set(['IPL','TAKE','RAIN','FOCUS', ...]);

// Drop specific cascade aliases (not whole ticker)
ALIAS_DROP = new Map([
  ['ENGINERSIN', ['Engineers']],
  ['RAIN', ['Rain']],
  ['DOLLAR', ['Dollar']],
  ['COALINDIA', ['Coal']],  // optional — test regression
]);

// Expand DENYLIST_CONTEXT for symbols we keep with risky short forms
```

---

## 3. Seed false positives → master entry → fix

| Prod FP | NSE company | Dangerous alias(es) | denylist? | Recommended fix |
|---|---|---|---|---|
| IPL (92/wk) | India Pesticides Limited | `IPL` | none | **drop_bare_symbol** — keep "India Pesticides" |
| TAKE (21) | Take Solutions Limited | `TAKE` | none | **drop_bare_symbol** |
| RAIN (15) | Rain Industries Limited | `RAIN`, `Rain` | none | **drop_bare_symbol + drop alias Rain** |
| FOCUS (15) | Focus Lighting and Fixtures Limited | `FOCUS` | none | **drop_bare_symbol** (no bare "Focus" in master — symbol only) |
| MAMATA (11) | Mamata Machinery Limited | `MAMATA` | none | **drop_bare_symbol** — keep "Mamata Machinery" |
| RETAIL (10) | JHS Svendgaard Retail Ventures (`RETAIL`) | `RETAIL` | none | **drop_bare_symbol** — generic "retail inflation" FPs |
| MARATHON | Marathon Nextgen Realty Limited | `MARATHON` | none | **drop_bare_symbol** |
| ROUTE (5) | ROUTE MOBILE LIMITED | `ROUTE` | none | **drop_bare_symbol** |
| TOTAL (5) | Total Transport Systems Limited | `TOTAL` | none | **drop_bare_symbol** |
| ENGINERSIN | Engineers India Limited | `Engineers` | none | **drop_alias Engineers** — NOT symbol stoplist |
| DOLLAR (top 50) | Dollar Industries Limited | `DOLLAR`, `Dollar` | none | **drop_bare_symbol + drop alias Dollar** |

**Note:** `V2RETAIL` exists separately with aliases `V2 Retail` — not the source of generic RETAIL FP; that's ticker `RETAIL`.

---

## 4. True positives → master entry → preserve

| Ticker | Headline pattern | Master state | Risk from hardening |
|---|---|---|---|
| BHARTIARTL | "Airtel" | ✅ alias present | Low |
| SUNPHARMA | "Sun Pharma" | ✅ | Low |
| MARUTI | "Maruti Suzuki" | ✅ | Low |
| LT | "L&T" | ✅ via overlay | Low |
| EICHERMOT | "Royal Enfield" | ✅ overlay | Low |
| HDFCBANK | "HDFC Bank" | ✅ | Low |
| INDIGO | "IndiGo" | ✅ symbol | Medium — short symbol |
| TCS | "TCS" | ✅ | Low |
| TATAMOTORS | demerger → TMCV/TMPV | INTENTIONAL_MULTI_TAG | Leave alone |
| NH | "Narayana Hrudayalaya" | ✅ | Medium — bare `NH` |
| HINDUNILVR | "HUL" | ✅ overlay | Low |
| VBL | "Varun Beverages" | ✅ | Low |
| KEC | "KEC International" | ✅ | Medium — bare `KEC` |
| JKCEMENT | "JK Cement" | ✅ | Low |
| BBOX | "Black Box" | ✅ | Low |
| COALINDIA | "Coal India" | ✅ — also bare `Coal` | Drop `Coal` carefully |
| SIEMENS | "Siemens" | ❌ only "Siemens Limited" | **Recall gap** — `siemens` blocked by ENRIN collision |
| JSWSTEEL | "JSW Utkal Steel" | ✅ "JSW Steel" survives | `jsw` bare blocked — multi-word OK |
| PWL | "PhysicsWallah" | ⚠️ `Physicswallah` only | **Add PhysicsWallah; drop bare PWL** |

---

## 5. Recall gaps (why coverage is 13%)

| Gap | Cause | Fix |
|---|---|---|
| Siemens untagged | Collision filter: `siemens` first-word of ENRIN + SIEMENS | Add `SIEMENS`-only alias via proposal overlay + INTENTIONAL escape, OR match "Siemens Limited" only when headline says "Siemens" with stock context |
| PhysicsWallah → PWL wrong | Bare `PWL` matches; spelling `Physicswallah` ≠ news `PhysicsWallah` | Add alias `PhysicsWallah`; drop bare `PBL`/`PWL` |
| JSW Utkal Steel | `jsw` blocked; need multi-word | "JSW Steel" / "JSW Utkal" overlay on JSWSTEEL |
| ~436 tickers with risky single-token aliases, no denylist | Build adds SYMBOL to every ticker; only 6 have denylist_context | Systematic bare-symbol drop for English-word symbols — Gemini v2 should prioritize prod-observed set first |

Scale: **449 single-token aliases ≤4 chars** in master; **only 1** has denylist_context (count includes PAGEIND etc.).

---

## 6. Architecture decision for task file

**DO:**
- Modify `scripts/build-equity-master.mjs` (new sets + ingest Gemini v2 actions)
- Update `scripts/research/output/v2-031/alias_proposal.json` (or new overlay JSON merged at build)
- Rebuild `shared/nse-equity-master.json` + commit
- Smoke-test with `scripts/research/exp11-coverage-check.mjs` regression rows locally

**DON'T:**
- New runtime stoplist JSON read by `_india-market-keywords.mjs` (unless minimal — prefer build-time)
- HuggingFace NER in sync hot path
- Touch sacred variant files

**Minimal runtime change (maybe):**
- Case-sensitive match for bare symbols ≤4 chars only — only if build-time drops aren't enough. Prefer build-first.

---

## 7. Draft task file skeleton (V2-031b)

### Goal
Lift G1 to ≥90% precision and ≥20% post-deploy 24h coverage (measured by `exp11-coverage-check.mjs` + `exp11-coverage-slice.mjs` on prod after Lijo deploy).

### Context Manifest — Load
- V2-031 task file (decisions 1–10)
- `scratch/V2-031b_gemini_rerun_instructions.md` + v2 deliverables (when ready)
- `scratch/V2-031b_parallel_prep_findings.md` (this file)
- `scripts/build-equity-master.mjs`, `_india-market-keywords.mjs`
- `scripts/research/output/exp11/coverage_check.md`, `coverage_slice.md`
- `exp11_brief.md` §3 gates

### Phase 1 — Ingest Gemini v2 actions into build
- Add `BARE_SYMBOL_DROP`, `ALIAS_DROP`, expand `DENYLIST_CONTEXT`
- Merge alias overlays into `alias_proposal.json`
- Rebuild equity master; verify collisions.log unchanged for expected ambiguous groups

### Phase 2 — Local regression
- Run extractCompanies() on 30 rows from coverage_check.md §11.3
- Target: ≥27/30 correct (90%)
- Run on headlines_untagged_sample.csv subset for recall

### Phase 3 — Lijo prod deploy + verify
- Forward-tag only (no backfill unless Phase 4 approved)
- Wait 24h; Lijo runs coverage scripts
- Paste results into exp11_brief.md §11

### Phase 4 — Backfill (optional / defer)
- One-time retag of pre-2026-05-26 rows
- Defer unless Exp 11 universe needs history

### Acceptance gates
| Gate | Threshold |
|---|---|
| Precision spot-check | ≥90% on 30-row sample |
| Post-deploy 24h coverage | ≥20% |
| Post-deploy 7d coverage | ≥30% (stretch) |
| Routing | All pass → unblock Exp 11; any fail → V2-031c |

### Sacred files
None. Modifiable: `build-equity-master.mjs`, `alias_proposal.json`, `nse-equity-master.json`, possibly `_india-market-keywords.mjs`.

---

## 8. Waiting on Gemini v2 for

- Prior-art citations (research log)
- Complete classification of short tickers beyond prod seed
- `regression_checklist.csv` (30 prod rows classified)
- Validated alias overlays (delta-only, zero phantom symbols)

---

## Changelog

| Date | Change |
|---|---|
| 2026-05-27 | Parallel prep: build chain mapped, 11 seed FPs + 12 TPs analyzed, task skeleton drafted |
