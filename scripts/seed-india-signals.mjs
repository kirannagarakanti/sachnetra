#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { loadEnvFile, getRedisCredentials, runSeed, CHROME_UA } from './_seed-utils.mjs';
import { getAllFeeds } from './_india-feeds.mjs';
import { clusterItems, scoreImportance } from './_clustering.mjs';
import { classifyByKeyword, LEVEL_TO_PROTO, EXCLUSIONS } from './_classifier.mjs';
import {
  isMarketMoving,
  extractCompanies,
  extractSectors,
  detectEventType,
  detectRelevanceClassFromTitle,
} from './_india-market-keywords.mjs';
import { scoreWithFallbackChain } from './_sentiment-chain.mjs';
import { linkClusters, sweepThreadStatus, resummarizeGrown, buildThreadsDigest } from './_thread-linker.mjs';
import { fanOutEntities } from './_entity-fan-out.mjs';
import pg from 'pg';

loadEnvFile(import.meta.url);

const { Pool } = pg;
const CANONICAL_KEY = 'news:signals:v1:india';
const DIGEST_KEY = 'news:digest:v1:india:en';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const CACHE_TTL = 1800;
const MAX_DRAIN_BATCH = 10;
const DIGEST_TTL = 1800;            // 30 min — survives 2 missed crons, stale-while-revalidate
const THREADS_KEY = 'news:threads:v1:india:en';
const THREADS_TTL = 1800;
const FEED_TIMEOUT_MS = 8_000;
const ITEMS_PER_FEED = 5;
const SKIP_WINDOW_HOURS = 48;
const BATCH_CONCURRENCY = 20;       // RSS fetch fan-out
const GROQ_CAP = 60;                // max clusters enriched per run (cron-timing safety valve)
const ENRICH_CONCURRENCY = 8;       // parallel Groq + sentiment calls in Tier 2
const DIGEST_BUCKETS = ['politics', 'economy', 'technology', 'disaster'];

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

// True noise only — mirrors classifyByKeyword's exclusion semantics
// (lower.includes(ex)). Drops cricket/bollywood/wedding/etc. WITHOUT discarding
// market-moving headlines that merely failed to match a classifier keyword.
function isExcludedNoise(title) {
  const lower = (title || '').toLowerCase();
  return EXCLUSIONS.some(ex => lower.includes(ex));
}

