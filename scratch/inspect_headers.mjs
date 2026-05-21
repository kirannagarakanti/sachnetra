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

    // Listen for requests to capture headers
    page.on('request', request => {
      const url = request.url();
      if (url.includes('api/option-chain')) {
        console.log(`\n[Request Info] URL: ${url}`);
        console.log(`Method: ${request.method()}`);
        console.log(`Headers:`, JSON.stringify(request.headers(), null, 2));
      }
    });

    console.log('Navigating to NSE option chain page...');
    await page.goto('https://www.nseindia.com/option-chain', { waitUntil: 'load', timeout: 60000 });
    console.log('Waiting 15s for requests to complete...');
    await page.waitForTimeout(15000);

  } catch (err) {
    console.error('Error occurred:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
