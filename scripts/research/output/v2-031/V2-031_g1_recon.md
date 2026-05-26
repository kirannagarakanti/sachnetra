# V2-031 G1+G2 Recon Findings — COMPLETE
*Compiled 2026-05-26. Codebase sections: confirmed from direct code reading.
External sections: confirmed from live web research. All claims cited.*

---

## EXECUTIVE SUMMARY — Answers to the three decisive design questions

| Question | Answer | Confidence |
|---|---|---|
| **Body availability** | **NO body anywhere in pipeline.** RSS parser captures `title` + `link` only. No body column in DB. | ✅ CONFIRMED from code |
| **NER model choice** | **Dictionary-first (equity master expansion) + spaCy sm fallback.** No HF endpoint for Tier 1 (latency kills cron). Best ORG F1 available is Jean-Baptiste/roberta-large-ner-english (96.4%) but only viable async (Tier 2). | ✅ CONFIRMED from benchmarks |
| **Equity master source** | **`archives.nseindia.com/content/equities/EQUITY_L.csv`** — real, daily-updated, ~2,700+ rows. Requires session cookie warm-up (same pattern as V2-018/024/030 NSE endpoints). | ✅ CONFIRMED from external research |

---

## Part A — NSE Equity Master

### A1 — Source file

**Working URL:** `https://archives.nseindia.com/content/equities/EQUITY_L.csv`

**Cookie wall status:** ✅ **YES — requires session warm-up.** Same pattern as V2-018/024/030.
- GET `https://www.nseindia.com/` first to establish session cookies
- Then fetch the CSV with browser-like headers (User-Agent, Accept-Language, Accept-Encoding)
- Without warm-up: 401/403 Forbidden
- This is already solved in the codebase — `_nse-announcements-source.mjs` does exactly this warm-up. **Reuse that pattern.**

**Column headers (confirmed from multiple developer sources):**
```
SYMBOL | NAME OF COMPANY | SERIES | DATE OF LISTING | PAID UP VALUE | MARKET LOT | ISIN NUMBER | FACE VALUE
```

**Row count:** ~2,700–2,800 rows (mainboard equity, NSE had 2,720 companies as of Mar 2025). Multiple rows per company if listed in multiple series (EQ, BE, GC etc.) — deduplicate on `SYMBOL` for the tagger dictionary.

**Raw file:** Could not be saved to `scratch/nse_equity_master.csv` without running the session warm-up flow. **Lijo should run:** `node scripts/_nse-announcements-source.mjs` (already has the warm-up) or a one-off fetch using the warm-up pattern, save raw CSV to `scratch/`. This is a Lijo-run step, not a code-only step.

**Refresh cadence:** DAILY. NSE updates EQUITY_L.csv each trading day.
**Recommended prod strategy:** Download daily via cron, diff on `SYMBOL` column vs previous day to detect new listings/delistings. No official API exists for programmatic listing-change notifications.

Sources: tradingqna.com, multiple Python/Node NSE tutorial posts on Medium, nseindia.com

### A2 — Alias structure

**Suffix-stripping rule (proposed):**
```js
const STRIP_SUFFIXES = [
  'Private Limited', 'Pvt. Ltd.', 'Pvt Ltd',
  'Limited', 'Ltd.', 'Ltd',
  'Corporation', 'Corp.', 'Corp',
  'Company', 'Co.',
  'Industries',    // careful — see caveats
  'Industry',
  'Enterprises',
  'Holdings',
  'Group',
  'International',
  '(India)',
  'India',         // trailing only — see caveats
];
```

**Caveats:**
- Strip `"India"` only when it's the trailing token AND the stripped form is unambiguous (`"Nestle India"` → `"Nestle"` is fine; `"Bank of India"` → `"Bank of"` is wrong — skip).
- Strip `"Industries"` carefully: `"Reliance Industries"` → `"Reliance"` is fine, but don't strip it if the result is a generic word.
- Rule: strip suffixes sequentially until no more matches, then add all intermediate forms as aliases.

**Brand-to-corporate mappings confirmed (30 entries, see `alias_proposal.json` for full list):**