function pgPool() {
  return new Pool({
    connectionString: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

async function runPool(tasks, limit, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (cursor < tasks.length) {
      const idx = cursor++;
      await worker(tasks[idx]);
    }
  });
  await Promise.all(runners);
}

// ── RSS fetch + parse ────────────────────────────────────────────────────────

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function xmlText(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (typeof node === 'object') return node['#text'] ?? node._ ?? '';
  return String(node);
}

function extractLink(item) {
  if (typeof item.link === 'string') return item.link;
  if (Array.isArray(item.link)) {
    const alt = item.link.find(l => l?.['@_rel'] === 'alternate') ?? item.link[0];
    return alt?.['@_href'] ?? '';
  }
  if (item.link && typeof item.link === 'object') {
    return item.link['@_href'] ?? item.link['#text'] ?? '';
  }
  if (typeof item.guid === 'string') return item.guid;
  if (item.guid && typeof item.guid === 'object') return item.guid['#text'] ?? '';
  return '';
}

function parseFeedItems(xmlString, feed) {
  const parsed = xmlParser.parse(xmlString);
  const raw = parsed?.rss?.channel?.item ?? parsed?.feed?.entry ?? [];
  const list = Array.isArray(raw) ? raw : [raw];
  const out = [];
  const now = Date.now();

  for (const item of list) {
    const title = xmlText(item.title).trim();
    if (!title) continue;

    const rawDate =
      xmlText(item.pubDate) ||
      xmlText(item.published) ||
      xmlText(item.updated) ||
      xmlText(item['dc:date']);
    const publishedAt = new Date(rawDate).getTime();
    if (!Number.isFinite(publishedAt)) continue; // same rule as list-feed-digest.ts

    out.push({
      title,
      link: extractLink(item),
      pubDate: rawDate,
      publishedAt,
      scrapedAt: now,
      source: feed.name,
      feedBucket: feed.category,
      isAlert: false,
    });
  }

  out.sort((a, b) => b.publishedAt - a.publishedAt);
  return out.slice(0, ITEMS_PER_FEED);
}

async function fetchOneFeed(feed) {
  const resp = await fetch(feed.url, {
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const text = await resp.text();
  return parseFeedItems(text, feed);
}

async function fetchAllFeeds() {
  const feeds = getAllFeeds();
  const items = [];
  const feedStatuses = {};
  for (const f of feeds) feedStatuses[f.name] = 'timeout'; // every feed must have a status

  for (let i = 0; i < feeds.length; i += BATCH_CONCURRENCY) {
    const batch = feeds.slice(i, i + BATCH_CONCURRENCY);
    const settled = await Promise.allSettled(batch.map(f => fetchOneFeed(f)));
    settled.forEach((res, idx) => {
      const feed = batch[idx];
      if (res.status !== 'fulfilled') return; // leave as 'timeout'
      const parsed = res.value;
      if (parsed.length === 0) {
        if (feed.type === 'google-news') {
          console.log(`  [warn] gnIn throttle suspected: ${feed.name}`);
        }
        feedStatuses[feed.name] = 'empty';
        return;
      }
      feedStatuses[feed.name] = 'ok';
      items.push(...parsed);
    });
  }

  const counts = { ok: 0, empty: 0, timeout: 0 };
  for (const s of Object.values(feedStatuses)) counts[s] = (counts[s] || 0) + 1;
  console.log(
    `  [rss] Fetched ${items.length} items from ${feeds.length} feeds ` +
      `(${counts.ok} ok, ${counts.empty} empty, ${counts.timeout} timeout)`
  );
  return { items, feedStatuses };
}

// ── Pre-cluster dedup: collapse exact syndication reposts ────────────────────

function normalizeTitle(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeByNormalizedTitle(items) {
  const best = new Map();
  for (const it of items) {
    const key = normalizeTitle(it.title);
    if (!key) continue;
    const prev = best.get(key);
    if (!prev || it.publishedAt > prev.publishedAt) best.set(key, it);
  }
  return [...best.values()];
}

// ── Re-enrich-aware skip-known ───────────────────────────────────────────────
// A cluster is "done" only once its primary row has ai_summary. A market-moving
// cluster captured without ai_summary stays a re-enrich candidate next run until
// enriched or it ages past the 48h window. Non-market clusters are never
// enriched, so they fall out of candidacy via the isMarketMoving filter.

async function getEnrichedClusterHashes(clusterHashes) {
  if (clusterHashes.length === 0) return new Set();
  const pool = pgPool();
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT cluster_hash FROM india_news_signals
       WHERE cluster_hash = ANY($1)
         AND ai_summary IS NOT NULL
         AND scraped_at > NOW() - INTERVAL '${SKIP_WINDOW_HOURS} hours'`,
      [clusterHashes]
    );
    return new Set(rows.map(r => r.cluster_hash));
  } finally {
    await pool.end();
  }
}

// ── Per-cluster Groq enrichment (the ONLY Railway Groq call site) ─────────────

async function doGroq(key, primaryTitle) {
  try {
    const resp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0,
        max_tokens: 300,
        messages: [
          { role: 'system', content: 'Return ONLY valid JSON, no explanation.' },
          {
            role: 'user',
            content:
              `Analyze this India news headline:\n"${primaryTitle}"\n\n` +
              `Return JSON:\n{\n` +
              `  "ai_summary": "1-2 sentence factual summary of what happened",\n` +
              `  "ai_meaning": "1 sentence on market or political significance for India"\n}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) {
      return { ok: false, retryable: resp.status === 429 || resp.status >= 500 };
    }
    const data = await resp.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? 'null');
    if (!parsed || typeof parsed.ai_summary !== 'string') return { ok: false, retryable: false };
    return { ok: true, parsed };
  } catch {
    return { ok: false, retryable: true }; // network/abort — worth a failover key
  }
}

// Primary key first; fail over to GROQ_API_KEY_2 only on 429/5xx/network.
async function callGroqForCluster(primaryTitle) {
  const k1 = process.env.GROQ_API_KEY;
  const k2 = process.env.GROQ_API_KEY_2;
  if (!k1 && !k2) return null;

  let keyUsed = k1 ? 'primary' : 'fallback';
  let attempt = await doGroq(k1 || k2, primaryTitle);

  if (!attempt.ok && attempt.retryable && k1 && k2) {
    keyUsed = 'fallback';
    attempt = await doGroq(k2, primaryTitle);
  }

  if (!attempt.ok || !attempt.parsed) return null;
  return {
    ai_summary: attempt.parsed.ai_summary,
    ai_meaning: typeof attempt.parsed.ai_meaning === 'string' ? attempt.parsed.ai_meaning : null,
    keyUsed,
  };
}

// ── Digest builder (Redis JSON — source of truth shape) ──────────────────────

function primaryItemOf(cluster) {
  const all = cluster.allItems || [];
  return (
    all.find(i => i.title === cluster.primaryTitle && i.link === cluster.primaryLink) ??
    all.find(i => i.title === cluster.primaryTitle) ??
    all[0]
  );
}

function buildDigestItem(cluster) {
  const classification = classifyByKeyword(cluster.primaryTitle, 'india');
  const ts = new Date(cluster.pubDate).getTime();
  return {
    source: cluster.primarySource,
    title: cluster.primaryTitle,
    link: cluster.primaryLink,
    publishedAt: Number.isFinite(ts) ? ts : Date.now(),
    isAlert: classification.level === 'critical' || classification.level === 'high',
    threat: {
      level: LEVEL_TO_PROTO[classification.level],
      category: classification.category,
      confidence: classification.confidence,
      source: 'keyword',
    },
    locationName: '',
  };
}

function buildDigest(clusters, feedStatuses) {
  const categories = {};
  for (const b of DIGEST_BUCKETS) categories[b] = { items: [] };

  for (const cluster of clusters) {
    const primary = primaryItemOf(cluster);
    const bucket = DIGEST_BUCKETS.includes(primary?.feedBucket) ? primary.feedBucket : 'politics';
    categories[bucket].items.push(buildDigestItem(cluster));
  }

  return { categories, feedStatuses, generatedAt: new Date().toISOString() };
}

// ── Tier 1: capture — every headline row, persisted immediately, no LLM ──────

function buildCaptureRow(item, clusterHash) {
  const title = item.title;
  const cls = classifyByKeyword(title, 'india');
  const companies = extractCompanies(title);
  const sectors = extractSectors(title);
  return {
    headline_hash: sha256(title),
    scraped_at: new Date(item.scrapedAt).toISOString(),
    published_at: item.publishedAt ? new Date(item.publishedAt).toISOString() : null,
    headline: title,
    source_name: item.source || '',
    article_url: item.link || null,
    event_category: cls.category,
    threat_level: LEVEL_TO_PROTO[cls.level],
    is_market_moving: isMarketMoving(title),
    nse_tickers: companies.map(c => c.ticker),
    sectors,
    companies: companies.map(c => c.name),
    sentiment_score: null,
    sentiment_label: null,
    sentiment_model: null,
    relevance_class: detectRelevanceClassFromTitle(title, sectors, companies),
    event_type: detectEventType(title),
    ai_summary: null,
    ai_meaning: null,
    cluster_hash: clusterHash,
    feed_bucket: item.feedBucket,
  };
}

async function persistSignals(rows) {
  if (rows.length === 0) return 0;
  const pool = pgPool();
  try {
    const COLS = 21;
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
      r.ai_summary,
      r.ai_meaning,
      r.cluster_hash,
      r.feed_bucket,
    ]);

    const result = await pool.query(
      `INSERT INTO india_news_signals
        (headline_hash, scraped_at, published_at, headline, source_name, article_url,
         event_category, threat_level, is_market_moving, nse_tickers, sectors, companies,
         sentiment_score, sentiment_label, sentiment_model, relevance_class, event_type,
         ai_summary, ai_meaning, cluster_hash, feed_bucket)
       VALUES ${placeholders}
       ON CONFLICT (headline_hash) DO NOTHING`,
      values
    );
    return result.rowCount ?? 0;
  } finally {
    await pool.end();
  }
}

