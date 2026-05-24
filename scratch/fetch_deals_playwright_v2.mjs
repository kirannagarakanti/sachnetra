import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('Launching system Google Chrome (headful)...');
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

    // Abort unnecessary/heavy/tracking resources
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

    // We navigate to option-chain which is historically more responsive
    console.log('Navigating to NSE Option Chain page to warm up session...');
    const warmUpUrl = 'https://www.nseindia.com/option-chain';
    const response = await page.goto(warmUpUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`Page loaded. HTTP Status: ${response?.status()}`);

    console.log('Waiting 5 seconds for cookies/session to settle...');
    await page.waitForTimeout(5000);

    const evaluateFetch = async (apiUrl, referer) => {
      console.log(`Evaluating fetch in browser for: ${apiUrl}`);
      const data = await page.evaluate(async ({ fetchUrl, ref }) => {
        const resp = await fetch(fetchUrl, {
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'Referer': ref
          }
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`HTTP ${resp.status}: ${text.slice(0, 100)}`);
        }
        return resp.json();
      }, { fetchUrl: apiUrl, ref: referer });
      return data;
    };

    const fromDate = '18-05-2026';
    const toDate = '22-05-2026';
    const dealsReferer = 'https://www.nseindia.com/report-detail/display-bulk-and-block-deals';

    // 1. Bulk Deals
    try {
      const bulkUrl = `https://www.nseindia.com/api/historical/bulk-deals?from=${fromDate}&to=${toDate}`;
      const data = await evaluateFetch(bulkUrl, dealsReferer);
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
      const data = await evaluateFetch(blockUrl, dealsReferer);
      console.log(`Successfully fetched block deals. Data keys: ${Object.keys(data).join(', ')}`);
      
      const filePath = path.join('scratch', 'nse_block_deals_sample.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Saved block deals to ${filePath}. Size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    } catch (err) {
      console.error('Failed to fetch block deals:', err.message);
    }

    // 3. Test backfill capabilities (larger range: 01-04-2026 to 15-04-2026)
    try {
      console.log('\n--- Testing Historical Backfill Range (01-04-2026 to 15-04-2026) ---');
      const histUrl = `https://www.nseindia.com/api/historical/bulk-deals?from=01-04-2026&to=15-04-2026`;
      const data = await evaluateFetch(histUrl, dealsReferer);
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
