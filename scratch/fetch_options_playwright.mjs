import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('Launching Chromium browser with --disable-http2...');
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
    
    console.log('Navigating to NSE homepage...');
    try {
      await page.goto('https://www.nseindia.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log('Homepage loaded.');
    } catch (err) {
      console.log('Homepage navigation note:', err.message);
    }

    console.log('Navigating to NSE option chain page...');
    try {
      await page.goto('https://www.nseindia.com/option-chain', { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log('Option chain page loaded.');
    } catch (err) {
      console.log('Option chain navigation note:', err.message);
    }

    console.log('Waiting for cookies to settle (5s)...');
    await page.waitForTimeout(5000);

    const cookies = await context.cookies();
    console.log('Current cookies in browser context:', cookies.map(c => `${c.name}=${c.value.slice(0, 15)}...`));

    const fetchSymbol = async (symbol, isEquity) => {
      const url = isEquity 
        ? `https://www.nseindia.com/api/option-chain-equities?symbol=${encodeURIComponent(symbol)}`
        : `https://www.nseindia.com/api/option-chain-indices?symbol=${encodeURIComponent(symbol)}`;
      console.log(`Evaluating fetch for ${symbol}...`);
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
      console.error(`Failed RELIANCE:`, err.message);
    }

  } catch (err) {
    console.error('Error occurred:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
