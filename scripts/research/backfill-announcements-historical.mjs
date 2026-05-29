#!/usr/bin/env node
//
// G7 — Deepen india_bourse_announcements history.
//
// WHAT THIS DOES
//   Walks back in time (default 730 days / 2 years) in 7-day increments, fetching
//   corporate announcements from NSE. Normalizes them, classifications them (dry/write),
//   and upserts them into `india_bourse_announcements`.
//
// WHY
//   We need to get the primary governance shock tags (auditor resignations & promoter pledge
//   increases) to N >= 20.
//
// SAFETY
//   - Writes ONLY to india_bourse_announcements.
//   - Idempotent via ON CONFLICT (source, announcement_id) DO NOTHING.
//   - Runs check-db-space before writing.
//   - Polite pauses (1500ms) between chunk requests to avoid rate limits / IP bans.
//
// USAGE (writes are OPT-IN — default is a dry run that never touches the DB)
//   node scripts/research/backfill-announcements-historical.mjs                        # DRY RUN — fetch+classify, no DB write
//   node scripts/research/backfill-announcements-historical.mjs --days=180             # DRY RUN, 180 days
//   node scripts/research/backfill-announcements-historical.mjs --write --days=730     # WRITE 2 years (Lijo/James, post-review)
//   node scripts/research/backfill-announcements-historical.mjs --write --limit-chunks=5  # WRITE, max 5 chunks
//

import pg from 'pg';
import { upsertAnnouncements } from '../_announcements-upsert.mjs';
import { fetchNSEAnnouncements, warmUpNSE } from '../_nse-announcements-source.mjs';
import { loadEnvFile, sleep } from '../_seed-utils.mjs';
import { assertDiskHeadroom } from './_db-guard.mjs';

loadEnvFile(import.meta.url);
const { Pool } = pg;

// ── CLI flags ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getFlag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const BACKFILL_DAYS = getFlag('days', '730') ? Number(getFlag('days', '730')) : 730;
const LIMIT_CHUNKS = getFlag('limit-chunks', null) ? Number(getFlag('limit-chunks', null)) : null;
const DRY_RUN = !args.includes('--write');
const CHUNK_DAYS = 7;
const CHUNK_PAUSE_MS = 1500;

// Governance Classification Regexes (Exp 14 matches)
const auditorRegex = /auditor/i;
const pledgeRegex = /pledg|encumbr/i;
const subTags = {
  auditor_resignation: /resign|vacated|discontinu/i,
  auditor_change: /appoint|change|reappoint/i,
  pledge_increase: /pledge|encumbr|margin call|invok/i,
  pledge_release: /revoke|release|discharge/i
};

function classify(category, subject) {
  const text = `${category || ''} ${subject || ''}`;
  let bucket = null;
  let subTag = null;

  if (auditorRegex.test(text)) {
    bucket = 'auditor';
    if (subTags.auditor_resignation.test(text)) {
      subTag = 'auditor_resignation';
    } else if (subTags.auditor_change.test(text)) {
      subTag = 'auditor_change';
    }
  } else if (pledgeRegex.test(text)) {
    bucket = 'promoter_pledge';
    if (subTags.pledge_release.test(text)) {
      subTag = 'pledge_release';
    } else if (subTags.pledge_increase.test(text)) {
      subTag = 'pledge_increase';
    }
  }
  return { bucket, subTag };
}

