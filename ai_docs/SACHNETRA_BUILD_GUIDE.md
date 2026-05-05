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

V1 shipped the core product. V2 is about growth, monetisation, and depth.

### V2 Feature Priority (in build order)

```
V2-001  Landing Page
        → Marketing page at sachnetra.com/
        → App moves to sachnetra.com/app
        → Hyderabad/India positioning, event discovery angle
        → Template: ai_docs/dev_templates/generate_landing_page.md

V2-002  GoOut Hyd Integration — Pearl String UI
        → Event-forward positioning for Hyderabad
        → Pearl String horizontal scroll event cards
        → "What's On" tab in the bottom nav

V2-003  RSSHub on Railway
        → PIB, MEA, MHA, NDMA press releases as RSS
        → Docker container on Railway, connectors to server digest
        → No scraping — only official feeds

V2-004  Related Stories on Story Detail
        → Similarity by keyword overlap (no ML needed in V2)
        → 2–3 related headlines below What This Means

V2-005  Mini Map on Story Detail
        → Show the state/city where the story is happening
        → Reuse existing MapLibre instance (no second map)

V2-006  WhatsApp Brief Delivery
        → Automated 7am brief via WhatsApp Business API
        → Opt-in via phone number (no account required)
        → Infrastructure: Convex scheduled function + Twilio/WABA

V2-007  Hindi Language Support
        → Add hi.json locale file
        → UI labels in Hindi, headlines remain in English
        → Toggle in settings

V2-008  "New Stories" Pill on Timeline
        → Green "N new" pill when background refresh finds new clusters
        → Track seen story IDs in sessionStorage

V2-009  State Liveability Score
        → 4 components: Safety · Governance · Infrastructure · Economy
        → Data: NCRB annual, Cloudflare outages, startup signals
        → Architect (James) must define weights before building
        → NO single reductive number — 4 bars per state

V2-010  Tender & Scheme Alerts (paid feature)
        → GeM tenders filtered by sector/state
        → Government scheme tracking for researchers
        → ₹199–499/month subscription
        → Requires: GeM API + MyScheme API + notification system
        → Convex for data storage, Stripe for billing
```

### V2 Scope Guard

Stop and tell James if any task pulls toward these:

```
❌ LAC/LOC or LWE map layers (legal review required first)
❌ Communal incident tracker (human review pipeline required)
❌ Firecrawl scraping (V3 only)
❌ Knowledge graph / Graphiti (V3 only)
❌ Indian military bases on map
❌ Modifying src/config/variants/full.ts, tech.ts, or finance.ts
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
