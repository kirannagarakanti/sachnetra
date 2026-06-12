#!/usr/bin/env node
//
// P1d scorer (READ-ONLY; local files only).
// Pre-registration: research-notes/2026-06-12_p1d-specialist-quality-brief.md
//
// Joins the Flash records to their articles and does the MACHINE half of P1d:
//   (1) strict-JSON / schema validation  — itself a P1d signal (production C4 needs clean JSON)
//   (2) auto-flag candidate hallucinations (D) — numbers/years/Rs-amounts in the rationale absent from body
//   (3) distributions (event_type, stance sign, "none" rate, confidence)
//   (4) emit p1d_audit_worksheet.md — everything Lijo needs to assign each record a bucket A/B/C/D
//
// It does NOT assign buckets — that is Lijo's hand-grade (the gate). This only prepares + checks.
//
//   node scripts/research/p1d-score.mjs

import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join('scripts', 'research', 'output', 'p1d');
const sample = JSON.parse(fs.readFileSync(path.join(DIR, 'p1d_sample.json'), 'utf8'));
const records = JSON.parse(fs.readFileSync(path.join(DIR, 'p1d_records.json'), 'utf8'));

const EVENT_TYPES = ['results', 'order_win', 'mna', 'fundraise', 'rating', 'pledge', 'management_change', 'regulatory', 'guidance', 'legal', 'other', 'none'];
const MAGS = ['low', 'med', 'high'];
const byId = new Map(sample.map((a) => [a.id, a]));
const norm = (s) => (s || '').toLowerCase().replace(/[, ]/g, '');

// Candidate-hallucination heuristic: reduce every number in the rationale to its NUMERIC CORE (digits + dot,
// commas/%/Rs/₹/"per cent" stripped) and check the body's numeric core contains it. This avoids the
// "26%" vs "26 percent" / "Rs. 146.78" vs "146.78" false positives. Heuristic aid only — short cores (1-2
// digits) match loosely, so the human read is the arbiter; this just surfaces numbers worth eyeballing.
const numCore = (s) => ((s || '').replace(/,/g, '').match(/\d+\.?\d*/g) || []).map((n) => n.replace(/\.$/, ''));
const bodyDigits = (s) => (s || '').replace(/,/g, '');   // substring target: "1232.14%" contains "1232"
function rationaleClaims(rationale) {
  // keep only numbers that look "specific" (a decimal, or >=3 digits) — the kind a model would invent;
  // 1-2 digit integers and bare years are too promiscuous to flag.
  return [...new Set(numCore(rationale).filter((n) => /\./.test(n) || n.length >= 3))];
}

const issues = [];           // schema problems
const flagsD = [];           // candidate hallucinations
let noneCount = 0;
const evtDist = {}, signDist = { pos: 0, neg: 0, zero: 0 };

for (const r of records) {
  const a = byId.get(r.id);
  const tag = `[${r.id}]`;
  if (!a) { issues.push(`${tag} no matching article`); continue; }

  // ---- schema validation ----
  for (const f of ['primary_entity', 'event_type', 'stance', 'magnitude', 'novelty', 'surprise', 'confidence', 'rationale', 'model_id']) {
    if (r[f] === undefined || r[f] === null || r[f] === '') issues.push(`${tag} missing/empty ${f}`);
  }
  if (!EVENT_TYPES.includes(r.event_type)) issues.push(`${tag} bad event_type "${r.event_type}"`);
  if (!MAGS.includes(r.magnitude)) issues.push(`${tag} bad magnitude "${r.magnitude}"`);
  for (const [f, lo, hi] of [['stance', -1, 1], ['novelty', 0, 1], ['surprise', 0, 1], ['confidence', 0, 1]]) {
    if (typeof r[f] !== 'number' || r[f] < lo || r[f] > hi) issues.push(`${tag} ${f} out of [${lo},${hi}]: ${r[f]}`);
  }
  if (!Array.isArray(r.factor_touches)) issues.push(`${tag} factor_touches not array`);

  // ---- distributions ----
  if (r.event_type === 'none' || norm(r.primary_entity) === 'none') noneCount++;
  evtDist[r.event_type] = (evtDist[r.event_type] || 0) + 1;
  signDist[r.stance > 0.05 ? 'pos' : r.stance < -0.05 ? 'neg' : 'zero']++;

  // ---- candidate-D auto-flag ----
  const bd = bodyDigits(a.body);
  const missing = rationaleClaims(r.rationale).filter((c) => !bd.includes(c));
  if (missing.length) flagsD.push(`${tag} rationale cites not-in-body: ${missing.join(', ')}  | "${r.rationale}"`);
}

// ---- worksheet for Lijo's hand-grade ----
let ws = `# P1d audit worksheet — assign each record a bucket (A clean / B minor / C wrong-call / D hallucination)\n\n` +
  `Brief: ../../../ai_docs/learning/research-notes/2026-06-12_p1d-specialist-quality-brief.md §5.\n` +
  `Model: gemini-3.5-flash (Antigravity, in-context batch). N=${records.length}.\n\n---\n\n`;
for (const r of records) {
  const a = byId.get(r.id) || {};
  const dflag = flagsD.find((f) => f.startsWith(`[${r.id}]`)) ? '  ⚠ possible-D (see auto-flags)' : '';
  ws += `## ${r.id} — ${a.source || '?'}${dflag}\n` +
    `**Headline:** ${a.headline || ''}\n\n` +
    `**Record:** entity=\`${r.primary_entity}\` · event=\`${r.event_type}\` · stance=${r.stance} · mag=${r.magnitude} · nov=${r.novelty} · sur=${r.surprise} · conf=${r.confidence} · factors=${JSON.stringify(r.factor_touches)}\n\n` +
    `**Rationale:** ${r.rationale}\n\n` +
    `**Body (${a.body_words}w):** ${a.body || ''}\n\n` +
    `**BUCKET: ____**  _(notes: )_\n\n---\n\n`;
}
fs.writeFileSync(path.join(DIR, 'p1d_audit_worksheet.md'), ws);

// ---- console summary ----
console.log(`=== P1d machine checks (N=${records.length}) ===\n`);
console.log(`Schema/strict-JSON: ${issues.length ? `${issues.length} ISSUES` : 'CLEAN — all 30 valid, all fields present, enums + ranges ok'}`);
for (const i of issues) console.log('  - ' + i);
console.log(`\n"none" (no listed company / macro): ${noneCount}/${records.length}`);
console.log('event_type dist:', JSON.stringify(evtDist));
console.log('stance sign dist:', JSON.stringify(signDist));
console.log(`\nCandidate-D auto-flags (rationale numbers not found verbatim in body): ${flagsD.length}`);
for (const f of flagsD) console.log('  - ' + f);
console.log(`\nwrote ${path.join(DIR, 'p1d_audit_worksheet.md')} — Lijo assigns A/B/C/D per record; then re-run nothing, just tally.`);
console.log('Pre-registered gate (brief §3): PASS if (A+B)>=80% AND D<=5% AND no >2/3 one-sided stance errors.');
