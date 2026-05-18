# Adapt Sprint Task Generator
*Use this to generate a task file for ONE specific roadmap phase.*

---

## How To Use This

Lijo tells the agent which task he wants:

```
"Generate the task file for Task V2-002 — GoOut Hyderabad Panel"
```

The agent runs Steps 0–4 to analyse, check, and generate the task file.
Lijo reviews and approves it (Step 5).
Then Lijo says "proceed" and the agent executes (Steps 6–7).

---

## Step 0 — Strategic Analysis Gate

Before reading any files, answer this first:

> **Does this task have more than one viable implementation approach?**

If YES — stop. Do NOT write the task file yet.

Show Lijo this format:

```
Task [N] — [Name]

I see [N] ways to implement this. Before I write the task file, which approach do you want?

Option A: [Name]
  Approach: [one sentence]
  Pros: [2–3 bullets]
  Cons: [2–3 bullets]
  Complexity: Low / Medium / High
  Risk: Low / Medium / High

Option B: [Name]
  Approach: [one sentence]
  Pros: [2–3 bullets]
  Cons: [2–3 bullets]
  Complexity: Low / Medium / High
  Risk: Low / Medium / High

Option C: [Name] (if applicable)
  ...

My recommendation: Option [X] because [one sentence reason].

Reply with A, B, or C (or describe a different approach).
```

Wait for Lijo to choose before proceeding to Step 1.

If NO — continue to Step 1 silently.

---

## Step 1 — Identify The Task

Read the appropriate roadmap file:
- **V1 tasks** → `ai_docs/prep/07_roadmap.md`
- **V2 tasks** → `ai_docs/SACHNETRA_BUILD_GUIDE.md` (V2-001 through V2-010)

Find the specific task Lijo requested.
Note:
- Task number and name
- Files to touch (listed in roadmap)
- Prep docs relevant to this task
- Depends on (which previous task must be done first)
- Estimated time
- Whether this is V1 or V2

---

## Step 2 — Read Only What This Task Needs

Each task only needs specific prep docs and codebase files.
Do not read everything — only what is listed below for the requested task.

### Task 001 — India Variant Scaffold
```
Prep docs:    03_system_design.md
Codebase:     src/config/variants/tech.ts
              src/config/variants/full.ts
              src/App.ts
              CLAUDE.md
```

### Task 002 — Indian RSS Feeds
```
Prep docs:    04_data_sources.md
              03_system_design.md (CORS section)
Codebase:     src/config/variants/tech.ts (FEEDS array pattern)
              src/config/feeds.ts (Feed interface — NOT "FeedConfig", that doesn't exist)
              shared/rss-allowed-domains.json (source of truth for allowlist)
              api/_rss-allowed-domains.js (ESM copy of allowlist for Vercel edge)
```
⚠️ Allowlist architecture: `rss-proxy.js` and `ais-relay.cjs` do NOT contain inline allowlists.
They import from the files above. Only modify `shared/rss-allowed-domains.json` and `api/_rss-allowed-domains.js`.

### Task 003 — SachNetra Branding
```
Prep docs:    02_ui_design.md
Codebase:     src/styles/main.css
              index.html
              public/ (existing favicon/logo structure)
```

### Task 004 — Mobile CSS
```
Prep docs:    02_ui_design.md (home screen, story detail, state selector)
Codebase:     src/styles/main.css
              src/components/Panel.ts (base panel class)
              src/config/variants/tech.ts (DEFAULT_PANELS pattern)
```

### Task 005 — Two-Summary AI Prompt
```
Prep docs:    05_ai_prompt_spec.md
Codebase:     api/groq-summarize.js
              api/openrouter-summarize.js
              src/components/ (find where summary is displayed)
```

### Task 006 — India Map Layers
```
Prep docs:    06_map_layers.md  ← READ THE KASHMIR SECTION FIRST
              03_system_design.md (MAP_CONFIG section)
Codebase:     src/config/map-layer-definitions.ts
              src/config/variants/tech.ts (DEFAULT_MAP_LAYERS pattern)
              src/config/variants/full.ts (reference for regional views)
              src/config/geo.ts
```
⚠️ Kashmir compliance is mandatory for this task.
Read 06_map_layers.md "CRITICAL — Kashmir Boundary Compliance" section before writing any code.

