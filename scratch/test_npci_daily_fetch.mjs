async function testDaily() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.npci.org.in/product/netc/product-statistics'
  };

  const urls = [
    'https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-daily-statistics&year=2026&month=March&excel_type=daily&page_no=1&page_size=50&locale=en',
    'https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-daily-statistics&year_range=2026&month_range=March&excel_type=daily&page_no=1&page_size=50&locale=en',
    'https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-daily-statistics&year=2026&excel_type=daily&page_no=1&page_size=50&locale=en'
  ];

  for (const url of urls) {
    console.log(`\nFetching: ${url}`);
    try {
      const res = await fetch(url, { headers });
      console.log('Status:', res.status);
      if (res.status === 200) {
        const body = await res.json();
        console.log('Success! Results count:', body.data?.results?.length);
        if (body.data?.results?.length > 0) {
          console.log('Sample result:', JSON.stringify(body.data.results[0], null, 2));
          // Break early if we find a working one
          break;
        }
      } else {
        console.log('Text snippet:', (await res.text()).slice(0, 200));
      }
    } catch (err) {
      console.error('Error:', err.message);
    }
  }
}

testDaily();
