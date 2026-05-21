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
  console.log('[Handshake] Response Headers:', Object.fromEntries(sessionResp.headers.entries()));
  const text = await sessionResp.text();
  console.log(`[Handshake] Response body length: ${text.length}`);
  console.log(`[Handshake] Body Start: ${text.slice(0, 300)}`);

  // Get cookies
  const setCookieHeader = sessionResp.headers.getSetCookie?.() ?? [];
  console.log('[Handshake] Raw Set-Cookie header array:', setCookieHeader);
  const cookieString = setCookieHeader
    .map(c => c.split(';')[0].trim())
    .join('; ');

  console.log(`[Handshake] Captured cookies: "${cookieString}"`);
  return cookieString;
}

async function fetchOptionChain(cookieString, symbol, isEquity = false) {
  const baseUrl = isEquity
    ? 'https://www.nseindia.com/api/option-chain-equities'
    : 'https://www.nseindia.com/api/option-chain-indices';
  
  const url = `${baseUrl}?symbol=${encodeURIComponent(symbol)}`;
  const referer = isEquity
    ? `https://www.nseindia.com/get-quotes/derivatives?symbol=${encodeURIComponent(symbol)}`
    : `https://www.nseindia.com/option-chain`;

  console.log(`[Fetch] GET ${url}`);
  console.log(`[Fetch] Referer: ${referer}`);

  const resp = await fetch(url, {
    headers: {
      'User-Agent': CHROME_UA,
      'Referer': referer,
      'Cookie': cookieString,
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  console.log(`[Fetch] Status: ${resp.status} ${resp.statusText}`);
  console.log('[Fetch] Response Headers:', Object.fromEntries(resp.headers.entries()));
  
  const text = await resp.text();
  console.log(`[Fetch] Response Length: ${text.length} chars`);
  console.log(`[Fetch] Response Start: ${text.slice(0, 300)}`);

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    console.error(`[Fetch] JSON parse failed: ${err.message}`);
    throw err;
  }
  return json;
}

async function main() {
  const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
  const equitySymbols = ['RELIANCE'];
  
  try {
    let cookies = await fetchWithHandshake();
    
    // Test NIFTY
    console.log('\n--- NIFTY Options Chain ---');
    await delay(1000); // polite pause
    let niftyData;
    try {
      niftyData = await fetchOptionChain(cookies, 'NIFTY');
      const niftyPath = path.join('scratch', 'nse_optionchain_NIFTY.json');
      fs.writeFileSync(niftyPath, JSON.stringify(niftyData, null, 2));
      console.log(`Saved NIFTY option chain to ${niftyPath} (Size: ${(fs.statSync(niftyPath).size / 1024).toFixed(2)} KB)`);
      analyzePayload(niftyData, 'NIFTY');
    } catch (err) {
      console.error(`Failed NIFTY option chain fetch:`, err);
    }

    // Test BANKNIFTY
    console.log('\n--- BANKNIFTY Options Chain ---');
    await delay(1000);
    try {
      const bankniftyData = await fetchOptionChain(cookies, 'BANKNIFTY');
      const bankniftyPath = path.join('scratch', 'nse_optionchain_BANKNIFTY.json');
      fs.writeFileSync(bankniftyPath, JSON.stringify(bankniftyData, null, 2));
      console.log(`Saved BANKNIFTY option chain to ${bankniftyPath} (Size: ${(fs.statSync(bankniftyPath).size / 1024).toFixed(2)} KB)`);
      analyzePayload(bankniftyData, 'BANKNIFTY');
    } catch (err) {
      console.error(`Failed BANKNIFTY option chain fetch:`, err);
    }

    // Test FINNIFTY
    console.log('\n--- FINNIFTY Options Chain ---');
    await delay(1000);
    try {
      const finniftyData = await fetchOptionChain(cookies, 'FINNIFTY');
      const finniftyPath = path.join('scratch', 'nse_optionchain_FINNIFTY.json');
      fs.writeFileSync(finniftyPath, JSON.stringify(finniftyData, null, 2));
      console.log(`Saved FINNIFTY option chain to ${finniftyPath} (Size: ${(fs.statSync(finniftyPath).size / 1024).toFixed(2)} KB)`);
      analyzePayload(finniftyData, 'FINNIFTY');
    } catch (err) {
      console.error(`Failed FINNIFTY option chain fetch:`, err);
    }

    // Test RELIANCE (Equity)
    console.log('\n--- RELIANCE Equity Options Chain ---');
    await delay(1000);
    try {
      const relianceData = await fetchOptionChain(cookies, 'RELIANCE', true);
      const reliancePath = path.join('scratch', 'nse_optionchain_RELIANCE.json');
      fs.writeFileSync(reliancePath, JSON.stringify(relianceData, null, 2));
      console.log(`Saved RELIANCE option chain to ${reliancePath} (Size: ${(fs.statSync(reliancePath).size / 1024).toFixed(2)} KB)`);
      analyzePayload(relianceData, 'RELIANCE');
    } catch (err) {
      console.error(`Failed RELIANCE option chain fetch:`, err);
    }

    // Test alternative endpoint if possible (v3 etc)
    console.log('\n--- Checking alternative endpoints ---');
    await delay(500);
    try {
      const v3Url = 'https://www.nseindia.com/api/option-chain-v3?symbol=NIFTY';
      console.log(`Testing: GET ${v3Url}`);
      const v3Resp = await fetch(v3Url, {
        headers: {
          'User-Agent': CHROME_UA,
          'Referer': 'https://www.nseindia.com/option-chain',
          'Cookie': cookies,
        }
      });
      console.log(`Alternative v3 endpoint response status: ${v3Resp.status}`);
    } catch (err) {
      console.log(`Alternative v3 check failed: ${err.message}`);
    }

  } catch (err) {
    console.error('Handshake or initialization error:', err);
  }
}

function analyzePayload(json, symbol) {
  if (!json) {
    console.log('No payload to analyze.');
    return;
  }
  
  const keys = Object.keys(json);
  console.log(`Top-level keys: ${keys.join(', ')}`);
  
  const records = json.records || {};
  const filtered = json.filtered || {};
  
  console.log(`records underlyingValue: ${records.underlyingValue} (Type: ${typeof records.underlyingValue})`);
  console.log(`records timestamp: ${records.timestamp} (Type: ${typeof records.timestamp})`);
  console.log(`records expiryDates: ${records.expiryDates?.length} expiries (Format example: "${records.expiryDates?.[0]}")`);
  console.log(`records data length: ${records.data?.length} rows`);
  
  console.log(`filtered underlyingValue: ${filtered.underlyingValue} (Type: ${typeof filtered.underlyingValue})`);
  console.log(`filtered data length: ${filtered.data?.length} rows`);
  
  if (records.data && records.data.length > 0) {
    const sampleRow = records.data[0];
    console.log(`Sample data row keys: ${Object.keys(sampleRow).join(', ')}`);
    console.log(`Sample row values: strikePrice=${sampleRow.strikePrice}, expiryDate=${sampleRow.expiryDate}`);
    
    if (sampleRow.CE) {
      console.log(`CE keys: ${Object.keys(sampleRow.CE).join(', ')}`);
      console.log(`CE openInterest: ${sampleRow.CE.openInterest} (${typeof sampleRow.CE.openInterest})`);
      console.log(`CE changeinOpenInterest: ${sampleRow.CE.changeinOpenInterest} (${typeof sampleRow.CE.changeinOpenInterest})`);
      console.log(`CE impliedVolatility: ${sampleRow.CE.impliedVolatility} (${typeof sampleRow.CE.impliedVolatility})`);
      console.log(`CE totalTradedVolume: ${sampleRow.CE.totalTradedVolume} (${typeof sampleRow.CE.totalTradedVolume})`);
    } else {
      console.log('CE object is missing on first records.data row');
    }
    
    if (sampleRow.PE) {
      console.log(`PE keys: ${Object.keys(sampleRow.PE).join(', ')}`);
    } else {
      console.log('PE object is missing on first records.data row');
    }

    // Check OTM nullability/presence of values
    // Find some rows where CE or PE is OTM or deep in/out, check if they have null/0/missing fields
    let ceNullsFound = false;
    let peNullsFound = false;
    for (const row of records.data) {
      if (row.CE && row.CE.impliedVolatility === 0) ceNullsFound = true;
      if (row.PE && row.PE.impliedVolatility === 0) peNullsFound = true;
    }
    console.log(`Has any CE impliedVolatility = 0 or missing? ${ceNullsFound}`);
    console.log(`Has any PE impliedVolatility = 0 or missing? ${peNullsFound}`);
  }
}

main();
