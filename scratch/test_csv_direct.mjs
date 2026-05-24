import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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
    await page.waitForTimeout(5000);

    console.log('3. Triggering CSV URL via window.open/direct navigation...');
    // We will listen for a download event
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(e => {
      console.log('No download event fired:', e.message);
      return null;
    });

    const csvUrl = 'https://www.nseindia.com/api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from=15-05-2026&to=22-05-2026&csv=true';
    console.log(`Navigating page to CSV URL: ${csvUrl}`);
    
    // We can navigate the page directly to it
    const response = await page.goto(csvUrl).catch(e => {
      console.log('Navigation to CSV URL failed/aborted (expected if it is a download):', e.message);
      return null;
    });

    if (response) {
      console.log(`Response status: ${response.status()}`);
      console.log(`Response headers:`, JSON.stringify(response.headers(), null, 2));
      const text = await response.text().catch(e => `Could not read text: ${e.message}`);
      console.log(`Response body start (first 500 chars):`);
      console.log(text.slice(0, 500));
    }

    const download = await downloadPromise;
    if (download) {
      const filePath = path.join('scratch', download.suggestedFilename());
      await download.saveAs(filePath);
      console.log(`SUCCESS: Downloaded file saved to ${filePath}`);
      const stats = fs.statSync(filePath);
      console.log(`File size: ${stats.size} bytes`);
      if (stats.size > 0) {
        const content = fs.readFileSync(filePath, 'utf8');
        console.log('CSV Preview (first 10 lines):');
        console.log(content.split('\n').slice(0, 10).join('\n'));
      }
    }

  } catch (err) {
    console.error('Error occurred:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
