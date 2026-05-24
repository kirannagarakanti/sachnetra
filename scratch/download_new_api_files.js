import { execSync } from 'child_process';
import fs from 'fs';

function download(url, dest) {
  console.log(`Downloading ${url} -> ${dest}...`);
  try {
    execSync(`curl.exe -s -k -o "${dest}" "${url}"`);
    if (fs.existsSync(dest)) {
      const stats = fs.statSync(dest);
      console.log(`Saved ${dest} (${stats.size} bytes)`);
    } else {
      console.log(`Failed to save ${dest}`);
    }
  } catch (err) {
    console.error(`Error downloading ${url}: ${err.message}`);
  }
}

function run() {
  const xlsUrl = 'https://webcdn.grid-india.in/files/grdw/2026/05/23.05.26_NLDC_PSP_282.xls';
  const pdfUrl = 'https://webcdn.grid-india.in/files/grdw/2026/05/23.05.26_NLDC_PSP_839.pdf';
  
  download(xlsUrl, 'scratch/posoco_psp_latest_2026.xls');
  download(pdfUrl, 'scratch/posoco_psp_latest_2026.pdf');
}

run();
