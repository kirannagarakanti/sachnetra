import fs from 'node:fs';
import path from 'node:path';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithHandshake() {
  const sessionUrl = 'https://www.nseindia.com/option-chain';
  console.log(`[Handshake] Fetching ${sessionUrl} to warm up cookies...`);
  
  const sessionResp = await fetch(sessionUrl, {
    headers: {
      'User-Agent': CHROME_UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  console.log(`[Handshake] Status: ${sessionResp.status} ${sessionResp.statusText}`);
  const setCookieHeader = sessionResp.headers.getSetCookie?.() ?? [];
  const cookieString = setCookieHeader
    .map(c => c.split(';')[0].trim())
    .join('; ');

  console.log(`[Handshake] Captured cookies: "${cookieString.slice(0, 100)}..."`);
  return cookieString;
}

async function fetchJson(url, cookies, referer = 'https://www.nseindia.com/option-chain') {
  console.log(`[Fetch] GET ${url}`);
  const resp = await fetch(url, {
    headers: {
      'User-Agent': CHROME_UA,
      'Referer': referer,
      'Cookie': cookies,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  console.log(`[Fetch] Status: ${resp.status}`);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }
  const text = await resp.text();
  if (text.trim() === '{}') {
    return {};
  }
  return JSON.parse(text);
}

async function main() {
  try {
    const cookies = await fetchWithHandshake();
    await delay(1000);

    const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'RELIANCE'];
    for (const symbol of symbols) {
      console.log(`\n=== Processing ${symbol} ===`);
      
      // 1. Fetch Contract Info
      const infoUrl = `https://www.nseindia.com/api/option-chain-contract-info?symbol=${symbol}`;
      let info;
      try {
        info = await fetchJson(infoUrl, cookies);
      } catch (err) {
        console.error(`Failed to fetch contract info for ${symbol}:`, err.message);
        continue;
      }

      console.log(`Contract info for ${symbol} expiryDates:`, info.expiryDates?.slice(0, 5));
      if (!info.expiryDates || info.expiryDates.length === 0) {
        console.log(`No expiry dates found for ${symbol}`);
        continue;
      }

      const expiry = info.expiryDates[0];
      console.log(`Using nearest expiry date: ${expiry}`);
      await delay(1000);

      // 2. Try fetching option chain v3
      // We will try type=Indices for NIFTY, BANKNIFTY, FINNIFTY
      // and type=Equities (or similar) for RELIANCE.
      let type = 'Indices';
      if (symbol === 'RELIANCE') {
        type = 'Equities';
      }

      const v3Url = `https://www.nseindia.com/api/option-chain-v3?type=${type}&symbol=${symbol}&expiry=${expiry}`;
      let chainData;
      try {
        chainData = await fetchJson(v3Url, cookies);
        console.log(`Successfully fetched v3 data for ${symbol}. Keys: ${Object.keys(chainData).join(', ')}`);
        if (chainData.records) {
          console.log(`Records underlyingValue: ${chainData.records.underlyingValue}`);
          console.log(`Records data length: ${chainData.records.data?.length}`);
          const filePath = path.join('scratch', `nse_optionchain_${symbol}.json`);
          fs.writeFileSync(filePath, JSON.stringify(chainData, null, 2));
          console.log(`Saved sample payload to ${filePath}`);
        } else {
          console.log(`Empty/invalid payload for ${symbol}`);
        }
      } catch (err) {
        console.error(`Failed to fetch v3 option chain for ${symbol}:`, err.message);
      }

      await delay(1500); // Politeness delay
    }
  } catch (err) {
    console.error('Error in main:', err);
  }
}

main();
