import { chromium } from '@playwright/test';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const context = await browser.newContext({ userAgent: CHROME_UA });
  const page = await context.newPage();

  try {
    await page.goto('https://www.nseindia.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.goto('https://www.nseindia.com/report-detail/display-bulk-and-block-deals', { waitUntil: 'load' });
    await page.waitForTimeout(5000);

    const buttonsInfo = await page.evaluate(() => {
      // Find all buttons, inputs, links, divs that are inside the main wrapper
      // We can look for anything with text containing "Get", "Filter", "Search", "Go", "Submit", or class with "btn" or "button"
      const elements = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a, div.btn, span.btn, .filter-btn, .search-btn'));
      return elements.map(el => ({
        tag: el.tagName,
        type: el.type || '',
        text: el.innerText?.trim() || el.value || '',
        className: el.className,
        id: el.id
      })).filter(x => x.text.length > 0 || x.className.includes('btn') || x.className.includes('button'));
    });

    console.log('--- Buttons/Clickables ---');
    console.log(JSON.stringify(buttonsInfo, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
