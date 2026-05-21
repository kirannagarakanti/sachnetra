import { chromium } from '@playwright/test';

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

    console.log('Navigating to NSE option chain page...');
    await page.goto('https://www.nseindia.com/option-chain', { waitUntil: 'load', timeout: 60000 });
    console.log('Waiting 10s for page to settle...');
    await page.waitForTimeout(10000);

    console.log('Evaluating fetch for BANKNIFTY contract info inside browser...');
    const contractInfo = await page.evaluate(async () => {
      try {
        const resp = await fetch('https://www.nseindia.com/api/option-chain-contract-info?symbol=BANKNIFTY');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
      } catch (err) {
        return { error: err.toString() };
      }
    });

    console.log('BANKNIFTY contract info result:', contractInfo);

    if (contractInfo.expiryDates && contractInfo.expiryDates.length > 0) {
      const nearExpiry = contractInfo.expiryDates[0];
      console.log(`Near expiry date for BANKNIFTY: ${nearExpiry}`);
      
      const v3Url = `https://www.nseindia.com/api/option-chain-v3?type=Indices&symbol=BANKNIFTY&expiry=${nearExpiry}`;
      console.log(`Evaluating fetch for BANKNIFTY option chain (v3) inside browser...`);
      
      const optionChain = await page.evaluate(async (url) => {
        try {
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          return await resp.json();
        } catch (err) {
          return { error: err.toString() };
        }
      }, v3Url);

      console.log('BANKNIFTY option chain keys:', Object.keys(optionChain));
      if (optionChain.records) {
        console.log('Successfully fetched BANKNIFTY v3 option chain!');
        console.log(`underlyingValue: ${optionChain.records.underlyingValue}`);
        console.log(`timestamp: ${optionChain.records.timestamp}`);
        console.log(`data rows: ${optionChain.records.data?.length}`);
      } else {
        console.log('BANKNIFTY option chain response structure:', optionChain);
      }
    }

  } catch (err) {
    console.error('Script error:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
