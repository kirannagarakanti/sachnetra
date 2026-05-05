# LLM Wiki Architecture

A pattern for building personal knowledge bases using LLMs.

This is an idea file outlining the high-level architecture of an LLM-maintained personal knowledge base.

## The Core Idea

Instead of retrieving from raw documents at query time (like standard RAG), the LLM **incrementally builds and maintains a persistent wiki** — a structured, interlinked collection of markdown files that sits between you and the raw sources. When you add a new source, the LLM reads it, extracts the key information, and integrates it into the existing wiki. The wiki keeps getting richer with every source you add and every question you ask.

The LLM does all the grunt work (summarizing, cross-referencing, filing, bookkeeping), while you handle sourcing, exploration, and asking questions. Obsidian acts as the IDE, the LLM as the programmer, and the wiki as the codebase.

## Architecture

There are three distinct layers:

1.  **Raw Sources** (`/raw/`): Your curated collection of source documents (articles, papers, logs). These are immutable. The LLM reads them but never modifies them.
2.  **The Wiki** (`/wiki/`): A directory of LLM-generated markdown files (summaries, entities, concepts). The LLM owns this layer entirely. It creates pages, maintains cross-references, and keeps everything consistent.
3.  **The Schema** (`WIKI_SCHEMA.md`): The system prompt that tells the LLM how the wiki is structured, what the conventions are, and what workflows to follow when ingesting sources.

## Operations

*   **Ingest:** You drop a new source into the raw collection and tell the LLM to process it. The LLM reads the source, updates relevant entity and concept pages, creates new ones if necessary, and updates the index and log.
*   **Query:** You ask questions against the wiki. The LLM synthesizes an answer with citations. Good answers can be filed back into the wiki as new pages.
*   **Lint:** Periodically health-check the wiki. Look for contradictions, stale claims, orphan pages, or missing cross-references.

## Indexing and Logging

*   **index.md:** A content-oriented catalog of everything in the wiki, updated on every ingest.
*   **log.md:** A chronological append-only record of what happened and when (e.g., `## [2026-05-05] ingest | conversation.md`).

## Best Practices (Karpathy Style)

The generated files should be dense, highly structured, and utilize strict markdown with minimal fluff. They must use Obsidian's `[[Wiki Links]]` to create a deeply interconnected knowledge graph, and utilize YAML frontmatter for metadata tracking.
