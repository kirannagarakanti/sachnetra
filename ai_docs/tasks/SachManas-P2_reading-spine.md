# Task SachManas-P2 — The Reading Spine (C1 + C2 + C9)

*The Mind (SachManas) — Phase 2 of the build blueprint. The first code phase; everything before it was probes.*

**App**: SachManas — a **separate application** with its **own Postgres**. It READS SachNetra's DB read-only and **writes ONLY its own tables**. It NEVER touches `seed-india-signals.mjs`, the news pipeline, the Redis digest, or any SachNetra table. (Disk-incident memory: a shared-DB write once took the asset offline.)
**Depends on**: Phase-1 probes (all ✅ — see Context Manifest). Phase 0 (alarms + volume count) done.
**Gate before Phase 3**: 1 week live · ≥95% of articles categorized · router precision ≥90% on a 100-article hand-check · cost ≈ $0 (Groq free tier).
**Lane**: James builds (C1/C2/C9 + ops, his collector idiom). Claude supplies the schema, the router prompt, the fetch module, and this spec. **Lijo runs anything against a database** (standing prod-execution boundary) and does the 100-article router audit.
**Estimated time**: ~1–2 weeks.

---

## Context Manifest
*Read these BEFORE any code work. Skip the "Don't load" list to save tokens.*

### Load (in order)
1. `ai_docs/learning/research-notes/2026-06-12_news-brain-build-blueprint.md` — **the spec of record.** §1 picture, §2 component table (C1/C2/C9 rows), §3 Phase-2 gate, §8/§9 amendments (esp. v0.1 §5 routing firewall, §6 url-fetch gating).
2. `ai_docs/learning/research-notes/2026-06-12_p1c-fetch-probe-results.md` — **the fetch order is settled here** (own-fetcher JSON-LD primary; url_context demoted to paid fallback).
3. `ai_docs/learning/research-notes/2026-06-12_p1d-results.md` — the two pre-build tickets this task folds in (ownership event_type; nse-equity-master listed-universe gate) + the routing-firewall behaviour the router must preserve.
4. `ai_docs/learning/research-notes/2026-06-12_news-brain-what-it-does-spec.md` — §-of-spec the 12 categories + the routing-vs-organisation distinction.
5. `ai_docs/learning/research-notes/2026-06-12_factor-node-starter-set.md` — only the **factor FAMILY names** (router needs `factor:<family>` labels); the node graph itself is Phase 3, do not build it here.
6. **Reference idiom (copy the shape, NOT the destination DB):**
   - `scripts/_seed-utils.mjs` — `runSeed()` shape, `CHROME_UA`, `sleep`, env loading.
   - `scripts/seed-india-signals.mjs` — the Railway-cron collector idiom (read for *shape*; SachManas writes its OWN db).
   - `scripts/research/p1c-jsonld-probe.mjs` + `p1d-sample-builder.mjs` — **the proven C1 fetch + JSON-LD extraction code** (lift directly).
7. **The feed universe** — `server/worldmonitor/news/v1/_feeds.ts` (read-only reference for the source list C1 reads itself).

### Don't load (not relevant — skip to keep context tight)
- The graph/world-model design (`cluster_story_entity_architecture.md`, factor-node *graph*) — Phase 3, not now.
- Specialist agents (C4), status assembly (C7), Linker (C5), Auditor (C6) — Phases 4–6.
- `src/`, `api/`, variants — SachManas has no SachNetra frontend/edge surface.
- `scripts/seed-india-signals.mjs` internals beyond the cron shape — the Mind does not modify the pipeline.

---

## What this task builds (the spine, nothing more)

| # | Component | Build |
|---|---|---|
| **C9** | Storage & schema | SachManas's **own Postgres** (separate Railway instance or, at minimum, its own schema/database). Tables this phase: `articles`, `run_log`. (`records`, `nodes`, `edges`, … land in later phases.) |
| **C1** | Feed reader | Own RSS parser over the SachNetra feed universe, **keeping `description`/`content:encoded`**; for routed-in items, fetch full body via the **P1c order: HTTP GET → JSON-LD `articleBody` → Readability fallback → (paid, gated) url_context**. |
| **C2** | Router | Free keyword pre-filter → Groq `llama-3.1-8b-instant` classify each article into **3 routing labels** + the 12-category organisational tag (firewalled — see Decisions). Writes the `articles` row. |

**Out of scope (do NOT build):** specialists, structured records, the graph, factor-node states, status, insights. Those are gated behind this phase's acceptance test.

---

## Locked decisions (from the blueprint + the P1 findings — do not re-derive)

