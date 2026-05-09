import type {
  ServerContext,
  SummarizeArticleRequest,
  SummarizeArticleResponse,
} from '../../../../src/generated/server/worldmonitor/news/v1/service_server';

import { cachedFetchJsonWithMeta } from '../../../_shared/redis';
import {
  CACHE_TTL_SECONDS,
  deduplicateHeadlines,
  buildArticlePrompts,
  getProviderCredentials,
  getCacheKey,
  parseTwoSummaryResponse,
  type TwoSummaryResult,
} from './_shared';
import { CHROME_UA } from '../../../_shared/constants';
import { isProviderAvailable } from '../../../_shared/llm-health';

// ======================================================================
// Reasoning preamble detection
// ======================================================================

export const TASK_NARRATION = /^(we need to|i need to|let me|i'll |i should|i will |the task is|the instructions|according to the rules|so we need to|okay[,.]\s*(i'll|let me|so|we need|the task|i should|i will)|sure[,.]\s*(i'll|let me|so|we need|the task|i should|i will|here)|first[, ]+(i|we|let)|to summarize (the headlines|the task|this)|my task (is|was|:)|step \d)/i;
export const PROMPT_ECHO = /^(summarize the top story|summarize the key|rules:|here are the rules|the top story is likely)/i;

export function hasReasoningPreamble(text: string): boolean {
  const trimmed = text.trim();
  return TASK_NARRATION.test(trimmed) || PROMPT_ECHO.test(trimmed);
}

// ======================================================================
// Enrichment queue — fire-and-forget RPUSH to Redis for cron to UPDATE PostgreSQL
// ======================================================================

async function pushEnrichmentQueue(parsed: TwoSummaryResult, firstHeadline: string): Promise<void> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken || !firstHeadline || !parsed.sentiment) return;

  const data = new TextEncoder().encode(firstHeadline.trim());
  const buf = await crypto.subtle.digest('SHA-256', data);
  const headlineHash = Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const payload = JSON.stringify({
    headline_hash: headlineHash,
    sentiment_label: parsed.sentiment,
    sentiment_score: parsed.sentimentScore,
    companies: parsed.companiesMentioned,
    event_type: parsed.eventType,
  });

  await ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args))(redisUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['RPUSH', 'news:enrich-queue:v1', payload]),
    signal: AbortSignal.timeout(3_000),
  });
}

// ======================================================================
// SummarizeArticle: Multi-provider LLM summarization with Redis caching
// Ported from api/_summarize-handler.js
// ======================================================================

