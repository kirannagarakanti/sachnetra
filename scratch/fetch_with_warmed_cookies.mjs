import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getWarmedCookies() {
  console.log('Launching browser to warm cookies...');
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome',
    args: ['--disable-http2']
  });
  
  try {
    const context = await browser.newContext({
      userAgent: CHROME_UA,
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();

    // Block images/styles to speed up
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (type === 'image' || type === 'stylesheet' || type === 'font') {
        return route.abort();
      }
      route.continue();
    });

    console.log('Navigating to NSE homepage...');
    await page.goto('https://www.nseindia.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log('Navigating to Bulk/Block deals page...');
    await page.goto('https://www.nseindia.com/report-detail/display-bulk-and-block-deals', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(5000);

    const cookies = await context.cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    console.log(`Successfully warmed ${cookies.length} cookies.`);
    await browser.close();
    return cookieString;
  } catch (err) {
    console.error('Error during cookie warming:', err);
    await browser.close();
    throw err;
  }
}

async function fetchFromNSEAPI(url, cookieString) {
  console.log(`Node fetch from: ${url}`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': CHROME_UA,
      'Cookie': cookieString,
      'Referer': 'https://www.nseindia.com/report-detail/display-bulk-and-block-deals',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    }
  });

  console.log(`Status: ${response.status} ${response.statusText}`);
  if (!response.ok) {
    const text = await response.text();
    console.log(`Error body: ${text.slice(0, 300)}`);
    return null;
  }
  return response.json();
}

async function main() {
  try {
    const cookieString = await getWarmedCookies();
    if (!cookieString) {
      console.error('Failed to get cookies!');
      return;
    }

    // 1. Fetch Bulk Deals
    const bulkUrl = 'https://www.nseindia.com/api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from=15-05-2026&to=22-05-2026';
    const bulkData = await fetchFromNSEAPI(bulkUrl, cookieString);
    if (bulkData) {
      const filePath = path.join('scratch', 'nse_bulk_deals_sample.json');
      fs.writeFileSync(filePath, JSON.stringify(bulkData, null, 2));
      console.log(`Saved Bulk Deals to ${filePath} (${bulkData.data?.length || 0} rows)`);
    }

    // 2. Fetch Block Deals
    const blockUrl = 'https://www.nseindia.com/api/historicalOR/bulk-block-short-deals?optionType=block_deals&from=15-05-2026&to=22-05-2026';
    const blockData = await fetchFromNSEAPI(blockUrl, cookieString);
    if (blockData) {
      const filePath = path.join('scratch', 'nse_block_deals_sample.json');
      fs.writeFileSync(filePath, JSON.stringify(blockData, null, 2));
      console.log(`Saved Block Deals to ${filePath} (${blockData.data?.length || 0} rows)`);
    }

    // 3. Fetch Short Selling
    const shortUrl = 'https://www.nseindia.com/api/historicalOR/bulk-block-short-deals?optionType=short_selling&from=15-05-2026&to=22-05-2026';
    const shortData = await fetchFromNSEAPI(shortUrl, cookieString);
    if (shortData) {
      const filePath = path.join('scratch', 'nse_short_selling_sample.json');
      fs.writeFileSync(filePath, JSON.stringify(shortData, null, 2));
      console.log(`Saved Short Selling to ${filePath} (${shortData.data?.length || 0} rows)`);
    }

    // 4. Test history depth (backfill depth) e.g., 01-04-2026 to 30-04-2026
    const histUrl = 'https://www.nseindia.com/api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from=01-04-2026&to=30-04-2026';
    const histData = await fetchFromNSEAPI(histUrl, cookieString);
    if (histData) {
      const filePath = path.join('scratch', 'nse_bulk_deals_history_april2026.json');
      fs.writeFileSync(filePath, JSON.stringify(histData, null, 2));
      console.log(`Saved April 2026 Bulk Deals to ${filePath} (${histData.data?.length || 0} rows)`);
    }

    // 5. Test history depth further back (e.g. May 2025)
    const deepHistUrl = 'https://www.nseindia.com/api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from=01-05-2025&to=30-05-2025';
    const deepHistData = await fetchFromNSEAPI(deepHistUrl, cookieString);
    if (deepHistData) {
      const filePath = path.join('scratch', 'nse_bulk_deals_history_may2025.json');
      fs.writeFileSync(filePath, JSON.stringify(deepHistData, null, 2));
      console.log(`Saved May 2025 Bulk Deals to ${filePath} (${deepHistData.data?.length || 0} rows)`);
    }

    // 6. Test weekend/holiday behaviour (17-05-2026 is Sunday)
    const weekendUrl = 'https://www.nseindia.com/api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from=17-05-2026&to=17-05-2026';
    const weekendData = await fetchFromNSEAPI(weekendUrl, cookieString);
    if (weekendData) {
      const filePath = path.join('scratch', 'nse_bulk_deals_weekend.json');
      fs.writeFileSync(filePath, JSON.stringify(weekendData, null, 2));
      console.log(`Saved Weekend Bulk Deals to ${filePath} (${weekendData.data?.length || 0} rows)`);
    }

  } catch (err) {
    console.error('Failed:', err);
  }
}

main();
