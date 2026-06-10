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
// V2-031c (2026-05-29): two residual FPs surfaced by the exp11 24h slice that the
// 031b bare-symbol drops did NOT cover —
//   URBANCO already had its bare ticker dropped, but the "Urban" cascade alias still
//     fired ("Urban Complex", "Flamingo Blue Carbon Urban Complex"); 6 tags/24h.
//   NAVA had no action; bare "NAVA" matched "Nava Kerala Sadas" etc. "NAVA LIMITED"
//     survives so genuine references still tag.
const SUPPLEMENTAL_ALIAS_DROPS = [
  { symbol: 'RAIN', alias_to_drop: 'Rain' },
  { symbol: 'DOLLAR', alias_to_drop: 'Dollar' },
  { symbol: 'URBANCO', alias_to_drop: 'Urban' },
  { symbol: 'NAVA', alias_to_drop: 'NAVA' },
  // Gold-set audit (2026-06-10): single-word cascade residues that are common
  // English words and false-positived on general news (COALINDIA's "Coal"
  // matched "coal mine blast" headlines, etc.). Each company stays findable via
  // its multi-word form (kept) + symbol — see build comment. Only dropped where
  // a distinct multi-word alias survives; bare-name-only tickers (Trent,
  // Trident) intentionally NOT dropped to preserve recall.
  { symbol: 'COALINDIA', alias_to_drop: 'Coal' },        // → Coal India / CIL
  { symbol: 'SOLARINDS', alias_to_drop: 'Solar' },       // → Solar Industries
  { symbol: 'CHOICEIN', alias_to_drop: 'Choice' },       // → Choice International
  { symbol: 'EXCELINDUS', alias_to_drop: 'Excel' },      // → Excel Industries
  { symbol: 'EMPOWER', alias_to_drop: 'Empower' },       // → Empower India
  { symbol: 'DEEPINDS', alias_to_drop: 'Deep' },         // → Deep Industries
  { symbol: 'PLATIND', alias_to_drop: 'Platinum' },      // → Platinum Industries
  { symbol: 'GRAPHITE', alias_to_drop: 'Graphite' },     // → Graphite India
  { symbol: 'CELLO', alias_to_drop: 'Cello' },           // → Cello World
  // Prod FP audit (2026-06-10, nse_tickers_v2 71.7K rows): bare symbols /
  // cascade forms that are common words or Indian first names, each confirmed
  // false-positiving in prod with measured volume. Multi-word forms survive.
  { symbol: 'MPSLTD', alias_to_drop: 'MPS' },            // "MPs quit Trinamool" — 134 tags, top-3 by volume
  { symbol: 'RISHABH', alias_to_drop: 'RISHABH' },       // Rishabh Pant (cricket) — 73 → Rishabh Instruments
  { symbol: 'SONAMLTD', alias_to_drop: 'SONAM' },        // Sonam Wangchuk / Kapoor — 65 → SONAM LIMITED
  { symbol: 'NH', alias_to_drop: 'NH' },                 // "NH-44" highways — 59 → Narayana Hrudayalaya
  { symbol: 'LT', alias_to_drop: 'LT' },                 // "Lt. <name>" military rank — keep L&T family
  { symbol: 'SKIPPER', alias_to_drop: 'Skipper' },       // cricket/football captain — 47 → Skipper Limited
  { symbol: 'VIPULLTD', alias_to_drop: 'Vipul' },        // first name (director/diplomat) → Vipul Limited
  { symbol: 'MOHITIND', alias_to_drop: 'Mohit' },        // first name → Mohit Industries
  { symbol: 'ANMOL', alias_to_drop: 'Anmol' },           // first name (incl. Anmol Bishnoi) → Anmol India
  { symbol: 'SUMEETINDS', alias_to_drop: 'Sumeet' },     // "Sumeet Bagadia recommends" columns → Sumeet Industries
  { symbol: 'SHINDL', alias_to_drop: 'Sharat' },         // first name → Sharat Industries
  { symbol: 'ARCHIES', alias_to_drop: 'Archies' },       // "The Archies" film → Archies Limited
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
  // 2026-06-10 prod FP audit — mixed real/FP tickers where a bare drop would
  // cost real recall (the company is commonly referenced by the bare form):
  // YATRA: "Yatra Q4 Profit Tanks ₹8.2 Cr" is real; "Amarnath Yatra" (pilgrimage) is not.
  YATRA: ['online', 'travel', 'Q1', 'Q2', 'Q3', 'Q4', 'profit', 'results', 'shares', '₹', 'booking', 'IPO', 'NSE', 'BSE', 'stock'],
  // TRIDENT: textile midcap, appears in results listicles; "Trident Hotels" (Oberoi brand) is not it.
  TRIDENT: ['Limited', 'textile', 'yarn', 'paper', 'results', 'Q1', 'Q2', 'Q3', 'Q4', 'shares', '₹', 'NSE', 'BSE', 'stock'],
  // AXISBANK: bare "Axis" matched "Axis My India" (pollster); real coverage virtually
  // always carries a finance word ("Axis Bank" itself contains 'bank').
  AXISBANK: ['bank', 'shares', '₹', 'Q1', 'Q2', 'Q3', 'Q4', 'results', 'loan', 'target', 'NSE', 'BSE', 'dividend', 'FD', 'credit', 'CEO'],
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

// 2026-06-10 prod FP audit: cascade intermediates ending in a connector word are
// over-broad prefixes, never legitimate references — "Bank of India" minus the
// "India" strip left BANKINDIA with alias "Bank of", which matched "Bank of
// Baroda" / "Bank of Japan" in prod. Same class: "State Bank of" (SBIN),
// "Central Bank of" (CENTRALBK), "Whirlpool of" (WHIRLPOOL) — 70 aliases total.
const DANGLING_CONNECTOR_RE = /\s(of|and|&|the|for|in|on)$/i;

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
        // Dangling-connector intermediates are tracked for cascade continuation
        // but never emitted as aliases.
        if (!DANGLING_CONNECTOR_RE.test(current)) aliases.add(current);
        changed = true;
        break;
      }
    }
  }
  return [...aliases];
}

