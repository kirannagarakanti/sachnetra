# /landing — Build the SachNetra Landing Page

Guides the V2-001 task: public marketing page at sachnetra.com/

**Full template:** `ai_docs/dev_templates/generate_landing_page.md`

---

## How to invoke

```
/landing           — start the full landing page generation process
/landing [section] — work on a specific section

Examples:
  /landing
  /landing hero section only
  /landing write the copy for features section
```

---

## Key decisions needed first

1. Target user (Hyderabad professional? All India?)
2. One-sentence pitch for the hero
3. 3 core benefits for features section
4. CTA action (open app / waitlist / download)

**V2-001 task:** App moves to sachnetra.com/app, landing page at root.
No Vite bundle on landing page — standalone HTML for performance.

See `ai_docs/dev_templates/generate_landing_page.md` for full process.
