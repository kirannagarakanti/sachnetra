# Diff Summary & Change Analysis — SachNetra

> Use after a coding session to get a clean summary of what changed and why.

---

## Mission

Identify which files were modified → generate readable before/after comparisons → provide concise summaries scaled to the size of the change.

---

## Step 1: Identify Changed Files

**Default (AI-touched files):**
Review the conversation for files edited or written during this session.

**Expanded (all uncommitted changes):**
If the user says "show all changes" or "full diff":
```bash
git status
git diff
git diff --staged
```

---

## Step 2: Analyse Each File

For each changed file:
1. Read current content
2. Run `git diff <filename>` for before/after
3. Count lines added/removed
4. Categorise: Simple / Medium / Large / Very Large

---

## Step 3: Output Format

For each file:

```
### src/path/to/file.ts

**Summary:** [Scaled — see guidelines below]

┌─ Before (lines X–Y) ──────────────────────────────
│ [original code]
└───────────────────────────────────────────────────

┌─ After (lines X–Y) ───────────────────────────────
│ [modified code]
└───────────────────────────────────────────────────

**Impact:** Modified / New file / Deleted · [+X lines, -Y lines]
```

---

## Summary Scaling

| Change size | Summary length |
|-------------|---------------|
| 1–10 lines | 1 sentence — the specific change |
| 11–50 lines | 2 sentences — what and why |
| 51–200 lines | 3 sentences — what, why, and impact |
| 200+ lines | 4 sentences — comprehensive overview |

---

## Session Overview (Top of Response)

```
## Change Summary

Files modified:   [count]
Lines changed:    [+X, -Y]
Change type:      Feature / Fix / Refactor / Config / CSS
Scope:            AI-touched files only | All uncommitted changes

---
[per-file diffs below]
---

## Overall Stats
Files:         [X]
Lines added:   +[X]
Lines removed: -[X]
Net:           ±[X]
```

---

## Sachnetra-Specific Notes

When summarising SachNetra changes, flag these if they appear:

- **CACHE_VERSION bump** — mention the old and new version (affects Redis purge)
- **Allowlist change** — confirm all 3 files updated: `shared/rss-allowed-domains.json`, `api/_rss-allowed-domains.js`, (NOT rss-proxy.js inline)
- **Sacred file touched** — STOP. Note `full.ts`, `tech.ts`, or `finance.ts` must never be modified
- **panels.ts vs india.ts** — distinguish between the live source of truth (panels.ts) and the variant config (india.ts)
- **CSS scope** — confirm changes are under `[data-variant="india"]` and don't affect other variants

---

## Examples

### Small change (1 sentence):
```
### api/groq-summarize.js

**Summary:** Bumped CACHE_VERSION from v7 to v8 to purge stale summaries after tone prompt rewrite.

┌─ Before (line 4) ──────────────────────────────────
│ 4 | const CACHE_VERSION = 'v7';
└────────────────────────────────────────────────────

┌─ After (line 4) ───────────────────────────────────
│ 4 | const CACHE_VERSION = 'v8';
└────────────────────────────────────────────────────

**Impact:** Modified · [+1 line, -1 line]
```

### Medium change (2 sentences):
```
### src/config/variants/india.ts

**Summary:** Added 12 new RSS feeds across politics and economy categories.
Included Google News RSS proxies for 3 sites that return 403 when fetched directly.

[diff block]

**Impact:** Modified · [+36 lines, -0 lines]
```

### Large change (3 sentences):
```
### src/components/StateSelector.ts

**Summary:** Rebuilt state selector as a collapsible grid with ×close button replacing the old Done button.
Added 36 states + UTs with 2-column layout and touch targets ≥ 44px throughout.
State selection now persists to localStorage and updates the bottom nav location label.

[diff block]

**Impact:** Modified · [+140 lines, -62 lines]
```

---

## Edge Cases

**No changes detected:**
> I haven't modified any files this session and git status is clean. Let me know what you'd like me to review.

**Binary files (logos, GeoJSON):**
> `public/sachnetra-logo.svg` — SVG logo updated (binary/large file, no inline diff shown)

**Very large files (200+ lines changed):**
Summarise sections, don't show full diff. Group similar changes together.
