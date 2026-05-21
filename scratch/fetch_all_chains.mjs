import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  console.log('Launching system Google Chrome (headful)...');
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

    // Listen for failed requests
    page.on('requestfailed', request => {
      console.log(`[Request Failed] URL: ${request.url()} | Error: ${request.failure()?.errorText}`);
    });

    // Intercept responses
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('api/option-chain')) {
        console.log(`[Response] ${url} | Status: ${response.status()}`);
        if (response.status() === 200) {
          try {
            const json = await response.json();
            if (json.records && json.filtered) {
              // Determine symbol
              let symbol = '';
              if (url.includes('symbol=NIFTY')) symbol = 'NIFTY';
              else if (url.includes('symbol=BANKNIFTY')) symbol = 'BANKNIFTY';
              else if (url.includes('symbol=FINNIFTY')) symbol = 'FINNIFTY';
              else if (url.includes('symbol=RELIANCE')) symbol = 'RELIANCE';
              else {
                // Parse symbol from URL params
                const parsedUrl = new URL(url);
                symbol = parsedUrl.searchParams.get('symbol') || 'UNKNOWN';
              }

              const filename = `nse_optionchain_${symbol}.json`;
              const filePath = path.join('scratch', filename);
              fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
              console.log(`[Saved Option Chain] ${filePath} (${(fs.statSync(filePath).size / 1024).toFixed(2)} KB)`);
            } else {
              console.log(`[Metadata/Info JSON] URL: ${url} | Keys: ${Object.keys(json).join(', ')}`);
            }
          } catch (err) {
            console.log(`[Parse Error] ${url}: ${err.message}`);
          }
        }
      }
    });

    console.log('Navigating to NSE option chain page...');
    await page.goto('https://www.nseindia.com/option-chain', { waitUntil: 'load', timeout: 60000 });
    console.log(`Initial page URL: ${page.url()}`);
    console.log('Waiting 10s for initial load...');
    await page.waitForTimeout(10000);

    const getSelectValue = async () => {
      return page.evaluate(() => {
        const el = document.getElementById('equity_optionchain_select');
        return el ? el.value : 'NOT FOUND';
      });
    };

    console.log(`Dropdown value before BANKNIFTY selection: ${await getSelectValue()}`);

    // BANKNIFTY
    console.log('\nSelecting BANKNIFTY in dropdown...');
    await page.evaluate(() => {
      const el = document.getElementById('equity_optionchain_select');
      if (el) {
        el.value = 'BANKNIFTY';
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        console.error('Dropdown not found!');
      }
    });

    console.log('Waiting 8s for BANKNIFTY to load and checking state...');
    await page.waitForTimeout(8000);
    console.log(`Dropdown value after selection: ${await getSelectValue()}`);
    console.log(`Page URL after selection: ${page.url()}`);

    // FINNIFTY
    console.log('\nSelecting FINNIFTY in dropdown...');
    await page.evaluate(() => {
      const el = document.getElementById('equity_optionchain_select');
      if (el) {
        el.value = 'FINNIFTY';
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    console.log('Waiting 8s for FINNIFTY to load...');
    await page.waitForTimeout(8000);

    // RELIANCE
    console.log('\nSelecting RELIANCE in dropdown...');
    await page.evaluate(() => {
      const el = document.getElementById('select_symbol');
      if (el) {
        el.value = 'RELIANCE';
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    console.log('Waiting 8s for RELIANCE to load...');
    await page.waitForTimeout(8000);

    console.log('\nFinished all fetches.');

  } catch (err) {
    console.error('Error occurred:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
