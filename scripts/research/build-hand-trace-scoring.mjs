#!/usr/bin/env node
//
// BUILD HAND-TRACE SCORING SHEET — auto-fills F1/F3/F4/F6 (the features already in our filings) for the 18 verified
// blow-up CASES + one proposed matched CONTROL each, over the pre-registered window [T0-18m, T0-6m] (a 12-month
// look that ENDS 6 months before the blow-up → respects the §3 min-gap / inevitability guard). Leaves F2 (pledge%)
// and F5 (RPT) blank for the human. Controls are PROPOSED by same-industry + active filing history; mark VERIFY.
//
// BOUNDARY: READ-ONLY. SELECT-only over india_bourse_announcements. Local file output only.
//
// USAGE: node scripts/research/build-hand-trace-scoring.mjs

import { loadEnvFile } from '../_seed-utils.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const __dir = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dir, 'output', 'probe-governance');
const DATA_START = '2024-05-30'; // our filing history floor

// 18 verified KEEP cases with refined admission dates (T0) — from cirp_verify_dump + the 2026-06-26 search validation.
const CASES = [
  ['SIGIND', 'Signet Industries', '2025-06-11'],
  ['GENSOL', 'Gensol Engineering', '2025-06-13'],
  ['PREMIER', 'Premier Ltd', '2025-06-20'],
  ['XLENERGY', 'XL Energy', '2025-06-24'],
  ['MARSHALL', 'Marshall Machines', '2025-08-25'],
  ['AGSTRA', 'AGS Transact Technologies', '2025-09-01'],
  ['RHFL', 'Reliance Home Finance', '2025-09-16'],
  ['FSC', 'Future Supply Chain Solutions', '2025-10-27'],
  ['BILVYAPAR', 'BIL Vyapar (ex-Binani)', '2025-11-13'],
  ['SABEVENTS', 'Sab Events & Governance Now Media', '2025-12-02'],
  ['GOENKA', 'Goenka Diamond & Jewels', '2025-12-10'],
  ['SANCO', 'Sanco Industries', '2025-12-23'],
  ['VIVIMEDLAB', 'Vivimed Labs', '2026-02-13'],
  ['WINSOME', 'Winsome Yarns', '2026-04-17'],
  ['PARSVNATH', 'Parsvnath Developers', '2026-04-30'],
  ['OSIAHYPER', 'Osia Hyper Retail', '2026-05-04'],
  ['ASTRON', 'Astron Paper & Board Mill', '2026-05-15'],
  ['AKSHOPTFBR', 'Aksh Optifibre', '2026-06-20'],
];

// Hand-picked control CANDIDATES per case: same sector, similar (small/mid) size, believed healthy in-window.
// The script picks the FIRST candidate that exists in our filings; all are PROPOSALS to verify/swap by hand.
const CONTROLS = {
  SIGIND: ['APOLLOPIPE', 'PRINCEPIPE', 'CAPTAINP', 'KISAN'],            // PVC pipes / plastics smallcap
  GENSOL: ['KPIGREEN', 'WEBELSOLAR', 'URJA', 'ORIENTGREEN'],            // solar EPC smallcap
  PREMIER: ['GREAVESCOT', 'HINDMOTORS', 'FORCEMOT'],                    // diversified small auto/eng
  XLENERGY: ['WEBELSOLAR', 'URJA', 'KPIGREEN'],                         // solar microcap
  MARSHALL: ['MACPOWER', 'JYOTICNC', 'LMW'],                           // CNC machine tools
  AGSTRA: ['CMSINFO', 'BLS', 'NEWGEN', 'RBLBANK'],                      // ATM / payments / fintech
  RHFL: ['HOMEFIRST', 'AAVAS', 'APTUS', 'CANFINHOME'],                  // housing-finance NBFC
  FSC: ['MAHLOG', 'TCI', 'DELHIVERY', 'BLUEDART'],                      // logistics / 3PL
  BILVYAPAR: ['ORIENTCEM', 'SAGCEM', 'NUVOCO'],                         // cement / holding legacy
  SABEVENTS: ['NAZARA', 'TIPSINDLTD', 'SAREGAMA'],                      // events / media small
  GOENKA: ['GOLDIAM', 'RGL', 'ASIANSTAR', 'PCJEWELLER'],               // diamonds / jewellery smallcap
  SANCO: ['ULTRACAB', 'CORDSCABLE', 'PARACABLES'],                      // wires / cables PVC micro
  VIVIMEDLAB: ['KOPRAN', 'SHILPAMED', 'SMSLIFE', 'MOREPENLAB'],         // pharma / specialty chem smallcap
  WINSOME: ['NITINSPIN', 'SPORTKING', 'ICIL', 'SANGAMIND'],            // cotton yarn / textile
  PARSVNATH: ['ASHIANA', 'MAHLIFE', 'ARIHANTSUP', 'HUBTOWN'],           // realty smallcap
  OSIAHYPER: ['V2RETAIL', 'VMART', 'SHOPERSTOP'],                       // retail micro
  ASTRON: ['SESHAPAPER', 'JKPAPER', 'WSTCSTPAPR', 'SATIA'],            // paper & board smallcap
  AKSHOPTFBR: ['VINDHYATEL', 'PARACABLES', 'BIRLACABLE', 'HFCL'],       // optical fibre / telecom cable
};

