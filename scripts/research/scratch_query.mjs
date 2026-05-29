import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnvFile(import.meta.url);
const { Pool } = pg;

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // Get governance announcements not in research_prices
  const query = `
    SELECT a.symbol, a.category, a.subject, a.announced_at
    FROM india_bourse_announcements a
    LEFT JOIN (SELECT DISTINCT symbol FROM research_prices) p
           ON p.symbol = a.symbol || '.NS'
    WHERE (a.category || ' ' || a.subject) ~* 'auditor|pledg|encumbr'
      AND p.symbol IS NULL
    ORDER BY a.announced_at DESC
    LIMIT 100;
  `;
  
  const { rows } = await pool.query(query);
  console.log(`Found ${rows.length} sample excluded governance events.`);
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const r = rows[i];
    console.log(`${r.symbol.padEnd(15)} | ${r.announced_at.toISOString().slice(0, 10)} | ${r.category} | ${r.subject.slice(0, 50)}`);
  }

  // Count by symbol to see if certain symbols dominate
  const queryCounts = `
    SELECT a.symbol, count(*) as count
    FROM india_bourse_announcements a
    LEFT JOIN (SELECT DISTINCT symbol FROM research_prices) p
           ON p.symbol = a.symbol || '.NS'
    WHERE (a.category || ' ' || a.subject) ~* 'auditor|pledg|encumbr'
      AND p.symbol IS NULL
    GROUP BY a.symbol
    ORDER BY count DESC
    LIMIT 20;
  `;
  
  const { rows: counts } = await pool.query(queryCounts);
  console.log('\nTop symbols for excluded governance events:');
  for (const c of counts) {
    console.log(`${c.symbol.padEnd(15)} | ${c.count}`);
  }

  await pool.end();
}

main().catch(console.error);