// ── Tier 2: enrich — bounded Groq + sentiment, UPDATE primary rows ───────────

async function enrichClusters(clusters) {
  if (clusters.length === 0) return { updated: 0, groqCalls: 0, failovers: 0, sentErrors: 0 };

  const pool = pgPool();
  let updated = 0;
  let groqCalls = 0;
  let failovers = 0;
  let sentErrors = 0;

  try {
    await runPool(clusters, ENRICH_CONCURRENCY, async cluster => {
      const title = cluster.primaryTitle;

      const scored = await scoreWithFallbackChain(title);
      if (!scored) sentErrors++;

      const groq = await callGroqForCluster(title);
      groqCalls++;
      if (groq?.keyUsed === 'fallback') failovers++;

      if (!groq && !scored) return;

      // Preserve a fresher user ✨ enrichment (sentiment_model='groq-v2').
      // Only target rows still lacking ai_summary (the re-enrich predicate).
      const res = await pool.query(
        `UPDATE india_news_signals
            SET ai_summary = $1,
                ai_meaning = $2,
                sentiment_score = CASE WHEN sentiment_model = 'groq-v2'
                                       THEN sentiment_score ELSE $3 END,
                sentiment_label = CASE WHEN sentiment_model = 'groq-v2'
                                       THEN sentiment_label ELSE $4 END,
                sentiment_model = CASE WHEN sentiment_model = 'groq-v2'
                                       THEN sentiment_model ELSE $5 END
          WHERE headline_hash = $6 AND ai_summary IS NULL`,
        [
          groq?.ai_summary ?? null,
          groq?.ai_meaning ?? null,
          scored?.score ?? null,
          scored?.label ?? null,
          scored?.model ?? null,
          sha256(title),
        ]
      );
      if ((res.rowCount ?? 0) > 0) updated++;
    });
  } finally {
    await pool.end().catch(() => {});
  }

  return { updated, groqCalls, failovers, sentErrors };
}

