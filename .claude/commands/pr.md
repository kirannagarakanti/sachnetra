# /pr — Prepare for Pull Request Review

Self-review checklist and PR description generator before James reviews.

**Full template:** `ai_docs/dev_templates/pr_review.md`

---

## How to invoke

```
/pr                — run full self-review checklist + generate PR description
/pr [branch name]  — review specific branch
```

---

## Checklist covers

- TypeScript + Biome clean
- Sacred files untouched
- CSS scoped to [data-variant="india"]
- Allowlist updated in all 3 files (if RSS feeds changed)
- Commits follow format
- Task file completion log filled
- Screenshots attached (if UI changed)

See `ai_docs/dev_templates/pr_review.md` for full process.
