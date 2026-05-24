async function run() {
  const indexUrl = 'https://www.npci.org.in/product/netc/product-statistics';
  const jsUrl = 'https://www.npci.org.in/static/js/main.bcb5891c.js';
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive'
  };

  try {
    console.log('Step 1: Fetching index page to get cookie...');
    const res1 = await fetch(indexUrl, { headers });
    console.log('Index status:', res1.status);
    const cookies = res1.headers.get('set-cookie');
    console.log('Cookies received:', cookies);

    if (!cookies) {
      console.log('No cookies received, using fallback...');
    }

    const nextHeaders = {
      ...headers,
      'Accept': '*/*',
      'Referer': indexUrl
    };
    if (cookies) {
      // Extract the TS cookie
      const tsCookie = cookies.split(';')[0];
      nextHeaders['Cookie'] = tsCookie;
    }

    console.log('\nStep 2: Fetching JS with cookies...');
    const res2 = await fetch(jsUrl, { headers: nextHeaders });
    console.log('JS status:', res2.status);
    console.log('JS Content-Type:', res2.headers.get('content-type'));
    const text = await res2.text();
    console.log('JS length:', text.length);
    console.log('JS snippet:', text.slice(0, 1000));
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
