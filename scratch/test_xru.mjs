import { CHROME_UA } from '../scripts/_seed-utils.mjs';

async function testFetchKey(key) {
  const url = `https://stats.bis.org/api/v1/data/WS_XRU/${key}?detail=dataonly&format=csv`;
  console.log(`Fetching: ${url}`);
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': CHROME_UA,
        'Accept': 'text/csv'
      }
    });
    console.log(`  Status: ${resp.status}`);
    if (resp.status === 200) {
      const text = await resp.text();
      console.log(`  Length: ${text.length} chars`);
      const lines = text.split('\n').filter(Boolean);
      console.log(`  Lines: ${lines.length}`);
      if (lines.length > 1) {
        console.log(`  Headers: ${lines[0]}`);
        console.log(`  Line 1: ${lines[1]}`);
        console.log(`  Line L: ${lines[lines.length - 1]}`);
      }
    }
  } catch (err) {
    console.error(`  Error: ${err.message}`);
  }
}

async function main() {
  const keys = [
    'M.IN.INR.A',
    'M.IN.INR.E',
    'D.IN.INR.A',
    'D.IN.INR.E',
    'A.IN.INR.A',
    'A.IN.INR.E',
    'M.IN.INR',
    'D.IN.INR',
  ];
  for (const k of keys) {
    await testFetchKey(k);
  }
}

main();
