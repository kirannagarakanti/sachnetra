-- SachManas (the Mind) — Phase-2 schema (C9).
-- Runs on SachManas's OWN Postgres. NEVER on the SachNetra/asset DB.
-- Task: ai_docs/tasks/SachManas-P2_reading-spine.md · Lijo runs this (prod-execution boundary).
-- Only the spine tables this phase: articles + run_log. Records/graph/status are later phases.

-- ─────────────────────────────────────────────────────────────────────────────
-- articles — one row per feed item the Mind has seen (the spine's only content write)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id              BIGSERIAL PRIMARY KEY,
  url_hash        TEXT UNIQUE NOT NULL,          -- dedup: sha1 of the normalized url (strip utm_*, trailing /)
  source_name     TEXT NOT NULL,
  url             TEXT NOT NULL,
  headline        TEXT NOT NULL,
  description     TEXT,                           -- KEPT from RSS <description>/<content:encoded>
                                                  --   (the SachNetra parser discards this; we must not)
  body            TEXT,                           -- full text when fetched; NULL when snippet-only
  body_source     TEXT CHECK (body_source IN ('jsonld','readability','url_context','feed') OR body_source IS NULL),
  body_words      INT,

  -- three independent clocks — never overwrite, point-in-time everything
  published_at    TIMESTAMPTZ,                    -- outlet-claimed (noisy; gnews proxies report Google's time)
  fetched_at      TIMESTAMPTZ,                    -- when the Mind pulled the body
  routed_at       TIMESTAMPTZ,                    -- when C2 labeled it

  -- C2 router output
  route_label     TEXT CHECK (route_label IN ('company','factor','ignore') OR route_label IS NULL),
  route_family    TEXT,                           -- when route_label='factor': politics|policy|regulatory|
                                                  --   macro|commodity|weather|global|sector  (else NULL)
  category_tag    SMALLINT CHECK (category_tag BETWEEN 1 AND 12 OR category_tag IS NULL),
                                                  -- the 12-category organisation tag; FIREWALLED:
                                                  --   never read by any rules engine as a weight
  router_model_id TEXT,                           -- provenance, e.g. 'groq:llama-3.1-8b-instant'
  router_conf     REAL,
  router_trail    JSONB,                          -- {keyword_hits:[], groq_raw:{}, prefilter:bool}

  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_articles_route     ON articles (route_label, published_at);
CREATE INDEX IF NOT EXISTS idx_articles_family    ON articles (route_family, published_at) WHERE route_label = 'factor';
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles (published_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- run_log — one row per cron cycle (freshness alarm + audit; Phase-0 alarm reads this)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS run_log (
  id            BIGSERIAL PRIMARY KEY,
  started_at    TIMESTAMPTZ DEFAULT now(),
  feeds_read    INT,
  items_seen    INT,
  items_new     INT,
  items_fetched INT,
  routed        JSONB,            -- {company:n, factor:n, ignore:n}
  errors        JSONB,            -- [{feed, stage, msg}]
  duration_ms   INT
);

-- Later phases append: records, nodes, edges, node_states, company_status, insights. NOT this phase.

-- Notes for James:
--  · route_label is the FIREWALL output (3 values). route_family only set when label='factor'.
--    category_tag (1–12) is organisation only — keep them as separate columns so the firewall is enforced
--    by schema, not convention.
--  · The Phase-4 specialist will add entity fields; the listed-universe gate (P1d ticket #2) validates those
--    against shared/nse-equity-master.json THEN. The router does not resolve entities.
--  · No row is ever UPDATEd after routing in this phase — append-only; re-seen url_hash is a no-op (ON CONFLICT
--    (url_hash) DO NOTHING).