### Task 007 — State Filtering
```
Prep docs:    04_data_sources.md (INDIA_STATE_KEYWORDS section)
              02_ui_design.md (state selector UI)
Codebase:     src/app/app-context.ts
              src/services/rss.ts
              src/config/variants/india.ts (current state after Task 006)
```

### V2-001 — Landing Page (sachnetra.in root)
```
Prep docs:    ai_docs/SACHNETRA_BUILD_GUIDE.md (V2-001 section)
Codebase:     index.html (current — app entry point, will become /app)
              vercel.json (routing rules)
              src/main.ts (current app bootstrap)
              public/ (favicon, og image)
```
⚠️ The app moves to `/app`. Landing page must NOT bundle Vite JS.
Plain HTML/CSS/JS only in `landing/index.html`.

### V2-002 — GoOut Hyderabad Panel
```
Prep docs:    ai_docs/SACHNETRA_BUILD_GUIDE.md (V2-002 section)
Codebase:     src/config/variants/india.ts
              src/config/panels.ts (INDIA_PANELS ternary)
              src/config/feeds.ts
              shared/rss-allowed-domains.json
              api/_rss-allowed-domains.js
```

### V2-003 — RSSHub Self-Hosted
```
Prep docs:    ai_docs/SACHNETRA_BUILD_GUIDE.md (V2-003 section)
Codebase:     vercel.json
              api/rss-proxy.js
              shared/rss-allowed-domains.json
              api/_rss-allowed-domains.js
```
⚠️ RSSHub was explicitly out of V1 scope. This is its first appearance. Read V2-003 notes carefully.

### V2-006 — WhatsApp Daily Brief
```
Prep docs:    ai_docs/SACHNETRA_BUILD_GUIDE.md (V2-006 section)
Codebase:     api/groq-summarize.js (summary format reference)
              api/ (existing edge function patterns)
```

---

## Step 2.5 — Rules Check

Read all 4 files in `.agents/rules/`.
Compare each rule against what you actually see in the codebase for this task.

**If everything matches reality:**
Continue to Step 3 silently. No action needed.

**If you find anything wrong, missing, or outdated:**
STOP. Do not change anything yet.

Show Lijo this exact format:

```
Rules check found [N] issue(s):

Issue 1:
  Rule file: .agents/rules/[filename].md
  Current rule says: "[quote the current rule]"
  Reality in codebase: "[what you actually found]"
  Proposed change: "[what you want to update it to]"
  Reason: "[why this matters for this task]"

Issue 2: [if any]
  ...

Do you want me to update these rules before proceeding?
Reply "yes update rules" or "skip, proceed as is".
```

Wait for Lijo to reply before touching any rule file.

**If Lijo says "yes update rules":**
Make only the specific changes listed above.
Then continue to Step 3.

**If Lijo says "skip":**
Note the discrepancy in the completion log.
Continue to Step 3 using the codebase reality, not the outdated rule.

---

### The Sacred Rule — Cannot Be Changed Under Any Circumstances

This rule in `sachnetra-boundaries.md` is permanent.
Do not propose changing it. Do not ask permission to change it.
It does not matter what the codebase shows.

```
SACRED — Never write to these files:
  src/config/variants/full.ts
  src/config/variants/tech.ts
  src/config/variants/finance.ts
```

If a task ever seems to require modifying these files — stop immediately and tell Lijo.
Something is wrong with the task, not the rule.

---

## Step 3 — Study The Codebase Pattern

Before writing the task file, answer these by reading the codebase:

1. What does the file look like RIGHT NOW that this task will modify?
2. What is the EXACT pattern to follow? Quote the relevant lines.
3. What is the interface/type definition being used?
4. Are there any dependencies or imports that need updating?

Write down what you found. This becomes the Context and Pattern sections.

---

## Step 3.5 — Variant Wiring Check

