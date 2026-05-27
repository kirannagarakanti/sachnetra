#!/usr/bin/env node
//
// V2-031b Phase 3 — regression smoke test against prod sample headlines.
//
// Reads scratch/v2-031b_regression_checklist.csv (30 rows from coverage_check §11.3),
// runs extractCompanies on each headline_snippet, compares to v2_expected_result.
//
// Gate: ≥27/30 pass (90%).
//
// Run: node scripts/smoke-test-tagger-v2-031b.mjs

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import { extractCompanies } from './_india-market-keywords.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CHECKLIST_CSV = join(ROOT, 'scratch/v2-031b_regression_checklist.csv');
const PASS_THRESHOLD = 27;

// Post-demerger: headlines say "Tata Motors" but NSE tickers are TMCV + TMPV.
const TICKER_EQUIVALENTS = {
  TATAMOTORS: ['TMCV', 'TMPV'],
};

function parseTickerList(s) {
  if (!s || !String(s).trim()) return [];
  return String(s)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function expandExpected(tickers) {
  const out = new Set();
  for (const t of tickers) {
    out.add(t);
    for (const alt of TICKER_EQUIVALENTS[t] || []) {
      out.add(alt);
    }
  }
  return out;
}

function evaluateRow(row) {
  const headline = row.headline_snippet || '';
  const got = extractCompanies(headline).map((c) => c.ticker);
  const gotSet = new Set(got);
  const expectedKind = row.v2_expected_result?.trim();
  const correct = parseTickerList(row.correct_tickers);
  const fpTicker = row.tagged_ticker?.trim();

  if (expectedKind === 'OK_NOT_TAGGED') {
    if (got.length === 0) return { ok: true, got, note: 'empty' };
    if (fpTicker && gotSet.has(fpTicker)) {
      return { ok: false, got, note: `false positive ticker ${fpTicker} still tagged` };
    }
    return { ok: true, got, note: 'no FP ticker (other tags ignored)' };
  }

  if (expectedKind === 'TP' || expectedKind === 'TP_FULL') {
    const need = expandExpected(correct);
    const missing = [...need].filter((t) => !gotSet.has(t));
    // All *correct_tickers* entries (or their equivalents) must appear in output.
    // For TP_FULL, correct lists required tickers; equivalents satisfy retired symbols.
    const requiredBase = correct.filter((t) => {
      const alts = TICKER_EQUIVALENTS[t];
      if (!alts) return !gotSet.has(t);
      return !alts.some((a) => gotSet.has(a));
    });
    if (requiredBase.length === 0) {
      return { ok: true, got, note: expectedKind };
    }
    return { ok: false, got, note: `missing ${requiredBase.join(', ')}` };
  }

  return { ok: false, got, note: `unknown v2_expected_result: ${expectedKind}` };
}

function main() {
  const csv = readFileSync(CHECKLIST_CSV, 'utf8');
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    console.warn('[v2-031b-smoke] CSV parse warnings:', parsed.errors.slice(0, 3));
  }

  const rows = parsed.data;
  let pass = 0;
  let fail = 0;
  const failures = [];

  console.log('[v2-031b-smoke] === Regression checklist (30 prod sample rows) ===');
  for (const row of rows) {
    const { ok, got, note } = evaluateRow(row);
    const label = `row ${row.id}: ${(row.headline_snippet || '').slice(0, 55)}…`;
    if (ok) {
      pass++;
      console.log(`  ✓ ${label}`);
    } else {
      fail++;
      failures.push({ row, got, note });
      console.log(`  ✗ ${label}`);
      console.log(`     expected: ${row.v2_expected_result} | correct: ${row.correct_tickers}`);
      console.log(`     got: ${got.join(', ') || '(none)'} | ${note}`);
    }
  }

  console.log(`[v2-031b-smoke] result: ${pass}/${rows.length} pass (need ≥${PASS_THRESHOLD})`);
  if (fail > 0) {
    console.log('[v2-031b-smoke] failures:');
    for (const f of failures) {
      console.log(`  - id ${f.row.id}: ${f.note}`);
    }
  }

  if (pass < PASS_THRESHOLD) {
    console.error('[v2-031b-smoke] FAILED — below 90% gate');
    process.exit(1);
  }

  console.log('[v2-031b-smoke] PASSED');
}

main();
