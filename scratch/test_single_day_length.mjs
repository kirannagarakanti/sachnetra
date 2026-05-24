import { chromium } from '@playwright/test';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ 
    headless: false, 
    channel: 'chrome',
    args: ['--disable-http2']
  });
  const context = await browser.newContext({ userAgent: CHROME_UA });
  const page = await context.newPage();

  try {
    console.log('1. Navigating to homepage...');
    await page.goto('https://www.nseindia.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    console.log('2. Navigating to report detail page...');
    await page.goto('https://www.nseindia.com/report-detail/display-bulk-and-block-deals', { waitUntil: 'load' });
    await page.waitForTimeout(5000);

    console.log('3. Fetching single day Bulk Deals (15-05-2026)...');
    const result = await page.evaluate(async () => {
      const url = '/api/historicalOR/bulk-block-short-deals?optionType=bulk_deals&from=15-05-2026&to=15-05-2026';
      const resp = await fetch(url);
      return resp.json();
    });

    console.log(`JSON Result data length: ${result.data?.length}`);
    if (result.data && result.data.length > 0) {
      console.log('First row:', JSON.stringify(result.data[0]));
      console.log('Last row:', JSON.stringify(result.data[result.data.length - 1]));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
