#!/usr/bin/env node
/**
 * Unit tests for _entity-fan-out.mjs
 * Covers: SR1 sentiment cascade, SR2 composite-PK ON CONFLICT, SR3 source_count columns,
 *         design R1 0-entity skip, design R2 theme always cluster_primary.
 * Run: node --test scripts/_entity-fan-out.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fanOutEntities } from './_entity-fan-out.mjs';

// ── Mock pool ─────────────────────────────────────────────────────────────────
// Routes queries by SQL pattern. `state` accumulates side-effects for assertions.

function makePool(dbRows = [], state = {}) {
  return {
    state,
    async query(sql, params) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.includes('FROM india_news_signals') && s.includes('ANY($1)')) {
        const hashes = params[0];
        return { rows: dbRows.filter(r => hashes.includes(r.cluster_hash)) };
      }
      if (s.includes('INSERT INTO entity_timeline')) {
        state.insertCalled = (state.insertCalled ?? 0) + 1;
        state.insertSql    = s;
        state.insertValues = params;
        return { rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    },
    async end() {},
  };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeRow(clusterHash, overrides = {}) {
  return {
    cluster_hash:     clusterHash,
    companies:        overrides.companies        ?? [],
    nse_tickers:      overrides.nse_tickers      ?? [],
    sectors:          overrides.sectors          ?? [],
    headline:         overrides.headline         ?? 'India market update',
    sentiment_score:  overrides.sentiment_score  ?? 0.5,
    entity_sentiment: overrides.entity_sentiment ?? null,
    scraped_at:       overrides.scraped_at       ?? new Date().toISOString(),
    ai_summary:       overrides.ai_summary       ?? null,
    thread_id:        overrides.thread_id        ?? null,
  };
}

// ── INSERT param layout (10 cols per entity row, flat array) ──────────────────
// idx+0 entity_id  idx+1 entity_type  idx+2 entity_name  idx+3 cluster_hash
// idx+4 thread_id  idx+5 observed_at  idx+6 sentiment    idx+7 sentiment_source
// idx+8 source_count  idx+9 cluster_size

// ── Empty input ───────────────────────────────────────────────────────────────

test('empty clusterHashes → no DB queries, no INSERT', async () => {
  let queryCalled = false;
  const pool = { async query() { queryCalled = true; return { rows: [] }; }, async end() {} };
  await fanOutEntities(pool, []);
  assert.equal(queryCalled, false, 'no DB call for empty input');
});

// ── Design R1 — 0-entity skip ─────────────────────────────────────────────────

test('R1: cluster with no companies/sectors/themes is skipped — no INSERT', async () => {
  const row = makeRow('C1', { headline: 'weather update in chennai today' });
  const state = {};
  await fanOutEntities(makePool([row], state), ['C1']);
  assert.equal(state.insertCalled, undefined, 'INSERT must not be called for 0-entity cluster');
});

// ── Theme keyword match ───────────────────────────────────────────────────────

test('theme match: "repo rate" fires RBI-policy entity with correct name', async () => {
  const row = makeRow('C1', { headline: 'RBI cuts repo rate by 25 basis points', sentiment_score: 0.3 });
  const state = {};
  await fanOutEntities(makePool([row], state), ['C1']);

  assert.equal(state.insertCalled, 1, 'INSERT called');
  const v = state.insertValues;
  const idx = v.indexOf('RBI-policy');
  assert.ok(idx !== -1,              'entity_id must be RBI-policy');
  assert.equal(v[idx + 1], 'theme',  'entity_type must be theme');
  assert.equal(v[idx + 2], 'RBI policy', 'entity_name must match taxonomy name');
});

test('theme match: "monsoon" keyword fires monsoon entity', async () => {
  const row = makeRow('C1', { headline: 'Monsoon arrives early across Kerala coast IMD says' });
  const state = {};
  await fanOutEntities(makePool([row], state), ['C1']);
  assert.ok(state.insertValues?.includes('monsoon'), 'monsoon theme must fire');
});

test('theme non-match: headline with no theme keywords produces no theme entity', async () => {
  const row = makeRow('C1', { sectors: ['auto'], headline: 'Maruti reports record monthly sales' });
  const state = {};
  await fanOutEntities(makePool([row], state), ['C1']);
  const v = state.insertValues ?? [];
  assert.ok(!v.includes('monsoon') && !v.includes('RBI-policy') && !v.includes('crude-shock'),
    'no theme entity when headline has no theme keywords');
});

// ── SR3: source_count from columns, not regex ─────────────────────────────────

test('SR3 company: source_count = rows with ticker in nse_tickers (not regex)', async () => {
  const rows = [
    makeRow('C1', { nse_tickers: ['RELIANCE.NS'], companies: ['Reliance'], headline: 'Reliance results' }),
    makeRow('C1', { nse_tickers: ['RELIANCE.NS'], companies: ['Reliance'], headline: 'RIL beats estimates' }),
    makeRow('C1', { nse_tickers: ['TCS.NS'],      companies: ['TCS'],      headline: 'TCS guidance cut' }),
  ];
  const state = {};
  await fanOutEntities(makePool(rows, state), ['C1']);

  const v = state.insertValues;
  const idx = v.indexOf('RELIANCE.NS');
  assert.ok(idx !== -1, 'RELIANCE.NS must be inserted');
  assert.equal(v[idx + 8], 2, 'source_count must be 2 (rows with RELIANCE.NS in nse_tickers)');
  assert.equal(v[idx + 9], 3, 'cluster_size must be 3 (total cluster rows)');
});

test('SR3 sector: source_count = rows with sector key in sectors column (not regex)', async () => {
  const rows = [
    makeRow('C1', { sectors: ['banking'], headline: 'Bank NPA rises sharply' }),
    makeRow('C1', { sectors: ['banking'], headline: 'HDFC loan growth strong' }),
    makeRow('C1', { sectors: [],          headline: 'General credit update' }),
  ];
  const state = {};
  await fanOutEntities(makePool(rows, state), ['C1']);

  const v = state.insertValues;
  const idx = v.indexOf('banking');
  assert.ok(idx !== -1, 'banking sector entity must be inserted');
  assert.equal(v[idx + 8], 2, 'sector source_count must be 2 (rows with banking in sectors)');
});

test('SR3 theme: source_count = headlines matching cached regex (not a column)', async () => {
  // crude-shock keywords include "brent", "opec", "crude oil", "wti", "oil price"
  const rows = [
    makeRow('C1', { headline: 'Crude oil prices spike after OPEC output cut' }),
    makeRow('C1', { headline: 'Brent rises above $90 on supply fears' }),
    makeRow('C1', { headline: 'India GDP data shows steady growth' }),  // no crude match
  ];
  const state = {};
  await fanOutEntities(makePool(rows, state), ['C1']);

  const v = state.insertValues;
  const idx = v.indexOf('crude-shock');
  assert.ok(idx !== -1, 'crude-shock theme must fire');
  assert.equal(v[idx + 8], 2, 'theme source_count must be 2 (rows 1 and 2 match crude-shock regex)');
});

// ── SR1 — sentiment cascade ───────────────────────────────────────────────────

test('SR1: entity_sentiment null → sentiment_source is cluster_primary', async () => {
  const row = makeRow('C1', {
    nse_tickers: ['INFY.NS'], companies: ['Infosys'],
    entity_sentiment: null, sentiment_score: 0.72,
  });
  const state = {};
  await fanOutEntities(makePool([row], state), ['C1']);

  const v = state.insertValues;
  const idx = v.indexOf('INFY.NS');
  assert.ok(idx !== -1);
  assert.equal(v[idx + 6], 0.72,             'sentiment must be cluster sentiment_score');
  assert.equal(v[idx + 7], 'cluster_primary', 'SR1: sentiment_source must be cluster_primary');
});

test('SR1: entity_sentiment key present → entity_jsonb path (future-proof branch)', async () => {
  const row = makeRow('C1', {
    nse_tickers: ['HDFCBANK.NS'], companies: ['HDFC Bank'],
    entity_sentiment: { 'HDFCBANK.NS': 0.91 }, sentiment_score: 0.5,
  });
  const state = {};
  await fanOutEntities(makePool([row], state), ['C1']);

  const v = state.insertValues;
  const idx = v.indexOf('HDFCBANK.NS');
  assert.ok(idx !== -1);
  assert.equal(v[idx + 6], 0.91,          'sentiment must come from entity_jsonb value');
  assert.equal(v[idx + 7], 'entity_jsonb', 'sentiment_source must be entity_jsonb');
});

// ── Design R2 — theme always cluster_primary ──────────────────────────────────

test('R2: theme uses cluster_primary even when entity_sentiment has a matching key', async () => {
  const row = makeRow('C1', {
    headline: 'Monsoon rains arrive early IMD kharif sowing begins',
    entity_sentiment: { 'monsoon': 0.99 }, // hypothetical future key — must be ignored for themes
    sentiment_score: 0.4,
  });
  const state = {};
  await fanOutEntities(makePool([row], state), ['C1']);

  const v = state.insertValues;
  const idx = v.indexOf('monsoon');
  assert.ok(idx !== -1, 'monsoon theme must fire');
  assert.equal(v[idx + 7], 'cluster_primary',
    'R2: theme sentiment_source must always be cluster_primary');
  assert.equal(v[idx + 6], 0.4, 'R2: sentiment must be cluster sentiment_score, not entity_jsonb');
});

// ── SR2 — composite PK ON CONFLICT ───────────────────────────────────────────

test('SR2: INSERT SQL uses ON CONFLICT (entity_id, entity_type, cluster_hash) DO NOTHING', async () => {
  const row = makeRow('C1', { sectors: ['tech'], headline: 'IT sector software results' });
  const state = {};
  await fanOutEntities(makePool([row], state), ['C1']);
  assert.ok(
    state.insertSql?.includes('ON CONFLICT (entity_id, entity_type, cluster_hash) DO NOTHING'),
    'SR2: ON CONFLICT must include entity_type in the composite key'
  );
});

// ── Primary row selection ─────────────────────────────────────────────────────

test('primary row: row with ai_summary is preferred for observed_at and sentiment', async () => {
  const olderTime = new Date(Date.now() - 3_600_000).toISOString();
  const newerTime = new Date().toISOString();
  const rows = [
    makeRow('C1', { scraped_at: olderTime, ai_summary: 'enriched summary', sentiment_score: 0.8,
                    nse_tickers: ['WIPRO.NS'], companies: ['Wipro'] }),
    makeRow('C1', { scraped_at: newerTime, ai_summary: null, sentiment_score: 0.1,
                    nse_tickers: ['WIPRO.NS'], companies: ['Wipro'] }),
  ];
  const state = {};
  await fanOutEntities(makePool(rows, state), ['C1']);

  const v = state.insertValues;
  const idx = v.indexOf('WIPRO.NS');
  assert.ok(idx !== -1);
  assert.equal(v[idx + 5], olderTime, 'observed_at must come from the ai_summary (primary) row');
  assert.equal(v[idx + 6], 0.8,       'sentiment must come from the ai_summary (primary) row');
});

// ── cluster_size vs source_count ──────────────────────────────────────────────

test('cluster_size is total rows; source_count is entity-mention subset', async () => {
  const rows = [
    makeRow('C1', { nse_tickers: ['SBIN.NS'], companies: ['SBI'], headline: 'SBI loan book grows' }),
    makeRow('C1', { nse_tickers: ['SBIN.NS'], companies: ['SBI'], headline: 'SBI NPA falls sharply' }),
    makeRow('C1', { nse_tickers: [],          companies: [],      headline: 'Credit growth update' }),
    makeRow('C1', { nse_tickers: [],          companies: [],      headline: 'Lending rate forecast' }),
  ];
  const state = {};
  await fanOutEntities(makePool(rows, state), ['C1']);

  const v = state.insertValues;
  const idx = v.indexOf('SBIN.NS');
  assert.ok(idx !== -1);
  assert.equal(v[idx + 8], 2, 'source_count must be 2 (only 2 rows mention SBIN.NS)');
  assert.equal(v[idx + 9], 4, 'cluster_size must be 4 (total rows in cluster)');
});

// ── Multiple clusters in one call ─────────────────────────────────────────────

test('multiple clusters produce one bulk INSERT covering all entity rows', async () => {
  const rows = [
    makeRow('C1', { sectors: ['pharma'],  headline: 'Drug approval for new medicine' }),
    makeRow('C2', { sectors: ['banking'], headline: 'Repo rate hike expected next month' }),
  ];
  const state = {};
  await fanOutEntities(makePool(rows, state), ['C1', 'C2']);

  assert.equal(state.insertCalled, 1, 'one bulk INSERT for all clusters');
  const v = state.insertValues;
  assert.ok(v.includes('pharma'),    'pharma sector entity from C1');
  assert.ok(v.includes('banking'),   'banking sector entity from C2');
  assert.ok(v.includes('RBI-policy'),'RBI-policy theme entity from C2 headline');
});