If this task adds data to a variant file (feeds, panels, map layers), verify
that the data is actually **wired** into the central routing files.
Defining data in `india.ts` is NOT enough — it must also be imported and
routed through the variant ternary in the central config files.

Check each row that applies to this task:

| What | Routing file | What to verify |
|------|-------------|----------------|
| FEEDS | `src/config/feeds.ts` | Import from variant file + ternary case added |
| DEFAULT_PANELS | `src/config/panels.ts` | Inline `INDIA_PANELS` definition + ternary case |
| DEFAULT_MAP_LAYERS | `src/config/panels.ts` | Inline definition + ternary case |
| Per-feed fallback | `src/app/data-loader.ts` | `isPerFeedFallbackEnabled()` returns `true` for this variant (no server digest) |
| Domain allowlist | `shared/rss-allowed-domains.json` + `api/_rss-allowed-domains.js` | Both files updated in sync |
| Variant detection | `src/config/variant.ts` | Hostname → variant mapping exists |

**The import chain to remember:**
```
data-loader.ts → FEEDS from @/config → config/index.ts → feeds.ts → variant ternary
panel-layout.ts → DEFAULT_PANELS from @/config → config/index.ts → panels.ts → variant ternary
```

**Dead code trap:** `india.ts` may export `DEFAULT_PANELS` but nobody imports it
for panel creation. `panels.ts` is the actual source of truth. Always trace the
import chain to confirm data reaches the consumer.

If any wiring is missing, add it to the Implementation phases.

---

## Step 3.8 — Second-Order Impact Check

Before writing the task file, run this checklist.
This step catches cascading failures that aren't obvious from the task description.

For each file this task will modify, ask:

```
□ Breaking changes?
    Does this change the shape of an exported type, function signature,
    or API response that other files depend on?

□ Ripple effects?
    What else imports this file? Run a quick search:
    grep -r "from.*[filename]" src/ api/
    List every consumer. Does this change break any of them?

□ Performance impact?
    Does this add a new API call, database query, or compute step per request?
    Is it cached? What's the worst-case latency?

□ Security surface?
    Does this expose a new endpoint? Accept new user input?
    Is input validated? Is the new route behind auth (if needed)?

□ Variant bleed?
    Does this change affect full.ts / tech.ts / finance.ts behaviour?
    (Changes to shared infrastructure can break other variants silently.)
```

**RED flag** (stop, tell Lijo):
- The change breaks a type used in 3+ files
- The change adds an unauthenticated endpoint that accepts raw user data
- The change modifies shared infrastructure used by all variants

**YELLOW flag** (note it in the task file, discuss before executing):
- A performance cost with no cache
- A breaking change isolated to 1–2 files you can fix in the same task
- A new env variable needed

If any RED flag is found — stop. Show Lijo what you found and why it's a blocker.
Wait for guidance before proceeding.

---

## Step 3.9 — Build the Context Manifest

Every new task file MUST start with a Context Manifest. This block tells future Claude
sessions what to load (and what to skip) before working on the task. Build it now —
*before* writing the task file in Step 4 — so the answers go in clean.

Decide these four lists:

### 1. Load list (required reading, in order)

Always start with:
1. `CLAUDE.md` — auto-loaded; #1 by convention

Then choose which `.agents/rules/*.md` files apply (almost always pick `boundaries.md`):
- `sachnetra-context.md` — only if task touches project identity / V2 mission
- `sachnetra-patterns.md` — if task uses `runSeed()`, CSS variables, or established patterns
- `sachnetra-boundaries.md` — **ALWAYS include** if task is near sacred files or shared infra
- `india-variant.md` — if task touches `india.ts`, panels, AI format, or V2 env vars

Then the prep doc named in this task's header.

Then which wiki pages back this task? Read `ai_docs/sachnetra v2/wiki/index.md`. Pick
**1–3 pages** that explain the WHY — typically syntheses or playbooks, rarely concepts.
Skip pages that are merely *related*; the test is "would a fresh Claude session do worse
without this?"

Code files come last — they're listed in "Files To Open Before Starting" further down
in the task file, so the manifest just references that section by name.

### 2. Don't-load list (explicit skips)

