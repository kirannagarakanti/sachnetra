import fs from 'fs';

async function downloadFile(url, destPath) {
  console.log(`Downloading ${url} -> ${destPath}...`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (res.status !== 200) {
      console.log(`Failed to download, status: ${res.status}`);
      return false;
    }
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(buffer));
    console.log(`Successfully saved ${destPath} (${buffer.byteLength} bytes)`);
    return true;
  } catch (err) {
    console.error(`Error downloading ${url}: ${err.message}`);
    return false;
  }
}

async function run() {
  const xlsUrl = 'https://report.grid-india.in/ReportData/Daily%20Report/PSP%20Report/2025-2026/May%202025/15.05.25_NLDC_PSP.xls';
  const pdfUrl = 'https://report.grid-india.in/ReportData/Daily%20Report/PSP%20Report/2025-2026/May%202025/15.05.25_NLDC_PSP.pdf';

  await downloadFile(xlsUrl, 'scratch/posoco_psp_latest.xls');
  await downloadFile(pdfUrl, 'scratch/posoco_psp_latest.pdf');
}

run();
