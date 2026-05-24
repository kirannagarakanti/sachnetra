import fs from 'fs';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchWithCookies(url, cookies = '', referer = 'https://www.nseindia.com/report-detail/display-bulk-and-block-deals') {
  console.log(`[Fetch] GET ${url}`);
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': CHROME_UA,
        'Referer': referer,
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': cookies,
      }
    });

    const status = resp.status;
    const contentType = resp.headers.get('content-type') || '';
    console.log(`[Response] Status: ${status}, Content-Type: ${contentType}`);

    let data = null;
    if (status === 200) {
      if (contentType.includes('application/json')) {
        data = await resp.json();
      } else {
        data = await resp.text();
      }
    } else {
      data = await resp.text();
    }
    return { status, contentType, data };
  } catch (error) {
    console.error(`[Error] Fetch failed for ${url}:`, error.message);
    return { status: 0, contentType: '', data: error.message };
  }
}

async function main() {
  console.log('--- NSE Bulk & Block Deals Probe ---');

  // 1. Warm-up session to get cookie
  const warmUpUrl = 'https://www.nseindia.com/';
  console.log(`[Warm-up] Fetching ${warmUpUrl} to establish session...`);
  let cookies = '';
  try {
    const sessionResp = await fetch(warmUpUrl, {
      headers: {
        'User-Agent': CHROME_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    // Retrieve cookies
    const setCookies = sessionResp.headers.getSetCookie?.() ?? [];
    if (setCookies.length > 0) {
      cookies = setCookies.map(c => c.split(';')[0]).join('; ');
      console.log(`[Warm-up] Session established successfully. Cookies count: ${setCookies.length}`);
    } else {
      const singleCookie = sessionResp.headers.get('set-cookie');
      if (singleCookie) {
        cookies = singleCookie.split(';')[0];
        console.log(`[Warm-up] Session established (single cookie header)`);
      } else {
        console.log('[Warm-up] No set-cookie headers found in response!');
      }
    }
  } catch (err) {
    console.error('[Warm-up] Failed:', err);
  }

  // If cookies is empty, we will try fetching a secondary page
  if (!cookies) {
    console.log('[Warm-up] Trying secondary warm-up via report-detail page...');
    try {
      const secondResp = await fetch('https://www.nseindia.com/report-detail/display-bulk-and-block-deals', {
        headers: { 'User-Agent': CHROME_UA }
      });
      const setCookies = secondResp.headers.getSetCookie?.() ?? [];
      cookies = setCookies.map(c => c.split(';')[0]).join('; ');
      console.log(`[Warm-up] Secondary warm-up completed. Cookies: ${cookies ? 'YES' : 'NO'}`);
    } catch (err) {
      console.error('[Warm-up] Secondary failed:', err);
    }
  }

  // 2. Query Bulk Deals endpoint
  // Dates: from=18-05-2026&to=22-05-2026 (Mon to Fri of current week)
  const fromDate = '18-05-2026';
  const toDate = '22-05-2026';
  
  const bulkDealsUrl = `https://www.nseindia.com/api/historical/bulk-deals?from=${fromDate}&to=${toDate}`;
  const bulkRes = await fetchWithCookies(bulkDealsUrl, cookies);

  if (bulkRes.status === 200) {
    console.log('[Bulk Deals] Success!');
    const isJson = typeof bulkRes.data === 'object' && bulkRes.data !== null;
    console.log(`[Bulk Deals] Type: ${isJson ? 'JSON' : 'Raw Text (not JSON)'}`);
    
    // Save to scratch/nse_bulk_deals_sample.json
    const outPath = 'scratch/nse_bulk_deals_sample.json';
    fs.writeFileSync(outPath, JSON.stringify(bulkRes.data, null, 2));
    console.log(`[Bulk Deals] Sample saved to ${outPath}`);

    if (isJson) {
      const dataKeys = Object.keys(bulkRes.data);
      console.log(`[Bulk Deals] Top-level keys:`, dataKeys);
      // Check if data is array or wrapped
      let list = [];
      if (Array.isArray(bulkRes.data)) {
        list = bulkRes.data;
        console.log(`[Bulk Deals] Top level is array of length: ${list.length}`);
      } else if (bulkRes.data.data && Array.isArray(bulkRes.data.data)) {
        list = bulkRes.data.data;
        console.log(`[Bulk Deals] Data key is array of length: ${list.length}`);
      } else {
        console.log(`[Bulk Deals] Unexpected shape, data is:`, JSON.stringify(bulkRes.data).slice(0, 200));
      }

      if (list.length > 0) {
        console.log('[Bulk Deals] Sample first item:');
        console.log(JSON.stringify(list[0], null, 2));
      }
    }
  } else {
    console.log(`[Bulk Deals] Fetch failed (HTTP ${bulkRes.status}). Content start: ${String(bulkRes.data).slice(0, 300)}`);
  }

  // 3. Query Block Deals endpoint
  const blockDealsUrl = `https://www.nseindia.com/api/historical/block-deals?from=${fromDate}&to=${toDate}`;
  const blockRes = await fetchWithCookies(blockDealsUrl, cookies);

  if (blockRes.status === 200) {
    console.log('[Block Deals] Success!');
    const isJson = typeof blockRes.data === 'object' && blockRes.data !== null;
    console.log(`[Block Deals] Type: ${isJson ? 'JSON' : 'Raw Text (not JSON)'}`);
    
    // Save to scratch/nse_block_deals_sample.json
    const outPath = 'scratch/nse_block_deals_sample.json';
    fs.writeFileSync(outPath, JSON.stringify(blockRes.data, null, 2));
    console.log(`[Block Deals] Sample saved to ${outPath}`);

    if (isJson) {
      const dataKeys = Object.keys(blockRes.data);
      console.log(`[Block Deals] Top-level keys:`, dataKeys);
      // Check if data is array or wrapped
      let list = [];
      if (Array.isArray(blockRes.data)) {
        list = blockRes.data;
        console.log(`[Block Deals] Top level is array of length: ${list.length}`);
      } else if (blockRes.data.data && Array.isArray(blockRes.data.data)) {
        list = blockRes.data.data;
        console.log(`[Block Deals] Data key is array of length: ${list.length}`);
      }

      if (list.length > 0) {
        console.log('[Block Deals] Sample first item:');
        console.log(JSON.stringify(list[0], null, 2));
      }
    }
  } else {
    console.log(`[Block Deals] Fetch failed (HTTP ${blockRes.status}). Content start: ${String(blockRes.data).slice(0, 300)}`);
  }

  // 4. Test larger history to see backfill support
  console.log('[History Probe] Testing a larger range: 01-01-2026 to 15-01-2026...');
  const historyUrl = `https://www.nseindia.com/api/historical/bulk-deals?from=01-01-2026&to=15-01-2026`;
  const histRes = await fetchWithCookies(historyUrl, cookies);
  if (histRes.status === 200 && typeof histRes.data === 'object' && histRes.data !== null) {
    let list = Array.isArray(histRes.data) ? histRes.data : (histRes.data.data || []);
    console.log(`[History Probe] Success! Returned ${list.length} rows for 01-01-2026 to 15-01-2026`);
  } else {
    console.log(`[History Probe] Failed or not JSON: status=${histRes.status}`);
  }
}

main();
