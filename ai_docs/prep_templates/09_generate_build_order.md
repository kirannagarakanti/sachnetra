# Prep Template 09 — Generate Build Order (Adapt Sprint)

> Use this to generate the task list and build order for a new project.
> Run after all other prep docs are finalised. This is the last prep step before coding begins.

---

## Instructions for Claude

**PROMPT:**

I'm ready to plan the build order for my app. I'll use the Adapt Sprint methodology — one focused task at a time, each verified before the next starts.

Here are all my prep documents:
- Master idea: [PASTE 01_master_idea.md]
- System architecture: [PASTE system_architecture.md]
- App pages: [PASTE app_pages_and_functionality.md]
- Data models: [PASTE initial_data_schema.md]
- UI theme: [PASTE ui_theme.md]

Generate a numbered task list following these rules:

### Task ordering rules:
1. Infrastructure before features (auth, database, deployment setup first)
2. Core data model before UI that displays it
3. Mobile layout before desktop polish
4. Each task is 1–8 hours of work maximum
5. Tasks that depend on each other are explicitly ordered
6. No task combines UI + backend + database in one step

### For each task, specify:
```
Task [NNN] — [Task Name]

Goal: [One sentence — what does this task achieve?]
Depends on: Task [N-1] or "none"
Estimated time: [X–Y hours]

Files to touch:
  [file/path.ts] — [what changes]
  [file/path.js] — [what changes]

Prep docs relevant:
  [which prep doc has the decisions for this task]

V1 or V2: [which version]
```

### Task categories to include (in order):
1. Bootstrap (rules setup, CLAUDE.md update)
2. Foundation (core data models, database schema, auth)
3. Core feature 1 (the primary user value)
4. Core feature 2
5. UI polish (mobile CSS, animations, states)
6. AI / intelligence layer (if applicable)
7. Deployment (Vercel config, env vars, domain)
8. Testing & hardening
9. V2 backlog items

### Output format:
Save to `ai_docs/prep/roadmap.md` (or `12_v2_roadmap.md` for V2 planning)

Include:
- Full numbered task list
- Dependency map
- Time estimates per task and total
- V1 scope (tasks 000–NNN)
- V2 backlog (listed but not tasked yet)

---

## Adapt Sprint Methodology

The Adapt Sprint has 3 phases:

**Phase 1: UNDERSTAND** (using prep docs 01–08)
Read everything. Make all decisions. Write everything down.
Do NOT code during this phase.

**Phase 2: BOOTSTRAP** (Task 000)
AI reads all prep docs + codebase.
AI generates workspace rules (`.agents/rules/`) and updates CLAUDE.md.
Architect reviews and approves before any code runs.

**Phase 3: EXECUTE** (Tasks 001–NNN)
One task at a time. Each task has a file, phases, before/after, verify.
Never combine tasks. Never skip verification.
James reviews the task file before "proceed" is said.

---

## SachNetra Reference

SachNetra V1 had 28 tasks (000–018.5).
Total estimated: 67–89 hours.
Actual (with debugging): ~6 weeks part-time.

The full task list is in `ai_docs/prep/07_roadmap.md`.
Use it as a model for the depth and format of task definitions.

V2 planned tasks are in `ai_docs/SACHNETRA_BUILD_GUIDE.md` (V2-001 through V2-010).
