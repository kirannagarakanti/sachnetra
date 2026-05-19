const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testBseApi() {
  console.log('Testing BSE API fetch...');
  try {
    // 1. Visit bseindia homepage to get cookies (warm-up)
    const homeUrl = 'https://www.bseindia.com/';
    const homeResp = await fetch(homeUrl, {
      headers: { 'User-Agent': CHROME_UA }
    });
    console.log(`BSE Homepage: HTTP ${homeResp.status}`);
    const cookies = homeResp.headers.get('set-cookie');
    console.log(`Cookies received: ${cookies ? 'yes' : 'no'}`);

    // 2. Fetch the actual API endpoint
    const dateStr = '18/05/2026';
    const apiUrl = `https://api.bseindia.com/BseIndiaAPI/api/StockpricesearchData/w?MonthDate=${encodeURIComponent(dateStr)}&Scode=&Seg=C&YearDate=${encodeURIComponent(dateStr)}&pageType=1&rbType=D`;
    console.log(`Fetching API: ${apiUrl}`);
    
    const apiResp = await fetch(apiUrl, {
      headers: {
        'User-Agent': CHROME_UA,
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.bseindia.com/markets/equity/EQReports/categorywise_turnover',
        'Origin': 'https://www.bseindia.com',
        'Cookie': cookies || '',
      }
    });

    console.log(`BSE API Response: HTTP ${apiResp.status}`);
    if (apiResp.ok) {
      const data = await apiResp.json();
      console.log('BSE API JSON Response:', JSON.stringify(data, null, 2));
    } else {
      const text = await apiResp.text();
      console.log(`BSE API Error text (first 200 chars): ${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.error('BSE API Test Failed:', err);
  }
}

testBseApi().catch(console.error);
