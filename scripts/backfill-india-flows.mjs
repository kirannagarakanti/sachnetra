#!/usr/bin/env node

// V2-017 — one-time FII/DII backfill (Decision 3).
//
// Lijo runs this against prod, post-review. Safe to re-run any time —
// idempotent via the Decision 4 ON CONFLICT DO UPDATE upsert. Walks the
// ENTIRE Moneycontrol fiiDiiData[] window (~30 trading days = ~60 rows:
// 30 dates × {FII, DII}) and upserts every row with source='moneycontrol'.
// This IS the entire V1 backfill — deep history is the separate V2-017b
// task, which will reuse this exact upsert with source='nsdl'.
//
// Standalone (no runSeed / no lock): a manual one-shot, not a cron.

import pg from 'pg';
import { fetchMoneycontrol, NoFlowDataError } from './_fii-dii-source.mjs';
import { loadEnvFile } from './_seed-utils.mjs';

loadEnvFile(import.meta.url); // MUST be first

const UPSERT_SQL = `
INSERT INTO india_institutional_flows
  (flow_date, investor_type, segment, gross_buy, gross_sell, net, source, is_provisional)
VALUES ($1,$2,'cash',$3,$4,$5,$6,TRUE)
ON CONFLICT (flow_date, investor_type, segment) DO UPDATE
  SET gross_buy = EXCLUDED.gross_buy,
      gross_sell = EXCLUDED.gross_sell,
      net = EXCLUDED.net,
      source = EXCLUDED.source,
      updated_at = NOW()
  WHERE india_institutional_flows.source = 'moneycontrol'
     OR EXCLUDED.source = india_institutional_flows.source;
`;

async function backfill() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_PUBLIC_URL is not set. Add it to .env.local first.');
    process.exit(1);
  }

  let rows;
  try {
    rows = await fetchMoneycontrol();
  } catch (err) {
    if (err instanceof NoFlowDataError) {
      console.log('[backfill] Moneycontrol returned no rows (holiday or not yet published) — nothing to backfill');
      process.exit(0);
    }
    throw err;
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query('SELECT 1');
    console.log(`[backfill] start — ${rows.length} row(s) from Moneycontrol window`);

    let written = 0;
    for (const r of rows) {
      await pool.query(UPSERT_SQL, [
        r.flow_date,
        r.investor_type,
        r.gross_buy,
        r.gross_sell,
        r.net,
        'moneycontrol',
      ]);
      written += 1;
      if (written % 200 === 0) {
        console.log(`[backfill] progress — ${written}/${rows.length} upserted`);
      }
    }

    console.log(`[backfill] done — ${written} row(s) upserted (idempotent; safe to re-run)`);
  } finally {
    await pool.end();
  }
}

backfill().catch((err) => {
  console.error('Backfill failed:', err.message || err);
  process.exit(1);
});
