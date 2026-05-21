import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  console.log('Launching system Google Chrome (headful, network debug)...');
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome',
    args: ['--disable-http2']
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();

    // Listen for console logs in the page
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    // Listen for failed requests
    page.on('requestfailed', request => {
      console.log(`[Browser Request Failed] URL: ${request.url()} | Error: ${request.failure()?.errorText}`);
    });

    // Listen for all responses and capture body
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('api/option-chain')) {
        console.log(`[Response Event] URL: ${url} | Status: ${response.status()}`);
        if (response.status() === 200) {
          try {
            const json = await response.json();
            console.log(`[Intercepted JSON] URL: ${url} | Keys: ${Object.keys(json).join(', ')}`);
            
            // Save sample to scratch
            let filename = '';
            if (url.includes('symbol=NIFTY')) {
              filename = 'nse_optionchain_NIFTY.json';
            } else if (url.includes('symbol=BANKNIFTY')) {
              filename = 'nse_optionchain_BANKNIFTY.json';
            } else if (url.includes('symbol=FINNIFTY')) {
              filename = 'nse_optionchain_FINNIFTY.json';
            } else if (url.includes('symbol=RELIANCE')) {
              filename = 'nse_optionchain_RELIANCE.json';
            } else {
              filename = 'nse_optionchain_captured.json';
            }
            
            const filePath = path.join('scratch', filename);
            fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
            console.log(`[Saved to file] ${filePath} (${(fs.statSync(filePath).size / 1024).toFixed(2)} KB)`);
          } catch (e) {
            console.log(`[Response Parse/Save Error] for ${url}: ${e.message}`);
          }
        }
      }
    });

    console.log('Navigating to NSE option chain page directly...');
    await page.goto('https://www.nseindia.com/option-chain', { waitUntil: 'load', timeout: 60000 });

    console.log('Waiting 15s for page to load and API responses to complete...');
    await page.waitForTimeout(15000);

    console.log('Extracting select dropdowns from page...');
    const selectInfo = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      return selects.map(s => ({
        id: s.id,
        name: s.name,
        className: s.className,
        options: Array.from(s.options).map(o => ({ value: o.value, text: o.text, selected: o.selected }))
      }));
    });
    console.log('Found select boxes:', JSON.stringify(selectInfo, null, 2));

  } catch (err) {
    console.error('Error occurred in Playwright Chrome script:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
