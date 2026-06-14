#!/usr/bin/env node

// V2-031 Phase 5 — canonical smoke test for the V2-031 tagger.
//
// Three responsibilities (non-zero exit on assertion failure):
//   1. Hardcoded ASSERTIONS — shape, Decision 6(a) collision filter,
//      multi-word survival, Decision 6(b) runtime denylist, INTENTIONAL_MULTI_TAG.
//   2. COVERAGE SWEEP — parse headlines_untagged_sample.csv (papaparse for
//      commas-in-headlines safety), run extractCompanies on each, write
//      g1_dry_run_results.csv (columns: id, headline, tickers, tag_count).
//   3. STDOUT SUMMARY — coverage % + per-headline timing. The per-headline
//      timing feeds the Phase 5 perf gate (Error Scenarios row: if >50ms,
//      switch to combined-alternation regex).
//
// Run: `node scripts/smoke-test-tagger.mjs`
// Also invoked by the Verify section of the task spec.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import Papa from 'papaparse';
import { extractCompanies } from './_india-market-keywords.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SAMPLE_CSV = join(ROOT, 'scripts/research/output/v2-031/headlines_untagged_sample.csv');
const OUT_CSV = join(ROOT, 'scripts/research/output/v2-031/g1_dry_run_results.csv');

// ── Assertion block ─────────────────────────────────────────────────────────

