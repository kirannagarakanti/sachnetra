#!/usr/bin/env node
//
// GOVERNANCE RE-ANCHOR PROBE (read-only) — the red-team's cheap "earn-the-null" test.
//
// The kill test stopped at a roster blocker and never computed a number. This does the fix the panel converged on:
// re-anchor the clock from NCLT admission to the FIRST public DISTRESS event (default disclosure / rating-to-D) on the
// LISTED universe (india_bourse_announcements), which yields many more datable events than NCLT admissions, then
// compute the pre-registered SPECIFICITY:
//     S = (in-window governance-flag rate among distress cases) − (rate among matched survivor controls)
// Window = [T0*-18m, T0*-6m]. Because the window ENDS 6m before T0*, any in-window flag "leads" by >=6m by
// construction — so lead-time L is degenerate here and the honest signal is S (do failing names carry more
// governance friction BEFORE the distress event than survivors?). Pre-registered read: S>=0.3 = signal; S<0.3 = null.
//
// HONEST LIMITS: (1) distress labels are text-matched (counts + samples printed for audit — not a clean registry);
// (2) pledge/RPT (the only flags that plausibly lead) are NOT in filing text, so this tests the 4 keyword flags only;
// (3) the 2024-05-30 data floor still truncates windows for pre-2026 events → coverage filter applied and reported.
//
// BOUNDARY: READ-ONLY. Seed 6119. Exploratory probe, not a sealed result.
// USAGE: node scripts/research/governance-reanchor-probe.mjs

import { loadEnvFile } from '../_seed-utils.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const __dir = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dir, 'output', 'probe-governance');
const DATA_FLOOR = '2024-05-30';
const SEED = 6119;
const N_CONTROLS = 250;
const MIN_COVERAGE = 0.5;