// ── G1 (V2-031c recall): deterministic alias-FORM variants ───────────────────
// Closes form-mismatch recall gaps for names ALREADY in the master, WITHOUT
// touching precision: spaced/unspaced leading initials, "&" <-> "and",
// Ltd <-> Limited. No fuzzy match, no NER (V2-031 Decision 2 stands). Applied
// symmetrically with the match side — HTML-entity decode lives in
// scripts/_india-market-keywords.mjs. Spec: ai_docs/tasks/G1-alias-form-normalization.md.
//
// FP guards baked in here (task §FP-guards): (2) min-length skip for spacing,
// (3) leading-initials only, (4) per-alias variant cap. Guard (1) — the
// collision filter — is inherited by Pass-1 variants because they are added
// BEFORE applyCollisionFilter() in main().
const FORM_MIN_LEN = 5;        // skip spacing variants for very short aliases (FP guard #2)
const FORM_VARIANT_CAP = 6;    // max generated variants per source alias (FP guard #4)

// Collapse a LEADING run of >=2 single letters: "A B Cotspin" -> "AB Cotspin".
// Only fires on genuine initial runs (single letter + space, repeated), so
// normal words ("Tata Steel") are never touched. This is the proven ABCOTS case.
function collapseLeadingInitials(alias) {
  const m = alias.match(/^((?:[A-Za-z]\s+){1,}[A-Za-z])(\s+\S.*)$/);
  if (!m) return null;
  const initials = m[1].replace(/\s+/g, ''); // "A B" -> "AB"
  if (initials.length < 2) return null;
  return `${initials}${m[2]}`;
}

// Expand a LEADING all-caps acronym (2-3 letters) into spaced initials:
// "AB Cotspin" -> "A B Cotspin". All-caps + length<=3 guard so real words
// ("Sun Pharma") and longer acronyms ("HDFC Bank") are left alone.
function expandLeadingInitials(alias) {
  const m = alias.match(/^([A-Z]{2,3})(\s+\S.*)$/);
  if (!m) return null;
  return `${m[1].split('').join(' ')}${m[2]}`;
}

// Given a single alias, return its deterministic form variants (excludes the
// source form). Used by both passes; the caller decides collision handling.
function aliasFormVariants(alias) {
  const a = normalizeAlias(alias);
  const out = new Set();

  // "&" <-> "and" — spaced forms only, matching real headline conventions.
  if (a.includes('&')) {
    out.add(a.replace(/\s*&\s*/g, ' and ')); // "L&T" -> "L and T"
    out.add(a.replace(/\s*&\s*/g, ' & '));   // "L&T" -> "L & T"
  }
  if (/\s+and\s+/i.test(a)) {
    out.add(a.replace(/\s+and\s+/gi, ' & ')); // "L and T" -> "L & T"
  }

  // Leading-initials spacing — long-enough aliases only (FP guards #2, #3).
  if (a.length >= FORM_MIN_LEN) {
    const collapsed = collapseLeadingInitials(a);
    if (collapsed) out.add(collapsed);
    const expanded = expandLeadingInitials(a);
    if (expanded) out.add(expanded);
  }

  // Ltd <-> Limited (trailing suffix fold).
  if (/\bLtd\.?$/i.test(a)) out.add(a.replace(/\bLtd\.?$/i, 'Limited'));
  else if (/\bLimited$/i.test(a)) out.add(a.replace(/\bLimited$/i, 'Ltd'));

  const norm = new Set([...out].map(normalizeAlias));
  norm.delete(a); // never re-emit the source form
  return [...norm].slice(0, FORM_VARIANT_CAP); // variant cap (FP guard #4)
}

