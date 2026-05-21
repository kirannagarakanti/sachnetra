const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  const sessionUrl = 'https://www.nseindia.com/option-chain';
  console.log(`[Handshake] Fetching ${sessionUrl}...`);
  try {
    const sessionResp = await fetch(sessionUrl, {
      headers: {
        'User-Agent': CHROME_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    console.log(`Status: ${sessionResp.status} ${sessionResp.statusText}`);
    console.log('Headers:');
    for (const [k, v] of sessionResp.headers.entries()) {
      if (k.toLowerCase() === 'set-cookie') {
        console.log(`  ${k}: ${v}`);
      }
    }
    const setCookies = sessionResp.headers.getSetCookie?.() ?? [];
    console.log(`getSetCookie() length: ${setCookies.length}`);
    console.log('getSetCookie():', setCookies);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
