import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('Launching Google Chrome (headful, disable-http2)...');
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome',
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

    // Capture responses
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/')) {
        console.log(`[Response Captured] URL: ${url}`);
        console.log(`  - Status: ${response.status()} ${response.statusText()}`);
        
        if (response.status() === 200) {
          try {
            const data = await response.json();
            const keys = Object.keys(data);
            console.log(`  - JSON Keys: ${keys.join(', ')}`);
            
            let filename = '';
            if (url.includes('bulk-deals')) {
              filename = 'nse_bulk_deals_sample.json';
            } else if (url.includes('block-deals')) {
              filename = 'nse_block_deals_sample.json';
            } else {
              filename = `captured_api_${Date.now()}.json`;
            }
            
            const filePath = path.join('scratch', filename);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`  - Saved to ${filePath} (${(fs.statSync(filePath).size / 1024).toFixed(2)} KB)`);
            
            // Print a sample row if it exists
            const list = Array.isArray(data) ? data : (data.data || []);
            console.log(`  - Total Rows: ${list.length}`);
            if (list.length > 0) {
              console.log(`  - Sample Row: ${JSON.stringify(list[0]).slice(0, 200)}`);
            }
          } catch (err) {
            console.log(`  - Could not parse as JSON: ${err.message}`);
          }
        } else {
          try {
            const text = await response.text();
            console.log(`  - Error Body: ${text.slice(0, 200)}`);
          } catch (err) {
            // ignore
          }
        }
      }
    });

    console.log('1. Navigating to NSE homepage...');
    const rootResp = await page.goto('https://www.nseindia.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`NSE Homepage status: ${rootResp?.status()}`);

    console.log('Waiting 5s...');
    await page.waitForTimeout(5000);

    console.log('2. Navigating to NSE bulk/block deals report page...');
    // We wait for 'load' because we want all frontend JS to run and fetch APIs
    const reportResp = await page.goto('https://www.nseindia.com/report-detail/display-bulk-and-block-deals', { waitUntil: 'load', timeout: 45000 });
    console.log(`NSE Report Page status: ${reportResp?.status()}`);

    console.log('Waiting 25s on report page to capture all automatic API calls...');
    await page.waitForTimeout(25000);

    // Let's print cookies to verify
    const cookies = await context.cookies();
    console.log(`Final cookies count: ${cookies.length}`);

  } catch (err) {
    console.error('Error occurred in Playwright script:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
