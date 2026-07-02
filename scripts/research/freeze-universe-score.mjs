#!/usr/bin/env node
//
// FORWARD FREEZE — universe governance scorer (the only skeptic-proof arm; see
// ai_docs/learning/research-notes/2026-07-02_governance-forward-plan.md, Arm A).
//
// WHAT IT DOES: scores EVERY currently-active listed symbol in india_bourse_announcements on the frozen governance
// flag set, over a 12-month window ending on the freeze date, ranks them, and writes a ranked CSV + a manifest with a
// SHA-256 of the CSV. Git-committing those two files = the tamper-proof "seal": a prediction made BEFORE the outcome
// exists, timestamped so it can't be edited. Evaluate at +12 months against new IBBI/NCLT admissions (public data).
//
// WHY: every retrospective test is dismissible as hindsight (flags chosen after seeing the blow-ups). A sealed forward
// prediction is the one thing a skeptic can't wave away. Most likely it CONFIRMS the null (see kill-test RESULT); the
// small chance it doesn't is exactly why it's worth sealing.
//
// FROZEN DESIGN (do not tune after sealing):
//   - Flags = the same 4 keyword buckets as build-hand-trace-scoring.mjs / v1 spec tier-2 (auditor, KMP, director,
//     late-results). Pledge/RPT are OUT of the automated freeze — they live in PDFs, not filing text (listed-only),
//     so this is the ~4-flag headline score by construction. Stated as a limit, not hidden.
//   - Equal weight, binary presence (0..4). No fitted weights, no threshold tuning.
//   - Operating points reported: top-5% of the scored universe, AND score >= 2.
//   - Already-in-CIRP symbols are excluded (we predict FUTURE collapse, not score the already-collapsed).
//
// BOUNDARY: READ-ONLY. SELECT-only over india_bourse_announcements. Local file output only. No DB writes, no DDL.
//
// USAGE: node scripts/research/freeze-universe-score.mjs
//   (requires Railway PG reachable via DATABASE_PUBLIC_URL / DATABASE_URL)

import { loadEnvFile } from '../_seed-utils.mjs';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const __dir = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dir, 'output', 'freeze');

// --- Frozen parameters -------------------------------------------------------
// Freeze date in IST (matches the announced_at → 'Asia/Kolkata' conversion below; avoids the UTC/IST midnight footgun).
const FREEZE_DATE = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // 'YYYY-MM-DD' (IST today)
const LOOKBACK_MONTHS = 12;
function addMonths(dateStr, m) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + m);
  return d.toISOString().slice(0, 10);
}
const WINDOW_START = addMonths(FREEZE_DATE, -LOOKBACK_MONTHS);

// Exact same frozen flag definitions as build-hand-trace-scoring.mjs (keep byte-identical → reproducible seal).
const BUCKETS = [
  ['F1_auditor', /auditor/i],
  ['F3_kmp', /chief financial|\bcfo\b|company secretary|key managerial/i],
  ['F4_director', /(director|board).{0,40}(resign|cessation|vacat)|(resign|cessation).{0,20}director/i],
  ['F6_late', /delay.{0,30}(result|financ)|non[- ]?submission.{0,30}(result|financ)|extension.{0,20}(result|filing)/i],
];