export async function summarizeArticle(
  _ctx: ServerContext,
  req: SummarizeArticleRequest,
): Promise<SummarizeArticleResponse> {
  const { provider, mode = 'brief', geoContext = '', variant = 'full', lang = 'en' } = req;

  // Input sanitization (M-14 fix): limit headline count and length
  const MAX_HEADLINES = 10;
  const MAX_HEADLINE_LEN = 500;
  const MAX_GEO_CONTEXT_LEN = 2000;
  const headlines = (req.headlines || [])
    .slice(0, MAX_HEADLINES)
    .map(h => typeof h === 'string' ? h.slice(0, MAX_HEADLINE_LEN) : '');
  const sanitizedGeoContext = typeof geoContext === 'string' ? geoContext.slice(0, MAX_GEO_CONTEXT_LEN) : '';

  // Provider credential check
  const skipReasons: Record<string, string> = {
    ollama: 'OLLAMA_API_URL not configured',
    groq: 'GROQ_API_KEY not configured',
    openrouter: 'OPENROUTER_API_KEY not configured',
  };

  const credentials = getProviderCredentials(provider);
  if (!credentials) {
    return {
      summary: '',
      model: '',
      provider: provider,
      tokens: 0,
      fallback: true,
      error: '',
      errorType: '',
      status: 'SUMMARIZE_STATUS_SKIPPED',
      statusDetail: skipReasons[provider] || `Unknown provider: ${provider}`,
    };
  }

  const { apiUrl, model, headers: providerHeaders, extraBody } = credentials;

  // Request validation
  if (!headlines || !Array.isArray(headlines) || headlines.length === 0) {
    return {
      summary: '',
      model: '',
      provider: provider,
      tokens: 0,
      fallback: false,
      error: 'Headlines array required',
      errorType: 'ValidationError',
      status: 'SUMMARIZE_STATUS_ERROR',
      statusDetail: 'Headlines array required',
    };
  }

  try {
    const cacheKey = getCacheKey(headlines, mode, sanitizedGeoContext, variant, lang);

    // Single atomic call — source tracking happens inside cachedFetchJsonWithMeta,
    // eliminating the TOCTOU race between a separate getCachedJson and cachedFetchJson.
    const { data: result, source } = await cachedFetchJsonWithMeta<{ summary: string; model: string; tokens: number }>(
      cacheKey,
      CACHE_TTL_SECONDS,
      async () => {
        // Health gate inside fetcher — only runs on cache miss
        if (!(await isProviderAvailable(apiUrl))) return null;
        const uniqueHeadlines = deduplicateHeadlines(headlines.slice(0, 5));
        const { systemPrompt, userPrompt } = buildArticlePrompts(headlines, uniqueHeadlines, {
          mode,
          geoContext: sanitizedGeoContext,
          variant,
          lang,
        });

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { ...providerHeaders, 'User-Agent': CHROME_UA },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            // India variant needs temperature 0 for reliable output
            temperature: (variant === 'india' && (mode === 'brief' || mode === 'daily-brief')) ? 0 : 0.3,
            max_tokens: mode === 'daily-brief' ? 200 : (variant === 'india' && mode === 'brief') ? 600 : 100,
            top_p: 0.9,
            ...extraBody,
          }),
          signal: AbortSignal.timeout(25_000),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[SummarizeArticle:${provider}] API error:`, response.status, errorText);
          throw new Error(response.status === 429 ? 'Rate limited' : `${provider} API error`);
        }

        const data = await response.json() as any;
        const tokens = (data.usage?.total_tokens as number) || 0;
        const message = data.choices?.[0]?.message;
        let rawContent = typeof message?.content === 'string' ? message.content.trim() : '';

        rawContent = rawContent
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .replace(/<\|thinking\|>[\s\S]*?<\|\/thinking\|>/gi, '')
          .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
          .replace(/<reflection>[\s\S]*?<\/reflection>/gi, '')
          .replace(/<\|begin_of_thought\|>[\s\S]*?<\|end_of_thought\|>/gi, '')
          .trim();

        // Strip unterminated thinking blocks (no closing tag)
        rawContent = rawContent
          .replace(/<think>[\s\S]*/gi, '')
          .replace(/<\|thinking\|>[\s\S]*/gi, '')
          .replace(/<reasoning>[\s\S]*/gi, '')
          .replace(/<reflection>[\s\S]*/gi, '')
          .replace(/<\|begin_of_thought\|>[\s\S]*/gi, '')
          .trim();

        if (['brief', 'analysis'].includes(mode) && rawContent.length < 20) {
          console.warn(`[SummarizeArticle:${provider}] Output too short after stripping (${rawContent.length} chars), rejecting`);
          return null;
        }

        if (['brief', 'analysis'].includes(mode) && hasReasoningPreamble(rawContent)) {
          console.warn(`[SummarizeArticle:${provider}] Reasoning preamble detected, rejecting`);
          return null;
        }

        // India brief must return non-empty meaning — reject and don't cache if missing
        if (variant === 'india' && mode === 'brief') {
          const testParsed = parseTwoSummaryResponse(rawContent);
          if (!testParsed.meaning) {
            console.warn(`[SummarizeArticle:${provider}] India brief returned empty meaning, rejecting`);
            return null;
          }
        }

        return rawContent ? { summary: rawContent, model, tokens } : null;
      },
    );

    if (result?.summary) {
      const isCached = source === 'cache';

      // For India variant brief mode: parse the two-summary JSON and re-encode
      // so the frontend receives all intelligence fields as a JSON string in
      // the proto's single `summary` field.
      // daily-brief mode returns plain text — no JSON encoding needed.
      let finalSummary = result.summary;
      if (variant === 'india' && mode === 'brief' && !isCached) {
        const parsed = parseTwoSummaryResponse(result.summary);
        finalSummary = JSON.stringify({
          summary: parsed.summary,
          meaning: parsed.meaning,
          sentiment: parsed.sentiment,
          sentiment_score: parsed.sentimentScore,
          companies_mentioned: parsed.companiesMentioned,
          event_type: parsed.eventType,
        });
        pushEnrichmentQueue(parsed, headlines[0] ?? '').catch(() => {});
      }

      return {
        summary: finalSummary,
        model: result.model || model,
        provider: isCached ? 'cache' : provider,
        tokens: isCached ? 0 : (result.tokens || 0),
        fallback: false,
        error: '',
        errorType: '',
        status: isCached ? 'SUMMARIZE_STATUS_CACHED' : 'SUMMARIZE_STATUS_SUCCESS',
        statusDetail: '',
      };
    }

    return {
      summary: '',
      model: '',
      provider: provider,
      tokens: 0,
      fallback: true,
      error: 'Empty response',
      errorType: '',
      status: 'SUMMARIZE_STATUS_ERROR',
      statusDetail: 'Empty response',
    };

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`[SummarizeArticle:${provider}] Error:`, error.name, error.message);
    return {
      summary: '',
      model: '',
      provider: provider,
      tokens: 0,
      fallback: true,
      error: error.message,
      errorType: error.name,
      status: 'SUMMARIZE_STATUS_ERROR',
      statusDetail: `${error.name}: ${error.message}`,
    };
  }
}
