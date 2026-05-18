# /update-template — Sync a Stale Template or Rule

Use when a dev_template or `.agents/rules/*.md` file needs updating because the codebase
has drifted (e.g., CACHE_VERSION bumped, new sacred file added, new gotcha discovered
mid-task).

**Full template:** `ai_docs/dev_templates/update_template_workflow.md`

---

## How to invoke

```
/update-template [what changed]

Examples:
  /update-template CACHE_VERSION bumped from v8 to v9
  /update-template new sacred file added: scripts/seed-india-signals.mjs
  /update-template new gotcha — Railway crons must exit 0 even on FATAL
  /update-template V2-005 completed — remove from "not started" guard list
```

---

## What happens

1. Identify what's stale — which dev_template or `.agents/rules/*.md` file
2. Propose the specific edit with before/after text
3. Wait for Lijo approval before touching any file
4. Apply the change (only the specific change identified — no "while I'm here" extras)
5. Propagate to `.claude/commands/<x>.md` if the slash-command help text is affected
6. Commit with a focused message: `docs: update <file> — <reason>`

**Say "proceed" only after the proposed before/after is reviewed and approved.**

---

See `ai_docs/dev_templates/update_template_workflow.md` for the full process, the file-by-file
update triggers, and the propagation rules.