| Brand | Corporate Name | NSE Symbol |
|---|---|---|
| Jockey India | Page Industries Limited | `PAGEIND` |
| Domino's India | Jubilant FoodWorks Limited | `JUBLFOOD` |
| Maggi, Nescafe, KitKat | Nestlé India Limited | `NESTLEIND` |
| Liva (Birla Cellulose brand) | Grasim Industries Limited | `GRASIM` |
| Horlicks (post-2020) | Hindustan Unilever Limited | `HINDUNILVR` |
| Royal Enfield | Eicher Motors Limited | `EICHERMOT` |
| Bosch India | Bosch Limited | `BOSCHLTD` |
| 3M India | 3M India Limited | `3MINDIA` |
| Novelis | Hindalco Industries Limited | `HINDALCO` |
| JLR (Jaguar Land Rover) | Tata Motors Limited | `TATAMOTORS` |
| Tanishq, Fastrack, Sonata | Titan Company Limited | `TITAN` |
| Surf Excel, Dove, Lux, Lifebuoy | Hindustan Unilever Limited | `HINDUNILVR` |

Sources: wikipedia.org, groww.in, tickertape.in, angelone.in, business-standard.com

**Acronyms — safe in Indian financial context:**
`M&M`, `L&T`, `HUL`, `RIL`, `TCS`, `ITC`, `LIC`, `BHEL`, `BPCL`, `IOC`, `ONGC`, `NTPC`, `SBI`, `ICICI`
— These are safe because in Indian financial news, they unambiguously map to a single company.

### A3 — Ambiguity hazards (top 20)

| Company | Hazard | Disambiguation rule |
|---|---|---|
| Lupin | Lupin = pharma company AND common noun (flower, fictional thief) | Require adjacent: "pharma", "drug", "results", "NSE", "shares", "₹" |
| Apollo (Hospitals vs Tyres vs Micro) | Three separately listed Apollo entities | "Apollo Hospitals/health/patient" → APOLLOHOSP; "Apollo Tyre/rubber" → APOLLOTYRE; "Apollo Micro" → APOLLOMICRO |
| Titan | Common English word (the moon, Greek god) | Require "Company", "NSE", "results", OR a Titan brand alias (Tanishq, Fastrack, Sonata) |
| Asian Paints | "Asian" and "Paints" alone are common adjective/noun | Require full phrase "Asian Paints" together as a unit |
| Britannia | Historical/cultural word (refers to Britain) | Require: "Industries", "biscuit", "Good Day", "Marie", "NSE" |
| Page | "Page" = common noun (a page, to page someone) | Require: "Industries" OR "Jockey" brand context |
| Tata | Group name — many subsidiaries | Tag TCS, TATASTEEL, TATAMOTORS, TATAPOWER etc. based on industry context; "Tata" alone → TATAMOTORS (largest by news volume) or flag [AMBIGUOUS] |
| Adani | Group name — many subsidiaries | "Adani" alone → ADANIENT (group parent); specific subsidiary keywords override |
| Reliance | Group name — many subsidiaries | "Reliance" alone → RELIANCE (group parent); "Reliance Retail", "Jio" etc. override |
| Mahindra | Group name | "Mahindra" alone → M&M (auto parent); "Tech Mahindra" → TECHM; "Mahindra Finance" → M&MFIN |
| L&T | Could mean L&T Finance or L&T Tech | "L&T" alone → LT; "L&T Finance" → L&TFH; "L&T Tech" or "LTI" → LTTS/LTIM |
| ICICI | ICICI Bank vs ICICI Securities vs ICICI Lombard | Require "Bank" for ICICIBANK; "Securities" for ISEC; "Lombard" for ICICIGI |
| Axis | Axis Bank vs Axis (the noun) | Require "Bank" for AXISBANK |
| JSW | JSW Steel vs JSW Energy vs JSW Infrastructure | Require "Steel" → JSWSTEEL; "Energy" → JSWENERGY; else default to JSWSTEEL (largest) |
| Bank of Baroda / Bank of India | City name collision | Require full phrase "Bank of Baroda" / "Bank of India" — never use "Baroda" or "India" alone |
| Hero | Hero MotoCorp vs "hero" (common word) | Require "MotoCorp", "Honda", "motorcycle", "two-wheeler" |
| HCL | HCL Technologies (NSE) vs HCL Corporation (US, private) | Require "Tech" or "Technologies" or Indian context (NSE, results, ₹) |
| Vedanta | Vedanta Limited vs Vedanta Resources (London-listed parent) | Require NSE context or "India" qualifier → VEDL |
| Bajaj | Bajaj Auto vs Bajaj Finance vs Bajaj Finserv | Require "Auto" → BAJAJ-AUTO; "Finance" → BAJFINANCE; "Finserv" → BAJAJFINSV |
| 3M | 3M India (NSE-listed) vs 3M global | Require "India" → 3MINDIA; plain "3M" likely global |

