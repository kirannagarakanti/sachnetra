import { chromium } from '@playwright/test';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('Launching browser headful...');
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const context = await browser.newContext({ userAgent: CHROME_UA });
  const page = await context.newPage();

  // Log all network responses from NSE API
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      console.log(`[API Response] URL: ${url} | Status: ${response.status()}`);
      try {
        if (response.status() === 200) {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            const rowCount = data.data ? data.data.length : (Array.isArray(data) ? data.length : 'not array');
            console.log(`  -> Rowcount: ${rowCount}`);
          }
        }
      } catch (err) {
        // Safe to ignore if response is already read or closed
      }
    }
  });

  try {
    console.log('1. Navigating to homepage...');
    await page.goto('https://www.nseindia.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    console.log('2. Navigating to report detail page...');
    await page.goto('https://www.nseindia.com/report-detail/display-bulk-and-block-deals', { waitUntil: 'load' });
    await page.waitForTimeout(10000);

    // Let's inspect the pagination controls in the DOM
    console.log('Checking table pagination and select/dropdown controls...');
    const domDetails = await page.evaluate(() => {
      // Find pagination buttons or page-select elements
      const paginationSelectors = Array.from(document.querySelectorAll('.pagination, .page-item, .page-link, .next, .prev, .active, .paginate_button'))
        .map(el => ({
          tag: el.tagName,
          id: el.id,
          className: el.className,
          text: el.innerText?.trim() || ''
        }));
      
      // Find dropdown to change page size
      const selects = Array.from(document.querySelectorAll('select'))
        .map(el => ({
          id: el.id,
          className: el.className,
          options: Array.from(el.options).map(o => o.value)
        }));
      
      // Check if there is a pagination next button and return its selector/text
      return { paginationSelectors, selects, htmlSnippet: document.querySelector('.pagination')?.outerHTML || 'No pagination element' };
    });

    console.log('DOM Details:', JSON.stringify(domDetails, null, 2));

    // Wait another 10s to see if any user triggers are possible
    console.log('Waiting 10s...');
    await page.waitForTimeout(10000);

  } catch (err) {
    console.error('Error occurred:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
