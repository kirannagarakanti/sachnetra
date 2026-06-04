# SachNetra Application Plan — LLMQuant / quant-mind

This document provides concrete, step-by-step implementation plans for each Pursue-rated pattern.  
Every plan cites the specific SachNetra file to edit and the exact change needed.

---

## P0: Unicode Normaliser

**Goal**: Prevent silent ticker-matching failures caused by ligatures and Unicode artifacts in RSS/NSE content.

**SachNetra file to edit**: `scripts/_india-market-keywords.mjs`

### Implementation

Create a new utility file:

```javascript
// scripts/_text-normalise.mjs

/**
 * Map of Unicode ligatures and smart quotes → ASCII equivalents.
 * Conservative: only characters that break text matching without destroying meaning.
 * Port of quantmind/preprocess/clean.py:normalize_unicode
 */
const LIGATURE_MAP = {
  '\ufb00': 'ff',   // ﬀ
  '\ufb01': 'fi',   // ﬁ
  '\ufb02': 'fl',   // ﬂ
  '\ufb03': 'ffi',  // ﬃ
  '\ufb04': 'ffl',  // ﬄ
  '\u2018': "'",    // ' (left single quote)
  '\u2019': "'",    // ' (right single quote)
  '\u201c': '"',    // " (left double quote)
  '\u201d': '"',    // " (right double quote)
  '\u2013': '-',    // – (en dash)
  '\u2014': '-',    // — (em dash)
  '\u2026': '...',  // … (ellipsis)
  '\u00a0': ' ',    // non-breaking space
};

const LIGATURE_RE = new RegExp(
  Object.keys(LIGATURE_MAP).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'g'
);

// Control characters except \n (0x0a) and \t (0x09)
const CONTROL_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

/**
 * Normalise Unicode artifacts common in PDF-extracted and RSS content.
 * Run this before any regex matching or NLP processing.
 * @param {string} text
 * @returns {string}
 */
export function normalizeUnicode(text) {
  if (!text) return '';
  // Step 1: NFC normalisation (JS doesn't have NFKC natively, NFC handles most cases)
  let result = text.normalize('NFC');
  // Step 2: Targeted ligature + smart quote replacement
  result = result.replace(LIGATURE_RE, m => LIGATURE_MAP[m]);
  // Step 3: Remove control characters
  result = result.replace(CONTROL_RE, '');
  return result;
}
```

**Wire into `_india-market-keywords.mjs`**:
```javascript
import { normalizeUnicode } from './_text-normalise.mjs';

// Before: tagHeadline(headline)
// After:
export function tagHeadline(rawHeadline) {
  const headline = normalizeUnicode(rawHeadline);
  // ... existing regex matching logic
}
```

**Validation**:
- Add to existing smoke test: create `tests/preprocess/test-normalise.mjs`
- Test case: `normalizeUnicode('L\u2019T posts \ufb01nancial results')` → `"L'T posts financial results"`
- Verify existing 30/30 precision tests still pass after wiring

**Effort**: ~2 hours

---

## P1: Tree Document Schema (TypeScript Port)

**Goal**: Enable section-level content isolation for Exp 2, Exp 10 direction extraction, and Exp 14 governance shocks.

**New file**: `src/types/tree-knowledge.ts`

### TypeScript Port

```typescript
// src/types/tree-knowledge.ts
// Port of quantmind/knowledge/_tree.py

import { randomUUID } from 'crypto';

export interface Citation {
  sourceId: string;
  page?: number;
  charOffset?: number;
  quote?: string;           // max 500 chars
  treeId?: string;          // UUID of the TreeKnowledge item
  nodeId?: string;          // UUID of the specific node
}

export interface TreeNode {
  nodeId: string;           // UUID
  parentId: string | null;  // null = root
  position: number;         // ordinal among siblings
  title: string;
  summary: string;          // MANDATORY — agents navigate by reading this
  content?: string;         // FULL TEXT — only on leaf nodes
  citations: Citation[];
  childrenIds: string[];    // UUIDs of child nodes
}

export interface TreeKnowledge {
  id: string;               // UUID
  itemType: string;         // overridden in domain subinterfaces
  asOf: Date;               // MANDATORY — when was this info valid?
  createdAt: Date;
  sourceKind: 'nse_bourse' | 'bse_api' | 'http' | 'rss' | 'local' | 'manual';
  sourceUri?: string;
  contentHash?: string;     // SHA-256 of raw bytes for dedup
  confidence: 'low' | 'medium' | 'high';
  tags: string[];
  // Tree structure
  rootNodeId: string;
  nodes: Record<string, TreeNode>;  // flat adjacency list, O(1) lookup
}

/** Domain-specific extension for NSE filings */
export interface NSEFiling extends TreeKnowledge {
  itemType: 'nse_filing';
  ticker: string;
  period: string;                   // "Q4FY26", "FY2026"
  filingCategory: string;           // "Financial Results", "Corporate Action", etc.
  nseFilingId: string;              // NSE Bourse filing ID
}

// ── Navigation helpers ─────────────────────────────────────────────────────

export function treeRoot(tree: TreeKnowledge): TreeNode {
  return tree.nodes[tree.rootNodeId];
}

export function treeChildrenOf(tree: TreeKnowledge, nodeId: string): TreeNode[] {
  const node = tree.nodes[nodeId];
  return node.childrenIds.map(id => tree.nodes[id]);
}

export function* treeDfs(tree: TreeKnowledge): Generator<TreeNode> {
  const stack = [tree.rootNodeId];
  while (stack.length > 0) {
    const nodeId = stack.pop()!;
    const node = tree.nodes[nodeId];
    yield node;
    // Push in reverse so first child is processed first
    for (let i = node.childrenIds.length - 1; i >= 0; i--) {
      stack.push(node.childrenIds[i]);
    }
  }
}

export function treeFindPath(tree: TreeKnowledge, nodeId: string): TreeNode[] {
  if (!(nodeId in tree.nodes)) return [];
  const path: TreeNode[] = [];
  let cursor: string | null = nodeId;
  while (cursor !== null) {
    const node = tree.nodes[cursor];
    path.push(node);
    cursor = node.parentId;
  }
  return path.reverse();
}

export function createNode(
  title: string,
  summary: string,
  opts: Partial<TreeNode> = {}
): TreeNode {
  return {
    nodeId: randomUUID(),
    parentId: null,
    position: 0,
    title,
    summary,
    citations: [],
    childrenIds: [],
    ...opts,
  };
}
```