// ── Enrich queue drain — Type A (user ✨ enrichments) ONLY ───────────────────

async function drainEnrichQueue() {
  const { url, token } = getRedisCredentials();

  let items = [];
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['LRANGE', 'news:enrich-queue:v1', 0, MAX_DRAIN_BATCH - 1]),
      signal: AbortSignal.timeout(5_000),
    });
    if (!resp.ok) return;
    const data = await resp.json();
    items = Array.isArray(data.result) ? data.result : [];
  } catch (err) {
    console.warn(`  [enrich] Queue read failed (non-fatal): ${err.message}`);
    return;
  }

  if (items.length === 0) return;
  console.log(`  [enrich] Draining ${items.length} items from queue`);

  const pool = pgPool();
  let updated = 0;
  try {
    for (const raw of items) {
      try {
        const item = JSON.parse(raw);
        if (!item.headline_hash) continue;

        // Type A only: user ✨ enrichments carry sentiment_label.
        // Type B (headline-only → Groq from inside drain) removed in V2-012;
        // nothing in production pushes Type B (summarize-article.ts always sets it).
        if (item.sentiment_label === undefined) continue;

        const result = await pool.query(
          `UPDATE india_news_signals
           SET sentiment_label=$1, sentiment_score=$2, companies=$3,
               event_type=$4, sentiment_model='groq-v2'
           WHERE headline_hash=$5
             AND (sentiment_model IS NULL OR sentiment_model != 'groq-v2')`,
          [
            item.sentiment_label,
            item.sentiment_score,
            item.companies ?? [],
            item.event_type,
            item.headline_hash,
          ]
        );
        if ((result.rowCount ?? 0) > 0) updated++;
      } catch {
        /* skip malformed */
      }
    }
  } finally {
    await pool.end().catch(() => {});
  }

  // UPDATE is a no-op for non-matching rows — safe to clear even on partial success
  try {
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['LTRIM', 'news:enrich-queue:v1', items.length, -1]),
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    /* non-fatal — items retry next run */
  }

  console.log(`  [enrich] Updated ${updated}/${items.length} PostgreSQL rows (groq-v2)`);
}

// ── Orchestration: capture → enrich → digest ─────────────────────────────────

