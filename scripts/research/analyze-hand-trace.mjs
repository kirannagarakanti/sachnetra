#!/usr/bin/env node
//
// ANALYZE HAND-TRACE — computes the pre-registered separation result from the collected data.
// F1/F3/F4/F6 = auto-scored from our filings (build-hand-trace-scoring.mjs, window [T0-18m, T0-6m]).
// F2 = promoter pledge, hand-collected from Trendlyne (ai_docs/holdings/, ~T0-12m). F2 fires if >50% OR rising>10pp.
// Composite = F1+F2+F3+F4+F6. No DB. Pure computation — reproducible.
//
// Dropped from primary (degenerate shells — death predates our 2024+ window): RHFL, XLENERGY.
// Not included (controls not clipped / degenerate-check pending): AGSTRA, FSC, BILVYAPAR.

// pair: [caseSym, caseF1346, casePledgeFires, ctrlSym, ctrlF1346, ctrlPledgeFires]  (pledge note in comment)
const PAIRS = [
  ['SIGIND', 0, 0, 'APOLLOPIPE', 1, 0],   // case ~0 pledge (72% holding unpledged) ; ctrl ~0
  ['GENSOL', 2, 1, 'KPIGREEN', 0, 0],     // case 78% rising ; ctrl 45% flat
  ['PREMIER', 0, 0, 'GREAVESCOT', 0, 0],  // both ~0
  ['MARSHALL', 2, 0, 'MACPOWER', 1, 0],   // case ~0 (promoters increased) ; ctrl ~0
  ['SABEVENTS', 2, 1, 'NAZARA', 1, 1],    // case 55% ; ctrl 56% (both fire — control is a poor match)
  ['GOENKA', 1, 0, 'GOLDIAM', 0, 0],      // both ~0
  ['SANCO', 1, 0, 'CORDSCABLE', 1, 0],    // both ~0
  ['VIVIMEDLAB', 1, 0, 'KOPRAN', 0, 0],   // case 15% ; ctrl ~0
  ['WINSOME', 2, 1, 'NITINSPIN', 1, 0],   // case 95% ; ctrl ~0  (⚠ Winsome arc may be old NPA shell)
  ['PARSVNATH', 2, 0, 'ASHIANA', 0, 0],   // case 31% (no fire) ; ctrl ~0
  ['OSIAHYPER', 1, 0, 'V2RETAIL', 0, 0],  // both ~0
  ['AKSHOPTFBR', 1, 0, 'VINDHYATEL', 1, 0], // both ~0
  ['ASTRON', 2, 0, 'SESHAPAPER', 2, 0],   // both ~0
];

const PASS = 0.65, KILL = 0.55; // pre-registration §5.1

function tally(scoreFn, label) {
  let w = 0, t = 0, l = 0;
  const rows = [];
  for (const [cs, cf, cp, ks, kf, kp] of PAIRS) {
    const c = scoreFn(cf, cp), k = scoreFn(kf, kp);
    const r = c > k ? 'W' : c === k ? 'T' : 'L';
    if (r === 'W') w++; else if (r === 'T') t++; else l++;
    rows.push(`  ${cs.padEnd(12)} ${String(c).padStart(2)}  vs  ${ks.padEnd(12)} ${String(k).padStart(2)}   ${r}`);
  }
  const n = PAIRS.length;
  const strict = w / n, nonStrict = (w + t) / n;
  console.log(`\n=== ${label} ===`);
  rows.forEach((x) => console.log(x));
  console.log(`  ─────`);
  console.log(`  W ${w} · T ${t} · L ${l}  (n=${n})`);
  console.log(`  strict separation (case > control): ${(strict * 100).toFixed(1)}%   [pre-reg PASS ≥65% · KILL <55%]`);
  console.log(`  non-strict (case ≥ control):        ${(nonStrict * 100).toFixed(1)}%`);
  const verdict = strict >= PASS ? '✅ PASS' : strict < KILL ? '❌ KILL' : '🟡 INCONCLUSIVE (underpowered / borderline)';
  console.log(`  → ${label}: ${verdict}`);
  return strict;
}

console.log('HAND-TRACE ANALYSIS — governance blow-up early-warning (13 fully-clipped primary pairs)');
const composite = tally((f, p) => f + p, 'COMPOSITE (F1+F2+F3+F4+F6)');
const pledgeOnly = tally((f, p) => p, 'DUMB-BENCHMARK (pledge / F2 alone)');

console.log(`\n=== READOUT ===`);
console.log(`  Composite strict separation: ${(composite * 100).toFixed(1)}%  vs  pledge-alone: ${(pledgeOnly * 100).toFixed(1)}%`);
console.log(`  → The composite BEATS pledge-alone (good — multi-factor adds real signal), but lands in the`);
console.log(`    INCONCLUSIVE band: directionally right (12/13 cases ≥ control, only 1 loss) yet ties keep it`);
console.log(`    under the 65% strict bar. The ties are low-count pairs (0-1 flags) → feature SPARSITY (regex on`);
console.log(`    headlines is too coarse) is the binding constraint, not the thesis. F5(RPT) + LLM/body-text`);
console.log(`    extraction would likely break ties. Also fragile to the 2-3 questionable-arc cases (Winsome/SABEvents).`);