1. **Separate DB, always.** SachManas writes only its own Postgres. SachNetra's DB is opened **read-only** (and only later phases need it). Run `check-db-space.mjs`-equivalent before any backfill (disk-incident memory).
2. **Fetch order (P1c):** `HTTP GET (Chrome UA) → JSON-LD articleBody → Readability/DOM-text fallback → url_context (paid, last resort)`. Lift `jsonldBody()` from `p1c-jsonld-probe.mjs`. **Fetch only when** description <300 words AND routed company/factor AND trusted source (blueprint v0.1 §6); per-source success + method tracker.
3. **Routing firewall (blueprint v0.1 §5):** the router emits **3 routing labels** — `company` / `factor:<family>` / `ignore`. The 12-category taxonomy is kept on the row for **organisation only** and may **never** become a rules-engine weight. Quarantine noise to `ignore`.
4. **Every row carries provenance:** `model_id` + the keyword/Groq decision trail. One model per column per experiment (blueprint rule).
5. **Point-in-time:** store `published_at`, `fetched_at`, `routed_at` separately; never overwrite — append/version.
6. **P1d ticket #1 — `ownership` event_type:** the article schema's eventual event-type vocabulary MUST include `ownership`/`block_deal` (P1d's only real errors were block-deals forced into `mna`). SachNetra already collects bulk/block deals (V2-030). Bake the slot in now even though records are Phase 4.
7. **P1d ticket #2 — listed-universe gate:** any entity field resolves against `shared/nse-equity-master.json` (read-only copy/import). Not-in-master ⇒ demote to `none`/watchlist. (The Meesho/Tata-Sons P1d misses + even a frontier grader's stale recall prove memory ≠ data-of-record.)
8. **Fire-and-forget & independent:** SachManas runs on its own Railway cron, decoupled from SachNetra's. It must never delay or depend on the news pipeline.

---

## C9 — schema (Claude drafts DDL; Lijo runs it on the SachManas DB)

```sql
-- articles: one row per feed item the Mind has seen (the spine's only write this phase)
CREATE TABLE IF NOT EXISTS articles (
  id              BIGSERIAL PRIMARY KEY,
  url_hash        TEXT UNIQUE NOT NULL,         -- dedup key (normalized url)
  source_name     TEXT NOT NULL,
  url             TEXT NOT NULL,
  headline        TEXT NOT NULL,
  description     TEXT,                          -- kept from RSS (NOT discarded, unlike the SachNetra parser)
  body            TEXT,                          -- full text when fetched (JSON-LD / readability); NULL if snippet-only
  body_source     TEXT,                          -- 'jsonld' | 'readability' | 'url_context' | 'feed' | NULL
  body_words      INT,
  published_at    TIMESTAMPTZ,
  fetched_at      TIMESTAMPTZ,
  routed_at       TIMESTAMPTZ,
  route_label     TEXT,                          -- 'company' | 'factor:<family>' | 'ignore'   (THE firewall output)
  category_tag    TEXT,                          -- one of the 12 (organisation only; never a rule weight)
  router_model_id TEXT,                          -- provenance
  router_trail    JSONB,                         -- keyword hits + groq raw label + confidence
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_articles_routed ON articles (route_label, published_at);

-- run_log: one row per cron cycle (freshness alarm + audit)
CREATE TABLE IF NOT EXISTS run_log (
  id            BIGSERIAL PRIMARY KEY,
  started_at    TIMESTAMPTZ DEFAULT now(),
  feeds_read    INT,
  items_seen    INT,
  items_new     INT,
  items_fetched INT,
  routed        JSONB,            -- {company: n, factor: n, ignore: n}
  errors        JSONB,
  duration_ms   INT
);
```
*(`records`, `nodes`, `edges`, `node_states`, `company_status`, `insights` are later-phase DDL — not now.)*

---

## C2 — the router prompt (Claude owns; firewall-shaped)
- **Free keyword pre-filter first** (cheap): obvious `ignore` (sports/horoscope/foreign-only) dropped before any LLM call.
- Then Groq `llama-3.1-8b-instant` returns **exactly**: `route_label` ∈ {`company`, `factor:<family>`, `ignore`} **and** `category_tag` ∈ the 12. Families come from the factor-node starter set (crude, inr, repo, monsoon, election, …).
- **Audit hook:** the prompt must be deterministic enough to hand-grade 100 articles for the ≥90% precision gate.

---

## Acceptance test (the Phase-2 gate — Lijo signs off before Phase 3)
1. **1 week live** on the real feed universe, own cron, SachManas DB.
2. **≥95% of articles categorized** (route_label + category_tag non-null; `ignore` counts as categorized).
3. **Router precision ≥90%** on a **100-article hand-check** (Lijo grades route_label correctness — reuse the P1d two-grader pattern: Claude provisional + blind Gemini + Lijo adjudicates disagreements).
4. **Cost ≈ $0** (Groq free tier 14.4K RPD; fetch is free per P1c). Daily cost-breaker armed even though ~$0 expected.
5. **Freshness alarm** fires if a cycle reads 0 new items for >N cycles (reuse the Phase-0 alarm machinery).

---

## Execution plan
1. **Claude:** finalize C9 DDL + the C2 router prompt + lift the C1 fetch module from `p1c-jsonld-probe.mjs`/`p1d-sample-builder.mjs`.
2. **James:** stand up the SachManas repo + Railway Postgres (own) + cron; implement C1 reader (keep descriptions) + C2 router (keyword→Groq) writing `articles` + `run_log`; wire freshness alarm + cost breaker.
3. **Lijo:** run the DDL; let it run 1 week; do the 100-article router audit (two-grader pattern); sign the gate.
4. **On gate pass → Phase 3** (world model: C3 + ~8–10 factor nodes, business-structure exposure direction per v0.2 §1) — **pre-register that design through the Fresh-Eyes (Kimi) gate first** (Phase 3 is where the real design risk lives; Phase 2 is boring plumbing and was already covered by the blueprint's fresh-eyes round).

---
*Phase 2 builds only the reading spine. It proves the Mind can read the whole feed universe cheaply and route it cleanly — nothing about prediction, which is the Phase-7 report card. The agent extracts, a tested rule decides — but neither the extractor (Phase 4) nor the rule (Layer 2) exists yet.*
