import { writeFileSync } from 'node:fs';
import { CHROME_UA } from '../scripts/_seed-utils.mjs';

const URL = 'https://niftyindices.com/IndexConstituent/ind_niftysmallcap250list.csv';

// Quote-aware single-line CSV field split
function splitCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else { inQ = !inQ; }
    } else if (c === ',' && !inQ) {
      fields.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  fields.push(cur);
  return fields.map((f) => f.trim());
}

async function main() {
  console.log(`Fetching Smallcap 250 constituents from ${URL}...`);
  const resp = await fetch(URL, {
    headers: { 'User-Agent': CHROME_UA, Accept: 'text/csv,*/*' },
    signal: AbortSignal.timeout(20_000),
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} - failed to fetch constituents CSV`);
  }

  const text = await resp.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error('NSE CSV looks empty');

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const symIdx = header.findIndex((h) => h === 'symbol');
  if (symIdx < 0) throw new Error(`NSE CSV has no Symbol column (header: ${header.join('|')})`);

  console.log(`Found symbol column at index ${symIdx}`);
  const symbols = lines.slice(1)
    .map((l) => {
      const parts = splitCsvLine(l);
      return parts[symIdx];
    })
    .filter(Boolean)
    .map(s => {
      const sym = s.trim().toUpperCase();
      if (!sym) return null;
      if (sym.startsWith('^') || sym.endsWith('.NS') || sym.endsWith('.BO')) return sym;
      return `${sym}.NS`;
    })
    .filter(Boolean);

  const uniqueSymbols = [...new Set(symbols)];
  uniqueSymbols.sort();

  console.log(`Total rows in CSV: ${lines.length - 1}`);
  console.log(`Parsed symbols: ${symbols.length}`);
  console.log(`Unique symbols count: ${uniqueSymbols.length}`);

  if (uniqueSymbols.length !== 250) {
    console.error(`WARNING: Expected exactly 250 symbols, but got ${uniqueSymbols.length}`);
  }

  // Write to shared/nifty-smallcap250.json
  const outPath = 'shared/nifty-smallcap250.json';
  writeFileSync(outPath, JSON.stringify(uniqueSymbols, null, 2), 'utf8');
  console.log(`Successfully wrote ${uniqueSymbols.length} symbols to ${outPath}`);
}

main().catch(err => {
  console.error("Failed:", err);
});
