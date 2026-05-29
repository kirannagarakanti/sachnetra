#!/usr/bin/env node
//
// Exp 11 — V2-031 recall diagnosis (read-only).
//
// The headline coverage gate (≥20%) is measured against ALL india_news_signals
// rows, but the tagger runs extractCompanies() on every headline with NO
// market-relevance pre-filter (seed-india-signals.mjs:329/341). So the denominator
// is polluted by sports / weather / crime / politics headlines that mention no
// listed company. This script splits coverage by the stored is_market_moving flag
// and relevance_class to separate "tagger has low recall" from "most headlines
// simply aren't about listed companies", and samples untagged-but-market-moving
// rows to expose genuine alias/master gaps.
//
// BOUNDARY: strictly read-only. SELECTs only, no writes, no DDL.
//
// USAGE
//   node scripts/research/exp11-recall-diagnosis.mjs

import { loadEnvFile } from '../_seed-utils.mjs';
import pg from 'pg';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnvFile(import.meta.url);
const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'output', 'exp11');
const OUT_PATH = join(OUT_DIR, 'recall_diagnosis.md');

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL not set in .env.local'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  const lines = [];
  const emit = (s = '') => { console.log(s); lines.push(s); };
  const pct = (n, d) => (d > 0 ? (100 * n / d).toFixed(2) + '%' : 'n/a');

  try {
    emit('# Exp 11 — V2-031 Recall Diagnosis');
    emit('');
    emit(`*Generated: ${new Date().toISOString()}*`);
    emit('*Source: `scripts/research/exp11-recall-diagnosis.mjs` (read-only)*');
    emit('');

    // ── 1: coverage split by market-relevance ───────────────────────────
    emit('## 1 — Coverage split by is_market_moving (the real denominator)');
    emit('');
    for (const [label, intv] of [['24h', '24 hours'], ['7d', '7 days']]) {
      const r = await pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE is_market_moving) AS mm,
          COUNT(*) FILTER (WHERE COALESCE(array_length(nse_tickers,1),0)>0) AS tagged,
          COUNT(*) FILTER (WHERE is_market_moving AND COALESCE(array_length(nse_tickers,1),0)>0) AS mm_tagged,
          COUNT(*) FILTER (WHERE NOT is_market_moving AND COALESCE(array_length(nse_tickers,1),0)>0) AS nonmm_tagged
        FROM india_news_signals
        WHERE published_at >= NOW() - INTERVAL '${intv}'
      `);
      const x = r.rows[0];
      emit(`### ${label}`);
      emit('```');
      emit(`total rows:                 ${x.total}`);
      emit(`market-moving rows:         ${x.mm}  (${pct(x.mm, x.total)} of all)`);
      emit(`tagged rows (all):          ${x.tagged}  (${pct(x.tagged, x.total)} headline coverage ← the gate)`);
      emit(`tagged & market-moving:     ${x.mm_tagged}`);
      emit(`→ RECALL among market-moving: ${pct(x.mm_tagged, x.mm)}   <-- the meaningful number`);
      emit(`tagged but NOT market-moving: ${x.nonmm_tagged}  (${pct(x.nonmm_tagged, x.tagged)} of tags — leakage/FP risk)`);
      emit('```');
      emit('');
    }

    // ── 2: coverage by relevance_class (7d) ─────────────────────────────
    emit('## 2 — Coverage by relevance_class (last 7 days)');
    emit('');
    const rc = await pool.query(`
      SELECT
        COALESCE(relevance_class,'(null)') AS rc,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE(array_length(nse_tickers,1),0)>0)::int AS tagged
      FROM india_news_signals
      WHERE published_at >= NOW() - INTERVAL '7 days'
      GROUP BY 1 ORDER BY total DESC
    `);
    emit('```');
    emit('relevance_class       total   tagged  coverage');
    emit('────────────────────  ──────  ──────  ────────');
    for (const r of rc.rows) {
      emit(`${String(r.rc).padEnd(20)}  ${String(r.total).padStart(6)}  ${String(r.tagged).padStart(6)}  ${pct(r.tagged, r.total)}`);
    }
    emit('```');
    emit('');

    // ── 3: top sources by volume — market% and tag% (7d) ────────────────
    emit('## 3 — Top 25 sources by volume (last 7 days)');
    emit('');
    const src = await pool.query(`
      SELECT
        COALESCE(NULLIF(source_name,''),'(blank)') AS source,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_market_moving)::int AS mm,
        COUNT(*) FILTER (WHERE COALESCE(array_length(nse_tickers,1),0)>0)::int AS tagged
      FROM india_news_signals
      WHERE published_at >= NOW() - INTERVAL '7 days'
      GROUP BY 1 ORDER BY total DESC LIMIT 25
    `);
    emit('```');
    emit('source                       total   mm%     tag%');
    emit('───────────────────────────  ──────  ──────  ──────');
    for (const r of src.rows) {
      emit(`${String(r.source).slice(0,27).padEnd(27)}  ${String(r.total).padStart(6)}  ${pct(r.mm, r.total).padStart(6)}  ${pct(r.tagged, r.total).padStart(6)}`);
    }
    emit('```');
    emit('');

    // ── 4: untagged BUT market-moving sample (recall gaps) ──────────────
    emit('## 4 — Untagged but market-moving — recall-gap sample (30 rows, 48h)');
    emit('');
    emit('*These passed the market-moving filter but got no ticker. Eyeball: is there a listed company in the headline the master missed (alias gap), or is is_market_moving over-firing?*');
    emit('');
    const gaps = await pool.query(`
      SELECT headline, source_name, relevance_class, event_type
      FROM india_news_signals
      WHERE published_at >= NOW() - INTERVAL '48 hours'
        AND is_market_moving
        AND COALESCE(array_length(nse_tickers,1),0)=0
      ORDER BY RANDOM() LIMIT 30
    `);
    emit('| # | headline | class | event | source |');
    emit('|---|---|---|---|---|');
    gaps.rows.forEach((r, i) => {
      const h = String(r.headline ?? '').replace(/\|/g, '\\|').slice(0, 150);
      emit(`| ${i + 1} | ${h} | ${r.relevance_class ?? ''} | ${r.event_type ?? ''} | ${r.source_name ?? ''} |`);
    });
    if (gaps.rows.length === 0) emit('| — | (none) | | | |');
    emit('');

    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_PATH, lines.join('\n') + '\n', 'utf8');
    console.log('');
    console.log(`✓ Saved: ${OUT_PATH}`);
  } finally {
    await pool.end();
  }
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
