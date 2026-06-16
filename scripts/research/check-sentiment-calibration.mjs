#!/usr/bin/env node
//
// G6 / Exp20 Part A1 — READ-ONLY sentiment-calibration diagnosis.
// Pre-registration: ai_docs/sachnetra v2/wiki/experiments/exp20_brief.md (Part A — calibrate for ORDERING).
//
// THE RE-SCOPE THIS SCRIPT SERVES.
//   The "88% positive" alarm is about the MEAN. But Exp19 blends signals cross-sectionally with a per-day
//   z-score, which subtracts any uniform offset — so a biased mean is cosmetic for the ensemble. What the
//   ensemble actually needs is trustworthy ORDERING: does the scorer rank ticker A's news above ticker B's
//   correctly? This script is the cheapest, highest-information first move — a pure read-only look that can
//   tell us whether G6 is even a real blocker BEFORE any gold-labelling work.
//
// THREE QUESTIONS IT ANSWERS (all from data in hand, no model calls, no writes):
//   1. CONFIRM the bias  — what IS the positive/neutral/negative split, overall and per model & per label?
//   2. ATTRIBUTE it      — is the skew the MODEL (same skew on tagged vs untagged) or NEWS-SELECTION
//                          (company-tagged headlines look different from the untagged firehose)?
//   3. ORDERING sanity   — within the tagged rows the ensemble can actually use, is there enough score
//                          DISPERSION (and day-to-day variation) for a z-score to rank on? A pile of
//                          identical high-confidence positives cannot be re-ordered by re-centering;
//                          a healthy spread means the z-score already handles the offset → G6 is moot.
//   Plus a COVERAGE read (couples to G1): how many rows carry a ticker tag + sentiment at all — a thin
//   column reads as "untestable yet", not "null".
//
// IMPORTANT (brief guard): this is diagnosis only. It does NOT manufacture a re-centering transform and
// claim it "helped" — only a re-ORDERING fix (a better model) can change Exp19, and that is Part A2+/B.
//
// READ-ONLY on prod (SELECTs only). Claude authored; Lijo runs.
//
// USAGE
//   node scripts/research/check-sentiment-calibration.mjs
//   node scripts/research/check-sentiment-calibration.mjs --from=2025-01-01

import { loadEnvFile } from '../_seed-utils.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

loadEnvFile(import.meta.url);
const { Pool } = pg;
const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'output', 'exp20');

const args = process.argv.slice(2);
const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const FROM = flag('from', null);

// ── tiny stats ──
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const sd = (a) => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
function quantile(sorted, q) { if (!sorted.length) return NaN; const p = (sorted.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (p - lo); }
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : '  n/a');
const f4 = (x) => (Number.isFinite(x) ? x.toFixed(4) : ' n/a');

// ASCII histogram for signed scores in [-1, 1]
function histogram(vals, { bins = 20, lo = -1, hi = 1, width = 40 } = {}) {
  const counts = new Array(bins).fill(0);
  for (const v of vals) { if (v == null || Number.isNaN(v)) continue; let b = Math.floor(((v - lo) / (hi - lo)) * bins); if (b < 0) b = 0; if (b >= bins) b = bins - 1; counts[b]++; }
  const max = Math.max(1, ...counts);
  const out = [];
  for (let b = 0; b < bins; b++) { const left = lo + (b / bins) * (hi - lo); const bar = '█'.repeat(Math.round((counts[b] / max) * width));
    out.push(`  ${left.toFixed(2).padStart(6)} | ${bar} ${counts[b]}`); }
  return out.join('\n');
}

function labelSplit(rows) {
  const c = { positive: 0, negative: 0, neutral: 0, other: 0 };
  for (const r of rows) { const l = (r.sentiment_label || '').toLowerCase(); if (l in c) c[l]++; else c.other++; }
  return c;
}
function splitLine(c) { const t = c.positive + c.negative + c.neutral + c.other;
  return `pos ${pct(c.positive, t)} · neu ${pct(c.neutral, t)} · neg ${pct(c.negative, t)}${c.other ? ` · other ${pct(c.other, t)}` : ''}  (n=${t})`; }

