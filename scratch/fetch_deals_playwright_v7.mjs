import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('Launching Google Chrome (headful, disable-http2)...');
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome',
    args: ['--disable-http2']
  });
  
  try {
    console.log('Creating browser context...');
    const context = await browser.newContext({
      userAgent: CHROME_UA,
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();

    // Do NOT block resources so Akamai challenges can resolve fully.
    // Only block images to save bandwidth, but keep scripts and stylesheets.
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (type === 'image') {
        return route.abort();
      }
      route.continue();
    });

    console.log('1. Navigating to NSE homepage...');
    const rootResp = await page.goto('https://www.nseindia.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`NSE Homepage status: ${rootResp?.status()}`);

    console.log('2. Navigating to NSE bulk/block deals report page...');
    const reportResp = await page.goto('https://www.nseindia.com/report-detail/display-bulk-and-block-deals', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`NSE Report Page status: ${reportResp?.status()}`);

    console.log('Waiting 10s for cookies and Akamai challenge to settle...');
    await page.waitForTimeout(10000);

    const cookies = await context.cookies();
    console.log(`Cookies in browser context (${cookies.length}):`);
    for (const c of cookies) {
      console.log(`  - ${c.name}=${c.value.slice(0, 15)}...`);
    }

    const evaluateFetchSimpleWithTimeout = async (apiUrl) => {
      console.log(`Evaluating fetch in browser for: ${apiUrl}`);
      const data = await page.evaluate(async (fetchUrl) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        try {
          const resp = await fetch(fetchUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`HTTP ${resp.status}: ${text.slice(0, 100)}`);
          }
          return await resp.json();
        } catch (err) {
          clearTimeout(timeoutId);
          throw new Error(err.message || String(err));
        }
      }, apiUrl);
      return data;
    };

    const fromDate = '18-05-2026';
    const toDate = '22-05-2026';

    // 1. Bulk Deals
    try {
      const bulkUrl = `https://www.nseindia.com/api/historical/bulk-deals?from=${fromDate}&to=${toDate}`;
      const data = await evaluateFetchSimpleWithTimeout(bulkUrl);
      console.log(`[Bulk Deals] Successfully fetched. Top-level keys: ${Object.keys(data).join(', ')}`);
      
      const filePath = path.join('scratch', 'nse_bulk_deals_sample.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`[Bulk Deals] Saved sample to ${filePath}. Size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    } catch (err) {
      console.error('[Bulk Deals] Failed:', err.message);
    }

    // 2. Block Deals
    try {
      const blockUrl = `https://www.nseindia.com/api/historical/block-deals?from=${fromDate}&to=${toDate}`;
      const data = await evaluateFetchSimpleWithTimeout(blockUrl);
      console.log(`[Block Deals] Successfully fetched. Top-level keys: ${Object.keys(data).join(', ')}`);
      
      const filePath = path.join('scratch', 'nse_block_deals_sample.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`[Block Deals] Saved sample to ${filePath}. Size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    } catch (err) {
      console.error('[Block Deals] Failed:', err.message);
    }

    // 3. History backfill range check (01-04-2026 to 15-04-2026)
    try {
      console.log('\n--- Testing Historical Backfill Range (01-04-2026 to 15-04-2026) ---');
      const histUrl = `https://www.nseindia.com/api/historical/bulk-deals?from=01-04-2026&to=15-04-2026`;
      const data = await evaluateFetchSimpleWithTimeout(histUrl);
      const list = Array.isArray(data) ? data : (data.data || []);
      console.log(`[History Probe] Success. Rows count: ${list.length}`);
      if (list.length > 0) {
        console.log(`[History Probe] First row: ${JSON.stringify(list[0])}`);
      }
    } catch (err) {
      console.error('[History Probe] Failed:', err.message);
    }

  } catch (err) {
    console.error('Error occurred in Playwright Chrome script:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
