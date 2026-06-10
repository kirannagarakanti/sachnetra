#!/usr/bin/env node

// Gold-set SCORER (read-only) — reads the hand-labelled CSV and reports how the
// heuristic GATE and the dictionary TAGGER do against the human labels.
//
// Scores only rows where `gate_label` is filled, so it works on a partially
// labelled sheet (label 50, score, iterate). The tagger is re-run live via
// extractCompanies (so it reflects the CURRENT master, e.g. post common-word
// fix), NOT the `current_tags` snapshot column.
//
// Usage:
//   node scripts/research/score-goldset.mjs
//   node scripts/research/score-goldset.mjs --csv path/to/labelled.csv
//   node scripts/research/score-goldset.mjs --errors          # also list mislabels

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';
import { extractCompanies } from '../_india-market-keywords.mjs';
import { runGate } from './_gate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const args = process.argv.slice(2);
const CSV = (() => {
  const i = args.indexOf('--csv');
  return i >= 0 && args[i + 1] ? args[i + 1] : join(ROOT, 'scripts/research/output/goldset/goldset_sample.csv');
})();
const SHOW_ERRORS = args.includes('--errors');

const norm = (s) => (s || '').trim().toUpperCase();
const stratumGroup = (s) => (s || '?').split('_')[0];

// Parse ticker_label into a gold ticker set (PRIMARY only). Accepts
// "RELIANCE;TCS", "RELIANCE:PRIMARY;DISNEY:MENTIONED", with the row `role`
// column as the default role when a token has none.
function goldPrimary(tickerLabel, roleCol) {
  const defaultRole = norm(roleCol) || 'PRIMARY';
  const out = new Set();
  for (const tok of (tickerLabel || '').split(/[;,/]+/)) {
    const t = tok.trim();
    if (!t) continue;
    const [tk, role] = t.split(':');
    const r = role ? norm(role) : defaultRole;
    if (r === 'PRIMARY' || r === '') out.add(norm(tk));
  }
  out.delete('');
  return out;
}

function pct(n, d) {
  return d === 0 ? '  n/a' : `${((100 * n) / d).toFixed(1)}%`;
}
function prf(tp, fp, fn) {
  const p = tp + fp === 0 ? 0 : tp / (tp + fp);
  const r = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = p + r === 0 ? 0 : (2 * p * r) / (p + r);
  return { p, r, f1 };
}

