# Task DOC-001 — LLM Wiki Implementation
*SachNetra Adapt Sprint*

**Depends on**: None
**Estimated time**: 2 Hours
**Prep doc**: ai_docs/conversation.md
**V1 or V2**: V2 (Documentation Infrastructure)

---

## Context — Current State

The AI documentation directory (`ai_docs/`) currently holds standard markdown files and prep templates. A massive 20,000+ line conversation log (`conversation.md`) was added containing deep insights into Quant Finance, SachNetra's future roadmap (Sentiment Layer), and personal development strategies (Passive Learning, 3-Bucket SIP Strategy). This knowledge is currently trapped in a single, un-navigable flat file.

## What This Task Does

- Scaffolds the `/wiki/` directory structure (`/concepts`, `/entities`, `/syntheses`, `/mindsets`, `/playbooks`).
- Creates `llm_wiki_architecture.md` as the foundational idea file.
- Creates `WIKI_SCHEMA.md` to establish rules for future ingestion and formatting.
- Systematically reads `conversation.md` in chunks and extracts all knowledge into inter-linked, Karpathy-style markdown files.
- Generates `index.md` (the catalog) and `log.md` (the chronological ledger).

---

## Success Criteria

This task is complete when ALL of the following are true:

- [ ] `llm_wiki_architecture.md` and `WIKI_SCHEMA.md` are created.
- [ ] Directory structure (`/wiki/concepts/`, `/wiki/entities/`, etc.) is scaffolded.
- [ ] At least 10 highly-structured markdown files are generated from `conversation.md`.
- [ ] Files contain YAML frontmatter (`tags`, `source`, `last_updated`).
- [ ] Files are interconnected using Obsidian `[[Wiki Links]]`.
- [ ] `wiki/index.md` contains a structured list of all generated pages.
- [ ] `wiki/log.md` has an initial ingest entry.

---

## Second-Order Impact

- Affected consumers: None (Documentation only).
- Performance: None.
- Variant bleed risk: None.
- New env vars needed: None.

---

## Files To Open Before Starting

```
ai_docs/conversation.md — The raw source of truth to ingest.
```

---

## Pattern To Follow

All generated wiki pages must follow the "Karpathy-Style" dense markdown format with YAML frontmatter:

```markdown
---
tags: [concept, finance]
source: [[conversation.md]]
last_updated: 2026-05-05
---
# Page Title
**TL;DR:** One sentence summary.

## Core Concept
- Dense bullet points.
- No fluff.

## Linked Nodes
- [[other_concept]]
```

---

## Implementation

### Phase 1: Architecture & Schema
**Goal**: Establish the system foundation.

- [ ] **Step 1.1** — Create the core idea file.
  - File: `ai_docs/llm_wiki_architecture.md`
  - What to do: Document the 3-layer architecture (Raw, Wiki, Schema) and the operations (Ingest, Query, Lint).
- [ ] **Step 1.2** — Create the system prompt schema.
  - File: `ai_docs/wiki/WIKI_SCHEMA.md`
  - What to do: Define the exact ingestion rules, Obsidian formatting standards, and frontmatter requirements.

### Phase 2: Ingestion & Generation
**Goal**: Extract knowledge from the conversation log.

- [ ] **Step 2.1** — Generate Theory Concepts.
  - File: `ai_docs/wiki/concepts/...`
  - What to do: Create files for `compounding.md`, `interest_rates.md`, `inflation.md`, `bonds_and_yields.md`, `quant_finance.md`.
- [ ] **Step 2.2** — Generate Entities.
  - File: `ai_docs/wiki/entities/...`
  - What to do: Create files for `world_quant.md`, `reserve_bank_of_india.md`, `isro.md`.
- [ ] **Step 2.3** — Generate Syntheses & Roadmaps.
  - File: `ai_docs/wiki/syntheses/...`
  - What to do: Create `sachnetra_quant_pivot.md`.
- [ ] **Step 2.4** — Generate Mindsets & Playbooks.
  - File: `ai_docs/wiki/mindsets/background_brain.md` and `ai_docs/wiki/playbooks/personal_investing.md`.
  - What to do: Document the passive learning strategy and the 3-bucket SIP plan.

### Phase 3: Bookkeeping
**Goal**: Wire the wiki together.

- [ ] **Step 3.1** — Generate Master Index.
  - File: `ai_docs/wiki/index.md`
  - What to do: Create a catalog linking to all generated files with 1-line summaries.
- [ ] **Step 3.2** — Create Initial Log Entry.
  - File: `ai_docs/wiki/log.md`
  - What to do: Append `## [2026-05-05] ingest | conversation.md`.

---

## Before / After

**Before** (`ai_docs/conversation.md`):
A single 20,000+ line flat file containing a mix of finance theory, personal advice, and SachNetra roadmaps.

**After**:
A structured `wiki/` directory with ~15 cleanly formatted, Obsidian-ready markdown files that are easily searchable and interlinked.

---

## Error Scenarios

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Broken Obsidian graph | Using standard markdown `[link](url)` instead of `[[link]]` | Ensure all internal links use `[[Wiki Link]]` syntax |
| Dataview plugin not working | Malformed YAML frontmatter | Check spacing and formatting in `---` blocks |

---

## Completion Log

- [x] Phase 1 complete — 2026-05-05T14:37
- [x] Phase 2 complete — 2026-05-05
- [x] Phase 3 complete — 2026-05-05
- [x] Success Criteria: all checked — 2026-05-05
- [x] **TASK DOC-001 COMPLETE** ✅