// Same frozen 4 flag buckets as the hand-trace / freeze scorer.
const BUCKETS = [
  ['F1_auditor', /auditor/i],
  ['F3_kmp', /chief financial|\bcfo\b|company secretary|key managerial/i],
  ['F4_director', /(director|board).{0,40}(resign|cessation|vacat)|(resign|cessation).{0,20}director/i],
  ['F6_late', /delay.{0,30}(result|financ)|non[- ]?submission.{0,30}(result|financ)|extension.{0,20}(result|filing)/i],
];
// First-public-distress detector (text-based; audited by printed counts/samples).
const DISTRESS = /default (in|on).{0,25}(payment|repayment|servicing|financial|debt|interest|principal|obligation)|delay(ed)? in (payment|repayment|debt servicing)|\bSARFAESI\b|declared.{0,12}NPA|rating.{0,40}(downgrad|revis|assign).{0,25}\bD\b|to (CARE|ICRA|CRISIL|IND|Brickwork)[ -]?D\b|rated.{0,10}\bD\b|default grade/i;

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function addMonths(d, m) { const x = new Date(d + 'T00:00:00Z'); x.setUTCMonth(x.getUTCMonth() + m); return x.toISOString().slice(0, 10); }
function coverage(winStart, winEnd) { const s = winStart < DATA_FLOOR ? DATA_FLOOR : winStart; if (s >= winEnd) return 0; return (Date.parse(winEnd) - Date.parse(s)) / (Date.parse(winEnd) - Date.parse(winStart)); }

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // 1) CIRP set (exclude from controls) + all symbols (for control pool).
  const { rows: cirp } = await pool.query(
    `SELECT DISTINCT symbol FROM india_bourse_announcements WHERE category ILIKE 'Corporate Insolvency Resolution Process' AND symbol IS NOT NULL`);
  const cirpSet = new Set(cirp.map((r) => r.symbol));

  // 2) Distress CASES: earliest text-matched distress event per symbol.
  const { rows: distressRows } = await pool.query(
    `SELECT symbol,
            (announced_at AT TIME ZONE 'Asia/Kolkata')::date::text AS d,
            coalesce(category,'') || ' | ' || coalesce(subject,'') AS txt
       FROM india_bourse_announcements
      WHERE symbol IS NOT NULL
        AND (coalesce(category,'') || ' ' || coalesce(subject,'')) ~* $1`, [DISTRESS.source]);
  const caseT0 = new Map(); const sample = [];
  for (const r of distressRows) {
    if (!caseT0.has(r.symbol) || r.d < caseT0.get(r.symbol)) caseT0.set(r.symbol, r.d);
    if (sample.length < 12) sample.push(`${r.symbol} ${r.d}  ${r.txt.slice(0, 90)}`);
  }
  console.log(`\n=== GOVERNANCE RE-ANCHOR PROBE (read-only, seed ${SEED}) ===`);
  console.log(`Distress-event companies detected (text-matched): ${caseT0.size}  (rows: ${distressRows.length})`);
  console.log(`Sample matched events (AUDIT these — is the label real?):`);
  for (const s of sample) console.log('   ' + s);

  // Score one symbol's window [t0-18m, t0-6m]: returns {present:{...}, any:0/1}.
  async function scoreWindow(symbol, t0) {
    const winStart = addMonths(t0, -18), winEnd = addMonths(t0, -6);
    const { rows } = await pool.query(
      `SELECT coalesce(category,'') || ' ' || coalesce(subject,'') AS txt
         FROM india_bourse_announcements
        WHERE symbol=$1 AND (announced_at AT TIME ZONE 'Asia/Kolkata')::date >= $2
          AND (announced_at AT TIME ZONE 'Asia/Kolkata')::date < $3`, [symbol, winStart, winEnd]);
    const present = {}; let any = 0;
    for (const [n] of BUCKETS) present[n] = 0;
    for (const { txt } of rows) for (const [n, re] of BUCKETS) if (re.test(txt)) { present[n] = 1; }
    for (const [n] of BUCKETS) any = any || present[n];
    return { present, any, cov: coverage(winStart, winEnd), nFilings: rows.length, winStart, winEnd };
  }

  // 3) Score CASES (keep only adequate-coverage ones).
  const cases = [];
  for (const [symbol, t0] of caseT0) {
    const sc = await scoreWindow(symbol, t0);
    cases.push({ symbol, t0, ...sc });
  }
  const casesOK = cases.filter((c) => c.cov >= MIN_COVERAGE);

  // 4) CONTROLS: symbols with NO distress event and not CIRP; sample N; assign seeded pseudo-T0* from case dates.
  const { rows: allSyms } = await pool.query(
    `SELECT DISTINCT symbol FROM india_bourse_announcements WHERE symbol IS NOT NULL`);
  const pool0 = allSyms.map((r) => r.symbol).filter((s) => !caseT0.has(s) && !cirpSet.has(s)).sort();
  const rnd = mulberry32(SEED);
  // seeded shuffle
  for (let i = pool0.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool0[i], pool0[j]] = [pool0[j], pool0[i]]; }
  const caseDates = [...caseT0.values()];
  const controls = [];
  for (const symbol of pool0.slice(0, N_CONTROLS)) {
    const pseudoT0 = caseDates[Math.floor(rnd() * caseDates.length)];
    const sc = await scoreWindow(symbol, pseudoT0);
    controls.push({ symbol, t0: pseudoT0, ...sc });
  }
  const controlsOK = controls.filter((c) => c.cov >= MIN_COVERAGE);
  await pool.end();

  // 5) Compute S + the 2x2 + per-flag rates.
  const rate = (arr) => arr.length ? arr.filter((c) => c.any).length / arr.length : 0;
  const caseRate = rate(casesOK), ctrlRate = rate(controlsOK), S = caseRate - ctrlRate;
  const perFlag = BUCKETS.map(([n]) => ({
    flag: n,
    case_rate: casesOK.length ? +(casesOK.filter((c) => c.present[n]).length / casesOK.length).toFixed(3) : 0,
    ctrl_rate: controlsOK.length ? +(controlsOK.filter((c) => c.present[n]).length / controlsOK.length).toFixed(3) : 0,
  }));
  const twoByTwo = {
    case_flag: casesOK.filter((c) => c.any).length, case_noflag: casesOK.filter((c) => !c.any).length,
    ctrl_flag: controlsOK.filter((c) => c.any).length, ctrl_noflag: controlsOK.filter((c) => !c.any).length,
  };

  const verdict = S >= 0.3 ? 'SIGNAL (S>=0.3) — cases carry more governance friction than survivors'
    : 'NULL (S<0.3) — no specificity; the null is now EARNED, not asserted';

  console.log(`\n--- RESULT ---`);
  console.log(`cases (adequate coverage >=${MIN_COVERAGE}): ${casesOK.length} of ${cases.length}`);
  console.log(`controls (adequate coverage):               ${controlsOK.length} of ${controls.length}`);
  console.log(`case  in-window any-flag rate: ${caseRate.toFixed(3)}`);
  console.log(`ctrl  in-window any-flag rate: ${ctrlRate.toFixed(3)}`);
  console.log(`S (case − ctrl):              ${S.toFixed(3)}   → ${verdict}`);
  console.log(`2x2  cases[flag/noflag]=${twoByTwo.case_flag}/${twoByTwo.case_noflag}  controls[flag/noflag]=${twoByTwo.ctrl_flag}/${twoByTwo.ctrl_noflag}`);
  console.log(`per-flag rates:`); for (const p of perFlag) console.log(`   ${p.flag.padEnd(12)} case ${p.case_rate}  ctrl ${p.ctrl_rate}`);
  console.log(`\nNOTE: lead-time L is window-degenerate (window ends T0*-6m). Pledge/RPT not in text → 4-flag test only.`);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, 'reanchor_probe.json'), JSON.stringify({
    seed: SEED, data_floor: DATA_FLOOR, min_coverage: MIN_COVERAGE,
    distress_companies: caseT0.size, cases_adequate: casesOK.length, controls_adequate: controlsOK.length,
    case_rate: +caseRate.toFixed(3), ctrl_rate: +ctrlRate.toFixed(3), S: +S.toFixed(3), verdict,
    two_by_two: twoByTwo, per_flag: perFlag,
    caveats: ['text-matched distress label (audit sample)', 'pledge/RPT absent — 4 keyword flags only',
      'lead-time L window-degenerate', '2024-05-30 floor truncates pre-2026 windows'],
    sample_events: sample,
  }, null, 2) + '\n');
  console.log(`\nWrote ${join(OUTPUT_DIR, 'reanchor_probe.json')}`);
}
main().catch((e) => { console.error('failed:', e.message); console.error(e.stack); process.exit(1); });
