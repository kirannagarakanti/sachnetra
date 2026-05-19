const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testPageTypes() {
  const dateStr = '18/05/2026';
  
  for (let pt = 1; pt <= 4; pt++) {
    console.log(`\n--- Testing pageType=${pt} ---`);
    try {
      const apiUrl = `https://api.bseindia.com/BseIndiaAPI/api/StockpricesearchData/w?MonthDate=${encodeURIComponent(dateStr)}&Scode=&Seg=C&YearDate=${encodeURIComponent(dateStr)}&pageType=${pt}&rbType=D`;
      const resp = await fetch(apiUrl, {
        headers: {
          'User-Agent': CHROME_UA,
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.bseindia.com/markets/equity/EQReports/categorywise_turnover',
          'Origin': 'https://www.bseindia.com'
        }
      });
      
      if (resp.ok) {
        const data = await resp.json();
        console.log(`Status: OK`);
        console.log(`Title: ${data.Title}`);
        if (data.CatStockData && data.CatStockData.length > 0) {
          console.log(`CatStockData keys:`, Object.keys(data.CatStockData[0]));
          console.log(`Sample CatStockData:`, JSON.stringify(data.CatStockData.slice(0, 1), null, 2));
        } else {
          console.log('CatStockData is empty or null.');
        }
      } else {
        console.log(`Status: HTTP ${resp.status}`);
      }
    } catch (err) {
      console.error(`Failed:`, err.message);
    }
  }
}

testPageTypes().catch(console.error);
