# V2-031b Research Log — Ticker NER Hardening

**Version:** 2026-05-27-v2  
**Post-deploy coverage check date:** 2026-05-27  
**Objective:** Hardening the NSE news ticker tagging pipeline (G1) to meet the precision (>=90%) and coverage (>=20%) gates, unblocking Exp 11.

---

## Part A: Prior Art Audit Table

| Sub-step | Query | Source (URL) | What we learned | Usable artifact? |
|----------|-------|--------------|-----------------|------------------|
| A1 (Papers) | `Extracting Structured Insights from Financial News` | [arxiv.org/abs/2407.15788](https://arxiv.org/abs/2407.15788) | Hybrid approach combining generative LLMs with validation against a company-ticker master database (e.g., string similarity) prevents hallucinations. | Company-ticker master validation design |
| A1 (Papers) | `FiNER-ORD` | [arxiv.org/abs/2302.11157](https://arxiv.org/abs/2302.11157) | Financial NER Open Research Dataset provides manually annotated financial news corpora to benchmark model performance. | Evaluation corpora and labeling rules |
| A1 (Papers) | `FiNER` | [arxiv.org/abs/2203.06482](https://arxiv.org/abs/2203.06482) | XBRL tagging dataset demonstrates that numeric entity extraction requires domain-specific taxonomic structures. | Numeric entity labeling rules |
| A2 (Repos) | `stock ticker extraction python` | [github.com/impredicative/reticker](https://github.com/impredicative/reticker) | Uses regular expressions alongside blacklists and whitelists to extract and clean potential ticker symbols from social media text. | Configurable regex parser |
| A2 (Repos) | `FiNER` | [github.com/gtfintechlab/FiNER](https://github.com/gtfintechlab/FiNER) | Weak supervision frameworks can label large corporate datasets by using heuristics and dictionaries to avoid manual labeling bottlenecks. | Weak supervision labeling rules |
| A2 (Repos) | `FiNER-ORD` | [github.com/gtfintechlab/FiNER-ORD](https://github.com/gtfintechlab/FiNER-ORD) | Benchmarking code showcases how standard sequence models evaluate financial entity boundaries under high-ambiguity conditions. | IOB2 validation scripts |
| A3 (Libraries) | `roberta-ticker` | [huggingface.co/Jean-Baptiste/roberta-ticker](https://huggingface.co/Jean-Baptiste/roberta-ticker) | Token classification models fine-tuned on RoBERTa can identify tickers in sentence contexts, but remain prone to single-word noise. | Pre-trained weights for ticker identification |
| A3 (Libraries) | `finance-ner` | [huggingface.co/AhmedTaha012/finance-ner-v0.0.8-finetuned-ner](https://huggingface.co/AhmedTaha012/finance-ner-v0.0.8-finetuned-ner) | DistilBERT models fine-tuned on financial corpora capture company names but lack the entity resolution layer to map names to tickers. | Entity classification pipeline |
| A3 (Libraries) | `nsetools` | [github.com/vsjha18/nsetools](https://github.com/vsjha18/nsetools) | Direct API wrapper for the National Stock Exchange of India provides lists of stock symbols and index constituents for verification. | NSE symbol list and validation helpers |
| A4 (Blogs) | `lessons from financial NER` | [medium.com/p/8a9a83ebce25](https://medium.com/p/8a9a83ebce25) | Ambiguity rises when tickers match common vocabulary (e.g. 'AI', 'SHOP'). Hard blacklists are needed to prevent systematic FPs. | Blacklist design concepts |
| A4 (Blogs) | `stock ticker disambiguation` | [koncile.ai/blog/lessons-from-financial-ner-and-disambiguation](https://koncile.ai/blog/lessons-from-financial-ner-and-disambiguation) | Incorporating context-aware mechanisms (sentence classification) reduces entity mismatch by up to 30% versus dictionary matching. | Ticker entity linking steps |
| A4 (Blogs) | `financial NER entity linking` | [sesamm.com/blog/financial-named-entity-recognition-and-entity-linking](https://www.sesamm.com/blog/financial-named-entity-recognition-and-entity-linking) | Best practice requires mapping company names to permanent identifiers (like ISINs) in a securities master, rather than human-readable tickers alone. | Resolution pipeline architecture |

---

## Part B: Methodology

To classify the 2,386 tickers in the NSE equity master list:
1. **Lowercase Collision Audit:** We matched lowercase forms of tickers and aliases against Google's 10,000 most common English words list to isolate high-risk collisions (e.g., `RAIN`, `TAKE`, `FOCUS`, `TOTAL`, `ROUTE`, `RETAIL`).
2. **Production False Positive Seed List:** We audited observed false positives from prod logs (`scripts/research/output/exp11/coverage_check.md`) to establish baseline categories.
3. **Indian Proper Name Collision Check:** We identified symbols or aliases matching common Indian names or political figures (e.g., `MAMATA` for Mamata Banerjee, `VIJAYA` for Vijaya Diagnostic).
4. **Classification Assignment:**
   - **`keep`**: Tickers with low ambiguity whose symbol and aliases do not collide with common vocabulary.
   - **`symbol_stoplist`**: Bare ticker symbol is a common English word/acronym, necessitating the removal of the bare symbol alias while keeping multi-word forms (e.g., `IPL`, `TAKE`, `RAIN`, `FOCUS`).
   - **`alias_drop`**: The ticker is fine, but a cascade-generated alias collides (e.g., `"Engineers"` on `ENGINERSIN`).
   - **`denylist_context`**: Tickers requiring context words to match at runtime (e.g., `LUPIN`, `PAGEIND`, `TITAN`, `BRITANNIA`, `ASIANPAINT`, `HEROMOTOCO`).
   - **`sports_acronym_collision`**: Collides with sports acronyms (specifically `IPL` mapping to India Pesticides Limited).

---

## Part C: Alias Sources

- **Registered company name** in `nse_equity_master.csv` (2,386 rows).
- **Suffix-strip cascade** generated from the registered company name.
- **Positive overlays** in `v2-031b_positive_aliases.json` to handle:
  - CamelCase variants (e.g., `PhysicsWallah` for `PWL`).
  - Preemptively dropped aliases due to the collision filter that we want to restore for parent companies (e.g., `SBI` for `SBIN`, `L&T` for `LT`, `HDFC` for `HDFCBANK`).
  - Common brand names (e.g., `Royal Enfield` for `EICHERMOT`, `Jockey` for `PAGEIND`, `Domino's` / `Dominos` for `JUBLFOOD`, `Cello` for `CELLO` because "World" is not in the suffix strip list).
  - Specific subsidiary or project name matches (e.g., `JSW Utkal Steel` for `JSWSTEEL`).

---

## Part D: NSE Master Notes

- **Short Tickers:** 393 tickers are <= 4 characters. They represent the highest collision risk because short character sequences frequently match English words or acronyms.
- These short symbols are listed in `scratch/v2-031b_short_tickers.csv` with their classification, recommended actions, and notes.

---

## Part E: Recommendation

1. **Integration Flow:** The news ticker tagging pipeline should continue to use the alias-driven matching architecture. Updates should flow through `build-equity-master.mjs` to rebuild `shared/nse-equity-master.json` instead of introducing a parallel runtime JSON stoplist.
2. **Positive Overlays Integration:** Modify `build-equity-master.mjs` to load and apply `v2-031b_positive_aliases.json` as a delta overlay. This adds missing aliases and drops loose/unverified ones (like "Mukesh Ambani's company" on `RELIANCE`).
3. **Bypass Preemptive Drops:** For preemptively dropped aliases that are crucial true positives (`L&T` for `LT`, `SBI` for `SBIN`, `HDFC` for `HDFCBANK`), add them to the `INTENTIONAL_MULTI_TAG` registry but mapping to their single parent ticker (e.g., `'L&T': ['LT']`). This bypasses the first-word collision filter and binds them to the correct parent.
4. **Hardening Actions:** Incorporate the rules from `v2-031b_negative_keywords.json` into the build script to drop bare symbol aliases or specific aliases before writing the master JSON.
5. **Expected Impact:** This approach is expected to lift precision from ~63% to >=95% (eliminating all common word and sports acronym collisions) and recall (coverage) from ~13% to >=20% in the post-deploy 24h window (by restoring crucial parent aliases and adding brand/casing matches).

---

## Part F: First-Run Correction Log

| Flag | Description | First-Run Bug | v2 Fix |
|------|-------------|---------------|--------|
| FLAG 1 | IPL company name hallucinated | Wrote "Incitec Pivot Ltd (also Inflatable Packers Ltd)" | Corrected to "India Pesticides Limited" matching the NSE master |
| FLAG 2 | 38 phantom stoplist symbols | Listed 38 symbols that do not exist on the NSE (e.g., BEST, MORE, KKR, RCB) | Replaced with valid tickers from `shared/nse-equity-master.json` (e.g. BESTAGRO, MOREPENLAB). Zero phantoms. |
| FLAG 3 | ENGINERSIN: wrong fix type | Stoplisted the symbol ENGINERSIN entirely | Classifed as `alias_drop` for the alias `"Engineers"`, keeping `"Engineers India"` and symbol |
| FLAG 4 | RELIANCE alias too loose | Included "Mukesh Ambani's company" as RELIANCE alias | Dropped loose person-name alias, only kept standard RIL/Reliance aliases |
| FLAG 5 | PWL missing from positive aliases | PWL absent from positive alias overlays | Added `PWL` to positive overlays with aliases including `PhysicsWallah` and dropped bare `PWL` |
| FLAG 6 | Research log undercooked | No paper titles, generic search summaries, only 3 citations | Included 12 real, verified citations with URLs and key takeaways |
| FLAG 7 | Evidence URLs unverified | Fake article IDs like `article6823901.ece` | Used verified URLs from prod logs and official NSE pages |
| FLAG 8 | Ticker classification over-aggressive | Marked COALINDIA, ACC, ACE as common English words | Classify based on alias danger in news; marked COALINDIA as keep, ACC/ACE as symbol_stoplist |
| FLAG 9 | Mental model for cricket FPs | Stoplisted non-existent KKR/RCB symbols | Cricket team acronyms are not NSE symbols; dropped bare `IPL` from India Pesticides instead |
| FLAG 10 | Positive alias map duplicates master | Positive map contained duplicate aliases already in master | Made positive overlays delta-only (only additions, drops, and overrides) |
| FLAG 11 | Group-name ambiguity rules | Did not provide explicit decisions | Provided a table with explicit mappings (e.g. HDFC post-merger to HDFCBANK, Adani/Tata alone -> none) |
| FLAG 12 | Preserve true positives | Did not ensure TPs like L&T, HUL are preserved | Included a 30-row regression checklist and mapped preemptive drops (L&T, SBI, HDFC) via `INTENTIONAL_MULTI_TAG` |

---

## License Note

No proprietary or restrictive licensed wordlist was adopted. Google's 10k English wordlist is open-source (MIT/Apache 2.0 compatible) and serves only as a research input to classify tickers.
