#!/usr/bin/env node
// V2-031 / V2-031b: build shared/nse-equity-master.json from NSE EQUITY_L.csv.
// Re-runnable. Deterministic. Lijo commits the JSON output after smoke-check.
//
// Pipeline:
//   1. Read scripts/research/output/v2-031/nse_equity_master.csv via papaparse
//   2. Dedupe by SYMBOL (EQ series wins; BE/GC discarded)
//   3. Cascade-strip suffixes per Decision 5 → generate per-ticker alias set
//   4. Overlay alias_proposal.json (50 Nifty + 12 brand divergences)
//   5. V2-031b: apply hardening actions (drop bare symbols / risky aliases)
//   6. Apply Decision 6(a) collision filter: bare forms shared by 2+ tickers
//      are dropped from ALL of them. Multi-word forms survive.
//   7. V2-031b: INTENTIONAL_MULTI_TAG escape hatch (parent aliases + Tata Motors)
//   8. V2-031b: positive alias overlays (recall fixes from Gemini v2 research)
//   9. Attach Decision 6(b) denylist_context (single-ticker common-noun
//      collisions: Lupin, Page, Hero, Britannia, Titan, Asian Paints)
//  10. Write shared/nse-equity-master.json sorted by ticker

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CSV_PATH = join(ROOT, 'scripts/research/output/v2-031/nse_equity_master.csv');
const PROPOSAL_PATH = join(ROOT, 'scripts/research/output/v2-031/alias_proposal.json');
const V2_031B_DIR = join(ROOT, 'scripts/research/output/v2-031b');
const HARDENING_PATH = join(V2_031B_DIR, 'v2-031b_negative_keywords.json');
const OVERLAY_PATH = join(V2_031B_DIR, 'v2-031b_positive_aliases.json');
const OUT_PATH = join(ROOT, 'shared/nse-equity-master.json');

// V2-031b task D5: cascade aliases that prod FPs matched even when bare symbol dropped.
const SUPPLEMENTAL_ALIAS_DROPS = [
  { symbol: 'RAIN', alias_to_drop: 'Rain' },
  { symbol: 'DOLLAR', alias_to_drop: 'Dollar' },
];

// ── Decision 5: suffix-strip cascade ─────────────────────────────────────────
// Stripped in order; each intermediate form becomes an alias. Longest first
// so "Pvt Limited" matches before "Limited" alone.
const STRIP_SUFFIXES = [
  'Pvt Limited', 'Private Limited',
  'Limited', 'Ltd',
  'Corporation', 'Corp',
  'Company', 'Co',
  'Industries', 'Industry',
  'Enterprises',
  'Holdings',
  'Group',
  'International',
  '(India)', 'India',
];

// ── Decision 6(b): runtime context-word requirements ─────────────────────────
// Single-ticker names that look like English words. The runtime tagger checks
// `denylist_context` against the headline; entry only matches if at least one
// context word is present (case-insensitive substring).
//
// Keyed by ticker. Applied AFTER all aliases are generated, so context words
// guard every alias attached to that ticker (including the brand overlay ones).
const DENYLIST_CONTEXT = {
  LUPIN: ['pharma', 'drug', 'results', 'Q1', 'Q2', 'Q3', 'Q4', 'NSE', 'BSE', 'shares', 'share price', '₹', 'dividend'],
  PAGEIND: ['Industries', 'Jockey', 'innerwear', 'Q1', 'Q2', 'Q3', 'Q4', 'results', 'shares', '₹'],
  HEROMOTOCO: ['MotoCorp', 'motorcycle', 'two-wheeler', 'Honda', 'Splendor', 'results', 'shares', '₹', 'Q1', 'Q2', 'Q3', 'Q4'],
  TITAN: ['Company', 'NSE', 'BSE', 'results', 'shares', 'Tanishq', 'Fastrack', 'Sonata', 'Q1', 'Q2', 'Q3', 'Q4', '₹', 'jewellery', 'watch'],
  BRITANNIA: ['Industries', 'NSE', 'BSE', 'results', 'biscuit', 'cracker', 'Good Day', 'Marie', 'shares', '₹', 'Q1', 'Q2', 'Q3', 'Q4'],
  ASIANPAINT: ['Limited', 'NSE', 'BSE', 'results', 'paint', 'shares', '₹', 'Q1', 'Q2', 'Q3', 'Q4'],
};

// Aliases that are TOO common as English words even with collision filtering;
// these get dropped no matter what. Mostly stripped-down geographic / generic
// terms that slip through the suffix cascade.
const HARD_DROP_ALIASES = new Set([
  'india', '(india)', 'the', 'and', 'of', 'for', 'in', 'group', 'corporation',
  'company', 'industries', 'enterprises', 'holdings', 'international',
]);

