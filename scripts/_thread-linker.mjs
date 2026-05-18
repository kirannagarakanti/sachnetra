#!/usr/bin/env node

import { loadSharedConfig } from './_seed-utils.mjs';
import { tokenize, jaccardSimilarity } from './_clustering.mjs';

const taxonomy = loadSharedConfig('market-taxonomy.json');
const COMMON_ENTITIES = new Set((taxonomy.common_entities || []).map(e => e.toLowerCase()));
const NIFTY50 = taxonomy.nifty50_registry || [];

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ── Groq helper — primary→fallback, mirrors seed-india-signals.mjs pattern ───

async function doGroqRaw(key, messages) {
  try {
    const resp = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', temperature: 0, max_tokens: 200, messages }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return { ok: false, retryable: resp.status === 429 || resp.status >= 500 };
    const data = await resp.json();
    const text = (data.choices?.[0]?.message?.content ?? '').trim();
    return { ok: true, text };
  } catch {
    return { ok: false, retryable: true };
  }
}

async function callGroq(messages) {
  const k1 = process.env.GROQ_API_KEY;
  const k2 = process.env.GROQ_API_KEY_2;
  if (!k1 && !k2) return null;
  let attempt = await doGroqRaw(k1 || k2, messages);
  if (!attempt.ok && attempt.retryable && k1 && k2) attempt = await doGroqRaw(k2, messages);
  return attempt.ok && attempt.text ? attempt.text : null;
}

// ── Entity aggregation from persisted columns (D2) ────────────────────────────

