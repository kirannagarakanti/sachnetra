#!/usr/bin/env node

import { loadSharedConfig } from './_seed-utils.mjs';

const taxonomy = loadSharedConfig('market-taxonomy.json');

// V2-031 G1+G2: alias-driven ticker extraction.
// - Loads shared/nse-equity-master.json (built by scripts/build-equity-master.mjs)
// - Per Decision 6(a): bare ambiguous forms (Tata, Apollo, Reliance, etc.)
//   are collision-filtered + first-word-preemptive at build time, so they
//   never enter aliasMap and can't false-positive at runtime.
// - Per Decision 6(b): per-entry `denylist_context` enforced at runtime —
//   Lupin / Page / Hero / Britannia / Titan / Asian Paints require at least
//   one context word in the headline.
// - Per Decision 4: returns BARE NSE symbols (no .NS suffix).
// - Per writer contract (seed-india-signals.mjs:341, 343): returns
//   [{name, ticker}] objects. `.ticker` feeds nse_tickers column,
//   `.name` feeds companies column. Returning bare strings would
//   corrupt both columns silently.
const equityMaster = loadSharedConfig('nse-equity-master.json');

// Module-init: build alias → entry[] map.
// Value is an ARRAY of entries because INTENTIONAL_MULTI_TAG aliases
// (currently just "Tata Motors" → TMCV + TMPV per the 2025-11 demerger)
// are claimed by multiple tickers and must all fire when matched. The
// Decision 6(a) collision filter already removes UNINTENTIONAL multi-ticker
// claims at build time — so any alias with length > 1 here is deliberate.
const aliasMap = new Map();
for (const entry of equityMaster) {
  for (const alias of entry.aliases) {
    const key = alias.toLowerCase();
    if (!aliasMap.has(key)) aliasMap.set(key, []);
    aliasMap.get(key).push({
      ticker: entry.ticker,
      name: entry.name,
      denylist_context: entry.denylist_context || null,
    });
  }
}

const ALIAS_REGEXES = [...aliasMap.keys()].map((alias) => ({
  alias,
  re: new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
}));

const marketRegex = new RegExp(
  `\\b(${taxonomy.market_keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i'
);

export function isMarketMoving(title) {
  return marketRegex.test(title);
}

// Normalize curly quotes → straight so aliases stored with ASCII apostrophes
// (e.g. "Domino's India") match copy-edited headlines that use U+2019 ("Domino's").
function normalizeQuotes(s) {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');
}

export function extractCompanies(title) {
  if (!title) return [];
  const normalized = normalizeQuotes(title);
  const lc = normalized.toLowerCase();
  // Dedup BY TICKER (Map<ticker, name>, not Set-of-objects — Set dedups by
  // object identity, which would let two aliases resolving to the same ticker
  // both slip through).
  const found = new Map();
  for (const { alias, re } of ALIAS_REGEXES) {
    if (!re.test(normalized)) continue;
    // aliasMap value is an entry[] — fan out for INTENTIONAL_MULTI_TAG aliases.
    for (const entry of aliasMap.get(alias)) {
      if (entry.denylist_context) {
        const hasContext = entry.denylist_context.some((w) => lc.includes(w.toLowerCase()));
        if (!hasContext) continue;
      }
      if (!found.has(entry.ticker)) {
        found.set(entry.ticker, entry.name);
      }
    }
  }
  return [...found].map(([ticker, name]) => ({ name, ticker }));
}

export function extractSectors(title) {
  const found = [];
  for (const [sector, keywords] of Object.entries(taxonomy.sectors)) {
    const re = new RegExp(
      `\\b(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
      'i'
    );
    if (re.test(title)) found.push(sector);
  }
  return found;
}

export function detectEventType(title) {
  for (const [type, keywords] of Object.entries(taxonomy.event_types)) {
    const re = new RegExp(
      `\\b(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
      'i'
    );
    if (re.test(title)) return type;
  }
  return 'other';
}

export function extractThemes(title) {
  const found = [];
  for (const [themeId, theme] of Object.entries(taxonomy.themes)) {
    const re = new RegExp(
      `\\b(${theme.keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
      'i'
    );
    if (re.test(title)) found.push(themeId);
  }
  return found;
}

export function detectRelevanceClassFromTitle(title, sectors, companies) {
  const systemicRegex = new RegExp(
    `\\b(${taxonomy.systemic_keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'i'
  );
  if (systemicRegex.test(title)) return 'systemic';
  if (sectors.length > 0 && companies.length > 0) return 'sector';
  if (companies.length > 0) return 'idiosyncratic';
  return 'systemic';
}
