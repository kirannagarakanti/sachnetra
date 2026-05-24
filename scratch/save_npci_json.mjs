import fs from 'fs';

async function saveJson() {
  const url = 'https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-fas-tag-statistics&year_range=2025-26&excel_type=monthly&page_no=1&page_size=10&locale=en';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.npci.org.in/product/netc/product-statistics'
  };

  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    fs.writeFileSync('scratch/fastag_latest.json', JSON.stringify(data, null, 2));
    fs.writeFileSync('scratch/fastag_2026_05_24.json', JSON.stringify(data, null, 2));
    console.log('Saved JSON data successfully to scratch/fastag_latest.json and scratch/fastag_2026_05_24.json');
  } catch (err) {
    console.error('Error:', err);
  }
}

saveJson();
