// Batch 2: large-cap control groups + KOTAKBANK brokerage-attribution rulings.
// Only rewrites A/B/C rows with a blank gate_label in the named groups.
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

// Groups where every unlabelled row = SPECIFIC + that ticker (verified all-real).
const GROUP_SPECIFIC = new Set([
  'MARUTI', 'RELIANCE', 'INDIGO', 'RAJESHEXPO', 'WIPRO', 'BHARTIARTL', 'VEDL', 'TCS',
]);

// Per-id overrides (gate, ticker, note). KOTAKBANK is fully enumerated here
// (mixed group); plus the VEDL listicle exception.
const OVERRIDE = {
  // VEDL listicle
  '48fca007': { g: 'EMPTY', t: '', n: 'listicle "stocks in focus" — multi-name' },
  // KOTAKBANK — real bank-business news → SPECIFIC
  '87cb87a2': { g: 'SPECIFIC', t: 'KOTAKBANK', n: '' },   // RuPay credit card
  '8ebd1ccb': { g: 'SPECIFIC', t: 'KOTAKBANK', n: '' },   // vacancy at Kotak Mahindra Bank
  '2b7efa98': { g: 'SPECIFIC', t: 'KOTAKBANK', n: '' },   // ECLGS applications
  // KOTAKBANK — brokerage attribution / person / cricket / subsidiary / listicle → EMPTY
  'f06612cd': { g: 'EMPTY', t: '', n: 'Kotak MF analyst report — source not subject' },
  'caa2fc91': { g: 'EMPTY', t: '', n: 'Kotak analyst commentary — source not subject' },
  'ba75236b': { g: 'EMPTY', t: '', n: 'Kotak Alternate AMC (subsidiary), not the bank' },
  'afb77f41': { g: 'EMPTY', t: '', n: 'Uday Kotak (person) macro warning' },
  'c3fb2896': { g: 'EMPTY', t: '', n: 'listicle "stocks to buy"' },
  '8ddeaf24': { g: 'EMPTY', t: '', n: 'Kotak analyst commentary — source not subject' },
  '40f0987b': { g: 'EMPTY', t: '', n: 'Sitanshu Kotak (cricket coach)' },
  '36d136d4': { g: 'EMPTY', t: '', n: 'Kotak analyst commentary — source not subject' },
};

const raw = readFileSync(PATH, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);

let spec = 0, empty = 0;
const out = lines.map((line, idx) => {
  if (idx === 0 || line === '') return line;
  const f = parseLine(line);
  if (!/^[ABC]_/.test(f[3])) return line;
  if (f[6] !== '') return line;               // never overwrite an existing label
  const id8 = f[0].slice(0, 8);
  const ov = OVERRIDE[id8];
  if (ov) {
    f[6] = ov.g; f[7] = ov.t; if (ov.n && f[9] === '') f[9] = ov.n;
    ov.g === 'SPECIFIC' ? spec++ : empty++;
    return f.map(serField).join(',');
  }
  if (GROUP_SPECIFIC.has(f[4]) && f[4] !== 'KOTAKBANK') {
    f[6] = 'SPECIFIC'; f[7] = f[4]; spec++;
    return f.map(serField).join(',');
  }
  return line;
});

writeFileSync(PATH, out.join(eol), 'utf8');
console.log(`Batch 2 — SPECIFIC: ${spec}, EMPTY: ${empty}, total: ${spec + empty}`);
