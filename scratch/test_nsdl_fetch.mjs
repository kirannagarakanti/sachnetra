const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testNsdlFetch() {
  try {
    const url = 'https://www.fpi.nsdl.co.in/web/Reports/Latest.aspx';
    const resp = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA }
    });
    console.log(`NSDL Latest.aspx Status: ${resp.status}`);
    const text = await resp.text();
    console.log(`HTML Length: ${text.length}`);
    
    // Look for form, inputs, viewstate, or tables
    const viewstatePresent = text.includes('__VIEWSTATE');
    const tablePresent = text.includes('<table') || text.includes('<TABLE');
    console.log(`__VIEWSTATE present: ${viewstatePresent}`);
    console.log(`Table present: ${tablePresent}`);
    
    // Print first 500 characters and some script links
    console.log(`Snippet:\n${text.substring(0, 1000)}`);
  } catch (err) {
    console.error(`Error:`, err);
  }
}

testNsdlFetch();
