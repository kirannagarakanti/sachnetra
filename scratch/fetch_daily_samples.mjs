import fs from 'fs';

async function fetchDailySamples() {
  const samples = [
    { year: '2026', month: 'March' },
    { year: '2025', month: 'December' },
    { year: '2024', month: 'June' },
    { year: '2023', month: 'January' },
    { year: '2021', month: 'June' }
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.npci.org.in/product/netc/product-statistics'
  };

  for (const sample of samples) {
    const url = `https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-daily-statistics&year=${sample.year}&month=${sample.month}&excel_type=daily&page_no=1&page_size=50&locale=en`;
    try {
      console.log(`Fetching daily data for ${sample.month} ${sample.year}...`);
      const res = await fetch(url, { headers });
      console.log(`Status: ${res.status}`);
      if (res.status === 200) {
        const body = await res.json();
        const results = body.data?.results || [];
        console.log(`Found ${results.length} rows.`);
        if (results.length > 0) {
          const filePath = `scratch/fastag_daily_${sample.year}_${sample.month.toLowerCase()}.json`;
          fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
          console.log(`Saved to ${filePath}`);
          // Print first row
          console.log('Row 1:', JSON.stringify(results[0]));
          // Print last row
          console.log('Last Row:', JSON.stringify(results[results.length - 1]));
        }
      } else {
        console.log(`Error body:`, (await res.text()).slice(0, 200));
      }
    } catch (err) {
      console.error(`Failed to fetch:`, err.message);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

fetchDailySamples();
