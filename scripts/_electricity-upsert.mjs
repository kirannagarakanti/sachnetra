#!/usr/bin/env node

// V2-026 — batched upsert for india_electricity_demand.
//
// Shared by seed-india-electricity.mjs (daily, ~42–45 rows/run) and
// backfill-india-electricity.mjs (~53k rows total). Mirrors the batched
// multi-row INSERT pattern from _announcements-upsert.mjs (V2-018).
// Keeping the column list + ON CONFLICT target here means seed and backfill
// can never diverge from the schema (same rationale as V2-018 Decision 4).

// Order matches the VALUES tuple below and the migrate DDL. 13 columns.
// source + created_at are omitted — both have table DEFAULTs ('grid-india' / NOW()).
const COLUMNS = [
  'target_date', 'row_type', 'entity_name', 'region',
  'max_demand_met_mw', 'peak_demand_met_mw', 'peak_demand_shortage_mw',
  'energy_met_mu', 'energy_shortage_mu',
  'drawal_schedule_mu', 'od_ud_mu', 'max_od_mw', 'max_ud_mw',
];

// 500 rows x 13 cols = 6,500 bind params — well under PostgreSQL's 65,535 limit.
const BATCH_SIZE = 500;

// Pre-dedupe on the natural composite PK so the inserted count is exact.
// '|' separator is safe: target_date is ISO date, row_type and entity_name
// are controlled enum / text values with no '|' in practice.
function dedupe(rows) {
  const seen = new Set();
  const out  = [];
  for (const r of rows) {
    const key = `${r.target_date}|${r.row_type}|${r.entity_name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/**
 * Bulk-upsert normalized electricity demand rows. Idempotent (DO NOTHING).
 * @param {import('pg').Pool} pool
 * @param {Array<object>} rows  normalized rows from parseDailyPsp()
 * @returns {Promise<number>} count of rows actually inserted (excludes skipped)
 */
export async function upsertElectricity(pool, rows) {
  const unique   = dedupe(rows);
  let inserted = 0;

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const slice  = unique.slice(i, i + BATCH_SIZE);
    const params = [];
    const tuples = slice.map((r, j) => {
      const base = j * COLUMNS.length;
      params.push(
        r.target_date, r.row_type, r.entity_name, r.region,
        r.max_demand_met_mw, r.peak_demand_met_mw, r.peak_demand_shortage_mw,
        r.energy_met_mu, r.energy_shortage_mu,
        r.drawal_schedule_mu, r.od_ud_mu, r.max_od_mw, r.max_ud_mw,
      );
      const placeholders = COLUMNS.map((_, c) => `$${base + c + 1}`).join(',');
      return `(${placeholders})`;
    });

    const sql = `
INSERT INTO india_electricity_demand (${COLUMNS.join(', ')})
VALUES ${tuples.join(',')}
ON CONFLICT (target_date, row_type, entity_name) DO NOTHING;`;

    const res  = await pool.query(sql, params);
    inserted  += res.rowCount;
  }

  return inserted;
}
