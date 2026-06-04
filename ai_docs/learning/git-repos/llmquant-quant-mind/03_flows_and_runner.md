# Flows and Runner — LLMQuant / quant-mind

Files covered: `quantmind/flows/paper.py`, `quantmind/flows/batch.py`, `quantmind/flows/_runner.py`

---

## Overview

The `flows/` layer is the **apex** of the dependency graph. It is the only layer that imports from `knowledge/`, `configs/`, and `preprocess/` simultaneously. Every flow function:
1. Takes a typed input (a discriminated union member)
2. Fetches and formats the raw content via `preprocess/`
3. Runs an OpenAI Agents SDK `Agent` with `output_type=<SomeKnowledgeSchema>`
4. Returns the structured Pydantic object

Currently, only `paper_flow` ships. `news_flow` and `earnings_flow` are planned (PR6+).

---

## `paper_flow` (`paper.py`)

### Signature

```python
async def paper_flow(
    input: PaperInput,
    *,
    cfg: PaperFlowCfg | None = None,
    extra_tools: list[Tool] | None = None,
    extra_instructions: str | None = None,
    output_type: type[P] | None = None,        # allows subclassing Paper
    memory: object | None = None,              # PR6 placeholder
    extra_run_hooks: list[RunHooks[Any]] | None = None,
    extra_input_guardrails: list[Any] | None = None,
    extra_output_guardrails: list[Any] | None = None,
) -> P | Paper:
```

### What It Does, Step by Step

**Step 1: Default cfg**
```python
cfg = cfg or PaperFlowCfg()
```
If no config is passed, uses default: `model="gpt-4o"`, `max_turns=10`, `extract_methodology=True`, `extract_limitations=True`.

**Step 2: Fetch + format**
```python
raw_md, source_meta = await _fetch_and_format(input)
```
Dispatches on the input variant (see below). Returns `(markdown_string, dict_of_metadata)`.

**Step 3: Build Agent**
```python
agent = Agent(
    name="paper_extractor",
    instructions=_compose_instructions(_DEFAULT_INSTRUCTIONS, extra_instructions, cfg),
    model=cfg.model,
    tools=list(extra_tools or []),
    output_type=out_type,                    # Paper (or subclass)
    input_guardrails=list(extra_input_guardrails or []),
    output_guardrails=list(extra_output_guardrails or []),
)
```
The agent's `output_type=Paper` forces the SDK to produce a structured JSON output that Pydantic validates into a `Paper` object.

**Step 4: Run with observability**
```python
return await run_with_observability(
    agent,
    _format_input(raw_md, source_meta),
    cfg=cfg,
    memory=memory,
    extra_run_hooks=list(extra_run_hooks or []),
)
```

### Fetch Dispatch (`_fetch_and_format`)

```python
async def _fetch_and_format(input: PaperInput) -> tuple[str, dict]:
    if isinstance(input, ArxivIdentifier):
        raw = await fetch_arxiv(input.id)
        md = await pdf_to_markdown(raw.bytes)
        return md, {"source": "arxiv", "arxiv_id": raw.arxiv_id, ...}

    if isinstance(input, HttpUrl):
        raw = await fetch_url(input.url)
        md = await _format_by_content_type(raw)     # routes by content-type header
        return md, {"source": "web", "url": input.url, ...}

    if isinstance(input, LocalFilePath):
        raw = await read_local_file(input.path)
        md = await _format_by_content_type(raw)
        return md, {"source": "local", "path": str(input.path), ...}

    if isinstance(input, RawText):
        return input.text, {"source": "inline"}

    if isinstance(input, DoiIdentifier):
        raise NotImplementedError("DOI → unpaywall OA PDF fallback pending")
```

`_format_by_content_type` routes by MIME type:
- `application/pdf` → `pdf_to_markdown()`
- `text/html` → `html_to_markdown()`
- `text/markdown` or `text/plain` → pass-through (decode UTF-8)
- anything else → `UnsupportedContentTypeError`

### The System Prompt Template

```python
_DEFAULT_INSTRUCTIONS = """\
You are extracting a research paper into a structured QuantMind Paper
TreeKnowledge object. Build the section tree top-down: every node has a
title and a short summary; leaf nodes additionally carry the section
markdown content. Cite supporting passages on each node.

Honour these flags from the run config:
- extract_methodology={extract_methodology}: when true, every methodology
  section becomes its own subtree with a per-step summary.
- extract_limitations={extract_limitations}: when true, surface
  limitations as a dedicated top-level child rather than inlining them.
- asset_class_hint={asset_class_hint!r}: when set, prefer this asset
  class for Paper.asset_classes if the paper does not state one explicitly.

Set as_of to the publication date when given; otherwise use today's date.
Set the source provenance ref using the metadata supplied in the prompt.
"""
```

