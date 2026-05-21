import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('Launching Chromium browser...');
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-http2']
  });
  try {
    console.log('Creating browser context...');
    const context = await browser.newContext({
      userAgent: CHROME_UA,
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();

    // Abort unnecessary/heavy/tracking resources
    await page.route('**/*', (route) => {
      const request = route.request();
      const url = request.url();
      const type = request.resourceType();

      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        return route.abort();
      }

      const blockedDomains = [
        'google-analytics.com',
        'googletagmanager.com',
        'go-mpulse.net',
        'doubleclick.net',
        'akstat.io',
        'akamaihd.net',
        'youtube.com',
        'highcharts.com'
      ];

      if (blockedDomains.some(domain => url.includes(domain))) {
        return route.abort();
      }

      route.continue();
    });

    console.log('Navigating to NSE homepage...');
    const rootResponse = await page.goto('https://www.nseindia.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`NSE Homepage loaded. HTTP Status: ${rootResponse?.status()}`);

    console.log('Navigating to NSE option chain page...');
    const optionChainResponse = await page.goto('https://www.nseindia.com/option-chain', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`NSE Option Chain page loaded. HTTP Status: ${optionChainResponse?.status()}`);

    console.log('Waiting 5 seconds for cookies/session to settle...');
    await page.waitForTimeout(5000);

    const cookies = await context.cookies();
    console.log('Cookies in browser context:');
    for (const c of cookies) {
      console.log(`  - ${c.name}=${c.value.slice(0, 20)}...`);
    }

    const fetchSymbol = async (symbol, isEquity = false) => {
      const url = isEquity 
        ? `https://www.nseindia.com/api/option-chain-equities?symbol=${encodeURIComponent(symbol)}`
        : `https://www.nseindia.com/api/option-chain-indices?symbol=${encodeURIComponent(symbol)}`;
      
      console.log(`Evaluating fetch in browser for ${symbol}...`);
      const data = await page.evaluate(async (fetchUrl) => {
        const resp = await fetch(fetchUrl);
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        return resp.json();
      }, url);
      return data;
    };

    const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
    for (const sym of symbols) {
      try {
        const data = await fetchSymbol(sym, false);
        const filePath = path.join('scratch', `nse_optionchain_${sym}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Successfully fetched and saved ${sym}. Size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
      } catch (err) {
        console.error(`Failed to fetch ${sym} chain:`, err.message);
      }
      await page.waitForTimeout(2000);
    }

    try {
      const data = await fetchSymbol('RELIANCE', true);
      const filePath = path.join('scratch', 'nse_optionchain_RELIANCE.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Successfully fetched and saved RELIANCE. Size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    } catch (err) {
      console.error('Failed to fetch RELIANCE chain:', err.message);
    }

  } catch (err) {
    console.error('Error occurred in Playwright script:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