// ── Intentional multi-tag aliases ────────────────────────────────────────────
// Rare escape hatch: aliases that should INTENTIONALLY tag multiple tickers,
// bypassing the Decision 6(a) collision filter. Use only for genuine multi-
// ticker references — currently just the post-demerger Tata Motors case.
//
// These get attached AFTER the collision filter runs, so they survive.
// Trade-off: a longer-form headline ("Tata Motors Passenger Vehicles Q4") will
// match both the long-form alias AND "Tata Motors", so it will tag both
// tickers — TMCV picks up a false positive. The downstream quant pipeline
// disambiguates via ticker × date × event_type triangulation.
const INTENTIONAL_MULTI_TAG = {
  // 2025-11 Tata Motors demerger: old TATAMOTORS retired, split into
  // TMCV (commercial vehicles) + TMPV (passenger vehicles). Historical
  // news data references "Tata Motors" uniformly, so map to both.
  'Tata Motors': ['TMCV', 'TMPV'],
  // V2-031b: restore collision-filtered parent aliases to dominant listing only.
  'L&T': ['LT'],
  'SBI': ['SBIN'],
  'HDFC': ['HDFCBANK'],
  // Map bare "Siemens" to SIEMENS only — ENRIN keeps multi-word "Siemens Energy" forms.
  'Siemens': ['SIEMENS'],
  // ITC vs ITCHOTELS share first-word "itc" — headlines say "ITC" for the parent FMCG name.
  'ITC': ['ITC'],
};

