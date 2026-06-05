#!/usr/bin/env node
//
// G1 (V2-031c recall) Phase 3 — regression smoke for alias-FORM normalization.
//
// Locks in the deterministic form-fix cases so a future master rebuild can't
// silently regress them: spaced/unspaced leading initials, "&"<->"and",
// HTML-entity decode, Ltd<->Limited. Self-contained (no CSV) — runs
// extractCompanies on hand-picked headlines and asserts include/exclude.
//
// Spec: ai_docs/tasks/G1-alias-form-normalization.md
// Run:  node scripts/smoke-test-tagger-g1-form.mjs
//
// Gate: ALL assertions must pass (recall AND precision). Exit 1 on any failure.

import { extractCompanies } from './_india-market-keywords.mjs';

let pass = 0;
let fail = 0;

function tickersFor(title) {
  return new Set(extractCompanies(title).map((c) => c.ticker));
}

// Assert a ticker IS tagged (recall — the form fix works).
function mustTag(title, ticker, label) {
  const got = tickersFor(title);
  const ok = got.has(ticker);
  log(ok, label, ticker, [...got]);
}

// Assert a ticker is NOT tagged (precision — guards hold).
function mustNotTag(title, ticker, label) {
  const got = tickersFor(title);
  const ok = !got.has(ticker);
  log(ok, label, `NOT ${ticker}`, [...got]);
}

// Assert nothing is tagged at all.
function mustBeEmpty(title, label) {
  const got = tickersFor(title);
  const ok = got.size === 0;
  log(ok, label, '[]', [...got]);
}

function log(ok, label, expected, got) {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}`);
    console.log(`     expected: ${expected} | got: ${got.join(', ') || '(none)'}`);
  }
}

console.log('[g1-form-smoke] === Alias-form recall regression ===');

// — Recall: the new form variants must tag (the fix) —
mustTag('AB Cotspin India consolidated net profit declines 7.11%', 'ABCOTS',
  'spacing collapse: "AB Cotspin" → ABCOTS (the proven case)');
mustTag('L and T wins large infra order from NHAI', 'LT',
  '& ↔ and: "L and T" → LT (post-filter/multi-tag form)');
mustTag('M&amp;M reports strong Q4 tractor sales', 'M&M',
  'HTML entity (named): "M&amp;M" → M&M');
mustTag('M&#38;M Q4 results beat estimates', 'M&M',
  'HTML entity (numeric): "M&#38;M" → M&M');
mustTag('Tata Steel Ltd posts higher quarterly profit', 'TATASTEEL',
  'Ltd ↔ Limited fold: "Tata Steel Ltd" → TATASTEEL');

console.log('[g1-form-smoke] === Precision guards (must NOT over-tag) ===');

// — Precision: form widening must not introduce false positives —
mustNotTag('Sun rises over the Pharma district winter festival', 'SUNPHARMA',
  'no leading-initials over-gen on the word "Sun" (no "S u n")');
mustTag('Sun Pharma Q4 profit rises 26% to Rs 2,714 crore', 'SUNPHARMA',
  'control: the genuine "Sun Pharma" still tags (expand guard intact)');
mustBeEmpty('Bank employees stage a protest march in the city', 'bare "Bank" stays collision-filtered');
mustNotTag('Reliance on cheap imports grows across the sector', 'RELIANCE',
  'bare "Reliance" must not tag (Decision 6a collision filter)');

console.log(`[g1-form-smoke] result: ${pass}/${pass + fail} pass`);
if (fail > 0) {
  console.error('[g1-form-smoke] FAILED — an alias-form case regressed');
  process.exit(1);
}
console.log('[g1-form-smoke] PASSED');
