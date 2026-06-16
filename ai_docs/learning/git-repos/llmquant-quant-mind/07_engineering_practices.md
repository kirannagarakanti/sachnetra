# Engineering Practices — LLMQuant / quant-mind

Source: `pyproject.toml` (tooling config), `scripts/verify.sh` (CI script), `tests/` (test suite structure)

---

## Toolchain Overview

| Tool | Replaces | Purpose |
|---|---|---|
| `ruff` | `black` + `isort` + `flake8` | Format + lint in one tool |
| `basedpyright` | `mypy` | Type checking (stricter defaults) |
| `import-linter` | Manual code review | Architectural boundary enforcement |
| `pytest` + `pytest-asyncio` + `pytest-cov` | — | Tests with async support + coverage |
| `respx` | `responses` | httpx request mocking |
| `pre-commit` | — | Git hooks for format/lint before commit |

All dev tooling installs via `pip install -e ".[dev]"`.

---

## `ruff` — Format + Lint

### Configuration

```toml
[tool.ruff]
line-length = 80
target-version = "py310"

[tool.ruff.lint]
select = ["D", "E", "F", "I", "W", "B", "W505"]
ignore = [
    "D100", "D102", "D104", "D105", "D107",   # Missing docstrings (not all required)
    "D203", "D213",                             # Conflicting docstring style rules
    "D401", "D402",                             # First-line imperative mood rules
    "E501",                                     # Line too long (handled by ruff format)
]

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = ["D", "B"]                   # Tests don't need docstrings
"**/__init__.py" = ["D104", "F401"]            # Package inits allowed to re-export
```

### Rule Sets Selected

| Code | Ruleset | What it catches |
|---|---|---|
| `D` | pydocstyle | Missing/malformed docstrings |
| `E`/`W` | pycodestyle | Style violations |
| `F` | pyflakes | Unused imports, undefined names |
| `I` | isort | Import ordering |
| `B` | bugbear | Subtle correctness issues (e.g. mutable defaults) |
| `W505` | pycodestyle | Doc line length |

**`ruff format`** (separate from `ruff check`): Formats the code like Black — deterministic, no config needed. Used in `verify.sh` as `ruff format --check` (fails if formatting would change anything).

### Why Not Black + isort Separately

Ruff runs both format and lint in a single tool, single process, ~100x faster than running Black, isort, and flake8 separately. The project comment explicitly says: "Black/isort/mypy from the previous toolchain are intentionally dropped — ruff and basedpyright supersede them."

---

## `basedpyright` — Type Checking

### Configuration

```toml
[tool.basedpyright]
include = ["quantmind"]
exclude = ["**/__pycache__", "**/.venv", "**/build"]
pythonVersion = "3.10"
typeCheckingMode = "standard"
reportMissingImports = "error"
reportMissingTypeStubs = "none"
reportIncompatibleVariableOverride = "none"
```

### Why `basedpyright` over `mypy`

`basedpyright` is a fork of Microsoft's `pyright` with stricter defaults and better Pydantic v2 support. Key differences from `mypy`:
- Faster (written in TypeScript, native binary)
- Better at narrowing discriminated unions (critical for `PaperInput = Union[...]`)
- Better Pydantic v2 type inference

### The `reportIncompatibleVariableOverride = "none"` Suppression

```python
# BaseKnowledge:
item_type: str

# Paper (subclass):
item_type: Literal["paper"] = "paper"
```

Python's type variance rules say that mutable attributes must be **invariant** — a subclass cannot narrow a `str` field to `Literal["paper"]` because if you have a `BaseKnowledge` reference pointing to a `Paper`, you could theoretically assign `item.item_type = "news"` which would violate `Literal["paper"]`. Basedpyright flags this correctly.

However, Pydantic models are **frozen** (`ConfigDict(frozen=True)`) — you cannot set any field after construction. The variance violation is impossible in practice. The suppression silences this false positive globally.

### `typeCheckingMode = "standard"` (not `strict`)

`strict` mode requires type annotations on every function argument and return value, which would be verbose for internal-only helpers. `standard` mode catches the important errors (missing imports, undefined names, type mismatches) without requiring exhaustive annotations.

---

## `import-linter` — Architectural Boundary Enforcement

See [01_architecture.md](./01_architecture.md) for the full contract text. Summary:

