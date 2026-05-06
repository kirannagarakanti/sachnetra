# Task V2-000 — V2 Bootstrap & Rules Update
*SachNetra Adapt Sprint*

**Depends on**: none
**Estimated time**: 1–2 hours
**Prep doc**: `ai_docs/sachnetra v2/V2_roadmap.md` (source of truth)
**V1 or V2**: V2

---

## Context — Current State

The agent rules in `.agents/rules/` reflect V1 scope only.
`sachnetra-boundaries.md` Section 3 lists RSSHub, WhatsApp, and Hindi as forbidden — all three are in V2 scope.
`sachnetra-context.md` has no V2 mission or quant pivot framing.
`sachnetra-patterns.md` has no Railway cron or `runSeed()` Railway cron pattern.
`india-variant.md` has no env vars for the intelligence pipeline.
`CLAUDE.md` does not exist at the project root (Claude Code auto-loads this on every session start).
`ai_docs/SACHNETRA_BUILD_GUIDE.md` V2 section lists GoOut Hyd as V2-002 and Landing Page as V2-001 — both superseded by the new roadmap.

No TypeScript changes in this task — documentation and rules only.

---

## What This Task Does

- Appends V2 mission + quant pivot paragraph to `sachnetra-context.md`
- Adds Railway cron / `runSeed()` pattern section to `sachnetra-patterns.md`
- Updates `sachnetra-boundaries.md` Section 1 (adds `seed-insights.mjs` sacred) + rewrites Section 3 (V2 scope guard)
- Appends V2 environment variables to `india-variant.md`
- Creates `CLAUDE.md` at project root
- Replaces V2 Build Plan section in `ai_docs/SACHNETRA_BUILD_GUIDE.md`

---

## Success Criteria

- [ ] `sachnetra-context.md` contains V2 mission paragraph and "collection engine" sentence
- [ ] `sachnetra-patterns.md` contains Railway cron / `runSeed()` pattern section
- [ ] `sachnetra-boundaries.md` Section 1 lists `scripts/seed-insights.mjs` as sacred
- [ ] `sachnetra-boundaries.md` Section 3 no longer marks RSSHub, WhatsApp, Hindi as forbidden
- [ ] `sachnetra-boundaries.md` Section 3 matches `V2_roadmap.md` scope guard exactly
- [ ] `india-variant.md` documents `DATABASE_URL` and `HF_API_TOKEN`
- [ ] `CLAUDE.md` exists at project root with V2 architecture and sacred files
- [ ] `ai_docs/SACHNETRA_BUILD_GUIDE.md` V2 section matches new roadmap task numbering (V2-000 through V2-010)
- [ ] `scripts/seed-insights.mjs` is UNCHANGED — `git diff scripts/seed-insights.mjs` shows nothing
- [ ] `src/config/variants/` is UNCHANGED — `git diff src/config/variants/` shows nothing

---

## Second-Order Impact

- **Affected consumers**: All future AI coding sessions reading `.agents/rules/` — takes effect immediately on next session
- **Performance**: none
- **Variant bleed risk**: none — no TypeScript changes
- **New env vars needed**: `DATABASE_URL`, `HF_API_TOKEN` (documented in rules now; provisioned in V2-001)

---

## Files To Open Before Starting

```
.agents/rules/sachnetra-context.md           — read first, append V2 section
.agents/rules/sachnetra-patterns.md         — read first, append Railway cron section
.agents/rules/sachnetra-boundaries.md       — read first, update Section 1 + 3
.agents/rules/india-variant.md              — read first, append env vars
ai_docs/sachnetra v2/V2_roadmap.md          — source of truth (READ ONLY)
scripts/seed-insights.mjs                   — runSeed() usage reference (READ ONLY, NEVER WRITE)
scripts/_seed-utils.mjs                     — runSeed() implementation reference (READ ONLY)
```

---

## Pattern To Follow

`runSeed()` shape from `scripts/seed-insights.mjs` (line 326):

```javascript
// Every seed script follows this exact shape:
import { loadEnvFile, getRedisCredentials, runSeed } from './_seed-utils.mjs';
loadEnvFile(import.meta.url);

const CANONICAL_KEY = 'news:signals:v1:india';   // Redis status key
const CACHE_TTL = 1800;                            // 30 min TTL

async function fetchSignals() {
  // 1. Read news:digest:v1:india:en from Redis (getRedisCredentials())
  // 2. Filter is_market_moving via keyword match
  // 3. scoreWithFinBERT() → HuggingFace API
  // 4. extractCompanies() + detectSectors()
  // 5. INSERT to PostgreSQL (ON CONFLICT DO NOTHING)
  // 6. Return summary object (written to Redis status key by runSeed)
}

function validate(data) {
  return Array.isArray(data?.signals) && data.signals.length >= 0;
}

runSeed('india', 'signals', CANONICAL_KEY, fetchSignals, {
  validateFn: validate,
  ttlSeconds: CACHE_TTL,
  sourceVersion: 'finbert-v1',
}).catch((err) => {
  console.error('FATAL:', err.message || err);
  process.exit(0);   // Always exit 0 for Railway cron health
});
```

