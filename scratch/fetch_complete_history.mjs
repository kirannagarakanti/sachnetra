import fs from 'fs';

async function fetchComplete() {
  const years = [
    '2026-27', // future/current
    '2025-26',
    '2024-25',
    '2023-24',
    '2022-23',
    '2021-22',
    '2020-21',
    '2019-20',
    '2018-19',
    '2017-18',
    '2016-17',
    '2015-16'
  ];
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.npci.org.in/product/netc/product-statistics'
  };

  for (const year of years) {
    const url = `https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-fas-tag-statistics&year_range=${year}&excel_type=monthly&page_no=1&page_size=20&locale=en`;
    try {
      const res = await fetch(url, { headers });
      if (res.status === 200) {
        const body = await res.json();
        const results = body.data?.results || [];
        console.log(`Year ${year}: status ${res.status}, found ${results.length} records. Total count: ${body.data?.totalCount}`);
        if (results.length > 0) {
          fs.writeFileSync(`scratch/fastag_${year.replace('-', '_')}.json`, JSON.stringify(body, null, 2));
        }
      } else {
        console.log(`Year ${year}: status ${res.status}`);
      }
    } catch (err) {
      console.error(`Error for ${year}:`, err.message);
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

fetchComplete();
