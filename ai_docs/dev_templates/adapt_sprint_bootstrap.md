# Adapt Sprint Bootstrap

> **⚠️ [RETIRED — 2026-05-15]**
>
> This is a one-shot bootstrap script. It was run ONCE before Task 001 to seed
> `.agents/rules/` and CLAUDE.md. Both already exist. Do not run again unless
> rebuilding the workspace from a fresh clone of the repo.
>
> See `ai_docs/dev_templates/README.md` for the current dev_templates mapping.

*Run this ONCE before starting any build task.*
*Purpose: Configure your IDE with permanent SachNetra context.*

---

## When To Run This

Run this template exactly once — before Task 001.
Never run it again unless you delete `.agents/rules/` or clone the repo fresh.

---

## Step 1 — Read Everything

Read all of these files in full:

**Prep documents:**
```
ai_docs/prep/01_master_idea.md
ai_docs/prep/02_ui_design.md
ai_docs/prep/03_system_design.md
ai_docs/prep/04_data_sources.md
ai_docs/prep/05_ai_prompt_spec.md
ai_docs/prep/06_map_layers.md
ai_docs/prep/07_roadmap.md
```

**Codebase files:**
```
CLAUDE.md
src/config/variants/tech.ts
src/config/variants/full.ts
src/App.ts
src/config/feeds.ts
src/config/map-layer-definitions.ts
api/rss-proxy.js
api/groq-summarize.js
package.json
```

Do not skip any file. Understanding both the product decisions AND the codebase patterns is required before creating the rules.

---

## Step 2 — Create Workspace Rules

Create the folder `.agents/rules/` and write these 4 files:

---

### `.agents/rules/sachnetra-context.md`

Write a concise summary of:
- What SachNetra is (from 01_master_idea.md)
- Who it's for (from 01_master_idea.md)
- The technical approach — variant system (from 03_system_design.md)
- Which file controls the india variant
- Which existing file to model after

Keep it under 200 words. This file is read before every session.

---

### `.agents/rules/sachnetra-boundaries.md`

Write two clear sections:

**Section 1 — SACRED (cannot be changed by anyone):**
Files that can never be written to under any circumstances:
- `src/config/variants/full.ts`
- `src/config/variants/tech.ts`
- `src/config/variants/finance.ts`

Mark this section clearly. The task generator will never propose changes to this.

**Section 2 — READ for reference, never write:**
Files that are valuable to study but must not be modified:
- Existing panel TypeScript files not named in the current task
- `server/gateway.ts`
- `scripts/ais-relay.cjs` (except adding to allowlist)
- Any existing `.proto` files

**Section 3 — V1 scope boundary:**
Features that must never be built in V1 (from 03_system_design.md V1 Scope Boundary section).

Note at the bottom: Rules in Section 2 and 3 can be updated with James's permission if the codebase reality differs. Section 1 is permanent.

---

### `.agents/rules/sachnetra-patterns.md`

Write the coding patterns to always follow:
- Which file to model for variant config (tech.ts)
- Which file to reference for content inspiration (full.ts)
- FeedConfig interface location
- CSS variable naming convention (--sn-*)
- Verification commands to run after every change
- The one-task-at-a-time rule

---

### `.agents/rules/india-variant.md`

Write the specific technical constants for the india variant:
- Brand colors (from 02_ui_design.md)
- Map default center and zoom (from 06_map_layers.md)
- AI output format — two-summary JSON (from 05_ai_prompt_spec.md)
- Redis cache version (v4)
- Hostname detection pattern
- Kashmir boundary note — must use Datameet GeoJSON, not OpenFreeMap default

---

## Step 3 — Update CLAUDE.md

Append the SachNetra section from `ai_docs/prep/03_system_design.md`
(the section titled "CLAUDE.md Update") to the end of the existing `CLAUDE.md`.
Do not replace or delete any existing content.

---

## Step 4 — Show What You Created

Present a summary:
```
Created .agents/rules/ with 4 files:
  sachnetra-context.md     — [one line describing what's in it]
  sachnetra-boundaries.md  — [one line describing what's in it]
  sachnetra-patterns.md    — [one line describing what's in it]
  india-variant.md         — [one line describing what's in it]

Updated CLAUDE.md — appended SachNetra section

Ready for Task 001.
```

Wait for architect/James confirmation before any coding begins.