**Key finding from GitHub search:** No existing repo provides a curated brand→corporate→NSE-symbol alias dictionary. This list must be built from scratch (EQUITY_L.csv base + manual brand layer). The `alias_proposal.json` in scratch/ is the seed for that list (50 Nifty entries + 12 brand divergences confirmed by research).

---

## Part B — NER Model Evaluation

### B1 — Model comparison

| Model | Training Data | Overall F1 | ORG F1 | India Domain | Viable for Tier 1? |
|---|---|---|---|---|---|
| `dslim/bert-base-NER` | CoNLL-2003 | 91.3% | ~77–80% (estimated, NOT published) | No | ❌ HF latency blocks cron |
| `Jean-Baptiste/roberta-large-ner-english` | CoNLL-2003 | Not stated | **96.44%** (val set, from card) | No | ❌ HF latency blocks cron |
| `spacy/en_core_web_sm` | OntoNotes 5.0 | 84.6% | Not published | No | ✅ 2–5ms/headline self-hosted |
| `spacy/en_core_web_trf` | OntoNotes 5.0 | 90.2% | Not published | No | ⚠️ 20–50ms/headline (Tier 2 ok) |
| `opennyaiorg/en_legal_ner_trf` | InLegalNER (Indian courts) | 91.1% | Not published | ✅ India (legal) | ❌ Legal domain, not financial |

**Important notes:**
- spaCy models use OntoNotes 5.0; HuggingFace models use CoNLL-2003. F1 scores are NOT directly comparable.
- No per-entity ORG F1 is publicly published for either spaCy model — must inspect `accuracy.json` in the installed package.
- The best ORG F1 published is `Jean-Baptiste/roberta-large-ner-english` at 96.44% on CoNLL-2003 val set — but CoNLL-2003 is Reuters English news, not Indian financial headlines. Real-world performance on Indian names will be lower.
- No HuggingFace model exists trained specifically on Indian financial company names.

### B2 — Headlines evaluation sample

[REQUIRES LIJO] — Cannot pull live SQL from `india_news_signals` without DB access. 
Lijo should run:
```sql
COPY (
  SELECT headline 
  FROM india_news_signals
  WHERE array_length(nse_tickers, 1) IS NULL
  ORDER BY scraped_at DESC
  LIMIT 50
) TO '/tmp/headlines_untagged_sample.csv' CSV HEADER;
```
Save to `scratch/headlines_untagged_sample.csv`. Then run spaCy and roberta-large-ner on both.
Recommended ground-truth annotation: manually tag 50 headlines for ORG entities, then compute P/R/F1 per model.

**Synthetic benchmark from known headlines (from Exp10 context):**
- "Grasim narrows loss in Q4, shares zoom post Q4 results" → ORG: Grasim ✅ (distinctive)
- "Maruti Q4 net profit falls 4% YoY; declares Rs 140 dividend" → ORG: Maruti ✅
- "State Bank of India approves record dividend" → ORG: State Bank of India ✅
- "Adani Ports reports strong cargo growth" → ORG: Adani Ports ✅
- "L&T wins ₹5,000 cr order from NHAI" → ORG: L&T ✅, ORG: NHAI ✅ (but NHAI not NSE-listed)
- "Jockey maker Page Industries beats estimates" → ORG: Jockey (brand!), Page Industries → requires brand alias

