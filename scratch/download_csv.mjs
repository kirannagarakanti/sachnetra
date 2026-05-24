import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchCSVFromNSE(page, optionType, fromDate, toDate) {
  const url = `/api/historicalOR/bulk-block-short-deals?optionType=${optionType}&from=${fromDate}&to=${toDate}&csv=true`;
  console.log(`Fetching CSV in page context: ${url}`);
  try {
    const result = await page.evaluate(async (fetchUrl) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
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
    console.error(`Page evaluate error for CSV fetch:`, err.message);
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
  const context = await browser.newContext({ userAgent: CHROME_UA });
  const page = await context.newPage();

  try {
    console.log('1. Navigating to homepage...');
    await page.goto('https://www.nseindia.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    console.log('2. Navigating to report detail page...');
    await page.goto('https://www.nseindia.com/report-detail/display-bulk-and-block-deals', { waitUntil: 'load' });
    await page.waitForTimeout(10000);

    // Test 1: Single day CSV fetch (15-05-2026)
    console.log('Test 1: Fetching CSV for 15-05-2026...');
    const singleDayRes = await fetchCSVFromNSE(page, 'bulk_deals', '15-05-2026', '15-05-2026');
    if (singleDayRes.text) {
      const filePath = path.join('scratch', 'nse_bulk_deals_single_day.csv');
      fs.writeFileSync(filePath, singleDayRes.text, 'utf8');
      console.log(`Saved single day CSV to ${filePath}`);
      const lines = singleDayRes.text.split('\n').filter(l => l.trim().length > 0);
      console.log(`Total CSV lines: ${lines.length}`);
      console.log('CSV Preview (first 5 lines):');
      console.log(lines.slice(0, 5).join('\n'));
    } else {
      console.log(`Failed Test 1:`, singleDayRes.error);
    }

    // Test 2: Historical 15-day range CSV fetch (01-04-2026 to 15-04-2026)
    console.log('\nTest 2: Fetching CSV for 01-04-2026 to 15-04-2026...');
    const histRes = await fetchCSVFromNSE(page, 'bulk_deals', '01-04-2026', '15-04-2026');
    if (histRes.text) {
      const filePath = path.join('scratch', 'nse_bulk_deals_hist_15days.csv');
      fs.writeFileSync(filePath, histRes.text, 'utf8');
      console.log(`Saved historical 15-day CSV to ${filePath}`);
      const lines = histRes.text.split('\n').filter(l => l.trim().length > 0);
      console.log(`Total CSV lines: ${lines.length}`);
      console.log('CSV Preview (first 10 lines):');
      console.log(lines.slice(0, 10).join('\n'));
    } else {
      console.log(`Failed Test 2:`, histRes.error);
    }

  } catch (err) {
    console.error('Error occurred:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
