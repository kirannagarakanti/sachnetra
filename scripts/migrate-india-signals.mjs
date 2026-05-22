#!/usr/bin/env node

import { loadEnvFile } from './_seed-utils.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);

const { Pool } = pg;

const DDL = `
CREATE TABLE IF NOT EXISTS india_news_signals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_hash    TEXT UNIQUE NOT NULL,
  scraped_at       TIMESTAMPTZ NOT NULL,
  published_at     TIMESTAMPTZ,
  processed_at     TIMESTAMPTZ DEFAULT NOW(),
  headline         TEXT NOT NULL,
  source_name      TEXT NOT NULL,
  article_url      TEXT,
  event_category   TEXT,
  threat_level     TEXT,
  is_market_moving BOOLEAN DEFAULT FALSE,
  nse_tickers      TEXT[],
  sectors          TEXT[],
  companies        TEXT[],
  sentiment_score  DECIMAL(5,4),
  sentiment_label  TEXT,
  sentiment_model  TEXT,
  relevance_class  TEXT,
  event_type       TEXT,
  entity_sentiment JSONB,
  ai_summary       TEXT DEFAULT NULL,
  ai_meaning       TEXT DEFAULT NULL,
  cluster_hash     TEXT DEFAULT NULL,
  feed_bucket      TEXT DEFAULT NULL,
  thread_id        UUID DEFAULT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column adds: CREATE TABLE IF NOT EXISTS is a no-op on the existing
-- populated table, so the five V2-012 columns must be added explicitly. Safe on
-- both fresh installs (no-op, columns already in CREATE) and existing tables.
ALTER TABLE india_news_signals ADD COLUMN IF NOT EXISTS ai_summary   TEXT DEFAULT NULL;
ALTER TABLE india_news_signals ADD COLUMN IF NOT EXISTS ai_meaning   TEXT DEFAULT NULL;
ALTER TABLE india_news_signals ADD COLUMN IF NOT EXISTS cluster_hash TEXT DEFAULT NULL;
ALTER TABLE india_news_signals ADD COLUMN IF NOT EXISTS feed_bucket  TEXT DEFAULT NULL;
ALTER TABLE india_news_signals ADD COLUMN IF NOT EXISTS thread_id    UUID DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_signals_hash   ON india_news_signals (headline_hash);
CREATE INDEX        IF NOT EXISTS idx_signals_scraped ON india_news_signals (scraped_at DESC);
CREATE INDEX        IF NOT EXISTS idx_signals_market  ON india_news_signals (is_market_moving, scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_signals_cluster
  ON india_news_signals (cluster_hash, scraped_at DESC)
  WHERE cluster_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS story_threads (
  thread_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_title         TEXT NOT NULL,
  thread_summary       TEXT,
  first_seen           TIMESTAMPTZ NOT NULL,
  last_seen            TIMESTAMPTZ NOT NULL,
  last_summary_at      TIMESTAMPTZ,
  status               TEXT NOT NULL,
  event_count          INT NOT NULL DEFAULT 0,
  dominant_event_type  TEXT,
  entities             JSONB,
  created_by           TEXT NOT NULL DEFAULT 'auto',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_threads_status_last_seen ON story_threads (status, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_threads_last_seen        ON story_threads (last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_threads_event_type       ON story_threads (dominant_event_type, status);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_signals_thread') THEN
    ALTER TABLE india_news_signals
      ADD CONSTRAINT fk_signals_thread
      FOREIGN KEY (thread_id) REFERENCES story_threads(thread_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS entity_timeline (
  entity_id        TEXT NOT NULL,
  entity_type      TEXT NOT NULL,
  entity_name      TEXT NOT NULL,
  cluster_hash     TEXT NOT NULL,
  thread_id        UUID REFERENCES story_threads(thread_id),
  observed_at      TIMESTAMPTZ NOT NULL,
  sentiment        DECIMAL(5,4),
  sentiment_source TEXT NOT NULL,
  source_count     INT NOT NULL,
  cluster_size     INT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (entity_id, entity_type, cluster_hash)
);

CREATE INDEX IF NOT EXISTS idx_entity_observed      ON entity_timeline (entity_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_thread        ON entity_timeline (thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entity_type_observed ON entity_timeline (entity_type, observed_at DESC);

-- V2-017 FII/DII daily institutional flows. Independent non-news source: no FK
-- to india_news_signals/story_threads. PK (flow_date, investor_type, segment)
-- + source column power the Decision 4 ON CONFLICT DO UPDATE supersede path.
CREATE TABLE IF NOT EXISTS india_institutional_flows (
  flow_date      DATE NOT NULL,
  investor_type  TEXT NOT NULL,            -- 'FII' | 'DII'
  segment        TEXT NOT NULL DEFAULT 'cash',
  gross_buy      DECIMAL(14,2),            -- ₹ crore
  gross_sell     DECIMAL(14,2),            -- ₹ crore
  net            DECIMAL(14,2) NOT NULL,   -- ₹ crore (buy − sell)
  source         TEXT NOT NULL,            -- 'moneycontrol' | 'nse' | 'bse'  (provenance)
  is_provisional BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (flow_date, investor_type, segment)
);
CREATE INDEX IF NOT EXISTS idx_flows_date        ON india_institutional_flows (flow_date DESC);
CREATE INDEX IF NOT EXISTS idx_flows_type_date   ON india_institutional_flows (investor_type, flow_date DESC);

-- V2-018 NSE bourse announcements. Independent non-news source: no FK to
-- india_news_signals/entity_timeline (Decision 6). PK (source, announcement_id)
-- + append-only ON CONFLICT DO NOTHING — announcements are immutable, distinct
-- per exchange ID space (Decision 4, diverges from V2-017's supersede model).
CREATE TABLE IF NOT EXISTS india_bourse_announcements (
  source          TEXT NOT NULL,            -- 'nse' | 'bse'  (provenance)
  announcement_id TEXT NOT NULL,            -- NSE seq_id (stable natural key)
  symbol          TEXT,                     -- NSE trading symbol (e.g. 'RELIANCE')
  company_name    TEXT,                     -- sm_name
  isin            TEXT,                     -- sm_isin
  category        TEXT,                     -- desc (e.g. 'Outcome of Board Meeting')
  subject         TEXT,                     -- attchmntText (announcement detail)
  attachment_url  TEXT,                     -- attchmntFile (PDF — the V2-015 hook)
  industry        TEXT,                     -- smIndustry (nullable)
  has_xbrl        BOOLEAN,                  -- hasXbrl
  announced_at    TIMESTAMPTZ NOT NULL,     -- sort_date, IST (+05:30)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (source, announcement_id)
);
CREATE INDEX IF NOT EXISTS idx_ann_announced     ON india_bourse_announcements (announced_at DESC);
CREATE INDEX IF NOT EXISTS idx_ann_symbol_date   ON india_bourse_announcements (symbol, announced_at DESC);
CREATE INDEX IF NOT EXISTS idx_ann_category_date ON india_bourse_announcements (category, announced_at DESC);
`;

