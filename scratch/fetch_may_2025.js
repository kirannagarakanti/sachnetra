import fs from 'fs';

async function run() {
  const url = 'https://report.grid-india.in/index.php?p=Daily+Report/PSP+Report/2025-2026/May+2025';
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log(`Status: ${res.status}`);
    const html = await res.text();
    fs.writeFileSync('scratch/posoco_may_2025_index.html', html);
    // Find all .xls and .pdf files in the HTML
    const fileMatches = [...html.matchAll(/data-sort="([^"]+)"/g)].map(m => m[1]);
    console.log("Files/Folders in May 2025 index page:");
    const uniqueFiles = [...new Set(fileMatches)].filter(f => f.includes('NLDC_PSP'));
    console.log(`Found ${uniqueFiles.length} files. Listing first 10 and last 10:`);
    uniqueFiles.sort();
    console.log("First 10:");
    uniqueFiles.slice(0, 10).forEach(f => console.log(`  - ${f}`));
    console.log("Last 10:");
    uniqueFiles.slice(-10).forEach(f => console.log(`  - ${f}`));
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

run();
