# V2-031b Recon Checklist — NSE Ticker NER: Stoplist + Alias Research

*Handoff for the Gemini/Antigravity research agent. Run searches on the open web, save raw evidence + curated lists in `scratch/`. Claude then synthesises Gemini's outputs into the V2-031b task file. Per `feedback_external_agent_recon`: **Gemini does the web work, Claude never runs the probes itself**, Lijo + Claude author the final task.*

---

## Tooling note

Use whichever combination of **WebSearch, browser navigation, Skills, MCP connectors, and direct repo browsing** is most reliable. The deliverable is the same regardless of tool: **two structured JSON files + a research log with citations**, saved to `scratch/`. Don't summarise from memory — fetch live pages, save URLs, quote evidence.

---

## Status — 2026-05-27 — NOT STARTED

- [ ] Part A — prior art on financial-NER stoplists
- [ ] Part B — negative-keyword sources (common-word collisions)
- [ ] Part C — positive-alias sources (company-name variants)
- [ ] Part D — NSE-specific equity master + ticker ambiguity
- [ ] Part E — library/approach scan
- [ ] Deliverables: 3 files in `scratch/` per §G below

---

## Read this first — what V2-031b is, and why we're researching not building

V2-031 (G1 — news ticker tagging) shipped 2026-05-26. The post-deploy coverage check (`scripts/research/output/exp11/coverage_check.md` + `coverage_slice.md`) shows two failures:

- **Precision ~63%** (need ≥90%) — dominated by common-English-word tickers being mis-tagged
- **Coverage ~13%** (need ≥20%) — tagger misses roughly half the headlines that mention a company

Both blockers feed Exp 11 (the mid/small-cap latency experiment per `exp11_brief.md`). We can't pre-register Exp 11 until G1 is hardened.

**V2-031b** is the proposed hardening pass — author a **negative stoplist** (kills common-word FPs) and a **positive alias map** (lifts recall on company-name variants). Both belong in `shared/market-taxonomy.json` or a sibling file.

**Why research before coding:**
1. We are not the first team to do NSE ticker NER. Prior work (FinBERT-IN, IndicNER, Stock-Mention datasets, open-source ticker libraries) almost certainly contains the stoplist + alias map we need. Re-deriving from scratch is wasted effort.
2. Our own observed FP cluster is small (10–15 tokens visible in a 7-day window). The full FP universe is likely 50–200 tokens — we'll miss most of them by eyeballing our own data alone.
3. Alias coverage (Bharti Airtel → BHARTIARTL, AIRTEL, BHARTI; Maruti Suzuki → MARUTI, MSI; Mahindra & Mahindra → M&M, MAHINDRA, MM) is the recall lever, and good alias databases exist in finance APIs and academic datasets.

**Hard rule (per `feedback_external_agent_recon`):**
Gemini runs every search and saves the evidence. Claude does not run these probes. Lijo + Claude later synthesise Gemini's outputs into the `ai_docs/tasks/V2-031b_*.md` task file. James implements from the task.

---

## Concrete evidence — what we've already seen (ground Gemini's search)

From `scripts/research/output/exp11/coverage_check.md` §11.2–11.3.

### Confirmed false positives in the wild (7-day post-deploy sample)
*These are real headlines the tagger mishandled. Gemini should treat these as the **seed** for a wider stoplist — there will be many more we haven't seen yet.*

| Tagged ticker | Headline context | Real meaning | Count in 7d |
|---|---|---|---|
| `IPL` | "RCB or GT: Which Team Will Qualify…" | Indian Premier League (cricket) | 92 |
| `TAKE` | various | verb / common word (Take Solutions ticker) | 21 |
| `RAIN` | "Rain Disrupts Life In Tirumala" | weather (Rain Industries ticker) | 15 |
| `FOCUS` | "Quad strengthens counter-terror focus" | noun (Focus Lighting ticker) | 15 |
| `MAMATA` | "FIR against Mamata Banerjee" | politician (Mamata Machinery ticker) | 11 |
| `RETAIL` | (generic) | noun (V-Retail / V2 Retail tickers) | 10 |
| `MARATHON` | "virtual legal marathon" | event (Marathon Nextgen ticker) | unknown |
| `ROUTE` | "Lucknow train route" | noun (Route Mobile ticker) | 5 |
| `TOTAL` | (generic) | noun | 5 |
| `ENGINERSIN` | "Microsoft… Redirecting Engineers…" | **substring match** on "engineers" → Engineers India Ltd | unknown |