const ASSERTIONS = [
  // Shape — the writer at seed-india-signals.mjs:341,343 reads .ticker AND .name
  {
    name: 'shape: [{name, ticker}] objects with bare ticker',
    headline: 'Reliance Industries Q4 results',
    check: (out) =>
      Array.isArray(out) &&
      out.length === 1 &&
      out[0].ticker === 'RELIANCE' &&
      typeof out[0].name === 'string' &&
      out[0].name.length > 0 &&
      !out[0].ticker.endsWith('.NS'),
  },
  // Decision 6(a) — bare ambiguous forms collision-filtered
  { name: '6a: "Tata announces" → []',     headline: 'Tata announces new strategy',          expected: [] },
  { name: '6a: "Apollo announces" → []',   headline: 'Apollo announces new mission',         expected: [] },
  { name: '6a: "Reliance announces" → []', headline: 'Reliance announces buyback',           expected: [] },
  { name: '6a: "Adani in talks" → []',     headline: 'Adani in talks for new acquisition',   expected: [] },
  { name: '6a: "Bajaj reports" → []',      headline: 'Bajaj reports strong growth',          expected: [] },
  // Multi-word survival
  { name: 'multi: "Tata Steel reports Q4" → [TATASTEEL]',     headline: 'Tata Steel reports Q4 profit',         expected: ['TATASTEEL'] },
  { name: 'multi: "Apollo Hospitals Q4" → [APOLLOHOSP]',      headline: 'Apollo Hospitals Q4 beats estimates',  expected: ['APOLLOHOSP'] },
  { name: 'multi: "Reliance Industries" → [RELIANCE]',        headline: 'Reliance Industries Q4 net profit',    expected: ['RELIANCE'] },
  // Decision 6(b) — runtime denylist context
  { name: '6b: "Lupin the gentleman thief" → []',             headline: 'Lupin the gentleman thief returns',    expected: [] },
  { name: '6b: "Lupin Q4 results" → [LUPIN]',                 headline: 'Lupin Q4 results beat estimates',      expected: ['LUPIN'] },
  { name: '6b: "Page boundaries broken" → []',                headline: 'Page boundaries broken in budget',     expected: [] },
  { name: '6b: "Page Industries Q4" → [PAGEIND]',             headline: 'Page Industries Q4 results',           expected: ['PAGEIND'] },
  // INTENTIONAL_MULTI_TAG — Tata Motors → both TMCV + TMPV (2025-11 demerger)
  { name: 'multi-tag: "Tata Motors Q4" → [TMCV, TMPV]',       headline: 'Tata Motors Q4 profit beats',          expected: ['TMCV', 'TMPV'] },
  // Curly apostrophe normalization — real headlines from copy-edited sources
  { name: 'unicode: curly apostrophe Domino’s → JUBLFOOD', headline: 'Domino’s India launches new menu',  expected: ['JUBLFOOD'] },
  // 2026-06-10 prod FP audit — common-word / first-name / dangling-connector drops.
  // Each pair locks: the FP headline no longer tags, the real reference still does.
  { name: 'audit: coal mine accident → []',                headline: '90 Killed In China Coal Mine Blast',                          expected: [] },
  { name: 'audit: "Coal India Q4" → [COALINDIA]',          headline: 'Coal India Q4 results beat estimates',                        expected: ['COALINDIA'] },
  { name: 'audit: cricket skipper → []',                   headline: 'Proud of the boys: skipper Ruturaj Gaikwad after CSK loss',   expected: [] },
  { name: 'audit: "Skipper Limited order" → [SKIPPER]',    headline: 'Skipper Limited bags transmission tower order',               expected: ['SKIPPER'] },
  { name: 'audit: Rishabh Pant → []',                      headline: 'Rishabh Pant century seals series win for India',             expected: [] },
  { name: 'audit: MPs (parliament) → []',                  headline: 'Now MPs are quitting the Trinamool Congress',                 expected: [] },
  { name: 'audit: "MPS Limited Q4" → [MPSLTD]',            headline: 'MPS Limited Q4 net profit rises 12%',                         expected: ['MPSLTD'] },
  { name: 'audit: NH-44 highway → []',                     headline: '30 Injured as Private Bus Overturns on NH-44 Near Gooty',     expected: [] },
  { name: 'audit: Lt. military rank → []',                 headline: 'President Murmu consoles Lt Shashank Tiwari mother',          expected: [] },
  { name: 'audit: "L&T order" still → [LT]',               headline: 'L&T bags ₹15,000 cr order from Indian Army',                  expected: ['LT'] },
  { name: 'audit: Amarnath Yatra → []',                    headline: 'Amarnath Yatra: tent fares fixed for pilgrims',               expected: [] },
  { name: 'audit: "Yatra Q4 profit" → [YATRA]',            headline: 'Yatra Q4 Profit Tanks 46% YoY To ₹8.2 Cr',                    expected: ['YATRA'] },
  { name: 'audit: Sonam Wangchuk → []',                    headline: 'Sonam Wangchuk detained ahead of Ladakh protest',             expected: [] },
  { name: 'audit: Bank of Japan → []',                     headline: 'Bank of Japan holds rates steady',                            expected: [] },
  { name: 'audit: "Bank of India FD" → [BANKINDIA]',       headline: 'Bank of India raises fixed deposit rates',                    expected: ['BANKINDIA'] },
  { name: 'audit: Axis My India poll → []',                headline: 'BJP dominant for 20 years: Axis My India survey',             expected: [] },
  { name: 'audit: "Axis named best bank" → [AXISBANK]',    headline: 'FE Best Bank Awards: Axis named best digital bank',           expected: ['AXISBANK'] },
  { name: 'audit: Trident Hotels → []',                    headline: '8 reasons business travellers choose Trident Hotels',         expected: [] },
  { name: 'audit: Sumeet Bagadia column → []',             headline: 'Breakout stocks: Sumeet Bagadia recommends five shares',      expected: [] },
  // Gate-leak audit (2026-06-11): coastal common-word + "to NDTV" channel context
  { name: 'audit: coastal road project → []',              headline: 'Citizens protest felling of trees for Coastal Road project',  expected: [] },
  { name: 'audit: "Coastal Corporation Q4" → [COASTCORP]', headline: 'Coastal Corporation Q4 net profit rises on shrimp exports',    expected: ['COASTCORP'] },
  { name: 'audit: "to NDTV" channel → []',                 headline: '"Public Won\'t Trust Raghav Chadha Again": Bhagwant Mann To NDTV', expected: [] },
  { name: 'audit: exam results "to NDTV" → []',            headline: 'JEE Advanced Results To Be Synchronised With CBSE: Minister To NDTV', expected: [] },
  { name: 'audit: "NDTV Q4 profit" → [NDTV]',              headline: 'NDTV Q4 net profit rises 18% on ad revenue',                  expected: ['NDTV'] },
  // Long-tail audit (2026-06-11): surname/place/common-word/foreign-co collisions
  { name: 'audit: Sunil Bharti Mittal → []',               headline: 'UK unlikely to allow Sunil Bharti Mittal to raise BT stake',   expected: [] },
  { name: 'audit: Apex Court → []',                        headline: 'SC Collegium recommends J&K CJ elevation to Apex Court',       expected: [] },
  { name: 'audit: super speciality hospital → []',         headline: 'Mahabubnagar still awaits super speciality hospital',          expected: [] },
  { name: 'audit: Aakash Chopra (cricket) → []',           headline: 'CSK vs SRH could be a knockout, says Aakash Chopra',           expected: [] },
  { name: 'audit: Nvidia and AMD → []',                    headline: 'US tightens export limits on Nvidia and AMD',                  expected: [] },
  { name: 'audit: "AMD Industries Q4" → [AMDIND]',         headline: 'AMD Industries Q4 net profit rises on packaging demand',       expected: ['AMDIND'] },
];

