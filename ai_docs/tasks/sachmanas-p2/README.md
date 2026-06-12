# SachManas Phase-2 deliverables (for James)

Concrete build artifacts for the reading spine. Spec: [`../SachManas-P2_reading-spine.md`](../SachManas-P2_reading-spine.md).
These get **lifted into the SachManas repo** (separate app, own Postgres) — they live here as the handoff, not as SachNetra code.

| File | What | Who owns |
|------|------|----------|
| [`c9_schema.sql`](./c9_schema.sql) | DDL for `articles` + `run_log` on SachManas's OWN db. **Lijo runs it** (prod-execution boundary). | Claude drafted · Lijo runs |
| [`c2_router_prompt.md`](./c2_router_prompt.md) | The router system prompt, the 12-cat→route map, keyword pre-filter, strict-JSON contract, real few-shot. | Claude |
| [`c1_fetch.mjs`](./c1_fetch.mjs) | Drop-in fetch module (JSON-LD primary, readability + url_context stubs). Lifted from the proven P1c probe. | Claude drafted · James wires the two TODO stubs |
| [`check-sachmanas-phase2.mjs`](./check-sachmanas-phase2.mjs) | One-shot **gate check** — prints week-live, %categorized, route mix, freshness. Read-only. | Claude · Lijo runs at test time |
| [`pull-router-audit-sample.mjs`](./pull-router-audit-sample.mjs) | Pulls the **100-article router-precision sample** to a CSV for the two-grader audit (gate item 3). Read-only. | Claude · Lijo runs at test time |

**Both gate scripts need `SACHMANAS_DATABASE_URL`** (the Mind's OWN db — never the SachNetra `DATABASE_URL`) in
`.env.local`, and only run once the spine has written rows. Cost (gate #4) is a glance at **console.groq.com**,
not in either script. Don't use the Railway data console for these — it lies "0 rows" on multi-row SELECTs;
the scripts use `COUNT`/pg directly.

**Build order for James:** stand up the SachManas repo + own Railway Postgres → run `c9_schema.sql` (via Lijo)
→ C1 RSS reader (keep `description`) using `c1_fetch.mjs` for bodies → C2 router (keyword→Groq) writing
`articles` + `run_log` → freshness alarm + cost breaker.

**Two open TODOs in `c1_fetch.mjs`:** `extractReadability` (wire `@mozilla/readability` + `linkedom`) and
`fetchViaUrlContext` (gate hard — 20/day free-tier wall). Both are fallbacks; the JSON-LD primary already
covers 4/5 load-bearing sources, so neither blocks a first run.

**Gate before Phase 3:** 1 week live · ≥95% categorized · `route_label` precision ≥90% on a 100-article
two-grader audit · cost ≈ $0.
