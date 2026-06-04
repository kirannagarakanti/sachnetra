# Architecture — LLMQuant / quant-mind

## Folder Structure

```
quantmind/
├── __init__.py                        # empty — no top-level re-exports
├── magic.py                           # APEX: natural-language → (input, cfg) resolver
│
├── flows/                             # APEX: pipeline orchestration
│   ├── __init__.py                    # exports paper_flow, batch_run
│   ├── paper.py                       # paper_flow — fetch → format → Agent(output_type=Paper)
│   ├── batch.py                       # batch_run — fan-out with asyncio.Semaphore + BatchResult
│   └── _runner.py                     # run_with_observability — wraps Runner.run with hooks
│
├── configs/                           # LAYER 1: typed flow configuration
│   ├── __init__.py
│   ├── base.py                        # BaseFlowCfg, BaseInput (shared by all flows)
│   ├── paper.py                       # PaperFlowCfg + PaperInput discriminated union
│   ├── news.py                        # NewsFlowCfg + NewsInput discriminated union
│   └── earnings.py                    # EarningsFlowCfg + EarningsInput discriminated union
│
├── preprocess/                        # LEAF: raw content → clean text
│   ├── __init__.py
│   ├── clean.py                       # normalize_unicode, collapse_whitespace, dedupe_lines
│   ├── time.py                        # parse_filing_date, to_utc, business_days_between
│   ├── fetch/
│   │   ├── _types.py                  # Fetched (frozen dataclass), RawPaper (subclass)
│   │   ├── arxiv.py                   # fetch_arxiv → RawPaper (metadata + PDF bytes)
│   │   ├── http.py                    # fetch_url → Fetched (stream with size cap)
│   │   ├── doi.py                     # fetch_doi → metadata (unpaywall fallback pending)
│   │   └── local.py                   # read_local_file → Fetched
│   └── format/
│       ├── pdf.py                     # pdf_to_markdown (pymupdf, asyncio.to_thread)
│       └── html.py                    # html_to_markdown (trafilatura, asyncio.to_thread)
│
├── knowledge/                         # LEAF: data standard (Pydantic v2)
│   ├── __init__.py                    # exports all public names
│   ├── _base.py                       # BaseKnowledge, SourceRef, Citation, ExtractionRef
│   ├── _flatten.py                    # FlattenKnowledge (marker base for atomic cards)
│   ├── _tree.py                       # TreeKnowledge, TreeNode (hierarchical artifacts)
│   ├── _graph.py                      # GraphKnowledge (placeholder, BLOCKED)
│   ├── paper.py                       # Paper (TreeKnowledge), PaperKnowledgeCard (FlattenKnowledge)
│   ├── news.py                        # News (FlattenKnowledge)
│   ├── earnings.py                    # Earnings (FlattenKnowledge)
│   ├── thesis.py                      # Thesis (FlattenKnowledge stub)
│   └── factor.py                      # Factor (FlattenKnowledge stub)
│
└── utils/
    ├── __init__.py
    └── logger.py                      # structured logger (stdlib logging wrapper)

tests/                                 # mirrors quantmind/ layout exactly
├── knowledge/                         # test_base, test_news, test_earnings, test_paper, etc.
├── flows/                             # test_paper, test_batch, test_runner
├── configs/                           # test_base, test_paper, test_news, test_earnings
├── preprocess/                        # test_clean, test_time, fetch/, format/
└── test_magic.py
```

---

## Dependency Graph (Enforced by import-linter)

```
                    ┌─────────────┐
                    │   magic.py  │ ← apex (no transitional imports allowed)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   flows/    │ ← apex (orchestrates everything below)
                    └──────┬──────┘
                           │ imports
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼─────┐ ┌────▼─────┐ ┌───▼──────────┐
       │  configs/  │ │knowledge/│ │  preprocess/ │
       └──────┬─────┘ └────┬─────┘ └───┬──────────┘
              │            │            │
              └────────────┼────────────┘
                           │ (knowledge ← preprocess is FORBIDDEN)
                    ┌──────▼──────┐
                    │   utils/    │ ← leaf (no inbound deps)
                    └─────────────┘
```

**Key rule**: `preprocess/` cannot import from `knowledge/` or `configs/`. The fetch + format layer does not know what Pydantic schemas will eventually hold its output. Mapping happens in `flows/`.

---

## The Five Import-Linter Contracts

These are `[[tool.importlinter.contracts]]` entries in `pyproject.toml`. CI fails if any contract is violated.

### Contract 1: `utils` is a leaf

```toml
name = "utils is a leaf"
type = "forbidden"
source_modules = ["quantmind.utils"]
forbidden_modules = ["quantmind.configs", "quantmind.flows",
                     "quantmind.knowledge", "quantmind.magic",
                     "quantmind.preprocess"]
```

`utils` can only import from stdlib and third-party packages. No internal upward imports.

### Contract 2: `knowledge` is a leaf

