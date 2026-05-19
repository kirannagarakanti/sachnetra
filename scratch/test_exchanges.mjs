const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testNSE() {
  console.log('Testing NSE...');
  try {
    // Attempt session cookie collection first
    const sessionUrl = 'https://www.nseindia.com/';
    const sessionResp = await fetch(sessionUrl, {
      headers: { 'User-Agent': CHROME_UA }
    });
    console.log(`NSE Main Page: HTTP ${sessionResp.status}`);
    const cookies = sessionResp.headers.get('set-cookie');
    console.log(`Cookies received: ${cookies ? 'yes' : 'no'}`);

    const dataUrl = 'https://www.nseindia.com/api/fiidiiTradeReact';
    const dataResp = await fetch(dataUrl, {
      headers: {
        'User-Agent': CHROME_UA,
        'Referer': 'https://www.nseindia.com/reports/fii-dii',
        'Cookie': cookies || '',
      }
    });
    console.log(`NSE Data API: HTTP ${dataResp.status}`);
    if (dataResp.ok) {
      const json = await dataResp.json();
      console.log('NSE Data Sample:', json.slice(0, 2));
    } else {
      const text = await dataResp.text();
      console.log(`NSE Data Error Body (first 100 chars): ${text.slice(0, 100)}`);
    }
  } catch (err) {
    console.error('NSE Test Failed:', err);
  }
}

async function testBSE() {
  console.log('\nTesting BSE...');
  try {
    const url = 'https://www.bseindia.com/markets/equity/EQReports/FII_DII.aspx';
    const resp = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA }
    });
    console.log(`BSE Page: HTTP ${resp.status}`);
    const text = await resp.text();
    console.log(`BSE Page HTML length: ${text.length}`);
  } catch (err) {
    console.error('BSE Test Failed:', err);
  }
}

async function run() {
  await testNSE();
  await testBSE();
}

run().catch(console.error);
