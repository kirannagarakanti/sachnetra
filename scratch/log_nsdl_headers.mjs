const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function logHeaders() {
  try {
    const url = 'https://www.fpi.nsdl.co.in/web/Reports/Archive.aspx';
    const resp = await fetch(url, {
      headers: { 
        'User-Agent': CHROME_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    console.log(`Status: ${resp.status}`);
    console.log('Response Headers:');
    for (const [key, value] of resp.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
  } catch (err) {
    console.error(err);
  }
}

logHeaders();
