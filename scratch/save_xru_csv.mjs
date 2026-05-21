import { CHROME_UA } from '../scripts/_seed-utils.mjs';
import * as fs from 'node:fs';

async function main() {
  const url = 'https://stats.bis.org/api/v1/data/WS_XRU/M.IN.INR?detail=dataonly&format=csv';
  console.log(`Fetching USD/INR rates from ${url}...`);
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': CHROME_UA,
        'Accept': 'text/csv'
      }
    });
    if (resp.status === 200) {
      const csvText = await resp.text();
      fs.writeFileSync('scratch/bis_ws_xru_india.csv', csvText, 'utf8');
      console.log('Saved USD/INR exchange rates to scratch/bis_ws_xru_india.csv');
    } else {
      console.error(`HTTP ${resp.status}`);
    }
  } catch (err) {
    console.error(err);
  }
}

main();
