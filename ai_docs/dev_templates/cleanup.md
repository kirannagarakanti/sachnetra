# Code Cleanup Template — SachNetra

> Remove dead code, fix lint warnings, improve readability — without changing behaviour.

---

## When to Use This

- After a sprint of rapid iteration that left behind commented-out code
- Before a PR review (James needs clean code)
- When `npm run lint` reports warnings
- When `npm run typecheck` shows errors that accumulated
- When a file has grown unwieldy and needs splitting

---

## Step 1: Scope the Cleanup

Ask / identify which files or areas to clean:
```
"Clean up the state filtering code" → src/services/rss.ts, src/components/StateSelector.ts
"Fix all lint warnings" → run npm run lint, collect the file list
"Clean up after Task 015" → look at files modified in that task
"Full codebase cleanup" → start with lint, then typecheck
```

---

## Step 2: Run Diagnostics

```bash
npm run lint          # Biome lint — collects all warnings + errors
npm run typecheck     # tsc --noEmit — TypeScript errors
git diff --stat       # See what's uncommitted (don't clean uncommitted work)
```

Read the output. Categorise issues:
- **Lint errors** — must fix (blocks CI)
- **Lint warnings** — should fix
- **Type errors** — must fix
- **Dead code** — remove if confirmed unused
- **Complexity** — refactor if function > 50 lines doing multiple things

---

## Step 3: Cleanup Actions (In Order)

### 3A: Remove Dead Code
```
- Commented-out blocks that have no explanatory value
- Variables declared but never used (TypeScript will flag these)
- Functions that are exported but never imported anywhere
- CSS classes defined but never applied
- india.ts exports that aren't routed through feeds.ts or panels.ts
```

**Before removing anything, verify with grep:**
```bash
grep -r "functionName" src/ api/ server/ --include="*.ts" --include="*.js"
# If only one result (the definition) — it's dead code, safe to remove
```

### 3B: Fix Biome Lint Issues
Common patterns in SachNetra:
```typescript
// ❌ Biome flags: prefer const
let x = computeValue();  // x never reassigned
// ✅ Fix:
const x = computeValue();

// ❌ Biome flags: no explicit any
function parse(data: any) {}
// ✅ Fix: use proper type or unknown
function parse(data: unknown) {}

// ❌ Biome flags: unused variable
const { a, b, c } = obj;  // c never used
// ✅ Fix: destructure only what's needed
const { a, b } = obj;

// ❌ Biome flags: console.log left in
console.log('debug:', state);
// ✅ Fix: remove entirely (or convert to structured log if intentional)
```

### 3C: TypeScript Strictness
```typescript
// ❌ Implicit any in callbacks
feeds.forEach(feed => {          // feed is any
  console.log(feed.name);
});
// ✅ Use proper type from imports
feeds.forEach((feed: FeedConfig) => {
  console.log(feed.name);
});

// ❌ Non-null assertion overuse
const el = document.getElementById('sn-timeline')!;
// ✅ Proper null check
const el = document.getElementById('sn-timeline');
if (!el) return;
```

### 3D: CSS Cleanup (sachnetra-specific)
```css
/* ❌ Unscoped — bleeds into WorldMonitor variants */
.story-card { background: var(--sn-purple); }

/* ✅ Scoped to India variant */
[data-variant="india"] .story-card { background: var(--sn-purple); }

/* ❌ Hardcoded colour */
.badge { background: #7b7bff; }

/* ✅ CSS variable */
.badge { background: var(--sn-purple); }

/* ❌ Commented-out blocks with no context */
/* .sn-old-header { display: none; } */

/* ✅ Either remove or add explanatory comment */
/* Hidden by Task 016: WorldMonitor header elements not relevant to SachNetra */
.version, .pizzint-indicator { display: none !important; }
```

### 3E: Function Size & Readability
If a function is > 50 lines or does more than one thing, suggest splitting:
```typescript
// ❌ Too large — renderCard() does fetching, parsing, AND rendering
async function renderCard(item: NewsItem) {
  const response = await fetch(item.url);
  // 60 lines of parsing, formatting, DOM manipulation
}

// ✅ Split into focused functions
async function fetchCardData(url: string): Promise<CardData> { ... }
function formatCardData(raw: CardData): DisplayCard { ... }
function renderCard(card: DisplayCard): void { ... }
```

---

## Step 4: Report What You Found

Before making changes, report:
```
## Cleanup Report

Lint issues found:   [X errors, Y warnings]
Type errors found:   [X]
Dead code found:     [list specific functions/vars]
CSS issues found:    [X unscoped rules, Y hardcoded colours]
Large functions:     [list if any]

Proposed changes:
  • [file] — [what, why]
  • [file] — [what, why]

Estimated impact: [X lines removed, Y warnings resolved]

Say "proceed" to clean up.
```

Wait for confirmation before modifying files.

---

## Step 5: After Cleanup

```bash
npm run typecheck   # Must still be 0 errors
npm run lint        # Must show fewer issues than before
```

Report:
```
✅ Cleanup complete

Removed:
  • [X] commented-out blocks
  • [Y] unused variables
  • [Z] dead CSS classes

Fixed:
  • [X] Biome lint errors
  • [Y] TypeScript warnings

Files touched:
  • src/[file] — [description of what changed]

Typecheck: ✅ 0 errors
Lint: ✅ Clean
```

---

## What NOT to Do

```
❌ Remove code you're not sure is dead — grep first
❌ Refactor logic while cleaning (separate task)
❌ Change function signatures (breaks callers)
❌ "Improve" algorithms — cleanup = readability, not optimisation
❌ Touch sacred files: full.ts, tech.ts, finance.ts
❌ Run npm run build or npm run dev
```