**Note the `{extract_methodology}` substitution**: Config flags are injected into the prompt at runtime. This is one way to parameterise LLM behaviour through typed config objects instead of prompt engineering by hand.

### Prompt Assembly (`_format_input`)

```python
def _format_input(raw_md: str, source_meta: dict) -> str:
    lines = []
    for key, value in source_meta.items():
        if value is None:
            continue
        if isinstance(value, (list, tuple)):
            value = ", ".join(map(str, value))
        lines.append(f"{key}: {value}")
    header = "\n".join(lines)
    return f"--- Source metadata ---\n{header}\n\n--- Paper content ---\n{raw_md}"
```

The agent sees a two-part prompt: a metadata header (arxiv_id, title, authors) followed by the full paper text. Metadata in the header means the agent doesn't have to infer it from the text body.

---

## `batch_run` (`batch.py`)

### What It Does

Runs a flow function over many inputs with bounded concurrency. Returns a `BatchResult` that tracks successes, failures, duration, and (optionally) token/cost estimates.

### Signature

```python
async def batch_run(
    flow_fn: Callable[..., Awaitable[OutputT]],
    inputs: list[InputT],
    *,
    cfg: BaseFlowCfg | None = None,
    concurrency: int = 4,
    on_error: Literal["raise", "skip"] = "skip",
    on_progress: Callable[[int, int], None] | None = None,
    **flow_kwargs: Any,
) -> BatchResult[OutputT]:
```

### The `memory=` Prohibition

```python
if "memory" in flow_kwargs:
    raise ValueError(
        "batch_run does not support `memory=` in MVP. For "
        "memory-accumulating workflows write a serial loop instead: "
        "`for inp in inputs: await flow_fn(inp, cfg=cfg, memory=memory)`. "
        "See design doc §4.3.5."
    )
```

