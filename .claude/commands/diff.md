# /diff — Summarise Changes from This Session

Generates a clean before/after summary of files changed during this coding session.

**Full template:** `ai_docs/dev_templates/diff.md`

---

## How to invoke

```
/diff              — summarise AI-touched files only
/diff all          — summarise all uncommitted git changes
/diff full         — same as above
```

---

## Output

- Session overview (files changed, lines added/removed)
- Per-file before/after diff with context
- Summary scaled to change size (1–4 sentences)
- SachNetra-specific flags: CACHE_VERSION bumps, allowlist changes, sacred file alerts

See `ai_docs/dev_templates/diff.md` for full format.
