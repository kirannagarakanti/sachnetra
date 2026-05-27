import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

async function run() {
  console.log('Downloading Google 10k English words...');
  const res = await fetch('https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-usa-no-swears.txt');
  const wordsText = await res.text();
  const commonWords = new Set(wordsText.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length > 0));

  console.log('Loaded', commonWords.size, 'common English words.');

  const nseEquityMaster = JSON.parse(readFileSync(join(ROOT, 'shared', 'nse-equity-master.json'), 'utf8'));
  console.log('Loaded', nseEquityMaster.length, 'NSE equity entries.');

  const shortTickers = [];
  const candidates = [];

  for (const entry of nseEquityMaster) {
    const symbol = entry.ticker;
    const name = entry.name;
    const aliases = entry.aliases || [];

    const symbolLower = symbol.toLowerCase();
    const isShort = symbol.length <= 4;
    const symbolIsCommon = commonWords.has(symbolLower);

    // Let's check if any alias is a common word
    const commonWordAliases = [];
    for (const alias of aliases) {
      const aliasLower = alias.toLowerCase();
      if (commonWords.has(aliasLower) && alias.length > 2) {
        commonWordAliases.push(alias);
      }
    }

    if (isShort) {
      shortTickers.push({ symbol, name, symbolIsCommon, commonWordAliases });
    }

    if (symbolIsCommon || commonWordAliases.length > 0) {
      candidates.push({
        symbol,
        name,
        symbolIsCommon,
        commonWordAliases,
        aliases
      });
    }
  }

  console.log('Found', shortTickers.length, 'short tickers (<= 4 chars).');
  console.log('Found', candidates.length, 'tickers matching common words or with common-word aliases.');

  writeFileSync(join(__dirname, 'short_tickers_analysis.json'), JSON.stringify(shortTickers, null, 2));
  writeFileSync(join(__dirname, 'common_word_candidates.json'), JSON.stringify(candidates, null, 2));
  console.log('Saved intermediate analyses.');
}

run().catch(console.error);
