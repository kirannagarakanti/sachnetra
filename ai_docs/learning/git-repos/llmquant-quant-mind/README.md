# LLMQuant / quant-mind — Documentation Folder

**Repo**: https://github.com/LLMQuant/quant-mind  
**Clone commit**: `8e21888` (2026-05-08) — PR5 "flows + magic apex layer"  
**Version**: `0.2.0`  
**License**: MIT  
**Language**: Python 3.10+  
**Documented**: 2026-06-04  
**Rubric snapshot**: FEATURE_RUBRIC.md v1  

---

## What This Folder Contains

Each file covers one subsystem of the repository in exhaustive detail. Read them in order the first time; jump directly to specific files for reference.

| File | What it covers |
|---|---|
| [01_architecture.md](./01_architecture.md) | Folder structure, dependency graph, import-linter contracts, the two-stage pipeline model |
| [02_knowledge_schemas.md](./02_knowledge_schemas.md) | Every schema class: `BaseKnowledge`, `SourceRef`, `Citation`, `ExtractionRef`, `FlattenKnowledge`, `TreeKnowledge`, `GraphKnowledge`, all concrete domain types |
| [03_flows_and_runner.md](./03_flows_and_runner.md) | `paper_flow`, `batch_run`, `BatchResult`, `_runner.py`, `RunHooks`, observability wiring |
| [04_preprocess.md](./04_preprocess.md) | Fetch layer (`arxiv`, `http`, `doi`, `local`), format layer (`pdf`, `html`), `clean.py`, `time.py` |
| [05_magic_resolver.md](./05_magic_resolver.md) | `resolve_magic_input`, `_introspect_flow_signature`, `_pydantic_schema_str`, `preview_resolve` |
| [06_configs.md](./06_configs.md) | `BaseFlowCfg`, `BaseInput`, `PaperFlowCfg + PaperInput`, `NewsFlowCfg + NewsInput`, `EarningsFlowCfg + EarningsInput` |
| [07_engineering_practices.md](./07_engineering_practices.md) | `ruff`, `basedpyright`, `import-linter`, `pytest-cov` floor, `verify.sh`, `pre-commit`, dependency choices |
| [08_sachnetra_comparison.md](./08_sachnetra_comparison.md) | Feature-by-feature comparison; which patterns SachNetra should adopt, which to reject |
| [09_sachnetra_application.md](./09_sachnetra_application.md) | Concrete implementation plan: how to port each Pursue-rated pattern into SachNetra |

---

## ELI12 (What This Repo Does)

Imagine you have 1,000 financial research papers, news articles, and earnings call transcripts. You can't read them all yourself. QuantMind reads them for you, extracts the important information (key findings, methodology, limitations, EPS numbers, guidance, sentiment), organises everything into structured typed records, and stores it so that an AI assistant can later answer questions like "What factor strategies work in Indian mid-cap equities?" or "Which companies issued profit warnings this week?"

It works in two stages:
1. **Preprocess**: Fetch raw bytes (PDF/HTML/RSS) → clean text → extract to structured Pydantic records
2. **Store + Retrieve**: Embed the records → semantic search → RAG or DeepResearch

QuantMind ships Stage 1 completely. Stage 2 (the store layer) is an extension point — you plug in your own vector DB.

---

## SachNetra Relevance Summary

| Pattern | Verdict | Priority |
|---|---|---|
| Unicode / ligature normaliser | **Pursue** | P0 — prevents silent ticker mismatches |
| `TreeKnowledge` hierarchical schema | **Pursue** | P1 — unblocks Exp 2, 10, 14 |
| `import-linter` architectural contracts | **Pursue** | P1 — enforce boundary rules in code, not docs |
| `business_days_between` in `time.py` | **Pursue** | P1 — needed for event-study offset calculations |
| `parse_filing_date` multi-format parser | **Pursue** | P2 — more robust than our current `new Date()` |
| `dedupe_lines` for PDF header stripping | **Pursue** | P2 — cheap quality improvement for future PDF ingestion |
| HTML boilerplate stripping (`trafilatura`) | **Better** | P2 — port concept to `@mozilla/readability` |
| LLM-based entity/ticker tagger | **Kill** | Contradicts V2-031 Decision 2 |
| `magic.py` NL config resolver | **Kill** | No interactive use case in production crons |

---

## Status

`documented` — Not yet promoted to wiki. Promote after at least one Pursue item is implemented in SachNetra.
