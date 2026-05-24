async function testTarget() {
  const url = 'https://www.npci.org.in/product/netc/product-statistics';
  try {
    console.log('Fetching redirect target...');
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'manual'
    });
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    if (res.status === 200) {
      const text = await res.text();
      console.log('Success! Text length:', text.length);
      console.log('Snippet:', text.slice(0, 1000));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testTarget();