// Pass 1 (pre-collision-filter): generate variants for EVERY alias currently
// present (cascade + proposal + post-hardening). These enter entry.aliases
// before applyCollisionFilter(), so they inherit the Decision 6(a) FP guard.
function applyFormVariantsPass1(byTicker) {
  let generated = 0;
  const variantKeys = new Set(); // lowercased, for collision-survival audit
  for (const entry of byTicker.values()) {
    for (const alias of [...entry.aliases]) { // snapshot before mutating
      for (const v of aliasFormVariants(alias)) {
        const before = entry.aliases.size;
        entry.aliases.add(v);
        if (entry.aliases.size > before) {
          generated++;
          variantKeys.add(v.toLowerCase());
        }
      }
    }
  }
  return { generated, variantKeys };
}

// Pass 2 (post-overlay): generate variants ONLY for aliases injected AFTER the
// collision filter (INTENTIONAL_MULTI_TAG + positive overlays), computed as the
// delta vs `snapshot`. These are deliberately collision-exempt — same as their
// source aliases — so we do NOT re-run the collision filter over them; the
// min-length / leading-initials / cap guards inside aliasFormVariants still apply.
function applyFormVariantsPass2(byTicker, snapshot) {
  let generated = 0;
  for (const [ticker, entry] of byTicker) {
    const prev = snapshot.get(ticker) || new Set();
    const injected = [...entry.aliases].filter((a) => !prev.has(a));
    for (const alias of injected) {
      for (const v of aliasFormVariants(alias)) {
        const before = entry.aliases.size;
        entry.aliases.add(v);
        if (entry.aliases.size > before) generated++;
      }
    }
  }
  return { generated };
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
  // Remove ALL case-variants, not just the first: SKIPPER carries both
  // "SKIPPER" (symbol) and "Skipper" (cascade) — the runtime match is
  // case-insensitive, so a drop that leaves one variant behind fixes nothing.
  const key = target.toLowerCase();
  let removed = false;
  for (const alias of [...aliases]) {
    if (alias.toLowerCase() === key) {
      aliases.delete(alias);
      removed = true;
    }
  }
  return removed;
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
  // Final safety sweep: drop dangling-connector aliases regardless of which
  // stage introduced them (proposal overlay / positive overlays bypass the
  // cascade guard).
  let danglingDropped = 0;
  const out = [...byTicker.values()]
    .map((entry) => ({
      ticker: entry.ticker,
      name: entry.name,
      aliases: [...entry.aliases]
        .filter((a) => {
          if (DANGLING_CONNECTOR_RE.test(a)) {
            danglingDropped++;
            return false;
          }
          return true;
        })
        .sort(),
      ...(entry.denylist_context ? { denylist_context: entry.denylist_context } : {}),
    }))
    .filter((entry) => entry.aliases.length > 0)
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
  if (danglingDropped > 0) {
    console.log(`[build]   serialize sweep: ${danglingDropped} dangling-connector aliases dropped`);
  }
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

  console.log('[build] generating alias-form variants (Pass 1, pre-filter — subject to collision filter)');
  const pass1 = applyFormVariantsPass1(byTicker);
  console.log(`[build]   ${pass1.generated} form variants generated (spacing / &<->and / Ltd<->Limited)`);

  console.log('[build] applying Decision 6(a) collision filter');
  const collisions = applyCollisionFilter(byTicker);
  console.log(`[build]   ${collisions.length} aliases dropped (multi-ticker claim OR first-word ambiguity)`);

  // Audit: how many Pass-1 form variants survived the collision filter.
  const survivingVariants = new Set();
  for (const entry of byTicker.values()) {
    for (const alias of entry.aliases) {
      const key = alias.toLowerCase();
      if (pass1.variantKeys.has(key)) survivingVariants.add(key);
    }
  }
  console.log(
    `[build]   form-variant survival: ${survivingVariants.size}/${pass1.variantKeys.size} kept, ${pass1.variantKeys.size - survivingVariants.size} dropped by collision filter`,
  );
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

  // Snapshot the post-filter alias state so Pass 2 can generate variants for
  // ONLY the aliases injected below (which are deliberately collision-exempt).
  const preInjectionSnapshot = new Map([...byTicker].map(([t, e]) => [t, new Set(e.aliases)]));

  console.log('[build] applying INTENTIONAL_MULTI_TAG (post-filter escape hatch)');
  const multiAttached = applyIntentionalMultiTag(byTicker);
  console.log(`[build]   ${multiAttached} alias attachments via multi-tag overlay`);

  console.log('[build] applying V2-031b positive alias overlays');
  const overlayV2Stats = applyPositiveOverlays(byTicker);
  console.log(
    `[build]   ${overlayV2Stats.tickers} tickers: ${overlayV2Stats.added} aliases added, ${overlayV2Stats.dropped} dropped`,
  );

  console.log('[build] generating alias-form variants (Pass 2, post-overlay — collision-exempt)');
  const pass2 = applyFormVariantsPass2(byTicker, preInjectionSnapshot);
  console.log(`[build]   ${pass2.generated} form variants generated for injected aliases (e.g. "L&T" -> "L and T")`);

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
