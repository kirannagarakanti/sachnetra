// Heuristic news-headline GATE (SPECIFIC vs EMPTY) — shared by gate-preview.mjs
// and score-goldset.mjs so both use the identical cascade (no drift).
//
// Rules-only, no ML. relevance_class is deliberately NOT used (it's computed
// FROM the tagger → circular). See the 2026-06-10 problem-solving note.

import { extractCompanies } from '../_india-market-keywords.mjs';

// ── EMPTY rules (fire first) ─────────────────────────────────────────────────
export const EMPTY_RULES = [
  {
    id: 'E1_LISTICLE_HEADER',
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

// ── SPECIFIC rules (only reached if no EMPTY rule fired) ─────────────────────
export const SPECIFIC_RULES = [
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

// Returns { decision, rule, confidence }. Tie-breaks documented inline.
export function runGate(headline, companyCount) {
  const lc = headline.toLowerCase();

  // Single-company price-action/results preempts an INCIDENTAL macro mention:
  // "Paytm shares tank 20% on RBI restrictions" is SPECIFIC, not EMPTY.
  const SUBJECT_PREEMPTS = new Set(['E2_MACRO_INDEX_POLICY', 'E3_CURRENCY_COMMODITY']);
  const hasStrongSubject =
    companyCount === 1 &&
    (SPECIFIC_RULES.find((r) => r.id === 'S1_RESULTS').test(lc) ||
      SPECIFIC_RULES.find((r) => r.id === 'S5_PRICE_ACTION').test(lc));

  for (const rule of EMPTY_RULES) {
    if (!rule.test(lc)) continue;
    if (rule.id === 'E1_LISTICLE_HEADER' && companyCount === 1) break; // listicle-of-one → SPECIFIC
    if (SUBJECT_PREEMPTS.has(rule.id) && hasStrongSubject) continue;
    return { decision: 'EMPTY', rule: rule.id, confidence: 'HIGH' };
  }

  for (const rule of SPECIFIC_RULES) {
    if (rule.test(lc)) return { decision: 'SPECIFIC', rule: rule.id, confidence: 'HIGH' };
  }

  if (companyCount > 0) {
    return { decision: 'SPECIFIC', rule: 'S6_TICKER_PRESENT', confidence: 'HIGH' };
  }
  return { decision: 'SPECIFIC', rule: 'FALLTHROUGH_DEFAULT', confidence: 'LOW' };
}

// Full pipeline preview for one headline: gate + tagger.
export function evaluate(headline) {
  const tickers = extractCompanies(headline).map((c) => c.ticker);
  const gate = runGate(headline, tickers.length);
  return { headline, gate, tickers };
}
