# SachNetra — Boundaries & Scope Guard

---

## ⛔ SECTION 1 — SACRED (Permanent. Cannot be changed by anyone, ever.)

These files can **NEVER** be written to under any circumstances:

```
src/config/variants/full.ts        ← live worldmonitor.app variant — DO NOT TOUCH
src/config/variants/tech.ts        ← live tech.worldmonitor.app variant — DO NOT TOUCH
src/config/variants/finance.ts     ← live finance.worldmonitor.app variant — DO NOT TOUCH
scripts/seed-insights.mjs          ← live news insights cron — DO NOT TOUCH for V2 work
```

If any task ever seems to require modifying these files — **STOP immediately** and tell James.  
Something is wrong with the task, not these rules.

---

## 📖 SECTION 2 — Read for Reference, Never Write

Study these for patterns, never modify:

- Any existing panel TypeScript files not explicitly listed in the current task
- `server/gateway.ts` — core domain gateway, do not touch
- `scripts/ais-relay.cjs` — Railway relay (exception: adding to domain allowlist only)
- Any existing `.proto` files — the proto system is locked
- `src/config/feeds.ts` — global feed config, read only (india feeds go in `india.ts`)

---

## 🚫 SECTION 3 — V2 Scope Guard

Stop and tell Lijo + James if any task pulls toward these:

```
❌ Graph database, knowledge graph (V3)
❌ IndiaSignal B2B API product (V3 — build data first, productise later)
❌ LAC/LOC or LWE map layers (legal review required first)
❌ Indian military bases on map
❌ Communal incident tracker (human review pipeline required)
❌ Firecrawl scraping  (plain `fetch()` + JSON/HTML parse of PUBLIC
   exchange/aggregator endpoints for the V2 data layer is IN scope —
   e.g. V2-017 Moneycontrol/NSE/BSE. Firecrawl specifically is not.)
❌ Election monitor
❌ Internet shutdown tracker
❌ GoOut Hyderabad (removed from V2)
❌ Convex (not in V2 — Railway PostgreSQL only)
❌ User accounts / authentication (V3)
❌ Desktop (Tauri) variant (V3)
❌ Modifying src/config/variants/full.ts, tech.ts, or finance.ts (sacred, always)
❌ Modifying scripts/seed-insights.mjs for V2 intelligence work (sacred)
```

**In scope for V2:**
```
✅ V2-000 — Bootstrap & rules update
✅ V2-001 — Railway PostgreSQL + seed-india-signals.mjs cron
✅ V2-002 — Enrich Groq summary with intelligence fields
✅ V2-003 — Related stories (Jaccard keyword overlap, no ML)
✅ V2-004 — Feedback buttons (👍👎 → PostgreSQL article_feedback)
✅ V2-005 — RSSHub on Railway (PIB, MEA, MHA, NDMA)
✅ V2-006 — New stories pill (sessionStorage diff, no backend)
✅ V2-007 — Hindi language (i18next locale file)
✅ V2-008 — WhatsApp daily brief (Twilio + Railway cron at 7am IST)
✅ V2-009 — State liveability score (BLOCKED pending architect gate)
✅ V2-010 — Landing page (BLOCKED pending 30 days usage data)
```

**V2-011 → V2-029 — quant data layer (source of truth: the roadmap, NOT this file):**
```
✅ Defined in ai_docs/sachnetra v2/wiki/syntheses/sachnetra_quant_roadmap.md
   (approved 2026-05-15). V2-012/013/014 SHIPPED. CLAUDE.md V2 Task
   Status block is the live dashboard; this rule file is not re-listed
   per-task. A task is in scope if the roadmap lists it and it has a
   task file in ai_docs/tasks/. Numbers are never reused.
```

---

> **Note**: Rules in Section 2 and 3 can be updated with Lijo + James's explicit permission if codebase reality differs.
> **Section 1 is permanent and cannot be changed by anyone.**
