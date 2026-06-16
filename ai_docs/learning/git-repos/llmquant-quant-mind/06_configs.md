# Configs — LLMQuant / quant-mind

Files: `quantmind/configs/base.py`, `configs/paper.py`, `configs/news.py`, `configs/earnings.py`

---

## Purpose

The `configs/` layer sits between `knowledge/` and `flows/`. It defines:
1. **`BaseFlowCfg`**: All knobs shared by every flow (model selection, timeouts, tracing, budget guardrails)
2. **`BaseInput`**: Marker base for discriminated-union input variants
3. **Domain-specific subclasses**: `PaperFlowCfg + PaperInput`, `NewsFlowCfg + NewsInput`, `EarningsFlowCfg + EarningsInput`

`configs/` cannot import from `flows/`, `magic/`, or `preprocess/` (enforced by import-linter). It CAN import from `knowledge/` and `agents.ModelSettings`.

---

## `BaseFlowCfg`

```python
class BaseFlowCfg(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Model & execution
    model: str = "gpt-4o"
    model_settings: ModelSettings | None = None
    max_turns: int = 10
    timeout_seconds: float = 300.0

    # Output persistence
    output_dir: str | None = None
    overwrite: bool = False

    # Mind / memory (filesystem-backed when set)
    memory_dir: str | None = None

    # Observability
    workflow_name: str | None = None
    trace_metadata: dict[str, str] | None = None
    trace_include_sensitive_data: bool = True
    tracing_disabled: bool = False
    archive_trajectory: bool = True

    # Cost / budget guardrails
    max_total_input_tokens: int | None = None
    max_total_cost_usd: float | None = None

    # Default guardrails (PR8+)
    enable_default_guardrails: bool = True
```

### Field Groups

**Model & execution**:
- `model`: Which LLM to use. Default `"gpt-4o"` — the most capable. Flows that need speed over quality use `"gpt-4o-mini"`.
- `model_settings`: Optional `ModelSettings` from the agents SDK — controls temperature, top-p, max tokens, etc. `None` = SDK defaults.
- `max_turns`: How many LLM turns the agent is allowed. 10 is generous for single-document extraction.
- `timeout_seconds`: 5-minute hard timeout on the entire flow.

**Output persistence**:
- `output_dir`: If set, the flow saves its output JSON to this directory.
- `overwrite`: Whether to overwrite an existing output file.

**Observability**:
- `workflow_name`: Shown in OpenAI tracing dashboards. Defaults to `"quantmind.<agent_name>"`.
- `trace_metadata`: Arbitrary key-value pairs attached to the trace (e.g., `{"env": "prod", "experiment": "exp12", "ticker": "TATAMOTORS"}`).
- `trace_include_sensitive_data`: Set `False` in production to prevent the full document text from appearing in traces.
- `tracing_disabled`: Set `True` in CI/tests to avoid polluting the trace dashboard.

**Budget guardrails**:
- `max_total_input_tokens`: Hard limit on input tokens across all turns. Prevents runaway costs on very long documents.
- `max_total_cost_usd`: Hard USD cost limit. Raises an exception if exceeded (PR5 plumbing, enforced in PR8+).

---

## `BaseInput`

```python
class BaseInput(BaseModel):
    """Parent of every flow's discriminated-union input member."""
    model_config = ConfigDict(extra="forbid")
```

No fields. Just a marker base with `extra="forbid"`. Every concrete input variant adds:
- A `type: Literal["..."]` field (the discriminator)
- Domain-specific fields

---

## Paper Flow Config (`configs/paper.py`)

### `PaperFlowCfg`

```python
class PaperFlowCfg(BaseFlowCfg):
    """Knobs specific to paper_flow."""
    extract_methodology: bool = True
    extract_limitations: bool = True
    asset_class_hint: str | None = None
```

Three extra fields:
- `extract_methodology`: When `True`, the agent creates a dedicated methodology subtree with per-step summaries. Turn off for papers where methodology is trivial.
- `extract_limitations`: When `True`, surfaces limitations as a dedicated top-level node. Useful for systematic reviews where limitations matter.
- `asset_class_hint`: Hint to the agent if the paper doesn't state an asset class explicitly. E.g., `"indian equities"` if you're processing a paper from the NSE research series.

### `PaperInput` (Discriminated Union)

```python
class ArxivIdentifier(BaseInput):
    type: Literal["arxiv"] = "arxiv"
    id: str             # "2401.12345", "arXiv:2401.12345v3", full arxiv URL

class HttpUrl(BaseInput):
    type: Literal["http"] = "http"
    url: str            # any web URL; PDF vs HTML decided by content-type

class LocalFilePath(BaseInput):
    type: Literal["local"] = "local"
    path: Path          # filesystem path to PDF / HTML / Markdown

class RawText(BaseInput):
    type: Literal["text"] = "text"
    text: str           # inline text (for tests or pre-cleaned inputs)

class DoiIdentifier(BaseInput):
    type: Literal["doi"] = "doi"
    doi: str            # e.g. "10.1145/3469213"

PaperInput = Annotated[
    Union[ArxivIdentifier, HttpUrl, LocalFilePath, RawText, DoiIdentifier],
    Field(discriminator="type"),
]
```

**Why a discriminated union**: When you deserialise `PaperInput` from JSON or from the `magic.py` resolver output, Pydantic needs to know which class to instantiate. The `discriminator="type"` field lets it do this in O(1) — it reads `type` first, then validates the rest of the fields against that class's schema.

