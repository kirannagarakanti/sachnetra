// One-off: rule the 12 FP-prone single-ticker A/B/C groups.
// Default for these groups = EMPTY (tagger false positive). The 8 genuine company
// rows (by id) get SPECIFIC + the correct ticker. Only these rows are rewritten.
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

// The FP-prone groups whose DEFAULT verdict is EMPTY (tagger false positive).
const FP_GROUPS = new Set([
  'MPSLTD', 'NH', 'SKIPPER', 'SONAMLTD', 'CHOICEIN', 'DEEPINDS',
  'COASTCORP', 'COALINDIA', 'NDTV', 'RISHABH', 'YATRA', 'LT',
]);

// The genuine company rows inside those groups: id -> correct ticker (SPECIFIC).
const REAL = {
  '7124140a': 'RISHABH',  // Rishabh Instruments net profit rises 212%
  '766cb828': 'YATRA',    // Yatra Q4 Profit Tanks 46%
  '60b210b8': 'LT',       // L&T betting big on digital workers
  'e4001e11': 'LT',       // L&T, Exail forge strategic pact
  'b6e07f38': 'LT',       // PM Modi visits L&T's Hazira facility
  '96dfee70': 'LT',       // Larsen & Toubro inks MoU
  'fbbfa741': 'LT',       // L&T EduTech EV centre
  'bdedaba4': 'LT',       // L&T signs Rs 18,600-crore pact
};

const raw = readFileSync(PATH, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);

let fp = 0, real = 0;
const out = lines.map((line, idx) => {
  if (idx === 0 || line === '') return line;
  const f = parseLine(line);
  if (!/^[ABC]_/.test(f[3])) return line;      // A/B/C strata only
  if (!FP_GROUPS.has(f[4])) return line;        // only the 12 focus groups
  if (f[6] !== '') return line;                 // don't overwrite an existing label
  const id8 = f[0].slice(0, 8);
  if (REAL[id8]) { f[6] = 'SPECIFIC'; f[7] = REAL[id8]; real++; }
  else { f[6] = 'EMPTY'; f[7] = ''; fp++; }     // ticker_label blank = tagger FP
  return f.map(serField).join(',');
});

writeFileSync(PATH, out.join(eol), 'utf8');
console.log(`Focus groups ruled — EMPTY (FP): ${fp}, SPECIFIC (real): ${real}, total: ${fp + real}`);
