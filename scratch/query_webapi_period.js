import { execSync } from 'child_process';

function run() {
  const url = 'https://webapi.grid-india.in/api/v1/file/get-period';
  const body = {
    _source: 'GRDW',
    _fileType: 'DAILY_PSP_REPORT'
  };
  
  console.log(`POSTing to ${url} using curl.exe...`);
  try {
    const cmd = `curl.exe -s -k -X POST -H "Content-Type: application/json" -d "${JSON.stringify(body).replace(/"/g, '\\"')}" ${url}`;
    const response = execSync(cmd, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 });
    console.log("Response:");
    console.log(JSON.stringify(JSON.parse(response), null, 2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

run();
