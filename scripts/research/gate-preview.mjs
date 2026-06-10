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
import { extractCompanies } from '../_india-market-keywords.mjs';

// ── Gate rule cascade (EMPTY first, then SPECIFIC) ───────────────────────────
// Each rule: { id, test(lc, headline) -> bool }. Evaluated top-to-bottom;
// first match wins. lc = lowercased headline.

const EMPTY_RULES = [
  {
    id: 'E1_LISTICLE_HEADER',
    // Listicle framing at the START of the headline (or colon-prefixed).
    test: (lc) =>
      /^\s*(stocks?\s+to\s+(watch|buy|sell|avoid)|stocks?\s+in\s+focus|in\s+focus\s+today|top\s+\d+\s+[a-z& ]*\b(stocks?|picks?)|top\s+(stock\s+)?picks?|q[1-4]\s+results?\s+today|stocks?\s+that\s+(hit|hits)|\d+\s+(stocks?|reasons?))\b/i.test(lc) ||
      /^[^:]{0,40}:\s*(stocks?\s+to\s+watch|top\s+picks?|in\s+focus)\b/i.test(lc),
  },
  {
    id: 'E2_MACRO_INDEX_POLICY',
    test: (lc) =>
      /\b(nifty\s*50|nifty\s+(it|pharma|auto|bank|realty|fmcg|metal)|nifty|sensex|bank\s+nifty|bankex)\b/i.test(lc) ||
      /\b(rbi|repo\s*rate|repo|mpc|monetary\s+policy|policy\s+rate)\b/i.test(lc) ||
      /\b(cpi|wpi|gdp|fiscal\s+deficit|current\s+account\s+deficit|inflation)\b/i.test(lc) ||
      /\b(union\s+budget|interim\s+budget|finance\s+bill)\b/i.test(lc) ||
      /\b(fiis?|fpis?|diis?|foreign\s+portfolio|domestic\s+institutional)\b/i.test(lc) ||
      /\bsebi\s+(circular|order\s+on|guidelines|norms)\b/i.test(lc),
  },
  {
    id: 'E3_CURRENCY_COMMODITY',
    test: (lc) =>
      /\brupee\b.*\b(against|rises?|falls?|weakens?|strengthens?|gains?|loses?|paise)\b/i.test(lc) ||
      /\b(crude|gold|silver|natural\s+gas|copper|brent)\b.*\b(price|prices|rate|rates|rises?|falls?)\b/i.test(lc),
  },
  {
    id: 'E4_SECTOR_FRAMING',
    test: (lc) =>
      /\bwhat\s+(it|this)\s+means\s+for\b/i.test(lc) ||
      /\bimpact\s+on\s+(the\s+)?\w+\s+sector\b/i.test(lc) ||
      /\b(broader|broad-based)\b/i.test(lc) ||
      /\bmay\s+signal\b/i.test(lc) ||
      /\bsign\s+of\s+things\s+to\s+come\b/i.test(lc) ||
      /\b(banking|it|pharma|auto|fmcg|infra|metal|realty|energy|oil\s*&\s*gas|consumer)\s+sector\b/i.test(lc) ||
      /\b(banking|it|pharma|auto|fmcg|infra|metal|realty)\s+(stocks|majors|companies|outlook)\b/i.test(lc),
  },
  {
    id: 'E5_GENERIC_MARKET',
    test: (lc) =>
      /^(markets?|shares?|stocks?|equities|indices)\b.*\b(end|ends|close|closes|open|opens|recover|edge\s+up|edge\s+down|gain|gains|lose|loses|tank|surge|flat)\b/i.test(lc),
  },
];

