import fs from 'fs';

async function checkAndDownload(dateStr, suffix) {
  const url = 'https://report.grid-india.in/psp_report.php';
  console.log(`Checking date ${dateStr}...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: new URLSearchParams({ selected_date: dateStr })
    });
    if (res.status !== 200) {
      console.log(`Failed to fetch for date ${dateStr}, status: ${res.status}`);
      return;
    }
    const html = await res.text();
    // Find all links matching ./ReportData/...
    const matches = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    const pspFiles = matches.filter(href => href.includes('NLDC_PSP'));
    console.log(`For ${dateStr}, found files:`, pspFiles);
    for (const f of pspFiles) {
      const fullUrl = f.startsWith('.') ? `https://report.grid-india.in${f.slice(1)}` : f;
      const ext = f.endsWith('.xls') ? '.xls' : '.pdf';
      const destPath = `scratch/posoco_psp_${suffix}${ext}`;
      console.log(`Downloading ${fullUrl} -> ${destPath}...`);
      const fileRes = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (fileRes.status === 200) {
        const buf = await fileRes.arrayBuffer();
        fs.writeFileSync(destPath, Buffer.from(buf));
        console.log(`Saved ${destPath} (${buf.byteLength} bytes)`);
      } else {
        console.log(`Failed to download ${fullUrl}, status: ${fileRes.status}`);
      }
    }
  } catch (err) {
    console.error(`Error checking/downloading for ${dateStr}: ${err.message}`);
  }
}

async function run() {
  await checkAndDownload('2025-01-15', '2025_01_15');
  await checkAndDownload('2024-06-15', '2024_06_15');
}

run();
