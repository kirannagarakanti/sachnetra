// Batch 3: long-tail collision audit. Real-name groups → SPECIFIC; the 6 newly-
// dropped FP tickers + stale-snapshot SOLARINDS → EMPTY.
import { readFileSync, writeFileSync } from 'node:fs';
const PATH = 'scripts/research/output/goldset/goldset_sample.csv';
function parseLine(line) {
  const out = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c; }
    else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur); return out;
}
const serField = (f) => /[",\r\n]/.test(f) ? `"${f.replace(/"/g, '""')}"` : f;

const GROUP_SPECIFIC = new Set(['OIL', 'PWL', 'MANINDS']);
const GROUP_EMPTY = new Map([
  ['MITTAL', 'surname "Mittal" — dropped'], ['LAL', 'surname/place "Lal" — dropped'],
  ['APEX', 'common word "Apex" — dropped'], ['SPECIALITY', 'common word — dropped'],
  ['AAKASH', 'Aakash Chopra (cricket) — dropped'], ['AMDIND', 'AMD = US chipmaker — dropped'],
  ['SOLARINDS', 'solar-sector news; live tagger already clean (stale snapshot)'],
]);

const raw = readFileSync(PATH, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
let spec = 0, empty = 0;
const out = raw.split(/\r?\n/).map((line, idx) => {
  if (idx === 0 || line === '') return line;
  const f = parseLine(line);
  if (!/^[ABC]_/.test(f[3]) || f[6] !== '') return line;
  if (GROUP_SPECIFIC.has(f[4])) { f[6] = 'SPECIFIC'; f[7] = f[4]; spec++; return f.map(serField).join(','); }
  if (GROUP_EMPTY.has(f[4])) { f[6] = 'EMPTY'; f[7] = ''; if (f[9] === '') f[9] = GROUP_EMPTY.get(f[4]); empty++; return f.map(serField).join(','); }
  return line;
});
writeFileSync(PATH, out.join(eol), 'utf8');
console.log(`Batch 3 — SPECIFIC: ${spec}, EMPTY: ${empty}, total: ${spec + empty}`);
