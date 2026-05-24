import fs from 'fs';

async function run() {
  const url = 'https://report.grid-india.in/index.php?p=Daily+Report/PSP+Report';
  console.log(`Fetching ${url}...`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log(`Status: ${res.status}`);
    const html = await res.text();
    fs.writeFileSync('scratch/posoco_archive_index.html', html);
    console.log(`Saved HTML of length ${html.length} to scratch/posoco_archive_index.html`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

run();
