const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testEndpoints() {
  const dateStr = '18/05/2026';
  const urls = [
    `https://api.bseindia.com/BseIndiaAPI/api/FiiDii/w?Date=${encodeURIComponent(dateStr)}`,
    `https://api.bseindia.com/BseIndiaAPI/api/FiiDiiData/w?Date=${encodeURIComponent(dateStr)}`,
    `https://api.bseindia.com/BseIndiaAPI/api/FiiDiiData/w`,
    `https://api.bseindia.com/BseIndiaAPI/api/FiiDii/w`,
  ];
  
  for (const url of urls) {
    console.log(`\nFetching: ${url}`);
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': CHROME_UA,
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.bseindia.com/'
        }
      });
      console.log(`Status: HTTP ${resp.status}`);
      if (resp.ok) {
        const text = await resp.text();
        console.log(`Response length: ${text.length}`);
        console.log(`Body preview: ${text.slice(0, 300)}`);
      }
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

testEndpoints().catch(console.error);