const BUCKETS = [
  ['F1_auditor', /auditor/i],
  ['F3_kmp', /chief financial|\bcfo\b|company secretary|key managerial/i],
  ['F4_director', /(director|board).{0,40}(resign|cessation|vacat)|(resign|cessation).{0,20}director/i],
  ['F6_delayed', /delay.{0,30}(result|financ)|non[- ]?submission.{0,30}(result|financ)|extension.{0,20}(result|filing)/i],
];
function flagsIn(texts) {
  const present = {}; const counts = {};
  for (const [n] of BUCKETS) { present[n] = 0; counts[n] = 0; }
  for (const t of texts) for (const [n, re] of BUCKETS) if (re.test(t)) { counts[n]++; present[n] = 1; }
  return { present, counts };
}
function addMonths(dateStr, m) { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + m); return d.toISOString().slice(0, 10); }
function covFrac(winStart, winEnd) {
  const s = winStart < DATA_START ? DATA_START : winStart;
  if (s >= winEnd) return 0;
  const days = (Date.parse(winEnd) - Date.parse(s)) / 86400000;
  const total = (Date.parse(winEnd) - Date.parse(winStart)) / 86400000;
  return total > 0 ? days / total : 0;
}

async function main() {
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('ERROR: DATABASE_URL not set'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  // Exclusion set for controls = every company that ever filed under CIRP (the 89) — never pick a distressed control.
  const { rows: cirp } = await pool.query(
    `SELECT DISTINCT symbol FROM india_bourse_announcements WHERE category ILIKE 'Corporate Insolvency Resolution Process'`);
  const exclude = new Set(cirp.map((r) => r.symbol));

  // Score one symbol over [winStart, winEnd]: pull filing texts in window, classify.
  async function score(symbol, winStart, winEnd) {
    const { rows } = await pool.query(
      `SELECT coalesce(category,'')||' '||coalesce(subject,'') AS txt
         FROM india_bourse_announcements
        WHERE symbol=$1 AND (announced_at AT TIME ZONE 'Asia/Kolkata')::date >= $2
          AND (announced_at AT TIME ZONE 'Asia/Kolkata')::date < $3`, [symbol, winStart, winEnd]);
    return { ...flagsIn(rows.map((r) => r.txt)), nFilings: rows.length };
  }
  // Dominant industry for a symbol.
  async function industryOf(symbol) {
    const { rows } = await pool.query(
      `SELECT coalesce(industry,'') AS ind, count(*) n FROM india_bourse_announcements
        WHERE symbol=$1 AND coalesce(industry,'')<>'' GROUP BY 1 ORDER BY 2 DESC LIMIT 1`, [symbol]);
    return rows[0]?.ind || '';
  }
  // Pick the first hand-picked candidate that exists in our filings (and isn't distressed/used).
  async function proposeControl(caseSymbol, exclSyms) {
    for (const cand of (CONTROLS[caseSymbol] || [])) {
      if (exclude.has(cand) || exclSyms.has(cand)) continue;
      const { rows } = await pool.query(
        `SELECT symbol, max(company_name) AS name, count(*) n FROM india_bourse_announcements
          WHERE symbol=$1 GROUP BY symbol`, [cand]);
      if (rows.length) return rows[0];
    }
    return null;
  }

  const usedControls = new Set();
  const out = [];
  for (const [symbol, name, t0] of CASES) {
    const winStart = addMonths(t0, -18), winEnd = addMonths(t0, -6);
    const ind = await industryOf(symbol);
    const cs1 = await score(symbol, winStart, winEnd);
    const ctrl = await proposeControl(symbol, usedControls);
    if (ctrl) usedControls.add(ctrl.symbol);
    const cscore = ctrl ? await score(ctrl.symbol, winStart, winEnd) : null;
    out.push({ symbol, name, t0, ind, winStart, winEnd, cov: covFrac(winStart, winEnd), cs1, ctrl, cscore });
  }
  await pool.end();

  // Console summary
  console.log(`=== Hand-trace scoring (F1/F3/F4/F6 auto-filled; window [T0-18m, T0-6m]) — READ ONLY ===\n`);
  console.log(`  ${'CASE'.padEnd(12)} ${'T0'.padEnd(11)} ${'cov'.padStart(4)} ${'F1 F3 F4 F6'.padEnd(12)} score | ${'CONTROL(proposed)'.padEnd(13)} F1F3F4F6 score`);
  const dist = (p) => `${p.F1_auditor} ${p.F3_kmp} ${p.F4_director} ${p.F6_delayed}`;
  const sum = (p) => p.F1_auditor + p.F3_kmp + p.F4_director + p.F6_delayed;
  for (const r of out) {
    const cs = `${dist(r.cs1.present)}`.padEnd(12);
    const ctrlS = r.cscore ? `${r.ctrl.symbol.padEnd(13)} ${dist(r.cscore.present)}  ${sum(r.cscore.present)}` : '(no same-industry control found — MANUAL)';
    console.log(`  ${r.symbol.padEnd(12)} ${r.t0.padEnd(11)} ${(Math.round(r.cov * 100) + '%').padStart(4)} ${cs} ${sum(r.cs1.present)}    | ${ctrlS}`);
  }

  // CSV scoring sheet — one row per case + control. Human fills F2_pledge_pct (and optionally F5_rpt).
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const hdr = ['pair_id', 'role', 'symbol', 'company', 'industry', 'T0', 'window_start', 'window_end', 'window_coverage_pct',
    'F1_auditor', 'F3_kmp', 'F4_director', 'F6_delayed', 'partial_score_4', 'F2_pledge_pct__FILL', 'F5_rpt__optional', 'notes'];
  let csv = hdr.join(',') + '\n';
  let pid = 0;
  for (const r of out) {
    pid++;
    const caseRow = ['P' + pid, 'CASE', r.symbol, r.name, r.ind, r.t0, r.winStart, r.winEnd, Math.round(r.cov * 100),
      r.cs1.present.F1_auditor, r.cs1.present.F3_kmp, r.cs1.present.F4_director, r.cs1.present.F6_delayed, sum(r.cs1.present), '', '',
      r.cov < 0.6 ? 'window partly pre-2024 (truncated coverage)' : ''];
    csv += caseRow.map(esc).join(',') + '\n';
    if (r.cscore) {
      const ctrlRow = ['P' + pid, 'CONTROL', r.ctrl.symbol, r.ctrl.name, r.ind, r.t0, r.winStart, r.winEnd, Math.round(r.cov * 100),
        r.cscore.present.F1_auditor, r.cscore.present.F3_kmp, r.cscore.present.F4_director, r.cscore.present.F6_delayed, sum(r.cscore.present), '', '',
        'PROPOSED control — VERIFY same sector/size & no distress; swap if wrong'];
      csv += ctrlRow.map(esc).join(',') + '\n';
    } else {
      csv += ['P' + pid, 'CONTROL', '', '', r.ind, r.t0, r.winStart, r.winEnd, Math.round(r.cov * 100), '', '', '', '', '', '', '', 'NO auto control — pick one by hand (same sector/size)'].map(esc).join(',') + '\n';
    }
  }
  writeFileSync(join(OUTPUT_DIR, 'hand_trace_scoring.csv'), csv);
  console.log(`\n  Wrote ${join(OUTPUT_DIR, 'hand_trace_scoring.csv')}`);
  console.log(`  → Human: fill the F2_pledge_pct column (Screener.in shareholding) for each row; (F5 optional). Then Claude scores + runs kill criteria.`);
}
main().catch((e) => { console.error('failed:', e.message); console.error(e.stack); process.exit(1); });
