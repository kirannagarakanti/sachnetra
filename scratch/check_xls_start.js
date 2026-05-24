import { execSync } from 'child_process';

const years = [
  '2024-25',
  '2023-24',
  '2022-23',
  '2021-22',
  '2020-21',
  '2019-20',
  '2018-19'
];

function checkXlsForYear(year) {
  const url = 'https://webapi.grid-india.in/api/v1/file';
  const body = {
    _source: 'GRDW',
    _type: 'DAILY_PSP_REPORT',
    _fileDate: year,
    _month: '05' // check May of that period
  };
  
  try {
    const cmd = `curl.exe -s -k -X POST -H "Content-Type: application/json" -d "${JSON.stringify(body).replace(/"/g, '\\"')}" ${url}`;
    const response = execSync(cmd, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 });
    const data = JSON.parse(response);
    if (data.retData && data.retData.length > 0) {
      const mimeTypes = [...new Set(data.retData.map(f => f.MimeType || ''))];
      const hasXls = data.retData.some(f => (f.FilePath || '').toLowerCase().endsWith('.xls') || (f.MimeType || '').includes('excel') || (f.MimeType || '').includes('xls'));
      console.log(`Year ${year} Month 05: Total Files = ${data.retData.length} | MimeTypes = ${JSON.stringify(mimeTypes)} | Has XLS = ${hasXls}`);
      if (hasXls) {
        const sampleXls = data.retData.find(f => (f.FilePath || '').toLowerCase().endsWith('.xls'));
        console.log(`  Sample XLS path: ${sampleXls.FilePath}`);
      }
    } else {
      console.log(`Year ${year} Month 05: No files found.`);
    }
  } catch (err) {
    console.error(`Year ${year} failed: ${err.message}`);
  }
}

console.log("Checking XLS availability for May across different years...");
for (const year of years) {
  checkXlsForYear(year);
}
