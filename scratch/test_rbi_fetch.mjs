import fs from 'fs';

async function main() {
  // Let's try to fetch a recent WSS release. Since today is May 21, 2026, the previous Friday is May 15, 2026.
  const url = 'https://www.rbi.org.in/Scripts/WSSViewDetail.aspx?TYPE=Basic&PARAM1=05/15/2026';
  console.log(`Fetching: ${url}`);
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  try {
    const res = await fetch(url, { headers });
    console.log(`Status: ${res.status} ${res.statusText}`);
    
    const body = await res.text();
    console.log(`Body length: ${body.length}`);
    
    fs.writeFileSync('scratch/wss_detail.html', body);
    console.log('Saved response to scratch/wss_detail.html');
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

main();