Be explicit. A fresh Claude session will grep the repo "just in case" if you don't tell
it not to. Default skips for a V2 engineering task:
- `ai_docs/prep/*` (V1 prep docs — superseded by V2 roadmap)
- `wiki/concepts/*` (compounding, inflation, interest_rates, bonds_and_yields) — domain
  knowledge, not needed for engineering work
- `wiki/playbooks/personal_investing.md` — strategy, not engineering
- `ai_docs/dev_templates/*` — task already exists, no template work needed
- All `tasks/00*_*.md` (V1 numeric tasks) — archived

If a wiki page exists but is irrelevant to *this* task, name it in the don't-load list.
Naming-to-skip is more useful than silence — silence makes Claude check anyway.

### 3. Skill / template lineage

- Generated by: this file (`adapt_sprint_task.md`) or the `/task` skill
- Which skills will the executing agent use? Pick the ones expected for this task:
  - `/bugfix` — if debugging is anticipated during execution
  - `/git` — for the final commit (always)
  - `/pr` — if a PR is anticipated
  - `/cleanup` — if dead-code removal is part of the task
  - `/diff` — to summarize the session at the end

Name them so the executing agent knows which skills are blessed upfront.

### 4. Write your manifest answers down

Keep them on hand — they go directly into the template block in Step 4 below.

---

## Step 4 — Generate The Task File

Save to: `ai_docs/tasks/[V1: 00N | V2: V2-00N]_[task_name].md`

Use this exact structure:

---

