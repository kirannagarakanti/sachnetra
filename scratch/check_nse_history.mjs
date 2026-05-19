const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function checkNseLength() {
  try {
    const sessionUrl = 'https://www.nseindia.com/';
    const sessionResp = await fetch(sessionUrl, {
      headers: { 'User-Agent': CHROME_UA }
    });
    const cookies = sessionResp.headers.get('set-cookie');

    const dataUrl = 'https://www.nseindia.com/api/fiidiiTradeReact';
    const dataResp = await fetch(dataUrl, {
      headers: {
        'User-Agent': CHROME_UA,
        'Referer': 'https://www.nseindia.com/reports/fii-dii',
        'Cookie': cookies || '',
      }
    });
    
    if (dataResp.ok) {
      const json = await dataResp.json();
      console.log(`NSE API returned array of length: ${json.length}`);
      // Find all unique dates
      const uniqueDates = [...new Set(json.map(item => item.date))];
      console.log(`Unique dates in response (${uniqueDates.length}):`, uniqueDates);
      console.log(`Sample data:`, json.slice(0, 4));
    } else {
      console.log(`Failed to fetch NSE data: HTTP ${dataResp.status}`);
    }
  } catch (err) {
    console.error(err);
  }
}

checkNseLength();