async function main() {
  console.log('=== G6 / Exp20-A1 — sentiment-calibration diagnosis (READ-ONLY) ===\n');
  const cs = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
  if (!cs) { console.error('No DATABASE_PUBLIC_URL / DATABASE_URL in .env.local'); process.exit(1); }
  const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

  const where = FROM ? `WHERE published_at >= '${FROM}'` : '';
  const { rows } = await pool.query(
    `SELECT sentiment_score, sentiment_label, sentiment_model,
            (nse_tickers    IS NOT NULL AND array_length(nse_tickers, 1)    > 0) AS tagged_v1,
            (nse_tickers_v2 IS NOT NULL AND array_length(nse_tickers_v2, 1) > 0) AS tagged_v2,
            to_char(COALESCE(published_at, scraped_at), 'YYYY-MM') AS ym
       FROM india_news_signals ${where}`);
  await pool.end();

  const total = rows.length;
  const scored = rows.filter((r) => r.sentiment_score != null || r.sentiment_label);
  const withScore = rows.filter((r) => r.sentiment_score != null).map((r) => Number(r.sentiment_score));
  console.log(`Rows: ${total}${FROM ? ` (from ${FROM})` : ''}  ·  with a sentiment label/score: ${scored.length} (${pct(scored.length, total)})  ·  with numeric score: ${withScore.length}\n`);

  // ── Q1: confirm the bias — overall + per model ──
  console.log('── Q1 · The split (CONFIRM the 88%) ──');
  console.log(`  OVERALL          ${splitLine(labelSplit(scored))}`);
  const byModel = new Map();
  for (const r of scored) { const m = r.sentiment_model || '(null)'; if (!byModel.has(m)) byModel.set(m, []); byModel.get(m).push(r); }
  for (const [m, rs] of [...byModel.entries()].sort((a, b) => b[1].length - a[1].length))
    console.log(`  ${m.padEnd(16)} ${splitLine(labelSplit(rs))}`);

  // ── Q2: attribute — model vs news-selection (tagged vs untagged) ──
  console.log('\n── Q2 · Attribution: MODEL bias vs NEWS-SELECTION (tagged company news vs untagged firehose) ──');
  for (const [colName, key] of [['nse_tickers (v1)', 'tagged_v1'], ['nse_tickers_v2', 'tagged_v2']]) {
    const tagged = scored.filter((r) => r[key]);
    const untagged = scored.filter((r) => !r[key]);
    console.log(`  ${colName}:`);
    console.log(`    TAGGED   ${splitLine(labelSplit(tagged))}`);
    console.log(`    UNTAGGED ${splitLine(labelSplit(untagged))}`);
    const tp = labelSplit(tagged), up = labelSplit(untagged);
    const tShare = tp.positive / Math.max(1, tp.positive + tp.negative + tp.neutral);
    const uShare = up.positive / Math.max(1, up.positive + up.negative + up.neutral);
    if (tagged.length >= 30 && untagged.length >= 30)
      console.log(`    → positive-share gap (tagged − untagged) = ${((tShare - uShare) * 100).toFixed(1)} pts` +
        ` ⇒ ${Math.abs(tShare - uShare) < 0.05 ? 'SAME skew on both ⇒ looks MODEL-driven' : 'differs ⇒ NEWS-SELECTION contributes'}`);
    else console.log('    → too few tagged/untagged rows to attribute reliably');
  }

  // ── Q3: ordering sanity — score dispersion within the rows the ensemble uses ──
  console.log('\n── Q3 · Ordering sanity: is there enough score DISPERSION for a per-day z-score to rank on? ──');
  const taggedScores = scored.filter((r) => r.tagged_v1 || r.tagged_v2).filter((r) => r.sentiment_score != null).map((r) => Number(r.sentiment_score));
  const report = (name, vals) => {
    if (!vals.length) { console.log(`  ${name}: no numeric scores`); return; }
    const s = [...vals].sort((a, b) => a - b);
    console.log(`  ${name}: n=${vals.length}  mean ${f4(mean(vals))}  sd ${f4(sd(vals))}  ` +
      `min ${f4(s[0])}  p10 ${f4(quantile(s, 0.1))}  p50 ${f4(quantile(s, 0.5))}  p90 ${f4(quantile(s, 0.9))}  max ${f4(s[s.length - 1])}`);
    const distinct = new Set(vals.map((v) => v.toFixed(3))).size;
    console.log(`         distinct(3dp) ${distinct}  ·  exact-zero ${pct(vals.filter((v) => v === 0).length, vals.length)}`);
  };
  report('ALL scored ', withScore);
  report('TAGGED-only', taggedScores);
  console.log('\n  Signed-score histogram (TAGGED rows — what the ensemble actually z-scores):');
  console.log(taggedScores.length ? histogram(taggedScores) : '   (none)');

  // day-to-day variation of the positive share — a z-score removes a STABLE offset; check it is roughly stable
  console.log('\n  Monthly positive-share (z-score subtracts a uniform offset — is the offset stable over time?):');
  const byMonth = new Map();
  for (const r of scored) { if (!r.ym) continue; if (!byMonth.has(r.ym)) byMonth.set(r.ym, []); byMonth.get(r.ym).push(r); }
  const months = [...byMonth.keys()].sort();
  for (const ym of months.slice(-12)) { const c = labelSplit(byMonth.get(ym)); const t = c.positive + c.negative + c.neutral + c.other;
    console.log(`    ${ym}  pos ${pct(c.positive, t).padStart(6)}  (n=${t})`); }

  // ── coverage (couples to G1) ──
  const cov1 = rows.filter((r) => r.tagged_v1).length;
  const cov2 = rows.filter((r) => r.tagged_v2).length;
  console.log('\n── Coverage (couples Exp20-B to G1 — a thin column is "untestable yet", not "null") ──');
  console.log(`  rows carrying nse_tickers (v1): ${cov1} (${pct(cov1, total)})  ·  nse_tickers_v2: ${cov2} (${pct(cov2, total)})`);
  console.log(`  tagged rows that also carry a numeric sentiment score: ${taggedScores.length}`);

  // ── verdict ──
  const oa = labelSplit(scored); const oat = oa.positive + oa.negative + oa.neutral + oa.other;
  const posShare = oa.positive / Math.max(1, oat);
  const disp = sd(taggedScores);
  console.log('\n=== Read (for the brief — NOT a re-centering claim) ===');
  console.log(`  • Bias confirmed: ${(posShare * 100).toFixed(1)}% of labelled rows are positive.`);
  console.log(`  • Tagged-score dispersion sd=${f4(disp)} → ${disp >= 0.2 ? 'ENOUGH spread for a per-day z-score to rank ⇒ G6 may be a NON-issue for the ensemble (run Part B on RAW scores).' : 'THIN spread ⇒ ordering may be degenerate; a re-ordering model (Part A2) is warranted.'}`);
  console.log(`  • Coverage gate: ${Math.max(cov1, cov2)} tagged rows (${pct(Math.max(cov1, cov2), total)}). ${Math.max(cov1, cov2) / total < 0.05 ? 'SPARSE — Exp20-B reads as untestable-yet until G1 widens tagging.' : 'workable.'}`);

  // persist a small machine-readable summary
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const summary = {
    generated: new Date().toISOString(), from: FROM, total, scored: scored.length,
    positive_share: posShare, overall_split: oa,
    per_model: Object.fromEntries([...byModel.entries()].map(([m, rs]) => [m, labelSplit(rs)])),
    tagged_v1: cov1, tagged_v2: cov2, tagged_scored: taggedScores.length,
    tagged_score: { n: taggedScores.length, mean: mean(taggedScores), sd: disp },
  };
  writeFileSync(join(OUTPUT_DIR, 'sentiment_calibration.json'), JSON.stringify(summary, null, 2));
  console.log(`\n  Wrote ${join(OUTPUT_DIR, 'sentiment_calibration.json')}`);
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
