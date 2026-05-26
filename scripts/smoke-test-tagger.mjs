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
