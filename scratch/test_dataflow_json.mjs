import { CHROME_UA } from '../scripts/_seed-utils.mjs';

async function tryAccept(acceptHeader) {
  const url = 'https://stats.bis.org/api/v1/dataflow';
  console.log(`Trying Accept: ${acceptHeader}`);
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': CHROME_UA,
        'Accept': acceptHeader
      }
    });
    console.log(`  Status: ${resp.status}`);
    console.log(`  Content-Type: ${resp.headers.get('content-type')}`);
    const text = await resp.text();
    console.log(`  Length: ${text.length} chars`);
    if (resp.headers.get('content-type')?.includes('json') || text.trim().startsWith('{')) {
      const data = JSON.parse(text);
      console.log('  Successfully parsed as JSON!');
      const dataflows = data?.data?.dataflows || [];
      console.log(`  Found ${dataflows.length} dataflows`);
      return data;
    }
  } catch (err) {
    console.error(`  Error: ${err.message}`);
  }
  return null;
}

async function main() {
  const headers = [
    'application/vnd.sdmx.structure+json;version=1.0',
    'application/vnd.sdmx.structure+json',
    'application/json'
  ];
  for (const h of headers) {
    const res = await tryAccept(h);
    if (res) break;
  }
}

main();
