# SachNetra — Claude Code Context

**Project**: SachNetra — India's news clarity tool ("See clearly" | सच्चनेत्र)
**Stack**: TypeScript · Vite · Preact · Vercel Edge Functions · Railway PostgreSQL · Upstash Redis
**Live**: sachnetra.com
**Base**: WorldMonitor fork (AGPL v3)
**Operators**: Lijo (founder/product) + James (engineering partner)

---

## Starting Any Task

Open the task file in `ai_docs/tasks/`. If it has a **Context Manifest** section, load every doc in its "Load" list before touching code, and skip everything in its "Don't load" list. Tasks without a manifest yet (older V1 tasks `00*_*.md`) are archived — for new and active V2 tasks, the manifest is the source of truth for what context to load.

**Slash commands** (`/bugfix`, `/task`, `/git`, `/update-template`, etc.) are backed by files in `ai_docs/dev_templates/`. See `ai_docs/dev_templates/README.md` for the mapping and source-of-truth rules.

---

## V2 Mission

SachNetra is the collection engine. The database is the asset. The quant system is the proof of value.

V1 shipped the news aggregator (complete). V2 adds a background intelligence pipeline — every digest
run permanently records India market signals to Railway PostgreSQL, independent of user activity.

---

## Sacred Files — NEVER Write To

```
src/config/variants/full.ts      ← WorldMonitor live variant — DO NOT TOUCH
src/config/variants/tech.ts      ← WorldMonitor tech variant — DO NOT TOUCH
src/config/variants/finance.ts   ← WorldMonitor finance variant — DO NOT TOUCH
scripts/seed-insights.mjs        ← Live news insights cron — DO NOT TOUCH for V2 work
```

If a task seems to require touching these — stop immediately and tell Lijo + James.
Something is wrong with the task, not these rules.

---

## Architecture

```
User request
  → Vercel Edge Functions (api/)
  → server/ RPC handlers
  → Upstash Redis cache (news:digest:v1:india:en)
  → Client SPA (Preact, src/config/variants/india.ts)

Railway cron (every 10 min, independent of users)
  → scripts/seed-india-signals.mjs          [V2-001 NEW]
  → reads news:digest:v1:india:en from Redis
  → scores FinBERT (HuggingFace API)
  → writes india_news_signals (Railway PostgreSQL)
```

**Key files:**
- SachNetra variant config: `src/config/variants/india.ts`
- Server-side feeds: `server/worldmonitor/news/v1/_feeds.ts`
- V2 intelligence entry point: `scripts/seed-india-signals.mjs` ✅ live
- V2 keyword/entity registry: `shared/market-taxonomy.json` ✅ live
- V2 extraction helpers: `scripts/_india-market-keywords.mjs` ✅ live
- V2 sentiment fallback chain: `scripts/_sentiment-chain.mjs` ✅ live
- V2 DDL runner: `scripts/migrate-india-signals.mjs` ✅ live
- V2 database: Railway PostgreSQL — `india_news_signals` table ✅ provisioned

---

## Key Constraints

- Intelligence pipeline is **fire-and-forget** — must never delay digest response to users
- `seed-india-signals.mjs` reads Redis; it does NOT modify `list-feed-digest.ts`
- Railway cron runs every 10 minutes, independent of user activity
- Three-file RSS allowlist: `shared/rss-allowed-domains.json` is source of truth;
  `api/_rss-allowed-domains.js` is the ESM copy — always update both, never edit `rss-proxy.js`
- Vercel Edge Functions (`api/*.js`) are plain JS only — no TypeScript, no imports from `src/`
- **`server/` handlers also run in edge runtime** (`api/news/v1/[rpc].ts` sets `runtime: 'edge'`):
  `pg` (Node.js) is unavailable in `summarize-article.ts` — use Upstash REST HTTP for side effects
- CSS branding: `--sn-*` variables only, never hardcoded hex; selectors via `[data-variant="india"]`

---

## Agent Rules (Read Before Every Coding Task)

```
.agents/rules/sachnetra-context.md      — project identity, V2 mission
.agents/rules/sachnetra-patterns.md    — runSeed() shape, Railway cron, CSS variables
.agents/rules/sachnetra-boundaries.md  — sacred files, V2 scope guard
.agents/rules/india-variant.md         — brand colors, map config, AI format, V2 env vars
```

---

## Allowed Commands

```bash
npm run typecheck   ✅   # Must stay at 0 errors after every change
npm run lint        ✅   # Biome — must pass
git status          ✅
git diff            ✅
node scripts/seed-india-signals.mjs   ✅  (V2-001 and later)
```

```bash
npm run build   ❌   # James runs this
npm run dev     ❌   # Lijo/James run this
```

---

## V2 Task Status

Full roadmap: `ai_docs/sachnetra v2/V2_roadmap.md`
Task files: `ai_docs/tasks/`

```
V2-000  Bootstrap & Rules Update          [COMPLETE ✅ — 2026-05-06]
V2-001  Railway Setup + Data Foundation   [COMPLETE ✅ — 2026-05-07]
V2-002  Enrich Summary with Intelligence  [COMPLETE ✅ — 2026-05-09]
V2-003  Related Stories                   [COMPLETE ✅ — 2026-05-09]
V2-004  Feedback Buttons                  [ ] not started
V2-005  RSSHub on Railway                 [ ] not started
V2-006  New Stories Pill                  [COMPLETE ✅ — 2026-05-09]
V2-007  Hindi Language                    [ ] not started
V2-008  WhatsApp Daily Brief              [ ] not started
V2-009  State Liveability Score           [BLOCKED — architect gate]
V2-010  Landing Page                      [BLOCKED — needs 30 days usage data]
V2-011  Headline Storage + Sentiment      [COMPLETE ✅ — 2026-05-15]
V2-012  Autonomous Pipeline               [COMPLETE ✅ — 2026-05-16]
V2-013  Story Threads                     [COMPLETE ✅ — 2026-05-18]
V2-014  Entity Timeline                   [COMPLETE ✅ — 2026-05-18]
V2-015  Corporate Filings (OCR)          [REFRAMED — separate postponed OCR app; V2-018 banks the PDFs meanwhile]
V2-017  FII/DII Daily Flows               [CODE COMPLETE ✅ — 2026-05-19 · awaiting Lijo prod run]
V2-017b Deep FII History (NSDL FPI)       [COMPLETE ✅ — 2026-05-21 · 3,964 rows · Dec 2009–May 2026]
V2-018  NSE Bourse Announcements          [CODE COMPLETE ✅ — 2026-05-22 · awaiting Lijo prod run]
V2-019  RBI Weekly Statistical Supplement [TASK FILED ✅ — 2026-05-22 · awaiting James impl]
V2-020  BIS India Macro (SDMX)            [TASK FILED ✅ — 2026-05-22 · awaiting James impl]
V2-024  NSE Options Chain + OI (EOD)      [TASK FILED ✅ — 2026-05-22 · awaiting James impl]
```

Roadmap V2-015–V2-029 (Tier 2+ alpha sources) live in
`ai_docs/sachnetra v2/wiki/syntheses/sachnetra_quant_roadmap.md`. They are
added to this block only as each one is task-filed (reality, not aspiration).
Numbers are never reused — V2-009/010 stay blocked in place.
