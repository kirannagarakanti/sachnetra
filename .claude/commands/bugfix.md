# /bugfix — Triage and Fix a Bug

Structured bug investigation for the SachNetra codebase.

**Full template:** `ai_docs/dev_templates/bugfix.md`

---

## How to invoke

```
/bugfix [description of the problem]

Examples:
  /bugfix state filter showing Delhi stories in Maharashtra feed
  /bugfix share card not generating on iOS Safari
  /bugfix groq-summarize returning 429 rate limit
```

---

## What happens

1. Identify the error (message, when it happens, where)
2. Quick assessment (RSS issue / variant wiring / cache / type error / complex)
3. Fast path for simple fixes
4. Deep investigation for complex issues
5. Present solution options with trade-offs
6. Implement after approval

See `ai_docs/dev_templates/bugfix.md` for the full process.
