import fs from 'fs';

async function run() {
  const url = 'https://report.grid-india.in/psp_report.php';
  const dateStr = '2025-05-15'; // A date we know should have a report based on the archive
  console.log(`POSTing to ${url} with selected_date=${dateStr}...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: new URLSearchParams({ selected_date: dateStr })
    });
    console.log(`Status: ${res.status}`);
    const html = await res.text();
    fs.writeFileSync('scratch/posoco_post_result.html', html);
    console.log(`Saved HTML of length ${html.length} to scratch/posoco_post_result.html`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

run();
