import { chromium } from '@playwright/test';
import fs from 'node:fs';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('Launching browser in headful-ready headless mode...');
  const browser = await chromium.launch({ headless: true });
  
  try {
    const context = await browser.newContext({
      userAgent: CHROME_UA,
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Listen to console events
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    // Listen to all network requests
    page.on('request', req => {
      // console.log(`[Request] ${req.method()} ${req.url()}`);
    });

    // Listen to all network responses
    page.on('response', resp => {
      const url = resp.url();
      const status = resp.status();
      const ct = resp.headers()['content-type'] || '';
      
      // Log important files or failed requests
      if (url.includes('npci.org.in') || status !== 200) {
        console.log(`[Response] ${status} | ${ct} | ${url}`);
      }
    });

    const targetUrl = 'https://www.npci.org.in/product/netc/product-statistics';
    console.log('Navigating to NPCI target...', targetUrl);
    
    const response = await page.goto(targetUrl, { waitUntil: 'load', timeout: 30000 });
    console.log('Main page response status:', response ? response.status() : 'null');
    
    console.log('Waiting 10s for page to settle and run scripts...');
    await page.waitForTimeout(10000);

    // Save screenshot
    await page.screenshot({ path: 'scratch/npci_screenshot.png' });
    console.log('Saved screenshot to scratch/npci_screenshot.png');

    // Print body text again
    const text = await page.innerText('body');
    console.log('Rendered body text length:', text.trim().length);
    if (text.trim().length > 0) {
      console.log('Body text snippet:\n', text.slice(0, 1000));
    } else {
      console.log('Body is still empty.');
    }

  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
