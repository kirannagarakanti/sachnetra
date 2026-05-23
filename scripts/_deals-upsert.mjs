#!/usr/bin/env node

// V2-030 — batched upsert for india_bulk_block_deals.
//
// Shared by seed-india-deals.mjs (daily, ~100-200 rows/run) and
// backfill-india-deals.mjs (~50-500 rows/chunk). Batches into multi-row
// INSERTs to avoid per-row round-trips that hold the PG connection open long
// enough for Railway to terminate it. Matches the V2-018 pattern exactly.

import { computeDealId } from './_nse-deals-source.mjs';

// 10 columns. 500 rows × 10 = 5,000 bind params — well under PG's 65,535 limit.
const COLUMNS = [
  'deal_id', 'deal_type', 'deal_date', 'symbol', 'security_name',
  'client_name', 'buy_sell', 'quantity', 'price', 'remarks',
];
const BATCH_SIZE = 500;

function dedupe(rows) {
  const seen = new Set();
  return rows.filter((r) => {
    const key = computeDealId(r);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Bulk-upsert normalized deal rows. Idempotent (ON CONFLICT (deal_id) DO NOTHING).
 * @param {import('pg').Pool} pool
 * @param {Array<object>} rows  normalized rows from parseDealsCsv()
 * @returns {Promise<number>} count of rows actually inserted (excludes skipped)
 */
export async function upsertDeals(pool, rows) {
  const unique = dedupe(rows);
  let inserted = 0;

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const slice  = unique.slice(i, i + BATCH_SIZE);
    const params = [];
    const tuples = slice.map((r, j) => {
      const base = j * COLUMNS.length;
      params.push(
        computeDealId(r),
        r.deal_type, r.deal_date, r.symbol, r.security_name,
        r.client_name, r.buy_sell, r.quantity, r.price, r.remarks,
      );
      const placeholders = COLUMNS.map((_, c) => `$${base + c + 1}`).join(',');
      return `(${placeholders})`;
    });

    const sql = `
INSERT INTO india_bulk_block_deals (${COLUMNS.join(', ')})
VALUES ${tuples.join(',')}
ON CONFLICT (deal_id) DO NOTHING;`;

    const res = await pool.query(sql, params);
    inserted += res.rowCount;
  }

  return inserted;
}