// Tickers in alias_proposal.json whose absence from EQUITY_L is EXPECTED
// (e.g. retired post-demerger) — replaces noisy console.warn with a quiet
// informational log so the build output stays clean.
const KNOWN_RETIRED_TICKERS = {
  TATAMOTORS: 'retired 2025-11 (demerger); handled via INTENTIONAL_MULTI_TAG → TMCV + TMPV',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeAlias(s) {
  return s.trim().replace(/\s+/g, ' ');
}

function generateCascadeAliases(name) {
  // Apply suffix-strip iteratively, accumulating each intermediate form.
  const aliases = new Set();
  let current = normalizeAlias(name);
  aliases.add(current);
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of STRIP_SUFFIXES) {
      // Match suffix at end. Word-boundary at start (whitespace or string start
      // after trim); end-of-string at end. Case-insensitive.
      // Use ^|\s before the suffix so "Co" doesn't match "Tesco" etc.
      const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(^|\\s)${escaped}$`, 'i');
      const next = current.replace(re, '').trim().replace(/[,.]+$/, '').trim();
      if (next !== current && next.length > 0) {
        current = normalizeAlias(next);
        aliases.add(current);
        changed = true;
        break;
      }
    }
  }
  return [...aliases];
}

// ── Step 1+2: read CSV, dedupe by SYMBOL ─────────────────────────────────────

function loadEquityMaster() {
  const csv = readFileSync(CSV_PATH, 'utf8');
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    console.error('[build] CSV parse errors:', parsed.errors.slice(0, 5));
  }
  // CSV header has leading spaces (" SERIES", " NAME OF COMPANY" etc.) —
  // normalize keys.
  const rows = parsed.data.map((r) => {
    const norm = {};
    for (const [k, v] of Object.entries(r)) {
      norm[k.trim()] = typeof v === 'string' ? v.trim() : v;
    }
    return norm;
  });

  // Dedupe by SYMBOL — keep EQ series if present, else first occurrence.
  const bySymbol = new Map();
  for (const row of rows) {
    const symbol = row.SYMBOL;
    if (!symbol) continue;
    const existing = bySymbol.get(symbol);
    if (!existing) {
      bySymbol.set(symbol, row);
    } else if (existing.SERIES !== 'EQ' && row.SERIES === 'EQ') {
      bySymbol.set(symbol, row);
    }
  }
  return [...bySymbol.values()];
}

// ── Step 3+4: cascade aliases + overlay alias_proposal.json ──────────────────

function buildPerTickerAliases(rows) {
  const byTicker = new Map();
  for (const row of rows) {
    const ticker = row.SYMBOL;
    const name = row['NAME OF COMPANY'];
    if (!ticker || !name) continue;
    const aliases = generateCascadeAliases(name);
    // Symbol itself is also an alias (e.g. "RELIANCE", "INFY")
    aliases.push(ticker);
    byTicker.set(ticker, { ticker, name, aliases: new Set(aliases.map(normalizeAlias)) });
  }
  return byTicker;
}

function overlayProposal(byTicker) {
  const proposal = JSON.parse(readFileSync(PROPOSAL_PATH, 'utf8'));
  let merged = 0, added = 0;
  for (const entry of proposal) {
    const existing = byTicker.get(entry.ticker);
    if (existing) {
      for (const alias of entry.aliases) {
        existing.aliases.add(normalizeAlias(alias));
      }
      merged++;
    } else if (KNOWN_RETIRED_TICKERS[entry.ticker]) {
      console.log(`[build]   note: ${entry.ticker} retired — ${KNOWN_RETIRED_TICKERS[entry.ticker]}`);
      added++;
    } else {
      console.warn(`[build] proposal ticker ${entry.ticker} not in EQUITY_L — skipping`);
      added++;
    }
  }
  return { merged, added };
}

// ── Step 5 (V2-031b): hardening actions from Gemini v2 research ───────────────

function loadHardeningActions() {
  const data = JSON.parse(readFileSync(HARDENING_PATH, 'utf8'));
  const actions = [...data.actions];
  for (const sup of SUPPLEMENTAL_ALIAS_DROPS) {
    const exists = actions.some(
      (a) =>
        a.symbol === sup.symbol &&
        a.action_type === 'drop_alias' &&
        a.alias_to_drop?.toLowerCase() === sup.alias_to_drop.toLowerCase(),
    );
    if (!exists) {
      actions.push({
        symbol: sup.symbol,
        action_type: 'drop_alias',
        alias_to_drop: sup.alias_to_drop,
        reason: 'V2-031b task D5 supplemental cascade drop',
      });
    }
  }
  return actions;
}

function removeAliasIgnoreCase(aliases, target) {
  const key = target.toLowerCase();
  for (const alias of [...aliases]) {
    if (alias.toLowerCase() === key) {
      aliases.delete(alias);
      return true;
    }
  }
  return false;
}

function applyHardeningActions(byTicker, actions) {
  let bareDropped = 0;
  let aliasDropped = 0;
  let skipped = 0;
  let unknown = 0;

  for (const action of actions) {
    const entry = byTicker.get(action.symbol);
    if (!entry) {
      unknown++;
      console.error(`[build]   hardening phantom symbol: ${action.symbol}`);
      continue;
    }

    if (action.action_type === 'drop_bare_symbol_alias') {
      if (removeAliasIgnoreCase(entry.aliases, entry.ticker)) {
        bareDropped++;
      }
    } else if (action.action_type === 'drop_alias') {
      if (removeAliasIgnoreCase(entry.aliases, action.alias_to_drop)) {
        aliasDropped++;
      }
    } else {
      skipped++;
      console.warn(`[build]   unknown hardening action_type ${action.action_type} for ${action.symbol}`);
    }
  }

  if (unknown > 0) {
    throw new Error(`[build] ${unknown} hardening action(s) reference unknown tickers — aborting`);
  }

  return { bareDropped, aliasDropped, skipped, total: actions.length };
}

function applyIntentionalMultiTag(byTicker) {
  let attached = 0;
  for (const [alias, tickers] of Object.entries(INTENTIONAL_MULTI_TAG)) {
    for (const ticker of tickers) {
      const entry = byTicker.get(ticker);
      if (!entry) {
        console.warn(`[build]   INTENTIONAL_MULTI_TAG ticker ${ticker} not in master — skipping "${alias}"`);
        continue;
      }
      entry.aliases.add(normalizeAlias(alias));
      attached++;
    }
    console.log(`[build]   "${alias}" → ${tickers.join(' + ')}`);
  }
  return attached;
}

function applyPositiveOverlays(byTicker) {
  const data = JSON.parse(readFileSync(OVERLAY_PATH, 'utf8'));
  const overlays = data.alias_overlays || {};
  let added = 0;
  let dropped = 0;

  for (const [ticker, overlay] of Object.entries(overlays)) {
    const entry = byTicker.get(ticker);
    if (!entry) {
      console.warn(`[build]   overlay ticker ${ticker} not in master — skipping`);
      continue;
    }
    for (const alias of overlay.drop_aliases || []) {
      if (removeAliasIgnoreCase(entry.aliases, alias)) {
        dropped++;
      }
    }
    for (const alias of overlay.add_aliases || []) {
      const norm = normalizeAlias(alias);
      const before = entry.aliases.size;
      entry.aliases.add(norm);
      if (entry.aliases.size > before) added++;
    }
  }

  return { added, dropped, tickers: Object.keys(overlays).length };
}

// ── Step 6: Decision 6(a) collision filter ───────────────────────────────────
//
// Two ambiguity signals, OR'd together — alias dropped from ALL entries (including
// its own symbol-form) if either fires:
//
//  (1) **Multi-ticker alias claim**: the same alias (lowercased) appears in 2+
//      entries' alias lists. Catches cascade-overlap (e.g. "DCM Shriram" appears
//      in 3 ticker names).
//
//  (2) **First-word ambiguity**: the alias is a single token AND it appears as
//      the first word of 2+ company names. Catches overlay-introduced single
//      forms ("Reliance", "Mahindra", "Apollo", "Bajaj") that cascade alone
//      misses — because RPOWER's "Reliance Power Limited" never cascades down
//      to bare "Reliance", but bare "Reliance" in a headline is still ambiguous
//      between the 5+ Reliance-prefixed tickers.
//
// NO symbol-exempt rule — if ticker APOLLO's symbol-form alias is "apollo" and
// 4 company names start with "Apollo", drop it too. APOLLO is still findable
// via "Apollo Micro" (its unique multi-word form).

function applyCollisionFilter(byTicker) {
  // (1) alias → set of tickers that claim it
  const aliasToTickers = new Map();
  for (const entry of byTicker.values()) {
    for (const alias of entry.aliases) {
      const key = alias.toLowerCase();
      if (!aliasToTickers.has(key)) aliasToTickers.set(key, new Set());
      aliasToTickers.get(key).add(entry.ticker);
    }
  }

  // (2) lowercased first word of company name → set of tickers
  const firstWordToTickers = new Map();
  for (const entry of byTicker.values()) {
    const first = entry.name.trim().split(/\s+/)[0]?.toLowerCase();
    if (!first) continue;
    if (!firstWordToTickers.has(first)) firstWordToTickers.set(first, new Set());
    firstWordToTickers.get(first).add(entry.ticker);
  }

  const isSingleToken = (s) => !/\s/.test(s);
  const collisions = [];
  const filtered = new Set();

  // (a) Iterate aliases that are actually claimed by someone — catches
  // alias-level collisions (e.g. "DCM Shriram" cascade-shared by 3 tickers).
  for (const [alias, tickers] of aliasToTickers.entries()) {
    if (tickers.size > 1) {
      collisions.push({
        alias,
        reason: `multi-ticker claim (${tickers.size})`,
        tickers: [...tickers].sort(),
      });
      filtered.add(alias);
    }
  }

  // (b) Iterate first-words PREEMPTIVELY — every single-word first-word that
  // appears in 2+ company names is blocked, regardless of whether any entry
  // currently has it as an alias. This blocks future overlay additions ("Tata"
  // added to TATAMOTORS by hand) from reintroducing the bare ambiguous form.
  for (const [word, tickers] of firstWordToTickers.entries()) {
    if (tickers.size <= 1) continue;
    if (filtered.has(word)) continue; // already counted by (a)
    if (!isSingleToken(word)) continue;
    collisions.push({
      alias: word,
      reason: `first-word of ${tickers.size} company names (preemptive)`,
      tickers: [...tickers].sort(),
    });
    filtered.add(word);
  }

  // Drop filtered aliases + HARD_DROP_ALIASES from every entry.
  for (const entry of byTicker.values()) {
    const kept = new Set();
    for (const alias of entry.aliases) {
      const key = alias.toLowerCase();
      if (HARD_DROP_ALIASES.has(key)) continue;
      if (filtered.has(key)) continue;
      kept.add(alias);
    }
    entry.aliases = kept;
  }

  return collisions.sort((a, b) => a.alias.localeCompare(b.alias));
}

// ── Step 6: attach denylist_context ──────────────────────────────────────────

function attachDenylist(byTicker) {
  let attached = 0;
  for (const [ticker, context] of Object.entries(DENYLIST_CONTEXT)) {
    const entry = byTicker.get(ticker);
    if (!entry) {
      console.warn(`[build] DENYLIST_CONTEXT references ${ticker} but it's not in the master — skipping`);
      continue;
    }
    entry.denylist_context = context;
    attached++;
  }
  return attached;
}