```
utils    ← leaf (no inbound deps)
knowledge ← leaf (no inbound deps)
configs   ← can see: knowledge
preprocess ← can see: utils
flows     ← can see: everything
magic     ← can see: everything + enforces no transitional packages
```

### How It Works

`import-linter` statically analyses the import graph of the package and checks it against the declared contracts. It runs as:
```bash
lint-imports --config pyproject.toml
```

If any contract is violated, it prints which import caused the violation and exits non-zero (failing CI).

### Why This Is Better Than Documentation

The existing SachNetra architecture rules are documented in `AGENTS.md`:
> `types/ has zero internal imports`
> `config/ imports only from types/`

But there's no enforcement. A developer can violate these rules and the violation only surfaces:
- At PR review (if a reviewer catches it)
- At Vercel deploy (if the Edge Function bundler catches an illegal import)
- At runtime (if the import causes a circular dependency)

`import-linter` catches violations at CI time — before the PR is merged.

### Equivalent for SachNetra (Node.js / TypeScript)

The equivalent tool is `eslint-plugin-boundaries` or `eslint-plugin-import`:

```js
// .eslintrc.js
module.exports = {
  plugins: ["boundaries"],
  settings: {
    "boundaries/elements": [
      { type: "types", pattern: "src/types/*" },
      { type: "config", pattern: "src/config/*" },
      { type: "services", pattern: "src/services/*" },
      { type: "components", pattern: "src/components/*" },
      { type: "api", pattern: "api/*" },
    ],
  },
  rules: {
    "boundaries/element-types": ["error", {
      default: "disallow",
      rules: [
        { from: "types", allow: [] },       // types imports nothing
        { from: "config", allow: ["types"] },
        { from: "services", allow: ["types", "config"] },
        { from: "components", allow: ["types", "config", "services"] },
        { from: "api", allow: [] },          // api/ is self-contained
      ],
    }],
  },
};
```

---

## `pytest` — Testing

### Configuration

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = [
    "--cov=quantmind",
    "--cov-report=term-missing",
    "--cov-fail-under=75",    # ← hard floor: CI fails if coverage < 75%
    "-ra",                     # report all non-passing tests
]
asyncio_mode = "auto"          # all async test functions run automatically
```

### Coverage Floor History

```
PR3: 60%   (parsers/sources still drag average down)
PR4: 65%   (parsers/sources gone; preprocess >85%)
PR5: 75%   (flow/, llm/, config/, transitional models/ deleted)
```

The coverage floor **increases with each PR** as dead code is removed. This is anti-regressive: once a module is well-tested, future PRs cannot accidentally lower coverage below the floor.

### `asyncio_mode = "auto"`

Without this, every async test function needs `@pytest.mark.asyncio`. With `auto` mode, any `async def test_*` function is automatically wrapped in an event loop. Simpler test writing.

### `respx` for httpx Mocking

```python
import respx
import httpx

@respx.mock
async def test_fetch_url():
    respx.get("https://example.com/paper.pdf").mock(
        return_value=httpx.Response(200, content=b"PDF bytes", headers={"content-type": "application/pdf"})
    )
    result = await fetch_url("https://example.com/paper.pdf")
    assert result.content_type == "application/pdf"
    assert result.bytes == b"PDF bytes"
