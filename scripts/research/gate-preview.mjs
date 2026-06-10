#!/usr/bin/env node

// Local gate + tagger PREVIEW harness (read-only, no DB, no prod).
//
// Purpose: watch a headline pass through the proposed two-stage pipeline —
//   STAGE 1  the GATE   → SPECIFIC | EMPTY   (is this about ONE company?)
//   STAGE 2  the TAGGER → nse_tickers         (only runs if SPECIFIC)
// before any of it is wired into the real pipeline or any gold set is labelled.
//
// This is the heuristic-first gate v1 from the 2026-06-10 problem-solving note
// (ai_docs/learning/research-notes/problem-solving/). Rules-only, no ML.
// relevance_class is deliberately NOT used (it's computed FROM the tagger, so
// using it upstream would be circular — see correction #4 in the note).
//
// Usage:
//   node scripts/research/gate-preview.mjs                 # run the built-in labelled sample (pass/fail)
//   node scripts/research/gate-preview.mjs "Reliance Q3 profit jumps 12%"   # one-off headline(s)
//   node scripts/research/gate-preview.mjs --csv path.csv  # CSV with a `headline` column
//
// Exit code is non-zero if any built-in expected gate_label fails (so it can
// double as the gate's regression test, seeded from the labeling doc examples).

import { readFileSync } from 'node:fs';
import Papa from 'papaparse';
import { evaluate } from './_gate.mjs';

// ── Built-in labelled sample (from the labeling-doc examples) ────────────────
// Doubles as the gate's regression test. expected = gate_label only.

const SAMPLE = [
  // Clear SPECIFIC
  { h: 'Reliance Industries Q3 net profit jumps 12% to ₹19,299 cr', expected: 'SPECIFIC' },
  { h: 'HDFC Bank shares hit all-time high of ₹1,720 on Q3 beat', expected: 'SPECIFIC' },
  { h: 'TCS bags $2 bn multi-year deal from UK insurer Aviva', expected: 'SPECIFIC' },
  { h: 'Infosys raises FY24 revenue guidance to 3.75-4.5%', expected: 'SPECIFIC' },
  { h: 'Maruti Suzuki hikes car prices by 1.6% from April 1', expected: 'SPECIFIC' },
  { h: 'Adani Enterprises FPO subscribed 1.1x on final day', expected: 'SPECIFIC' },
  { h: "L&T's defence arm bags ₹15,000 cr order from Indian Army", expected: 'SPECIFIC' },
  { h: 'Wipro appoints Srini Pallia as new CEO', expected: 'SPECIFIC' },
  { h: 'Suzlon Energy promoter pledges 5% additional stake', expected: 'SPECIFIC' },
  { h: 'Paytm shares tank 20% on RBI restrictions on Paytm Payments Bank', expected: 'SPECIFIC' },
  // Clear EMPTY — macro / index / policy / currency / commodity
  { h: 'Nifty50 ends 213 points lower on FII selling, bank stocks drag', expected: 'EMPTY' },
  { h: 'Sensex rises 500 pts; banking, IT lead broad-based gains', expected: 'EMPTY' },
  { h: "RBI hikes repo rate by 25 bps to 6.75%, retains hawkish stance", expected: 'EMPTY' },
  { h: "India CPI inflation cools to 5.1% in March, within RBI's band", expected: 'EMPTY' },
  { h: 'FIIs pull out ₹8,400 cr from Indian equities in first week of March', expected: 'EMPTY' },
  { h: 'Rupee falls 12 paise to 84.05 against US dollar in early trade', expected: 'EMPTY' },
  { h: 'Crude oil prices rise 2% as OPEC+ extends supply cuts', expected: 'EMPTY' },
  // Listicles — EMPTY
  { h: 'Stocks to watch: HDFC Bank, ICICI, Axis, SBI in focus on Feb 14', expected: 'EMPTY' },
  { h: 'Top 5 banking stocks to buy ahead of Q3 results', expected: 'EMPTY' },
  { h: 'Stocks that hit 52-week highs: Reliance, TCS, Infosys, HDFC Bank', expected: 'EMPTY' },
  // Sector stories that name a company — EMPTY
  { h: "Why HDFC Bank's Q3 may signal a broader consumer slowdown", expected: 'EMPTY' },
  { h: "ITC's hotel demerger: what it means for the FMCG sector", expected: 'EMPTY' },
  { h: 'Banking sector outlook 2024: top picks are ICICI, HDFC, SBI', expected: 'EMPTY' },
  // Calibration set
  { h: 'Tata Motors Q3 JLR margins improve to 15.2%', expected: 'SPECIFIC' },
  { h: 'Why IT stocks are still the top pick for 2024', expected: 'EMPTY' },
  { h: 'Sensex ends flat; consumer durables, realty outperform', expected: 'EMPTY' },
];

// ── Output helpers ───────────────────────────────────────────────────────────

function fmt({ headline, gate, tickers }) {
  const conf = gate.confidence === 'LOW' ? ' ⚠ LOW' : '';
  const tk = tickers.length ? tickers.join(',') : '—';
  return `  ${gate.decision.padEnd(8)} [${gate.rule}]${conf}\n     tickers: ${tk}\n     "${headline}"`;
}

function runSample() {
  console.log('[gate-preview] === Built-in labelled sample (gate_label regression) ===\n');
  let pass = 0;
  let fail = 0;
  const lowConf = [];
  for (const { h, expected } of SAMPLE) {
    const res = evaluate(h);
    const ok = res.gate.decision === expected;
    if (ok) pass++;
    else fail++;
    if (res.gate.confidence === 'LOW') lowConf.push(h);
    console.log(`${ok ? '  ✓' : '  ✗'} expected ${expected}`);
    console.log(fmt(res));
    if (!ok) console.log(`     ^^ MISMATCH`);
    console.log('');
  }
  console.log(`[gate-preview] gate_label: ${pass} pass, ${fail} fail (of ${SAMPLE.length})`);
  console.log(`[gate-preview] LOW-confidence fall-throughs: ${lowConf.length} (these are the review queue)`);
  if (fail > 0) {
    console.error('[gate-preview] FAILED — a gate rule regressed on the labelled sample.');
    process.exit(1);
  }
}

function runHeadlines(headlines) {
  console.log('[gate-preview] === Ad-hoc headlines ===\n');
  for (const h of headlines) {
    console.log(fmt(evaluate(h)));
    console.log('');
  }
}

function runCsv(path) {
  const parsed = Papa.parse(readFileSync(path, 'utf8'), { header: true, skipEmptyLines: true });
  const rows = parsed.data.filter((r) => r.headline);
  console.log(`[gate-preview] === CSV: ${path} (${rows.length} rows) ===\n`);
  let specific = 0;
  let low = 0;
  for (const r of rows) {
    const res = evaluate(r.headline);
    if (res.gate.decision === 'SPECIFIC') specific++;
    if (res.gate.confidence === 'LOW') low++;
    console.log(fmt(res));
    console.log('');
  }
  console.log(`[gate-preview] SPECIFIC: ${specific}/${rows.length} (${((100 * specific) / rows.length).toFixed(1)}%) · LOW-confidence: ${low}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length === 0) {
  runSample();
} else if (args[0] === '--csv') {
  if (!args[1]) {
    console.error('Usage: node scripts/research/gate-preview.mjs --csv <path>');
    process.exit(1);
  }
  runCsv(args[1]);
} else {
  runHeadlines(args);
}
