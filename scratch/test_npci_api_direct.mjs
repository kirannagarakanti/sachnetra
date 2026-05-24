async function testApi() {
  const url = 'https://www.npci.org.in/api/product-statistic/tab/detail?product_name=netc&tab_name=netc-fas-tag-statistics&year_range=2025-26&excel_type=monthly&page_no=1&page_size=10&locale=en';
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.npci.org.in/product/netc/product-statistics'
  };

  try {
    console.log('Fetching NPCI API directly...');
    const res = await fetch(url, { headers });
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log('Length:', text.length);
    console.log('Snippet:', text.slice(0, 1000));
  } catch (err) {
    console.error('Error fetching API:', err);
  }
}

testApi();