**`DoiIdentifier` is currently `NotImplementedError`**: The `doi.py` fetcher can only get CrossRef metadata (title, publisher, landing page URL). The "unpaywall fallback" (DOI → Open Access PDF URL) hasn't shipped. The class exists so `PaperInput` type definitions are stable.

---

## News Flow Config (`configs/news.py`)

### `NewsFlowCfg`

```python
class NewsFlowCfg(BaseFlowCfg):
    """Knobs specific to news_flow."""
    materiality_threshold: Literal["low", "medium", "high"] = "medium"
    entities_hint: list[str] = Field(default_factory=list)
```

- `materiality_threshold`: Instructs the agent to only flag news as `high` materiality if the event exceeds this threshold. E.g., `"high"` means only market-moving events get `materiality="high"`.
- `entities_hint`: Pre-seeded list of entity names to watch for. E.g., `["TATAMOTORS", "Tata Motors", "JLR"]` hints to the agent which entities matter for this run.

### `NewsInput` (Discriminated Union)

```python
class RssFeed(BaseInput):
    type: Literal["rss"] = "rss"
    url: str            # RSS/Atom feed URL

class HttpUrl(BaseInput):
    type: Literal["http"] = "http"
    url: str            # single article URL

class Headline(BaseInput):
    type: Literal["headline"] = "headline"
    text: str           # inline headline text (no body fetch needed)

NewsInput = Annotated[
    Union[RssFeed, HttpUrl, Headline],
    Field(discriminator="type"),
]
```

**`Headline` variant**: Allows passing a raw headline string directly — no fetching needed. This is exactly what SachNetra would use: feed the headline from the Redis cache directly, without re-fetching the article body.

---

## Earnings Flow Config (`configs/earnings.py`)

### `EarningsFlowCfg`

```python
class EarningsFlowCfg(BaseFlowCfg):
    """Knobs specific to earnings_flow."""
    detect_surprises: bool = True
    include_guidance: bool = True
```

- `detect_surprises`: When `True`, the agent compares reported figures to consensus and flags `surprise_flags` in the `Earnings` schema (e.g., `["eps_beat", "revenue_miss"]`).
- `include_guidance`: When `True`, the agent extracts guidance text into `Earnings.guidance`. Disable if you only want historical actuals.

### `EarningsInput` (Discriminated Union)

```python
class TickerPeriod(BaseInput):
    type: Literal["ticker_period"] = "ticker_period"
    ticker: str         # "TATAMOTORS", "TCS", "INFY"
    period: str         # "2026Q1", "FY2025"

class TranscriptText(BaseInput):
    type: Literal["transcript"] = "transcript"
    text: str           # raw earnings call transcript

class HttpUrl(BaseInput):
    type: Literal["http"] = "http"
    url: str            # URL to an earnings release or IR filing

EarningsInput = Annotated[
    Union[TickerPeriod, TranscriptText, HttpUrl],
    Field(discriminator="type"),
]
```

**`TickerPeriod`**: The most structured input — ticker + period. The `earnings_flow` (when it ships) would use this to fetch the filing from NSE/BSE APIs, parse it, and extract `Earnings`.

**`TranscriptText`**: Paste a raw earnings call transcript and get an `Earnings` card back. No fetching needed.

---

## How Configs Are Used in Practice

### In a Flow Function

```python
async def paper_flow(input: PaperInput, *, cfg: PaperFlowCfg | None = None, ...) -> Paper:
    cfg = cfg or PaperFlowCfg()   # defaults to gpt-4o, max_turns=10, etc.
    ...
    agent = Agent(
        model=cfg.model,
        ...
    )
    run_cfg = RunConfig(
        workflow_name=cfg.workflow_name or "quantmind.paper_extractor",
        trace_metadata=cfg.trace_metadata,
        tracing_disabled=cfg.tracing_disabled,
    )
```

### In Batch Processing

```python
cfg = PaperFlowCfg(
    model="gpt-4o-mini",          # cheaper for bulk
    tracing_disabled=True,         # don't pollute traces with 200 runs
    max_total_cost_usd=5.0,        # hard budget cap
    trace_metadata={"batch": "nifty50-papers-2026", "experiment": "exp12"},
)

result = await batch_run(paper_flow, arxiv_ids, cfg=cfg, concurrency=8)
```

### In the Magic Resolver

```python
# The resolver sees the full JSON schema of PaperFlowCfg
# and maps "use gpt-4o-mini" → cfg.model = "gpt-4o-mini"
inp, cfg = await resolve_magic_input(
    "Process arXiv 2401.12345 using gpt-4o-mini, focus on methodology",
    target_flow=paper_flow,
)
# → PaperFlowCfg(model="gpt-4o-mini", extract_methodology=True, ...)
```

---

## SachNetra Relevance

The config pattern itself — typed `BaseFlowCfg` with `extra="forbid"` — is directly applicable to SachNetra's research experiment configs. Currently experiments like Exp 12 are configured via environment variables and hardcoded constants in `scripts/`. A typed config object would:
- Make experiment parameters explicit and reviewable
- Enable `trace_metadata={"experiment": "exp12", "hypothesis": "H2a"}` for auditability
- Allow `max_total_cost_usd` as a guardrail during expensive batch LLM runs

The discriminated union pattern (`NewsInput`, `EarningsInput`) is the right way to structure SachNetra's filing ingestion inputs: `NSEBourseInput | RedisQueueInput | InlineTextInput`.
