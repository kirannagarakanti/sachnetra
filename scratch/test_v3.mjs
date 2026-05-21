import fs from 'node:fs';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  try {
    const sessionUrl = 'https://www.nseindia.com/option-chain';
    console.log(`[Handshake] Fetching ${sessionUrl}...`);
    const sessionResp = await fetch(sessionUrl, {
      headers: {
        'User-Agent': CHROME_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const setCookieHeader = sessionResp.headers.getSetCookie?.() ?? [];
    const cookies = setCookieHeader.map(c => c.split(';')[0].trim()).join('; ');
    console.log(`[Handshake] Got cookies: ${cookies.slice(0, 100)}...`);

    const v3Url = 'https://www.nseindia.com/api/option-chain-v3?symbol=NIFTY';
    console.log(`[Fetch] Fetching ${v3Url}...`);
    const resp = await fetch(v3Url, {
      headers: {
        'User-Agent': CHROME_UA,
        'Referer': 'https://www.nseindia.com/option-chain',
        'Cookie': cookies,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      }
    });

    console.log(`[Fetch] Status: ${resp.status}`);
    const text = await resp.text();
    console.log(`[Fetch] Response Length: ${text.length}`);
    console.log(`[Fetch] Response Start: ${text.slice(0, 500)}`);
  } catch (err) {
    console.error(err);
  }
}

main();
