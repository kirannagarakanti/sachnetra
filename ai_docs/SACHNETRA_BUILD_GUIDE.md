# SachNetra — Build Guide

**Project:** India's real-time news intelligence dashboard
**Stack:** TypeScript · Vite · Preact · Vercel Edge Functions · Convex · Railway
**Live:** sachnetra.com
**Base codebase:** WorldMonitor (open source, AGPL v3)

---

## What SachNetra Is

SachNetra is an India-focused fork of WorldMonitor — a real-time global intelligence dashboard. Where WorldMonitor covers geopolitics, military, and finance globally, SachNetra focuses on Indian news: politics, economy, state-level events, disaster, and government — delivered with AI-synthesized summaries in a clean mobile-first interface.

**V1 is live and complete.** 28 tasks shipped:
64 Indian RSS feeds · AI two-summary format · State filtering (36 states + UTs) ·
Timeline river · India map with official J&K/Ladakh boundary · Branded share cards ·
URL routing · Desktop two-column layout · Vercel deployment

---

## How This Project Works

SachNetra uses the **Adapt Sprint** methodology: structured tasks, each with a clear goal, a list of files to touch, a pattern to follow, verification steps, and a completion log.

```
Three phases:

Phase 1: UNDERSTAND (done for V1)
  Deep-read WorldMonitor codebase
  Made all product decisions
  Created prep documents (ai_docs/prep/)

Phase 2: BOOTSTRAP (Task 000 — done)
  AI reads prep docs + codebase
  Generates workspace rules (.agents/rules/)
  Updates CLAUDE.md

Phase 3: EXECUTE (Tasks 001–018.5 — V1 complete)
  Each task = one focused unit of work
  Verification required before next task starts
  Tasks never combined
```

---

## V2 Build Plan

V1 shipped the core product. V2 is the data collection layer — every digest run permanently records
market signals to Railway PostgreSQL, independent of user activity.

**The sentence:** SachNetra is the collection engine. The database is the asset. The quant system is the proof of value.

**Source of truth**: `ai_docs/sachnetra v2/V2_roadmap.md`

### V2 Task List (dependency order)

```
V2-000  Bootstrap & Rules Update
        → Update .agents/rules/ and CLAUDE.md before any V2 code runs
        → No code changes — documentation only

V2-001  Railway Setup + Data Foundation
        → Railway PostgreSQL + india_news_signals table
        → scripts/seed-india-signals.mjs — new Railway cron (reads Redis, writes PostgreSQL)
        → Runs every 10 min, independent of user activity
        → HuggingFace FinBERT for sentiment scoring

V2-002  Enrich Summary with Intelligence Signals
        → Groq prompt returns 4 new fields: sentiment, score, companies, event_type
        → Fire-and-forget PostgreSQL UPDATE on user click (never delays summary)
        → Depends on: V2-001

V2-003  Related Stories on Story Detail
        → 2–3 related headlines via Jaccard keyword overlap (no ML)
        → Pure client-side, uses already-loaded digest items
        → Depends on: V2-000

V2-004  Feedback Buttons (👍👎)
        → Thumbs up/down on story cards → PostgreSQL article_feedback table
        → localStorage prevents re-voting; no auth required
        → Depends on: V2-001

V2-005  RSSHub on Railway (Government Sources)
        → PIB, MEA, MHA, NDMA press releases as RSS
        → RSSHub Docker on Railway (same project as PostgreSQL)
        → Depends on: V2-001

V2-006  New Stories Pill on Timeline
        → Green "N new stories" pill when background refresh finds new clusters
        → sessionStorage diff, no backend needed
        → Depends on: V2-000

V2-007  Hindi Language Support
        → i18next locale file (hi.json) — UI labels only, headlines stay English
        → Toggle in settings, persisted to localStorage
        → Depends on: V2-000

V2-008  WhatsApp Daily Brief
        → Automated 7am IST digest via Twilio WhatsApp API
        → Opt-in by phone number (no account required)
        → Railway cron + PostgreSQL whatsapp_subscribers table
        → Depends on: V2-001

V2-009  State Liveability Score
        → 4-bar score: Safety · Governance · Infrastructure · Economy
        → BLOCKED — Daniel must define data sources + weights before task file is generated

V2-010  Landing Page
        → Plain HTML/CSS/JS at sachnetra.in/; app moves to /app
        → BLOCKED — build only after 30 days of real V2 usage numbers
```

