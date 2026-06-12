# SachManas Phase-2 deliverables (for James)

Concrete build artifacts for the reading spine. Spec: [`../SachManas-P2_reading-spine.md`](../SachManas-P2_reading-spine.md).
These get **lifted into the SachManas repo** (separate app, own Postgres) — they live here as the handoff, not as SachNetra code.

| File | What | Who owns |
|------|------|----------|
| [`c9_schema.sql`](./c9_schema.sql) | DDL for `articles` + `run_log` on SachManas's OWN db. **Lijo runs it** (prod-execution boundary). | Claude drafted · Lijo runs |
| [`c2_router_prompt.md`](./c2_router_prompt.md) | The router system prompt, the 12-cat→route map, keyword pre-filter, strict-JSON contract, real few-shot. | Claude |
| [`c1_fetch.mjs`](./c1_fetch.mjs) | Drop-in fetch module (JSON-LD primary, readability + url_context stubs). Lifted from the proven P1c probe. | Claude drafted · James wires the two TODO stubs |

**Build order for James:** stand up the SachManas repo + own Railway Postgres → run `c9_schema.sql` (via Lijo)
→ C1 RSS reader (keep `description`) using `c1_fetch.mjs` for bodies → C2 router (keyword→Groq) writing
`articles` + `run_log` → freshness alarm + cost breaker.

**Two open TODOs in `c1_fetch.mjs`:** `extractReadability` (wire `@mozilla/readability` + `linkedom`) and
`fetchViaUrlContext` (gate hard — 20/day free-tier wall). Both are fallbacks; the JSON-LD primary already
covers 4/5 load-bearing sources, so neither blocks a first run.

**Gate before Phase 3:** 1 week live · ≥95% categorized · `route_label` precision ≥90% on a 100-article
two-grader audit · cost ≈ $0.