```

`respx` is an httpx-specific mock library. It intercepts `httpx.AsyncClient` requests at the transport level, so the production code doesn't need to be modified for testing.

### Test File Structure

Tests mirror the package structure exactly:

```
tests/
├── knowledge/
│   ├── test_base.py          — BaseKnowledge, SourceRef, Citation, ExtractionRef
│   ├── test_news.py          — News construction, embedding_text
│   ├── test_earnings.py      — Earnings construction
│   ├── test_paper.py         — Paper tree construction, PaperKnowledgeCard
│   ├── test_tree.py          — TreeNode, walk_dfs, find_path, children_of
│   ├── test_roundtrip.py     — JSON serialise → deserialise round-trips for all types
│   ├── test_factor.py        — Factor stub
│   ├── test_thesis.py        — Thesis stub
│   └── test_graph.py         — GraphKnowledge subclassing guard
├── flows/
│   ├── test_paper.py         — paper_flow with mocked fetch + format
│   ├── test_batch.py         — batch_run error modes, concurrency, progress callback
│   └── test_runner.py        — run_with_observability, _CompositeRunHooks
├── configs/
│   ├── test_base.py          — BaseFlowCfg defaults and extra="forbid"
│   ├── test_paper.py         — PaperFlowCfg, PaperInput discriminator
│   ├── test_news.py          — NewsFlowCfg, NewsInput discriminator
│   └── test_earnings.py      — EarningsFlowCfg, EarningsInput discriminator
├── preprocess/
│   ├── test_clean.py         — normalize_unicode, collapse_whitespace, dedupe_lines
│   ├── test_time.py          — parse_filing_date, to_utc, business_days_between
│   ├── fetch/
│   │   ├── test_types.py     — Fetched, RawPaper construction
│   │   ├── test_http.py      — fetch_url with respx mocks
│   │   ├── test_arxiv.py     — _extract_arxiv_id, fetch_arxiv with mocks
│   │   ├── test_doi.py       — DOI metadata with mocks
│   │   └── test_local.py     — read_local_file
│   └── format/
│       ├── test_pdf.py       — pdf_to_markdown with pymupdf mocks
│       └── test_html.py      — html_to_markdown with trafilatura mocks
└── test_magic.py             — resolve_magic_input, _introspect_flow_signature, _pydantic_schema_str
```

### Key Test Pattern — Round-Trip

`test_roundtrip.py` verifies every concrete schema type can serialize to JSON and deserialise back without loss:

```python
def test_paper_roundtrip(sample_paper: Paper):
    json_str = sample_paper.model_dump_json()
    parsed = Paper.model_validate_json(json_str)
    assert parsed == sample_paper
```

This catches cases where a field type cannot be JSON-serialised (e.g., a non-serialisable type sneaks in) or where deserialisation produces a different object.

---

## `pre-commit` Hooks

Installed via `pre-commit install` after `pip install -e ".[dev]"`. Runs on every `git commit`:

1. `ruff format` — auto-formats changed files
2. `ruff check` — lints changed files
3. `basedpyright` — type-checks changed files
4. `lint-imports` — checks import contracts

If any hook fails, the commit is blocked. The developer must fix the issue before the commit is accepted.

---

## `scripts/verify.sh` (inferred)

Based on the `pyproject.toml` addopts and the project structure, `verify.sh` likely runs:

```bash
#!/bin/bash
set -euo pipefail

echo "=== Format check ==="
ruff format --check quantmind tests

echo "=== Lint ==="
ruff check quantmind tests

echo "=== Type check ==="
basedpyright quantmind

echo "=== Import contracts ==="
lint-imports

echo "=== Tests with coverage ==="
pytest --cov=quantmind --cov-fail-under=75

echo "All checks passed."
```

---

## Dependency Choices

| Dependency | Why this, not that |
|---|---|
| `httpx` not `requests` | Async-native; `requests` is sync-only and blocks the event loop |
| `pymupdf` not `pdfminer` | ~10x faster; simpler API; maintained |
| `trafilatura` not `beautifulsoup4` | Purpose-built for content extraction; language-aware; handles boilerplate automatically |
| `litellm` in deps | Provides an abstraction layer over many LLM providers (future multi-provider support) |
| `pydantic>=2.0.0` | v2 has much better discriminated unions, frozen models, JSON schema generation |
| `openai-agents>=0.14` | OpenAI Agents SDK — provides `Agent`, `Runner`, `RunHooks`, `RunConfig` |

**`marker-pdf` in `[full]` extras**: A higher-quality PDF-to-markdown library that preserves headings, tables, and math. Not in `[dev]` because it requires heavy ML dependencies (torch). Available for users who need better PDF quality.

---

## SachNetra Engineering Gap Analysis

| Practice | quant-mind | SachNetra | Gap |
|---|---|---|---|
| Linter | ruff (auto-fix) | ESLint (configured) | Low — ESLint exists |
| Type checker | basedpyright (strict) | tsc --noEmit (strict) | Low — tsc runs in CI |
| Architecture contracts | import-linter (code-enforced) | AGENTS.md (docs only) | **High** — no enforcement |
| Coverage gate | 75% floor (rising) | Not measured | **High** — no coverage CI |
| Async test support | pytest-asyncio auto | node:test (manual) | Medium — works, less ergonomic |
| HTTP mocking | respx (httpx-native) | nock / vi.mock | Low — equivalents exist |
| Pre-commit hooks | Yes (all checks) | Pre-push hook (some checks) | Low — pre-push exists |
