import { execSync } from 'child_process';
import fs from 'fs';

function run() {
  const url = 'https://webapi.grid-india.in/api/v1/file';
  const body = {
    _source: 'GRDW',
    _type: 'DAILY_PSP_REPORT',
    _fileDate: '2026-27',
    _month: '05' // May 2026
  };
  
  console.log(`POSTing to ${url} using curl.exe...`);
  try {
    const cmd = `curl.exe -s -k -X POST -H "Content-Type: application/json" -d "${JSON.stringify(body).replace(/"/g, '\\"')}" ${url}`;
    const response = execSync(cmd, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 });
    fs.writeFileSync('scratch/posoco_api_files.json', response);
    console.log("Saved response to scratch/posoco_api_files.json");
    
    const data = JSON.parse(response);
    console.log(`flagType: ${data.flagType}`);
    console.log(`retMessage: ${data.retMessage}`);
    if (data.retData) {
      console.log(`Found ${data.retData.length} files.`);
      console.log("First 5 files:");
      data.retData.slice(0, 5).forEach((f, i) => {
        console.log(`  File ${i + 1}:`, f);
      });
      console.log("Last 5 files:");
      data.retData.slice(-5).forEach((f, i) => {
        console.log(`  File ${i + 1}:`, f);
      });
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

run();
