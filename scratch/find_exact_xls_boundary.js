import { execSync } from 'child_process';

const months = ['04', '05', '06', '07', '08', '09', '10', '11', '12', '01', '02', '03'];

function checkMonth(year, month) {
  const url = 'https://webapi.grid-india.in/api/v1/file';
  const body = {
    _source: 'GRDW',
    _type: 'DAILY_PSP_REPORT',
    _fileDate: year,
    _month: month
  };
  
  try {
    const cmd = `curl.exe -s -k -X POST -H "Content-Type: application/json" -d "${JSON.stringify(body).replace(/"/g, '\\"')}" ${url}`;
    const response = execSync(cmd, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 });
    const data = JSON.parse(response);
    if (data.retData && data.retData.length > 0) {
      const hasXls = data.retData.some(f => (f.FilePath || '').toLowerCase().endsWith('.xls'));
      console.log(`Month ${month}: Files = ${data.retData.length} | Has XLS = ${hasXls}`);
    } else {
      console.log(`Month ${month}: No files.`);
    }
  } catch (err) {
    console.error(`Month ${month} failed: ${err.message}`);
  }
}

console.log("Scanning months in PeriodYear 2022-23...");
for (const month of months) {
  checkMonth('2022-23', month);
}