function istDateParam(date) {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const dd = String(ist.getUTCDate()).padStart(2, '0');
  const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = ist.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function isCookieWall(err) {
  return /HTTP 40[13]/.test(String(err?.message || ''));
}

function buildChunks(now) {
  const chunks = [];
  for (let offset = 0; offset < BACKFILL_DAYS; offset += CHUNK_DAYS) {
    const to = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    const fromOffset = Math.min(offset + CHUNK_DAYS, BACKFILL_DAYS);
    const from = new Date(now.getTime() - fromOffset * 24 * 60 * 60 * 1000);
    chunks.push({ fromDate: istDateParam(from), toDate: istDateParam(to) });
  }
  return chunks;
}

async function fetchChunkWithRewarm(chunk, cookieRef) {
  try {
    return await fetchNSEAnnouncements({ ...chunk, cookie: cookieRef.cookie });
  } catch (err) {
    if (!isCookieWall(err)) throw err;
    console.warn(`[backfill] cookie wall (${err.message}) — re-warming session...`);
    cookieRef.cookie = await warmUpNSE();
    return fetchNSEAnnouncements({ ...chunk, cookie: cookieRef.cookie });
  }
}


async function main() {
  console.log('=== india_bourse_announcements historical backfill (G7) ===');
  console.log(`  Days:   ${BACKFILL_DAYS} days`);
  console.log(`  Mode:   ${DRY_RUN ? 'DRY RUN (no DB write)' : 'WRITE'}`);

  const connectionString = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!DRY_RUN && !connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_PUBLIC_URL not set in .env.local');
    process.exit(1);
  }

  let pool = null;
  if (!DRY_RUN) {
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    await pool.query('SELECT 1');
    const dbStat = await assertDiskHeadroom(pool, { tableName: 'india_bourse_announcements' });
    const estChunks = LIMIT_CHUNKS
      ? Math.min(LIMIT_CHUNKS, Math.ceil(BACKFILL_DAYS / CHUNK_DAYS))
      : Math.ceil(BACKFILL_DAYS / CHUNK_DAYS);
    const estRows = estChunks * 5000; // rough: ~5–7k market-wide announcements per 7-day chunk (many dedup on conflict)
    console.log(`\nWRITE PLAN: ${estChunks} chunk(s) → india_bourse_announcements`);
    console.log(`  est. rows: ~${estRows.toLocaleString()}   current DB: ${dbStat.sizePretty} / 5 GB (${((dbStat.bytes / dbStat.limitBytes) * 100).toFixed(1)}%)`);
    console.log(`  proceeding because --write was passed.\n`);
  }

  console.log('Warming up NSE session...');
  const cookieRef = { cookie: await warmUpNSE() };
  console.log('Session warmed.');

  const allChunks = buildChunks(new Date());
  const chunks = LIMIT_CHUNKS ? allChunks.slice(0, LIMIT_CHUNKS) : allChunks;
  console.log(`Total chunks to process: ${chunks.length} (out of ${allChunks.length} total available)`);

  let totalFetched = 0;
  let totalInserted = 0;
  
  const stats = {
    total: 0,
    governance: 0,
    auditor_change: 0,
    auditor_resignation: 0,
    pledge_increase: 0,
    pledge_release: 0,
    gov_unclassified: 0
  };

  for (const [i, chunk] of chunks.entries()) {
    const window = `${chunk.fromDate} → ${chunk.toDate}`;
    console.log(`[backfill] Chunk ${i + 1}/${chunks.length} (${window}) — fetching…`);
    
    let rows = [];
    try {
      rows = await fetchChunkWithRewarm(chunk, cookieRef);
    } catch (err) {
      console.error(`[backfill]   → Error fetching chunk: ${err.message}. Skipping chunk.`);
      console.warn(`[backfill]   → Proactively re-warming session cookie and sleeping 5s...`);
      try {
        cookieRef.cookie = await warmUpNSE();
      } catch (warmErr) {
        console.error(`[backfill]   → Cookie re-warm failed: ${warmErr.message}`);
      }
      if (i < chunks.length - 1) await sleep(5000);
      continue;
    }

    // Classify
    let chunkGov = 0;
    let chunkResignations = 0;
    let chunkPledgeInc = 0;

    for (const r of rows) {
      stats.total++;
      const { bucket, subTag } = classify(r.category, r.subject);
      if (bucket) {
        chunkGov++;
        stats.governance++;
        if (subTag === 'auditor_change') stats.auditor_change++;
        else if (subTag === 'auditor_resignation') {
          stats.auditor_resignation++;
          chunkResignations++;
        }
        else if (subTag === 'pledge_increase') {
          stats.pledge_increase++;
          chunkPledgeInc++;
        }
        else if (subTag === 'pledge_release') stats.pledge_release++;
        else stats.gov_unclassified++;
      }
    }

    let inserted = 0;
    if (!DRY_RUN && rows.length > 0) {
      try {
        inserted = await upsertAnnouncements(pool, rows);
        totalInserted += inserted;
      } catch (dbErr) {
        console.error(`[backfill]   → Database write failed: ${dbErr.message}`);
        // Attempt to check size and abort if it was space issue
        if (pool) await assertDiskHeadroom(pool, { tableName: 'india_bourse_announcements' }).catch(() => {});
        throw dbErr;
      }
    }

    totalFetched += rows.length;
    console.log(`[backfill]   → Fetched ${rows.length} rows. Governance: ${chunkGov} (Resignations: ${chunkResignations}, Pledge increases: ${chunkPledgeInc})`);
    if (!DRY_RUN) {
      console.log(`[backfill]   → Inserted ${inserted} new filings (skipped ${rows.length - inserted} duplicates)`);
    }

    if (i < chunks.length - 1) await sleep(CHUNK_PAUSE_MS);
  }

  if (pool) await pool.end();

  console.log('\n=== Summary ===');
  console.log(`  Total Fetched:         ${totalFetched}`);
  if (!DRY_RUN) {
    console.log(`  Total Inserted to DB:  ${totalInserted}`);
  }
  console.log(`  Total Scanned:         ${stats.total}`);
  console.log(`  Governance Filings:    ${stats.governance} (${((stats.governance / stats.total) * 100).toFixed(1)}%)`);
  console.log(`    - Auditor Change (benign):   ${stats.auditor_change}`);
  console.log(`    - Auditor Resignation (SHOCK): ${stats.auditor_resignation}`);
  console.log(`    - Pledge Increase (SHOCK):     ${stats.pledge_increase}`);
  console.log(`    - Pledge Release:              ${stats.pledge_release}`);
  console.log(`    - Unclassified Governance:     ${stats.gov_unclassified}`);
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Backfill failed:', err.message || err);
  process.exit(1);
});