// ── Step 7: serialize ────────────────────────────────────────────────────────

function serialize(byTicker) {
  const out = [...byTicker.values()]
    .map((entry) => ({
      ticker: entry.ticker,
      name: entry.name,
      aliases: [...entry.aliases].sort(),
      ...(entry.denylist_context ? { denylist_context: entry.denylist_context } : {}),
    }))
    .filter((entry) => entry.aliases.length > 0)
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
  return out;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const t0 = performance.now();
  console.log('[build] reading CSV:', CSV_PATH);
  const rows = loadEquityMaster();
  console.log(`[build] ${rows.length} unique tickers after dedupe`);

  console.log('[build] generating cascade aliases');
  const byTicker = buildPerTickerAliases(rows);

  console.log('[build] overlaying alias_proposal.json');
  const overlayStats = overlayProposal(byTicker);
  console.log(`[build]   merged into ${overlayStats.merged} existing tickers, ${overlayStats.added} skipped`);

  console.log('[build] applying V2-031b hardening actions');
  const hardeningActions = loadHardeningActions();
  const hardeningStats = applyHardeningActions(byTicker, hardeningActions);
  console.log(
    `[build]   ${hardeningStats.total} actions: ${hardeningStats.bareDropped} bare-symbol drops, ${hardeningStats.aliasDropped} alias drops, ${hardeningStats.skipped} skipped`,
  );

  console.log('[build] applying Decision 6(a) collision filter');
  const collisions = applyCollisionFilter(byTicker);
  console.log(`[build]   ${collisions.length} aliases dropped (multi-ticker claim OR first-word ambiguity)`);
  // Log the most-shared collisions (>3 tickers) for audit visibility.
  const bigCollisions = collisions.filter((c) => c.tickers.length >= 3).slice(0, 15);
  if (bigCollisions.length > 0) {
    console.log('[build]   top collisions (>=3 tickers):');
    for (const c of bigCollisions) {
      console.log(`[build]     "${c.alias}" [${c.reason}] → ${c.tickers.join(', ')}`);
    }
  }

  // Regression guard: if any of these well-known ambiguous groups stops being
  // collision-detected, it likely means EQUITY_L lost a sibling listing (e.g.
  // delisting), which would silently reintroduce the false-positive.
  const EXPECTED_AMBIGUOUS = [
    'reliance', 'apollo', 'tata', 'adani', 'bajaj', 'mahindra', 'jsw', 'icici', 'hdfc',
  ];
  const droppedSet = new Set(collisions.map((c) => c.alias));
  const missing = EXPECTED_AMBIGUOUS.filter((w) => !droppedSet.has(w));
  if (missing.length > 0) {
    console.warn(`[build] WARN: expected ambiguous groups NOT in dropped set: ${missing.join(', ')}`);
    console.warn(`[build]   likely cause: a sibling listing was delisted in EQUITY_L since last run.`);
    console.warn(`[build]   verify before commit — bare form would re-enter the alias map and cause false positives.`);
  } else {
    console.log(`[build]   ✓ all ${EXPECTED_AMBIGUOUS.length} expected ambiguous groups are collision-detected`);
  }

  console.log('[build] applying INTENTIONAL_MULTI_TAG (post-filter escape hatch)');
  const multiAttached = applyIntentionalMultiTag(byTicker);
  console.log(`[build]   ${multiAttached} alias attachments via multi-tag overlay`);

  console.log('[build] applying V2-031b positive alias overlays');
  const overlayV2Stats = applyPositiveOverlays(byTicker);
  console.log(
    `[build]   ${overlayV2Stats.tickers} tickers: ${overlayV2Stats.added} aliases added, ${overlayV2Stats.dropped} dropped`,
  );

  console.log('[build] attaching Decision 6(b) denylist_context');
  const attached = attachDenylist(byTicker);
  console.log(`[build]   ${attached} entries got denylist_context`);

  console.log('[build] serializing');
  const out = serialize(byTicker);
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');

  const totalAliases = out.reduce((sum, e) => sum + e.aliases.length, 0);
  const elapsed = performance.now() - t0;
  console.log(`[build] wrote ${OUT_PATH}`);
  console.log(`[build] ${out.length} tickers, ${totalAliases} aliases, ${elapsed.toFixed(1)}ms`);

  // Audit log: collisions go to a sibling .log for PR review.
  const logPath = OUT_PATH.replace(/\.json$/, '.collisions.log');
  const logBody = [
    `# Build-time collision filter log — V2-031 Decision 6(a)`,
    `# Generated by scripts/build-equity-master.mjs at ${new Date().toISOString()}`,
    `# ${collisions.length} aliases dropped (multi-ticker claim OR first-word ambiguity).`,
    `# Format: <alias>\\t<reason>\\t<comma-separated tickers>`,
    '',
    ...collisions.map((c) => `${c.alias}\t${c.reason}\t${c.tickers.join(',')}`),
  ].join('\n') + '\n';
  writeFileSync(logPath, logBody);
  console.log(`[build] collision log: ${logPath}`);
}

main();
