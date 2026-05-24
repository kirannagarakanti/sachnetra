import { execSync } from 'child_process';
import fs from 'fs';

function run() {
  const url = 'https://grid-india.in/';
  console.log(`Fetching ${url} using curl.exe...`);
  try {
    const html = execSync(`curl.exe -s -k https://grid-india.in/`, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 });
    fs.writeFileSync('scratch/posoco_home.html', html);
    console.log(`Saved homepage of length ${html.length} to scratch/posoco_home.html`);
    
    // Parse links
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
