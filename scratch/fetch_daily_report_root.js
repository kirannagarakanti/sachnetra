import fs from 'fs';

async function run() {
  const url = 'https://report.grid-india.in/index.php?p=Daily+Report';
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log(`Status: ${res.status}`);
    const html = await res.text();
    fs.writeFileSync('scratch/posoco_daily_report_root.html', html);
    
    // Find all folders
    const matches = [...html.matchAll(/\?p=[^"'>\s]+/g)];
    const folders = [...new Set(matches.map(m => decodeURIComponent(m[0].split('=')[1])))];
    console.log("Folders in Daily Report root:");
    folders.forEach(f => console.log(`  - ${f}`));
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

run();
