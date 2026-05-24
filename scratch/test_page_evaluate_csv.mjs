import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchFromNSEPage(page, url, isCsv = false) {
  console.log(`Fetching in page context: ${url} (isCsv: ${isCsv})`);
  try {
    const result = await page.evaluate(async ({ fetchUrl, expectCsv }) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      try {
        const resp = await fetch(fetchUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!resp.ok) {
          return { error: `HTTP ${resp.status}: ${await resp.text()}` };
        }
        if (expectCsv) {
          const text = await resp.text();
          return { text };
        } else {
          const json = await resp.json();
          return { json };
        }
      } catch (err) {
        clearTimeout(timeoutId);
        return { error: err.message };
      }
    }, { fetchUrl: url, expectCsv: isCsv });
    return result;
  } catch (err) {
    console.error(`Page evaluate error:`, err.message);
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

    // Block images
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
    await page.goto('https://www.nseindia.com/report-detail/display-bulk-and-block-deals', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(10000);

    // Test 1: Single day JSON (15-05-2026)
    console.log('\n--- Test 1: Fetching Single Day JSON (15-05-2026) ---');
    const jsonUrl = '/api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from=15-05-2026&to=15-05-2026';
    const jsonRes = await fetchFromNSEPage(page, jsonUrl, false);
    if (jsonRes.json) {
      console.log(`SUCCESS. JSON rows count: ${jsonRes.json.data?.length}`);
      if (jsonRes.json.data?.length > 0) {
        console.log('First row:', JSON.stringify(jsonRes.json.data[0]));
      }
    } else {
      console.log('FAILED:', jsonRes.error);
    }

    // Test 2: Single day CSV (15-05-2026)
    console.log('\n--- Test 2: Fetching Single Day CSV (15-05-2026) ---');
    const csvSingleUrl = '/api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from=15-05-2026&to=15-05-2026&csv=true';
    const csvSingleRes = await fetchFromNSEPage(page, csvSingleUrl, true);
    if (csvSingleRes.text) {
      const filePath = path.join('scratch', 'nse_bulk_deals_single_day.csv');
      fs.writeFileSync(filePath, csvSingleRes.text, 'utf8');
      const lines = csvSingleRes.text.split('\n').filter(l => l.trim().length > 0);
      console.log(`SUCCESS. CSV Saved. Total Lines: ${lines.length}`);
      console.log('CSV Preview (first 3 lines):');
      console.log(lines.slice(0, 3).join('\n'));
    } else {
      console.log('FAILED:', csvSingleRes.error);
    }

    // Test 3: 7-day CSV (15-05-2026 to 22-05-2026)
    console.log('\n--- Test 3: Fetching 7-day CSV (15-05-2026 to 22-05-2026) ---');
    const csvRangeUrl = '/api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from=15-05-2026&to=22-05-2026&csv=true';
    const csvRangeRes = await fetchFromNSEPage(page, csvRangeUrl, true);
    if (csvRangeRes.text) {
      const filePath = path.join('scratch', 'nse_bulk_deals_7days.csv');
      fs.writeFileSync(filePath, csvRangeRes.text, 'utf8');
      const lines = csvRangeRes.text.split('\n').filter(l => l.trim().length > 0);
      console.log(`SUCCESS. CSV Saved. Total Lines: ${lines.length}`);
      console.log('CSV Preview (first 3 lines):');
      console.log(lines.slice(0, 3).join('\n'));
    } else {
      console.log('FAILED:', csvRangeRes.error);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
