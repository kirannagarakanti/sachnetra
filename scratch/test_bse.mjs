const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testBSE() {
  console.log('Testing BSE...');
  try {
    const url = 'https://www.bseindia.com/markets/equity/EQReports/FII_DII.aspx';
    const resp = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA }
    });
    const html = await resp.text();
    console.log(`HTML Length: ${html.length}`);
    
    // Find all table tags
    const tableMatches = html.match(/<table[^>]*>/gi) || [];
    console.log(`Found ${tableMatches.length} table tags.`);
    
    // Log sections of HTML containing "FII" or "DII"
    const regex = /FII|DII/gi;
    let match;
    let count = 0;
    while ((match = regex.exec(html)) !== null && count < 5) {
      console.log(`Match at ${match.index}: ${html.slice(match.index - 50, match.index + 50).replace(/\s+/g, ' ')}`);
      count++;
    }
  } catch (err) {
    console.error('BSE Failed:', err);
  }
}

testBSE().catch(console.error);
