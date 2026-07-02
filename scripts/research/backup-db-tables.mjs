#!/usr/bin/env node
//
// BACKUP — read-only dump of every public table to local gzipped NDJSON, before letting Railway lapse.
// The DB is the asset (news + filings + prices + flows + …); this makes a local copy so nothing is lost to an
// unpaid invoice. Keyset-paginated by ctid so it streams (no whole-table-in-memory), append-only-safe.
//
// BOUNDARY: READ-ONLY. SELECT-only. Writes ONLY local files under scripts/research/output/backup/<timestamp>/.
//
// USAGE: node scripts/research/backup-db-tables.mjs
//   (requires Railway PG reachable via DATABASE_PUBLIC_URL / DATABASE_URL)

import { loadEnvFile } from '../_seed-utils.mjs';
import { createWriteStream, mkdirSync, writeFileSync, readFileSync, statSync, existsSync } from 'node:fs';
import { createGzip } from 'node:zlib';
import { dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const __dir = dirname(fileURLToPath(import.meta.url));
const STAMP = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
// Resume into an existing backup dir with BACKUP_DIR=<stamp | absolute path>; else a fresh timestamped dir.
const OUT = process.env.BACKUP_DIR
  ? (isAbsolute(process.env.BACKUP_DIR) ? process.env.BACKUP_DIR : join(__dir, 'output', 'backup', process.env.BACKUP_DIR))
  : join(__dir, 'output', 'backup', STAMP);
const BATCH = 50000;
const ONLY = process.argv.slice(2); // optional: dump only these table names (resume / subset)

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL / DATABASE_PUBLIC_URL not set.'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  mkdirSync(OUT, { recursive: true });

  const { rows: allTables } = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  const tables = ONLY.length ? allTables.filter((t) => ONLY.includes(t.tablename)) : allTables;
  console.log(`Backing up ${tables.length}${ONLY.length ? ` (of ${allTables.length}) selected` : ''} tables → ${OUT}\n`);

  const manifestPath = join(OUT, 'backup_manifest.json');
  let manifest = { backup_at: new Date().toISOString(), source: 'Railway PG (public schema)', tables: [] };
  try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch { /* fresh */ }
  for (const { tablename } of tables) {
    const file = join(OUT, `${tablename}.ndjson.gz`);
    // Resume: when reusing a dir with no explicit table filter, skip tables already dumped (delete a partial to redo).
    if (process.env.BACKUP_DIR && ONLY.length === 0 && existsSync(file)) {
      console.log(`  ${tablename.padEnd(34)} exists — skip`); continue;
    }
    const { rows: [{ n }] } = await pool.query(`SELECT count(*)::int AS n FROM "${tablename}"`);
    const gz = createGzip();
    const ws = createWriteStream(file);
    gz.pipe(ws);

    let last = '(0,0)', got = 0;
    for (;;) {
      // keyset by physical row id (ctid) — streams without OFFSET blowup; safe for append-only tables.
      const { rows } = await pool.query(
        `SELECT t.*, t.ctid::text AS __ctid FROM "${tablename}" t
          WHERE t.ctid > $1::tid ORDER BY t.ctid LIMIT $2`, [last, BATCH]);
      if (!rows.length) break;
      for (const r of rows) {
        last = r.__ctid; delete r.__ctid;
        if (!gz.write(JSON.stringify(r) + '\n')) await new Promise((res) => gz.once('drain', res));
      }
      got += rows.length;
      process.stdout.write(`\r  ${tablename}: ${got}/${n}   `);
      if (rows.length < BATCH) break;
    }
    await new Promise((res, rej) => { gz.end(); ws.on('finish', res); ws.on('error', rej); });
    const bytes = statSync(file).size;
    console.log(`\r  ${tablename.padEnd(34)} ${String(got).padStart(8)} rows  ${(bytes / 1e6).toFixed(2)} MB gz`);
    manifest.tables = manifest.tables.filter((t) => t.table !== tablename);
    manifest.tables.push({ table: tablename, rows: n, dumped: got, file: `${tablename}.ndjson.gz`, bytes });
    manifest.tables.sort((a, b) => (a.table < b.table ? -1 : 1));
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n'); // checkpoint after each table
  }
  await pool.end();

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  const totRows = manifest.tables.reduce((s, t) => s + t.dumped, 0);
  const totMB = manifest.tables.reduce((s, t) => s + t.bytes, 0) / 1e6;
  console.log(`\nDONE. ${manifest.tables.length} tables · ${totRows} rows · ${totMB.toFixed(1)} MB → ${OUT}`);
  console.log(`Restore a table with:  zcat <table>.ndjson.gz | <your loader>   (one JSON object per line)`);
}
main().catch((e) => { console.error('\nfailed:', e.message); console.error(e.stack); process.exit(1); });
