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

    console.log('Navigating to NSE homepage (commit)...');
    const rootResp = await page.goto('https://www.nseindia.com', { waitUntil: 'commit', timeout: 30000 });
    console.log(`NSE Homepage navigation commit status: ${rootResp?.status()}`);
    
    console.log('Waiting 10s for homepage scripts/cookies...');
    await page.waitForTimeout(10000);

    console.log('Navigating to NSE option chain page (commit)...');
    const optResp = await page.goto('https://www.nseindia.com/option-chain', { waitUntil: 'commit', timeout: 30000 });
    console.log(`NSE Option Chain navigation commit status: ${optResp?.status()}`);

    console.log('Waiting 10s for option chain page scripts/cookies...');
    await page.waitForTimeout(10000);

    const cookies = await context.cookies();
    console.log(`Cookies in browser context (${cookies.length}):`);
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
