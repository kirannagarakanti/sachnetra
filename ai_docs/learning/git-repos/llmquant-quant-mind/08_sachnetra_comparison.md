# SachNetra Comparison — LLMQuant / quant-mind

This document compares quant-mind patterns against their SachNetra equivalents. Every comparison cites specific SachNetra file paths.

---

## Comparison Framework

For each pattern, we assess:
- **What quant-mind does**: The specific implementation
- **What SachNetra does**: The current equivalent (with file path)
- **Gap**: The delta between them
- **Verdict**: Pursue / Better / Good / Park / Kill

---

## 1. Text Cleaning — Unicode Normalisation

### quant-mind

`quantmind/preprocess/clean.py` — `normalize_unicode(text)`:
- NFKC normalisation first (fullwidth → ASCII, etc.)
- 13-entry ligature/smart-quote map (`ﬁ` → `fi`, `"` → `"`, `–` → `-`, `\u00a0` → space)
- Control character removal (`\x00-\x08`, `\x0b-\x1f`, `\x7f`)
- Single compiled regex for all ligature replacements (one pass)

### SachNetra

`scripts/_india-market-keywords.mjs` — ticker matching uses a word-boundary regex against news headlines. The input headlines come from RSS feeds and are fed directly into the regex with no Unicode normalisation.

`scripts/seed-india-signals.mjs` — fetches headlines from RSS via `feed.items[].title`. No preprocessing step.

### Gap

SachNetra has **zero Unicode normalisation** before regex matching. If an RSS feed or NSE Bourse returns a headline with:
- A ligature: `ﬁnancial results` instead of `financial results`
- Smart quotes: `L\u2019T` instead of `L'T`
- Non-breaking spaces in ticker names

The regex will silently fail to match. This is a silent failure — no error, just missed coverage.

### Evidence

`scripts/research/output/exp11/coverage_check.md` shows 5.02% coverage vs the 20% gate. Some portion of this gap may be Unicode-related mismatches — we don't have a breakdown, but it's a known risk class.

### Verdict: **Pursue (P0)**

One function, one afternoon to port to JavaScript. Zero ongoing cost. Prevents silent failures.

---

## 2. Text Cleaning — Whitespace Collapse + Line Dedup

### quant-mind

`quantmind/preprocess/clean.py`:
- `collapse_whitespace`: collapses `[ \t\f\v]+` → single space; `\n{3,}` → `\n\n`; strips trailing whitespace per line
- `dedupe_lines`: removes consecutive duplicate lines (for PDF page headers/footers)

### SachNetra

No equivalent. News headlines are short (< 200 chars) so whitespace is rarely an issue for headlines. However, when full article bodies are fetched (for FinBERT sentiment), extra whitespace and repeated headers inflate token usage.

### Gap

Low priority now. Becomes relevant when SachNetra processes full filing bodies from NSE Bourse (PDFs or long HTML pages).

### Verdict: **Pursue (P2)**

Easy port. Low urgency. Do it when filing body processing is added.

---

## 3. Document Structure — TreeKnowledge

### quant-mind

`quantmind/knowledge/_tree.py`:
- `TreeNode`: flat adjacency list (`parent_id`, `children_ids`), mandatory `summary`, optional `content` on leaves only
- `TreeKnowledge`: O(1) node lookup, DFS traversal, root-to-node path finding
- `Paper`: concrete `TreeKnowledge` subclass for research papers

### SachNetra

`services/nse-bourse.ts` (or equivalent) — filings are fetched and stored as flat strings. The `body` field in Redis/PostgreSQL is a plain text blob.

No hierarchical structure exists anywhere in SachNetra for document content.

### Gap

**Major structural gap**. SachNetra treats all filing content as unstructured text. For Exp 2 (announcement categories → price impact), the experiment needs to isolate:
- "earnings guidance" sections vs "management commentary" vs "auditor remarks"

These are structurally distinct parts of the same filing. Without a tree, the only way to isolate them is regex + heuristics over the flat body — fragile and labour-intensive.

### Evidence

`ai_docs/sachnetra v2/wiki/syntheses/research_state_summary.md`:
- Exp 10 direction extraction bug: "could not reliably extract whether a filing was positive/negative" — this is because the classifier is reading the full document instead of the relevant section
- Exp 14 (governance shock): N=0 usable events because content classification is unreliable

