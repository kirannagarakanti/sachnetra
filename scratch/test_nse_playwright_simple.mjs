import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  console.log('Launching system Google Chrome (headful, clean)...');
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome'
  });
  try {
    console.log('Creating browser context...');
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();

    console.log('Navigating to NSE option chain page directly...');
    const optResp = await page.goto('https://www.nseindia.com/option-chain', { waitUntil: 'load', timeout: 60000 });
    console.log(`NSE Option Chain status: ${optResp?.status()}`);

    console.log('Waiting 15s for page scripts, cookies, and Akamai challenges to settle...');
    await page.waitForTimeout(15000);

    const cookies = await context.cookies();
    console.log(`Cookies in context (${cookies.length}):`);
    for (const c of cookies) {
      console.log(`  - ${c.name}=${c.value.slice(0, 15)}...`);
    }

    const fetchSymbol = async (symbol, isEquity = false) => {
      const url = isEquity 
        ? `https://www.nseindia.com/api/option-chain-equities?symbol=${encodeURIComponent(symbol)}`
        : `https://www.nseindia.com/api/option-chain-indices?symbol=${encodeURIComponent(symbol)}`;
      
      console.log(`Fetching option chain in browser for ${symbol}...`);
      const data = await page.evaluate(async (fetchUrl) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
          const resp = await fetch(fetchUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
          }
          return await resp.json();
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      }, url);
      return data;
    };

    const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
    for (const sym of symbols) {
      try {
        const data = await fetchSymbol(sym, false);
        const filePath = path.join('scratch', `nse_optionchain_${sym}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Saved ${sym} chain. Size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
      } catch (err) {
        console.error(`Failed ${sym}:`, err.message);
      }
      await page.waitForTimeout(2000);
    }

    try {
      const data = await fetchSymbol('RELIANCE', true);
      const filePath = path.join('scratch', 'nse_optionchain_RELIANCE.json');
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Saved RELIANCE chain. Size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    } catch (err) {
      console.error('Failed RELIANCE:', err.message);
    }

  } catch (err) {
    console.error('Error occurred in Playwright Chrome script:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
