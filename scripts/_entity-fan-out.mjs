#!/usr/bin/env node

import { loadSharedConfig } from './_seed-utils.mjs';

const taxonomy = loadSharedConfig('market-taxonomy.json');

// Compile one regex per theme at module load — cached for the lifetime of the process (SR3)
const themeRegexCache = new Map();
for (const [themeId, theme] of Object.entries(taxonomy.themes ?? {})) {
  themeRegexCache.set(
    themeId,
    new RegExp(
      `\\b(${theme.keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
      'i'
    )
  );
}

/**
 * Fan out cluster rows into entity_timeline.
 * Runs once per cron run, after thread linking, on the same pool.
 *
 * Companies/sectors: read from pre-extracted persisted columns (nse_tickers / sectors) — SR3.
 * Themes: keyword-regex over headline column, cache compiled at module load — SR3.
 *
 * @param {import('pg').Pool} pool
 * @param {string[]} clusterHashes  processed this cron run
 */
export async function fanOutEntities(pool, clusterHashes) {
  if (clusterHashes.length === 0) return;

  // SR5: batch-load all rows for all clusters in one query
  const { rows: dbRows } = await pool.query(
    `SELECT cluster_hash, companies, nse_tickers, sectors, headline,
            sentiment_score, entity_sentiment, scraped_at, ai_summary, thread_id
     FROM india_news_signals
     WHERE cluster_hash = ANY($1)`,
    [clusterHashes]
  );

  // Group by cluster_hash in memory
  const byCluster = new Map();
  for (const row of dbRows) {
    const list = byCluster.get(row.cluster_hash) ?? [];
    list.push(row);
    byCluster.set(row.cluster_hash, list);
  }

  const inserts = [];
  let skippedNoEntities = 0;

  for (const [clusterHash, rows] of byCluster) {
    // Primary row: prefer one with ai_summary; fall back to first row
    const primaryRow = rows.find(r => r.ai_summary != null) ?? rows[0];
    const clusterSize = rows.length;
    const threadId = primaryRow.thread_id ?? null;
    const observedAt = primaryRow.scraped_at;

    // --- Companies: parallel nse_tickers[i] ↔ companies[i] columns (SR3 / D2) ---
    // Build ticker → name from all rows in this cluster; source_count from nse_tickers column
    const companyMap = new Map(); // ticker → canonical name
    for (const row of rows) {
      const tickers = row.nse_tickers ?? [];
      const names   = row.companies   ?? [];
      for (let i = 0; i < tickers.length; i++) {
        if (tickers[i] && !companyMap.has(tickers[i])) {
          companyMap.set(tickers[i], names[i] ?? tickers[i]);
        }
      }
    }

    // --- Sectors: keys from sectors column (SR3) ---
    const sectorSet = new Set();
    for (const row of rows) {
      for (const s of (row.sectors ?? [])) sectorSet.add(s);
    }

    // --- Themes: cached regex over headline column (SR3) ---
    const themeSet = new Set();
    for (const row of rows) {
      for (const [themeId, re] of themeRegexCache) {
        if (re.test(row.headline)) themeSet.add(themeId);
      }
    }

    if (companyMap.size === 0 && sectorSet.size === 0 && themeSet.size === 0) {
      skippedNoEntities++;
      continue;
    }

    // source_count helpers — read columns, no regex re-run (SR3)
    const companySourceCount = ticker =>
      rows.filter(r => (r.nse_tickers ?? []).includes(ticker)).length;
    const sectorSourceCount = sectorId =>
      rows.filter(r => (r.sectors ?? []).includes(sectorId)).length;
    const themeSourceCount = themeId =>
      rows.filter(r => themeRegexCache.get(themeId).test(r.headline)).length;

    // Sentiment: entity_jsonb if present, else cluster_primary.
    // Themes always use cluster_primary — design R2.
    // entity_sentiment is currently never written (SR1) so 100% cluster_primary today.
    const resolveSentiment = (entityId, entityType) => {
      if (entityType !== 'theme') {
        const perEntity = primaryRow.entity_sentiment?.[entityId];
        if (perEntity != null) {
          return { sentiment: Number(perEntity), source: 'entity_jsonb' };
        }
      }
      return { sentiment: primaryRow.sentiment_score ?? null, source: 'cluster_primary' };
    };

    for (const [ticker, name] of companyMap) {
      const { sentiment, source } = resolveSentiment(ticker, 'company');
      inserts.push({
        entity_id: ticker,
        entity_type: 'company',
        entity_name: name,
        cluster_hash: clusterHash,
        thread_id: threadId,
        observed_at: observedAt,
        sentiment,
        sentiment_source: source,
        source_count: companySourceCount(ticker),
        cluster_size: clusterSize,
      });
    }

    for (const sectorId of sectorSet) {
      const { sentiment, source } = resolveSentiment(sectorId, 'sector');
      inserts.push({
        entity_id: sectorId,
        entity_type: 'sector',
        entity_name: sectorId.charAt(0).toUpperCase() + sectorId.slice(1),
        cluster_hash: clusterHash,
        thread_id: threadId,
        observed_at: observedAt,
        sentiment,
        sentiment_source: source,
        source_count: sectorSourceCount(sectorId),
        cluster_size: clusterSize,
      });
    }

    for (const themeId of themeSet) {
      const { sentiment, source } = resolveSentiment(themeId, 'theme');
      inserts.push({
        entity_id: themeId,
        entity_type: 'theme',
        entity_name: taxonomy.themes[themeId]?.name ?? themeId,
        cluster_hash: clusterHash,
        thread_id: threadId,
        observed_at: observedAt,
        sentiment,
        sentiment_source: source,
        source_count: themeSourceCount(themeId),
        cluster_size: clusterSize,
      });
    }
  }

  if (inserts.length > 0) {
    const COLS = 10;
    const placeholders = inserts
      .map((_, i) => {
        const base = i * COLS;
        return `(${Array.from({ length: COLS }, (_, j) => `$${base + j + 1}`).join(',')})`;
      })
      .join(',');

    await pool.query(
      `INSERT INTO entity_timeline
        (entity_id, entity_type, entity_name, cluster_hash, thread_id,
         observed_at, sentiment, sentiment_source, source_count, cluster_size)
       VALUES ${placeholders}
       ON CONFLICT (entity_id, entity_type, cluster_hash) DO NOTHING`,
      inserts.flatMap(r => [
        r.entity_id, r.entity_type, r.entity_name, r.cluster_hash, r.thread_id,
        r.observed_at, r.sentiment, r.sentiment_source, r.source_count, r.cluster_size,
      ])
    );
  }

  const jsonbSentiment  = inserts.filter(r => r.sentiment_source === 'entity_jsonb').length;
  const primaryFallback = inserts.filter(r => r.sentiment_source === 'cluster_primary').length;

  console.log(
    `  [entity] ${byCluster.size - skippedNoEntities} clusters → ${inserts.length} entity rows` +
    ` | jsonb: ${jsonbSentiment} | primary: ${primaryFallback}` +
    ` | skipped(no-entities): ${skippedNoEntities}`
  );
}