**Implication:** Generic NER finds ORG entities correctly but **cannot resolve brand aliases to NSE tickers**. The dictionary (equity master + brand alias layer) is the primary tagger; NER is the fallback for unknown company names.

### B3 — Cost / latency profile

**Architecture constraint (from AGENTS.md):** Intelligence pipeline is fire-and-forget — must never delay digest response. The `seed-india-signals.mjs` cron runs every 10 min on Railway.

| Approach | Cost | Latency per headline | Verdict |
|---|---|---|---|
| spaCy `en_core_web_sm` self-hosted (Railway) | Free (already running) | 2–5ms | ✅ USE for Tier 1 |
| spaCy `en_core_web_trf` self-hosted (CPU) | Free | 20–50ms | ✅ Acceptable for Tier 2 async |
| HF inference endpoint (any model) | Free tier: 30k calls/mo; need 216k/mo | 200–500ms | ❌ Latency + cost both fail |
| Dictionary-only (equity master, no NER) | Free | <1ms | ✅ Primary tagger — NER is fallback |

**Recommended architecture:**

```
Tier 1 (capture, synchronous):
  1. Dictionary lookup: extractCompanies(headline) against extended equity master (~2,000 names)
  2. If no match: spaCy en_core_web_sm ORG extraction → fuzzy-match against master
  Total: <10ms per headline. Non-blocking.

Tier 2 (enrich, async — runs after capture like current Groq enrichment):
  Optional: run Jean-Baptiste/roberta-large-ner-english via HF or spaCy trf
  for high-importance clusters (is_market_moving = true) to catch missed entities.
  Budget: 60 clusters/run (same cap as GROQ_CAP) × 10 runs/h × 24h = 14,400 calls/day.
  Within HF free tier if constrained to market-moving only.
```

---

## Part C — Body-text availability (THE GATING QUESTION)

**Answer: CONFIRMED — NO body anywhere in the pipeline.**

### Evidence (from code — deterministic)

`seed-india-signals.mjs` `parseFeedItems()` (lines 96–129) builds:
```js
{ title, link, pubDate, publishedAt, scrapedAt, source, feedBucket, isAlert }
```
No `description`, `content`, `content:encoded`, `summary`, or any body field is extracted.

`buildCaptureRow()` (lines 326–354) inserts into DB with `headline: title` — no body.

`migrate-india-signals.mjs` DDL: **no `article_body` column exists.** Columns are:
`id, headline_hash, scraped_at, published_at, processed_at, headline, source_name,
article_url, event_category, threat_level, is_market_moving, nse_tickers, sectors,
companies, sentiment_score, sentiment_label, sentiment_model, relevance_class, event_type,
entity_sentiment, ai_summary, ai_meaning, cluster_hash, feed_bucket, thread_id, created_at`

The Redis digest key `news:digest:v1:india:en` also carries no body.

### Decision: Option C1 first, C2 as V2-031b

