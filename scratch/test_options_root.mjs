const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testOptions() {
  try {
    // 1. Visit root page to get cookies
    const sessionUrl = 'https://www.nseindia.com/';
    console.log(`[Handshake] Fetching ${sessionUrl}...`);
    const sessionResp = await fetch(sessionUrl, {
      headers: { 'User-Agent': CHROME_UA }
    });
    
    const setCookies = sessionResp.headers.getSetCookie?.() ?? [];
    const cookiesString = setCookies.map(c => c.split(';')[0].trim()).join('; ');
    console.log(`[Handshake] Captured cookies: "${cookiesString}"`);

    // 2. Fetch option chain indices
    const dataUrl = 'https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY';
    console.log(`[Fetch] Fetching ${dataUrl}...`);
    const dataResp = await fetch(dataUrl, {
      headers: {
        'User-Agent': CHROME_UA,
        'Referer': 'https://www.nseindia.com/option-chain',
        'Cookie': cookiesString,
      }
    });
    
    console.log(`[Fetch] Status: ${dataResp.status}`);
    const text = await dataResp.text();
    console.log(`[Fetch] Response Length: ${text.length}`);
    console.log(`[Fetch] Response: ${text.slice(0, 300)}`);
  } catch (err) {
    console.error(err);
  }
}

testOptions();
