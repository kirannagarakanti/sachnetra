# Knowledge Schemas — LLMQuant / quant-mind

All schema files live in `quantmind/knowledge/`. Every class is **frozen Pydantic v2** with `extra="forbid"`. "Frozen" means once created, the object cannot be mutated — you get a `ValidationError` if you try to set a field. This makes schemas safe to pass between threads, cache in dicts, and use as `output_type=` in an OpenAI Agents SDK `Agent`.

---

## Layer 0: Support Types (`_base.py`)

Three small models that every schema depends on.

### `SourceRef`

```python
class SourceRef(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    kind: Literal["arxiv", "http", "doi", "local", "rss", "transcript", "manual"]
    uri: str | None = None
    fetched_at: datetime | None = None
    content_hash: str | None = None  # sha256 of fetched bytes; dedup key
```

**Purpose**: Typed provenance. Instead of `source: str = "https://..."`, every knowledge item stores a structured `SourceRef` that carries:
- What kind of source it is (arxiv, http, rss, etc.)
- Where it came from (uri)
- When it was fetched (fetched_at)
- A SHA-256 hash of the raw bytes for deduplication (content_hash)

**Why this matters for SachNetra**: Currently news items in SachNetra store `source: string` (the feed URL). If the same story appears in two different RSS feeds, there's no dedup key. `content_hash` solves this exactly.

---

### `Citation`

```python
class Citation(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    source_id: str
    page: int | None = None
    char_offset: int | None = None
    quote: str | None = Field(default=None, max_length=500)
    # When the citation points into a TreeKnowledge, anchor to a specific node.
    tree_id: UUID | None = None
    node_id: UUID | None = None
```

**Purpose**: Traceability. Every extracted fact carries a list of `Citation` objects pointing back to the exact passage that supported the extraction. For a `Paper` tree, `tree_id + node_id` anchors the citation to a specific section node.

**Why the 500-char limit on `quote`**: Prevents agents from dumping entire paragraphs as "citations." Forces them to identify the minimal supporting passage.

---

### `ExtractionRef`

```python
class ExtractionRef(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    flow: str           # e.g. "paper_flow"
    model: str          # e.g. "gpt-4o"
    run_id: UUID | None = None
    extracted_at: datetime
```

**Purpose**: Audit trail. If an extraction is wrong, you can trace exactly which flow, which model version, and which run produced it. This is the difference between "the AI said so" and "gpt-4o run 9f3a at 2026-05-08T14:22Z via paper_flow produced this."

---

## Layer 1: `BaseKnowledge` (`_base.py`)

```python
class BaseKnowledge(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    # Identity
    id: UUID = Field(default_factory=uuid4)
    item_type: str                    # overridden as Literal in every subclass
    schema_version: str = "1.0"

    # Time (financial mandate — no knowledge is valid without a timestamp)
    as_of: datetime = Field(..., description="Information cutoff time.")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Provenance (no bare strings anywhere)
    source: SourceRef
    extraction: ExtractionRef | None = None   # None if hand-curated

    # Trust
    confidence: Literal["low", "medium", "high"] = "medium"

    # Annotations
    citations: list[Citation] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    disclaimers: list[str] = Field(default_factory=list)
```

### Key Design Decisions

**`as_of` is required (`...` = no default)**  
Financial facts without timestamps are dangerous. Revenue for `FY2020` and `FY2026` are completely different numbers. `as_of` is the "information cutoff" — the date the fact was valid, not the date it was extracted. `created_at` is the extraction timestamp.

**`item_type: str` (overridden as `Literal`)**  
Base has `item_type: str`. Every subclass narrows it: `item_type: Literal["paper"] = "paper"`. This is the Pydantic v2 discriminator pattern. When you deserialise a list of mixed knowledge items from JSON, Pydantic uses `item_type` to instantiate the correct class.

**`extra="forbid"` on every model**  
If an LLM produces a field that doesn't exist in the schema (a hallucinated field like `"confidence_score"` instead of `"confidence"`), Pydantic raises a `ValidationError` immediately. This is the guard against silent schema drift.

### Utility Methods

```python
def is_extracted(self) -> bool:
    """True iff the item came from an LLM flow (vs hand-curated)."""
    return self.extraction is not None

def freshness(self, now: datetime | None = None) -> timedelta:
    """Time elapsed since as_of. Used for staleness checks."""
    reference = now if now is not None else datetime.now(timezone.utc)
    return reference - self.as_of

def with_tags(self, *new_tags: str) -> Self:
    """Return a copy with extra tags appended (frozen-friendly, idempotent)."""
    merged = list(self.tags)
    for t in new_tags:
        if t not in merged:
            merged.append(t)
    return self.model_copy(update={"tags": merged})
```

`with_tags()` demonstrates the frozen-model copy pattern: instead of `item.tags.append("nifty50")` (would fail — frozen), you do `item = item.with_tags("nifty50")` which creates a new object.

---

## Layer 2: The Three Shapes

### Shape A: `FlattenKnowledge` (`_flatten.py`)

