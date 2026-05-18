#!/usr/bin/env node

import { withRetry, getRedisCredentials, CHROME_UA } from './_seed-utils.mjs';

const HF_FINBERT_URL = 'https://router.huggingface.co/hf-inference/models/ProsusAI/finbert';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DLQ_KEY = 'news:dlq:india_signals';

function normaliseScore(label, score) {
  const l = label.toLowerCase();
  if (l === 'positive') return +Math.abs(score).toFixed(4);
  if (l === 'negative') return -Math.abs(score).toFixed(4);
  return 0.0;
}

async function scoreHuggingFace(text) {
  const token = process.env.HF_API_TOKEN;
  if (!token) throw new Error('HF_API_TOKEN not set');

  const resp = await fetch(HF_FINBERT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: text }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) throw new Error(`HuggingFace API: HTTP ${resp.status}`);
  const data = await resp.json();

  // FinBERT returns [[{label, score}, ...]] — pick highest confidence
  const results = Array.isArray(data[0]) ? data[0] : data;
  const top = [...results].sort((a, b) => b.score - a.score)[0];
  return {
    label: top.label.toLowerCase(),
    score: normaliseScore(top.label, top.score),
    confidence: top.score,
    model: 'finbert-hf',
  };
}

async function scoreXenova(text) {
  const { pipeline } = await import('@xenova/transformers');
  const classifier = await pipeline('text-classification', 'ProsusAI/finbert');
  const result = await classifier(text);
  const top = Array.isArray(result) ? result[0] : result;
  return {
    label: top.label.toLowerCase(),
    score: normaliseScore(top.label, top.score),
    confidence: top.score,
    model: 'finbert-railway',
  };
}

async function scoreGroq(text) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');

  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'User-Agent': CHROME_UA,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are a financial sentiment classifier. Reply with ONLY a JSON object: {"label": "positive"|"negative"|"neutral", "score": 0.0-1.0}',
        },
        {
          role: 'user',
          content: `Classify the sentiment of this financial news headline: "${text}"`,
        },
      ],
      max_tokens: 50,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) throw new Error(`Groq API: HTTP ${resp.status}`);
  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content?.trim();
  const parsed = JSON.parse(raw);
  return {
    label: parsed.label,
    score: normaliseScore(parsed.label, parsed.score),
    confidence: parsed.score,
    model: 'groq-llama',
  };
}

export async function scoreWithFallbackChain(text) {
  const { url, token } = getRedisCredentials();

  // Level 1: HuggingFace FinBERT API
  try {
    return await withRetry(() => scoreHuggingFace(text), 2, 2000);
  } catch (err) {
    console.warn(`  [sentiment] HuggingFace failed: ${err.message}`);
  }

  // Level 2: Railway Xenova FinBERT (local model)
  try {
    return await withRetry(() => scoreXenova(text), 1, 4000);
  } catch (err) {
    console.warn(`  [sentiment] Xenova failed: ${err.message}`);
  }

  // Level 3: Groq llama-3.1-8b-instant
  try {
    return await withRetry(() => scoreGroq(text), 1, 8000);
  } catch (err) {
    console.warn(`  [sentiment] Groq failed: ${err.message}`);
  }

  // Level 4: DLQ — zero data loss, never throws
  try {
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['LPUSH', DLQ_KEY, JSON.stringify({
        text,
        failed_at: Date.now(),
        reason: 'all_models_failed',
        attempts: 3,
      })]),
      signal: AbortSignal.timeout(5_000),
    });
    console.warn(`  [sentiment] Pushed to DLQ: ${DLQ_KEY}`);
  } catch {
    // Best-effort DLQ push — never fail the pipeline
  }

  return null;
}