const csvEsc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL not set (Railway PG must be reachable).'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // Exclusion set: every symbol that has EVER filed a CIRP announcement (never score the already-collapsed).
  const { rows: cirp } = await pool.query(
    `SELECT DISTINCT symbol FROM india_bourse_announcements
      WHERE category ILIKE 'Corporate Insolvency Resolution Process' AND symbol IS NOT NULL`);
  const excluded = new Set(cirp.map((r) => r.symbol));

  // One pass: pull every filing in the window (symbol, text, date). Flag detection in JS with the exact frozen
  // regexes above so the score is identical to the hand-trace harness (reproducibility of the seal).
  const { rows } = await pool.query(
    `SELECT symbol,
            coalesce(company_name,'') AS company,
            coalesce(industry,'')     AS industry,
            coalesce(category,'') || ' ' || coalesce(subject,'') AS txt,
            (announced_at AT TIME ZONE 'Asia/Kolkata')::date::text AS d
       FROM india_bourse_announcements
      WHERE symbol IS NOT NULL
        AND (announced_at AT TIME ZONE 'Asia/Kolkata')::date >= $1
        AND (announced_at AT TIME ZONE 'Asia/Kolkata')::date < $2`,
    [WINDOW_START, FREEZE_DATE]);
  // Window is half-open [WINDOW_START, FREEZE_DATE): complete IST days only. Excluding the in-progress freeze day
  // removes intra-day hash drift (the announcements cron keeps appending to "today"). Matches the sibling's < $3.
  await pool.end();

  // Aggregate per symbol.
  const bySym = new Map();
  for (const r of rows) {
    if (excluded.has(r.symbol)) continue;
    let e = bySym.get(r.symbol);
    if (!e) {
      e = { symbol: r.symbol, company: '', industry: '', nFilings: 0, present: {}, firstDate: {} };
      for (const [n] of BUCKETS) { e.present[n] = 0; e.firstDate[n] = ''; }
      bySym.set(r.symbol, e);
    }
    e.nFilings++;
    // Order-INDEPENDENT: keep the lexicographically-smallest non-empty value. (Some symbols carry >1 company_name/
    // industry spelling in-window; Postgres row order isn't guaranteed, so "first seen wins" would break the seal.)
    if (r.company && (!e.company || r.company < e.company)) e.company = r.company;
    if (r.industry && (!e.industry || r.industry < e.industry)) e.industry = r.industry;
    for (const [n, re] of BUCKETS) {
      if (re.test(r.txt)) {
        e.present[n] = 1;
        if (!e.firstDate[n] || r.d < e.firstDate[n]) e.firstDate[n] = r.d; // earliest date the flag fired
      }
    }
  }

  const scored = [...bySym.values()].map((e) => ({
    ...e,
    score: BUCKETS.reduce((s, [n]) => s + e.present[n], 0),
  }));
  // Deterministic order (score desc, then symbol asc) so re-running the same day yields a byte-identical CSV.
  scored.sort((a, b) => (b.score - a.score) || (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0));

  const N = scored.length;
  const top5Cut = Math.max(1, Math.ceil(N * 0.05));

  // --- Write ranked CSV ------------------------------------------------------
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const hdr = ['rank', 'symbol', 'company', 'industry', 'score',
    'F1_auditor', 'F3_kmp', 'F4_director', 'F6_late',
    'F1_date', 'F3_date', 'F4_date', 'F6_date',
    'n_filings', 'flagged_top5pct', 'flagged_score_ge2'];
  let csv = hdr.join(',') + '\n';
  scored.forEach((e, i) => {
    const row = [i + 1, e.symbol, e.company, e.industry, e.score,
      e.present.F1_auditor, e.present.F3_kmp, e.present.F4_director, e.present.F6_late,
      e.firstDate.F1_auditor, e.firstDate.F3_kmp, e.firstDate.F4_director, e.firstDate.F6_late,
      e.nFilings, i < top5Cut ? 1 : 0, e.score >= 2 ? 1 : 0];
    csv += row.map(csvEsc).join(',') + '\n';
  });
  const csvName = `freeze_universe_${FREEZE_DATE}.csv`;
  const csvPath = join(OUTPUT_DIR, csvName);
  writeFileSync(csvPath, csv);
  const sha256 = createHash('sha256').update(readFileSync(csvPath)).digest('hex');

  // --- Write manifest (the pre-registration of the forward test) -------------
  const flaggedTop5 = scored.slice(0, top5Cut).length;
  const flaggedGe2 = scored.filter((e) => e.score >= 2).length;
  const manifest = {
    what: 'Forward FREEZE — sealed governance prediction over the live listed universe.',
    freeze_date: FREEZE_DATE,
    window: { start: WINDOW_START, end_exclusive: FREEZE_DATE, lookback_months: LOOKBACK_MONTHS,
      note: 'half-open [start, end_exclusive) — complete IST days only; the in-progress freeze day is excluded' },
    universe_size: N,
    universe_definition: 'symbols with >=1 filing in the window (excl. already-in-CIRP); NOT every listed name — ' +
      'the +12m base-rate denominator must be computed over this same population',
    excluded_already_in_cirp: excluded.size,
    flag_definitions: BUCKETS.map(([n, re]) => ({ flag: n, regex: re.source })),
    score_formula: 'equal-weight binary presence of the 4 flags (0..4); no fitted weights; no threshold tuning',
    operating_points: { top5pct_cutoff_rank: top5Cut, flagged_top5pct: flaggedTop5, flagged_score_ge2: flaggedGe2 },
    limits: [
      'pledge + RPT are NOT in the automated score (PDF-locked / listed-only) — this is the ~4-flag headline score',
      '~2yr filing depth caps this at a ~12-month-lead "end-of-cycle" monitor, not a 24-month leading indicator',
      'moat caveat: these flags are SEBI Reg-30 24h disclosures — a positive result proves signal exists, not edge',
    ],
    evaluation_rule_preregistered: {
      when: addMonths(FREEZE_DATE, 12),
      how: 'pull NEW IBBI/NCLT admissions + first-default/rating-D events in (freeze_date, +12m] from PUBLIC sources; ' +
           'compute the fraction of the top-5% flagged list that hit an event vs the universe base rate',
      build_signal: 'lift >= 3x base rate with flags dated before the distress event',
      note: 'decided now, before the outcome exists; do not move after seeing 2027 data',
    },
    csv_file: csvName,
    csv_sha256: sha256,
    git_commit: 'FILL AFTER COMMIT (the commit hash + timestamp is the seal)',
    reproducibility: 'Authoritative seal = the committed git blob. Verify via `git show <commit>:<path> | sha256sum`,'
      + ' NOT a working-copy re-hash (core.autocrlf can rewrite line endings — a .gitattributes keeps these files'
      + ' -text) and NOT a re-run (reproduces the hash only if no past-day rows were backfilled between runs).',
  };
  const manifestPath = join(OUTPUT_DIR, `freeze_manifest_${FREEZE_DATE}.json`);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  // --- Console summary -------------------------------------------------------
  const dist = [0, 1, 2, 3, 4].map((s) => `${s}:${scored.filter((e) => e.score === s).length}`).join('  ');
  console.log(`\n=== FORWARD FREEZE — universe governance score (READ ONLY) ===`);
  console.log(`  freeze date : ${FREEZE_DATE}   window: [${WINDOW_START} .. ${FREEZE_DATE}]`);
  console.log(`  universe    : ${N} scored symbols  (excluded already-in-CIRP: ${excluded.size})`);
  console.log(`  score dist  : ${dist}`);
  console.log(`  flagged     : top-5% = ${flaggedTop5} (rank<=${top5Cut}) | score>=2 = ${flaggedGe2}`);
  console.log(`  CSV         : ${csvPath}`);
  console.log(`  manifest    : ${manifestPath}`);
  console.log(`  CSV SHA-256 : ${sha256}`);
  console.log(`\n  → SEAL: git add the two files above + commit. The commit hash + timestamp is the tamper-proof seal.`);
  console.log(`  → EVALUATE at ${addMonths(FREEZE_DATE, 12)} against public IBBI admissions (rule pinned in the manifest).\n`);
}
main().catch((e) => { console.error('failed:', e.message); console.error(e.stack); process.exit(1); });