### Confirmed true positives (alias map must preserve these)

| Tagged ticker | Headline mention | Notes |
|---|---|---|
| `BHARTIARTL` | "Airtel" | alias: Airtel → BHARTIARTL |
| `SUNPHARMA` | "Sun Pharma" | direct |
| `MARUTI` | "Maruti Suzuki" | alias: Maruti Suzuki / MSI → MARUTI |
| `LT` | "L&T" / "L&T's Vyoma" | alias: L&T → LT |
| `EICHERMOT` | "Royal Enfield Bullet" | alias: Royal Enfield → EICHERMOT |
| `HDFCBANK` | "HDFC Bank" | direct |
| `INDIGO` | "IndiGo aircraft" | direct |
| `TCS` | "TCS sexual assault case" | direct |
| `TATAMOTORS` | "Tata Motors / Stellantis" | direct |
| `NH` | "Narayana Hrudayalaya" | alias: Narayana Hrudayalaya → NH |
| `HINDUNILVR` | "HUL" | alias: HUL → HINDUNILVR |
| `VBL` | "Varun Beverages" | alias: Varun Beverages → VBL |

### Likely false negatives observed (tagger missed)
- "PhysicsWallah" → should map to PHYSICSWAL (the headline was tagged with `PWL` instead — a wrong-ticker error)
- "Siemens" — appears in a "stocks to watch" headline, not tagged
- "JSW Utkal Steel" → likely should map to JSWSTEEL

These three patterns (alias gap, wrong-ticker collision, multi-entity headline) generalise. Gemini's positive-alias deliverable should aim to close all three.

---

## Part A — Prior art on financial-NER stoplists

The goal: find any team that has previously published a stoplist for finance-domain NER on English-language equity headlines (Indian or otherwise). Stoplist = tokens that look like tickers but should never trigger ticker tagging when matched in isolation.

- [ ] **A1.** Search academic papers (Google Scholar, arXiv, ACL Anthology) for:
  - `"ticker" "NER" "false positive"`
  - `"stock mention" "disambiguation"`
  - `"FinBERT" "named entity"` + `India` / `NSE`
  - `"company name" "entity linking" "stock"`
  - `IndicNER ticker`
  Save every PDF that has a published stoplist table or appendix. Record citation + section.

- [ ] **A2.** Search GitHub for ticker-NER repos with documented stopword lists:
  - `nse ticker ner` / `nse company recognition`
  - `stock ticker extraction python`
  - `finance ner stopwords`
  - `bloomberg ticker disambiguation`
  Save repo URLs that contain a `stopwords.txt`, `blacklist.json`, `common_words.json`, or equivalent. Quote the file path + paste the relevant section into the research log.

- [ ] **A3.** Find production-grade open-source libraries:
  - `pystocks`, `yfinance`, `nsetools`, `nsepy`, `jugaad-trader` — do any ship a known-ambiguous-ticker list?
  - `spaCy` finance models — what does `en_core_web_lg`'s ORG label do on tickers like `RAIN`?
  - HuggingFace finance-NER models (e.g. `ProsusAI/finbert`, `yiyanghkust/finbert-tone`, any Indian-equity-tuned variants) — read their model card for documented failure modes.
  Save model cards + library docs.

- [ ] **A4.** Search blog posts / engineering writeups:
  - "We built a stock NER" / "lessons from financial NER" / "ticker disambiguation in news"
  - Reddit r/algotrading, r/IndianStreetBets — anecdotal but often surfaces specific FP examples
  - Quora, Medium, dev.to
  Bias toward posts that name specific tickers and specific FPs.

