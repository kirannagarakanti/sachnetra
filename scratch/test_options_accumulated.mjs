import fs from 'node:fs';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function mergeCookies(existingMap, setCookieHeader) {
  for (const cookieStr of setCookieHeader) {
    const parts = cookieStr.split(';');
    const firstPart = parts[0].trim();
    const eqIdx = firstPart.indexOf('=');
    if (eqIdx !== -1) {
      const key = firstPart.substring(0, eqIdx).trim();
      const val = firstPart.substring(eqIdx + 1).trim();
      if (key) {
        existingMap.set(key, val);
      }
    }
  }
}

function getCookieString(cookieMap) {
  return Array.from(cookieMap.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function main() {
  const cookieMap = new Map();
  try {
    // 1. Visit NSE root
    const rootUrl = 'https://www.nseindia.com/';
    console.log(`[Step 1] Fetching root: ${rootUrl}...`);
    const rootResp = await fetch(rootUrl, {
      headers: {
        'User-Agent': CHROME_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    const rootSetCookies = rootResp.headers.getSetCookie?.() ?? [];
    mergeCookies(cookieMap, rootSetCookies);
    console.log(`[Step 1] Cookies after root fetch:`, Array.from(cookieMap.keys()));

    // 2. Visit Option Chain page
    const optionChainUrl = 'https://www.nseindia.com/option-chain';
    console.log(`[Step 2] Fetching option chain landing page with cookies: ${getCookieString(cookieMap)}...`);
    const optResp = await fetch(optionChainUrl, {
      headers: {
        'User-Agent': CHROME_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': getCookieString(cookieMap),
        'Referer': 'https://www.nseindia.com/',
      }
    });
    const optSetCookies = optResp.headers.getSetCookie?.() ?? [];
    mergeCookies(cookieMap, optSetCookies);
    console.log(`[Step 2] Cookies after option chain fetch:`, Array.from(cookieMap.keys()));

    // 3. Fetch NIFTY option chain index
    const dataUrl = 'https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY';
    console.log(`[Step 3] Fetching option chain data: ${dataUrl}...`);
    const dataResp = await fetch(dataUrl, {
      headers: {
        'User-Agent': CHROME_UA,
        'Referer': 'https://www.nseindia.com/option-chain',
        'Cookie': getCookieString(cookieMap),
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    console.log(`[Step 3] Status: ${dataResp.status}`);
    console.log(`[Step 3] Headers:`, Object.fromEntries(dataResp.headers.entries()));
    const text = await dataResp.text();
    console.log(`[Step 3] Response Length: ${text.length}`);
    console.log(`[Step 3] Response: ${text.slice(0, 500)}`);

  } catch (err) {
    console.error('Failed:', err);
  }
}

main();
