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

-- V2-019 RBI Weekly Statistical Supplement. Independent non-news macro source: no
-- FK to other tables. One row per weekly release_date. Per-indicator as-on dates
-- (forex weekly vs SCB/monetary fortnightly — Decision 4). source + DO UPDATE
-- supersede because RBI revises aggregates (Decision 7).
CREATE TABLE IF NOT EXISTS india_rbi_wss (
  release_date            DATE NOT NULL,            -- WSS publication Friday (PK)
  -- Scheduled Commercial Banks (T_4, ₹ crore, fortnightly)
  bank_credit             DECIMAL(16,2),            -- T_4 "7 Bank Credit"
  aggregate_deposits      DECIMAL(16,2),            -- T_4 "2.1 Aggregate Deposits"
  scb_as_on               DATE,                     -- "Outstanding as on <date>"
  -- Monetary aggregates (T_6/T_7, ₹ crore, fortnightly)
  currency_in_circulation DECIMAL(16,2),            -- T_7 "1.1 Currency in Circulation"
  reserve_money           DECIMAL(16,2),            -- T_7 "Reserve Money"
  m3                      DECIMAL(16,2),            -- T_6 "M3"
  monetary_as_on          DATE,
  -- Foreign exchange reserves (T_2, weekly)
  forex_reserves_inr_cr   DECIMAL(16,2),            -- T_2 "1 Total Reserves" (₹ crore)
  forex_reserves_usd_mn   DECIMAL(16,2),            -- T_2 "1 Total Reserves" (USD mn)
  forex_as_on             DATE,
  source                  TEXT NOT NULL,            -- 'rbi_wss'
  is_provisional          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (release_date)
);
CREATE INDEX IF NOT EXISTS idx_rbiwss_release ON india_rbi_wss (release_date DESC);

-- V2-020 BIS India macro rates. Independent non-news macro source: no FK to other
-- tables. TALL design (Decision 4): one row per (series_code, time_period). source +
-- DO UPDATE supersede because BIS revises history (Decision 6). Series identity is the
-- fully-qualified SDMX key; unit/frequency live in india_macro_series_meta, not here.
CREATE TABLE IF NOT EXISTS india_macro_rates (
  series_code  TEXT NOT NULL,            -- '<DATASET>.<full SDMX key>' e.g. 'WS_TC.Q.IN.P.A.M.770.A'
  time_period  TEXT NOT NULL,            -- BIS-native period: 'YYYY-MM' (M) | 'YYYY-Q#' (Q)
  obs_value    DECIMAL(18,6) NOT NULL,   -- the observation (NaN/empty skipped at parse)
  source       TEXT NOT NULL DEFAULT 'bis',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (series_code, time_period)
);
CREATE INDEX IF NOT EXISTS idx_macro_series_period ON india_macro_rates (series_code, time_period DESC);

