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
