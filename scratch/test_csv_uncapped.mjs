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

    // Block resources to speed up
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

async function fetchFromNSEAPI(url, cookieString, isCsv = false) {
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
    console.log(`Error body (first 300 chars): ${text.slice(0, 300)}`);
    return null;
  }
  return isCsv ? response.text() : response.json();
}

async function main() {
  try {
    const cookieString = await getWarmedCookies();
    if (!cookieString) {
      console.error('Failed to get cookies!');
      return;
    }

    // 1. Fetch JSON for 15-05-2026 (Single Day)
    console.log('\n--- Fetching Single Day JSON (15-05-2026) ---');
    const jsonUrl = 'https://www.nseindia.com/api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from=15-05-2026&to=15-05-2026';
    const jsonData = await fetchFromNSEAPI(jsonUrl, cookieString, false);
    if (jsonData) {
      console.log(`JSON Data Length: ${jsonData.data?.length}`);
    }

    // 2. Fetch CSV for 15-05-2026 (Single Day)
    console.log('\n--- Fetching Single Day CSV (15-05-2026) ---');
    const csvSingleUrl = 'https://www.nseindia.com/api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from=15-05-2026&to=15-05-2026&csv=true';
    const csvSingleData = await fetchFromNSEAPI(csvSingleUrl, cookieString, true);
    if (csvSingleData) {
      const filePath = path.join('scratch', 'nse_bulk_deals_single_day.csv');
      fs.writeFileSync(filePath, csvSingleData, 'utf8');
      const lines = csvSingleData.split('\n').filter(l => l.trim().length > 0);
      console.log(`CSV Saved. Total Lines: ${lines.length}`);
      console.log('CSV Preview (first 3 lines):');
      console.log(lines.slice(0, 3).join('\n'));
    }

    // 3. Fetch CSV for 15-05-2026 to 22-05-2026 (7-day range)
    console.log('\n--- Fetching 7-day CSV (15-05-2026 to 22-05-2026) ---');
    const csvRangeUrl = 'https://www.nseindia.com/api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from=15-05-2026&to=22-05-2026&csv=true';
    const csvRangeData = await fetchFromNSEAPI(csvRangeUrl, cookieString, true);
    if (csvRangeData) {
      const filePath = path.join('scratch', 'nse_bulk_deals_7days.csv');
      fs.writeFileSync(filePath, csvRangeData, 'utf8');
      const lines = csvRangeData.split('\n').filter(l => l.trim().length > 0);
      console.log(`CSV Saved. Total Lines: ${lines.length}`);
      console.log('CSV Preview (first 3 lines):');
      console.log(lines.slice(0, 3).join('\n'));
    }

  } catch (err) {
    console.error('Failed:', err);
  }
}

main();
