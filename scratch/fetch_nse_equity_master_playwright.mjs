import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const NSE_HOME_URL = 'https://www.nseindia.com';
const NSE_SECURITIES_PAGE =
  'https://www.nseindia.com/market-data/securities-available-for-trading';
const NSE_EQUITY_MASTER_URL =
  'https://archives.nseindia.com/content/equities/EQUITY_L.csv';
const OUTPUT_PATH = path.join(
  'scripts',
  'research',
  'output',
  'v2-031',
  'nse_equity_master.csv',
);

async function ensureOutputDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function countDataRows(csvText) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return 0;
  return Math.max(0, lines.length - 1);
}

function getHeaderRow(csvText) {
  const firstLine = csvText.split(/\r?\n/)[0] ?? '';
  return firstLine.trim();
}

async function fetchCsvWithHeaders(headers) {
  const response = await fetch(NSE_EQUITY_MASTER_URL, { headers });
  const bodyText = await response.text();
  return { response, bodyText };
}

async function warmCookies() {
  console.log('Launching browser and warming NSE session...');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--disable-http2'],
  });

  try {
    const context = await browser.newContext({
      userAgent: CHROME_UA,
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (type === 'image' || type === 'stylesheet' || type === 'font') {
        return route.abort();
      }
      route.continue();
    });

    await page.goto(NSE_HOME_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(1500);

    await page.goto(NSE_SECURITIES_PAGE, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(2000);

    const cookies = await context.cookies();
    const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    console.log(`Warmed ${cookies.length} cookies.`);
    return cookieString;
  } finally {
    await browser.close();
  }
}

async function main() {
  await ensureOutputDir(OUTPUT_PATH);

  console.log('Attempting direct CSV fetch (no cookies)...');
  const directHeaders = {
    'User-Agent': CHROME_UA,
    Accept: 'text/csv,*/*;q=0.8',
    Referer: NSE_HOME_URL,
  };

  let { response, bodyText } = await fetchCsvWithHeaders(directHeaders);
  console.log(`Direct fetch status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    console.log('Direct fetch failed. Trying warmed-cookie fetch...');
    const cookieString = await warmCookies();

    const warmedHeaders = {
      'User-Agent': CHROME_UA,
      Accept: 'text/csv,*/*;q=0.8',
      Referer: NSE_SECURITIES_PAGE,
      Cookie: cookieString,
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
    };

    const warmedResult = await fetchCsvWithHeaders(warmedHeaders);
    response = warmedResult.response;
    bodyText = warmedResult.bodyText;
    console.log(`Warmed fetch status: ${response.status} ${response.statusText}`);
  }

  if (!response.ok) {
    const snippet = bodyText.slice(0, 400).replace(/\s+/g, ' ');
    throw new Error(
      `Failed to fetch ${NSE_EQUITY_MASTER_URL} (HTTP ${response.status}). Body snippet: ${snippet}`,
    );
  }

  await fs.writeFile(OUTPUT_PATH, bodyText, 'utf8');

  const bytes = Buffer.byteLength(bodyText, 'utf8');
  const rowCount = countDataRows(bodyText);
  const header = getHeaderRow(bodyText);

  console.log('');
  console.log('Saved equity master successfully.');
  console.log(`URL: ${NSE_EQUITY_MASTER_URL}`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log(`HTTP status: ${response.status}`);
  console.log(`Size bytes: ${bytes}`);
  console.log(`Data rows: ${rowCount}`);
  console.log(`Header: ${header}`);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exitCode = 1;
});
