# Magic Resolver — LLMQuant / quant-mind

File: `quantmind/magic.py`

---

## What It Does

`magic.py` lets you describe what you want in plain English and have it automatically resolved into the typed `(input_obj, cfg_obj)` pair that a flow function expects. Instead of:

```python
# Manual (requires knowing the schema)
inp = ArxivIdentifier(type="arxiv", id="2401.12345")
cfg = PaperFlowCfg(model="gpt-4o-mini", extract_methodology=True)
paper = await paper_flow(inp, cfg=cfg)
```

You can write:

```python
# Magic (describe in natural language)
inp, cfg = await resolve_magic_input(
    "Pull arXiv 2401.12345 about cross-sectional momentum; use gpt-4o-mini.",
    target_flow=paper_flow,
)
paper = await paper_flow(inp, cfg=cfg)
```

The resolver reads the flow function's type signatures, builds a JSON schema description of both types, sends it to a lightweight resolver agent, and gets back the correctly typed objects.

---

## The Key Types

### `ResolvedFlowConfig[InputT, CfgT]`

```python
class ResolvedFlowConfig(BaseModel, Generic[InputT, CfgT]):
    """Output schema returned by the resolver agent."""
    input_obj: InputT
    cfg_obj: CfgT
```

This is the output type of the resolver agent. By making it `Generic`, Pydantic can validate `input_obj` against the concrete `InputT` type (e.g., `PaperInput = Annotated[Union[ArxivIdentifier, HttpUrl, ...], Field(discriminator="type")]`) and `cfg_obj` against the concrete `CfgT` (e.g., `PaperFlowCfg`).

---

## `resolve_magic_input` (main entry point)

```python
async def resolve_magic_input(
    natural_language: str,
    *,
    target_flow: Callable[..., Awaitable[Any]],
    resolver_model: str = "gpt-4o-mini",
    resolver_instructions: str | None = None,
) -> tuple[Any, Any]:
```

### Step-by-step Execution

**Step 1: Introspect the flow signature**
```python
input_type, cfg_type = _introspect_flow_signature(target_flow)
```
Returns the `input` parameter annotation and the concrete `BaseFlowCfg` subclass from the `cfg` parameter.

**Step 2: Render JSON schemas into the prompt**
```python
template = resolver_instructions or _RESOLVER_INSTRUCTIONS
instructions = template.format(
    flow_name=target_flow.__name__,
    input_schema=_pydantic_schema_str(input_type),
    cfg_schema=_pydantic_schema_str(cfg_type),
)
```
The resolver agent's system prompt contains the JSON schema for both `PaperInput` (the discriminated union) and `PaperFlowCfg` (the configuration).

**Step 3: Run the resolver agent**
```python
resolver = Agent(
    name=f"magic_resolver_{target_flow.__name__}",
    instructions=instructions,
    model=resolver_model,
    output_type=ResolvedFlowConfig[input_type, cfg_type],
)
result = await Runner.run(resolver, natural_language)
out = result.final_output
return out.input_obj, out.cfg_obj
```

The resolver agent produces a `ResolvedFlowConfig[PaperInput, PaperFlowCfg]` object. Because `output_type` is set to a Pydantic model, the SDK enforces that the LLM output validates correctly.

---

## `_introspect_flow_signature`

```python
def _introspect_flow_signature(
    flow_fn: Callable[..., Any],
) -> tuple[Any, type[BaseFlowCfg]]:
```

Uses Python's `inspect.signature()` to read the function's parameter annotations at runtime.

```python
sig = inspect.signature(flow_fn)
if "input" not in sig.parameters:
    raise TypeError(f"Flow {flow_fn.__name__!r} must accept an `input` parameter")
if "cfg" not in sig.parameters:
    raise TypeError(f"Flow {flow_fn.__name__!r} must accept a `cfg` keyword parameter")

input_anno = sig.parameters["input"].annotation       # e.g. PaperInput alias
cfg_anno = sig.parameters["cfg"].annotation           # e.g. PaperFlowCfg | None
cfg_type = _strip_optional(cfg_anno)                  # → PaperFlowCfg (strips the | None)
```

**The convention enforced here**: Every flow that works with `magic.py` MUST have:
- A parameter named exactly `input`
- A keyword parameter named exactly `cfg`

If either is missing, `TypeError` is raised immediately. This is how the convention becomes a runtime contract.

---

## `_strip_optional`

```python
def _strip_optional(anno: Any) -> Any:
    """Peel T | None / Optional[T] to return the inner T."""
    origin = get_origin(anno)
    if origin in (Union, types.UnionType):
        non_none = [a for a in get_args(anno) if a is not type(None)]
        if len(non_none) == 1:
            return non_none[0]
    return anno
```

`cfg: PaperFlowCfg | None = None` has annotation `PaperFlowCfg | None`. The resolver needs the concrete `PaperFlowCfg` type, not the Optional wrapper. `_strip_optional` peels `| None` if there's exactly one non-None member. If the union has multiple non-None members (a genuine union, not just Optional), it returns the annotation unchanged.

---

## `_pydantic_schema_str`

```python
def _pydantic_schema_str(t: Any) -> str:
```

Renders a Pydantic type into a JSON schema string for injection into the resolver's system prompt. Handles four cases:

**Case 1: `Annotated[X, ...]` (discriminated union alias)**
```python
if hasattr(t, "__metadata__"):
    inner = get_args(t)[0]
    return _pydantic_schema_str(inner)
```
`PaperInput` is `Annotated[Union[ArxivIdentifier, HttpUrl, ...], Field(discriminator="type")]`. Strip the `Annotated` wrapper and recurse on the inner `Union`.