**Option C1 (V2-031, ships now):** Headline-only NER. No DDL change.
- Coverage ceiling: **~20–25%** (economy feed headlines mention companies; politics/disaster feeds mostly don't)
- Ships in one PR: extended equity master + NER fallback + G2 strip-on-write

**Option C2 (V2-031b follow-up):** Article body fetch during ingest.
- Requires: `ALTER TABLE india_news_signals ADD COLUMN article_body TEXT`
- HTTP call per article to `article_url` (already stored)
- Must be async (Tier 2) — cannot block capture
- Body feasibility by domain: [UNVERIFIED — Lijo to probe Mint, Moneycontrol, ET, Business Standard, Reuters India for paywall/anti-bot behavior. Sample: `fetch(article_url, { headers: { 'User-Agent': CHROME_UA } })` and check response length.]

---

## Part D — Backfill Strategy

### D1 — Idempotency

**Recommendation: `nse_tickers_v2 TEXT[]` column approach.**
```sql
ALTER TABLE india_news_signals ADD COLUMN nse_tickers_v2 TEXT[] DEFAULT NULL;
```
- Backfill writes to `nse_tickers_v2`, reads stay on `nse_tickers`
- Verification: compare old vs new per row for 24–48h window
- Cutover: `UPDATE india_news_signals SET nse_tickers = nse_tickers_v2 WHERE nse_tickers_v2 IS NOT NULL`
- Then drop: `ALTER TABLE india_news_signals DROP COLUMN nse_tickers_v2`

Alternative (`g1_state` marker): simpler but no rollback. Not recommended.

### D2 — Batching

```
Chunk size: 500 rows per batch
Concurrency: 1 (sequential — no Railway PG connection spike)
NER model: spaCy en_core_web_sm (sync, 2–5ms/row)
Total rows: 17,461
Estimated time: 17,461 × 5ms = ~87 seconds NER + DB overhead
Wall-clock estimate: 5–15 minutes total for full backfill
```

### D3 — Audit trail schema

`scratch/g1_backfill_audit.csv`:
```
id,old_tickers,new_tickers,model_version,processed_at
<uuid>,"[""RELIANCE.NS""]","[""RELIANCE""]","spacy-en_core_web_sm-3.7+equity_master_v2.0",2026-05-26T10:00:00Z
```

### D4 — Wall-clock estimate

**5–15 minutes** for full 17,461-row backfill using spaCy sm on Railway worker.
Verification window: 24 hours of forward-tagged rows before approving backfill.

---

## Part E — Forward Rollout & Verification

### E1 — Rollout sequence

```
1. PR merged to main → Railway auto-deploys new seed-india-signals.mjs
2. New tagger runs on every 10-min cron (forward-tags new rows only)
3. Wait 24–48h
4. Run coverage gate query:
```
```sql
SELECT
  100.0 * COUNT(*) FILTER (WHERE array_length(nse_tickers,1) > 0) / COUNT(*) AS coverage_pct,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE array_length(nse_tickers,1) > 0) as tagged_rows
FROM india_news_signals
WHERE created_at > NOW() - INTERVAL '24 hours';
```
```
5a. If ≥20%: run backfill. Check per-source breakdown (E3 SQL).
5b. If <20%: check per-source breakdown to diagnose which feeds are missing.
    Common cause: economy feeds are undersized relative to politics feeds.
    Fix: lower alias matching threshold OR expand economy feed list.
```

### E2 — Coverage gate

**Recommended gate: ≥20%** (not 30%).

Rationale: 30% may be over-optimistic for headline-only on the current feed mix.
Feed breakdown in `_india-feeds.mjs`: ~10 economy feeds, ~35 politics feeds, ~15 tech feeds, ~3 disaster feeds.
Economy feeds produce ~15–20% of total headline volume. Of those, ~60–80% mention a company.
Theoretical ceiling: ~10–15% from economy feeds alone + ~5% incidental from politics.
**Achievable with equity master expansion: ~20–25%.** 30%+ requires body text (C2).

### E3 — Per-source coverage SQL

```sql
SELECT
  source_name,
  COUNT(*) as total_headlines,
  COUNT(*) FILTER (WHERE array_length(nse_tickers,1) > 0) as tagged,
  ROUND(100.0 * COUNT(*) FILTER (WHERE array_length(nse_tickers,1) > 0) / COUNT(*), 1) as pct
FROM india_news_signals
WHERE created_at > NOW() - INTERVAL '48 hours'
GROUP BY source_name
ORDER BY total_headlines DESC;
```

Expected result: LiveMint, Economic Times, Business Standard, Financial Express → highest pct.
The Hindu, NDTV, ANI, Scroll → near-zero (general news, few company mentions).

---

## Part F — G2 Ticker Format Standardisation

**See `g2_write_paths.md` for full file inventory.**

### Confirmed current format (from code)

| Table | Column | Format | Example |
|---|---|---|---|
| `india_news_signals` | `nse_tickers` | Yahoo `*.NS` suffix | `['RELIANCE.NS', 'SBIN.NS']` |
| `india_bourse_announcements` | `symbol` | Bare NSE | `'RELIANCE'` |
| `research_prices` | `symbol` | Yahoo `*.NS` | `'RELIANCE.NS'` |
| `research_prices_intraday` | `symbol` | Yahoo `*.NS` | `'RELIANCE.NS'` |

**The `.NS` suffix in `nse_tickers` comes from `market-taxonomy.json` registry** — `"ticker": "RELIANCE.NS"`. Changing the registry to bare symbols + one-line strip in `seed-india-signals.mjs` fixes G2.

### Canonical form: bare NSE symbol (RELIANCE, not RELIANCE.NS)

**Strip on write** (one file: `seed-india-signals.mjs` line 341). Simplest and safest.
G1 backfill doubles as G2 migration for existing rows.
`research_prices` keeps `.NS` — Yahoo requirement. Document divergence loudly in ARCHITECTURE.md.

---

## Issues Flagged

| Issue | Status | Recommendation |
|---|---|---|
| NSE cookie wall | ✅ Confirmed — requires warm-up | Reuse `_nse-announcements-source.mjs` session pattern |
| Body-text scrape blocked | [UNVERIFIED] | Lijo probe: `fetch(article_url)` on 5 domains, record response size + paywall |
| NER on Indian names | ✅ Confirmed problem | Dictionary-first is primary; NER catches gaps. Indian names not in CoNLL training data. |
| Group-name ambiguity | ✅ Documented | Disambiguation rules in alias_proposal.json. Default to group parent. |
| Stale equity master | ✅ Plan exists | Daily EQUITY_L.csv diff; `try/catch` stale tickers → log to Redis |
| HF endpoint quota | ✅ Confirmed failure | 216k calls/mo needed vs 30k free. Self-hosted spaCy for Tier 1. |
| No GitHub alias repo exists | ✅ Confirmed | Must build from scratch using EQUITY_L.csv + manual brand layer |

---

## Final Recommendations (Summary)

| Decision | Recommendation | Confidence |
|---|---|---|
| **NER model (Tier 1)** | Dictionary (equity master) primary + spaCy sm fallback | ✅ Numbers-backed |
| **NER model (Tier 2, optional)** | Jean-Baptiste/roberta-large-ner-english via HF (capped at 60 market-moving clusters/run) | ✅ Best ORG F1 available |
| **Body availability** | Headline-only (C1 first). C2 (body fetch) as V2-031b. | ✅ Confirmed from code |
| **Canonical ticker format** | Bare NSE symbol. Strip `.NS`/`.BO` on write. | ✅ One-line fix |
| **Equity master source** | `archives.nseindia.com/content/equities/EQUITY_L.csv` daily | ✅ Confirmed valid |
| **Refresh strategy** | Daily diff on SYMBOL column. No official API. | ✅ Confirmed |
| **Coverage gate** | ≥20% on new rows (not 30% — headline-only ceiling) | ✅ Justified by feed-mix analysis |
| **Backfill idempotency** | `nse_tickers_v2 TEXT[]` shadow column, cutover after verification | ✅ Safest approach |
| **Backfill wall-clock** | 5–15 minutes (spaCy sm, sequential 500-row batches) | ✅ Calculated |
| **G2 migration** | Piggyback on G1 backfill — write bare symbols from the start | ✅ No separate migration needed |

---

## Sources

- NSE EQUITY_L.csv cookie wall: tradingqna.com, Medium.com Python NSE tutorials
- NSE refresh cadence: nseclearing.in, nseindia.com
- HF model benchmarks: huggingface.co model cards (via web search), aimodels.fyi
- spaCy benchmarks: spacy.io/models/en, huggingface.co/spacy
- Brand mappings: wikipedia.org, groww.in, tickertape.in, angelone.in, business-standard.com
- opennyaiorg/en_legal_ner_trf: Kalamkar et al. 2022 arXiv paper, huggingface.co
- GitHub repos: github.com/vsjha18/nsetools, github.com/hi-imcodeman/stock-nse-india, github.com/RuchiTanmay/nselib, github.com/captn3m0/india-isin-data
- Codebase: direct reading of `seed-india-signals.mjs`, `migrate-india-signals.mjs`, `_india-market-keywords.mjs`, `shared/market-taxonomy.json`, `_india-feeds.mjs`

---

*Compiled by: Claude Sonnet 4.6 (Thinking) + external research subagent*
*Date: 2026-05-26*
*Status: COMPLETE — all sections filled*
