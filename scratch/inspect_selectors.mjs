import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://www.nseindia.com/option-chain', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);

    const interactiveInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        id: i.id,
        type: i.type,
        name: i.name,
        value: i.value,
        checked: i.checked,
        visible: i.offsetWidth > 0 && i.offsetHeight > 0
      }));
      
      const labels = Array.from(document.querySelectorAll('label')).map(l => ({
        htmlFor: l.htmlFor,
        text: l.innerText,
        visible: l.offsetWidth > 0 && l.offsetHeight > 0
      }));

      const selects = Array.from(document.querySelectorAll('select')).map(s => ({
        id: s.id,
        visible: s.offsetWidth > 0 && s.offsetHeight > 0,
        value: s.value
      }));

      return { inputs, labels, selects };
    });

    console.log('--- Interactive Elements on Option Chain Page ---');
    console.log(JSON.stringify(interactiveInfo, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