```python
class FlattenKnowledge(BaseKnowledge):
    """Marker base for flat domain cards.

    Subclasses add a typed payload (e.g. summary, methodology, revenue).
    They MUST override embedding_text() to produce a stable string
    suitable for the store's vector index.
    """
```

No extra fields. It is purely a **marker class** — its purpose is to group atomic, indivisible knowledge items. A `News` item is semantically complete on its own: one source event → one card. You don't need to navigate "into" a flat card.

All of: `News`, `Earnings`, `PaperKnowledgeCard`, `Thesis`, `Factor` extend `FlattenKnowledge`.

---

### Shape B: `TreeKnowledge` (`_tree.py`)

This is the most sophisticated shape. See [02_tree_deep_dive](#tree-knowledge-deep-dive) below.

---

### Shape C: `GraphKnowledge` (`_graph.py`)

```python
class GraphKnowledge(BaseKnowledge):
    """Reserved for cross-item edges. NOT IMPLEMENTED.

    Future shape (sketched, subject to change):
    - nodes: dict[UUID, NodeRef] where NodeRef = (knowledge_id, knowledge_type)
    - edges: list[Edge] where Edge = (from, to, kind, weight, evidence)

    Use cases under consideration: paper citation graph, factor lineage,
    news–entity co-occurrence.
    """

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        raise NotImplementedError(
            "GraphKnowledge is a design-intent placeholder; subclassing is "
            "blocked until the shape is finalised. Open a tracking issue "
            "before lifting this guard."
        )
```

**Key feature**: `__init_subclass__` is overridden to **block all subclassing at class-creation time**. If anyone tries to `class MyCitation(GraphKnowledge): ...`, Python raises `NotImplementedError` before the class even finishes being created. This is a design firewall — the interface exists in the union type `Knowledge = FlattenKnowledge | TreeKnowledge | GraphKnowledge` today, but no implementation can sneak in until the shape is finalised.

---

## TreeKnowledge Deep Dive

### `TreeNode`

```python
class TreeNode(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    node_id: UUID = Field(default_factory=uuid4)
    parent_id: UUID | None = None          # None only for the root
    position: int = 0                      # ordinal among siblings
    title: str                             # "Revenue", "Methodology", "Q&A"
    summary: str                           # MANDATORY: 2-3 sentence description
    content: str | None = None             # FULL TEXT: only on leaf nodes
    citations: list[Citation] = Field(default_factory=list)
    children_ids: list[UUID] = Field(default_factory=list)

    def embedding_text(self) -> str:
        return f"{self.title}\n{self.summary}"
```

**Why `summary` is mandatory but `content` is optional**:  
Interior nodes (sections, chapters) carry only a `summary`. Leaf nodes carry both `summary` and `content`. An agent navigating the tree reads summaries to decide which branch to enter. It only loads `content` when it reaches the leaf it needs. This means reading a 40-page document costs only the summaries of ~10 interior nodes + 1 leaf, not the full 40 pages.

**Why `position: int`**:  
A `dict[UUID, TreeNode]` has no inherent ordering. `position` gives siblings their document-order rank so a renderer can display sections in the correct sequence.

---

### `TreeKnowledge` (the container)

```python
class TreeKnowledge(BaseKnowledge):
    root_node_id: UUID
    nodes: dict[UUID, TreeNode]     # flat adjacency list, O(1) lookup

    def root(self) -> TreeNode:
        return self.nodes[self.root_node_id]

    def children_of(self, node_id: UUID) -> list[TreeNode]:
        node = self.nodes[node_id]
        return [self.nodes[c] for c in node.children_ids]

    def walk_dfs(self) -> Iterator[TreeNode]:
        """Depth-first traversal in declared (document) order."""
        stack: list[UUID] = [self.root_node_id]
        while stack:
            node_id = stack.pop()
            node = self.nodes[node_id]
            yield node
            stack.extend(reversed(node.children_ids))  # reverse = document order

    def find_path(self, node_id: UUID) -> list[TreeNode]:
        """Root-to-node path for breadcrumb context. [] if not found."""
        if node_id not in self.nodes:
            return []
        path: list[TreeNode] = []
        cursor: UUID | None = node_id
        while cursor is not None:
            node = self.nodes[cursor]
            path.append(node)
            cursor = node.parent_id
        path.reverse()
        return path

    def embedding_text(self) -> str:
        """Default: root node's embedding text."""
        return self.root().embedding_text()
```

**`nodes: dict[UUID, TreeNode]`** — This is an **adjacency list** encoded as a flat dictionary. Tree structure is encoded through `parent_id` and `children_ids` pointers. This means:
- Any node lookup is O(1)
- The entire tree serialises to / from JSON trivially
- Lazy loading is easy: a store layer can load only the root + requested nodes by UUID

**`walk_dfs()` — the `reversed()` trick**: The stack (LIFO) pops from the right. If we `stack.extend(children_ids)` directly, the last child gets popped first (reversed document order). `reversed(node.children_ids)` before extending fixes this so the first child is popped first — giving true document-order DFS.

---

## Layer 3: Concrete Domain Schemas

### `Paper` (Tree)

```python
class Paper(TreeKnowledge):
    item_type: Literal["paper"] = "paper"
    arxiv_id: str | None = None
    authors: list[str] = Field(default_factory=list)
    asset_classes: list[str] = Field(default_factory=list)
```

`Paper` adds arXiv-specific metadata on top of the tree. The tree itself holds the section structure. Typical tree for an arXiv paper:

```
root: Abstract + overview
├── Introduction
├── Related Work
├── Methodology
│   ├── Data Collection
│   ├── Feature Construction
│   └── Backtesting Framework
├── Results
│   ├── In-Sample
│   └── Out-of-Sample
├── Limitations
└── Conclusion
```

---

### `PaperKnowledgeCard` (Flatten)

```python
class PaperKnowledgeCard(FlattenKnowledge):
    item_type: Literal["paper_card"] = "paper_card"

    paper_id: UUID                                # links back to Paper tree
    summary: str                                  # distilled in one paragraph
    methodology: str | None = None
    key_findings: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    asset_classes: list[str] = Field(default_factory=list)

    def embedding_text(self) -> str:
        return f"{self.summary}\n{' '.join(self.key_findings)}"
```

**Two-item pattern**: `paper_flow` produces BOTH a `Paper` (the full tree) AND a `PaperKnowledgeCard` (the flat summary card). The card is linked to the tree by `paper_id`. The store can:
- Use the card for tagging, filtering, and dashboard surfaces (cheap)
- Use the tree for deep question answering (expensive, on demand)

---

### `News` (Flatten)

```python
class News(FlattenKnowledge):
    item_type: Literal["news"] = "news"

    headline: str
    event_type: str
    timestamp: datetime
    entities: list[str] = Field(default_factory=list)
    sentiment: Literal["positive", "neutral", "negative"] = "neutral"
    materiality: Literal["low", "medium", "high"] = "medium"

    def embedding_text(self) -> str:
        entities = ", ".join(self.entities)
        return f"{self.headline}\n{self.event_type}\n{entities}".strip()
```

**Comparison to SachNetra's news records**: SachNetra stores `headline + body + sentiment_score (float) + tickers[]`. `News` stores `headline + event_type + entities + sentiment (Literal) + materiality`. Key differences:
- `event_type` is a string label ("earnings_miss", "regulatory_action", "merger_announcement") — more queryable than free text
- `materiality` is a rating of how market-significant the event is
- `sentiment` is a 3-way Literal, not a float — makes schema validation strict

---

### `Earnings` (Flatten)

```python
class Earnings(FlattenKnowledge):
    item_type: Literal["earnings"] = "earnings"

    ticker: str
    period: str                             # "2026Q1", "FY2025"
    revenue: float | None = None
    eps: float | None = None
    guidance: str | None = None
    surprise_flags: list[str] = Field(default_factory=list)
    transcript_quote: str | None = None

    def embedding_text(self) -> str:
        guidance = self.guidance or ""
        return f"{self.ticker} {self.period} earnings\n{guidance}".strip()
```

`surprise_flags` is a list like `["eps_beat", "revenue_miss", "guidance_raised"]`. Structured, queryable, not free text.

---

### `Thesis` (Flatten, stub)

```python
class Thesis(FlattenKnowledge):
    item_type: Literal["thesis"] = "thesis"
    claim: str

    def embedding_text(self) -> str:
        return self.claim
```

Stub — `thesis_flow` hasn't shipped yet. The class exists so `from quantmind.knowledge import Thesis` is a stable import across PRs. Concrete fields (`assumptions`, `evidence_refs`, `time_horizon`) arrive with `thesis_flow`.

---

### `Factor` (Flatten, stub)

```python
class Factor(FlattenKnowledge):
    item_type: Literal["factor"] = "factor"
    factor_name: str
    universe: str | None = None

    def embedding_text(self) -> str:
        scope = self.universe or "unspecified"
        return f"factor {self.factor_name} on {scope}"
```

Stub — `factor_flow` hasn't shipped. Concrete fields (`pnl`, `ic`, `turnover`, `period`) arrive later.

---

## Public API (`__init__.py`)

```python
from quantmind.knowledge import (
    # Base
    BaseKnowledge, Citation, ExtractionRef, SourceRef,
    # Shapes
    FlattenKnowledge, GraphKnowledge, TreeKnowledge, TreeNode,
    # Concrete
    Earnings, Factor, News, Paper, PaperKnowledgeCard, Thesis,
)
```

All 12 names are in `__all__`. Everything else (`_base`, `_flatten`, `_tree`, `_graph`) is private.

---

## Constraints Summary

| Rule | Enforcement |
|---|---|
| All models are `frozen=True` | `model_config = ConfigDict(frozen=True)` |
| No extra fields allowed | `model_config = ConfigDict(extra="forbid")` |
| `as_of` is always required | `Field(...)` — no default |
| `source` must be a typed `SourceRef` | Not `str` |
| Subclasses must implement `embedding_text()` | Runtime `NotImplementedError` |
| `GraphKnowledge` cannot be subclassed yet | `__init_subclass__` guard |
| `quote` in `Citation` is capped at 500 chars | `Field(max_length=500)` |
