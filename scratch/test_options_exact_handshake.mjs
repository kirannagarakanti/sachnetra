const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testOptionsExact() {
  console.log('Warming up cookies on NSE Homepage...');
  try {
    const sessionUrl = 'https://www.nseindia.com/';
    const sessionResp = await fetch(sessionUrl, {
      headers: { 'User-Agent': CHROME_UA }
    });
    console.log(`NSE Main Page: HTTP ${sessionResp.status}`);
    const cookies = sessionResp.headers.get('set-cookie');
    console.log(`Raw Cookies:`, cookies);

    const dataUrl = 'https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY';
    console.log(`Fetching option chain indices...`);
    const dataResp = await fetch(dataUrl, {
      headers: {
        'User-Agent': CHROME_UA,
        'Referer': 'https://www.nseindia.com/option-chain',
        'Cookie': cookies || '',
      }
    });
    console.log(`NSE Data API: HTTP ${dataResp.status}`);
    const text = await dataResp.text();
    console.log(`Response length: ${text.length}`);
    console.log(`Response start: ${text.slice(0, 300)}`);
  } catch (err) {
    console.error('Exact test failed:', err);
  }
}

testOptionsExact();