async function migrate() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_PUBLIC_URL is not set. Add it to .env.local first.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to Railway PostgreSQL...');
    await pool.query('SELECT 1');
    console.log('✓ Connected');

    await pool.query(DDL);
    console.log('✓ Table created: india_news_signals');
    console.log('✓ Index created: idx_signals_hash');
    console.log('✓ Index created: idx_signals_scraped');
    console.log('✓ Index created: idx_signals_market');
    console.log('✓ Table created: story_threads');
    console.log('✓ Index created: idx_threads_status_last_seen');
    console.log('✓ Index created: idx_threads_last_seen');
    console.log('✓ Index created: idx_threads_event_type');
    console.log('✓ FK guard: fk_signals_thread (skipped if already exists)');
    console.log('✓ Table created: entity_timeline');
    console.log('✓ Index created: idx_entity_observed');
    console.log('✓ Index created: idx_entity_thread');
    console.log('✓ Index created: idx_entity_type_observed');
    console.log('✓ Table created: india_institutional_flows');
    console.log('✓ Index created: idx_flows_date');
    console.log('✓ Index created: idx_flows_type_date');
    console.log('✓ Table created: india_bourse_announcements');
    console.log('✓ Index created: idx_ann_announced');
    console.log('✓ Index created: idx_ann_symbol_date');
    console.log('✓ Index created: idx_ann_category_date');

    // Confirm the table exists and show column count
    const { rows } = await pool.query(`
      SELECT COUNT(*) AS col_count
      FROM information_schema.columns
      WHERE table_name = 'india_news_signals'
    `);
    console.log(`✓ Verified: ${rows[0].col_count} columns present`);
    console.log('\nDone. Run node scripts/seed-india-signals.mjs to populate.');
  } finally {
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
