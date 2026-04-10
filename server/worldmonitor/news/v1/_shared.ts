// ========================================================================
// Constants
// ========================================================================

export const CACHE_TTL_SECONDS = 86400; // 24 hours

// ========================================================================
// Shared cache-key logic (used by both server handler and client GET lookup)
// ========================================================================

export {
  CACHE_VERSION,
  canonicalizeSummaryInputs,
  buildSummaryCacheKey,
  buildSummaryCacheKey as getCacheKey,
} from '../../../../src/utils/summary-cache-key';

// ========================================================================
// Hash utility (unified FNV-1a 52-bit -- H-7 fix)
// ========================================================================

import { hashString } from '../../../_shared/hash';
export { hashString };

// ========================================================================
// Headline deduplication (used by SummarizeArticle)
// ========================================================================

export { deduplicateHeadlines } from './dedup.mjs';

// ========================================================================
// SummarizeArticle: Full prompt builder (ported from _summarize-handler.js)
// ========================================================================

export function buildArticlePrompts(
  headlines: string[],
  uniqueHeadlines: string[],
  opts: { mode: string; geoContext: string; variant: string; lang: string },
): { systemPrompt: string; userPrompt: string } {
  const headlineText = uniqueHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n');
  const intelSection = opts.geoContext ? `\n\n${opts.geoContext}` : '';
  const isTechVariant = opts.variant === 'tech';
  const isIndiaVariant = opts.variant === 'india';
  const dateContext = `Current date: ${new Date().toISOString().split('T')[0]}.${isTechVariant ? '' : ' Provide geopolitical context appropriate for the current date.'}`;
  const langInstruction = opts.lang && opts.lang !== 'en' ? `\nIMPORTANT: Output the summary in ${opts.lang.toUpperCase()} language.` : '';

  let systemPrompt: string;
  let userPrompt = '';

  if (opts.mode === 'daily-brief') {
    // SachNetra daily overview: 3 calm sentences summarising the whole day
    systemPrompt = `You are SachNetra's morning brief writer for urban Indians.
Summarize today's top news in exactly 3 calm sentences.
Write in plain English. No panic. No hype. No bullet points.
Cover the most important stories from the headlines below.
Start with the most significant story.
Respond with ONLY the 3 sentences. Nothing else.`;
    userPrompt = `Here are today's top headlines:\n\n${headlineText}`;
  } else if (opts.mode === 'brief') {
    if (isTechVariant) {
      systemPrompt = `${dateContext}

Summarize the single most important tech/startup headline in 2 concise sentences MAX (under 60 words total).
Rules:
- Each numbered headline below is a SEPARATE, UNRELATED story
- Pick the ONE most significant headline and summarize ONLY that story
- NEVER combine or merge facts, names, or details from different headlines
- Focus ONLY on technology, startups, AI, funding, product launches, or developer news
- IGNORE political news, trade policy, tariffs, government actions unless directly about tech regulation
- Lead with the company/product/technology name
- No bullet points, no meta-commentary, no elaboration beyond the core facts${langInstruction}`;
    } else if (isIndiaVariant) {
      // SachNetra two-summary prompt — returns JSON with summary + meaning
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
      userPrompt = `Here are news headlines about the same story from multiple sources:

${headlineText}

Write two summaries as a JSON object:

{
  "summary": "2-3 sentences. What happened, where, when, key facts.",
  "meaning": "2-3 sentences. What this means for people in India right now."
}

Rules for summary:
- 2-3 sentences max. Include actual person's name, place, and number if in the headlines.
- Never write "a politician" or "a leader" if the name is in the headlines.
- Never end with "No further details are available" or "Details are not available."
- Never add background sentences restating what the headline already says.
- NEVER invent facts not present in the headlines.

Rules for meaning:
- Write 2-3 sentences explaining what this story means for people living in India.
- Sound like a knowledgeable friend explaining the news — not a textbook or a journalist.
- Be specific and concrete: mention real effects on jobs, prices, travel, laws, markets, or daily life.
- For government schemes or policies: state who benefits and what they get. Never say "if you are a [caste/group]..." — just state the facts.
- For global events: explain the India connection (oil prices, trade, rupee, supply chains).
- For local incidents: explain what changed or what people nearby should know.
- Speak directly using "you" and "your" when appropriate.
- Do NOT speculate about the future. State what is happening or what has changed NOW.
- Do NOT include classification labels like "direct_impact:" or "indirect_signal," in your output.
- Only return meaning as empty string "" if the story is purely entertainment, celebrity gossip, or a feel-good animal story with no practical relevance.

NEVER write any of these phrases:
- "For ordinary Indians"
- "It's essential to stay informed"
- "consult a financial advisor"
- "does not directly affect most Indians"
- "highlights the importance of"
- "this may not affect"
- "may affect the outcome of future"

General rules:
- Both fields in simple English that a 16-year-old can understand
- If the story is political, remain completely neutral in both fields
- If the story is a disaster, mention relief measures if reported
- Do not start either field with "This" or "The"
- Respond ONLY with the JSON object, nothing else
`;
    } else {
      systemPrompt = `${dateContext}

Summarize the single most important headline in 2 concise sentences MAX (under 60 words total).
Rules:
- Each numbered headline below is a SEPARATE, UNRELATED story
- Pick the ONE most significant headline and summarize ONLY that story
- NEVER combine or merge people, places, or facts from different headlines into one sentence
- Lead with WHAT happened and WHERE - be specific
- NEVER start with "Breaking news", "Good evening", "Tonight", or TV-style openings
- Start directly with the subject of the chosen headline
- If intelligence context is provided, use it only if it relates to your chosen headline
- No bullet points, no meta-commentary, no elaboration beyond the core facts${langInstruction}`;
    }
    if (!isIndiaVariant) {
      userPrompt = `Each headline below is a separate story. Pick the most important ONE and summarize only that story:\n${headlineText}${intelSection}`;
    }
  } else if (opts.mode === 'analysis') {
    if (isTechVariant) {
      systemPrompt = `${dateContext}

Analyze the most significant tech/startup development in 2 concise sentences MAX (under 60 words total).
Rules:
- Each numbered headline below is a SEPARATE, UNRELATED story
- Pick the ONE most significant story and analyze ONLY that
- NEVER combine facts from different headlines
- Focus ONLY on technology implications: funding trends, AI developments, market shifts, product strategy
- IGNORE political implications, trade wars, government unless directly about tech policy
- Lead with the insight, no filler or elaboration`;
    } else {
      systemPrompt = `${dateContext}

Analyze the most significant development in 2 concise sentences MAX (under 60 words total). Be direct and specific.
Rules:
- Each numbered headline below is a SEPARATE, UNRELATED story
- Pick the ONE most significant story and analyze ONLY that
- NEVER combine or merge people, places, or facts from different headlines
- Lead with the insight - what's significant and why
- NEVER start with "Breaking news", "Tonight", "The key/dominant narrative is"
- Start with substance, no filler or elaboration
- If intelligence context is provided, use it only if it relates to your chosen headline`;
    }
    userPrompt = isTechVariant
      ? `Each headline is a separate story. What's the key tech trend?\n${headlineText}${intelSection}`
      : `Each headline is a separate story. What's the key pattern or risk?\n${headlineText}${intelSection}`;
  } else if (opts.mode === 'translate') {
    const targetLang = opts.variant;
    systemPrompt = `You are a professional news translator. Translate the following news headlines/summaries into ${targetLang}.
Rules:
- Maintain the original tone and journalistic style.
- Do NOT add any conversational filler (e.g., "Here is the translation").
- Output ONLY the translated text.
- If the text is already in ${targetLang}, return it as is.`;
    userPrompt = `Translate to ${targetLang}:\n${headlines[0]}`;
  } else {
    systemPrompt = isTechVariant
      ? `${dateContext}\n\nPick the most important tech headline and summarize it in 2 concise sentences (under 60 words). Each headline is a separate story - NEVER merge facts from different headlines. Focus on startups, AI, funding, products. Ignore politics unless directly about tech regulation.${langInstruction}`
      : `${dateContext}\n\nPick the most important headline and summarize it in 2 concise sentences (under 60 words). Each headline is a separate, unrelated story - NEVER merge people or facts from different headlines. Lead with substance. NEVER start with "Breaking news" or "Tonight".${langInstruction}`;
    userPrompt = `Each headline is a separate story. Key takeaway from the most important one:\n${headlineText}${intelSection}`;
  }

  return { systemPrompt, userPrompt };
}

// ========================================================================
// SachNetra two-summary JSON parser
// ========================================================================

export interface TwoSummaryResult {
  summary: string;
  meaning: string;
}

/** Parse LLM response expecting { summary, meaning } JSON. Falls back to raw text. */
export function parseTwoSummaryResponse(rawResponse: string): TwoSummaryResult {
  try {
    // Strip markdown code fences if present (LLMs sometimes wrap JSON despite instructions)
    const cleaned = rawResponse
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    if (typeof parsed.summary !== 'string' || typeof parsed.meaning !== 'string') {
      throw new Error('Invalid response structure');
    }

    return {
      summary: parsed.summary.trim(),
      meaning: parsed.meaning.trim(),
    };
  } catch {
    // Fallback: if JSON parsing fails, use raw as summary (should rarely happen with temperature 0)
    return {
      summary: rawResponse.trim(),
      meaning: '',
    };
  }
}

// ========================================================================
// SummarizeArticle: Provider credential resolution (canonical source)
// ========================================================================

export { getProviderCredentials } from '../../../_shared/llm';
export type { ProviderCredentials } from '../../../_shared/llm';
