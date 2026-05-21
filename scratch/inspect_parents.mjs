import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://www.nseindia.com/option-chain', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);

    const htmlInfo = await page.evaluate(() => {
      const select1 = document.getElementById('equity_optionchain_select');
      const select2 = document.getElementById('select_symbol');
      
      return {
        select1Parent: select1 ? select1.parentElement.outerHTML : 'Not found',
        select2Parent: select2 ? select2.parentElement.outerHTML : 'Not found',
      };
    });

    console.log('--- Selector HTML Info ---');
    console.log('Select 1 parent HTML:');
    console.log(htmlInfo.select1Parent);
    console.log('\nSelect 2 parent HTML:');
    console.log(htmlInfo.select2Parent);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