---

## Part B — Negative-keyword sources (common-word collisions)

The goal: a curated list of NSE ticker symbols that are **also common English words / proper nouns / acronyms** and therefore high-FP-risk when matched in isolation.

- [ ] **B1.** Pull the **NSE equity master list** (Gemini already has `scratch/fetch_nse_equity_master_playwright.mjs` working from a prior recon — confirm it still pulls fresh, save the current CSV to `scratch/nse_equity_master_2026-05-27.csv`).

- [ ] **B2.** For every NSE ticker symbol in the master list, classify it into one of:
  - **a. Common English word** (e.g. `RAIN`, `TAKE`, `FOCUS`, `TOTAL`, `ROUTE`, `RETAIL`) — STOPLIST
  - **b. Common Indian proper noun / name** (e.g. `MAMATA`, possibly `KAMA`, `RAJESH`) — STOPLIST unless in clear ticker context
  - **c. Sports / entertainment acronym** (e.g. `IPL`, possibly `KKR`, `RCB`) — STOPLIST
  - **d. Substring of a common word** (e.g. `ENGINERSIN` matches "engineers" via substring — different problem; flag for the implementation note in Part E, not the stoplist itself)
  - **e. Genuine ticker, low ambiguity** — KEEP
  Use a standard English wordlist (e.g. `/usr/share/dict/words`, Wiktionary frequency lists, Google's 10k most-common-words list) for the (a) classification. Save the classification as `scratch/v2-031b_ticker_classification.csv` with columns: `symbol, name, classification, english_word_match, evidence_url`.

- [ ] **B3.** Cross-reference with known ambiguous-ticker lists for **other** exchanges. The US market has the same problem (`A`, `ALL`, `LOW`, `ON`, `IT`, `WORK`, `ANY`, `T`, `FOR`, `TWO`, etc.). Find the canonical lists:
  - Stack Overflow / Quant.SE discussions on "ambiguous tickers"
  - Wikipedia "List of ticker symbols that are common English words"
  - Bloomberg / FactSet / Refinitiv published guides (if accessible)
  Indian-specific patterns may differ, but the methodology and many common-noun categories transfer.

- [ ] **B4.** For each stoplist candidate, capture the **escape hatch**: when would this token legitimately mean the ticker? E.g. `RAIN` in "Rain Industries Q4 results" is the real ticker; `RAIN` in "Rain Disrupts Life" is not. The simple rule: if the ticker symbol is preceded or followed by the registered company name (or a known alias), allow it through. Document this as the **proposed disambiguation rule** in the research log.

---

## Part C — Positive-alias sources (company-name variants)

The goal: an alias map from common written forms of company names to their canonical NSE ticker. This is the recall lever — closes the gap from 13% post-deploy coverage toward the 20%+ gate.

- [ ] **C1.** For each NSE-listed company in the equity master, find the **registered name**, the **trading name**, and **common alternative names**:
  - Source 1: NSE company-info pages (`https://www.nseindia.com/get-quotes/equity?symbol=<SYMBOL>`) — registered name + ISIN
  - Source 2: Wikipedia infobox — common name(s), abbreviations
  - Source 3: company website — how the company refers to itself
  - Source 4: news searches — how journalists actually write the name in headlines (this is the most operationally useful source)

- [ ] **C2.** Specifically chase the **alias gaps the V2-031 tagger has already shown**:
  - Airtel → BHARTIARTL
  - L&T / Larsen & Toubro → LT
  - HUL / Hindustan Unilever → HINDUNILVR
  - Royal Enfield → EICHERMOT (parent-brand mapping)
  - Maruti Suzuki / MSI → MARUTI
  - Mahindra / M&M / Mahindra & Mahindra → M&M
  - Tata Steel → TATASTEEL
  - State Bank / SBI → SBIN
  - HDFC Bank → HDFCBANK (vs HDFC Ltd → HDFC which has now merged — flag this)
  - PhysicsWallah → PHYSICSWAL
  - Reliance / RIL / Reliance Industries → RELIANCE
  - Adani Enterprises / Adani Group / Adani → ADANIENT (vs ADANIPORTS, ADANIGREEN, etc. — flag the group-vs-entity ambiguity)
  Save as `scratch/v2-031b_alias_map.json` with structure `{ "BHARTIARTL": ["Airtel", "Bharti Airtel", "Bharti", "Airtel India"], ... }`.

- [ ] **C3.** Capture the **parent-brand → ticker mapping** explicitly (Royal Enfield → EICHERMOT is the canonical example). News headlines often refer to the product brand, not the listed entity. Audit the top-50 mid-caps for similar cases:
  - Britannia Industries → BRITANNIA (also called "Tiger biscuits"? probably not in news)
  - Asian Paints → ASIANPAINT
  - Pidilite → PIDILITIND (Fevicol brand — does news use "Fevicol" → ticker?)
  - Marico → MARICO (Saffola, Parachute — flag)
  - Dabur → DABUR (Hajmola, Real — flag)
  - Berger Paints → BERGEPAINT
  - Nestle India → NESTLEIND (Maggi, Kit Kat — flag)
  For each, decide whether the product brand should map back to the parent ticker. Document the rule.

- [ ] **C4.** Capture **conglomerate / group-name ambiguity**:
  - "Adani" alone → group-level reference; should it tag the whole portfolio or none? (Probably none — too noisy.)
  - "Tata" alone → group-level; same question. (Probably none.)
  - "Reliance" → most often Reliance Industries (RELIANCE), but could be Reliance Power (RPOWER), Reliance Infra, etc.
  Propose a rule: if the group name appears without a sub-entity, do not tag.

---

## Part D — NSE-specific equity master + ticker ambiguity

- [ ] **D1.** Confirm the **NSE equity master** schema and freshness. We need: trading symbol, company name, ISIN, market cap band (for downstream Exp 11 universe work), listing date, status (active / delisted / suspended). The Playwright scraper in `scratch/fetch_nse_equity_master_playwright.mjs` already pulls a CSV — re-run it, save dated.

- [ ] **D2.** Identify **all symbols ≤ 4 characters** in the master. These are the highest-collision-risk subset (3- and 4-letter tickers are the ones most likely to be English words or common acronyms). Save list separately as `scratch/v2-031b_short_tickers.csv`. Manually classify each as keep / stoplist / context-required.

- [ ] **D3.** Identify **symbols with non-alphanumeric characters** (`M&M`, etc.) — these have parsing implications. Document any tagger pre-processing rules (lowercasing, stripping `&`) that might break them.

- [ ] **D4.** Identify **recently-listed / recently-delisted** tickers. Headlines may reference an old name for a year after a corporate action. Flag merged entities (HDFC + HDFC Bank, etc.).

---

## Part E — Library / approach scan

Even after stoplist + alias map, the *tagger itself* may need work. Survey:

- [ ] **E1.** What did V2-031 actually deploy? Read `shared/market-taxonomy.json`, `scripts/_india-market-keywords.mjs`, and the seed entry point `scripts/seed-india-signals.mjs` around line 341 (per `project_g1_execution_plan` memory: "sole write at seed-india-signals.mjs:341"). Document the current matching algorithm — substring? exact-token? regex? spaCy ORG label?

- [ ] **E2.** Compare against alternatives:
  - **spaCy + custom ruler** (PhraseMatcher with the alias map as patterns) — easy to add, runs locally, no API cost
  - **HuggingFace finance-NER models** — `dslim/bert-base-NER` baseline, finance-tuned variants, Indian-tuned variants
  - **Pure rule-based** (exact-symbol-token-match with stoplist + alias substitution before match)
  - **Hybrid** — rule-based first pass + ML model fallback for ambiguous cases
  For each: what does the post-stoplist + post-alias setup buy us? Where does it still fall short?

- [ ] **E3.** Note the **latency budget**. From memory `project_g1_execution_plan`: "HF too slow for sync ⇒ spaCy/async". Whatever Gemini recommends must fit the seed-india-signals.mjs hot path or be moved to a separate cron.

---

## Issues we might hit — flag during recon

1. **Stoplist over-suppression.** Killing `IPL` removes the cricket FPs but also kills any legitimate "IPL Industries" headlines. Test the proposed stoplist against a sample of historical headlines (we have `scratch/headlines_untagged_sample.csv` style outputs available from V2-031 recon) and report what *true positives* it would have suppressed.
2. **Alias collisions.** "HDFC" can mean HDFC Bank (HDFCBANK) or HDFC Ltd (HDFC, now merged into HDFCBANK). Decide which is canonical post-merger. Document the rule.
3. **Group-vs-entity ambiguity.** "Adani" → which Adani ticker? Probably none, by rule.
4. **Multilingual headlines.** Some sample rows are in Hindi (Devanagari). Does the tagger handle them? Note any prior work on multilingual ticker NER.
5. **Substring matching (the `ENGINERSIN` problem).** If the tagger is doing substring match (matching `ENGINEER` inside `ENGINERSIN`), no stoplist will fix it — the matching algorithm itself is wrong. Confirm in §E1.
6. **License on adopted lists.** If we lift a stoplist from a GPL repo, we inherit GPL. Check licenses of any list we propose adopting and note in the research log.

---

## §F — Pre-existing context to read first

Before searching the web, Gemini should load:
1. `ai_docs/sachnetra v2/wiki/syntheses/sachnetra_research_playbook.md` — research posture
2. `ai_docs/sachnetra v2/wiki/experiments/exp11_brief.md` — why this gates Exp 11
3. `scripts/research/output/exp11/coverage_check.md` — the FP cluster we observed
4. `scripts/research/output/exp11/coverage_slice.md` — the deploy cutover detection
5. `shared/market-taxonomy.json` — what tickers / aliases the pipeline currently knows about
6. `scripts/_india-market-keywords.mjs` — the matching helpers
7. `CLAUDE.md` § "Key files" — overall V2 file map

Don't re-summarise these — they ground the research, but the deliverables below are what matters.

---

## §G — Deliverables back to Claude

Saved to `scratch/`:

1. **`scratch/v2-031b_negative_keywords.json`** — the curated stoplist. Schema:
   ```json
   {
     "version": "2026-05-27",
     "stoplist": [
       {
         "symbol": "IPL",
         "company": "Inflatable Packers Ltd",
         "reason": "Indian Premier League cricket reference dominates news mentions",
         "category": "sports_acronym",
         "evidence_urls": ["..."],
         "disambiguation_rule": "allow if 'Inflatable Packers' appears in the same headline"
       },
       ...
     ]
   }
   ```
   Target: 50–150 entries.

2. **`scratch/v2-031b_positive_aliases.json`** — the alias map. Schema:
   ```json
   {
     "version": "2026-05-27",
     "aliases": {
       "BHARTIARTL": {
         "company": "Bharti Airtel Limited",
         "aliases": ["Airtel", "Bharti Airtel", "Bharti", "Airtel India"],
         "evidence_urls": ["..."]
       },
       ...
     }
   }
   ```
   Target: full top-200 by news mention volume, prioritised by mid/small-cap coverage (the Exp 11 universe).

3. **`scratch/v2-031b_research_log.md`** — the audit trail:
   - Every search query run, with the URL + a one-line finding
   - Every paper / repo cited, with section reference
   - The disambiguation rules proposed for the stoplist
   - The alias-collision rules (HDFC, Adani, Tata)
   - The license note for any lifted list
   - A 5–10-sentence **recommendation** on which library / approach to adopt (Part E)

4. **(Optional but valuable) `scratch/v2-031b_ticker_classification.csv`** — Part B2 output. Every NSE ticker classified into stoplist category or keep.

---

## §H — Done-criteria

The research is complete when:
- All four deliverables in §G exist in `scratch/`
- The stoplist contains every observed FP from the Concrete Evidence section above, plus a wider sweep from Part B
- The alias map covers every observed TP example **and** every mid/small-cap likely to appear in Exp 11's universe (top 100 by 7-day news volume — Gemini can read `scripts/research/output/exp11/coverage_check.md` §11.2 for the seed list)
- The research log has at least 3 prior-art citations per Part A sub-step
- A recommendation memo (5–10 sentences) names a preferred approach and the expected precision/recall lift

Once these land, **Claude + Lijo** author `ai_docs/tasks/V2-031b_news_ticker_tagging_hardening.md` — the implementation task James picks up. Per `feedback_task_authoring_vs_impl`: Lijo + Claude write the task file; James implements.

---

## §I — Out of scope (don't pursue here)

- Don't propose a new pipeline architecture. V2-031b is a hardening pass on the existing pipeline, not a rewrite.
- Don't propose Hindi / multilingual support beyond a one-line "is this needed?" question to Lijo. That's a separate task.
- Don't propose entity linking to Wikidata / DBpedia for now — heavy, slow, and downstream of getting basic English-ticker NER right.
- Don't extend the V2-031 backfill scope. That decision lives in V2-031b's task file.
- Don't run probes against Railway prod. All research is open-web. Coverage re-checks happen *after* V2-031b ships, via the existing `exp11-coverage-check.mjs` script.

---

## §J — Changelog

| Date | Change |
|---|---|
| 2026-05-27 | Initial checklist authored after V2-031's `exp11-coverage-check.mjs` + `exp11-coverage-slice.mjs` runs revealed 63% precision and 13% post-deploy coverage. Both miss the brief's §3 gates; per the brief's own rule, Exp 11 stays blocked → G1 hardening (V2-031b). This file briefs the Gemini external recon agent to produce the stoplist + alias map; Claude later synthesises into the V2-031b task file. |
| 2026-05-27 (v1 rejected) | Gemini's first-run deliverables were reviewed and **rejected**: 38/144 phantom stoplist symbols (KKR, RCB, BCCI, ICC, HERO, PAGE, ASIAN, BEST, MORE, OM, UMA, KAMA, GOLD, CARE, etc. — none present in `shared/nse-equity-master.json`), IPL company hallucinated as Incitec Pivot Ltd (correct: India Pesticides Limited), ENGINERSIN fix targets the symbol rather than the offending `"Engineers"` alias, PWL/PhysicsWallah absent from positive overlays despite being the seed false-negative example, "Mukesh Ambani's company" listed as RELIANCE alias, research log delivers 3 search summaries instead of the required ≥12 prior-art citations, classification CSV over-classifies (e.g. COALINDIA tagged as common English word). Architecture mismatch surfaced by Antigravity composer review: pipeline already has `HARD_DROP_ALIASES` + `DENYLIST_CONTEXT` + `build-equity-master.mjs` chain — V2-031b extends that build, not a parallel runtime stoplist. **Rerun instructions saved to `scratch/V2-031b_gemini_rerun_instructions.md`** (v2 schema: delta-overlay aliases, action-typed stoplist with phantom-symbol validation, regression checklist required). Awaiting Gemini v2 submission before Claude authors the V2-031b task file. |
| 2026-05-27 (v2 completed) | Gemini's second-run completed successfully. Removed all 38 phantom stoplist symbols, corrected IPL company to India Pesticides Limited, resolved ENGINERSIN via alias_drop of "Engineers", added PWL overlay with PhysicsWallah and dropped bare symbol, removed loose RELIANCE alias, wrote full research log with 12 citations, cleaned classification CSV (marked COALINDIA as keep), made positive alias overlays delta-only, created regression checklist and short tickers csv, recommended integration via build-equity-master.mjs. |
