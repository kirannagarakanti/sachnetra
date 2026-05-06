# /cleanup — Remove Dead Code and Fix Lint

Clean up SachNetra code without changing behaviour.

**Full template:** `ai_docs/dev_templates/cleanup.md`

---

## How to invoke

```
/cleanup           — run Biome lint + typecheck, fix all warnings
/cleanup [area]    — clean a specific file or folder

Examples:
  /cleanup
  /cleanup src/services/rss.ts
  /cleanup after task 015
```

---

## What gets cleaned

- Dead code (commented-out blocks, unused variables)
- Biome lint errors and warnings
- TypeScript strictness issues
- Unscoped CSS (missing [data-variant="india"])
- Hardcoded colours (should use --sn-* vars)

**Never changes behaviour — only readability and hygiene.**

See `ai_docs/dev_templates/cleanup.md` for full process.
