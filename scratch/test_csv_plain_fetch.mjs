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

    // Block ONLY images to avoid Akamai telemetry flags
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (type === 'image') {
        return route.abort();
      }
      route.continue();
    });

    console.log('Navigating to NSE homepage...');
    await page.goto('https://www.nseindia.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);

    console.log('Navigating to Bulk/Block deals page...');
    await page.goto('https://www.nseindia.com/report-detail/display-bulk-and-block-deals', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(8000);

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
  return response.text();
}

async function main() {
  try {
    const cookieString = await getWarmedCookies();
    if (!cookieString) {
      console.error('Failed to get cookies!');
      return;
    }

    // 1. Fetch Single Day CSV (15-05-2026)
    const csvSingleUrl = 'https://www.nseindia.com/api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from=15-05-2026&to=15-05-2026&csv=true';
    const csvSingleData = await fetchFromNSEAPI(csvSingleUrl, cookieString);
    if (csvSingleData) {
      const filePath = path.join('scratch', 'nse_bulk_deals_single_day.csv');
      fs.writeFileSync(filePath, csvSingleData, 'utf8');
      const lines = csvSingleData.split('\n').filter(l => l.trim().length > 0);
      console.log(`Saved Single Day CSV to ${filePath} (${lines.length} lines, including header)`);
    }

    // 2. Fetch 7-day CSV (15-05-2026 to 22-05-2026)
    const csvRangeUrl = 'https://www.nseindia.com/api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from=15-05-2026&to=22-05-2026&csv=true';
    const csvRangeData = await fetchFromNSEAPI(csvRangeUrl, cookieString);
    if (csvRangeData) {
      const filePath = path.join('scratch', 'nse_bulk_deals_7days.csv');
      fs.writeFileSync(filePath, csvRangeData, 'utf8');
      const lines = csvRangeData.split('\n').filter(l => l.trim().length > 0);
      console.log(`Saved 7-day CSV to ${filePath} (${lines.length} lines, including header)`);
    }

  } catch (err) {
    console.error('Failed:', err);
  }
}

main();