### V2 Architecture Decisions (locked)

| Decision | Answer |
|----------|--------|
| Database | Railway PostgreSQL (not Convex) |
| Intelligence entry point | `scripts/seed-india-signals.mjs` (Railway cron) |
| Hook point | Reads `news:digest:v1:india:en` from Upstash Redis |
| Sentiment model | HuggingFace FinBERT (`HF_API_TOKEN`) — free tier first |
| Summaries | On-demand per user click, Redis-cached after first hit |
| GoOut Hyderabad | Removed from V2 |
| Landing page | Last — after 30 days of real usage numbers |
| Convex | Not in V2 — Railway PostgreSQL only |

### V2 Scope Guard

Stop and tell James + Daniel if any task pulls toward these:

```
❌ Graph database, knowledge graph (V3)
❌ IndiaSignal B2B API product (V3 — build data first, productise later)
❌ LAC/LOC or LWE map layers (legal review required first)
❌ Indian military bases on map
❌ Communal incident tracker (human review pipeline required)
❌ Firecrawl scraping
❌ Election monitor
❌ GoOut Hyderabad (removed from V2)
❌ Convex (not in V2 — Railway PostgreSQL only)
❌ Modifying src/config/variants/full.ts, tech.ts, or finance.ts (sacred, always)
❌ Modifying scripts/seed-insights.mjs for V2 intelligence work (sacred)
```

---

## Repository Map (Key Files for V2)

```
sachnetra/
├── src/
│   ├── config/
│   │   ├── variants/india.ts          ← SACHNETRA VARIANT (primary file)
│   │   ├── feeds.ts                   ← Feed routing (imports from india.ts)
│   │   ├── panels.ts                  ← Panel routing (INDIA_PANELS defined here)
│   │   ├── map-layer-definitions.ts   ← Map layer registry
│   │   └── geo.ts                     ← India map views
│   ├── services/
│   │   └── sachnetra-share-card.ts    ← Branded Canvas share card
│   └── components/
│       └── StateSelector.ts           ← State filter UI
│
├── api/
│   ├── _cors.js                       ← CORS allowlist (add new domains here)
│   ├── _api-key.js                    ← Trusted origins
│   ├── groq-summarize.js              ← AI summary (What Happened + What This Means)
│   └── openrouter-summarize.js        ← Fallback AI summary
│
├── server/
│   └── worldmonitor/news/v1/
│       ├── list-feed-digest.ts        ← India added to VALID_VARIANTS
│       └── _feeds.ts                  ← India server-side feed list
│
├── shared/
│   └── rss-allowed-domains.json       ← Source of truth for RSS allowlist
│
├── public/
│   ├── sachnetra-logo.svg             ← Diya + eye mark logo
│   └── data/india-states.geojson     ← Official India boundary (J&K/Ladakh)
│
├── .agents/rules/                     ← AI workspace rules (read before every session)
│   ├── sachnetra-context.md
│   ├── sachnetra-boundaries.md
│   ├── sachnetra-patterns.md
│   └── india-variant.md
│
├── ai_docs/                           ← This folder — the shipkit
│   ├── SACHNETRA_BUILD_GUIDE.md       ← YOU ARE HERE
│   ├── prep/                          ← Product decisions (01–08)
│   ├── prep_templates/                ← How to generate prep docs for new projects
│   ├── dev_templates/                 ← Reusable AI coding templates
│   ├── tasks/                         ← V1 task files (history) + V2 task files
│   └── ui-docs-reference/             ← HTML mockups, brand exploration, images
│
├── .claude/
│   ├── settings.json                  ← Claude Code permissions
│   └── commands/                      ← Slash commands (mirror of dev_templates)
│
├── AGENTS.md                          ← Agent entry point (read first)
├── CLAUDE.md                          ← Claude Code context
└── ARCHITECTURE.md                    ← Technical architecture reference
```

