# /task — Generate a SachNetra Task File

Runs the Adapt Sprint Task Generator for one specific feature or fix.

**Full template:** `ai_docs/dev_templates/adapt_sprint_task.md`

---

## How to invoke

```
/task [task name or description]

Examples:
  /task V2-000 — V2 Bootstrap & Rules Update
  /task V2-001 — Railway Setup + Data Foundation
  /task V2-002 — Enrich Summary with Intelligence Signals

```

---

## What happens

1. Read all 4 files in `.agents/rules/`
2. Read `ai_docs/SACHNETRA_BUILD_GUIDE.md` for V2 context
3. Read the relevant prep docs and codebase files for this task
4. Run the rules check (Step 2.5 of adapt_sprint_task.md)
5. Study the codebase pattern
6. Generate a task file at `ai_docs/tasks/0[NNN]_[name].md`
7. Present the task summary for Lijo/James approval

**Say "proceed" only after the task file is reviewed and approved.**

---

See `ai_docs/dev_templates/adapt_sprint_task.md` for the full process.