**Register in `src/types/index.ts`** (or wherever types are exported).

**Wire into NSE filing ingestion**: `src/services/nse-bourse.ts` (or equivalent) — when a financial results filing is processed, structure it as `NSEFiling` with a section tree instead of a flat `body` string.

**Effort**: ~1 day (schema + navigation helpers) + ~2 days (wiring into ingestion) + ~1 day (Exp 2 query rewrite to use tree paths)

---

## P1: Import Boundary Enforcement

**Goal**: Machine-enforce the dependency direction documented in `AGENTS.md` so violations are caught at PR time.

**New file**: `.eslintrc.boundaries.js` (or add to existing ESLint config)

### Implementation

```bash
npm install -D eslint-plugin-boundaries
```

Add to ESLint config:

```javascript
// eslint.config.js (flat config) or .eslintrc.js
{
  plugins: { boundaries: require('eslint-plugin-boundaries') },
  settings: {
    'boundaries/elements': [
      { type: 'types',      pattern: 'src/types/*' },
      { type: 'config',     pattern: 'src/config/*' },
      { type: 'services',   pattern: 'src/services/*' },
      { type: 'components', pattern: 'src/components/*' },
      { type: 'app',        pattern: 'src/app/*' },
      { type: 'workers',    pattern: 'src/workers/*' },
      { type: 'api',        pattern: 'api/*' },
    ],
  },
  rules: {
    'boundaries/element-types': ['error', {
      default: 'disallow',
      rules: [
        { from: 'types',      allow: [] },              // imports only stdlib/npm
        { from: 'config',     allow: ['types'] },
        { from: 'services',   allow: ['types', 'config'] },
        { from: 'components', allow: ['types', 'config', 'services'] },
        { from: 'app',        allow: ['types', 'config', 'services', 'components'] },
        { from: 'workers',    allow: ['types', 'config', 'services'] },
        { from: 'api',        allow: [] },              // Edge Functions: self-contained
      ],
    }],
  },
}
```

**Add to CI**: The pre-push hook already runs `tsc --noEmit`. Add `eslint --ext .ts src/ api/` to the same hook.

**Warning**: The first run will likely surface existing violations. Plan for a cleanup sprint before enabling `--max-warnings 0`.

**Effort**: ~4 hours setup + ~1 day fixing existing violations

---

## P1: Date Parsing — `parse_filing_date` Port

**Goal**: Robust UTC datetime parsing for NSE/BSE date formats that break `new Date()`.

**New file**: `scripts/_date-utils.mjs`

### Implementation

