#!/usr/bin/env node
/**
 * Unit tests for _thread-linker.mjs
 * Covers: R1 title-bag growth, R2 event-type guard, R3 multi-match tie-break,
 *         R4 common-entity filter, R5 Groq-fail cascade, R6 per-cycle throttle,
 *         D1 thread_id IS NULL idempotency.
 * Run: node --test scripts/_thread-linker.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkClusters, sweepThreadStatus, resummarizeGrown } from './_thread-linker.mjs';

// ── Mock pool ─────────────────────────────────────────────────────────────────
// Routes queries by SQL pattern. `state` accumulates side-effects for assertions.

function makePool(h = {}, state = {}) {
  return {
    state,
    async query(sql, params) {
      const s = sql.replace(/\s+/g, ' ').trim();

      // resummarizeGrown — fetch single thread by id
      if (s.includes('FROM story_threads WHERE thread_id = $1')) {
        const t = h.threadById?.(params[0]);
        return { rows: t ? [t] : [] };
      }
      // linkClusters — open candidate threads (7 days window)
      if (s.includes('FROM story_threads') && s.includes("INTERVAL '7 days'")) {
        return { rows: h.candidates?.() ?? [] };
      }
      // buildThreadsDigest — active threads (48 hours window)
      if (s.includes('FROM story_threads') && s.includes("INTERVAL '48 hours'")) {
        return { rows: h.activeThreads?.() ?? [] };
      }
      // linkClusters — recompute dominant_event_type after attach
      if (s.includes('event_type IS NOT NULL') && s.includes('thread_id = $1')) {
        return { rows: h.eventTypes?.(params[0]) ?? [] };
      }
      // linkClusters — aggregate cluster entities from persisted rows (D2)
      if (s.includes('FROM india_news_signals') && s.includes('cluster_hash = $1')) {
        return { rows: h.clusterRows?.(params[0]) ?? [] };
      }
      // buildThreadsDigest — timeline per thread (CTE has both first_per_cluster + cluster_counts)
      if (s.includes('first_per_cluster') && s.includes('cluster_counts')) {
        return { rows: [] };
      }
      // getThreadTitleBag + resummarizeGrown headline fetch (first_per_cluster only)
      if (s.includes('first_per_cluster')) {
        return { rows: h.titleBag?.(params[0]) ?? [] };
      }
      // D1 idempotency — attach cluster rows to thread
      if (s.includes('UPDATE india_news_signals SET thread_id')) {
        state.attached = state.attached ?? [];
        state.attached.push({ threadId: params[0], clusterHash: params[1] });
        return { rowCount: 1 };
      }
      // update thread metadata after attach
      if (s.includes('UPDATE story_threads') && s.includes('event_count')) {
        return { rowCount: 1 };
      }
      // spawn new thread
      if (s.includes('INSERT INTO story_threads')) {
        state.inserts = state.inserts ?? [];
        const id = `spawned-${state.inserts.length + 1}`;
        state.inserts.push({ title: params[0], summary: params[1], eventType: params[2] });
        return { rows: [{ thread_id: id }] };
      }
      // sweepThreadStatus — developing→dormant
      if (s.includes("SET status = 'dormant'")) return { rowCount: h.dormantCount ?? 0 };
      // sweepThreadStatus — dormant→resolved
      if (s.includes("SET status = 'resolved'")) return { rowCount: h.resolvedCount ?? 0 };
      // resummarizeGrown — write new summary
      if (s.includes('SET thread_summary')) {
        state.summaryUpdates = state.summaryUpdates ?? [];
        state.summaryUpdates.push(params[1]);
        return { rowCount: 1 };
      }

      return { rows: [], rowCount: 0 };
    },
    async end() {},
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCluster(clusterHash, primaryTitle) {
  return { clusterHash, primaryTitle, allItems: [] };
}

function makeThread(id, overrides = {}) {
  return {
    thread_id: id,
    thread_title: overrides.title ?? 'Test Thread',
    dominant_event_type: overrides.eventType ?? null,
    entities: overrides.entities ?? { companies: [], sectors: [], tickers: [] },
    last_seen: overrides.lastSeen ?? new Date(Date.now() - 3_600_000).toISOString(),
    status: overrides.status ?? 'developing',
  };
}

// ── D1 — idempotency ──────────────────────────────────────────────────────────

test('D1: empty unlinkedClusters → links=0, spawned=0, grownThreads stays empty', async () => {
  const grownThreads = new Set();
  const result = await linkClusters(makePool(), [], grownThreads);
  assert.equal(result.linked, 0);
  assert.equal(result.spawned, 0);
  assert.equal(grownThreads.size, 0);
});

// ── R1 — title-bag Jaccard ────────────────────────────────────────────────────

test('R1: attaches cluster that matches title-bag but would miss short thread_title', async () => {
  // thread_title = "Reliance" → tokenize → {reliance} — too small to match alone
  // title-bag from past clusters is much richer and overlaps the new cluster well
  const state = {};
  const pool = makePool({
    candidates: () => [makeThread('T1', {
      title: 'Reliance',  // short — Jaccard against this alone would be ~0.2
      entities: { companies: [], sectors: ['technology'], tickers: ['RIL'] },
    })],
    clusterRows: () => [{ nse_tickers: ['RIL'], sectors: ['technology'], companies: [], event_type: null }],
    titleBag: () => [
      // union of tokens: {reliance, quarterly, earnings, strong, profit, results, revenue}
      { headline: 'Reliance quarterly earnings strong profit results revenue' },
    ],
    eventTypes: () => [],
  }, state);

  // Cluster: tokens = {reliance, quarterly, earnings, strong, profit}
  // Jaccard vs title-bag = 5/7 ≈ 0.71 ✓   |   vs {reliance} alone = 1/5 = 0.20 ✗
  const cluster = makeCluster('C1', 'Reliance quarterly earnings strong profit');
  const grownThreads = new Set();
  const result = await linkClusters(pool, [cluster], grownThreads);

  assert.equal(result.linked, 1, 'should attach via title-bag Jaccard');
  assert.equal(result.spawned, 0);
  assert.equal(grownThreads.has('T1'), true);
});

// ── R2 — event-type guard ─────────────────────────────────────────────────────

test('R2: skips thread whose dominant_event_type differs from the cluster', async () => {
  const savedK1 = process.env.GROQ_API_KEY;
  const savedK2 = process.env.GROQ_API_KEY_2;
  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY_2;
  try {
    const state = {};
    const pool = makePool({
      candidates: () => [makeThread('T1', {
        eventType: 'disaster',
        entities: { companies: [], sectors: ['aviation'], tickers: [] },
      })],
      clusterRows: () => [{ nse_tickers: [], sectors: ['aviation'], companies: ['Air India'], event_type: 'earnings' }],
    }, state);

    const cluster = makeCluster('C1', 'Air India reports strong quarterly earnings');
    const result = await linkClusters(pool, [cluster], new Set());

    assert.equal(result.linked, 0, 'event-type mismatch must block attach');
    assert.equal(result.spawned, 1, 'unmatched cluster should spawn a new thread');
  } finally {
    if (savedK1 !== undefined) process.env.GROQ_API_KEY = savedK1;
    if (savedK2 !== undefined) process.env.GROQ_API_KEY_2 = savedK2;
  }
});

test('R2: attaches cluster to thread when event_types match', async () => {
  const state = {};
  const pool = makePool({
    candidates: () => [makeThread('T1', {
      eventType: 'disaster',
      // Thread has both aviation + Air India so overlap with cluster = 2
      entities: {
        companies: [{ ticker: null, name: 'Air India', sectors: [] }],
        sectors: ['aviation'],
        tickers: [],
      },
    })],
    clusterRows: () => [{ nse_tickers: [], sectors: ['aviation'], companies: ['Air India'], event_type: 'disaster' }],
    titleBag: () => [{ headline: 'Air India crash ahmedabad aviation disaster probe' }],
    eventTypes: () => [],
  }, state);

  const cluster = makeCluster('C1', 'Air India crash ahmedabad aviation disaster');
  const result = await linkClusters(pool, [cluster], new Set());

  assert.equal(result.linked, 1, 'matching event_type should allow attach');
  assert.equal(result.spawned, 0);
});

// ── R3 — multi-match tie-break ────────────────────────────────────────────────

test('R3: picks the thread with higher Jaccard when weighted_overlap is equal', async () => {
  // Both threads have identical entity overlap (HDFCBANK + banking = 2).
  // T-HIGH has a richer title-bag → higher Jaccard with the cluster title.
  const state = {};
  const pool = makePool({
    candidates: () => [
      makeThread('T-LOW',  { entities: { companies: [], sectors: ['banking'], tickers: ['HDFCBANK'] } }),
      makeThread('T-HIGH', { entities: { companies: [], sectors: ['banking'], tickers: ['HDFCBANK'] } }),
    ],
    clusterRows: () => [{ nse_tickers: ['HDFCBANK'], sectors: ['banking'], companies: [], event_type: null }],
    titleBag: (threadId) => threadId === 'T-HIGH'
      // T-HIGH bag tokens: {hdfc,bank,quarterly,profit,results,strong,sector,growth}
      // Jaccard vs cluster {hdfc,bank,quarterly,profit,results,strong} = 6/8 = 0.75
      ? [{ headline: 'hdfc bank quarterly profit results strong sector growth' }]
      // T-LOW bag tokens: {hdfc,bank,quarterly,results,profit,numbers,revenue}
      // Jaccard vs cluster = 5/8 = 0.625
      : [{ headline: 'hdfc bank quarterly results profit numbers revenue' }],
    eventTypes: () => [],
  }, state);

  // Cluster tokens: {hdfc, bank, quarterly, profit, results, strong}
  const cluster = makeCluster('C1', 'HDFC bank quarterly profit results strong');
  const result = await linkClusters(pool, [cluster], new Set());

  assert.equal(result.linked, 1);
  assert.equal(
    state.attached?.[0]?.threadId,
    'T-HIGH',
    'R3 tie-break should pick T-HIGH (higher Jaccard)'
  );
});

// ── R4 — common-entity filter ─────────────────────────────────────────────────

test('R4: clusters sharing only common entities do not match existing threads', async () => {
  const savedK1 = process.env.GROQ_API_KEY;
  const savedK2 = process.env.GROQ_API_KEY_2;
  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY_2;
  try {
    const state = {};
    const pool = makePool({
      candidates: () => [makeThread('T1', {
        entities: {
          companies: [{ ticker: null, name: 'India', sectors: [] }, { ticker: null, name: 'Government', sectors: [] }],
          sectors: [],
          tickers: [],
        },
      })],
      // Both entities are in common_entities → meaningful overlap = 0 after R4 filter
      clusterRows: () => [{ nse_tickers: [], sectors: [], companies: ['India', 'Government'], event_type: null }],
    }, state);

    const cluster = makeCluster('C1', 'Government of India policy announcement');
    const result = await linkClusters(pool, [cluster], new Set());

    assert.equal(result.linked, 0, 'common entities must not count toward overlap threshold');
    assert.equal(result.spawned, 1, 'should spawn new thread when only common entities present');
  } finally {
    if (savedK1 !== undefined) process.env.GROQ_API_KEY = savedK1;
    if (savedK2 !== undefined) process.env.GROQ_API_KEY_2 = savedK2;
  }
});

test('R4: non-common entities count normally toward overlap threshold', async () => {
  const state = {};
  const pool = makePool({
    candidates: () => [makeThread('T1', {
      entities: { companies: [], sectors: ['energy'], tickers: ['RELIANCE'] },
    })],
    clusterRows: () => [{ nse_tickers: ['RELIANCE'], sectors: ['energy'], companies: [], event_type: null }],
    titleBag: () => [{ headline: 'reliance energy sector results profit revenue strong' }],
    eventTypes: () => [],
  }, state);

  const cluster = makeCluster('C1', 'Reliance energy sector results profit');
  const result = await linkClusters(pool, [cluster], new Set());
  assert.equal(result.linked, 1, 'non-common entities should count toward overlap');
});

// ── R5 — Groq fallback cascade ────────────────────────────────────────────────

test('R5: uses entity+event_type fallback title when Groq unavailable (never truncated headline)', async () => {
  const savedK1 = process.env.GROQ_API_KEY;
  const savedK2 = process.env.GROQ_API_KEY_2;
  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY_2;
  try {
    const state = {};
    const pool = makePool({
      candidates: () => [],  // force spawn
      clusterRows: () => [{ nse_tickers: [], sectors: [], companies: ['Air India'], event_type: 'disaster' }],
    }, state);

    const longHeadline = 'Air India flight 178 crashes near Ahmedabad airport killing 232 people on board today';
    const cluster = makeCluster('C1', longHeadline);
    await linkClusters(pool, [cluster], new Set());

    assert.equal(state.inserts?.length, 1);
    const title = state.inserts[0].title;
    assert.equal(title, 'Air India disaster', 'should use entity + event_type, not truncated headline');
    assert.ok(title.length < longHeadline.length, 'title must be shorter than the raw headline');
  } finally {
    if (savedK1 !== undefined) process.env.GROQ_API_KEY = savedK1;
    if (savedK2 !== undefined) process.env.GROQ_API_KEY_2 = savedK2;
  }
});

test('R5: falls back to event_type + " event" when no company entity available', async () => {
  const savedK1 = process.env.GROQ_API_KEY;
  const savedK2 = process.env.GROQ_API_KEY_2;
  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY_2;
  try {
    const state = {};
    const pool = makePool({
      candidates: () => [],
      clusterRows: () => [{ nse_tickers: [], sectors: [], companies: [], event_type: 'regulation' }],
    }, state);

    await linkClusters(pool, [makeCluster('C1', 'New regulatory framework announced for the sector')], new Set());
    assert.equal(state.inserts?.[0]?.title, 'regulation event');
  } finally {
    if (savedK1 !== undefined) process.env.GROQ_API_KEY = savedK1;
    if (savedK2 !== undefined) process.env.GROQ_API_KEY_2 = savedK2;
  }
});

test('R5: falls back to generic title when no company and no event_type', async () => {
  const savedK1 = process.env.GROQ_API_KEY;
  const savedK2 = process.env.GROQ_API_KEY_2;
  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY_2;
  try {
    const state = {};
    const pool = makePool({
      candidates: () => [],
      clusterRows: () => [{ nse_tickers: [], sectors: [], companies: [], event_type: null }],
    }, state);

    await linkClusters(pool, [makeCluster('C1', 'Breaking news update')], new Set());
    assert.equal(state.inserts?.[0]?.title, 'India news event');
  } finally {
    if (savedK1 !== undefined) process.env.GROQ_API_KEY = savedK1;
    if (savedK2 !== undefined) process.env.GROQ_API_KEY_2 = savedK2;
  }
});

// ── R6 — one re-summary per thread per cycle ──────────────────────────────────

test('R6: resummarizeGrown skips thread summarized within the last hour (throttle)', async () => {
  const recentTime = new Date(Date.now() - 20 * 60 * 1000).toISOString(); // 20 min ago
  const pool = makePool({
    threadById: () => ({ thread_id: 'T1', thread_title: 'Test', last_summary_at: recentTime }),
  });

  const count = await resummarizeGrown(pool, new Set(['T1']));
  assert.equal(count, 0, 'should skip: last_summary_at is within 1 hour');
});

test('R6: resummarizeGrown processes thread whose last_summary_at is over 1 hour old', async () => {
  const savedK1 = process.env.GROQ_API_KEY;
  const savedK2 = process.env.GROQ_API_KEY_2;
  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY_2;
  try {
    // Groq unavailable → callGroq returns null → function skips summary update, returns 0
    // What we verify: it does NOT throw, and does NOT skip due to throttle (old timestamp)
    const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
    const pool = makePool({
      threadById: () => ({ thread_id: 'T1', thread_title: 'Air India crash', last_summary_at: oldTime }),
      titleBag: () => [{ headline: 'Air India crash probe continues update' }],
    });

    await assert.doesNotReject(() => resummarizeGrown(pool, new Set(['T1'])));
  } finally {
    if (savedK1 !== undefined) process.env.GROQ_API_KEY = savedK1;
    if (savedK2 !== undefined) process.env.GROQ_API_KEY_2 = savedK2;
  }
});

test('R6: Set deduplication ensures same thread_id added multiple times is processed once', async () => {
  const recentTime = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  let queryCalls = 0;
  const pool = {
    async query() {
      queryCalls++;
      return { rows: [{ thread_id: 'T1', thread_title: 'Test', last_summary_at: recentTime }] };
    },
    async end() {},
  };

  const grownThreads = new Set();
  grownThreads.add('T1');
  grownThreads.add('T1'); // duplicate — Set stores only one
  grownThreads.add('T1');

  assert.equal(grownThreads.size, 1, 'Set must deduplicate thread IDs');
  await resummarizeGrown(pool, grownThreads);
  // Only 1 query for the threadById lookup (not 3)
  assert.equal(queryCalls, 1, 'should query DB exactly once despite 3 add() calls');
});

// ── sweepThreadStatus ─────────────────────────────────────────────────────────

test('sweepThreadStatus runs both sweep queries without error', async () => {
  const pool = makePool({ dormantCount: 3, resolvedCount: 1 });
  await assert.doesNotReject(() => sweepThreadStatus(pool));
});