const SPECIFIC_RULES = [
  {
    id: 'S1_RESULTS',
    test: (lc) =>
      /\bq[1-4]\b.*\b(results?|earnings?|numbers?|pat|profit|revenue|ebitda|net\s+profit)\b/i.test(lc) ||
      /\b(fy\d{2}|annual)\s+(results?|earnings?|report|numbers?)\b/i.test(lc) ||
      /\b(beats?|misses?|meets?)\s+(estimates?|expectations?)\b/i.test(lc) ||
      /\b(pat|net\s+profit|revenue|ebitda)\s+(up|down|jumps?|rises?|falls?|drops?|grows?)\b/i.test(lc),
  },
  {
    id: 'S2_CORPORATE_ACTION',
    test: (lc) =>
      /\b(acquires?|acquisition\s+of|to\s+acquire|merges?\s+with|merger\s+with|divests?|stake\s+sale|buyback|fpo|ipo|rights\s+issue|preferential\s+allotment|fundraise|qip)\b/i.test(lc) ||
      /\b(board\s+approves?|board\s+meeting|board\s+meet|agm|egm|postal\s+ballot)\b/i.test(lc) ||
      /\b(appoints?|names?|elevates?)\s+.*\b(ceo|cfo|md|chairman|chro)\b/i.test(lc) ||
      /\b(ceo|cfo|md|chairman)\s+(steps?\s+down|resigns?|quits?|to\s+step\s+down)\b/i.test(lc) ||
      /\b(interim|final|special)?\s*dividend\b/i.test(lc),
  },
  {
    id: 'S3_ORDER_WIN',
    test: (lc) =>
      /\b(bags?|wins?|secures?|gets?|lands?)\s+.*\b(order|deal|contract|mandate|loa)\b/i.test(lc) ||
      /\border\s+worth\b/i.test(lc) ||
      /\bcontract\s+from\b/i.test(lc),
  },
  {
    id: 'S4_FORWARD_ACTION',
    test: (lc) =>
      /\b(to|will|plans?\s+to|may|likely\s+to|expected\s+to|set\s+to)\s+(invest|raise|expand|set\s+up|launch|open|enter|build|hike|cut|acquire|merge|appoint|recruit|hire|file|seek|list)\b/i.test(lc) ||
      /\b(announces?|unveils?|launches?|introduces?|releases?)\b/i.test(lc),
  },
  {
    id: 'S5_PRICE_ACTION',
    test: (lc) =>
      /\b(shares?|stock)\s+(rise|rises|fall|falls|gain|gains|lose|loses|jump|jumps|tank|tanks|surge|surges|slip|slips|climb|climbs|drop|drops|rally|rallies|sink|sinks)\b/i.test(lc) ||
      /\b(shares?|stock)\s+(hit|hits|touch|touches|at|above|below)\s+.*(52-week|all-time|record)\b/i.test(lc) ||
      /\b(shares?|stock)\s+(hit|hits)\s+.*(high|low)\b/i.test(lc),
  },
];

// ── Gate decision ────────────────────────────────────────────────────────────
// Returns { decision, rule, confidence }. Tie-break: a listicle header (E1)
// normally → EMPTY, UNLESS exactly one company is named (a "listicle of one"
// is functionally a single-company story) — then fall through to SPECIFIC.

function runGate(headline, companyCount) {
  const lc = headline.toLowerCase();

  // A strong single-company subject signal (price action / results) about
  // exactly one tagged company preempts an INCIDENTAL macro/currency mention:
  // "Paytm shares tank 20% on RBI restrictions" is SPECIFIC (the restriction is
  // ON the company), not EMPTY. Guarded to companyCount === 1 so genuine sector
  // reactions naming multiple companies still resolve EMPTY.
  const SUBJECT_PREEMPTS = new Set(['E2_MACRO_INDEX_POLICY', 'E3_CURRENCY_COMMODITY']);
  const hasStrongSubject =
    companyCount === 1 &&
    (SPECIFIC_RULES.find((r) => r.id === 'S1_RESULTS').test(lc, headline) ||
      SPECIFIC_RULES.find((r) => r.id === 'S5_PRICE_ACTION').test(lc, headline));

  for (const rule of EMPTY_RULES) {
    if (!rule.test(lc, headline)) continue;
    // Tie-break: listicle-of-one is SPECIFIC, not a watchlist.
    if (rule.id === 'E1_LISTICLE_HEADER' && companyCount === 1) break;
    // Tie-break: single-company price-action/results beats an incidental macro mention.
    if (SUBJECT_PREEMPTS.has(rule.id) && hasStrongSubject) continue;
    return { decision: 'EMPTY', rule: rule.id, confidence: 'HIGH' };
  }

  for (const rule of SPECIFIC_RULES) {
    if (rule.test(lc, headline)) {
      return { decision: 'SPECIFIC', rule: rule.id, confidence: 'HIGH' };
    }
  }

  // S6 safety net: the tagger found a company and no EMPTY rule fired.
  if (companyCount > 0) {
    return { decision: 'SPECIFIC', rule: 'S6_TICKER_PRESENT', confidence: 'HIGH' };
  }

  // Fall-through: nothing fired. Bias toward SPECIFIC, but flag LOW confidence
  // so the monitoring layer / labeler can review (group events, foreign
  // counterparties, brokerage views, brand references all land here).
  return { decision: 'SPECIFIC', rule: 'FALLTHROUGH_DEFAULT', confidence: 'LOW' };
}

function evaluate(headline) {
  const companies = extractCompanies(headline);
  const tickers = companies.map((c) => c.ticker);
  const gate = runGate(headline, tickers.length);
  return { headline, gate, tickers };
}

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
