import { execSync } from 'child_process';

function run() {
  const url = 'https://webapi.grid-india.in/api/v1/file/get-period';
  const body = {
    _source: 'GRDW',
    _fileType: 'F_PG00403'
  };
  
  console.log(`POSTing to ${url} using curl.exe...`);
  try {
    const cmd = `curl.exe -s -k -X POST -H "Content-Type: application/json" -d "${JSON.stringify(body).replace(/"/g, '\\"')}" ${url}`;
    const response = execSync(cmd, { encoding: 'utf-8' });
    console.log("Response:", response);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

run();
