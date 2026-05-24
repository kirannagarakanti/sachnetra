async function testHeaders() {
  const url = 'https://www.npci.org.in/what-we-do/netc-fastag/product-statistics';
  try {
    console.log('Fetching with redirect: manual...');
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'manual'
    });
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testHeaders();