function dominantMode(values) {
  if (!values.length) return null;
  const counts = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

async function aggregateClusterEntities(pool, clusterHash) {
  const { rows } = await pool.query(
    `SELECT nse_tickers, sectors, companies, event_type
     FROM india_news_signals WHERE cluster_hash = $1`,
    [clusterHash]
  );

  const tickers = new Set();
  const sectors = new Set();
  const companies = new Set();
  const eventTypes = [];

  for (const row of rows) {
    (row.nse_tickers || []).forEach(t => t && tickers.add(t));
    (row.sectors || []).forEach(s => s && sectors.add(s.toLowerCase()));
    (row.companies || []).forEach(c => c && companies.add(c));
    if (row.event_type) eventTypes.push(row.event_type);
  }

  const dominantEventType = dominantMode(eventTypes);

  // Rich entities object (Decision 5)
  const richCompanies = [...tickers].map(ticker => {
    const entry = NIFTY50.find(e => e.ticker === ticker);
    return { ticker, name: entry?.aliases?.[0] ?? ticker, sectors: [...sectors] };
  });
  for (const name of companies) {
    const inRegistry = NIFTY50.some(e =>
      e.aliases.some(a => a.toLowerCase() === name.toLowerCase())
    );
    const alreadyAdded = richCompanies.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (!inRegistry && !alreadyAdded) richCompanies.push({ ticker: null, name, sectors: [...sectors] });
  }

  const entities = { companies: richCompanies, sectors: [...sectors], tickers: [...tickers] };

  // Flat set of all entity identifiers for overlap calculation
  const entityNames = new Set([
    ...[...tickers].map(t => t.toLowerCase()),
    ...[...sectors],
    ...[...companies].map(c => c.toLowerCase()),
  ]);

  return { entities, entityNames, dominantEventType };
}

// ── Title bag for R1: union of tokens across last 10 cluster primary titles ───

async function getThreadTitleBag(pool, threadId) {
  const { rows } = await pool.query(
    `WITH first_per_cluster AS (
       SELECT DISTINCT ON (cluster_hash) cluster_hash, headline, scraped_at
       FROM india_news_signals
       WHERE thread_id = $1
       ORDER BY cluster_hash, scraped_at ASC
     )
     SELECT headline FROM first_per_cluster
     ORDER BY scraped_at DESC LIMIT 10`,
    [threadId]
  );
  const bag = new Set();
  for (const row of rows) for (const token of tokenize(row.headline)) bag.add(token);
  return bag;
}

// ── R5: Thread title cascade — never a truncated headline ────────────────────

async function generateThreadTitle(primaryTitle, entities, dominantEventType) {
  const topCompany = entities.companies[0];

  const groqText = await callGroq([
    { role: 'system', content: 'Return ONLY a short event name, 2-6 words, no punctuation, present tense.' },
    { role: 'user', content: `Create a short event name for this India news story: "${primaryTitle}"` },
  ]);
  if (groqText && groqText.length > 0 && groqText.length <= 60) return groqText;

  // Cascade: entity+event → entity → event → generic
  if (topCompany && dominantEventType) return `${topCompany.name} ${dominantEventType}`;
  if (topCompany) return topCompany.name;
  if (dominantEventType) return `${dominantEventType} event`;
  return 'India news event';
}

// ── Thread entity names for overlap (handles JSONB from DB) ──────────────────

function threadEntityNames(threadEntities) {
  const e = threadEntities || {};
  return new Set([
    ...(e.tickers || []).map(t => t.toLowerCase()),
    ...(e.sectors || []).map(s => s.toLowerCase()),
    ...(e.companies || []).map(c => (typeof c === 'object' ? c.name : c).toLowerCase()),
  ]);
}

// ── Main linker (4.2) ─────────────────────────────────────────────────────────

export async function linkClusters(pool, unlinkedClusters, grownThreads) {
  if (unlinkedClusters.length === 0) return { linked: 0, spawned: 0 };

  let linked = 0;
  let spawned = 0;

  // Load open candidate threads once per run
  const { rows: candidateThreads } = await pool.query(
    `SELECT thread_id, thread_title, dominant_event_type, entities, last_seen, status
     FROM story_threads
     WHERE status IN ('developing', 'dormant')
       AND last_seen > NOW() - INTERVAL '7 days'`
  );

  for (const cluster of unlinkedClusters) {
    const { entities, entityNames, dominantEventType } = await aggregateClusterEntities(
      pool, cluster.clusterHash
    );

    // R4: filter common entities before overlap test
    const meaningful = new Set([...entityNames].filter(e => !COMMON_ENTITIES.has(e)));
    const clusterTokens = tokenize(cluster.primaryTitle);

    const matches = [];

    for (const thread of candidateThreads) {
      // R2: skip if event types differ (only when cluster has a known type)
      if (dominantEventType && thread.dominant_event_type &&
          dominantEventType !== thread.dominant_event_type) continue;

      // Weighted overlap after R4 filter
      const threadNames = threadEntityNames(thread.entities);
      const meaningfulThread = new Set([...threadNames].filter(e => !COMMON_ENTITIES.has(e)));
      let weightedOverlap = 0;
      for (const e of meaningful) if (meaningfulThread.has(e)) weightedOverlap++;
      if (weightedOverlap < 2) continue;

      // R1: Jaccard vs title-bag of last 10 cluster primary titles
      const titleBag = await getThreadTitleBag(pool, thread.thread_id);
      const jaccard = titleBag.size === 0 ? 0 : jaccardSimilarity(clusterTokens, titleBag);
      if (jaccard < 0.3) continue;

      matches.push({ thread, weightedOverlap, jaccard });
    }

    if (matches.length > 0) {
      // R3: tie-break
      matches.sort((a, b) =>
        b.weightedOverlap - a.weightedOverlap ||
        b.jaccard - a.jaccard ||
        new Date(b.thread.last_seen) - new Date(a.thread.last_seen) ||
        a.thread.thread_id.localeCompare(b.thread.thread_id)
      );
      const best = matches[0].thread;

      // Recompute dominant_event_type over all attached + this cluster's type
      const { rows: etRows } = await pool.query(
        `SELECT event_type FROM india_news_signals
         WHERE thread_id = $1 AND event_type IS NOT NULL`,
        [best.thread_id]
      );
      const allTypes = [...etRows.map(r => r.event_type), ...(dominantEventType ? [dominantEventType] : [])];
      const newDominant = dominantMode(allTypes) ?? best.dominant_event_type;

      // D1 idempotency key: AND thread_id IS NULL
      await pool.query(
        `UPDATE india_news_signals SET thread_id = $1 WHERE cluster_hash = $2 AND thread_id IS NULL`,
        [best.thread_id, cluster.clusterHash]
      );
      const wasDormant = best.status === 'dormant';
      await pool.query(
        `UPDATE story_threads
         SET last_seen = NOW(),
             event_count = event_count + 1,
             dominant_event_type = $1,
             status = CASE WHEN status = 'dormant' THEN 'developing' ELSE status END
         WHERE thread_id = $2`,
        [newDominant, best.thread_id]
      );

      if (wasDormant) console.log(`  [thread] dormant→developing: ${best.thread_id} "${best.thread_title}"`);
      console.log(
        `  [thread] attached ${cluster.clusterHash} → ${best.thread_id} ` +
        `(overlap=${matches[0].weightedOverlap} jaccard=${matches[0].jaccard.toFixed(2)})`
      );

      grownThreads.add(best.thread_id);
      // Update local cache for subsequent clusters this run
      best.last_seen = new Date().toISOString();
      best.dominant_event_type = newDominant;
      best.status = 'developing';
      linked++;
    } else {
      // Spawn new thread (R5 title cascade)
      const title = await generateThreadTitle(cluster.primaryTitle, entities, dominantEventType);
      const summaryText = await callGroq([
        { role: 'system', content: 'Return ONLY a 2-3 sentence factual summary. No extra text.' },
        { role: 'user', content: `Summarize this India news story: "${cluster.primaryTitle}"` },
      ]);

      const { rows: [newThread] } = await pool.query(
        `INSERT INTO story_threads
           (thread_title, thread_summary, first_seen, last_seen, last_summary_at,
            status, event_count, dominant_event_type, entities, created_by)
         VALUES ($1, $2, NOW(), NOW(), NOW(), 'developing', 1, $3, $4, 'auto')
         RETURNING thread_id`,
        [title, summaryText ?? null, dominantEventType ?? null, JSON.stringify(entities)]
      );
      const newId = newThread.thread_id;

      await pool.query(
        `UPDATE india_news_signals SET thread_id = $1 WHERE cluster_hash = $2 AND thread_id IS NULL`,
        [newId, cluster.clusterHash]
      );

      console.log(`  [thread] spawned ${newId}: "${title}" (cluster=${cluster.clusterHash})`);

      candidateThreads.push({
        thread_id: newId,
        thread_title: title,
        dominant_event_type: dominantEventType,
        entities,
        last_seen: new Date().toISOString(),
        status: 'developing',
      });
      spawned++;
    }
  }

  return { linked, spawned };
}

// ── Status sweep (4.3) ────────────────────────────────────────────────────────

export async function sweepThreadStatus(pool) {
  const dormant = await pool.query(
    `UPDATE story_threads SET status = 'dormant'
     WHERE status = 'developing' AND last_seen < NOW() - INTERVAL '48 hours'
     RETURNING thread_id`
  );
  const resolved = await pool.query(
    `UPDATE story_threads SET status = 'resolved'
     WHERE status = 'dormant' AND last_seen < NOW() - INTERVAL '7 days'
     RETURNING thread_id`
  );
  if ((dormant.rowCount ?? 0) > 0)
    console.log(`  [thread] status sweep: ${dormant.rowCount} developing→dormant`);
  if ((resolved.rowCount ?? 0) > 0)
    console.log(`  [thread] status sweep: ${resolved.rowCount} dormant→resolved`);
}

// ── R6: Batched re-summary (4.4) ──────────────────────────────────────────────

export async function resummarizeGrown(pool, grownThreads) {
  if (grownThreads.size === 0) return 0;
  let called = 0;
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

  for (const threadId of grownThreads) {
    const { rows: [thread] } = await pool.query(
      `SELECT thread_id, thread_title, last_summary_at FROM story_threads WHERE thread_id = $1`,
      [threadId]
    );
    if (!thread) continue;
    // Throttle: skip if summarized within last hour
    if (thread.last_summary_at && new Date(thread.last_summary_at) > hourAgo) continue;

    const { rows: titleRows } = await pool.query(
      `WITH first_per_cluster AS (
         SELECT DISTINCT ON (cluster_hash) cluster_hash, headline, scraped_at
         FROM india_news_signals
         WHERE thread_id = $1
         ORDER BY cluster_hash, scraped_at ASC
       )
       SELECT headline FROM first_per_cluster ORDER BY scraped_at DESC LIMIT 10`,
      [threadId]
    );
    if (titleRows.length === 0) continue;

    const headlines = titleRows.map(r => r.headline).join('\n- ');
    const newSummary = await callGroq([
      { role: 'system', content: 'Return ONLY a 2-3 sentence summary. No extra text.' },
      {
        role: 'user',
        content: `Update the summary for the "${thread.thread_title}" thread based on these headlines:\n- ${headlines}`,
      },
    ]);
    if (!newSummary) continue;

    await pool.query(
      `UPDATE story_threads SET thread_summary = $1, last_summary_at = NOW() WHERE thread_id = $2`,
      [newSummary, threadId]
    );
    console.log(`  [thread] re-summarized ${threadId} "${thread.thread_title}"`);
    called++;
  }

  return called;
}

// ── Threads digest builder (4.5) ──────────────────────────────────────────────

export async function buildThreadsDigest(pool) {
  const { rows: threads } = await pool.query(
    `SELECT thread_id, thread_title, thread_summary, status,
            first_seen, last_seen, event_count, entities
     FROM story_threads
     WHERE status = 'developing' OR last_seen > NOW() - INTERVAL '48 hours'
     ORDER BY last_seen DESC`
  );

  const result = [];
  for (const thread of threads) {
    const { rows: timeline } = await pool.query(
      `WITH first_per_cluster AS (
         SELECT DISTINCT ON (cluster_hash) cluster_hash, headline AS primary_title, scraped_at
         FROM india_news_signals
         WHERE thread_id = $1
         ORDER BY cluster_hash, scraped_at ASC
       ),
       cluster_counts AS (
         SELECT cluster_hash, COUNT(*) AS source_count
         FROM india_news_signals WHERE thread_id = $1
         GROUP BY cluster_hash
       )
       SELECT fpc.scraped_at, fpc.primary_title, cc.source_count::int
       FROM first_per_cluster fpc
       JOIN cluster_counts cc ON fpc.cluster_hash = cc.cluster_hash
       ORDER BY fpc.scraped_at ASC LIMIT 20`,
      [thread.thread_id]
    );

    result.push({
      thread_id: thread.thread_id,
      thread_title: thread.thread_title,
      thread_summary: thread.thread_summary,
      status: thread.status,
      first_seen: thread.first_seen,
      last_seen: thread.last_seen,
      event_count: thread.event_count,
      entities: thread.entities,
      timeline: timeline.map(r => ({
        scraped_at: r.scraped_at,
        primary_title: r.primary_title,
        source_count: r.source_count,
      })),
    });
  }

  return { threads: result, generatedAt: new Date().toISOString() };
}
