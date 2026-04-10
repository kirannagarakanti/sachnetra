# SachNetra — AI Prompt Specification
*Prep Document 05 | The Adapt Sprint*

> Updated 2026-04-10: Improved prompt quality — anti-hallucination, banned phrases, meaning classification (Task 018)

---

## The Core Change

WorldMonitor generates **one summary** per story cluster.
SachNetra generates **two summaries** per story cluster.

```
WorldMonitor output:
  "Heavy flooding in Assam has displaced thousands..."
  (one paragraph, news summary)

SachNetra output:
  {
    "summary": "Heavy rainfall since Tuesday caused...",
    "meaning": "If you are travelling to Assam..."
  }
  (two fields, plain language + practical impact)
```

This is the feature that defines SachNetra. Nobody else does this.

---

## Files to Modify

```
api/groq-summarize.js        ← PRIMARY — modify this
api/openrouter-summarize.js  ← SECONDARY — same change
```

Both files share the same Redis cache key logic.
Change both or summaries will be inconsistent across fallbacks.

---

## The New Prompt

Replace the existing single-summary prompt with this:

```javascript
const SACHNETRA_SYSTEM_PROMPT = `You are SachNetra's news summarizer.
You help urban Indians understand what's happening without panic or confusion.

Your tone is:
- Calm and factual (never alarming, never sensational)
- Plain language (write like you're explaining to a friend, not a journalist)
- Specific (mention actual names, places, numbers if available in the headlines)
- Neutral (no political bias, no editorial opinion)

CRITICAL: NEVER invent facts, names, policies, or events not present in the headlines provided.
If a headline is ambiguous, summarize ONLY what is explicitly stated. Do not fill gaps with guesses.

You must respond ONLY with a valid JSON object. No preamble, no explanation, no markdown.`;

const SACHNETRA_USER_PROMPT = (headlines) => `
Here are news headlines about the same story from multiple sources:

${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

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

---

## Response Parsing

The API returns a string. Parse it safely:

```javascript
function parseTwoSummaryResponse(rawResponse) {
  try {
    // Strip any markdown code fences if present
    const cleaned = rawResponse
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate both fields exist and are strings
    if (typeof parsed.summary !== 'string' || typeof parsed.meaning !== 'string') {
      throw new Error('Invalid response structure');
    }

    return {
      summary: parsed.summary.trim(),
      meaning: parsed.meaning.trim(),
    };
  } catch (error) {
    // Fallback: if JSON parsing fails, use raw as summary
    // This should rarely happen with temperature 0
    return {
      summary: rawResponse.trim(),
      meaning: '',
    };
  }
}
```

---

## Redis Cache Key

The cache key format does NOT change. Same key, different content stored.

```javascript
// Existing cache key format — keep this exactly
const cacheKey = `summary:v3:india:${headlineHash}:${geoHash}`;

// What gets stored changes — now stores JSON string
// { summary: "...", meaning: "..." }
// Still a string in Redis, just parsed differently on read
```

> ⚠️ **Verify before implementing**: The `:india:` segment in the cache key above is aspirational.
> The current codebase shares summaries across all variants — there is no variant-specific segment in the key.
> Check the actual cache key format in `api/groq-summarize.js` before implementing Task 005.

**Important**: Bump the cache version from `v3` to `v4` when deploying the new prompt.
This ensures old single-summary cached values are not returned.

```javascript
const CACHE_VERSION = 'v7'; // Bumped for improved prompt quality (Task 018)
```

---

## Groq Model Settings

Keep these identical to current WorldMonitor settings:

```javascript
const model = 'llama-3.1-8b-instant';  // Fast, good quality
const temperature = 0;                   // Zero — deterministic output
const max_tokens = 400;                  // Enough for both fields
```

Temperature 0 is critical. It prevents the LLM from generating inconsistent JSON structure.

---

## OpenRouter Fallback

`api/openrouter-summarize.js` uses the same prompt.
Same cache key. Same parsing logic.
The Redis cache is shared — if Groq already cached it, OpenRouter never runs.

```javascript
const model = 'meta-llama/llama-3.3-70b-instruct'; // Higher quality fallback
```

---

## Browser T5 Fallback

If both Groq and OpenRouter fail, browser T5 runs.
T5 does NOT support JSON structured output.

When T5 runs, return this structure:
```javascript
{
  summary: t5Output,  // T5's plain text output
  meaning: '',        // Empty — T5 can't generate this reliably
}
```

The frontend handles empty `meaning` gracefully — the green "What this means" section is hidden when `meaning` is empty string.

---

## Frontend Changes for Two Summaries

The story detail screen must display both fields.

**In the story detail component**, look for where the current summary is displayed. Replace it with:

```typescript
// Two separate cards
if (story.summary) {
  renderWhatHappenedCard(story.summary);   // Purple border card
}

if (story.meaning) {
  renderWhatThisMeansCard(story.meaning);  // Green border card
}
// If meaning is empty (T5 fallback), green card is not rendered
```

**Visual design** (from UI decisions):
- "What happened" card: purple left border, `WHAT HAPPENED` label with purple dot
- "What this means" card: green left border, `WHAT THIS MEANS` label with green dot
- Green card is the killer feature — no other Indian news app has this

---

## Today's Brief — Home Screen Summary

The home screen "Today's Brief" card is a different AI call — a 3-sentence summary of the entire day's top stories.

This is a separate prompt:

```javascript
const DAILY_BRIEF_PROMPT = (topHeadlines) => `
You are SachNetra's morning brief writer.
Summarize today's top 5 news items for urban Indians in exactly 3 calm sentences.
Write in plain English. No panic. No hype.
Cover the most important stories from: ${topHeadlines.join(', ')}
Start with the most significant story.
`;
```

Cache key: `sachnetra:daily-brief:v1:${dateString}`
TTL: 3 hours (regenerated 3x per day — morning, afternoon, evening)

---

## Prompt Quality Rules (Never Violate These)

```
1. NEVER use alarm words in prompts:
   crisis, catastrophe, terror, war, danger, emergency
   These leak into the LLM output even with neutral instructions.

2. ALWAYS specify "plain language" and age level:
   "16-year-old can understand" calibrates vocabulary correctly.

3. ALWAYS use temperature 0 for JSON output:
   Any temperature above 0 risks malformed JSON.

4. NEVER ask for predictions in summary prompts:
   "What will happen next" — LLMs hallucinate futures.
   Only "What this means" which is current-state practical advice.

5. ALWAYS strip markdown from responses:
   LLMs sometimes wrap JSON in ```json blocks even when told not to.
   The cleaning step is not optional.

6. Political content rule:
   If story involves BJP, Congress, any political party or leader,
   the prompt instructs neutrality.
   Never add political framing in the prompt itself.
```

---

## Rate Limit Management

```
Groq free tier: 14,400 requests/day
  With Redis caching (24h TTL):
    Each unique story → 1 Groq call
    Same story for 500K users → served from cache
    
Realistic daily Groq calls for SachNetra V1:
    ~50 unique story clusters per day
    × 1 call each = 50 calls/day
    Well within free tier
    
When V1 hits scale:
    Upgrade Groq plan before hitting 14,400
    Monitor with data freshness tracker
    OpenRouter as automatic fallback when Groq fails
```
