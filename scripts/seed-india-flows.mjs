#!/usr/bin/env node

// V2-017 — FII/DII daily institutional-flows collector.
//
// SEPARATE daily Railway cron (≈14:00 UTC, ~19:30 IST — after market close;
// Decision 2). NOT the 10-min news cron — failure isolation. Reuses runSeed()
// for the distributed lock + freshness meta + exit-0 contract, but the data
// target is Railway PostgreSQL (india_institutional_flows); the canonical
// Redis key is a STATUS key only. Does NOT read news:digest:v1:india:en.

import pg from 'pg';
import { fetchMoneycontrol, NoFlowDataError } from './_fii-dii-source.mjs';
import { loadEnvFile, runSeed } from './_seed-utils.mjs';

loadEnvFile(import.meta.url); // MUST be first

const CANONICAL_KEY = 'news:flows:v1:india'; // STATUS key only — data → PostgreSQL
const CACHE_TTL = 86400; // daily

// Decision 4 supersede upsert. V1 only ever writes source='moneycontrol', so
// the WHERE guard is a no-op now — but it must exist so V2-017b's `nsdl`
// retro-load overwrites the overlapping window with zero schema change.
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

const today = () => new Date().toISOString().slice(0, 10);

async function fetchFlows() {
  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    // No DB → nothing to do. Decision 5 spirit: log + no-op, never throw.
    console.log('[flows] DATABASE_URL not set — skipping');
    return { written: 0 };
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    let rows;
    try {
      rows = await fetchMoneycontrol();
    } catch (err) {
      if (err instanceof NoFlowDataError) {
        // Decision 5: holiday / pre-publish — write nothing, one line, exit 0.
        console.log(`[flows] no new rows for ${today()} (holiday or not yet published)`);
        return { written: 0 };
      }
      throw err; // real failure (bot wall / prop drift) → runSeed graceful-fail
    }

    const { rows: maxRows } = await pool.query(
      'SELECT MAX(flow_date)::text AS max_date FROM india_institutional_flows',
    );
    const maxDate = maxRows[0]?.max_date || null; // 'YYYY-MM-DD' | null (empty table)

    // ISO YYYY-MM-DD compares lexicographically. Only rows strictly newer than
    // what PostgreSQL already has (idempotent upsert makes equality harmless,
    // but Decision 5 wants a true "no new rows" skip on a re-run/holiday).
    const fresh = maxDate ? rows.filter((r) => r.flow_date > maxDate) : rows;

    if (fresh.length === 0) {
      const latest = rows[0]?.flow_date || today();
      console.log(`[flows] no new rows for ${latest} (holiday or not yet published)`);
      return { written: 0 };
    }

    let written = 0;
    for (const r of fresh) {
      await pool.query(UPSERT_SQL, [
        r.flow_date,
        r.investor_type,
        r.gross_buy,
        r.gross_sell,
        r.net,
        'moneycontrol',
      ]);
      written += 1;
    }

    const latestDate = fresh.reduce((m, r) => (r.flow_date > m ? r.flow_date : m), fresh[0].flow_date);
    console.log(`[flows] upserted ${written} row(s); latest ${latestDate}`);
    return { written, latest_date: latestDate };
  } finally {
    await pool.end();
  }
}

function validate(d) {
  return typeof d === 'object' && d !== null;
}

runSeed('india', 'flows', CANONICAL_KEY, fetchFlows, {
  validateFn: validate,
  ttlSeconds: CACHE_TTL,
  sourceVersion: 'flows-mc-v1',
}).catch((err) => {
  console.error('FATAL:', err.message || err);
  process.exit(0);
});
