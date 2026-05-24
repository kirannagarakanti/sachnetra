async function testCurrentMonth() {
  const url = 'https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-daily-statistics&year=2026&month=May&excel_type=daily&page_no=1&page_size=50&locale=en';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.npci.org.in/product/netc/product-statistics'
  };

  try {
    console.log('Fetching May 2026 daily statistics (current month)...');
    const res = await fetch(url, { headers });
    console.log('Status:', res.status);
    if (res.status === 200) {
      const body = await res.json();
      const results = body.data?.results || [];
      console.log(`Found ${results.length} rows for May 2026.`);
      if (results.length > 0) {
        console.log('First row:', JSON.stringify(results[0]));
        console.log('Last few rows:');
        for (let i = Math.max(0, results.length - 5); i < results.length; i++) {
          console.log(`- Row ${i}:`, JSON.stringify(results[i]));
        }
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testCurrentMonth();