```javascript
// scripts/_date-utils.mjs
// Port of quantmind/preprocess/time.py:parse_filing_date

import { parse, parseISO } from 'date-fns';  // or dayjs

const DATE_FORMATS = [
  // ISO 8601 variants (specificity-first)
  "yyyy-MM-dd'T'HH:mm:ss.SSSX",   // 2026-05-23T09:15:00.000Z
  "yyyy-MM-dd'T'HH:mm:ssX",        // 2026-05-23T09:15:00Z
  "yyyy-MM-dd'T'HH:mm:ss",         // 2026-05-23T09:15:00
  "yyyy-MM-dd HH:mm:ss",           // 2026-05-23 09:15:00
  "yyyy-MM-dd",                    // 2026-05-23
  "yyyy/MM/dd",                    // 2026/05/23
  // NSE Bourse format
  "dd-MMM-yyyy HH:mm:ss",         // 23-May-2026 09:15:00
  "dd-MMM-yyyy",                  // 23-May-2026
  // BSE format
  "dd/MM/yyyy",                   // 23/05/2026
  // Journal/news formats
  "d MMM yyyy",                   // 23 May 2026
  "MMM d, yyyy",                  // May 23, 2026
];

const UTC = new Intl.DateTimeFormat('en', { timeZone: 'UTC' });

/**
 * Parse a date string into a UTC Date object.
 * Accepts NSE (dd-MMM-yyyy), BSE (dd/MM/yyyy), ISO 8601, and journal formats.
 * @param {string} value
 * @returns {Date} UTC Date
 * @throws {Error} if no format matches
 */
export function parseFilingDate(value) {
  const text = value.trim();
  if (!text) throw new Error('empty date string');

  // Try native ISO 8601 first (fast path for API responses)
  const iso = new Date(text);
  if (!isNaN(iso.getTime()) && text.includes('T')) {
    return iso;  // Already UTC if ISO 8601 with Z
  }

  // Try each format
  for (const fmt of DATE_FORMATS) {
    const parsed = parse(text, fmt, new Date(0));  // date-fns parse
    if (!isNaN(parsed.getTime())) {
      // Assume local time is IST (UTC+5:30) for NSE/BSE dates without timezone
      // Convert to UTC: subtract 5h30m
      if (!text.includes('Z') && !text.match(/[+-]\d{2}:?\d{2}$/)) {
        return new Date(parsed.getTime() - (5.5 * 60 * 60 * 1000));
      }
      return parsed;
    }
  }

  throw new Error(`Could not parse date: ${JSON.stringify(value)}`);
}

/**
 * Count business days (Mon–Fri) between two dates, inclusive of both endpoints.
 * No holiday calendar — exchange holidays not accounted for.
 * Port of quantmind/preprocess/time.py:business_days_between
 * @param {Date} a
 * @param {Date} b
 * @returns {number}
 */
export function businessDaysBetween(a, b) {
  let start = a < b ? a : b;
  let end = a < b ? b : a;
  const totalDays = Math.round((end - start) / 86400000) + 1;
  const fullWeeks = Math.floor(totalDays / 7);
  const remainder = totalDays % 7;
  let weekdays = fullWeeks * 5;
  const startDow = start.getUTCDay(); // 0 = Sun, 6 = Sat
  for (let i = 0; i < remainder; i++) {
    const dow = (startDow + i) % 7;
    if (dow >= 1 && dow <= 5) weekdays++;  // Mon–Fri
  }
  return weekdays;
}
```

**Wire into**: `scripts/seed-india-signals.mjs` — replace `new Date(filing.date)` with `parseFilingDate(filing.date)`.

**Effort**: ~3 hours

---

## P2: Content Hash for News Dedup

**Goal**: Detect duplicate stories from multiple RSS feeds using SHA-256 of content.

**SachNetra file to edit**: `scripts/seed-india-signals.mjs`

### Implementation

```javascript
import crypto from 'crypto';

function contentHash(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

// When building a news record:
const record = {
  headline: item.title,
  body: item.description,
  source_url: item.link,
  content_hash: contentHash(item.title + item.description),  // dedup key
  published_at: parseFilingDate(item.pubDate),
  // ...
};

// Before INSERT: check if content_hash already exists
const existing = await db.query(
  'SELECT id FROM news WHERE content_hash = $1',
  [record.content_hash]
);
if (existing.rows.length > 0) {
  continue; // skip duplicate
}
```

**Effort**: ~1 hour

---

## Sequencing Recommendation

| Order | Pattern | Effort | Why This Order |
|---|---|---|---|
| 1 | Unicode normaliser | 2h | P0, unblocks coverage gate |
| 2 | Date parser | 3h | P1, feeds event-study accuracy |
| 3 | Business days | 1h | P1, same file as date parser |
| 4 | Content hash dedup | 1h | P2, standalone, quick win |
| 5 | Import enforcement | 4h setup + 1d cleanup | P1, no new features, debt prevention |
| 6 | Tree schema (TypeScript port) | 3d | P1, bigger effort, unblocks experiments |
| 7 | HTML boilerplate stripper | 1d | P2, when body processing is added |

Items 1–4 can be done in a single focused day. Item 5 is a team-awareness task. Item 6 is a feature sprint. Item 7 is opportunistic.

---

## What NOT to Build

| Pattern | Why Not |
|---|---|
| LLM ticker tagger | V2-031 Decision 2; deterministic tagger is faster + cheaper + more accurate after V2-031b |
| `magic.py` NL resolver | No interactive use case in production crons; costs extra LLM call per execution |
| `thesis_flow` | SachNetra doesn't process investment theses in V2 |
| `factor_flow` | SachNetra doesn't store factor research in V2 |
| Full `paper_flow` | SachNetra's primary sources are RSS + NSE APIs, not academic PDFs |