This is a deliberate architectural constraint. Memory-accumulating workflows (where each run builds on previous runs' state) must be written as serial `for` loops by the caller. `batch_run` is explicitly stateless. This prevents:
- Cross-run state contamination (run 3 seeing data from run 1)
- Race conditions in the memory object under concurrent access
- Unpredictable ordering-dependent results

### Concurrency Mechanism

```python
sem = asyncio.Semaphore(concurrency)

async def run_one(i: int, inp: InputT) -> None:
    async with sem:
        try:
            results[i] = await flow_fn(inp, cfg=cfg, **flow_kwargs)
        except Exception as exc:
            errors.append((i, exc))
            if on_error == "raise":
                raise
        finally:
            done_counter += 1
            if on_progress is not None:
                on_progress(done_counter, len(inputs))

await asyncio.gather(*(run_one(i, inp) for i, inp in enumerate(inputs)))
```

`asyncio.Semaphore(concurrency)` limits the number of concurrent `flow_fn` calls. `asyncio.gather(*)` starts all tasks at once; the semaphore acts as the throttle. This is idiomatic asyncio for bounded fan-out.

**`asyncio is single-threaded` comment**: The `done_counter` increment inside `finally` is safe without a lock because asyncio runs on a single thread — the increment + read + callback all happen between `await` points, never concurrently with another task.

### `BatchResult`

```python
@dataclass(slots=True)
class BatchResult(Generic[OutputT]):
    total: int
    success_count: int
    failure_count: int
    results: list[OutputT | None]       # parallel to inputs; None for failures
    errors: list[tuple[int, Exception]] # (input_index, exception) for failures
    duration_seconds: float
    tokens_total: dict[str, int] = field(default_factory=dict)
    cost_estimate_usd: float = 0.0

    @property
    def successes(self) -> list[tuple[int, OutputT]]:
        return [(i, r) for i, r in enumerate(self.results) if r is not None]

    @property
    def failures(self) -> list[tuple[int, Exception]]:
        return list(self.errors)
```

**Design notes**:
- `results` is parallel to `inputs` — `results[i]` is always the output for `inputs[i]`, or `None` if `inputs[i]` failed. This makes post-processing trivial: `zip(inputs, results)`.
- `errors` is sorted by input index.
- Uses `@dataclass(slots=True)` (not Pydantic) because `BatchResult` is internal plumbing — it never crosses an LLM boundary, so Pydantic's validation overhead is unnecessary.

### Error Modes

| `on_error` | Behaviour |
|---|---|
| `"skip"` (default) | Records every failure into `errors`; other inputs keep running; returns `BatchResult` normally |
| `"raise"` | Propagates the first exception; `asyncio.gather` cancels all sibling tasks |

---

## `_runner.py` — Observability Wrapper

### `run_with_observability`

```python
async def run_with_observability(
    agent: Agent[Any],
    input: str | list[Any],
    *,
    cfg: BaseFlowCfg,
    memory: object | None = None,
    extra_run_hooks: list[RunHooks[Any]],
) -> Any:
```

Every flow function calls this instead of calling `Runner.run()` directly. This centralises:
1. **`RunConfig` construction** (workflow name, tracing, sensitive data inclusion)
2. **Hooks composition** (merges multiple `RunHooks` into one)
3. **Trajectory archive stub** (no-op in PR5; PR6 wires this to write run records)

### `RunConfig` Construction

```python
workflow_name = cfg.workflow_name or f"quantmind.{agent.name}"
run_cfg = RunConfig(
    workflow_name=workflow_name,
    trace_metadata=cfg.trace_metadata,
    trace_include_sensitive_data=cfg.trace_include_sensitive_data,
    tracing_disabled=cfg.tracing_disabled,
)
```

All these values come from `BaseFlowCfg`. The user controls tracing by setting `cfg.tracing_disabled=True` or `cfg.trace_metadata={"env": "prod", "experiment": "exp12"}`.

### `_CompositeRunHooks` — Fan-out Pattern

The OpenAI Agents SDK accepts only **one** `RunHooks` instance per run. But callers may want to pass multiple hooks (e.g., a logging hook AND a metrics hook). `_CompositeRunHooks` solves this:

```python
class _CompositeRunHooks(RunHooks[Any]):
    def __init__(self, inner: list[RunHooks[Any]]) -> None:
        self._inner = list(inner)

    async def on_llm_start(self, *args, **kwargs) -> None:
        for h in self._inner:
            await h.on_llm_start(*args, **kwargs)

    async def on_llm_end(self, *args, **kwargs) -> None:
        for h in self._inner:
            await h.on_llm_end(*args, **kwargs)

    # ... on_agent_start, on_agent_end, on_handoff, on_tool_start, on_tool_end
```

**Exception semantics**: "Exceptions from earlier hooks short-circuit the rest by design — hooks are integral to the run, not best-effort." If your logging hook raises, the rest of the hooks don't run. This is a deliberate choice — if you want a resilient hook, catch exceptions internally in your hook.

### Trajectory Archive Stub

```python
def _archive_run_artifacts(cfg, memory, result) -> None:
    """No-op stub. PR6 writes a trajectory record under <memory_dir>/runs/.

    Kept as a real call site (rather than commented-out) so PR6 changes
    one function body, not the runner's public path.
    """
    del cfg, memory, result
    return None
```

This is a common "forward-compatible no-op" pattern. Instead of adding a new call site in PR6 (which risks merge conflicts), PR5 adds the no-op now and PR6 just replaces the function body.

---

## Hook Lifecycle (OpenAI Agents SDK)

The hooks interface has these events, in order for a typical run:

```
on_agent_start
  on_llm_start  → on_llm_end    (once per LLM turn)
  on_tool_start → on_tool_end   (zero or more times if agent uses tools)
  on_handoff                    (zero or more times if agent hands off)
on_agent_end
```

Custom hooks can be passed via `extra_run_hooks` to log timing, count tokens, write metrics to Prometheus, etc.

---

## Layer 2 Customisation Pattern

`paper_flow` supports three levels of customisation (design doc §9):

| Level | How | Use Case |
|---|---|---|
| Layer 1 | Pass a `PaperFlowCfg` | Change model, toggle methodology/limitations, set trace metadata |
| Layer 2 | Pass `extra_tools`, `extra_instructions`, `output_type` | Add domain tools (e.g. a search tool), append extra instructions, use a `Paper` subclass with custom fields |
| Layer 3 | Fork `paper.py` | Complete replacement — different agent architecture, different prompt strategy |

---

## SachNetra Notes

**What's portable**:
- The `batch_run` + `BatchResult` pattern maps directly to SachNetra's `Promise.allSettled()` + manual result aggregation in `_batch-sentiment.mjs`. The `BatchResult` data structure is cleaner — errors are indexed and sorted.
- The `_CompositeRunHooks` fan-out pattern maps to Node.js `EventEmitter` or a simple middleware chain array.

**What's NOT portable**:
- `paper_flow` itself. SachNetra doesn't process academic papers.
- `Agent(output_type=Paper)` — this is OpenAI Agents SDK-specific. SachNetra uses `openai.chat.completions` directly with JSON mode.