async function fetchSignals() {
  await drainEnrichQueue();

  const { items, feedStatuses } = await fetchAllFeeds();

  const deduped = dedupeByNormalizedTitle(items);
  console.log(
    `  [dedup] ${items.length} -> ${deduped.length} items (collapsed exact repost duplicates)`
  );

  const clusters = clusterItems(deduped, { includeClusterHash: true });

  // TIER 1 — capture: persist every headline row now, no LLM, idempotent.
  const captureRows = [];
  for (const cluster of clusters) {
    for (const item of cluster.allItems || []) {
      captureRows.push(buildCaptureRow(item, cluster.clusterHash));
    }
  }
  const inserted = await persistSignals(captureRows);
  const marketMoving = captureRows.filter(r => r.is_market_moving).length;
  console.log(
    `  [capture] ${clusters.length} clusters | rows ${captureRows.length} ` +
      `| inserted ${inserted} (ON CONFLICT skipped dups) | market-moving ${marketMoving}`
  );

  // TIER 2 — enrich: market-moving, non-noise, not-yet-enriched, ranked, capped.
  const enrichedHashes = await getEnrichedClusterHashes(clusters.map(c => c.clusterHash));
  const candidates = clusters
    .filter(c => !enrichedHashes.has(c.clusterHash))
    .filter(c => isMarketMoving(c.primaryTitle))
    .filter(c => !isExcludedNoise(c.primaryTitle)) // drop only true EXCLUSIONS noise
    .map(c => ({ c, score: scoreImportance(c) }))
    .sort((a, b) => b.score - a.score);
  const picked = candidates.slice(0, GROQ_CAP).map(x => x.c);
  console.log(
    `  [enrich] ${candidates.length} candidates | ${enrichedHashes.size} already enriched (skip) ` +
      `| processing ${picked.length} (cap ${GROQ_CAP}, concurrency ${ENRICH_CONCURRENCY})`
  );

  const e = await enrichClusters(picked);
  console.log(
    `  [groq] called ${e.groqCalls} | failover used ${e.failovers} | sentiment errors ${e.sentErrors}`
  );
  console.log(`  [postgres] enriched (updated) ${e.updated} rows`);

  // THREAD LINKING — after Tier 1 capture, before digest (D1)
  const grownThreads = new Set();
  let threadsLinked = 0;
  let threadsSpawned = 0;
  let threadsResummarized = 0;
  let threadsDigest = { threads: [], generatedAt: new Date().toISOString() };
  const threadPool = pgPool();
  try {
    const clusterHashes = clusters.map(c => c.clusterHash);
    const { rows: unlinkedRows } = await threadPool.query(
      `SELECT DISTINCT cluster_hash FROM india_news_signals
       WHERE cluster_hash = ANY($1) AND thread_id IS NULL`,
      [clusterHashes]
    );
    const unlinkedHashSet = new Set(unlinkedRows.map(r => r.cluster_hash));
    const unlinkedClusters = clusters.filter(c => unlinkedHashSet.has(c.clusterHash));

    const linkResult = await linkClusters(threadPool, unlinkedClusters, grownThreads);
    threadsLinked = linkResult.linked;
    threadsSpawned = linkResult.spawned;

    await sweepThreadStatus(threadPool);
    threadsResummarized = await resummarizeGrown(threadPool, grownThreads);
    threadsDigest = await buildThreadsDigest(threadPool);

    console.log(
      `  [thread] linked ${threadsLinked} | spawned ${threadsSpawned} | re-summarized ${threadsResummarized}`
    );

    await fanOutEntities(threadPool, clusterHashes);
  } finally {
    await threadPool.end().catch(() => {});
  }

  const digest = buildDigest(clusters, feedStatuses);

  return {
    processed: items.length,
    deduped: deduped.length,
    clusters: clusters.length,
    marketMoving,
    inserted,
    enriched: e.updated,
    skipped: enrichedHashes.size,
    errors: e.sentErrors,
    digest,
    threadsDigest,
    threadsLinked,
    threadsSpawned,
    threadsResummarized,
  };
}

function validate(data) {
  return typeof data?.processed === 'number';
}

runSeed('india', 'signals', CANONICAL_KEY, fetchSignals, {
  validateFn: validate,
  ttlSeconds: CACHE_TTL,
  sourceVersion: 'autonomous-v1',
  recordCount: data => data.inserted,
  extraKeys: [
    { key: DIGEST_KEY,   ttl: DIGEST_TTL,   transform: data => data.digest },
    { key: THREADS_KEY,  ttl: THREADS_TTL,  transform: data => data.threadsDigest },
  ],
}).catch(err => {
  console.error('FATAL:', err.message || err);
  process.exit(0); // Railway cron must always exit 0
});
