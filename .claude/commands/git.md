# /git — Prepare and Make a Commit

Guides a correct, well-formatted commit for SachNetra.

**Full template:** `ai_docs/dev_templates/git_workflow_commit.md`

---

## How to invoke

```
/git               — run pre-commit checks and format commit message
/git [description] — draft commit message for this change
```

---

## Commit format

```
<type>: <short description> (Task [NNN])

feat | fix | refactor | style | config | docs | test | chore
```

**Pre-commit checks:**
- `npm run typecheck` — 0 errors
- `npm run lint` — clean
- No console.log, no commented-out code
- Sacred files untouched (full.ts, tech.ts, finance.ts)

See `ai_docs/dev_templates/git_workflow_commit.md` for full process.
