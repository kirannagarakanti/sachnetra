agrnt rules# Task — CLAUDE.md Refresh + WorldMonitor Variant Cleanup
*SachNetra · maintenance / repo-hygiene lane*

**Created**: 2026-06-11 (Lijo + Claude, branch `docs/research-system`)
**Status**: Workstream A (docs/rules — CLAUDE.md, AGENTS.md, all 4 `.agents/rules/*.md`, memory) ✅ APPLIED 2026-06-11 · Workstream B (variant code deletion) ⏳ PENDING (needs build+typecheck)
**Estimated time**: Workstream A (docs) ~30 min · Workstream B (code deletion) ~3–5 h (Lijo/James, behind build+typecheck)
**V1 or V2**: cross-cutting (V1 SPA cleanup + V2 doc accuracy)
**Lane note**: Workstream A is doc-only and safe for Claude/Lijo. Workstream B deletes live SPA code,
re-points build defaults, and touches `vite.config.ts` / `package.json` / `src-tauri` / e2e — it needs
`npm run build` + `npm run typecheck`, which **a human (Lijo/James) runs, not Claude**. Do NOT delete variant code without B's
full sweep, or the build breaks (the default variant is currently `full`).

---

## Context Manifest
*Read these BEFORE any work. Skip the "Don't load" list to save tokens.*

### Load (in order)
1. `CLAUDE.md` — the file being refreshed; current state is the "before" for all Workstream A edits
2. `.agents/rules/sachnetra-boundaries.md` — sacred-files / scope guard (also gets updated — see A4)
3. `.agents/rules/sachnetra-context.md` — project identity / mission (mirror the A1 reframe here)
4. **Blast-radius reference (Workstream B):** the file inventory in §B2 below
5. **Code files** — `src/config/variant.ts`, `src/config/variant-meta.ts`, `src/config/index.ts`,
   `vite.config.ts`, `package.json`, `src/config/variants/*.ts`

### Don't load (not relevant — skip)
- `ai_docs/learning/*`, `wiki/*` (research lane — unrelated to this hygiene task)
- All `tasks/00*_*.md` (archived V1)

---

## Why this task exists (decisions captured 2026-06-11)

Lijo's framing: **SachNetra is a news-aggregation platform on the front end, and a collection engine behind
it** — it collects the news *and* all the data the quant system needs. The repo is a WorldMonitor fork that
still carries WorldMonitor's *other* product variants (tech / finance / full / commodity / happy) mapped to
`*.worldmonitor.app` domains. **Only the `india` variant (sachnetra.com) is deployed from this repo**, so the
WorldMonitor variants are dead weight to be removed, and CLAUDE.md no longer reflects reality.

Confirmed decisions:
- **Only `india` is deployed.** The other variants are removable.
- **Delete the WorldMonitor variant code** (scoped as a real refactor — see Workstream B caveats).
- **Park** V2-004 / 005 / 007 / 008 / 009 / 010 **with per-task reasons** (not a blanket label).
- **Promote V2-015** (Corporate Filings) and **link it to Exp21** — it is the home for the
  insider / promoter / pledge collector that the 2026-06-11 miracle note flags as the highest-EV next shot
  (`ai_docs/learning/research-notes/2026-06-11_the-miracle-insider-confirmed-microcap-momentum.md`).

---

## Workstream A — CLAUDE.md (+ rules) refresh  *(doc-only, safe, no build)*

### A1. Reframe the mission / identity
Update the top block and `## V2 Mission` so the dual identity is explicit:

> **SachNetra** — India's news clarity tool. **Front end:** a news-aggregation platform (sachnetra.com,
> the `india` variant). **Behind it:** a collection engine that permanently records India's news *and* the
> market/alt-data the quant system needs to Railway PostgreSQL. The database is the asset; the quant system
> is the proof of value.

Mirror the same one-liner into `.agents/rules/sachnetra-context.md` so the rule and CLAUDE.md agree.

### A2. Update `## Architecture`
The current block is **stale**. Fix:
- It says "scores FinBERT (HuggingFace API)" and "every 10 min" — confirm against `_sentiment-chain.mjs`
  (the chain is FinBERT → Xenova FinBERT → Groq `llama-3.1-8b-instant`) and the real cron cadence, and
  describe it as the *collection engine* writing many tables, not just `india_news_signals`.
- Add the now-live collectors as the engine's outputs (FII/DII, announcements, deals, electricity, FASTag,
  news signals + threads + entity timeline) so a cold session sees the full asset, not just V2-001.
- Drop the WorldMonitor multi-variant framing entirely; the SPA is `india`-only.

### A3. V2 Task Status block — park + promote
Apply exactly these line changes:

```
V2-004  Feedback Buttons          [PARKED — positioning §3.1 (consumer remnant)]
V2-005  RSSHub on Railway         [PARKED — not on the quant critical path]
V2-007  Hindi Language            [PARKED — positioning §3.1 (consumer remnant)]
V2-008  WhatsApp Daily Brief      [PARKED — positioning §3.1 (consumer remnant)]
V2-009  State Liveability Score   [PARKED — architect gate; consumer-facing]
V2-010  Landing Page              [PARKED — positioning §3.1 (consumer remnant)]
```
(Keep the "Numbers are never reused" note. 004/007/008/010 cite positioning §3.1; 005/009 keep their own
reason as shown.)

Promote V2-015:
```
V2-015  Corporate Filings / Insider-Promoter-Pledge  [PRIORITY — alpha kingpin]
        Home of the insider/promoter/pledge collector (SEBI PIT 7(2) + SAST + NSDL system-driven).
        Critical path for Exp21 (insider-confirmed microcap momentum) — see research-note 2026-06-11.
        OCR sub-scope stays a separate postponed app; V2-018 banks the PDFs meanwhile.
```

### A5. Role model — drop the rigid "Lijo authors / James implements" split
Confirmed by Lijo 2026-06-11: **both Lijo and James author task files AND both execute/implement them.**
There is no spec-only handoff. Apply everywhere the old split is encoded:
- `CLAUDE.md:121-122` — `npm run build ❌ # James runs this` → `# run by Lijo/James (not Claude)`;
  keep the ❌ on build/dev (that's the Claude↔human boundary, unchanged).
- `CLAUDE.md` task-status lines — `awaiting James impl` → `awaiting impl (Lijo/James)`.
- `.agents/rules/sachnetra-patterns.md:84` — "Forbidden (James runs these himself)" → "Forbidden for Claude
  (run by Lijo/James)".
- `.agents/rules/sachnetra-boundaries.md:16,35,82` — keep "stop and tell Lijo + James", but drop any
  implication that only James implements.
- Keep the **`Operators`** line (`Lijo + James`) but note both wear both hats.
- **Terminal identity:** when git/terminal author shows **"Daniel," that is Lijo** doing the work
  (authoring *and* executing) — not a separate person. James's terminal identity is unknown; don't map a
  displayed name to a fixed role.
- The Claude↔human safety boundary is unchanged: Claude writes code + read-only checks; a human (Lijo *or*
  James) runs prod-mutating migrations/seeds and `npm run build`.

> **`.agents/rules/` loading note (answer to "is it read in Claude too?"):** Claude Code does NOT auto-load
> `.agents/rules/` — it auto-loads `CLAUDE.md`, which then *points* at the rule files (CLAUDE.md:99-106), so
> they're read on demand, not auto-injected. **Antigravity** reads `.agents/rules/` natively. Therefore
> (a) keep CLAUDE.md's pointer block intact, and (b) every rule edit above must also be reflected in
> CLAUDE.md or the two stores drift (they already had — this task closes that gap).

### A4. Sacred Files section
Once Workstream B removes the WorldMonitor variants, the sacred list shrinks. Target end-state:
```
scripts/seed-insights.mjs   ← Live news insights cron — DO NOT TOUCH for V2 work
```
Remove `full.ts` / `tech.ts` / `finance.ts` from the sacred list. **Sequencing:** keep them sacred in
CLAUDE.md *until* Workstream B actually lands; until then they're "live code, scheduled for removal in
[this task] — don't casually edit." Mirror the change in `.agents/rules/sachnetra-boundaries.md`.

### A6. Full agent-read-file sweep (improvised 2026-06-11) ✅ APPLIED
Beyond CLAUDE.md, swept every file an agent actually reads and fixed staleness consistent with the
india-only / collection-engine / positioning §3.1 / role-model reality:
- **`AGENTS.md`** (auto-loaded by Claude Code) — added a "this repo is deployed as SachNetra (india only),
  read CLAUDE.md first" banner; rewrote the "Variant System" section to india-only + WM variants removed.
- **`.agents/rules/sachnetra-context.md`** — dual-identity in "What It Is"; corrected "india is the only
  deployed variant"; added a positioning §3.1 note to "Who It's For" (consumer features parked, "be your own
  first customer"); rewrote the B2B-IndiaSignal-V3 paragraph; listed all live collectors + tables in "V2
  Entry Points".
- **`.agents/rules/sachnetra-patterns.md`** — replaced the "model india.ts after tech.ts/full.ts" pattern
  (those are being deleted; india.ts is built) with india-as-the-built-variant; "Forbidden (James runs)" →
  "Forbidden for Claude (Lijo/James)"; fixed the runSeed sentiment comment to the real 3-level chain.
- **`.agents/rules/sachnetra-boundaries.md`** — Section 1 variants → "scheduled for removal" (not sacred);
  "tell James" → "tell Lijo + James"; Section 3 IndiaSignal B2B → PARKED per positioning §3.1; variant
  "sacred always" line → "being deleted, not sacred-forever"; marked V2-004/005/007/008/009/010 PARKED.
- **`.agents/rules/india-variant.md`** — added `GROQ_API_KEY` env row; replaced the stale single-endpoint
  FinBERT block with the real `_sentiment-chain.mjs` 3-level chain (correct `router.huggingface.co` URL +
  Xenova local + Groq) and the G6 uncalibrated warning.

> **Why folded into this task:** these are the same agent-read surface CLAUDE.md governs, and they'd drifted
> from reality on exactly the four themes this task fixes. Editing them is doc-only and safe (no build).

---

## Workstream B — Delete the WorldMonitor variants  *(Lijo/James; build + typecheck required)*

### B1. Is it safe to delete? — yes functionally, but it's a wide refactor, not a file delete
Only `india` is served (sachnetra.com). Functionally the other variants are dead. **But** the default
variant is `full` in two places, so you cannot simply `rm` the files:
- `src/config/variant.ts:3` → `import.meta.env?.VITE_VARIANT || 'full'`
- `vite.config.ts:49` → `process.env.VITE_VARIANT || 'full'`

**First step of B is to re-point both defaults to `india`** (and simplify the hostname switch in
`variant.ts` to india + a minimal fallback), then remove the rest. Do it on a dedicated branch.

### B2. Blast radius (everything that references the WM variants — verified 2026-06-11)
- **Variant configs:** `src/config/variants/{tech,finance,full,commodity,happy}.ts` (keep `base.ts`, `india.ts`)
- **Variant data modules** pulled in only by WM variants via `src/config/index.ts`: geo intel exports
  (INTEL_HOTSPOTS, CONFLICT_ZONES, MILITARY_BASES, NUCLEAR_FACILITIES, APT_GROUPS, …), `tech-companies.ts`,
  `ai-research-labs.ts`, `startup-ecosystems.ts`, `ai-regulations.ts`, `tech-geo.ts`, `finance-geo.ts`,
  `gulf-fdi.ts`, `commodity-markets.ts`, `commodity-geo.ts`, `irradiators.ts`, `pipelines.ts`, `ports.ts`,
  `airports.ts`, `entities.ts` — audit each for india usage before deleting (some shared exports may be
  consumed by the india map/panels).
- **Selection logic:** `src/config/variant.ts`, `src/config/variant-meta.ts`
- **Build / tooling:** `vite.config.ts` (htmlVariantPlugin, favicon swap, RSS proxy targets, default),
  `package.json` (`dev:tech|finance|happy|commodity`, `build:full|tech|finance|happy|commodity`,
  `test:e2e:*`, `desktop:build:*`, `desktop:package:*`)
- **Desktop:** `src-tauri/tauri.tech.conf.json`, `src-tauri/tauri.finance.conf.json` (+ any others)
- **Components that branch on `SITE_VARIANT`:** `src/App.ts`, `src/components/DeckGLMap.ts`,
  `src/components/NewsPanel.ts`, `src/app/data-loader.ts`, `src/services/summarization.ts`
- **Assets:** `public/favico/{tech,finance,…}/` subdirs
- **Tests:** e2e specs + golden screenshots for the WM variants

### B3. Execution checklist (Lijo/James)
- [ ] Branch off; re-point both defaults `full → india` (B1).
- [ ] Remove WM variant `.ts` files + their now-orphaned data modules (only after confirming no india import).
- [ ] Strip WM scripts from `package.json` and WM blocks from `vite.config.ts`.
- [ ] Remove WM `src-tauri` configs + e2e specs/snapshots + favicon dirs.
- [ ] `npm run typecheck` → 0 errors; `npm run build` (india) green; `npm run lint` passes.
- [ ] Smoke sachnetra.com locally (india renders, map/panels intact).
- [ ] THEN Lijo/Claude lands Workstream A4 (shrink the sacred list).

### B4. Pre-mortem
- Some "WM-only" geo/entity exports may actually feed the india map → deleting them breaks india. **Audit
  each export's india usage before removing; when unsure, keep the data module and only remove the variant.**
- The AGPL fork lineage is unaffected (we're trimming our own deployment, not relicensing).
- Desktop/Tauri build matrices reference WM variants — if desktop builds aren't used for SachNetra, note that
  explicitly and remove; otherwise keep india-only desktop config.

---

## Acceptance
- [x] CLAUDE.md reflects the dual identity (news platform + collection engine), accurate architecture, parked
      tasks with reasons, promoted V2-015 linked to Exp21, and the variants flagged-for-removal in sacred. ✅
- [x] All agent-read files agree with CLAUDE.md — `AGENTS.md` + all four `.agents/rules/*.md`
      (`sachnetra-context`, `sachnetra-patterns`, `sachnetra-boundaries`, `india-variant`): role model +
      dual identity + variant-removal + positioning §3.1 + real sentiment chain. ✅ (see A6)
- [ ] WorldMonitor variant code removed; india-only build green (typecheck + build + lint).
- [ ] No dead `VITE_VARIANT` branches for tech/finance/full/commodity/happy remain.

## Open questions for Lijo
1. Are the **desktop/Tauri** builds used for SachNetra at all? If not, B can drop the whole desktop matrix.
2. Keep `base.ts` as-is (shared), or fold its few exports into the india config too?