---

## How to Run a V2 Task

### Step 1 — Read the workspace rules
```
.agents/rules/sachnetra-context.md
.agents/rules/sachnetra-boundaries.md
.agents/rules/sachnetra-patterns.md
.agents/rules/india-variant.md
```

### Step 2 — Generate the task file
Use `/task` (Claude Code slash command) or open:
`ai_docs/dev_templates/adapt_sprint_task.md`

### Step 3 — Review and approve (James)
James reviews the task file before any code runs.
Say "proceed" to execute.

### Step 4 — Verify
```bash
npm run typecheck        # Must show: 0 errors
npm run lint             # Biome — must pass
```
Browser verify before marking complete.

---

## V2 Prep Documents To Write

Before starting V2 tasks, fill in these prep docs:

```
ai_docs/prep/09_v2_landing_page.md     ← Page sections, copy, CTA, target audience
ai_docs/prep/10_v2_product_features.md ← Detailed V2 feature specs
ai_docs/prep/11_v2_monetisation.md     ← Pricing, billing, paid features
ai_docs/prep/12_v2_roadmap.md          ← V2 task list (mirrors this guide)
```

Use the templates in `ai_docs/prep_templates/` to generate these.

---

## Coding Standards

```
Language:        TypeScript strict (no implicit any)
Framework:       Preact functional components or Panel class subclasses
Linting:         Biome — run npm run lint after every change
Typechecking:    npm run typecheck — must stay at 0 errors
CSS:             --sn-* variables (never hardcoded hex for brand colors)
Branding:        [data-variant="india"] CSS selectors, never JS class toggling
State:           app-context.ts (selectedState, etc.)
Component model: Panel subclass for new map/data panels
Edge functions:  Plain JS in api/ — no TypeScript, no imports from src/
```

**Forbidden commands:**
```
npm run build   ❌  (James runs this)
npm run dev     ❌  (James runs this)
```

**Allowed:**
```
npm run typecheck   ✅
npm run lint        ✅
git status          ✅
git diff            ✅
```

---

## Sacred Files — Never Write To

```
src/config/variants/full.ts      ← WorldMonitor live variant
src/config/variants/tech.ts      ← WorldMonitor tech variant
src/config/variants/finance.ts   ← WorldMonitor finance variant
src/generated/                   ← Proto-generated stubs (make generate only)
```

If a task seems to require modifying these — stop and tell James.

---

## Brand Reference

```
Primary:     Purple #7b7bff (--sn-purple)
Accent:      Saffron #FF9933 (--sn-saffron)
Background:  Deep dark #0a0812 (--sn-bg)
Logo:        Diya + eye mark SVG (public/sachnetra-logo.svg)
Wordmark:    SachNetra (solid white)
Tagline:     See clearly / सच्चनेत्र
```

---

## Dev Templates (Slash Commands)

All templates are available as Claude Code slash commands via `.claude/commands/`:

| Command | Template | Use when |
|---------|----------|----------|
| `/task` | adapt_sprint_task.md | Starting any new feature task |
| `/bugfix` | bugfix.md | Something is broken |
| `/improve_ui` | improve_ui.md | UI looks generic or needs polish |
| `/diff` | diff.md | After a coding session — summarise changes |
| `/cleanup` | cleanup.md | Removing dead code, fixing lint |
| `/git` | git_workflow_commit.md | Making a commit |
| `/pr` | pr_review.md | Before James reviews a PR |
| `/landing` | generate_landing_page.md | Building a marketing page |
| `/diagram` | generate_diagram.md | Creating architecture diagrams |
| `/bootstrap` | adapt_sprint_bootstrap.md | Setting up a fresh project |

---

## Shipkit Credit

Dev templates adapted from Brandon's ShipKit.
Adapt Sprint methodology by the WorldMonitor team.
SachNetra is built on WorldMonitor (AGPL v3) by Elie Habib.
