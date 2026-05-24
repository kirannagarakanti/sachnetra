import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('Launching Chromium (headless, disable-http2)...');
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

    console.log('1. Navigating to NSE homepage...');
    try {
      await page.goto('https://www.nseindia.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log('NSE homepage load initiated.');
    } catch (err) {
      console.log('Homepage load warning:', err.message);
    }

    console.log('Waiting 5s...');
    await page.waitForTimeout(5000);

    console.log('2. Navigating to NSE option chain page...');
    try {
      await page.goto('https://www.nseindia.com/option-chain', { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log('Option chain page load initiated.');
    } catch (err) {
      console.log('Option chain load warning:', err.message);
    }

    console.log('Waiting 10s for cookies to stabilize...');
    await page.waitForTimeout(10000);

    const cookies = await context.cookies();
    console.log(`Cookies in browser context (${cookies.length}):`);
    let hasNsit = false;
    for (const c of cookies) {
      console.log(`  - ${c.name}=${c.value.slice(0, 20)}...`);
      if (c.name.toLowerCase() === 'nsit') {
        hasNsit = true;
      }
    }

    if (!hasNsit) {
      console.log('WARNING: nsit cookie not found. The API request might fail. Let\'s try loading the reports page to trigger it...');
      try {
        await page.goto('https://www.nseindia.com/report-detail/display-bulk-and-block-deals', { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log('Reports page load initiated.');
      } catch (err) {
        console.log('Reports page load warning:', err.message);
      }
      console.log('Waiting another 5s...');
      await page.waitForTimeout(5000);
      const cookies2 = await context.cookies();
      console.log(`Cookies after reports page (${cookies2.length}):`);
      for (const c of cookies2) {
        if (c.name.toLowerCase() === 'nsit') {
          hasNsit = true;
        }
      }
    }

    const evaluateFetchSimple = async (apiUrl) => {
      console.log(`Evaluating fetch in browser for: ${apiUrl}`);
      const data = await page.evaluate(async (fetchUrl) => {
        try {
          const resp = await fetch(fetchUrl);
          if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`HTTP ${resp.status}: ${text.slice(0, 100)}`);
          }
          return await resp.json();
        } catch (err) {
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
      const data = await evaluateFetchSimple(bulkUrl);
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
      const data = await evaluateFetchSimple(blockUrl);
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
      const data = await evaluateFetchSimple(histUrl);
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
