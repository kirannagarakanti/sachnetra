import fs from 'fs';
import path from 'path';

async function downloadFile(url, destPath) {
  console.log(`Downloading ${url} to ${destPath}...`);
  const headers = {
    'User-Agent': 'Python-urllib/3.13',
    'Accept': '*/*'
  };
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  const buffer = await res.arrayBuffer();
  
  // Verify it is not HTML
  const snippet = Buffer.from(buffer).subarray(0, 100).toString('utf8');
  if (snippet.includes('<!DOCTYPE html>') || snippet.includes('<html>')) {
    throw new Error(`Failed to download ${url}: Downloaded file is HTML challenge page!`);
  }
  
  fs.writeFileSync(destPath, Buffer.from(buffer));
  console.log(`Saved ${destPath} (${buffer.byteLength} bytes)`);
}

async function main() {
  try {
    // 1. Full WSS XLSX
    const fullXlsxUrl = 'https://rbidocs.rbi.org.in/rdocs/Wss/DOCs/WSS15052026_ENC28ED88E43084D2983CC3A42889E7128.XLSX';
    await downloadFile(fullXlsxUrl, 'scratch/rbi_wss_sample.xlsx');

    // 2. Full WSS PDF
    const fullPdfUrl = 'https://rbidocs.rbi.org.in/rdocs/Wss/PDFs/WSS15052026_ENC28ED88E43084D2983CC3A42889E7128.PDF';
    await downloadFile(fullPdfUrl, 'scratch/rbi_wss_sample.pdf');

    // 3. Table 4 (Scheduled Commercial Banks - Business in India) XLSX
    const t4XlsxUrl = 'https://rbidocs.rbi.org.in/rdocs/Wss/DOCs/4T_150520261B16EB49E47E4F0C960DBF1EE39C1BF2.XLSX';
    await downloadFile(t4XlsxUrl, 'scratch/rbi_wss_t4_sample.xlsx');

    // 4. Table 4 (Scheduled Commercial Banks - Business in India) PDF
    const t4PdfUrl = 'https://rbidocs.rbi.org.in/rdocs/Wss/PDFs/4T_150520261B16EB49E47E4F0C960DBF1EE39C1BF2.PDF';
    await downloadFile(t4PdfUrl, 'scratch/rbi_wss_t4_sample.pdf');

    console.log('All downloads completed successfully!');
  } catch (err) {
    console.error('Download failed:', err);
  }
}

main();
