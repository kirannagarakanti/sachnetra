import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchFromNSE(page, optionType, fromDate, toDate) {
  const url = `/api/historicalOR/bulk-block-short-deals?optionType=${optionType}&from=${fromDate}&to=${toDate}`;
  console.log(`Fetching in page context: ${url}`);
  try {
    const result = await page.evaluate(async (fetchUrl) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      try {
        const resp = await fetch(fetchUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!resp.ok) {
          return { error: `HTTP ${resp.status}: ${await resp.text()}` };
        }
        const data = await resp.json();
        return { data };
      } catch (err) {
        clearTimeout(timeoutId);
        return { error: err.message };
      }
    }, url);
    return result;
  } catch (err) {
    console.error(`Page evaluate error for ${optionType}:`, err.message);
    return { error: err.message };
  }
}

async function main() {
  console.log('Launching Chromium in HEADLESS mode...');
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

    // Block only images
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

    console.log('Waiting 5s...');
    await page.waitForTimeout(5000);

    console.log('2. Navigating to NSE bulk/block deals report page...');
    const reportResp = await page.goto('https://www.nseindia.com/report-detail/display-bulk-and-block-deals', { waitUntil: 'load', timeout: 45000 });
    console.log(`NSE Report Page status: ${reportResp?.status()}`);

    console.log('Waiting 10s on report page for cookies to stabilize...');
    await page.waitForTimeout(10000);

    // Fetch Bulk Deals (current range)
    // Let's use 15-05-2026 to 22-05-2026
    const bulkRes = await fetchFromNSE(page, 'bulk_deals', '15-05-2026', '22-05-2026');
    if (bulkRes.data) {
      const filePath = path.join('scratch', 'nse_bulk_deals_sample.json');
      fs.writeFileSync(filePath, JSON.stringify(bulkRes.data, null, 2));
      console.log(`Saved Bulk Deals to ${filePath} (${bulkRes.data.data?.length || 0} rows)`);
    } else {
      console.log(`Failed to fetch Bulk Deals:`, bulkRes.error);
    }

    // Fetch Block Deals (current range)
    const blockRes = await fetchFromNSE(page, 'block_deals', '15-05-2026', '22-05-2026');
    if (blockRes.data) {
      const filePath = path.join('scratch', 'nse_block_deals_sample.json');
      fs.writeFileSync(filePath, JSON.stringify(blockRes.data, null, 2));
      console.log(`Saved Block Deals to ${filePath} (${blockRes.data.data?.length || 0} rows)`);
    } else {
      console.log(`Failed to fetch Block Deals:`, blockRes.error);
    }

    // Fetch Short Selling (current range)
    const shortRes = await fetchFromNSE(page, 'short_selling', '15-05-2026', '22-05-2026');
    if (shortRes.data) {
      const filePath = path.join('scratch', 'nse_short_selling_sample.json');
      fs.writeFileSync(filePath, JSON.stringify(shortRes.data, null, 2));
      console.log(`Saved Short Selling to ${filePath} (${shortRes.data.data?.length || 0} rows)`);
    } else {
      console.log(`Failed to fetch Short Selling:`, shortRes.error);
    }

    // Test history depth (backfill depth): try a 30-day range in the past
    console.log('Testing backfill history depth (April 2026)...');
    const histBulk = await fetchFromNSE(page, 'bulk_deals', '01-04-2026', '30-04-2026');
    if (histBulk.data) {
      const filePath = path.join('scratch', 'nse_bulk_deals_history_april2026.json');
      fs.writeFileSync(filePath, JSON.stringify(histBulk.data, null, 2));
      console.log(`Saved Historical Bulk Deals (April 2026) to ${filePath} (${histBulk.data.data?.length || 0} rows)`);
    } else {
      console.log(`Failed to fetch historical Bulk Deals (April 2026):`, histBulk.error);
    }

    // Try a longer range or further back (e.g. a year ago, say 01-05-2025 to 30-05-2025)
    console.log('Testing deeper history depth (May 2025)...');
    const histBulkYearAgo = await fetchFromNSE(page, 'bulk_deals', '01-05-2025', '30-05-2025');
    if (histBulkYearAgo.data) {
      const filePath = path.join('scratch', 'nse_bulk_deals_history_may2025.json');
      fs.writeFileSync(filePath, JSON.stringify(histBulkYearAgo.data, null, 2));
      console.log(`Saved Historical Bulk Deals (May 2025) to ${filePath} (${histBulkYearAgo.data.data?.length || 0} rows)`);
    } else {
      console.log(`Failed to fetch historical Bulk Deals (May 2025):`, histBulkYearAgo.error);
    }

    // Try a range with a weekend (e.g. 17-05-2026 is Sunday)
    console.log('Testing holiday/weekend behaviour...');
    const weekendDeals = await fetchFromNSE(page, 'bulk_deals', '17-05-2026', '17-05-2026');
    if (weekendDeals.data) {
      const filePath = path.join('scratch', 'nse_bulk_deals_weekend.json');
      fs.writeFileSync(filePath, JSON.stringify(weekendDeals.data, null, 2));
      console.log(`Saved Weekend Bulk Deals to ${filePath} (${weekendDeals.data.data?.length || 0} rows)`);
    } else {
      console.log(`Failed to fetch Weekend Bulk Deals:`, weekendDeals.error);
    }

  } catch (err) {
    console.error('Error occurred in Playwright script:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
