const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function inspectBsePage() {
  const url = 'https://www.bseindia.com/markets/equity/EQReports/categorywise_turnover';
  console.log(`Fetching page: ${url}`);
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': CHROME_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    console.log(`Status: ${resp.status}`);
    const html = await resp.text();
    console.log(`HTML Length: ${html.length}`);
    
    // Find all script tags src attributes
    const scriptSrcMatches = html.match(/<script[^>]+src=["']([^"']+)["']/gi) || [];
    console.log(`Found ${scriptSrcMatches.length} external scripts:`);
    scriptSrcMatches.slice(0, 15).forEach(s => console.log('  ', s));

    // Find all inline scripts
    const inlineScripts = html.match(/<script>([\s\S]*?)<\/script>/gi) || [];
    console.log(`Found ${inlineScripts.length} inline script tags.`);
    inlineScripts.slice(0, 5).forEach((s, idx) => {
      console.log(`\nInline Script ${idx}:`);
      console.log(s.slice(0, 400));
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
}

inspectBsePage().catch(console.error);
