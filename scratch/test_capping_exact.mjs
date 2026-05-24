import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchJSONFromNSE(page, optionType, fromDate, toDate) {
  const url = `/api/historicalOR/bulk-block-short-deals?optionType=${optionType}&from=${fromDate}&to=${toDate}`;
  console.log(`Fetching JSON in page context: ${url}`);
  try {
    const result = await page.evaluate(async (fetchUrl) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
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
    console.error(`Page evaluate error for JSON:`, err.message);
    return { error: err.message };
  }
}

async function fetchCSVFromNSE(page, optionType, fromDate, toDate) {
  const url = `/api/historicalOR/bulk-block-short-deals?optionType=${optionType}&from=${fromDate}&to=${toDate}&csv=true`;
  console.log(`Fetching CSV in page context: ${url}`);
  try {
    const result = await page.evaluate(async (fetchUrl) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for slow CSV gen
      try {
        const resp = await fetch(fetchUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!resp.ok) {
          return { error: `HTTP ${resp.status}: ${await resp.text()}` };
        }
        const text = await resp.text();
        return { text };
      } catch (err) {
        clearTimeout(timeoutId);
        return { error: err.message };
      }
    }, url);
    return result;
  } catch (err) {
    console.error(`Page evaluate error for CSV:`, err.message);
    return { error: err.message };
  }
}

async function main() {
  console.log('Launching browser...');
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

    // Block only images
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (type === 'image') {
        return route.abort();
      }
      route.continue();
    });

    console.log('1. Navigating to homepage...');
    await page.goto('https://www.nseindia.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);

    console.log('2. Navigating to report detail page...');
    await page.goto('https://www.nseindia.com/report-detail/display-bulk-and-block-deals', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(10000);

    // Test 1: JSON 7-day control
    console.log('\n--- Test 1: Fetching 7-day JSON (15-05-2026 to 22-05-2026) ---');
    const json7Day = await fetchJSONFromNSE(page, 'bulk_deals', '15-05-2026', '22-05-2026');
    if (json7Day.data) {
      console.log(`SUCCESS. JSON rows count: ${json7Day.data.data?.length}`);
    } else {
      console.log('FAILED:', json7Day.error);
    }

    // Test 2: JSON Single day (15-05-2026)
    console.log('\n--- Test 2: Fetching Single Day JSON (15-05-2026) ---');
    const json1Day = await fetchJSONFromNSE(page, 'bulk_deals', '15-05-2026', '15-05-2026');
    if (json1Day.data) {
      console.log(`SUCCESS. JSON rows count: ${json1Day.data.data?.length}`);
    } else {
      console.log('FAILED:', json1Day.error);
    }

    // Test 3: CSV Single day (15-05-2026)
    console.log('\n--- Test 3: Fetching Single Day CSV (15-05-2026) ---');
    const csv1Day = await fetchCSVFromNSE(page, 'bulk_deals', '15-05-2026', '15-05-2026');
    if (csv1Day.text) {
      const lines = csv1Day.text.split('\n').filter(l => l.trim().length > 0);
      console.log(`SUCCESS. CSV lines count: ${lines.length}`);
      const filePath = path.join('scratch', 'nse_bulk_deals_single_day.csv');
      fs.writeFileSync(filePath, csv1Day.text, 'utf8');
      console.log(`Saved single day CSV to ${filePath}`);
    } else {
      console.log('FAILED:', csv1Day.error);
    }

    // Test 4: CSV 7-day range (15-05-2026 to 22-05-2026)
    console.log('\n--- Test 4: Fetching 7-day CSV (15-05-2026 to 22-05-2026) ---');
    const csv7Day = await fetchCSVFromNSE(page, 'bulk_deals', '15-05-2026', '22-05-2026');
    if (csv7Day.text) {
      const lines = csv7Day.text.split('\n').filter(l => l.trim().length > 0);
      console.log(`SUCCESS. CSV lines count: ${lines.length}`);
      const filePath = path.join('scratch', 'nse_bulk_deals_7days.csv');
      fs.writeFileSync(filePath, csv7Day.text, 'utf8');
      console.log(`Saved 7-day CSV to ${filePath}`);
    } else {
      console.log('FAILED:', csv7Day.error);
    }

  } catch (err) {
    console.error('Error in script:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
