import { CHROME_UA } from '../scripts/_seed-utils.mjs';

async function main() {
  const url = 'https://stats.bis.org/api/v1/dataflow';
  console.log(`Fetching dataflow from ${url}...`);
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': CHROME_UA,
        'Accept': 'application/json, text/json, */*'
      }
    });
    console.log(`Status: ${resp.status}`);
    console.log(`Content-Type: ${resp.headers.get('content-type')}`);
    const text = await resp.text();
    console.log(`Length: ${text.length} chars`);
    
    // Try to parse as JSON first
    try {
      const data = JSON.parse(text);
      console.log('Successfully parsed as JSON!');
      const dataflows = data?.data?.dataflows || [];
      console.log(`Found ${dataflows.length} dataflows`);
      dataflows.forEach(df => {
        console.log(`- ${df.id}: ${df.name?.en || df.name}`);
      });
    } catch (e) {
      console.log('Failed to parse as JSON. First 500 chars of response:');
      console.log(text.slice(0, 500));
    }
  } catch (err) {
    console.error(err);
  }
}

main();
