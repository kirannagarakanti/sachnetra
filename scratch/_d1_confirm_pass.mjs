// One-off: confirm D1 gate labels in the gold set.
// Sets gate_label=EMPTY for every D1 row (where blank); adds clarifying notes on the
// company-nexus rows (foreign listco / unlisted / asset->parent recall gap).
// Only D1 lines are rewritten; all other lines pass through byte-for-byte.
import { readFileSync, writeFileSync } from 'node:fs';

const PATH = 'scripts/research/output/goldset/goldset_sample.csv';

// CSV parse/serialize for a single line (handles quoted fields with commas/quotes).
function parseLine(line) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
function serField(f) {
  return /[",\r\n]/.test(f) ? `"${f.replace(/"/g, '""')}"` : f;
}

// Human notes keyed by row id (asset->parent recall gap + foreign/unlisted clarifications).
const NOTES = {
  '0f2d5062-780f-4e95-8ef9-511a3eeffc85': 'asset_parent_recall_gap: Vizhinjam Port = ADANIPORTS (parent not named)',
  '02942646-e0e3-42e1-8769-f355b231808a': 'RINL/Vizag Steel = unlisted govt entity — EMPTY',
  '66220c09-3dca-4cbf-894a-2a28b7a3c800': 'foreign listco (global AstraZeneca != Indian ASTRAZEN) — EMPTY',
  '51b3a94e-1497-4a69-8fca-135a984c4b44': 'foreign listco (Microsoft, not NSE) — EMPTY',
  '41e2f876-357a-43ca-8d7b-1685ded75b55': 'foreign listco (Hanwha Aerospace, S.Korea) — EMPTY',
  '65a99cd1-2177-4dba-bc9d-769a27c34799': 'foreign listco (Alaska Airlines, US) — EMPTY',
};

const raw = readFileSync(PATH, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);

let confirmed = 0, noted = 0;
const outLines = lines.map((line, idx) => {
  if (idx === 0 || line === '') return line;          // header / trailing blank
  const f = parseLine(line);
  if (f[3] !== 'D1_untagged_random') return line;     // only D1 rows
  if (f[6] === '') { f[6] = 'EMPTY'; confirmed++; }    // gate_label
  if (NOTES[f[0]] && f[9] === '') { f[9] = NOTES[f[0]]; noted++; }  // notes
  return f.map(serField).join(',');
});

writeFileSync(PATH, outLines.join(eol), 'utf8');
console.log(`D1 gate_label set to EMPTY: ${confirmed} rows; notes added: ${noted} rows`);
