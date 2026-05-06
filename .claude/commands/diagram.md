# /diagram — Generate Architecture Diagram

Creates Mermaid diagrams for SachNetra system architecture, data flow, and component relationships.

**Full template:** `ai_docs/dev_templates/generate_diagram.md`

---

## How to invoke

```
/diagram           — generate full system overview
/diagram [subject] — diagram a specific flow or area

Examples:
  /diagram
  /diagram india variant wiring
  /diagram RSS feed to UI data flow
  /diagram V2 landing page routing
  /diagram share card pipeline
```

---

## Output format

Mermaid diagrams (renders in GitHub, Obsidian, mermaid.live).
Annotated with real file names from the codebase.

See `ai_docs/dev_templates/generate_diagram.md` for common diagram subjects.