Key properties of every seed script:
- `loadEnvFile(import.meta.url)` at the very top
- `runSeed()` handles locking, retry, Redis publish, freshness metadata
- `fetchFn` is where all business logic lives (read → process → persist)
- `.catch(() => process.exit(0))` — Railway cron must not crash non-zero

---

## Implementation

### Phase 1 — Update `.agents/rules/` (4 files)
**Goal**: Bring all 4 rule files up to V2 reality so every future session starts with correct scope

- [ ] **Step 1.1** — Append V2 mission to `.agents/rules/sachnetra-context.md`
  - Add section: `## V2 Mission`
  - Include quant pivot thesis and "collection engine" sentence

- [ ] **Step 1.2** — Append Railway cron pattern to `.agents/rules/sachnetra-patterns.md`
  - Add section: `## Railway Cron Pattern (V2)`
  - Document `runSeed()` shape, entry point file name, Redis key convention

- [ ] **Step 1.3** — Update `.agents/rules/sachnetra-boundaries.md`
  - Section 1: Add `scripts/seed-insights.mjs` to sacred file list
  - Section 3: Replace "V1 Scope Boundary" with "V2 Scope Guard" matching roadmap

- [ ] **Step 1.4** — Append V2 env vars to `.agents/rules/india-variant.md`
  - Add section: `## V2 Environment Variables`
  - Document `DATABASE_URL` and `HF_API_TOKEN` with Railway context

### Phase 2 — Create `CLAUDE.md`
**Goal**: Give Claude Code persistent project context on every session start

- [ ] **Step 2.1** — Create `CLAUDE.md` at project root
  - Project identity + V2 mission
  - Sacred files (Section 1 from boundaries)
  - V2 architecture (Railway PostgreSQL, FinBERT, Redis hook)
  - Key constraints (fire-and-forget, never block digest)
  - Dev commands allowed vs forbidden

### Phase 3 — Update `ai_docs/SACHNETRA_BUILD_GUIDE.md`
**Goal**: Replace outdated V2 Build Plan so `/task` generates correct task files

- [ ] **Step 3.1** — Replace V2 Build Plan section with new roadmap
  - New task list: V2-000 through V2-010 (matching `V2_roadmap.md`)
  - Remove GoOut Hyderabad (no longer in V2)
  - Remove Convex references (Railway PostgreSQL only)
  - Update V2 Scope Guard to match roadmap

---

## ⚠️ Flag — Existing V2-001 Task File Conflict

`ai_docs/tasks/V2-001_intelligence_pipeline_foundation.md` (already created) describes:
- Architecture A: `server/intelligence-pipeline.ts` + modifying `list-feed-digest.ts`

The new `V2_roadmap.md` requires:
- Architecture B: `scripts/seed-india-signals.mjs` as standalone Railway cron reading Redis

**Lijo confirmed Option B.** The existing V2-001 task file must be **replaced** when generating the V2-001 task file. Do NOT execute V2-001 until its task file is regenerated from the roadmap.

---

## Read vs Write

**READ only (never write):**
- `scripts/seed-insights.mjs` — sacred, pattern reference only
- `scripts/_seed-utils.mjs` — pattern reference only
- `ai_docs/sachnetra v2/V2_roadmap.md` — source of truth
- All `src/config/variants/` files

**WRITE to these files only:**
- `.agents/rules/sachnetra-context.md`
- `.agents/rules/sachnetra-patterns.md`
- `.agents/rules/sachnetra-boundaries.md`
- `.agents/rules/india-variant.md`
- `CLAUDE.md` (CREATE NEW)
- `ai_docs/SACHNETRA_BUILD_GUIDE.md`

---

## Verify

```bash
git diff scripts/seed-insights.mjs      # Must show: no changes
git diff scripts/_seed-utils.mjs        # Must show: no changes
git diff src/config/variants/           # Must show: no changes
```

No `npm run typecheck` needed — zero TypeScript changes in this task.

---

## Completion Log

- [x] Phase 1 complete — 2026-05-06 16:09
- [x] Phase 2 complete — 2026-05-06 16:09
- [x] Phase 3 complete — 2026-05-06 16:09
- [x] Sacred files verified unchanged — 2026-05-06 16:09 (`git diff scripts/seed-insights.mjs src/config/variants/` = clean)

### Note — CLAUDE.md is gitignored
`CLAUDE.md` is listed in `.gitignore`. The file was created and Claude Code reads it locally.
James will need to create his own copy, or the team should decide to remove `CLAUDE.md` from `.gitignore`
to share it via git. The `.agents/rules/` files ARE tracked in git and shared normally.

- [x] **TASK V2-000 COMPLETE** ✅
