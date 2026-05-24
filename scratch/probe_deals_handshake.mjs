import fs from 'fs';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithHandshake(warmUpUrl) {
  console.log(`[Handshake] Fetching ${warmUpUrl} to warm up cookies...`);
  const sessionResp = await fetch(warmUpUrl, {
    headers: {
      'User-Agent': CHROME_UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  console.log(`[Handshake] Status: ${sessionResp.status} ${sessionResp.statusText}`);
  const setCookieHeader = sessionResp.headers.getSetCookie?.() ?? [];
  const cookieString = setCookieHeader
    .map(c => c.split(';')[0].trim())
    .join('; ');

  console.log(`[Handshake] Captured cookies: "${cookieString.slice(0, 150)}..."`);
  return cookieString;
}

async function fetchJson(url, cookies, referer) {
  console.log(`[Fetch] GET ${url}`);
  const resp = await fetch(url, {
    headers: {
      'User-Agent': CHROME_UA,
      'Referer': referer,
      'Cookie': cookies,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  console.log(`[Fetch] Status: ${resp.status}`);
  if (!resp.ok) {
    const body = await resp.text();
    console.log(`[Fetch] Body starts with: ${body.slice(0, 300)}`);
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }
  return await resp.json();
}

async function run() {
  // Test warm up URL: option-chain page vs report page vs homepage
  const warmUpUrls = [
    'https://www.nseindia.com/option-chain',
    'https://www.nseindia.com/report-detail/display-bulk-and-block-deals',
    'https://www.nseindia.com/'
  ];

  const referer = 'https://www.nseindia.com/report-detail/display-bulk-and-block-deals';
  const bulkDealsUrl = 'https://www.nseindia.com/api/historical/bulk-deals?from=18-05-2026&to=22-05-2026';

  for (const warmUpUrl of warmUpUrls) {
    console.log(`\n=== Testing Warm-up URL: ${warmUpUrl} ===`);
    try {
      const cookies = await fetchWithHandshake(warmUpUrl);
      await delay(1000);
      const data = await fetchJson(bulkDealsUrl, cookies, referer);
      console.log(`[Success] Fetched bulk deals! Data keys: ${Object.keys(data).join(', ')}`);
      if (data.data) {
        console.log(`[Success] Rows count: ${data.data.length}`);
        fs.writeFileSync('scratch/nse_bulk_deals_sample.json', JSON.stringify(data, null, 2));
        break; // Found working one
      } else if (Array.isArray(data)) {
        console.log(`[Success] Rows count (array): ${data.length}`);
        fs.writeFileSync('scratch/nse_bulk_deals_sample.json', JSON.stringify(data, null, 2));
        break;
      }
    } catch (err) {
      console.error(`Failed with warm-up ${warmUpUrl}:`, err.message);
    }
    await delay(2000);
  }
}

run();
