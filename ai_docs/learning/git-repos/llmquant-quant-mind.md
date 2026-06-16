---
github_url: https://github.com/LLMQuant/quant-mind
owner: LLMQuant
repo: quant-mind
license: MIT
language: Python
last_commit: 2026-05-08
stars: ~10
audience: professional
tags: [quant, machine-learning, data-engineering, artificial-intelligence, backtesting]
domains: [tagging, sentiment, research, data-engineering, ops]
date_added: 2026-06-04
last_reviewed: 2026-06-04
status: documented
reviewed_by: gemini
evidence_checked: [V2-031b, exp11/coverage_check.md, exp11/recall_diagnosis.md, exp11/coverage_slice.md, _india-market-keywords.mjs, seed-india-signals.mjs]
---

# quant-mind — Intelligent knowledge extraction and retrieval framework for quantitative finance

> **Why Lijo added this**: To study how a modern, structured, and modular pipeline ingests unstructured financial research (papers, news, filings) and extracts it into typed Pydantic/JSON entities using domain LLMs and Agent SDKs.

---

## TL;DR (3 bullets)

- Decoupled, two-stage library (Stage 1: knowledge extraction/parsing; Stage 2: semantic retrieval/RAG) built as a domain layer on top of the `openai-agents` Python SDK.
- Demonstrates strong architectural contracts and linting (`import-linter`) alongside typed hierarchical models (`TreeKnowledge`) for multi-section documents like papers or transcripts.
- Lacks real-time streaming/cron orchestration and is currently mid-migration to its SQLite-based cognitive store (`mind/store/`), meaning it is primarily a stateless extraction library today.

---

## ELI12 — what is this repo?

Imagine you are a quant researcher who has to read 500 new finance papers, news articles, and company filings every single day to find trading ideas. You would get tired and miss key details! QuantMind is an AI assistant that reads all these documents for you. It splits them into sections (like abstract, methodology, and limitations), translates PDFs and web pages into clean text, and extracts key facts into a standardized digital "card" (using Pydantic models). Other AI agents can then query this structured memory graph to answer deep questions about factor strategies or market regimes in seconds.

---

## Architecture snapshot

```
quantmind/
├── configs/      — centralized input schemas and flow configurations (base, earnings, news, paper)
├── flows/        — end-to-end extraction pipeline runners (paper_flow, batch_run, _runner)
├── knowledge/    — Pydantic schemas for data standard (FlattenKnowledge, TreeKnowledge, BaseKnowledge)
├── preprocess/   — fetchers (arxiv, http, local) and formatters (pdf_to_markdown, html_to_markdown, clean, time)
├── magic.py      — resolve_magic_input: natural language -> (input, cfg) resolver agent
└── utils/        — logger only
```

**Stack**: Python 3.10+, `openai-agents` (OpenAI Agents SDK), `pydantic` (v2), `pymupdf` (PDF format), `trafilatura` (HTML parser), `arxiv` (client), `httpx`, `ruff` (linter/formatter), `basedpyright` (strict type checking), `import-linter` (boundary contracts).

**Entry points**: `quantmind/flows/paper.py` (`paper_flow` entrypoint), `quantmind/flows/batch.py` (`batch_run` for concurrency), `quantmind/magic.py` (`resolve_magic_input` user interface).

---

## Evidence cross-check (required — before rating SachNetra)

> **Do not rate SachNetra "today" from repo README alone.** Load prod/task evidence first. If you cannot verify, write **unverified — needs Lijo** and cap SachNetra today at **Good** max.

| Claim about SachNetra | Evidence source | Measured value | Gate / target | Pass? |
|---|---|---|---|---|
| G1 ticker tagging precision | `scripts/smoke-test-tagger-v2-031b.mjs` / `V2-031b` task | 30/30 (100% on local regression smoke test) | ≥90% | Y |
| G1 news ticker tagging coverage (24h) | `scripts/research/output/exp11/coverage_slice.md` | 7.87% post-deploy slice (2026-05-29) | ≥20% | N |
| Sentiment calibration bias | `research_state_summary.md` Exp 3 | 14/16 (88% positive bias in news sentiment) | discriminating | N |
| Latency edge on large-caps | `research_state_summary.md` Exp 4 | ~13 min median lead over wires | leading | Y |

