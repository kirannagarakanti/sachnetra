import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  
  try {
    const context = await browser.newContext({
      userAgent: CHROME_UA,
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Listen to all network requests to see if there are any JSON API calls
    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      const contentType = response.headers()['content-type'] || '';
      
      if (url.includes('/api/') || contentType.includes('json')) {
        console.log(`[API Response] URL: ${url} | Status: ${status} | Content-Type: ${contentType}`);
        try {
          const body = await response.json();
          console.log('API Body preview:', JSON.stringify(body).slice(0, 500));
          // Save the API body
          const filename = `npci_api_${Date.now()}_${path.basename(url.split('?')[0])}.json`;
          fs.writeFileSync(path.join('scratch', filename), JSON.stringify(body, null, 2));
          console.log(`Saved API response to scratch/${filename}`);
        } catch (e) {
          // not json or failed to parse
        }
      }
    });

    const targetUrl = 'https://www.npci.org.in/product/netc/product-statistics';
    console.log('Navigating to NPCI target...', targetUrl);
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Navigation complete. Page Title:', await page.title());

    // Wait a bit more for dynamic content
    await page.waitForTimeout(5000);

    // Save HTML and screenshot
    const html = await page.content();
    fs.writeFileSync('scratch/npci_rendered.html', html, 'utf8');
    console.log('Saved rendered HTML to scratch/npci_rendered.html');

    // Extract page text or tables
    const text = await page.innerText('body');
    fs.writeFileSync('scratch/npci_body_text.txt', text, 'utf8');
    console.log('Saved page body text to scratch/npci_body_text.txt');

    // Check if there are tables
    const tablesCount = await page.locator('table').count();
    console.log('Number of tables found:', tablesCount);
    for (let i = 0; i < tablesCount; i++) {
      console.log(`Table ${i + 1} innerText preview:`);
      const preview = await page.locator('table').nth(i).innerText();
      console.log(preview.slice(0, 1000));
      console.log('-----------------------------------');
    }

  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

main();
