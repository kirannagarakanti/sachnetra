# LLM Wiki Schema

This document defines the rules and protocols for how LLM agents should interact with, maintain, and expand this personal knowledge base.

## 1. Directory Structure

All files managed by the LLM must exist within the `/wiki/` directory.

- `/wiki/concepts/`: Pure theory, abstract ideas, and mechanics.
- `/wiki/entities/`: People, companies, specific tools, and institutions.
- `/wiki/syntheses/`: Action plans, roadmaps, and synthesized strategies.
- `/wiki/mindsets/`: Personal behavioral patterns, psychology, and mental models.
- `/wiki/playbooks/`: Strict, actionable rules and checklists.
- `/wiki/index.md`: The master catalog.
- `/wiki/log.md`: The chronological ledger.

## 2. Ingestion Protocol

When instructed to ingest a raw source document, follow this algorithm:

1. **Read & Extract:** Read the source document. Extract the core concepts, entities, and action items.
2. **Create/Update Pages:** For each extracted item, create a new highly-structured markdown page or update an existing one.
3. **Link Nodes:** Ensure every new page contains links to relevant existing pages using Obsidian `[[Wiki Link]]` syntax.
4. **Update Catalog:** Add a one-line summary and link to the new page(s) in `/wiki/index.md`.
5. **Log Action:** Append an entry to `/wiki/log.md` detailing the ingestion (e.g., `## [YYYY-MM-DD] ingest | source_name`).

## 3. Formatting Standards (Karpathy Style)

All generated wiki pages must follow a dense, no-fluff markdown format.

### Required Template

```markdown
---
tags: [list, of, relevant, tags]
source: [[source_document_name]]
last_updated: YYYY-MM-DD
---
# [Title]
**TL;DR:** [A single, powerful sentence summarizing the entire page.]

## [Main Section 1]
- Use dense bullet points.
- Avoid conversational filler.
- Focus on the raw mechanics or action items.

## Linked Nodes
- [[Related Page 1]]
- [[Related Page 2]]
```

### Links

- **NEVER** use standard markdown links `[Text](file.md)` for internal linking.
- **ALWAYS** use Obsidian Wiki Links: `[[Page Name]]`. This ensures the Obsidian Graph View renders correctly.

## 4. Querying & Synthesis

When answering questions based on the wiki:
1. First read the `index.md` to identify relevant files.
2. Read the identified files.
3. Synthesize the answer.
4. If the answer forms a new insight, comparison, or playbook, create a new file in `/wiki/syntheses/` or `/wiki/playbooks/` and update the index and log.
