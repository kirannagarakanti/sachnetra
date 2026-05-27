# V2-031b RE-RUN — Gemini Research Agent Instructions (v2)

**Status:** FIRST RUN REJECTED — rerun required before Claude authors the implementation task.
**Date:** 2026-05-27
**Your job:** Research + deliverables only. Do NOT implement code. Do NOT run against Railway prod.
**Output location:** Overwrite files in `scratch/` (same filenames, version bump to `2026-05-27-v2`).

---

## 0. Why you're re-running

The first deliverable set (`scratch/v2-031b_*.json`, `v2-031b_research_log.md`, `v2-031b_ticker_classification.csv`) was reviewed and **rejected**. The hybrid-pipeline recommendation is directionally correct, but the data has factual errors, phantom tickers, architecture mismatches, and the research log does not meet the brief.

**Do not reuse the first-run JSON blindly.** Start from the repo's canonical sources and prod evidence below.

---

## 1. What V2-031b is (context)

- **G1** = news headline → NSE ticker tagging in `india_news_signals.nse_tickers[]`
- **V2-031** shipped 2026-05-26. Post-deploy prod checks FAILED:
  - **Precision ~63%** (gate: ≥90%)
  - **Coverage ~13% post-deploy 24h** (gate: ≥20%)
- **Exp 11** (mid/small-cap latency experiment) stays **blocked** until G1 passes gates.
- **V2-031b** = hardening pass: stoplist + alias improvements + implementation notes for the **existing** pipeline — NOT a new architecture.

---

## 2. READ THESE FILES FIRST (mandatory, in order)

Before any web search, load and read:

1. `scratch/V2-031b_ner_stoplist_research_checklist.md` — original brief (your scope)
2. `scripts/research/output/exp11/coverage_check.md` — prod FP/TP evidence
3. `scripts/research/output/exp11/coverage_slice.md` — deploy cutover (V2-031 live ~2026-05-26 10:00 IST)
4. `shared/nse-equity-master.json` — **canonical NSE symbol list + current aliases** (THIS IS SOURCE OF TRUTH)
5. `scripts/build-equity-master.mjs` — how aliases are built; `HARD_DROP_ALIASES`, `DENYLIST_CONTEXT`, collision filter
6. `scripts/_india-market-keywords.mjs` — runtime matcher (word-boundary regex, case-insensitive, `denylist_context` gating)
7. `scripts/research/output/v2-031/nse_equity_master.csv` — raw NSE EQUITY_L.csv (2,386 rows)
8. `scripts/research/output/v2-031/alias_proposal.json` — prior alias overlay from V2-031 recon
9. `ai_docs/sachnetra v2/wiki/experiments/exp11_brief.md` §3 — gate definitions

**Critical architecture fact (read carefully):**

The tagger does NOT match arbitrary strings. It only fires on **aliases registered in `shared/nse-equity-master.json`**, via word-boundary regex in `_india-market-keywords.mjs`.

Therefore:
- A **stoplist entry for `KKR` or `RCB`** is useless — those symbols are NOT in the equity master and cannot be tagged.
- Fixing **ENGINERSIN** is NOT "stoplist the symbol" — the FP comes from the **`"Engineers"` alias** on that entry.
- Fixing **IPL** is NOT about company-name disambiguation alone — the FP comes from the **bare `"IPL"` symbol alias** on India Pesticides Limited.

**Implementation target (for your recommendation memo):** changes flow through `build-equity-master.mjs` → rebuilt `nse-equity-master.json`. Your deliverables are **research inputs** to that build, not a parallel runtime system.

---

## 3. EVERY FLAG FROM FIRST RUN (fix all of these)

### FLAG 1 — IPL company name hallucinated ❌

**First run wrote:** `"Incitec Pivot Ltd (also Inflatable Packers Ltd)"`
**Correct (NSE EQUITY_L.csv):** `IPL` = **India Pesticides Limited**
**Verified line:** `IPL,India Pesticides Limited,EQ,05-JUL-2021,...`

Incitec Pivot is an **ASX (Australian)** company — wrong exchange, wrong symbol. This is a hallucination. Every `company` field in your deliverables MUST be verified against `nse_equity_master.csv` or `nse-equity-master.json`.

---

### FLAG 2 — 38 phantom stoplist symbols ❌

**38 entries in `v2-031b_negative_keywords.json` are NOT valid NSE trading symbols** in `shared/nse-equity-master.json`:

```
BEST, MORE, OM, UMA, KAMA, GOLD, CARE, KEY, MIND, WELL, GOOD, PEOPLE, KINGS, BULL, BLUE, SHREE, GITA, GANGES, RAM, KRISHNA, SHIVA, HARI, YASH, VISHAL, RADHIKA, SANGAM, RAGHAV, JAIPUR, MANGLAM, KIRAN, LAKSHMI, HERO, PAGE, ASIAN, KKR, RCB, BCCI, ICC
```

**Why this is wrong:**
- `BEST` → real symbol is **BESTAGRO** (Best Agrolife Limited)
- `MORE` → real symbol is **MOREPENLAB** (Morepen Laboratories Limited)
- `HERO` → real symbol is **HEROMOTOCO**
- `PAGE` → real symbol is **PAGEIND**
- `ASIAN` → real symbol is **ASIANPAINT**
- `KKR`, `RCB`, `BCCI`, `ICC` → **not NSE-listed equities** (cricket teams/bodies). They cannot be tagged by our pipeline. Do NOT put them in a symbol stoplist.

**Rule for v2:** Every `symbol` field in the stoplist MUST exist in `shared/nse-equity-master.json`. Run validation before submitting:
```bash
node -e "
const stop = require('./scratch/v2-031b_negative_keywords.json').stoplist;
const master = new Set(require('./shared/nse-equity-master.json').map(e => e.ticker));
const bad = stop.filter(s => !master.has(s.symbol)).map(s => s.symbol);
if (bad.length) { console.error('PHANTOM SYMBOLS:', bad); process.exit(1); }
console.log('OK:', stop.length, 'valid symbols');
"
```

---

### FLAG 3 — ENGINERSIN: wrong fix type ❌

**Observed FP:** headline "Microsoft… Redirecting **Engineers**…" tagged `ENGINERSIN`
**Root cause:** alias `"Engineers"` on Engineers India Limited entry in equity master — NOT substring matching on the symbol `ENGINERSIN`.

**Wrong v1 approach:** stoplist the symbol `ENGINERSIN` (would kill all legitimate Engineers India tags)
**Correct v2 approach:** classify as **`alias_drop`** action — drop single-word alias `"Engineers"`, keep multi-word `"Engineers India"`, `"Engineers India Limited"`, symbol `ENGINERSIN`.

Your deliverable must distinguish:
- `symbol_stoplist` — suppress bare symbol token (e.g. bare `IPL`, `TAKE`, `RAIN`)
- `alias_drop` — remove a specific dangerous alias from an entry (e.g. `"Engineers"`, `"Page"`)
- `denylist_context` — alias kept but requires context words (already used for Lupin, Page, Titan, etc.)

---

### FLAG 4 — RELIANCE alias too loose ❌

**First run included:** `"Mukesh Ambani's company"` as RELIANCE alias
**Reject.** Headlines mentioning Mukesh Ambani often refer to Jio, Reliance Retail, family news — not RIL specifically.

**Also reject:** any person-name → company alias without strict evidence (politicians, founders, CEOs).

**Safe RELIANCE aliases:** `Reliance Industries`, `Reliance Industries Limited`, `RIL`, `Reliance` (with group-disambiguation note — see FLAG 8).

---

### FLAG 5 — PWL / PhysicsWallah missing from positive aliases ❌

**Checklist false-negative:** "PhysicsWallah" headline wrongly tagged `PWL` (bare symbol collision) instead of company match.
**NSE master:** ticker **`PWL`**, company **Physicswallah Limited**, aliases include `"Physicswallah"` (note spelling).

**First run bug:** build script had PWL logic but **PWL absent from final 187-entry alias output**.