```markdown
# Task [N] — [Task Name]
*SachNetra Adapt Sprint*

**Depends on**: Task [previous] must be complete
**Estimated time**: [from roadmap]
**Prep doc**: [which prep doc has the decisions]
**V1 or V2**: [V1 / V2]

---

## Context Manifest
*Read these BEFORE any code work. Skip the "Don't load" list to save tokens.*

### Load (in order)
1. `CLAUDE.md` — auto-loaded; verify Sacred Files list matches what this task touches
2. [list `.agents/rules/*.md` files chosen in Step 3.9 — one per line, with a parenthetical reason]
3. [prep doc from header, with one-line reason]
4. **Wiki — required reading:**
   - `ai_docs/sachnetra v2/wiki/[path].md` — [one-line why]
   - [add 1–2 more if needed; skip this section if no wiki page applies]
5. **Code files** — see "Files To Open Before Starting" section below

### Don't load (not relevant — skip to keep context tight)
- [list explicit skips chosen in Step 3.9]
- [be specific — name files/dirs so a fresh Claude doesn't grep them "just in case"]

### Skill / template lineage
- Generated by: `ai_docs/dev_templates/adapt_sprint_task.md` (or `/task` skill)
- Bugfix during execution: use `/bugfix` skill (loads `ai_docs/dev_templates/bugfix.md`)
- Commit at end: use `/git` skill (loads `ai_docs/dev_templates/git_workflow_commit.md`)
- [add other skills if anticipated: `/pr`, `/cleanup`, `/diff`]

---

## Context — Current State

[What does the codebase look like RIGHT NOW?
Be specific. Name files. Describe what they contain.
Example: "src/config/variants/india.ts exists with empty FEEDS array.
         api/rss-proxy.js has 150 allowed domains, no Indian sites yet."]

## What This Task Does

[One sentence per change.
Example:
  "Adds 20 Indian RSS feeds to india.ts FEEDS array."
  "Adds 19 Indian domains to api/rss-proxy.js allowlist."]

---

## Success Criteria

This task is complete when ALL of the following are true:

- [ ] [Specific, observable outcome 1]
- [ ] [Specific, observable outcome 2]
- [ ] `npm run typecheck` shows 0 errors
- [ ] `npx biome check .` shows 0 errors
- [ ] No console errors in browser at VITE_VARIANT=india

[Add task-specific criteria — things visible in the browser, API responses, etc.]

---

## Second-Order Impact

[Filled in from Step 3.8. List any YELLOW flags here.]

- Affected consumers: [list files that import changed files]
- Performance: [cache hit/miss impact, if any]
- Variant bleed risk: [none / [description]]
- New env vars needed: [none / VAR_NAME=value — add to .env.local and Vercel dashboard]

---

## Files To Open Before Starting

\`\`\`
exact/path/file1.ts   — reason
exact/path/file2.js   — reason
\`\`\`

---

## Pattern To Follow

[Quote exact existing code to model after.]

From `src/config/variants/tech.ts`, FEEDS array looks like:
\`\`\`typescript
{ name: 'TechCrunch', url: 'https://techcrunch.com/feed/',
  category: 'Tech', tier: 2, region: 'global' },
\`\`\`
Follow this exact structure. Do not invent new fields.

---

## Implementation

### Phase 1: [First group of changes]
**Goal**: [What this phase achieves]

- [ ] **Step 1.1** — [Action]
  - File: `exact/path/file.ts`
  - What to do: [Precise instruction]
  - Do not change anything else in this file.

- [ ] **Step 1.2** — [Action]
  - File: `exact/path/file.ts`
  - What to do: [Precise instruction]

### Phase 2: [Second group of changes]
**Goal**: [What this phase achieves]

- [ ] **Step 2.1** — [Action]
  - File: `exact/path/file.ts`
  - What to do: [Precise instruction]

---

## Before / After

**Before** (`[file]`):
\`\`\`typescript
[current code — copied directly from Step 3 codebase read]
\`\`\`

**After**:
\`\`\`typescript
[code after this task]
\`\`\`

---

## Error Scenarios

[What can go wrong? What does it look like? How to fix it?]

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| 403 from RSS feed | Domain not in allowlist | Add to both allowlist files (3-file rule) |
| Panel not showing | Wiring missing in panels.ts | Trace import chain from Step 3.5 |
| `[example error]` | `[cause]` | `[fix]` |

---

## Environment Variables

[List any env vars this task introduces or depends on.]

| Variable | Where set | Purpose |
|----------|----------|---------|
| `VITE_VARIANT=india` | `.env.local` | Required to test india variant |
| `[NEW_VAR]` | `.env.local` + Vercel dashboard | [purpose] |

---

## Read vs Write

**READ for reference (always allowed):**
- `src/config/variants/full.ts` — study pattern, quote from it, never write
- `src/config/variants/tech.ts` — study pattern, quote from it, never write
- Any other file not listed in "Files To Open"

**WRITE only to files explicitly listed in this task:**
- [exact files this task modifies — filled in by agent]

**Never write to:**
- `src/config/variants/full.ts` — sacred, existing live variant
- `src/config/variants/tech.ts` — sacred, existing live variant
- `src/config/variants/finance.ts` — sacred, existing live variant
- [other out-of-scope files for this specific task]

---

## Verify

\`\`\`bash
npm run typecheck     # Must show: 0 errors
npx biome check .     # Must show: 0 errors
\`\`\`

In browser (npm run dev with VITE_VARIANT=india):
- [ ] [What to look for — specific and observable]
- [ ] [What to look for]
- [ ] [What to look for]

### Debugging Checklist (if something looks wrong)

Follow this sequence — it catches 90% of variant bugs:

1. **Console: `[App] Variant check:`** — confirms variant name is set
2. **Console: `[News] Digest missing for "X"`** — if categories match your FEEDS keys, routing works
3. **Console: `using per-feed fallback` vs `fallback disabled`** — confirms RSS fetching is on
4. **Network tab: filter `rss-proxy`** — zero requests = fallback disabled. Check 200 vs 403
5. **Panels visible?** — data arriving but no panels = check `panels.ts` INDIA_PANELS
6. **Clear localStorage** — `localStorage.clear(); location.reload();`

**Red herrings to ignore:**
- `[feeds] 103 unique sources / 200 total` — always shows FULL_FEEDS count, not variant
- LIVE NEWS ticker (Bloomberg/CNN) — separate live TV system, not RSS
- `india.ts` `DEFAULT_PANELS` export — dead code, not wired to panel-layout

⚠️ **After ANY change to panel definitions in `panels.ts`:**
Always tell Lijo to run `localStorage.clear()` + hard refresh.
Panel settings are cached in localStorage and won't update without clearing.

Do not move to the next task until all checks pass.

---

## Completion Log

- [ ] Phase 1 complete — [timestamp]
- [ ] Phase 2 complete — [timestamp]
- [ ] Typecheck: 0 errors — [timestamp]
- [ ] Biome: 0 errors — [timestamp]
- [ ] Browser verified — [timestamp]
- [ ] Success Criteria: all checked — [timestamp]
- [ ] **TASK [N] COMPLETE** ✅
```

---

## Step 4.5 — Code Changes Preview

Before presenting for approval, show Lijo the actual diffs.

Do NOT generate hypothetical code. Read the actual files now.

For each file this task will modify:

```
File: [exact/path/file.ts]

CURRENT (lines [X]–[Y]):
  [quote the actual code you just read]

PROPOSED CHANGE:
  [exact code you will write]

Reason: [one sentence]
```

Only after showing real before/after for every file — proceed to Step 5.

---

## Step 5 — Present For Approval

Show Lijo:

```
Task [N] — [Name]
Saved: ai_docs/tasks/[filename].md

Files changing:
  • [file1] — [what changes]
  • [file2] — [what changes]

Phases:
  Phase 1: [one line]
  Phase 2: [one line]

Time estimate: [X hours]

Second-order impacts: [none / brief note]

Options:
  A) Show full code preview for each file
  B) Proceed to execute
  C) Give feedback to revise the task file

Reply A, B, or C.
```

**Approval vocabulary:**
- `"proceed"` or `"B"` → execute the task
- `"A"` → show Step 4.5 preview first, then wait again
- `"C"` or any feedback → revise and re-present
- `"stop"` → abandon current task, do not touch any files

Wait for explicit approval before touching any code.

---

## Step 6 — Execute

Get the current timestamp first (use the system date, not a hardcoded guess).

Work phase by phase. Complete Phase 1 fully before Phase 2.
Mark each checkbox [x] with real timestamp as you go.

After each phase:
```
✅ Phase [N] complete — [HH:MM]
  • [file] (+X lines) — [description]
Proceeding to Phase [N+1]...
```

After all phases:
```
✅ Task [N] — [Name] complete

Modified:
  • [file1] (+X lines): [description]
  • [file2] (+Y lines): [description]

Typecheck: ✅ 0 errors
Biome:     ✅ 0 errors
Browser:   ✅ [check passed]

Proceeding to Step 7 — Code Review...
```

---

## Step 7 — Comprehensive Code Review

This step is mandatory. Run it after all phases are complete, before declaring the task done.

### 7.1 — Re-read every modified file

Read each file that was changed in Step 6.
Do not rely on memory. Actually call the Read tool again.

### 7.2 — Run checks

```bash
npm run typecheck     # Must be 0 errors
npx biome check .     # Must be 0 errors
```

### 7.3 — Check Success Criteria

Go through each item in the task file's Success Criteria section.
Mark each one ✅ or ❌ with evidence (what you saw, what line, what output).

### 7.4 — Variant bleed check

Open `src/config/variants/full.ts` and `src/config/variants/tech.ts`.
Confirm nothing changed in these files. (Read → compare to before state.)

### 7.5 — Confidence rating

```
Code Review Summary:
  Files re-read:      [list]
  Typecheck:          ✅ / ❌
  Biome:              ✅ / ❌
  Success criteria:   [N/N passed]
  Variant bleed:      ✅ none / ❌ [what]

Confidence: [High / Medium / Low]
Reason: [one sentence]

[If confidence is Medium or Low — explain what you're uncertain about
 and what Lijo/James should double-check manually.]

TASK [N] COMPLETE ✅
```

### 7.6 — Update CLAUDE.md task status (mandatory)

After every task completion, update the V2 Task Status table in `CLAUDE.md`:

Change the completed task line from:
```
V2-00N  [Task Name]   [ ] not started
```
To:
```
V2-00N  [Task Name]   [COMPLETE ✅ — YYYY-MM-DD]
```

This keeps `CLAUDE.md` as a live dashboard that Claude Code reads at the start of every session.
Do not skip this step — it is how future sessions know what has been built.

---

## Code Quality

- TypeScript strict — no `any` unless codebase uses it
- Early returns over nested if/else
- async/await not .then() chains
- Comments explain WHY not WHAT
- No commented-out code — delete completely
- Mobile-first CSS — 375px base
- Touch targets minimum 44px
- Use `--sn-*` CSS variables, never hardcoded hex
- Conditional branding via `[data-variant="india"]` CSS selectors, not JS class toggling
- Hide irrelevant navigation for variant-specific brands — don't adapt, hide
- SVG favicon preferred over PNG renders (modern browser target)
- Branding is additive — new files + conditional code, never modify existing variant files

**Forbidden:**
```
npm run build   ❌
npm run dev     ❌  (Lijo runs this himself)
```

**Allowed:**
```
npm run typecheck   ✅
npx biome check .   ✅
Reading files       ✅
```

---

## Known Gotchas

These traps have been hit in previous tasks. Check before each task:

1. **403 from Indian RSS feeds** — Some sites block cloud server IPs. Use Google News RSS proxy:
   `news.google.com/rss/search?q=site:domain.com&hl=en&gl=IN&ceid=IN:en`
   Always try direct URL first, fall back to proxy only when blocked.

2. **SVG gradient ID conflicts** — Same SVG in multiple DOM locations = broken gradients.
   Prefix gradient IDs per context (e.g. `sn-`, `snf-`, `snl-`).

3. **Allowlist is 3 files, not 1** — Source of truth: `shared/rss-allowed-domains.json`.
   ESM copy: `api/_rss-allowed-domains.js`. CJS wrapper (don't touch): `shared/rss-allowed-domains.cjs`.
   Never edit `rss-proxy.js` or `ais-relay.cjs` for allowlist changes.

4. **`india.ts` exports can be dead code** — `DEFAULT_PANELS` in `india.ts` is metadata only.
   `panels.ts` is the actual source of truth for panel creation. Always verify the import chain.

5. **Branding lives in layout, not variant config** — Header/footer/favicon: `panel-layout.ts`,
   `main.css`, `variant-meta.ts`, `index.html`. Not in `india.ts`.

6. **Loading screen content must be inline** — Anything visible before the JS bundle loads must
   be inline HTML/CSS/JS in `index.html`, not imported from modules.

7. **localStorage caches panel settings** — After changing `panels.ts`, always clear localStorage
   and hard refresh. Stale cached settings will hide new panels.

8. **CACHE_VERSION controls Redis TTL** — Current version is `v8`. Bumping this invalidates all
   cached AI summaries. Only bump when prompt format changes. Key pattern: `india:summary:v8:[slug]`.

9. **`middleware.ts` / `vercel.json` rewrites affect ALL variants** — Changes to routing rules or
   middleware are global. Always check what other variants' routes look like before modifying.

10. **Vercel Edge Functions are plain JS, not TypeScript** — Files in `api/` use `.js` extension
    and CommonJS or ESM patterns, NOT TypeScript. Do not add type annotations or `import type`.

---

## V2 Scope Guard

V1 is complete. V2 tasks are defined in `ai_docs/SACHNETRA_BUILD_GUIDE.md`.

If any step pulls toward something NOT in V2-001 through V2-010 — stop and tell Lijo.

**In scope for V2:**
```
✅ V2-001 — Landing page (sachnetra.in root)
✅ V2-002 — GoOut Hyderabad local events panel
✅ V2-003 — RSSHub self-hosted feeds
✅ V2-004 — Convex user accounts + auth
✅ V2-005 — Brief subscriptions (saved stories)
✅ V2-006 — WhatsApp daily brief
✅ V2-007 — Hyderabad city dashboard
✅ V2-008 — State liveability scoring
✅ V2-009 — Hindi / regional language toggle
✅ V2-010 — Push notifications
```

**Still out of scope (V3 or later):**
```
❌ Graph database, knowledge graph
❌ LAC/LOC or LWE map layers
❌ Indian military bases
❌ Election monitor
❌ Scraping (non-RSSHub)
```
