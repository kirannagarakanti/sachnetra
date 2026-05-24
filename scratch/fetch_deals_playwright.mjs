import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('Launching Chromium browser...');
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-http2']
  });
  
  try {
    console.log('Creating browser context...');
    const context = await browser.newContext({
      userAgent: CHROME_UA,
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();

    // Abort unnecessary resources
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        return route.abort();
      }
      route.continue();
    });

    console.log('Navigating to NSE Bulk and Block Deals display page...');
    const displayPageUrl = 'https://www.nseindia.com/report-detail/display-bulk-and-block-deals';
    const response = await page.goto(displayPageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log(`Page loaded. HTTP Status: ${response?.status()}`);

    console.log('Waiting 5 seconds for cookies/session to settle...');
    await page.waitForTimeout(5000);

    const cookies = await context.cookies();
    console.log('Cookies in browser context:');
    for (const c of cookies) {
      console.log(`  - ${c.name}=${c.value.slice(0, 20)}...`);
    }

    const evaluateFetch = async (apiUrl) => {
      console.log(`Evaluating fetch in browser for: ${apiUrl}`);
      const data = await page.evaluate(async (fetchUrl) => {
        const resp = await fetch(fetchUrl, {
          headers: {
            'Accept': 'application/json, text/plain, */*'
          }
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`HTTP ${resp.status}: ${text.slice(0, 100)}`);
        }
        return resp.json();
      }, apiUrl);
      return data;
    };

    const fromDate = '18-05-2026';
    const toDate = '22-05-2026';

    // 1. Bulk Deals
    try {
      const bulkUrl = `https://www.nseindia.com/api/historical/bulk-deals?from=${fromDate}&to=${toDate}`;
      const data = await evaluateFetch(bulkUrl);
      console.log(`Successfully fetched bulk deals. Data keys: ${Object.keys(data).join(', ')}`);
      
      const filePath = path.join('scratch', 'nse_bulk_deals_sample.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Saved bulk deals to ${filePath}. Size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    } catch (err) {
      console.error('Failed to fetch bulk deals:', err.message);
    }

    // 2. Block Deals
    try {
      const blockUrl = `https://www.nseindia.com/api/historical/block-deals?from=${fromDate}&to=${toDate}`;
      const data = await evaluateFetch(blockUrl);
      console.log(`Successfully fetched block deals. Data keys: ${Object.keys(data).join(', ')}`);
      
      const filePath = path.join('scratch', 'nse_block_deals_sample.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Saved block deals to ${filePath}. Size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    } catch (err) {
      console.error('Failed to fetch block deals:', err.message);
    }

    // 3. Test backfill capabilities (larger range: 01-04-2026 to 30-04-2026)
    try {
      console.log('\n--- Testing Historical Backfill Range (01-04-2026 to 15-04-2026) ---');
      const histUrl = `https://www.nseindia.com/api/historical/bulk-deals?from=01-04-2026&to=15-04-2026`;
      const data = await evaluateFetch(histUrl);
      const list = Array.isArray(data) ? data : (data.data || []);
      console.log(`Successfully fetched historical range. Rows count: ${list.length}`);
      if (list.length > 0) {
        console.log(`First row in history: ${JSON.stringify(list[0])}`);
      }
    } catch (err) {
      console.error('Failed to fetch historical deals:', err.message);
    }

  } catch (err) {
    console.error('Error occurred in Playwright script:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
