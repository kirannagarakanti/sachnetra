import { chromium } from '@playwright/test';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('Launching browser headful...');
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const context = await browser.newContext({ userAgent: CHROME_UA });
  const page = await context.newPage();

  try {
    console.log('Navigating to homepage...');
    await page.goto('https://www.nseindia.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    console.log('Navigating to deals page...');
    await page.goto('https://www.nseindia.com/report-detail/display-bulk-and-block-deals', { waitUntil: 'load' });
    await page.waitForTimeout(5000);

    // Get elements info
    const info = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('a, button, li, span, nav div')).map(el => {
        const text = el.innerText?.trim() || '';
        if (text.length > 0 && text.length < 50) {
          return {
            tag: el.tagName,
            text: text,
            className: el.className,
            id: el.id
          };
        }
        return null;
      }).filter(Boolean);

      const inputs = Array.from(document.querySelectorAll('input, select')).map(el => ({
        tag: el.tagName,
        type: el.type,
        id: el.id,
        name: el.name,
        value: el.value,
        className: el.className
      }));

      return { tabs, inputs };
    });

    console.log('--- Clickable/Text Elements found ---');
    console.log(JSON.stringify(info.tabs.slice(0, 100), null, 2));

    console.log('--- Input Elements found ---');
    console.log(JSON.stringify(info.inputs, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