**Active tasks to cross-check** (grep `ai_docs/tasks/` before writing):
- Tagging: [V2-031b](file:///C:/Users/Daniel%20Reddy/Desktop/sachnetra/sachnetra/ai_docs/tasks/V2-031b_news_ticker_tagging_hardening.md) (precision fixed via build-time alias stoplist/overlays; smoke tests 30/30 passed; backfill not run yet).
- Sentiment: `_sentiment-chain.mjs` (FinBERT-based, positivity bias G6 unresolved).
- Research: `exp11-coverage-check.mjs` and `exp11-coverage-slice.mjs` (unpriced mid/small-caps unmapped; G1 coverage gate is the primary blocker).

---

## Domain map

> Repos often mix capabilities. **Split recommendations by domain** — do not let a sentiment-repo "fix" a tagging problem (or vice versa).

| Domain | What it covers in SachNetra | This repo relevant? |
|---|---|---|
| **Tagging (G1)** | Headline → NSE ticker via `nse-equity-master.json`, `_india-market-keywords.mjs` | **Partial** — Structures news events into `News` cards but relies on LLMs rather than deterministic filters. |
| **Sentiment (G6)** | FinBERT/LLM scoring, calibration, sector propagation via `_sentiment-chain.mjs` | **Partial** — Extracts basic `positive/neutral/negative` sentiment on `News` schema. |
| **Research** | Backtests, experiments in `scripts/research/` | **N/A** — Pure extraction/retrieval; no backtesting logic. |
| **Data engineering** | Collectors, schema, `seed-*.mjs` | **Y** — Strong PDF/HTML parsing structure, clean normalizers, and batch runner logic. |
| **Product / UX** | Panels, alerts (low V2 priority) | **N/A** — No frontend dashboard elements. |

---

## Best practices extracted

> Each row must cite repo file path(s). Generic advice without a path is not allowed.

| # | Practice | Domain | Repo location | Why it matters |
|---|---|---|---|---|
| 1 | Unicode Normalization & Ligature Clean | Data engineering | [clean.py](file:///C:/Users/Daniel%20Reddy/Desktop/sachnetra/sachnetra/scratch/quant-mind/quantmind/preprocess/clean.py) | Collapses ligatures (e.g. `\ufb00` -> `ff`) and smart quotes, preventing regex ticker mismatches. |
| 2 | Architectural boundary enforcement | Ops / engineering | [pyproject.toml](file:///C:/Users/Daniel%20Reddy/Desktop/sachnetra/sachnetra/scratch/quant-mind/pyproject.toml) | Programmatically prevents circular imports and locks down structural layers (`utils` -> `configs` -> `flows`). |
| 3 | Hierarchical `TreeKnowledge` | Data engineering | [_tree.py](file:///C:/Users/Daniel%20Reddy/Desktop/sachnetra/sachnetra/scratch/quant-mind/quantmind/knowledge/_tree.py) | Represents multi-section documents (filings, transcripts) as trees for agent-navigated drilling down. |
| 4 | Dynamic Signature Introspection | Engineering | [magic.py](file:///C:/Users/Daniel%20Reddy/Desktop/sachnetra/sachnetra/scratch/quant-mind/quantmind/magic.py) | Automatically builds Pydantic schemas for LLM parameters by inspecting function type signatures. |
| 5 | Bounded-concurrency batch runner | Data engineering | [batch.py](file:///C:/Users/Daniel%20Reddy/Desktop/sachnetra/sachnetra/scratch/quant-mind/quantmind/flows/batch.py) | Binds async concurrency with a semaphore and aggregates execution statistics (results vs errors). |

### Deep dives (optional)

- **Practice 1: Unicode & Ligature Clean (`clean.py`)**: PDF parsers frequently leak Unicode ligatures like `\ufb01` (`fi`) or non-breaking spaces. The `normalize_unicode` function collapses these to standard ASCII equivalents before processing:
  ```python
  normalized = unicodedata.normalize("NFKC", text)
  normalized = _LIGATURE_RE.sub(lambda m: _LIGATURE_MAP[m.group(0)], normalized)
  ```
  This is directly applicable to our NSE announcements parsing (`build-equity-master.mjs`) to avoid missing tickers due to formatting bugs.
- **Practice 2: Architectural boundary enforcement (`import-linter`)**: Programmatic validation of package layers ensures dev changes don't accidentally leak. For example, keeping the `knowledge` schema decoupled:
  ```toml
  [[tool.importlinter.contracts]]
  name = "knowledge is a leaf (no inbound deps from quantmind packages)"
  type = "forbidden"
  source_modules = ["quantmind.knowledge"]
  forbidden_modules = ["quantmind.configs", "quantmind.flows", "quantmind.magic", ...]
  ```
  We can adapt this in our Node/TS pipeline using `eslint-plugin-import` or custom scripts.

---

## Design principles — reinforced or contradicted

> SachNetra's locked design: **deterministic extraction in code; LLM only for synthesis/scoring.** (V2-031 Decision 2: no NER in cron hot path.)

| Principle | Repo stance | SachNetra stance | Verdict |
|---|---|---|---|
| Deterministic ticker resolution (dict/fuzzy, not LLM guess) | Contradicts — uses Agent resolver/tagger on PDF text (`paper_flow`). | Reinforces — matches via keyword bounds regex on master JSON (`_india-market-keywords.mjs`). | **Contradicts** — We reject LLM NER in hot path for speed and cost. |
| LLM for synthesis only (summary, sentiment, not math) | Reinforces — uses LLM to synthesize/summarize parsed sections. | Reinforces — uses LLM for news synthesis and sentiment scoring (`_sentiment-chain.mjs`). | **Reinforces** — Validates our choice to keep logic split. |
| Precision before recall on tagging | N/A — focuses on extraction coverage. | Reinforces — prioritizes 90%+ precision over raw recall (`V2-031b`). | **N/A** |

**One-line design read**: The repo contradicts our deterministic pipeline by using LLMs for schema resolution, but reinforces our division of labor by utilizing LLMs strictly for synthesis (summaries) once text is extracted.

---

## Feature quality assessment

> Rate using [`FEATURE_RUBRIC.md`](./FEATURE_RUBRIC.md): **Poor / Good / Better / Excellent**. Justify each tier. **SachNetra today** must cite evidence from §Evidence cross-check — never "perfect" or "robust" without gate numbers.

### Repo features rated

| Feature | Domain | Repo tier | Repo location | Why this tier |
|---|---|---|---|---|
| HTML-to-Markdown parsing | Data engineering | **Better** | [html.py](file:///C:/Users/Daniel%20Reddy/Desktop/sachnetra/sachnetra/scratch/quant-mind/quantmind/preprocess/format/html.py) | Uses `trafilatura` to strip boilerplate (footer, nav) and outputs clean table markdown. |
| PDF-to-Markdown parsing | Data engineering | **Good** | [pdf.py](file:///C:/Users/Daniel%20Reddy/Desktop/sachnetra/sachnetra/scratch/quant-mind/quantmind/preprocess/format/pdf.py) | Simple `PyMuPDF` wrapper; lacks layout extraction or table structure (marker-pdf is deferred). |
| Hierarchical Document Tree | Data engineering | **Excellent** | [_tree.py](file:///C:/Users/Daniel%20Reddy/Desktop/sachnetra/sachnetra/scratch/quant-mind/quantmind/knowledge/_tree.py) | Clean DFS walks, node lookups, and lazy-loading support for long transcripts/filings. |
| Parameter Resolution | ML / AI | **Better** | [magic.py](file:///C:/Users/Daniel%20Reddy/Desktop/sachnetra/sachnetra/scratch/quant-mind/quantmind/magic.py) | Meta-programming resolver that turns free-form prompt into strict Pydantic inputs. |
| Concurrency Semaphore | Data engineering | **Good** | [batch.py](file:///C:/Users/Daniel%20Reddy/Desktop/sachnetra/sachnetra/scratch/quant-mind/quantmind/flows/batch.py) | Standard asyncio semaphore wrapping; robust but not highly differentiated. |

### SachNetra today vs target

| Feature | Domain | SachNetra today | Repo reference | Target for us | Gap | Evidence |
|---|---|---|---|---|---|---|
| PDF announcement cleaner | Data engineering | **Good** — `build-equity-master.mjs` regex | **Better** — `clean.py` normalizer | **Better** | +1 | Ligature errors seen in `v2-031b_research_log.md` |
| Hierarchical filing parser | Data engineering | Not implemented | **Excellent** — `_tree.py` node tree | **Better** | +2 | Long corporate filings are currently processed as flat strings |
| Architectural linting | Ops / reliability | **Good** — `AGENTS.md` guidelines | **Excellent** — `import-linter` | **Better** | +1 | Checked via pre-push script compiler, not structural contracts |
| Natural language agent query | ML / AI | Not implemented | **Better** — `magic.py` | **Poor** | — | hot-path runs are strictly automated cron seeds |

---

## Best to have in SachNetra

> Max 10 rows. Sorted P0 → P2. **Each row must name its domain.** Do not list tagging fixes from a sentiment-only repo (or vice versa).

> ⚠️ Re-triaged 2026-06-04 (Claude verification pass) — see Corrections log. Original Gemini draft rated the first two higher.

| Priority | Feature | Domain | Target tier | Today tier | Blocked by | Source (repo path) | Owner | Verdict |
|---|---|---|---|---|---|---|---|---|
| P2 | HTML-entity decode + control-char strip (NOT the ligature map) | Data engineering | Better | Good (`normalizeQuotes` already exists) | — | `_india-market-keywords.mjs:55-72` (extend) | James | Pursue (hygiene) — does NOT move coverage gate |
| P1 | Programmatic import boundaries | Ops / reliability | Better | Good | — (but multi-day cleanup, not 4h) | `pyproject.toml` pattern → `eslint-plugin-boundaries` | James | Pursue (low pri) |
| Park | Hierarchical Document Tree structure | Data engineering | Better | Poor (N/A) | Decision to resume filing-text experiments (Exp14 refuted; Exp15 is price-only) | `_tree.py` pattern | James | Park |
| Park | Multi-format date parser | Data engineering | Better | Good (RSS path OK) | Scope to V2-018 Bourse collector + verify harness; blind swap risks Exp 4 corruption | `time.py` pattern | James | Park |

---

## Do not build (Poor)

> Features rated **Poor for SachNetra** — explicit kill list.

| Feature | Domain | Repo tier | Why Poor for us | Verdict |
|---|---|---|---|---|
| Natural language config resolver (`resolve_magic_input`) | ML / AI | Better in repo | Our production pipeline is driven by deterministic crons (`seed-india-signals.mjs`); interactive NL-to-config resolution has no hot-path ROI. | Kill |
| LLM-based ticker tagger / NER | Tagging (G1) | Good in repo | Contradicts `V2-031 Decision 2`; too slow and expensive for 10-minute news cycles. Deterministic word boundaries regex must remain primary. | Kill |

---

## SachNetra comparison

> Compare repo patterns to our codebase. Cite SachNetra paths or docs.

| Practice / pattern | Domain | Repo does | SachNetra does | Gap | Recommendation |
|---|---|---|---|---|---|
| File formatting | Data engineering | Decouples format (`pdf.py`, `html.py`) and clean (`clean.py`) | Inlines string cleanup inside parsers | Partial | **Pursue** — Extract a central `utils/clean.mjs` for ligatures and whitespace cleanup. |
| Dependency boundaries | Ops | Uses `import-linter` to block invalid import paths | Defines rules in `AGENTS.md` without automated contract checks | Partial | **Pursue** — Implement `eslint-plugin-import` rules enforcing `types -> config -> services` flow. |
| Concurrency control | Data engineering | Employs `asyncio.Semaphore` with progress logging | Spawns parallel promises manually in script loops | Partial | **Park** — Our current volume doesn't trigger node exhaustion yet; manual throttle is sufficient. |

**What we already do well** (don't reinvent — must cite path + evidence):
- **API caching & stampede protection**: Highly optimized Redis/gateway cache layer ([server/_shared](file:///C:/Users/Daniel%20Reddy/Desktop/sachnetra/sachnetra/server/_shared)), far ahead of the repo's opaque `_archive_run_artifacts` stub.
- **Deterministic ticker matching**: Word-boundary mapping ([_india-market-keywords.mjs](file:///C:/Users/Daniel%20Reddy/Desktop/sachnetra/sachnetra/scripts/_india-market-keywords.mjs)) is fast and costless (nearing 100% precision on V2-031b smoke tests).

**What we're missing or doing differently**:
- **Filing chunking**: We digest filings as flat text fields. The tree-based mapping of documents (`TreeKnowledge`) is a cleaner abstraction for long annual reports.

---

## Improvement backlog

| # | Item | Domain | Owner | Effort | Blocked by | Verdict | Notes |
|---|---|---|---|---|---|---|---|
| 1 | HTML-entity decode + control-char strip in tagger | Data engineering | James | S | None | Pursue (hygiene) | Re-triaged 2026-06-04: `normalizeQuotes` already exists; add `he` entity-decode (real artifact is `&#038;`/`&#8217;`, not ligatures). NOT a coverage-gate fix. |
| 2 | Programmatic dependency boundaries | Ops | James | M (cleanup, not S) | None | Pursue (low pri) | Add `eslint-plugin-boundaries`; first run surfaces existing violations needing a cleanup sprint. |
| 3 | Tree-structured filing ingestion | Data engineering | James | M | Decision to resume filing-text experiments | Park | Re-triaged 2026-06-04: Exp14 refuted, Exp15 price-only — no live consumer for the tree today. |
| 4 | Multi-format date parser | Data engineering | James | S | Scope to V2-018 Bourse collector | Park | Re-triaged 2026-06-04: RSS path already OK; blind swap risks IST double-shift corrupting Exp 4 latency. |

---

## Net verdict (3 lines — required)

> Claude-style bottom line. A human should get the action list from this block alone.

> ⚠️ Rewritten 2026-06-04 (Claude verification pass) — original verdict overstated the Unicode item; see Corrections log.

1. **Tier-1 (do now)**: Almost nothing is urgent. The only clean win is **HTML-entity decode + control-char strip** in the tagger (cheap hygiene) — but bank it as hygiene, NOT a coverage-gate fix. The real coverage lever is master-list completeness (microcap names) + accepting that systemic/macro news is untaggable, per `recall_diagnosis.md`.
2. **Tier-2 (parked, not gated-on-coverage)**: Tree filing schema and the date parser are parked — the tree serves refuted/off-focus experiments (Exp14 NULL, Exp15 price-only); the date parser is mis-targeted and risks corrupting Exp 4 if swapped blindly.
3. **Do not confuse**: (a) This repo's LLM tagger is offline-only — keep the deterministic regex tagger in the cron hot path (correct in original). (b) Do NOT treat the Unicode port as the coverage fix — it isn't, and it targets ligatures when the observed artifact is HTML entities.

---

## Risks & limitations

- **License**: MIT (fully compatible).
- **Maintenance**: Active (latest commit 2026-05-08).
- **Data assumptions**: Relies on academic arXiv structures and standard western PDFs; Indian NSE corporate filings have distinct structure and require custom formatting rules.
- **Stack mismatch**: Python 3.10 vs our Node/TS pipeline; requires porting the clean/regex patterns rather than copying source files.

---

## So what for SachNetra?

**Experiments to add/kill**:
- N/A — this repo is an extraction-library reference; it yields engineering hygiene, not a new experiment. (Corrected 2026-06-04: an earlier draft labelled the Unicode change "Exp15" — that ID is already Volatility-Adjusted Cross-Sectional Momentum, and a code hygiene change is not an experiment.)

**Features / engineering to build** (by domain):
- **Tagging**: HTML-entity decode + control-char strip alongside the existing `normalizeQuotes()` (hygiene, not a coverage fix).
- **Data engineering**: `eslint-plugin-boundaries` import-direction rules (low priority).

**Data to capture**:
- N/A.

**Pursue / Park / Kill** (pick exactly one for *this repo's primary lesson*):

- **Park** — Re-triaged 2026-06-04 (Claude verification). The repo's strongest patterns (tree schema, date parser) serve refuted/off-focus experiments or are mis-targeted; the only do-now item is minor tagger hygiene (Improvement backlog #1), which doesn't rise to a "Pursue" verdict for the repo as a whole. Primary lesson confirmed is a **Kill**: its LLM-tagger / NL-resolver approach validates our deterministic pipeline by counter-example.

---

## Open questions (for next session)

- Does `trafilatura`'s HTML boilerplate stripping work cleanly on local Indian financial portals (like Moneycontrol or Livemint), or does it drop key news body sentences?

---

## Corrections log

> Appended 2026-06-04 (Claude verification pass — code + cited-evidence cross-check).

| Date | What was wrong | Corrected to | Evidence |
|---|---|---|---|
| 2026-06-04 | "SachNetra has zero Unicode normalisation before regex matching" (08 §1) | False — `_india-market-keywords.mjs:55-72` already runs `normalizeQuotes()` (curly→straight). Only ligatures + NFC are missing. | `scripts/_india-market-keywords.mjs:55-72` |
| 2026-06-04 | Unicode normaliser rated **P0 "unblocks coverage gate"** | Demoted to **P2 hygiene**; does NOT move the gate. Coverage gap is master-list gaps + untaggable systemic news, not formatting. | `exp11/recall_diagnosis.md` §2 (systemic 0.05%, idiosyncratic/sector 100%) + §4 sample |
| 2026-06-04 | Proposed `clean.py` port (NFC + ligature map) fixes the observed artifact | Wrong artifact — real prod noise is **HTML entities** (`S&#038;P`, `China&#8217;s`), which the port does not decode. Need `he`/entity decode. | `exp11/recall_diagnosis.md` §4 rows 8, 19, 21 |
| 2026-06-04 | Multi-format date parser **P1**, "replace `new Date()` in `seed-india-signals.mjs`" | Mis-targeted: that file parses RSS `pubDate` (RFC-822, has TZ; `new Date()` is fine). Fragile NSE/BSE formats live in the V2-018 Bourse collector. Blind swap risks IST double-shift corrupting Exp 4 latency. → **Park / scope to Bourse collector + verify harness.** | `scripts/seed-india-signals.mjs:108-118` |
| 2026-06-04 | Tree schema **P1** "unblocks Exp 2/10/14" | Exp 14 REFUTED (commit `aa06d371`); current bet Exp15 is price-only (no filing text). → **Park** behind a decision to resume filing-text work. | `wiki/experiments/exp15_brief.md`; git `aa06d371` |
| 2026-06-04 | "Add: Exp15 — test if Unicode normalization improves coverage" (So what) | **ID collision** — Exp15 is already Volatility-Adjusted Cross-Sectional Momentum. A code hygiene change is not an experiment. Removed. | `wiki/experiments/exp15_brief.md` |
| 2026-06-04 | All deep-dive `file:///…/scratch/quant-mind/…` links | Dead — scratch repo removed; source excerpts no longer re-verifiable from disk (inline snippets retained). | `ls scratch/quant-mind` → not found |
| 2026-06-04 | Verdicts anchored to "20% headline-coverage gate" | Wrong denominator — 95% of news is systemic/untaggable; meaningful metric is ~28% recall *among market-moving* (24h). | `exp11/recall_diagnosis.md` §1 |

---

## Wiki impact

- **Created**: N/A
- **Updated**: N/A
- **Logged in**: `wiki/log.md` on 2026-06-04 / N/A
- **Status after promote**: stays `documented`
