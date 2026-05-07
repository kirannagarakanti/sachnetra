#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { loadEnvFile, getRedisCredentials, runSeed } from './_seed-utils.mjs';
import {
  isMarketMoving,
  extractCompanies,
  extractSectors,
  detectEventType,
  detectRelevanceClassFromTitle,
} from './_india-market-keywords.mjs';
import { scoreWithFallbackChain } from './_sentiment-chain.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);

const { Pool } = pg;
const CANONICAL_KEY = 'news:signals:v1:india';
const DIGEST_KEY = 'news:digest:v1:india:en';
const CACHE_TTL = 1800;

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

async function readDigestFromRedis() {
  const { url, token } = getRedisCredentials();
  const resp = await fetch(`${url}/get/${encodeURIComponent(DIGEST_KEY)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5_000),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function persistSignals(rows) {
  if (rows.length === 0) return 0;

  const pool = new Pool({
    connectionString: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const COLS = 17;
    const placeholders = rows
      .map((_, i) => {
        const base = i * COLS;
        const params = Array.from({ length: COLS }, (__, j) => `$${base + j + 1}`);
        return `(${params.join(',')})`;
      })
      .join(',');

    const values = rows.flatMap(r => [
      r.headline_hash,
      r.scraped_at,
      r.published_at,
      r.headline,
      r.source_name,
      r.article_url,
      r.event_category,
      r.threat_level,
      r.is_market_moving,
      r.nse_tickers,
      r.sectors,
      r.companies,
      r.sentiment_score,
      r.sentiment_label,
      r.sentiment_model,
      r.relevance_class,
      r.event_type,
    ]);

    const result = await pool.query(
      `INSERT INTO india_news_signals
        (headline_hash, scraped_at, published_at, headline, source_name, article_url,
         event_category, threat_level, is_market_moving, nse_tickers, sectors, companies,
         sentiment_score, sentiment_label, sentiment_model, relevance_class, event_type)
       VALUES ${placeholders}
       ON CONFLICT (headline_hash) DO NOTHING`,
      values
    );
    return result.rowCount ?? 0;
  } finally {
    await pool.end();
  }
}

async function fetchSignals() {
  const digest = await readDigestFromRedis();
  if (!digest) throw new Error('India digest not found in Redis');

  // Extract items from all category buckets — same pattern as seed-insights.mjs lines 223-233
  const items = [];
  if (digest.categories && typeof digest.categories === 'object') {
    for (const bucket of Object.values(digest.categories)) {
      if (Array.isArray(bucket.items)) items.push(...bucket.items);
    }
  }

  if (items.length === 0) throw new Error('Digest has no items');
  console.log(`  Digest items: ${items.length}`);

  const rows = [];
  let skipped = 0;
  let errors = 0;

  for (const item of items) {
    const title = (item.title || '').trim();
    if (!title || !isMarketMoving(title)) {
      skipped++;
      continue;
    }

    const companies = extractCompanies(title);
    const sectors = extractSectors(title);
    const eventType = detectEventType(title);
    const relevanceClass = detectRelevanceClassFromTitle(title, sectors, companies);
    const headlineHash = sha256(title);

    const scored = await scoreWithFallbackChain(title);
    if (!scored) errors++;

    rows.push({
      headline_hash: headlineHash,
      scraped_at: item.scrapedAt
        ? new Date(item.scrapedAt).toISOString()
        : new Date().toISOString(),
      published_at: item.publishedAt
        ? new Date(item.publishedAt).toISOString()
        : null,
      headline: title,
      source_name: item.source || '',
      article_url: item.link || null,
      event_category: item.category || null,
      threat_level: item.level || null,
      is_market_moving: true,
      nse_tickers: companies.map(c => c.ticker),
      sectors,
      companies: companies.map(c => c.name),
      sentiment_score: scored?.score ?? null,
      sentiment_label: scored?.label ?? null,
      sentiment_model: scored?.model ?? null,
      relevance_class: relevanceClass,
      event_type: eventType,
    });
  }

  console.log(`  Market-moving: ${rows.length} | Skipped: ${skipped} | Score errors: ${errors}`);

  const inserted = await persistSignals(rows);
  console.log(`  Inserted: ${inserted} new rows (ON CONFLICT skipped duplicates)`);

  return { processed: items.length, marketMoving: rows.length, inserted, skipped, errors };
}

function validate(data) {
  return typeof data?.processed === 'number';
}

runSeed('india', 'signals', CANONICAL_KEY, fetchSignals, {
  validateFn: validate,
  ttlSeconds: CACHE_TTL,
  sourceVersion: 'finbert-v1',
}).catch((err) => {
  console.error('FATAL:', err.message || err);
  process.exit(0); // Railway cron must always exit 0
});
