# Update Template Workflow — SachNetra

> Use this when a dev template or workspace rule needs updating because the codebase has drifted.

---

## When to Update Templates

Templates go stale when:
- A task changes a file that templates reference (e.g., CACHE_VERSION bumped)
- The variant wiring pattern changes
- New sacred files are added
- New Biome lint rules are enforced
- A gotcha is discovered that should be documented for future tasks
- A new V2 pattern is established that should become the standard

---

## Files to Keep Updated

```
ai_docs/dev_templates/bugfix.md
  → Update: Known Gotchas section when a new trap is discovered
  → Update: CACHE_VERSION references when bumped

ai_docs/dev_templates/adapt_sprint_task.md
  → Update: Step 2 codebase file list when key files change
  → Update: Debugging Checklist when new patterns emerge
  → Update: V1 Scope Guard when V2 features are promoted to V1
  → Update: Known Gotchas when new traps are found

ai_docs/dev_templates/git_workflow_commit.md
  → Update: example commit messages with current task numbering

.agents/rules/sachnetra-context.md
  → Update: when the product definition changes
  → Update: when V2 features go live

.agents/rules/sachnetra-patterns.md
  → Update: when new coding patterns are established
  → Update: when new verification commands are needed

.agents/rules/sachnetra-boundaries.md
  → Update: when new scope boundaries are defined
  → Update: when V2 features are approved (remove from guard)

.agents/rules/india-variant.md
  → Update: when CACHE_VERSION changes
  → Update: when new CSS variables are added
  → Update: when map configuration changes

ai_docs/SACHNETRA_BUILD_GUIDE.md
  → Update: V2 task status as features ship
  → Update: V3 backlog when V3 planning begins
```

---

## Step 1: Identify What's Stale

Before a new task, the `adapt_sprint_task.md` template has a rules check (Step 2.5).
If it finds discrepancies, bring them here for systematic updating.

Or after completing a task, ask:
> "Did this task reveal any gotchas, new patterns, or changed file paths that should be documented?"

---

## Step 2: Propose the Update

Format:
```
Template update needed:

File:           ai_docs/dev_templates/bugfix.md
Section:        Known Sachnetra Gotchas
Current text:   "CACHE_VERSION — Current: v8 (as of Task 018.5)"
Updated text:   "CACHE_VERSION — Current: v9 (bumped in Task V2-003)"
Reason:         Cache version bumped when landing page routing was added

Confirm to update.
```

Wait for Lijo or James to confirm before editing template files.

---

## Step 3: Apply the Update

Make only the specific change identified. Do not "while I'm here" improvements unless separately proposed and approved.

After updating:
```bash
git add ai_docs/dev_templates/bugfix.md
git commit -m "docs: update CACHE_VERSION reference in bugfix.md (Task V2-003)"
```

---

## Step 4: Propagate to .claude/commands/

If the template has a corresponding Claude Code slash command file in `.claude/commands/`, update that too. They should stay in sync.

```bash
# Check which commands mirror which templates
ls .claude/commands/

# If the slash command file is just a reference to the template:
# Update the template only — the command file just points to it.

# If the slash command file has its own content:
# Update both files.
```

---

## Update Frequency Guideline

| Trigger | Update? |
|---------|---------|
| Task changes CACHE_VERSION | Yes — bugfix.md, india-variant.md |
| New RSS feed added | No — too granular |
| New file added to sacred list | Yes — boundaries.md, adapt_sprint_task.md |
| New gotcha discovered mid-task | Yes — bugfix.md, adapt_sprint_task.md |
| V2 feature goes live | Yes — build guide, context.md |
| New Biome rule added | Yes — cleanup.md, patterns.md |
| Pattern established for new component type | Yes — patterns.md |