-- V2-020 series lookup: keeps the opaque BIS codes self-documenting. Refreshed by the
-- seed from the adapter's SERIES registry (the registry is the source of truth).
CREATE TABLE IF NOT EXISTS india_macro_series_meta (
  series_code  TEXT PRIMARY KEY,         -- 'WS_CBPOL.M.IN'
  dataset      TEXT NOT NULL,            -- 'WS_CBPOL'
  sdmx_key     TEXT NOT NULL,            -- 'M.IN' (the key after the dataset)
  label        TEXT NOT NULL,            -- 'RBI policy rate'
  unit         TEXT NOT NULL,            -- '%' | 'index' | 'INR/USD' | '% GDP' | 'ppt'
  frequency    VARCHAR(1) NOT NULL,      -- 'M' | 'Q'
  revises      BOOLEAN NOT NULL,         -- from recon Part E
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- V2-024 NSE options chain end-of-day aggregates. Independent non-news microstructure
-- source: no FK to other tables. One row per (snapshot_date, symbol, expiry_date).
-- EOD aggregates only — raw per-strike chain is discarded after computing (Decision 3).
-- Live-only source → no backfill (Decision 6). DO UPDATE supersede for idempotent re-run.
CREATE TABLE IF NOT EXISTS india_options_oi (
  snapshot_date   DATE NOT NULL,            -- trading date parsed from records.timestamp (IST)
  symbol          TEXT NOT NULL,            -- 'NIFTY' | 'BANKNIFTY' | 'FINNIFTY'
  expiry_date     DATE NOT NULL,            -- option expiry this row aggregates
  underlying      DECIMAL(12,2),            -- records.underlyingValue (spot)
  total_ce_oi     BIGINT,                   -- Σ CE openInterest (contracts)
  total_pe_oi     BIGINT,                   -- Σ PE openInterest (contracts)
  pcr             DECIMAL(8,4),             -- total_pe_oi / total_ce_oi
  max_pain        DECIMAL(12,2),            -- strike minimizing option-writer payout
  atm_strike      DECIMAL(12,2),            -- strike nearest underlying
  atm_ce_iv       DECIMAL(7,2),             -- CE impliedVolatility at ATM strike
  atm_pe_iv       DECIMAL(7,2),             -- PE impliedVolatility at ATM strike
  snapshot_ts     TIMESTAMPTZ,              -- records.timestamp (IST, +05:30)
  source          TEXT NOT NULL DEFAULT 'nse',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (snapshot_date, symbol, expiry_date)
);
CREATE INDEX IF NOT EXISTS idx_options_symbol_date ON india_options_oi (symbol, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_options_date        ON india_options_oi (snapshot_date DESC);

-- V2-030 NSE bulk & block deals. Independent non-news source: no FK to other
-- tables (Decision 9). One table for both streams via deal_type (Decision 3).
-- PK is an MD5 composite surrogate (no stable source id) + append-only
-- ON CONFLICT DO NOTHING — disclosures are immutable (Decision 4, matches V2-018).
CREATE TABLE IF NOT EXISTS india_bulk_block_deals (
  deal_id       TEXT PRIMARY KEY,         -- MD5(deal_type|deal_date|symbol|client_name|buy_sell|quantity|price)
  deal_type     TEXT NOT NULL,            -- 'bulk' | 'block'
  deal_date     DATE NOT NULL,            -- CSV "Date" (DD-MON-YYYY, IST) → calendar date
  symbol        TEXT,                     -- NSE trading symbol (e.g. 'AGIIL')
  security_name TEXT,                     -- company name
  client_name   TEXT,                     -- named buyer/seller (the signal)
  buy_sell      TEXT,                     -- 'BUY' | 'SELL'
  quantity      BIGINT,                   -- shares (Indian commas stripped)
  price         DECIMAL(14,2),            -- trade / wtd-avg price (₹)
  remarks       TEXT,                     -- '-' or null
  source        TEXT NOT NULL DEFAULT 'nse',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deals_date        ON india_bulk_block_deals (deal_date DESC);
CREATE INDEX IF NOT EXISTS idx_deals_symbol_date ON india_bulk_block_deals (symbol, deal_date DESC);
CREATE INDEX IF NOT EXISTS idx_deals_client_date ON india_bulk_block_deals (client_name, deal_date DESC);
CREATE INDEX IF NOT EXISTS idx_deals_type_date   ON india_bulk_block_deals (deal_type, deal_date DESC);

-- V2-026 POSOCO / GRID-INDIA daily electricity demand. Independent non-news source:
-- no FK to other tables (Decision 11). One table for both regional aggregates and
-- state leaves via row_type (Decision 4). Natural composite PK — no surrogate hash
-- (Decision 5). Append-only ON CONFLICT DO NOTHING — disclosures are immutable.
CREATE TABLE IF NOT EXISTS india_electricity_demand (
  target_date              DATE NOT NULL,        -- reporting_date - 1 day (Decision 7)
  row_type                 TEXT NOT NULL,        -- 'state' | 'region_total' | 'national_total'
  entity_name              TEXT NOT NULL,        -- state/entity (e.g. 'Punjab') or 'All India' / 'NR' / ...
  region                   TEXT,                 -- 'NR'|'WR'|'SR'|'ER'|'NER'|'All India'
  max_demand_met_mw        NUMERIC,              -- peak load actually served (MW)
  peak_demand_met_mw       NUMERIC,              -- evening-peak demand met (MW); Section A only
  peak_demand_shortage_mw  NUMERIC,              -- shortfall at max demand (MW)
  energy_met_mu            NUMERIC,              -- total energy delivered (MU = GWh)
  energy_shortage_mu       NUMERIC,              -- energy shortfall (MU, positive)
  drawal_schedule_mu       NUMERIC,              -- scheduled drawal (MU); Section C only
  od_ud_mu                 NUMERIC,              -- drawal OD(+)/UD(-) (MU); Section C only
  max_od_mw                NUMERIC,              -- max over-drawal (MW); Section C only (Decision 9)
  max_ud_mw                NUMERIC,              -- max under-drawal (MW, signed); Section C only (Decision 9)
  source                   TEXT NOT NULL DEFAULT 'grid-india',
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (target_date, row_type, entity_name)
);
CREATE INDEX IF NOT EXISTS idx_elec_date          ON india_electricity_demand (target_date DESC);
CREATE INDEX IF NOT EXISTS idx_elec_entity_date   ON india_electricity_demand (entity_name, target_date DESC);
CREATE INDEX IF NOT EXISTS idx_elec_row_type_date ON india_electricity_demand (row_type, target_date DESC);

-- V2-027 NPCI / NETC FASTag national toll volumes (daily + monthly). Independent
-- non-news source: no FK to other tables (Decision 11). One table for both
-- cadences via row_type (Decision 4). Natural composite PK — no surrogate hash
-- (Decision 5). Append-only ON CONFLICT DO NOTHING — NPCI reports are
-- immutable in practice; incremental daily updates only add new days.
CREATE TABLE IF NOT EXISTS india_fastag_toll_volumes (
  target_date            DATE NOT NULL,        -- daily: the day; monthly: 1st of month (Decision 5)
  row_type               TEXT NOT NULL,        -- 'daily_national' | 'monthly_national'
  transaction_count      BIGINT,               -- raw count = volume_in_mn × 1e6 (Decision 8)
  transaction_value_inr  NUMERIC,              -- raw ₹ = amount_in_cr × 1e7 (Decision 8)
  active_tags            BIGINT,               -- monthly only; tag_issuance_in_nos cleaned (Decision 7)
  live_banks             INTEGER,              -- monthly only; no_of_banks_live_on_netc
  source                 TEXT NOT NULL DEFAULT 'npci',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (target_date, row_type)
);
CREATE INDEX IF NOT EXISTS idx_fastag_date          ON india_fastag_toll_volumes (target_date DESC);
CREATE INDEX IF NOT EXISTS idx_fastag_row_type_date ON india_fastag_toll_volumes (row_type, target_date DESC);

-- V2-031 G1+G2 news ticker tagging. Adds a shadow column for the one-time
-- backfill (Decision 8) — reads stay on nse_tickers throughout the verification
-- window; the cutover (UPDATE + DROP COLUMN) is Lijo's manual step after sampling.
-- Idempotent: ADD COLUMN IF NOT EXISTS, safe to re-run.
ALTER TABLE india_news_signals
  ADD COLUMN IF NOT EXISTS nse_tickers_v2 TEXT[] DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_signals_v2_tagged
  ON india_news_signals ((array_length(nse_tickers_v2, 1)))
  WHERE nse_tickers_v2 IS NOT NULL;
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
    console.log('✓ Table created: india_rbi_wss');
    console.log('✓ Index created: idx_rbiwss_release');
    console.log('✓ Table created: india_macro_rates');
    console.log('✓ Index created: idx_macro_series_period');
    console.log('✓ Table created: india_macro_series_meta');
    console.log('✓ Table created: india_options_oi');
    console.log('✓ Index created: idx_options_symbol_date');
    console.log('✓ Index created: idx_options_date');
    console.log('✓ Table created: india_bulk_block_deals');
    console.log('✓ Index created: idx_deals_date');
    console.log('✓ Index created: idx_deals_symbol_date');
    console.log('✓ Index created: idx_deals_client_date');
    console.log('✓ Index created: idx_deals_type_date');
    console.log('✓ Table created: india_electricity_demand');
    console.log('✓ Index created: idx_elec_date');
    console.log('✓ Index created: idx_elec_entity_date');
    console.log('✓ Index created: idx_elec_row_type_date');
    console.log('✓ Table created: india_fastag_toll_volumes');
    console.log('✓ Index created: idx_fastag_date');
    console.log('✓ Index created: idx_fastag_row_type_date');
    console.log('✓ Column added: india_news_signals.nse_tickers_v2');
    console.log('✓ Index created: idx_signals_v2_tagged');

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
