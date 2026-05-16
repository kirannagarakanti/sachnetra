# Dev Templates — Mapping Reference

Slash commands in `.claude/commands/` are thin entry points. The *content* — the actual
instructions, gotchas, and patterns — lives here in `ai_docs/dev_templates/`.

**Source of truth: the dev_template.** The `.claude/commands/` file just points at it.
When you edit a template's behavior, edit the dev_template. Only edit the command file
to change the slash-command invocation help (examples, one-line summary).

---

## Mapping

| Slash command | Dev template                  | Purpose                                  |
|---------------|-------------------------------|------------------------------------------|
| `/bugfix`     | `bugfix.md`                   | Triage and fix a bug                     |
| `/cleanup`    | `cleanup.md`                  | Remove dead code, fix lint               |
| `/diagram`    | `generate_diagram.md`         | Generate an architecture diagram         |
| `/diff`       | `diff.md`                     | Summarize changes from this session      |
| `/git`        | `git_workflow_commit.md`      | Prepare and make a commit                |
| `/improve_ui` | `improve_ui.md`               | Polish the SachNetra UI                  |
| `/landing`    | `generate_landing_page.md`    | Build the SachNetra landing page         |
| `/pr`              | `pr_review.md`                | Prepare for PR review                    |
| `/task`            | `adapt_sprint_task.md`        | Generate a new task file (with manifest) |
| `/update-template` | `update_template_workflow.md` | Sync a stale template or rule when codebase drifts |

---

## Orphans (no slash command)

### `adapt_sprint_bootstrap.md` — RETIRED

One-shot bootstrap. Was run ONCE before Task 001 to seed `.agents/rules/` and CLAUDE.md.
Both exist. Do not run again unless rebuilding the workspace from a fresh clone.

*Status: historical reference only; no skill needed.*

---

## When you edit a template

1. Edit the file in `ai_docs/dev_templates/`
2. If your change affects the slash-command help text (invocation examples, one-liner),
   mirror it in `.claude/commands/<x>.md`. Otherwise leave the command file alone.
3. If you're changing a pattern that also lives in `.agents/rules/*.md`, follow
   `update_template_workflow.md` to propagate.
