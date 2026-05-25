#!/usr/bin/env node

// V2-027 — batched upsert for india_fastag_toll_volumes.
//
// Shared by seed-india-fastag.mjs (daily, ~30–40 rows/run) and
// backfill-india-fastag.mjs (~2,000 rows total across both axes). Batched
// multi-row INSERT keeps round-trips low; column list + ON CONFLICT target here
// means seed and backfill can never diverge from the schema (mirrors V2-018).

// Order matches the VALUES tuple below and the migrate DDL. 6 columns.
const COLUMNS = [
  'target_date', 'row_type', 'transaction_count', 'transaction_value_inr',
  'active_tags', 'live_banks',
];

// 500 rows x 6 cols = 3,000 bind params — well under PostgreSQL's 65,535 limit.
const BATCH_SIZE = 500;

// Append-only idempotency (Decision 5): ON CONFLICT (target_date, row_type)
// DO NOTHING. Pre-dedupe so inserted count is exact and predictable.
function dedupe(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const key = `${r.target_date}|${r.row_type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/**
 * Bulk-upsert normalized FASTag rows. Idempotent (DO NOTHING).
 * @param {import('pg').Pool} pool
 * @param {Array<object>} rows  normalized rows from parseDailyPayload() / parseMonthlyPayload()
 * @returns {Promise<number>} count of rows actually inserted (excludes skipped)
 */
export async function upsertFastag(pool, rows) {
  const unique = dedupe(rows);
  let inserted = 0;

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const slice = unique.slice(i, i + BATCH_SIZE);
    const params = [];
    const tuples = slice.map((r, j) => {
      const base = j * COLUMNS.length;
      params.push(
        r.target_date, r.row_type, r.transaction_count, r.transaction_value_inr,
        r.active_tags, r.live_banks,
      );
      const placeholders = COLUMNS.map((_, c) => `$${base + c + 1}`).join(',');
      return `(${placeholders})`;
    });

    const sql = `
INSERT INTO india_fastag_toll_volumes (${COLUMNS.join(', ')})
VALUES ${tuples.join(',')}
ON CONFLICT (target_date, row_type) DO NOTHING;`;

    const res = await pool.query(sql, params);
    inserted += res.rowCount;
  }

  return inserted;
}
