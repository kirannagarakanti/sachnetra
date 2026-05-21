import { CHROME_UA } from '../scripts/_seed-utils.mjs';

async function testFetch(dataset, key = 'all') {
  const url = `https://stats.bis.org/api/v1/data/${dataset}/${key}?detail=dataonly&format=csv`;
  console.log(`Fetching: ${url}`);
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': CHROME_UA,
        'Accept': 'text/csv'
      }
    });
    console.log(`  Status: ${resp.status}`);
    const text = await resp.text();
    console.log(`  Length: ${text.length} chars`);
    if (resp.status === 200) {
      const lines = text.split('\n').filter(Boolean);
      console.log(`  Lines: ${lines.length}`);
      if (lines.length > 0) {
        console.log(`  Header: ${lines[0]}`);
        const indiaLines = lines.filter(l => l.includes(',IN,') || l.includes('"IN"') || l.includes(',IN') || l.includes('IN,'));
        console.log(`  India lines: ${indiaLines.length}`);
        if (indiaLines.length > 0) {
          console.log(`  Sample India line: ${indiaLines[0]}`);
        }
      }
    }
  } catch (err) {
    console.error(`  Error: ${err.message}`);
  }
}

async function main() {
  await testFetch('WS_CBPOL', 'M.IN');
  await testFetch('WS_EER', 'M.R.B.IN');
  await testFetch('WS_TC', 'Q.IN.C.A.M.770.A');
}

main();