**v2 requirement:** `PWL` MUST appear in `v2-031b_positive_aliases.json` with aliases including:
- `PhysicsWallah` (common news spelling)
- `Physicswallah` (NSE registered spelling)
- `Physicswallah Limited`
- Do NOT recommend bare `PWL` as a match alias unless context-gated (it's a 3-letter collision risk)

**Note:** Checklist once said `PHYSICSWAL` — that ticker does NOT exist. Correct symbol is **`PWL`**.

---

### FLAG 6 — Research log undercooked ❌

Brief §H requires **≥3 prior-art citations per Part A sub-step (A1, A2, A3, A4)** = minimum **12 citations total**.

**First run:** 3 generic search summaries, no paper titles, no GitHub file paths, no model card quotes.

**v2 requirement:** Research log must include a table:

| Sub-step | Query | Source (URL) | What we learned | Usable artifact? |
|----------|-------|--------------|-----------------|------------------|
| A1 | ... | arXiv/ACL paper URL | ... | stoplist table in appendix? Y/N |
| A2 | ... | GitHub repo + file path | ... | paste relevant lines |
| etc. | | | | |

Minimum 12 rows covering A1–A4. Each row must have a **real URL you actually fetched** — no fabricated article IDs.

---

### FLAG 7 — Evidence URLs likely templated/unverified ❌

First run URLs like `article6823901.ece`, `article1100523` look generated, not verified.

**v2 rule:** Every `evidence_urls` entry must be either:
- A URL from `coverage_check.md` §11.3 (prod sample rows), OR
- A URL you fetched live and confirmed returns 200, OR
- An NSE official page (`nseindia.com/get-quotes/equity?symbol=...`)

If you cannot verify a URL, omit it and note "unverified — prod evidence only" in the research log.

---

### FLAG 8 — Classification CSV over-aggressive ❌

First run marked tickers like `AARON`, `ACC`, `ACE`, `COALINDIA` as `common_english_word` because the **symbol string** appears in Wiktionary/Google 10k wordlist.

**Wrong:** `COALINDIA` is not a common English word — it's a compound proper noun. Matching is on **aliases**, not symbol tokens in headlines (except when bare symbol is registered as alias — which IS the problem for IPL/TAKE/RAIN).

**v2 classification rules:**
- Classify based on **which aliases are dangerous in news headlines**, not symbol-etymology alone
- A ticker is high-FP-risk if its **bare symbol** OR a **cascade alias** is a common English word/acronym/name
- Categories: `keep` | `symbol_stoplist` | `alias_drop` | `denylist_context` | `sports_acronym_collision` (only if symbol exists on NSE)
- Add column: `recommended_action` with one of: `drop_bare_symbol_alias`, `drop_alias:<alias>`, `add_denylist_context`, `keep`

---

### FLAG 9 — Wrong mental model for cricket FPs ❌

`IPL` FP is real because **`IPL` is a registered alias** for India Pesticides Limited.
`KKR`/`RCB` in cricket headlines are NOT being tagged by our pipeline (not in equity master).

**v2:** Do not stoplist non-existent symbols. Instead document: "cricket team acronyms are not NSE symbols; no action needed unless an alias maps to them."

---

### FLAG 10 — Positive alias map duplicates existing master ❌

Many aliases in v1 positive map already exist in `nse-equity-master.json`. v2 positive map should be **delta-only**:

**Schema change for v2:**
```json
{
  "version": "2026-05-27-v2",
  "alias_overlays": {
    "PWL": {
      "company": "Physicswallah Limited",
      "add_aliases": ["PhysicsWallah"],
      "drop_aliases": ["PWL"],
      "evidence_urls": ["..."],
      "notes": "Bare PWL caused wrong tag on PhysicsWallah headline; see coverage_check.md row 17"
    }
  }
}
```

Only include tickers where you are **adding** aliases not already in master, or **recommending drops** of dangerous aliases.

---

### FLAG 11 — Group-name ambiguity rules need explicit decisions ❌

Document decisions (not vibes):

| Mention | Rule | Target ticker(s) |
|---------|------|------------------|
| "HDFC" post-merger | Map to HDFCBANK only | HDFCBANK |
| "Adani" alone | Do NOT tag | none |
| "Tata" alone | Do NOT tag | none |
| "Reliance" alone | Ambiguous (RPOWER, RHFL, etc.) | recommend: require "Industries" or "RIL" |
| "Royal Enfield" | Brand → parent | EICHERMOT |
| "Jockey" | Brand → parent | PAGEIND |
| "Domino's" | Brand → parent | JUBLFOOD |

---

### FLAG 12 — Must preserve all confirmed true positives ❌

From `coverage_check.md` §11.3, these MUST still tag correctly after your proposed changes:

| Ticker | Headline pattern |
|--------|------------------|
| BHARTIARTL | "Airtel" |
| SUNPHARMA | "Sun Pharma" |
| MARUTI / MARUTI.NS | "Maruti Suzuki" |
| LT | "L&T" |
| EICHERMOT | "Royal Enfield" |
| HDFCBANK | "HDFC Bank" |
| INDIGO | "IndiGo" |
| TCS | "TCS" |
| TATAMOTORS | "Tata Motors" |
| NH | "Narayana Hrudayalaya" |
| HINDUNILVR | "HUL" / "Hindustan Unilever" |
| VBL | "Varun Beverages" |
| KEC | "KEC International" |
| JKCEMENT | "JK Cement" |
| BBOX | "Black Box" |
| COALINDIA | "Coal India" (multi-ticker headline) |
| SIEMENS | "Siemens" (currently missed — add to overlay) |
| JSWSTEEL | "JSW Utkal Steel" / "JSW Steel" (currently missed — add to overlay) |

**v2 deliverable:** include `scratch/v2-031b_regression_checklist.csv` — one row per TP above with columns: `ticker, headline_snippet, should_tag_Y_N, proposed_matcher_behavior`.

---

## 4. CONFIRMED FALSE POSITIVES TO FIX (seed list — all must appear in v2 stoplist/actions)

| Symbol | NSE company name (VERIFY) | FP cause | Recommended action |
|--------|---------------------------|----------|-------------------|
| IPL | India Pesticides Limited | bare alias `IPL` matches cricket | drop bare `IPL` alias; keep "India Pesticides" |
| TAKE | Take Solutions Limited | common verb | drop bare `TAKE` alias |
| RAIN | Rain Industries Limited | weather word | drop bare `RAIN` alias or denylist_context |
| FOCUS | Focus Lighting and Fixtures Limited | common noun | drop bare `FOCUS` alias |
| MAMATA | Mamata Machinery Limited | politician name | drop bare `MAMATA` alias |
| RETAIL | (check which RETAIL ticker — V2 Retail?) | generic noun | drop bare alias |
| MARATHON | Marathon Nextgen Realty Limited | event word | drop bare `MARATHON` alias |
| ROUTE | Route Mobile Limited | transport noun | drop bare `ROUTE` alias |
| TOTAL | (verify company name in master) | common noun | drop bare alias |
| ENGINERSIN | Engineers India Limited | alias `Engineers` | **alias_drop: "Engineers"** NOT symbol stoplist |
| DOLLAR | Dollar Industries Limited | currency word | drop bare alias (in top 50 FPs) |
| MORE | **MOREPENLAB** not MORE | word "more" in headlines | drop bare alias on MOREPENLAB if present |

---

## 5. DELIVERABLES (v2 — overwrite scratch/)

### Deliverable 1: `scratch/v2-031b_negative_keywords.json`

**Renamed concept:** `scratch/v2-031b_ticker_hardening_actions.json` (preferred) OR keep filename but change schema.

**New schema (required):**
```json
{
  "version": "2026-05-27-v2",
  "source_of_truth": "shared/nse-equity-master.json",
  "validated_against_master": true,
  "phantom_symbol_count": 0,
  "actions": [
    {
      "symbol": "IPL",
      "company": "India Pesticides Limited",
      "action_type": "drop_bare_symbol_alias",
      "category": "sports_acronym_collision",
      "reason": "Bare IPL alias matches Indian Premier League in 92/7d prod headlines",
      "prod_evidence": "scripts/research/output/exp11/coverage_check.md §11.2 rank 1, §11.3 rows 1,14,26,27",
      "disambiguation_rule": "Allow only if 'India Pesticides' or 'pesticide' in headline",
      "evidence_urls": ["verified URLs only"]
    },
    {
      "symbol": "ENGINERSIN",
      "company": "Engineers India Limited",
      "action_type": "drop_alias",
      "alias_to_drop": "Engineers",
      "category": "alias_collision",
      "reason": "Single-word Engineers matches generic tech/hiring headlines",
      "prod_evidence": "coverage_check.md §11.3 row 19"
    }
  ]
}
```

**Targets:** 50–120 **valid NSE symbols** with explicit actions. Zero phantom symbols.

---

### Deliverable 2: `scratch/v2-031b_positive_aliases.json`

**Schema (delta overlays only):**
```json
{
  "version": "2026-05-27-v2",
  "alias_overlays": {
    "PWL": { "add_aliases": ["PhysicsWallah"], "drop_aliases": ["PWL"], ... },
    "SIEMENS": { "add_aliases": ["Siemens"], ... },
    "JSWSTEEL": { "add_aliases": ["JSW Utkal Steel", "JSW Steel"], ... }
  }
}
```

**Must include at minimum:** every ticker from §3 FLAG 12 regression checklist that needs a new alias.
**Must include:** top ~100 tickers from `coverage_check.md` §11.2 (by 7d tag volume) where alias gaps exist.
**Must NOT include:** loose person-name aliases, phantom symbols, aliases already in master without change.

---

### Deliverable 3: `scratch/v2-031b_research_log.md`

**Required sections:**
1. **Part A audit table** — ≥12 cited sources (≥3 each for A1, A2, A3, A4)
2. **Part B methodology** — how you classified 2,386 tickers (rules, not just Wiktionary dump)
3. **Part C alias sources** — NSE pages, Wikipedia, news patterns
4. **Part D NSE master notes** — short tickers ≤4 chars: separate file `scratch/v2-031b_short_tickers.csv`
5. **Part E recommendation** — 5–10 sentences: extend `build-equity-master.mjs` (NOT new runtime). Expected precision lift (target ≥90%) and recall lift (target ≥20% 24h). Note: backfill is out of scope for this research pass.
6. **Part F first-run correction log** — table listing every FLAG 1–12 and how v2 fixes it
7. **License note** — for any adopted wordlist (Google 10k is fine)

---

### Deliverable 4: `scratch/v2-031b_ticker_classification.csv`

**Columns (required):**
```
symbol,company_name,classification,recommended_action,fp_risk_rationale,english_word_match,prod_observed_fp,validated_against_master
```

**Rules:**
- One row per NSE equity in `nse_equity_master.csv` (2,386 rows)
- `validated_against_master` = Y for all rows
- `prod_observed_fp` = Y only if in coverage_check.md §11.2/11.3

---

### Deliverable 5 (NEW): `scratch/v2-031b_regression_checklist.csv`

30+ rows: confirmed TPs + confirmed FPs from prod samples. Columns:
```
id,headline_snippet,tagged_ticker,should_tag,correct_tickers,first_run_result,v2_expected_result,source_file
```

Source: `coverage_check.md` §11.3 (30 rows) — classify each as TP/FP and state expected behavior after hardening.

---

## 6. VALIDATION CHECKLIST (run before declaring done)

- [ ] All stoplist/action symbols exist in `shared/nse-equity-master.json` (zero phantoms)
- [ ] IPL company = "India Pesticides Limited" (not Incitec Pivot)
- [ ] ENGINERSIN action = drop alias "Engineers", NOT symbol stoplist
- [ ] PWL present in alias overlays with PhysicsWallah
- [ ] No KKR/RCB/BCCI/ICC in symbol actions (not NSE equities)
- [ ] No "Mukesh Ambani's company" or similar loose person aliases
- [ ] Research log has ≥12 prior-art citations with real URLs
- [ ] regression_checklist.csv covers all 30 prod sample rows
- [ ] All 10 seed FPs from §4 have explicit actions
- [ ] All 12+ seed TPs from FLAG 12 preserved in regression checklist
- [ ] Recommendation explicitly says: implement via `build-equity-master.mjs`, not parallel runtime JSON

---

## 7. OUT OF SCOPE (do not do)

- Do NOT implement code in `scripts/` or `shared/`
- Do NOT run SQL or scripts against Railway prod
- Do NOT propose HuggingFace transformer NER as primary path (latency budget: sync 10-min cron)
- Do NOT propose Hindi/multilingual NER (one-line note only)
- Do NOT propose backfill of historical rows (defer to implementation task)
- Do NOT touch sacred files (`src/config/variants/full.ts`, etc.)

---

## 8. SUCCESS CRITERIA

Research is accepted when Claude can author `ai_docs/tasks/V2-031b_news_ticker_tagging_hardening.md` **without fixing your data first**.

That means:
- Zero phantom symbols
- Correct NSE company names throughout
- Actions map cleanly to `build-equity-master.mjs` changes
- Research log meets §H citation requirements
- Regression checklist proves TPs preserved + FPs fixed

---

## 9. FILES TO OVERWRITE

```
scratch/v2-031b_negative_keywords.json   (or v2-031b_ticker_hardening_actions.json)
scratch/v2-031b_positive_aliases.json
scratch/v2-031b_research_log.md
scratch/v2-031b_ticker_classification.csv
scratch/v2-031b_regression_checklist.csv  (NEW)
scratch/v2-031b_short_tickers.csv         (NEW — symbols ≤4 chars with classification)
```

Append changelog to `scratch/V2-031b_ner_stoplist_research_checklist.md` §J when done.

---

**Start by reading the 9 mandatory files in §2, then produce deliverables. Do not submit until §6 validation passes.**
