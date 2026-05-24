async function testReachability() {
  const urls = [
    'https://www.npci.org.in',
    'https://www.npci.org.in/what-we-do/netc-fastag/product-statistics',
    'https://ihmcl.co.in',
    'https://nhai.gov.in'
  ];

  for (const url of urls) {
    console.log(`\nTesting: ${url}`);
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    
    try {
      const start = Date.now();
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });
      const duration = Date.now() - start;
      console.log(`Success in ${duration}ms. Status: ${res.status}`);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Timeout after 5000ms');
      } else {
        console.log('Error:', err.message);
      }
    } finally {
      clearTimeout(id);
    }
  }
}

testReachability();
