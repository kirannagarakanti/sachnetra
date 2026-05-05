# PR Review Template — SachNetra

> Use before James reviews a pull request. Catches issues before they reach code review.

---

## When to Use

- Before opening a PR on a V2 feature branch
- Before merging any changes to main
- When James asks for a self-review before his review

---

## Step 1: Context

```
PR title:     [feat/fix/style: description (Task NNN)]
Branch:       [feat/v2-001-landing-page]
Base branch:  [main]
Files changed: [count]
```

---

## Step 2: Automated Checks

Run these before the human review:

```bash
npm run typecheck     # 0 errors required
npm run lint          # Biome clean required
git diff main...HEAD  # Full diff one more time
```

If either check fails — fix before opening the PR.

---

## Step 3: Self-Review Checklist

Work through each section methodically.

### Correctness
- [ ] The feature/fix does exactly what the task file says
- [ ] No unintended side effects in adjacent files
- [ ] Edge cases handled (empty state, loading state, error state)
- [ ] Mobile layout tested (375px viewport)
- [ ] Desktop layout tested (1280px viewport)

### SachNetra Architecture
- [ ] Sacred files untouched: `full.ts`, `tech.ts`, `finance.ts`, `src/generated/`
- [ ] CSS scoped under `[data-variant="india"]` — doesn't bleed into other variants
- [ ] No hardcoded hex colours — using `--sn-*` CSS variables
- [ ] Allowlist changed? All 3 files updated: `shared/rss-allowed-domains.json` + `api/_rss-allowed-domains.js`
- [ ] Import chain verified: new data flows through `feeds.ts` / `panels.ts` (not dead code in india.ts)
- [ ] CACHE_VERSION bumped if AI prompt changed?

### Code Quality
- [ ] No `console.log` debug statements
- [ ] No commented-out code (without explanation)
- [ ] No TypeScript `any` (unless existing pattern in codebase)
- [ ] Functions are focused — one thing each
- [ ] No inline styles on DOM elements
- [ ] Edge functions (`api/*.js`) are self-contained plain JS — no src/ imports

### Commits
- [ ] Commit messages follow format: `type: description (Task NNN)`
- [ ] No "WIP", "fix", "updates", or similar lazy messages
- [ ] Related changes grouped in the same commit

### Documentation
- [ ] Task file completion log filled (phases marked, timestamp added)
- [ ] `ai_docs/prep/07_roadmap.md` task marked ✅ if V1 task
- [ ] V2 task file updated if applicable

---

## Step 4: Write the PR Description

```markdown
## Summary

[1–2 sentences — what this PR does and why]

## Task
Closes Task [NNN] — [Task name]
Task file: ai_docs/tasks/0[NNN]_[name].md

## Changes
- `src/path/file.ts` — [what changed]
- `api/path/file.js` — [what changed]
- `src/styles/main.css` — [what changed]

## Testing
- [ ] npm run typecheck — 0 errors
- [ ] npm run lint — clean
- [ ] Tested on mobile (375px Chrome)
- [ ] Tested on desktop (1280px Chrome)
- [ ] [Any specific scenario to test]

## Screenshots
[Attach mobile + desktop screenshots if UI changed]

## Notes for Reviewer
[Anything James should pay attention to — edge cases, trade-offs, questions]
```

---

## Step 5: Common Issues to Flag for James

If any of these are present, highlight them explicitly in the PR description:

**High attention needed:**
- Any change to `middleware.ts` (affects all variants, not just India)
- Any change to `api/_cors.js` or `api/_api-key.js` (security boundary)
- Any change to `server/gateway.ts` (affects all API routing)
- New Vercel env vars needed (requires James to add in dashboard)
- New dependency added to `package.json` (bundle size impact)

**Callout format:**
```
⚠️ **Reviewer Note:** This PR adds `VITE_NEW_API_KEY` as a required env var.
James needs to add it to the Vercel dashboard before merging.
```

---

## Step 6: After James's Review

If changes requested:
1. Address each comment — respond with what you changed or why you disagree
2. Re-run `npm run typecheck` + `npm run lint`
3. Push the fixup commits
4. Re-request review

If approved:
```bash
git checkout main
git merge --no-ff feat/v2-001-landing-page
git push origin main
# Vercel auto-deploys from main
```

Verify sachnetra.com after deploy (allow 1–2 min for Vercel build).
