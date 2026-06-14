import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';
import { readFileSync } from 'node:fs';

loadEnvFile(import.meta.url);
const { Pool } = pg;

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) {
    console.error('ERROR: DATABASE_URL not set');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // Read midcap list
  const midcapList = JSON.parse(readFileSync('shared/nifty-midcap150.json', 'utf8'));
  console.log(`Loaded ${midcapList.length} midcap symbols from json`);

  // Query DB count
  const { rows } = await pool.query(
    `SELECT symbol, COUNT(*), MIN(trade_date) as min_date, MAX(trade_date) as max_date 
     FROM research_prices 
     WHERE symbol = ANY($1) 
     GROUP BY symbol`, 
    [midcapList]
  );

  console.log(`Found ${rows.length} midcap symbols in research_prices table.`);
  if (rows.length > 0) {
    const totalBars = rows.reduce((acc, r) => acc + Number(r.count), 0);
    console.log(`Total midcap bars: ${totalBars}`);
    console.log('Sample symbols in DB:');
    rows.slice(0, 5).forEach(r => {
      console.log(`  ${r.symbol}: ${r.count} bars (${r.min_date.toISOString().slice(0,10)} to ${r.max_date.toISOString().slice(0,10)})`);
    });
  }

  await pool.end();
}

main().catch(console.error);
