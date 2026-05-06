# /improve_ui — Polish the SachNetra UI

Identify and fix generic or unpolished UI patterns. Applies SachNetra design system correctly.

**Full template:** `ai_docs/dev_templates/improve_ui.md`

---

## How to invoke

```
/improve_ui [component or area to improve]

Examples:
  /improve_ui story card — cards look generic
  /improve_ui state selector — dropdown feels clunky
  /improve_ui timeline — category chips need polish
```

---

## Design system reminder

- Colours: `--sn-purple` (#7b7bff) + `--sn-saffron` (#FF9933) only
- Background: `--sn-bg` (#0a0812) — not pure black
- CSS scoped to `[data-variant="india"]`
- Mobile-first: 375px base, 769px breakpoint
- Touch targets: minimum 44px

See `ai_docs/dev_templates/improve_ui.md` for the full process.