function runAssertions() {
  let pass = 0;
  let fail = 0;
  for (const a of ASSERTIONS) {
    const out = extractCompanies(a.headline);
    let ok;
    if (a.check) {
      ok = a.check(out);
    } else {
      const got = out.map((c) => c.ticker).sort();
      const want = [...a.expected].sort();
      ok = got.length === want.length && got.every((t, i) => t === want[i]);
    }
    if (ok) {
      pass++;
      console.log(`  ✓ ${a.name}`);
    } else {
      fail++;
      console.log(`  ✗ ${a.name}`);
      console.log(`     got: ${JSON.stringify(out.map((c) => c.ticker))}`);
      if (a.expected) console.log(`     want: ${JSON.stringify(a.expected)}`);
    }
  }
  return { pass, fail };
}

// ── Coverage sweep ──────────────────────────────────────────────────────────

function runCoverageSweep() {
  const csv = readFileSync(SAMPLE_CSV, 'utf8');
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    console.warn(`[smoke] CSV parse warnings: ${parsed.errors.slice(0, 3).map((e) => e.message).join('; ')}`);
  }
  const rows = parsed.data;

  const results = [];
  let tagged = 0;
  const t0 = performance.now();
  for (const r of rows) {
    const out = extractCompanies(r.headline || '');
    const tickers = out.map((c) => c.ticker);
    if (tickers.length > 0) tagged++;
    results.push({
      id: r.id,
      headline: r.headline,
      tickers: tickers.join(';'),
      tag_count: tickers.length,
    });
  }
  const elapsed = performance.now() - t0;

  const outCsv = Papa.unparse(results, { columns: ['id', 'headline', 'tickers', 'tag_count'] });
  writeFileSync(OUT_CSV, outCsv + '\n');

  return {
    total: rows.length,
    tagged,
    elapsedMs: elapsed,
    perHeadlineMs: rows.length > 0 ? elapsed / rows.length : 0,
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('[smoke] === Assertion block ===');
  const { pass, fail } = runAssertions();
  console.log(`[smoke] assertions: ${pass} pass, ${fail} fail`);
  if (fail > 0) {
    console.error('[smoke] FAILED — fix the tagger before relying on the coverage number');
    process.exit(1);
  }

  console.log('[smoke] === Coverage sweep ===');
  const sweep = runCoverageSweep();
  const coveragePct = sweep.total > 0 ? ((100 * sweep.tagged) / sweep.total).toFixed(2) : '0.00';
  console.log(`[smoke] Dry-run coverage: ${coveragePct}% (${sweep.tagged}/${sweep.total}) · per-headline avg: ${sweep.perHeadlineMs.toFixed(2)} ms`);
  console.log(`[smoke] results written: ${OUT_CSV}`);

  if (sweep.perHeadlineMs > 50) {
    console.warn('[smoke] WARN: per-headline > 50 ms — Phase 5 perf gate trips. See Error Scenarios row in V2-031 spec: switch to combined-alternation regex.');
  }
}

main();
