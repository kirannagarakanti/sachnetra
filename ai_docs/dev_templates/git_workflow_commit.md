# Git Workflow & Commit Template — SachNetra

> Consistent commits keep the history readable for James, future contributors, and your future self.

---

## When to Commit

- After each completed task phase (not mid-phase)
- After a bugfix is verified in browser
- Before switching to a different feature
- Always after `npm run typecheck` passes

**Never commit with:**
```
❌ TypeScript errors
❌ Biome lint errors
❌ console.log debug statements left in
❌ Commented-out code with no explanation
```

---

## Step 1: Verify Before Committing

```bash
npm run typecheck   # Must show: 0 errors
npm run lint        # Must pass clean
git status          # Review all changed files
git diff            # Read the actual diff — no surprises
```

---

## Step 2: Stage Changes

Stage related files together. If you touched multiple concerns, split into separate commits.

```bash
# Stage specific files (preferred)
git add src/config/variants/india.ts
git add shared/rss-allowed-domains.json
git add api/_rss-allowed-domains.js

# Or stage all (only if all changes belong to the same commit)
git add .
```

---

## Step 3: Write the Commit Message

**Format:**
```
<type>: <short description> ([Task NNN])

[Optional body — what and why, not how]
[Optional footer — breaking changes, closes issues]
```

**Types:**
| Type | Use for |
|------|---------|
| `feat` | New feature or UI |
| `fix` | Bug fix |
| `refactor` | Code restructure (no behaviour change) |
| `style` | CSS / visual changes only |
| `config` | Config changes (feeds, variant, env) |
| `docs` | Documentation, comments, prep docs |
| `test` | Tests only |
| `chore` | Dependency updates, tooling |

**Good commit messages:**
```
feat: add WhatsApp brief delivery for morning digest (Task V2-006)

fix: state filter leaking non-Maharashtra stories via parliament keyword (Task 010)

config: add 12 new economy RSS feeds and update allowlist (Task 013b)

style: scope all .sn-* CSS to [data-variant="india"] selector (Task 009)

fix: bump CACHE_VERSION v7→v8 after tone prompt rewrite (Task 018.5)
```

**Bad commit messages:**
```
❌ "fixed stuff"
❌ "updates"
❌ "WIP"
❌ "asdf"
❌ "final final"
```

---

## Step 4: Push

```bash
git push origin main
# or your working branch:
git push origin feat/v2-landing-page
```

---

## Branch Strategy

```
main                    ← production (sachnetra.com)
feat/v2-landing-page    ← V2 features in development
fix/state-filter-leak   ← hotfix branch
```

For V2 features, branch from main:
```bash
git checkout -b feat/v2-001-landing-page
# ... do work ...
git push origin feat/v2-001-landing-page
# Create PR for James to review
```

For hotfixes to production:
```bash
git checkout -b fix/cache-version-bump
# ... fix ...
git push origin fix/cache-version-bump
# PR → James reviews → merge → Vercel deploys
```

---

## Commit Message Templates by Task Type

### Feature task completion:
```
feat: [feature name] (Task [NNN])

[1–2 sentences on what was built, not how]
Files: [list key files changed]
```

### Bug fix:
```
fix: [what was broken and what fixed it] (Task [NNN] or Issue #X)

Root cause: [one sentence]
```

### RSS / allowlist update:
```
config: add [N] Indian RSS feeds and update allowlist (Task [NNN])

Added feeds: [category names]
Updated: shared/rss-allowed-domains.json + api/_rss-allowed-domains.js
```

### Cache version bump:
```
fix: bump CACHE_VERSION v[old]→v[new] to purge [reason] summaries
```

### CSS / branding:
```
style: [what UI changed] for SachNetra India variant (Task [NNN])
```

---

## Pre-Push Checklist

- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — clean
- [ ] No `console.log` debug lines
- [ ] No commented-out code without explanation
- [ ] Commit message follows format above
- [ ] Sacred files untouched (full.ts, tech.ts, finance.ts)
- [ ] James notified if pushing to main directly
