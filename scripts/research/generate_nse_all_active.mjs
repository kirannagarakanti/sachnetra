import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dir, '..', '..');

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  console.log('Fetching all unique symbols from india_bourse_announcements...');
  const { rows } = await pool.query(`SELECT DISTINCT symbol FROM india_bourse_announcements WHERE symbol IS NOT NULL ORDER BY symbol;`);
  
  const symbols = rows.map(r => `${r.symbol}.NS`);
  console.log(`Found ${symbols.length} unique symbols.`);
  
  const targetPath = join(ROOT_DIR, 'shared', 'nse_all_active.json');
  writeFileSync(targetPath, JSON.stringify(symbols, null, 2));
  console.log(`Wrote symbols to ${targetPath}`);

  await pool.end();
}

main().catch(console.error);
