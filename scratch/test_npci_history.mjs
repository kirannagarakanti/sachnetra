import fs from 'fs';

async function testHistory() {
  const years = ['2025-26', '2024-25', '2023-24', '2022-23', '2021-22', '2020-21', '2019-20', '2018-19'];
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.npci.org.in/product/netc/product-statistics'
  };

  for (const year of years) {
    const url = `https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-fas-tag-statistics&year_range=${year}&excel_type=monthly&page_no=1&page_size=10&locale=en`;
    try {
      console.log(`Fetching year: ${year}...`);
      const res = await fetch(url, { headers });
      console.log(`Status for ${year}:`, res.status);
      if (res.status === 200) {
        const body = await res.json();
        const results = body.data?.results || [];
        console.log(`Found ${results.length} records for ${year}.`);
        if (results.length > 0) {
          const sample = results[0];
          console.log(`Sample month: ${sample.month} | Vol: ${sample.volume_in_mn} | Amt: ${sample.amount_in_cr}`);
          fs.writeFileSync(`scratch/fastag_${year.replace('-', '_')}.json`, JSON.stringify(body, null, 2));
        } else {
          console.log(`Empty results for ${year}`);
        }
      } else {
        console.log(`Failed to fetch ${year}. Text:`, await res.text());
      }
    } catch (err) {
      console.error(`Error for ${year}:`, err.message);
    }
    // Polite delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

testHistory();