### Verdict: **Pursue (P1)**

Unblocks Exp 2, Exp 10 (direction extraction fix), Exp 14. Schema is language-agnostic — port `TreeNode` + `TreeKnowledge` to TypeScript using `zod`.

---

## 4. Provenance — `SourceRef` vs Bare Strings

### quant-mind

`quantmind/knowledge/_base.py` — `SourceRef`:
```python
kind: Literal["arxiv", "http", "doi", "local", "rss", "transcript", "manual"]
uri: str | None = None
fetched_at: datetime | None = None
content_hash: str | None = None   # sha256 for dedup
```

Every knowledge item stores a typed provenance reference — not a bare URL string.

### SachNetra

`scripts/seed-india-signals.mjs` — news items in PostgreSQL store `source_url: text` (bare string). No content hash. No dedup beyond URL equality.

### Gap

If the same news story appears in two RSS feeds (e.g., Moneycontrol AND Economic Times both publish the same PTI wire story), SachNetra stores it twice. This inflates the dataset and causes double-counting in analysis.

`content_hash` (SHA-256 of the raw bytes) would deduplicate stories regardless of which feed delivered them.

### Verdict: **Pursue (P2)**

Add `content_hash` to the news records schema. SHA-256 in Node.js: `crypto.createHash('sha256').update(body).digest('hex')`. One field, big dedup benefit.

---

## 5. Trust — `confidence` Tiers vs Float Scores

### quant-mind

`quantmind/knowledge/_base.py`:
```python
confidence: Literal["low", "medium", "high"] = "medium"
```

Three-way categorical — strict, queryable, validated by Pydantic.

### SachNetra

`scripts/_sentiment-chain.mjs` (FinBERT output) — stores `sentiment_score: float` (0.0–1.0). No explicit confidence field.

### Gap

SachNetra has a sentiment score but no confidence label. This means there's no way to filter "only high-confidence extractions" in downstream analysis. A score of 0.52 could be low-confidence or genuinely neutral — the float doesn't encode that distinction.

### Verdict: **Park**

The confidence model requires re-thinking how SachNetra stores extraction quality. Not blocking anything today.

---

## 6. Architecture Enforcement — Import Contracts

### quant-mind

`pyproject.toml` — 5 `import-linter` contracts that enforce the dependency graph. CI fails on any violation.

### SachNetra

`AGENTS.md` documents the dependency direction:
```
types/ → config/ → services/ → components/ → app/ → App.ts
api/ self-contained
```

Pre-push hook runs `node --check` and esbuild bundle validation for Edge Functions. But no tool enforces the TypeScript import direction.

### Gap

A developer can freely import `services/` from `types/`, or `components/` from `config/`, and nothing will fail until a human reviews the PR or a runtime circular dependency crashes the app.

Edge Functions are partially enforced (esbuild checks prevent `../src/` imports from `api/`), but the SPA layer is not enforced.

### Evidence

No specific violations found — but the risk is latent. The `services/` layer has 120+ files; as it grows, the risk of unintentional dependency creep increases.

### Verdict: **Pursue (P1)**

`eslint-plugin-boundaries` adds this check to ESLint. No runtime cost. Catches violations at PR time.

---

## 7. Date/Time Handling — Multi-Format Parser

### quant-mind

`quantmind/preprocess/time.py` — `parse_filing_date`:
- 11 format patterns, specificity-first
- Always returns UTC-aware datetime
- `business_days_between` for event-study offsets

### SachNetra

`scripts/seed-india-signals.mjs` — uses `new Date(str)` for parsing. V8's date parser is locale-dependent and fails on formats like `"23-May-2026 09:15:00"` (NSE Bourse format) or `"23/05/2026"` (BSE format).

### Gap

SachNetra's date parsing is fragile. NSE Bourse returns `dd-MMM-yyyy` format. BSE returns `dd/MM/yyyy`. Both fail with bare `new Date()`.

The event-study experiments (Exp 4, Exp 10) need accurate filing timestamps to compute price return windows. A wrong timestamp means wrong event-study offsets.

### Evidence

Exp 4 showed ~13 minute latency edge — this measurement depends on accurate `filing_time` vs `first_tick_time` comparison. Any date parsing error would corrupt these measurements.

