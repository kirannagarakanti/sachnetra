import fs from 'fs';

async function run() {
  const url = 'https://grid-india.in/';
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log(`Status: ${res.status}`);
    const html = await res.text();
    fs.writeFileSync('scratch/posoco_home.html', html);
    
    // Find all links in the homepage HTML
    const links = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    console.log("Found links containing report, nldc, psp, daily, or systems:");
    const filteredLinks = [...new Set(links)].filter(l => 
      l.toLowerCase().includes('report') || 
      l.toLowerCase().includes('nldc') || 
      l.toLowerCase().includes('psp') || 
      l.toLowerCase().includes('daily') || 
      l.toLowerCase().includes('system')
    );
    filteredLinks.forEach(l => console.log(`  - ${l}`));
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

run();
