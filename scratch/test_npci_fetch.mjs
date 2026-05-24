async function testFetch() {
  const url = 'https://www.npci.org.in/what-we-do/netc-fastag/product-statistics';
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    const res = await fetch(url, { headers });
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log('Length:', text.length);
    console.log('Snippet:', text.slice(0, 1000));
  } catch (err) {
    console.error('Error fetching NPCI:', err);
  }
}

testFetch();
