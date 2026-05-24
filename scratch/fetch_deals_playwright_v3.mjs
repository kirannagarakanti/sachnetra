import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('Launching Google Chrome (headful)...');
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome',
    args: ['--disable-http2']
  });
  
  try {
    console.log('Creating browser context...');
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();

    // Abort tracking and heavy resources
    await page.route('**/*', (route) => {
      const request = route.request();
      const url = request.url();
      const type = request.resourceType();

      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        return route.abort();
      }

      const blockedDomains = [
        'google-analytics.com',
        'googletagmanager.com',
        'go-mpulse.net',
        'doubleclick.net',
        'akstat.io',
        'akamaihd.net',
        'youtube.com',
        'highcharts.com'
      ];

      if (blockedDomains.some(domain => url.includes(domain))) {
        return route.abort();
      }

      route.continue();
    });

    console.log('Navigating to Option Chain to establish session...');
    const warmUpUrl = 'https://www.nseindia.com/option-chain';
    const response = await page.goto(warmUpUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    console.log(`Option Chain loaded. HTTP Status: ${response?.status()}`);

    console.log('Waiting 10 seconds for session and cookies to settle...');
    await page.waitForTimeout(10000);

    const cookies = await context.cookies();
    console.log(`Cookies in browser context (${cookies.length}):`);
    for (const c of cookies) {
      console.log(`  - ${c.name}=${c.value.slice(0, 15)}...`);
    }

    const evaluateFetchWithTimeout = async (apiUrl, referer) => {
      console.log(`Evaluating fetch in browser for: ${apiUrl}`);
      const data = await page.evaluate(async ({ fetchUrl, ref }) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
        try {
          const resp = await fetch(fetchUrl, {
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Referer': ref
            },
            signal: controller.signal
          });
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
      }, { fetchUrl: apiUrl, ref: referer });
      return data;
    };

    const fromDate = '18-05-2026';
    const toDate = '22-05-2026';
    const dealsReferer = 'https://www.nseindia.com/report-detail/display-bulk-and-block-deals';

    // 1. Bulk Deals
    try {
      const bulkUrl = `https://www.nseindia.com/api/historical/bulk-deals?from=${fromDate}&to=${toDate}`;
      const data = await evaluateFetchWithTimeout(bulkUrl, dealsReferer);
      console.log(`[Bulk Deals] Successfully fetched. Data keys: ${Object.keys(data).join(', ')}`);
      
      const filePath = path.join('scratch', 'nse_bulk_deals_sample.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`[Bulk Deals] Saved sample to ${filePath}. Size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    } catch (err) {
      console.error('[Bulk Deals] Failed:', err.message);
    }

    // 2. Block Deals
    try {
      const blockUrl = `https://www.nseindia.com/api/historical/block-deals?from=${fromDate}&to=${toDate}`;
      const data = await evaluateFetchWithTimeout(blockUrl, dealsReferer);
      console.log(`[Block Deals] Successfully fetched. Data keys: ${Object.keys(data).join(', ')}`);
      
      const filePath = path.join('scratch', 'nse_block_deals_sample.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`[Block Deals] Saved sample to ${filePath}. Size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    } catch (err) {
      console.error('[Block Deals] Failed:', err.message);
    }

    // 3. Test historical backfill capabilities
    try {
      console.log('\n--- Testing Historical Backfill Range (01-04-2026 to 15-04-2026) ---');
      const histUrl = `https://www.nseindia.com/api/historical/bulk-deals?from=01-04-2026&to=15-04-2026`;
      const data = await evaluateFetchWithTimeout(histUrl, dealsReferer);
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