function main() {
  const parsed = Papa.parse(readFileSync(CSV, 'utf8'), { header: true, skipEmptyLines: true });
  const rows = parsed.data.filter((r) => norm(r.gate_label));
  const total = parsed.data.length;
  console.log(`[score] CSV: ${CSV}`);
  console.log(`[score] ${rows.length}/${total} rows labelled (gate_label filled)\n`);
  if (rows.length === 0) {
    console.log('[score] Nothing to score yet. Fill the gate_label column and re-run.');
    return;
  }

  // Accumulators
  const gateAll = { tp: 0, fp: 0, fn: 0, tn: 0 };
  const gateByStratum = {};
  const tagAll = { tp: 0, fp: 0, fn: 0 };
  const tagByStratum = {};
  const emptyVsMiss = {}; // among TAGGER-untagged rows: gold EMPTY vs MISS (gold SPECIFIC)
  const gateErrors = [];
  const tagErrors = [];

  for (const row of rows) {
    const g = stratumGroup(row.stratum);
    const predTickers = new Set(extractCompanies(row.headline || '').map((c) => c.ticker));
    const predGate = runGate(row.headline || '', predTickers.size).decision;
    const goldGate = norm(row.gate_label); // SPECIFIC | EMPTY

    // ── Gate scoring (positive class = SPECIFIC) ──
    gateByStratum[g] ||= { tp: 0, fp: 0, fn: 0, tn: 0 };
    const bucket = predGate === 'SPECIFIC' ? (goldGate === 'SPECIFIC' ? 'tp' : 'fp') : goldGate === 'SPECIFIC' ? 'fn' : 'tn';
    gateAll[bucket]++;
    gateByStratum[g][bucket]++;
    if (SHOW_ERRORS && (bucket === 'fp' || bucket === 'fn')) {
      gateErrors.push(`  [gate ${bucket.toUpperCase()}] pred=${predGate} gold=${goldGate} · "${row.headline}"`);
    }

    // ── EMPTY-vs-MISS among TAGGER-untagged rows (the 6.46% question) ──
    if (predTickers.size === 0) {
      emptyVsMiss[g] ||= { empty: 0, miss: 0 };
      if (goldGate === 'EMPTY') emptyVsMiss[g].empty++;
      else emptyVsMiss[g].miss++; // human says SPECIFIC but tagger found nothing → real miss
    }

    // ── Tagger scoring (only where gold has PRIMARY tickers) ──
    const gold = goldPrimary(row.ticker_label, row.role);
    if (gold.size > 0) {
      tagByStratum[g] ||= { tp: 0, fp: 0, fn: 0 };
      for (const t of predTickers) {
        if (gold.has(t)) { tagAll.tp++; tagByStratum[g].tp++; }
        else { tagAll.fp++; tagByStratum[g].fp++; }
      }
      for (const t of gold) {
        if (!predTickers.has(t)) { tagAll.fn++; tagByStratum[g].fn++; }
      }
      if (SHOW_ERRORS) {
        const missed = [...gold].filter((t) => !predTickers.has(t));
        const wrong = [...predTickers].filter((t) => !gold.has(t));
        if (missed.length || wrong.length) {
          tagErrors.push(`  [tag] gold=${[...gold].join(',')} pred=${[...predTickers].join(',') || '—'} · "${row.headline}"`);
        }
      }
    }
  }

  // ── Report: GATE ──
  const gAll = prf(gateAll.tp, gateAll.fp, gateAll.fn);
  console.log('=== GATE (positive class = SPECIFIC) ===');
  console.log(`  overall   P ${gAll.p.toFixed(3)}  R ${gAll.r.toFixed(3)}  F1 ${gAll.f1.toFixed(3)}   (tp${gateAll.tp} fp${gateAll.fp} fn${gateAll.fn} tn${gateAll.tn})`);
  for (const [g, c] of Object.entries(gateByStratum).sort()) {
    const m = prf(c.tp, c.fp, c.fn);
    console.log(`    ${g.padEnd(4)}  P ${m.p.toFixed(3)}  R ${m.r.toFixed(3)}  F1 ${m.f1.toFixed(3)}   (tp${c.tp} fp${c.fp} fn${c.fn} tn${c.tn})`);
  }

  // ── Report: EMPTY-vs-MISS ──
  console.log('\n=== Among TAGGER-untagged rows: correctly EMPTY vs real MISS ===');
  let eTot = 0, mTot = 0;
  for (const [g, c] of Object.entries(emptyVsMiss).sort()) {
    eTot += c.empty; mTot += c.miss;
    console.log(`    ${g.padEnd(4)}  EMPTY ${String(c.empty).padStart(3)}  MISS ${String(c.miss).padStart(3)}  · miss-rate ${pct(c.miss, c.empty + c.miss)}`);
  }
  console.log(`    ALL   EMPTY ${String(eTot).padStart(3)}  MISS ${String(mTot).padStart(3)}  · miss-rate ${pct(mTot, eTot + mTot)}`);
  console.log('    (high MISS in D1/D2 = the tagger is dropping real small-cap company news → recall gap)');

  // ── Report: TAGGER ──
  const tAll = prf(tagAll.tp, tagAll.fp, tagAll.fn);
  console.log('\n=== TAGGER (ticker P/R on rows with gold PRIMARY tickers) ===');
  console.log(`  overall   P ${tAll.p.toFixed(3)}  R ${tAll.r.toFixed(3)}  F1 ${tAll.f1.toFixed(3)}   (tp${tagAll.tp} fp${tagAll.fp} fn${tagAll.fn})`);
  for (const [g, c] of Object.entries(tagByStratum).sort()) {
    const m = prf(c.tp, c.fp, c.fn);
    console.log(`    ${g.padEnd(4)}  P ${m.p.toFixed(3)}  R ${m.r.toFixed(3)}  F1 ${m.f1.toFixed(3)}   (tp${c.tp} fp${c.fp} fn${c.fn})`);
  }

  if (SHOW_ERRORS) {
    if (gateErrors.length) { console.log(`\n=== Gate errors (${gateErrors.length}) ===`); console.log(gateErrors.slice(0, 40).join('\n')); }
    if (tagErrors.length) { console.log(`\n=== Tagger errors (${tagErrors.length}) ===`); console.log(tagErrors.slice(0, 40).join('\n')); }
  } else {
    console.log('\n[score] re-run with --errors to list the mislabelled headlines.');
  }
}

main();
