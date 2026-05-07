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
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_signals_hash   ON india_news_signals (headline_hash);
CREATE INDEX        IF NOT EXISTS idx_signals_scraped ON india_news_signals (scraped_at DESC);
CREATE INDEX        IF NOT EXISTS idx_signals_market  ON india_news_signals (is_market_moving, scraped_at DESC);
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
