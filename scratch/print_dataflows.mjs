import { CHROME_UA } from '../scripts/_seed-utils.mjs';

async function main() {
  const url = 'https://stats.bis.org/api/v1/dataflow';
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': CHROME_UA,
        'Accept': 'application/vnd.sdmx.structure+json'
      }
    });
    const data = await resp.json();
    const dataflows = data?.data?.dataflows || [];
    console.log(`Found ${dataflows.length} dataflows:`);
    for (const df of dataflows) {
      const id = df.id;
      const name = df.name?.en || df.name;
      console.log(`${id}: ${name}`);
    }
  } catch (err) {
    console.error(err);
  }
}

main();
