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
    console.log('Waiting 10s for cookies to settle...');
    await page.waitForTimeout(10000);

    const cookies = await context.cookies();
    console.log(`Cookies in browser context: ${cookies.length}`);

    console.log('Fetching BANKNIFTY contract-info via context.request.get...');
    const requestContext = context.request;
    const resp = await requestContext.get('https://www.nseindia.com/api/option-chain-contract-info?symbol=BANKNIFTY', {
      headers: {
        'Referer': 'https://www.nseindia.com/option-chain',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });

    console.log(`Response status: ${resp.status()}`);
    const text = await resp.text();
    console.log(`Response length: ${text.length}`);
    console.log(`Response sample: ${text.slice(0, 300)}`);

    if (resp.ok()) {
      const json = await resp.json();
      console.log('Keys of response:', Object.keys(json));
      if (json.expiryDates && json.expiryDates.length > 0) {
        const nearExpiry = json.expiryDates[0];
        console.log(`Near expiry date: ${nearExpiry}`);
        
        const v3Url = `https://www.nseindia.com/api/option-chain-v3?type=Indices&symbol=BANKNIFTY&expiry=${nearExpiry}`;
        console.log(`Fetching BANKNIFTY option chain v3 via context.request.get...`);
        const v3Resp = await requestContext.get(v3Url, {
          headers: {
            'Referer': 'https://www.nseindia.com/option-chain',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
        });
        
        console.log(`v3 Response status: ${v3Resp.status()}`);
        const v3Text = await v3Resp.text();
        console.log(`v3 Response length: ${v3Text.length}`);
        console.log(`v3 Response sample: ${v3Text.slice(0, 300)}`);
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
