import fs from 'fs';

async function saveMayDaily() {
  const url = 'https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-daily-statistics&year=2026&month=May&excel_type=daily&page_no=1&page_size=50&locale=en';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.npci.org.in/product/netc/product-statistics'
  };

  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    fs.writeFileSync('scratch/fastag_latest_daily.json', JSON.stringify(data, null, 2));
    fs.writeFileSync('scratch/fastag_daily_2026_may.json', JSON.stringify(data, null, 2));
    console.log('Saved May 2026 daily data successfully.');
  } catch (err) {
    console.error('Error:', err);
  }
}

saveMayDaily();