**Case 2: Plain `BaseModel` subclass**
```python
if isinstance(t, type) and hasattr(t, "model_json_schema"):
    try:
        return json.dumps(t.model_json_schema(), indent=2)
    except Exception:
        # Fallback for models with non-serialisable fields
        fields = {name: repr(field.annotation) for name, field in t.model_fields.items()}
        return json.dumps({"title": t.__name__, "fields": fields}, indent=2)
```
Pydantic's `model_json_schema()` generates full OpenAPI-compatible JSON Schema. The fallback handles `ModelSettings` from the agents SDK which contains callable fields that can't be JSON-serialised.

**Case 3: `Union[...]` / `T | U`**
```python
origin = get_origin(t)
if origin in (Union, types.UnionType):
    variants = get_args(t)
    schemas = [json.loads(_pydantic_schema_str(v)) for v in variants if hasattr(v, "model_json_schema")]
    return json.dumps({"oneOf": schemas}, indent=2)
```
For discriminated unions, each variant's schema is rendered separately and wrapped in `{"oneOf": [...]}`. The resolver sees all possible `input_obj` variants with their discriminator fields.

**Case 4: Fallback**
```python
return repr(t)
```
For anything unrecognised, `repr(t)` gives the resolver something — better than an empty string.

---

## The Resolver System Prompt

```
You are a configuration resolver for the QuantMind paper_flow flow.
Given a natural-language description of intent, produce a
ResolvedFlowConfig with two fields:

- input_obj — one variant of the input discriminated union.
- cfg_obj  — the flow configuration.

Rules:
- Set fields conservatively. Leave unspecified fields at their defaults
  rather than inventing values.
- The input_obj.type discriminator decides which variant you produce.
- Never invent file paths or URLs. If the description does not give a
  concrete identifier, prefer the RawText variant (when available)
  with the description's content.

Input schema:
{input_schema}    ← JSON schema of PaperInput (all 5 variants)

Cfg schema:
{cfg_schema}      ← JSON schema of PaperFlowCfg
```

**"Set fields conservatively"**: The resolver is instructed to leave fields at defaults unless explicitly mentioned. This prevents over-interpretation (e.g., "use gpt-4o-mini" → set `model="gpt-4o-mini"`, not also setting `max_turns=5` because the resolver guessed you want speed).

**"Never invent file paths or URLs"**: Guards against the resolver hallucinating an arXiv URL if the user says something ambiguous.

---

## `preview_resolve`

```python
async def preview_resolve(
    natural_language: str,
    *,
    target_flow: Callable[..., Awaitable[Any]],
    resolver_model: str = "gpt-4o-mini",
) -> tuple[Any, Any]:
    inp, cfg = await resolve_magic_input(
        natural_language,
        target_flow=target_flow,
        resolver_model=resolver_model,
    )
    print("input_obj:", inp.model_dump_json(indent=2))
    print("cfg_obj:", cfg.model_dump_json(indent=2))
    return inp, cfg
```

Debug helper — resolves and pretty-prints without running the actual flow. Useful in notebooks for verifying what the resolver produces before committing to a full `paper_flow` run.

---

## How It Works — End to End Example

**Input**:
```python
await resolve_magic_input(
    "Pull arXiv 2401.12345 about cross-sectional momentum; use gpt-4o-mini.",
    target_flow=paper_flow,
)
```

**What the resolver agent sees**:

System prompt includes the JSON schemas for all 5 `PaperInput` variants and all `PaperFlowCfg` fields.

User message: `"Pull arXiv 2401.12345 about cross-sectional momentum; use gpt-4o-mini."`

**What the resolver produces**:
```json
{
    "input_obj": {
        "type": "arxiv",
        "id": "2401.12345"
    },
    "cfg_obj": {
        "model": "gpt-4o-mini",
        "extract_methodology": true,
        "extract_limitations": true,
        "asset_class_hint": null,
        "max_turns": 10
    }
}
```

This validates to `ArxivIdentifier(type="arxiv", id="2401.12345")` and `PaperFlowCfg(model="gpt-4o-mini", ...)`.

---

## Why This Is Clever (And Why SachNetra Should NOT Use It)

### Why It's Clever

1. **Self-documenting**: The type annotations ARE the resolver's documentation. No separate prompt writing needed — the JSON schemas are generated automatically.
2. **Schema-validated output**: Because the resolver uses `output_type=ResolvedFlowConfig[...]`, the LLM cannot produce malformed configs. Pydantic validates the output immediately.
3. **Generic across flows**: The same `resolve_magic_input` works for any flow that follows the `(input, *, cfg)` convention. You don't write a separate resolver for `news_flow` vs `paper_flow`.

### Why SachNetra Should NOT Use It

SachNetra's production pipeline runs deterministic 10-minute crons. There is no interactive user session. The resolver is designed for:
- Notebook-based research workflows
- CLI tools where a human types a description
- Interactive query systems

None of these describe SachNetra's production context. The resolver also costs an additional LLM call (gpt-4o-mini) for every invocation — at $0.0003 per call × 144 cron cycles/day = $0.043/day just for config resolution. That's wasteful when the config is always the same.

**Verdict: Kill** for production. Potentially useful for Lijo's local research scripts, where running `resolve_magic_input("Process TATAMOTORS Q4FY26 earnings call transcript")` would save time vs constructing `EarningsInput(type="transcript", text=...)` manually.
