import { execSync } from 'child_process';

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
      console.log(`Year ${year} Month ${month}: Total Files = ${data.retData.length} | Has XLS = ${hasXls}`);
    } else {
      console.log(`Year ${year} Month ${month}: No files found.`);
    }
  } catch (err) {
    console.error(`Year ${year} Month ${month} failed: ${err.message}`);
  }
}

// Check around April 2023
checkMonth('2023-24', '04'); // April 2023
checkMonth('2022-23', '03'); // March 2023
checkMonth('2022-23', '04'); // April 2022
