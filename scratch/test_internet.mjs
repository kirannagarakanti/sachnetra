import { chromium } from '@playwright/test';

async function main() {
  console.log('Launching Chromium...');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    console.log('Navigating to httpbin...');
    await page.goto('https://httpbin.org/get', { timeout: 10000 });
    console.log('Successfully navigated!');
    const content = await page.textContent('body');
    console.log('Page content:', content);
  } catch (err) {
    console.error('Error navigating:', err.message);
  } finally {
    await browser.close();
  }
}

main();