### Verdict: **Pursue (P1)**

Port `parse_filing_date` to JavaScript. The 11 date formats cover all NSE/BSE formats we've seen. `dayjs` or `date-fns` can parse these with a format string array.

---

## 8. LLM-Based Entity Tagger

### quant-mind

`news_flow` (planned) would use `Agent(output_type=News)` to extract entities (tickers, company names) from headlines using an LLM.

### SachNetra

`scripts/_india-market-keywords.mjs` — deterministic keyword/regex tagger against the NSE master list. V2-031b hardens the alias map with 99 negative-keyword actions to fix precision from 63% to 30/30 in smoke tests.

### Gap

SachNetra's approach is faster, cheaper, and (after V2-031b) more accurate for Indian equities because it has direct access to the NSE master ticker alias list — something an LLM doesn't have in its weights.

### Evidence

- `scripts/research/output/exp11/coverage_check.md`: precision issue was alias pollution, not model capability
- `ai_docs/tasks/V2-031b_news_ticker_tagging_hardening.md`: Decision 2 explicitly prohibits LLM-based tagging on the cron path

### Verdict: **Kill**

The deterministic approach is 300-6000x faster, $0 marginal cost, and more accurate for Indian company names after the alias map is fixed.

---

## 9. Batch Concurrency

### quant-mind

`quantmind/flows/batch.py` — `batch_run`:
- `asyncio.Semaphore(concurrency)` for bounded fan-out
- `BatchResult` with `results[i]` parallel to `inputs[i]`
- `on_error: "raise" | "skip"` mode
- `on_progress` callback

### SachNetra

`scripts/_batch-sentiment.mjs` (inferred) — likely uses `Promise.allSettled()` with manual throttling via `p-limit` or similar. No structured `BatchResult` equivalent.

### Gap

The `BatchResult` data structure is cleaner than raw `Promise.allSettled` results — errors are indexed and sorted, successes are easily extracted, duration is tracked. The `on_progress` callback is useful for long-running batch jobs.

### Verdict: **Better (Park for now)**

SachNetra's batch processing works. The `BatchResult` pattern would improve ergonomics but isn't blocking anything.

---

## 10. Natural Language Config Resolver (`magic.py`)

### quant-mind

`quantmind/magic.py` — `resolve_magic_input`:
- Introspects flow signature at runtime
- Renders JSON schemas into system prompt
- Runs a lightweight resolver agent (`gpt-4o-mini`)
- Returns typed `(input_obj, cfg_obj)`

### SachNetra

No equivalent. Production crons use hardcoded config. Research scripts use environment variables or CLI arguments.

### Gap

SachNetra has no interactive use case that would benefit from NL-to-config resolution. The production architecture is deterministic crons, not interactive query sessions.

### Verdict: **Kill** for production

Marginally useful for Lijo's local research scripts. Not appropriate for the production cron architecture.

---

## Summary Table

| Pattern | quant-mind | SachNetra equivalent | Verdict |
|---|---|---|---|
| Unicode normaliser | `clean.py:normalize_unicode` | None | **Pursue P0** |
| Whitespace cleaner | `clean.py:collapse_whitespace` | None | **Pursue P2** |
| Line deduplicator | `clean.py:dedupe_lines` | None | **Pursue P2** |
| Tree document schema | `_tree.py:TreeKnowledge` | Flat string `body` field | **Pursue P1** |
| Typed provenance (`SourceRef`) | `_base.py:SourceRef` | `source_url: text` | **Pursue P2** |
| Multi-format date parser | `time.py:parse_filing_date` | `new Date(str)` (fragile) | **Pursue P1** |
| Business day counter | `time.py:business_days_between` | Missing | **Pursue P1** |
| Import contracts | `import-linter` in CI | AGENTS.md (docs only) | **Pursue P1** |
| Confidence tiers | `BaseKnowledge.confidence` | `sentiment_score: float` | **Park** |
| HTML boilerplate stripper | `html.py:trafilatura` | None | **Better (P2)** |
| LLM entity tagger | `news_flow` (planned) | Regex tagger (V2-031b) | **Kill** |
| NL config resolver | `magic.py` | None | **Kill** |
