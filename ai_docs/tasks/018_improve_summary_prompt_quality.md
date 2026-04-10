# Task 018 — Improve Summary Prompt Quality
*SachNetra Adapt Sprint*

**Depends on**: Task 005 must be complete (two-summary system already live)
**Estimated time**: 1–2 hours
**Prep doc**: `ai_docs/sach/edit.md` (production quality audit), `ai_docs/prep/05_ai_prompt_spec.md` (original spec)

---

## Context — Current State

The two-summary system (Task 005) is live and working. Every India-variant story cluster passes through `buildArticlePrompts()` in `server/worldmonitor/news/v1/_shared.ts` (lines 72–103) and returns a JSON object with `summary` and `meaning` fields.

**The problem**: Production output quality is poor. An audit of 9 live story cards (documented in `ai_docs/sach/edit.md`) reveals systemic issues:

### "What Happened" (summary field) problems:
- **Vague references**: "a politician said" instead of naming Anbumani Ramadoss
- **Hedging filler**: "seems to be", "expected to release soon"
- **Dead padding**: "No further details are available."
- **Restating the obvious**: "Bay Capital is a venture capital firm" (headline already says this)
- **HALLUCINATION**: Story 4 fabricated Biden as president — the model invented facts not in the headlines. This is the most dangerous issue.

### "What This Means" (meaning field) problems:
- **"For ordinary Indians"** repeated verbatim in 6 out of 9 cards
- **Generic advice filler**: "it's essential to stay informed", "consult a financial advisor"
- **Watered-down dismissals**: "does not directly affect most Indians" on almost everything
- **Moralizing**: "It's essential for the government to address these issues"
- **No specificity**: Never answers "what does this change for ME?"

### Root cause:
The current prompt rules (lines 95–102 of `_shared.ts`) are too permissive. They say what TO do but not what NOT to do. The LLM defaults to safe, generic, template-like language when given freedom.

---

**Current prompt rules block** (`server/worldmonitor/news/v1/_shared.ts`, lines 95–102):
```typescript
Rules:
- summary: factual only, no opinions, no predictions
- meaning: practical and calm, not scary, not dismissive
- Both in simple English that a 16-year-old can understand
- If the story is political, remain completely neutral in both fields
- If the story is a disaster, mention relief measures if reported
- Do not start either field with "This" or "The"
- Respond ONLY with the JSON object, nothing else
```

**Current system prompt** (lines 74–83):
```typescript
You are SachNetra's news summarizer.
You help urban Indians understand what's happening without panic or confusion.

Your tone is:
- Calm and factual (never alarming, never sensational)
- Plain language (write like you're explaining to a friend, not a journalist)
- Specific (mention actual places, actual numbers if available)
- Neutral (no political bias, no editorial opinion)

You must respond ONLY with a valid JSON object. No preamble, no explanation, no markdown.
```

---

## What This Task Does

1. Rewrites the `SACHNETRA_USER_PROMPT` rules section to add explicit anti-hallucination guards and banned phrases
2. Adds an internal `meaning_type` classification step (direct_impact / indirect_signal / informational_only) to force specificity before writing the meaning field
3. Adds a concrete "meaning must answer ONE of these questions" rule to eliminate filler
4. Updates system prompt with a NEVER-invent-facts instruction
5. Bumps `CACHE_VERSION` from `v6` to `v7` so old low-quality summaries are not served from cache
6. Updates the prep doc `05_ai_prompt_spec.md` to match the new prompt

---

## Files To Open Before Starting

```
server/worldmonitor/news/v1/_shared.ts       — system prompt (line 74) + user prompt rules (line 84)
src/utils/summary-cache-key.ts               — CACHE_VERSION (line 7)
ai_docs/prep/05_ai_prompt_spec.md            — prompt spec doc to update
```

---

## Pattern To Follow

From `server/worldmonitor/news/v1/_shared.ts`, the India variant prompt block (lines 72–103):
```typescript
} else if (isIndiaVariant) {
  // SachNetra two-summary prompt — returns JSON with summary + meaning
  systemPrompt = `You are SachNetra's news summarizer. ...`;
  userPrompt = `Here are news headlines about the same story... Rules: ...`;