```toml
name = "knowledge is a leaf"
type = "forbidden"
source_modules = ["quantmind.knowledge"]
forbidden_modules = ["quantmind.configs", "quantmind.flows",
                     "quantmind.magic", "quantmind.preprocess",
                     "quantmind.utils"]
```

`knowledge` can only import `pydantic`, `uuid`, `datetime`. No internal imports at all — it is a pure data-definition layer.

### Contract 3: `configs` only depends on `knowledge`

```toml
name = "configs only depends on knowledge"
type = "forbidden"
source_modules = ["quantmind.configs"]
forbidden_modules = ["quantmind.flows", "quantmind.magic",
                     "quantmind.preprocess"]
```

`configs` can import from `knowledge` (e.g. `from quantmind.knowledge import BaseKnowledge`) and from `agents.ModelSettings`. Cannot see `flows` or `preprocess`.

### Contract 4: `preprocess` only depends on `utils`

```toml
name = "preprocess only depends on utils"
type = "forbidden"
source_modules = ["quantmind.preprocess"]
forbidden_modules = ["quantmind.configs", "quantmind.flows",
                     "quantmind.knowledge", "quantmind.magic"]
```

The preprocess layer is fetch-and-clean. It does not know about Pydantic schemas. This enforces the "dumb pipe" design.

### Contract 5: `flows + magic` forbid deleted transitional packages

```toml
name = "flows + magic is apex (no transitional package imports)"
source_modules = ["quantmind.flows", "quantmind.magic"]
forbidden_modules = ["quantmind.config", "quantmind.flow",
                     "quantmind.llm", "quantmind.models"]
```

These four packages (`config/`, `flow/`, `llm/`, `models/`) were deleted in PR5. The contract acts as a tripwire — if someone accidentally re-introduces them during a future refactor, CI fails immediately.

---

## The Two-Stage Pipeline Model

```
Stage 1 — Acquire + Structure (shipped, this repo)
───────────────────────────────────────────────────
  Source (arXiv / web / file / RSS)
      ↓ fetch_*() → Fetched / RawPaper
  Format layer
      ↓ pdf_to_markdown / html_to_markdown
  Clean layer
      ↓ normalize_unicode / collapse_whitespace / dedupe_lines
  Flow function
      ↓ Agent(output_type=Paper | News | Earnings | ...)
  BaseKnowledge object (Pydantic, frozen, immutable)

Stage 2 — Store + Retrieve (NOT shipped, extension point)
──────────────────────────────────────────────────────────
  BaseKnowledge.embedding_text()
      ↓ vector embedding
  Vector DB (caller chooses: Chroma, Pinecone, pgvector, etc.)
      ↓ semantic search
  Retrieval → RAG / DeepResearch / agent query answering
```

The repo is entirely Stage 1. The `embedding_text()` method on every schema is the **handoff interface** — it defines what string to embed, but does not perform the embedding.

---

## "Librarian vs Runtime" Distinction

`quant-mind` is a **library**, not a self-contained runnable service.

| quant-mind provides | quant-mind does NOT provide |
|---|---|
| Fetch helpers (arxiv, http, local) | HTTP API server |
| Format helpers (pdf, html) | Job scheduler / cron |
| Clean helpers (unicode, whitespace, dedup) | Vector DB client |
| Pydantic knowledge schemas | Authentication |
| Flow functions (`paper_flow`) | Persistence layer |
| Batch runner | CLI entry point |
| Magic resolver | Dashboard or UI |

You call `await paper_flow(ArxivIdentifier(id="2401.12345"))` from your own script, notebook, or service. The library does the heavy lifting; you own the orchestration.

---

## PR History (What Changed When)

| PR | What it added |
|---|---|
| PR1 | Initial knowledge schemas (`BaseKnowledge`, `FlattenKnowledge`, `TreeKnowledge`) |
| PR2 | `preprocess/fetch/` — arXiv, HTTP, local fetchers |
| PR3 | `preprocess/format/` — PDF and HTML parsers |
| PR4 | `preprocess/fetch/doi.py` (CrossRef metadata; unpaywall pending), `clean.py`, `time.py` |
| PR5 | `flows/` (paper_flow, batch_run, _runner), `magic.py`, deleted transitional packages (`config/`, `flow/`, `llm/`, `models/`) |
| PR6+ | (planned) Memory, trajectory archive, store layer |

---

## SachNetra Relevance

The import-linter pattern directly maps to SachNetra's dependency problem. Currently, boundary enforcement is documented in `AGENTS.md` but is not machine-checked. A developer can:

- Import `src/` code from an `api/` Edge Function (caught at deploy, not at PR)
- Import `services/` from `types/` (violates the `types → config → services → components` rule)
- Import `config/` from `utils/` (creates circular dependencies)

The equivalent for SachNetra would be ESLint import rules or `eslint-plugin-boundaries`. See [09_sachnetra_application.md](./09_sachnetra_application.md) for implementation details.