```
The system prompt and user prompt are template literals assigned directly. No external constant file — the prompt text lives inline in this function.

---

## Implementation

### Phase 1: Update System Prompt — Anti-Hallucination Guard
**Goal**: Prevent the model from inventing facts not in the headlines (the most dangerous bug)

- [ ] **Step 1.1** — Add hallucination guard to system prompt
  - File: `server/worldmonitor/news/v1/_shared.ts`
  - In the `isIndiaVariant` branch (line 74), update the system prompt to:
    ```typescript
    systemPrompt = `You are SachNetra's news summarizer.
You help urban Indians understand what's happening without panic or confusion.

Your tone is:
- Calm and factual (never alarming, never sensational)
- Plain language (write like you're explaining to a friend, not a journalist)
- Specific (mention actual names, places, numbers if available in the headlines)
- Neutral (no political bias, no editorial opinion)

CRITICAL: NEVER invent facts, names, policies, or events not present in the headlines provided.
If a headline is ambiguous, summarize ONLY what is explicitly stated. Do not fill gaps with guesses.

You must respond ONLY with a valid JSON object. No preamble, no explanation, no markdown.`;
    ```

### Phase 2: Rewrite User Prompt Rules
**Goal**: Replace permissive rules with explicit anti-pattern rules + meaning classification

- [ ] **Step 2.1** — Replace the user prompt rules block
  - File: `server/worldmonitor/news/v1/_shared.ts`
  - Replace the user prompt (lines 84–103) with:
    ```typescript
    userPrompt = `Here are news headlines about the same story from multiple sources:

${headlineText}

Write two summaries as a JSON object:

{
  "summary": "2-3 sentences. What happened, where, when, key facts.",
  "meaning": "1-2 sentences. What this changes for the reader. See rules below."
}

Rules for summary:
- 2-3 sentences max. Include actual person's name, place, and number if in the headlines.
- Never write "a politician" if the name is in the headlines.
- Never write "a specific date" — omit date if unknown.
- Never end with "No further details are available."
- Never add background sentences restating what the headline already says.
- NEVER invent facts not present in the headlines provided.
- If headlines are vague, summarize only what is explicitly stated.

Rules for meaning:
- Before writing, classify this story internally as one of:
  direct_impact (affects money, travel, health, law) /
  indirect_signal (shows a trend connected to something concrete) /
  informational_only (worth knowing but no direct effect)
- For direct_impact: state what changes for the reader.
- For indirect_signal: name the specific trend and what it connects to.
- For informational_only: one sentence on why it's worth knowing. No padding.
- meaning must answer ONE of: Does this affect my money? My job? My travel?
  A law that applies to me? Prices of something I buy?
  If none apply, return meaning as empty string "".
- If the story is entertainment, film, or celebrity news, return meaning: "".

NEVER write any of these phrases in either field:
- "For ordinary Indians"
- "It's essential to stay informed"
- "consult a financial advisor"
- "does not directly affect most Indians"
- "highlights the importance of"
- "this may not affect"

General rules:
- Both in simple English that a 16-year-old can understand
- If the story is political, remain completely neutral in both fields
- If the story is a disaster, mention relief measures if reported
- Do not start either field with "This" or "The"
- Respond ONLY with the JSON object, nothing else
`;
    ```

### Phase 3: Cache Version Bump
**Goal**: Old low-quality cached summaries must never be served

- [ ] **Step 3.1** — Bump CACHE_VERSION to v7
  - File: `src/utils/summary-cache-key.ts`
  - Change line 7 from:
    ```typescript
    export const CACHE_VERSION = 'v6'; // Bumped for SachNetra two-summary format
    ```
    to:
    ```typescript
    export const CACHE_VERSION = 'v7'; // Bumped for improved prompt quality (Task 018)
    ```

### Phase 4: Update Prep Doc
**Goal**: Keep the prompt spec doc in sync with codebase reality

- [ ] **Step 4.1** — Update `05_ai_prompt_spec.md` prompt section
  - File: `ai_docs/prep/05_ai_prompt_spec.md`
  - Replace the `SACHNETRA_SYSTEM_PROMPT` (lines 45–54) and `SACHNETRA_USER_PROMPT` (lines 56–76) with the new versions from Steps 1.1 and 2.1 above.
  - Add a note at the top: `> Updated 2026-04-10: Improved prompt quality — anti-hallucination, banned phrases, meaning classification (Task 018)`

---

## Before / After

**Before** (`_shared.ts`, system prompt, line 74):
```typescript
systemPrompt = `You are SachNetra's news summarizer.
You help urban Indians understand what's happening without panic or confusion.

Your tone is:
- Calm and factual (never alarming, never sensational)
- Plain language (write like you're explaining to a friend, not a journalist)
- Specific (mention actual places, actual numbers if available)
- Neutral (no political bias, no editorial opinion)

You must respond ONLY with a valid JSON object. No preamble, no explanation, no markdown.`;
```

**After**:
```typescript
systemPrompt = `You are SachNetra's news summarizer.
You help urban Indians understand what's happening without panic or confusion.

Your tone is:
- Calm and factual (never alarming, never sensational)
- Plain language (write like you're explaining to a friend, not a journalist)
- Specific (mention actual names, places, numbers if available in the headlines)
- Neutral (no political bias, no editorial opinion)

CRITICAL: NEVER invent facts, names, policies, or events not present in the headlines provided.
If a headline is ambiguous, summarize ONLY what is explicitly stated. Do not fill gaps with guesses.

You must respond ONLY with a valid JSON object. No preamble, no explanation, no markdown.`;
```

---

**Before** (`_shared.ts`, user prompt rules, lines 95–102):
```
Rules:
- summary: factual only, no opinions, no predictions
- meaning: practical and calm, not scary, not dismissive
- Both in simple English that a 16-year-old can understand
- If the story is political, remain completely neutral in both fields
- If the story is a disaster, mention relief measures if reported
- Do not start either field with "This" or "The"
- Respond ONLY with the JSON object, nothing else
```

**After** — see Step 2.1 above for the full replacement (too long to duplicate here).

Key additions:
- Anti-hallucination: "NEVER invent facts not present in the headlines"
- Banned phrases: 6 specific phrases the model must never output
- Meaning classification: forces `direct_impact` / `indirect_signal` / `informational_only` before writing
- Entertainment skip: entertainment/film stories → meaning: "" (hide the green card)
- Concrete test: "meaning must answer ONE of: money? job? travel? law? prices?"

---

## Read vs Write

**READ for reference (always allowed):**
- `ai_docs/sach/edit.md` — the audit with 9 bad examples
- `ai_docs/tasks/005_two_summary_ai_prompt.md` — how prompt was originally implemented
- `server/worldmonitor/news/v1/summarize-article.ts` — handler (no changes needed)
- `src/config/variants/full.ts` — sacred, never write
- `src/config/variants/tech.ts` — sacred, never write

**WRITE only to files explicitly listed in this task:**
- `server/worldmonitor/news/v1/_shared.ts` — system prompt + user prompt rules
- `src/utils/summary-cache-key.ts` — bump CACHE_VERSION to v7
- `ai_docs/prep/05_ai_prompt_spec.md` — update prompt spec

**Never write to:**
- `src/config/variants/full.ts` — sacred, existing live variant
- `src/config/variants/tech.ts` — sacred, existing live variant
- `src/config/variants/finance.ts` — sacred, existing live variant
- `server/worldmonitor/news/v1/summarize-article.ts` — no handler changes needed
- `proto/` — locked

---

## Verify

```bash
npm run typecheck   # Must show: 0 errors
```

### Existing test (must still pass):
```bash
npm run test:data   # Runs tests/summarize-reasoning.test.mjs among others
```
This test validates:
- CACHE_VERSION value (will need updating assertion from `v6` → `v7`)
- Reasoning preamble detection still works

### In browser (npm run dev with VITE_VARIANT=india):
- [ ] Open a story detail → see "WHAT HAPPENED" card
- [ ] Summary names actual people/places from headlines (not "a politician")
- [ ] Summary never ends with "No further details are available."
- [ ] "WHAT THIS MEANS" card never starts with "For ordinary Indians"
- [ ] "WHAT THIS MEANS" card never says "it's essential to stay informed"
- [ ] Entertainment/film stories → green card hidden (meaning is empty)
- [ ] Political stories → both fields neutral, no opinion
- [ ] Iran/oil type stories → meaning mentions specific impact (oil prices, not "stay informed")
- [ ] No hallucinated facts in summary (compare against actual headline text)

### Regression:
- [ ] Switch to VITE_VARIANT=tech → single summary still works normally
- [ ] Switch to VITE_VARIANT=full → single summary still works normally

### Debugging Checklist

1. **Summary still says "a politician"** → The new prompt didn't deploy. Check `_shared.ts` line 74 is updated. Clear Redis cache.
2. **Old summaries still showing** → CACHE_VERSION not bumped. Verify `v7` in `summary-cache-key.ts`.
3. **Meaning is always empty** → The LLM may be returning `""` for everything due to overly restrictive rules. Relax the "If none apply, return meaning: ''" to only apply to entertainment.
4. **JSON parse error** → The longer rules section may push output over `max_tokens: 400`. If this happens, increase to 500 in `summarize-article.ts` line 120.
5. **Test assertion fail** → Update `tests/summarize-reasoning.test.mjs` CACHE_VERSION assertion from `v6` to `v7`.

---

## What Good Output Looks Like

**Story: "Iran-Israel war LIVE: Strait of Hormuz management will enter new phase, says Iran's Supreme Leader"**

❌ Old (current):
```
summary: "Iran's Supreme Leader has announced that the management of the Strait of Hormuz will enter a new phase. This is a strategic waterway between Iran and the Gulf of Oman. Iran and Israel have been involved in a conflict."
meaning: "For ordinary Indians, this development may not have a direct impact on daily life. However, it's essential to stay informed about global events..."
```

✅ New (expected with updated prompt):
```
summary: "Iran's Supreme Leader Ayatollah Khamenei announced the Strait of Hormuz will enter a new management phase, amid ongoing Iran-Israel tensions."
meaning: "Strait of Hormuz carries roughly 20% of global oil, including a significant share of India's crude imports. Disruptions there tend to push petrol prices up within weeks."
```

**Story: "When love meets revenge: Adivi Sesh and Mrunal shines in Dacoit"**

❌ Old:
```
meaning: "If you're a movie fan, you might be interested in watching Dacoit when it releases..."
```

✅ New:
```
meaning: ""   ← (empty — entertainment story, green card hidden)
```

---

## Completion Log

- [ ] Phase 1 complete — Anti-hallucination system prompt
- [ ] Phase 2 complete — Rewritten user prompt rules
- [ ] Phase 3 complete — CACHE_VERSION bumped to v7
- [ ] Phase 4 complete — Prep doc updated
- [ ] Typecheck: 0 errors
- [ ] Tests pass
- [ ] Browser verified (India variant)
- [ ] Non-India variant regression passed
- [ ] **TASK 018 COMPLETE** ✅
