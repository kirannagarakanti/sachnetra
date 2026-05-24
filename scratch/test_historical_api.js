import { execSync } from 'child_process';

function queryFiles(periodYear, month) {
  const url = 'https://webapi.grid-india.in/api/v1/file';
  const body = {
    _source: 'GRDW',
    _type: 'DAILY_PSP_REPORT',
    _fileDate: periodYear,
    _month: month
  };
  
  console.log(`\nPOSTing to ${url} for Year ${periodYear}, Month ${month} using curl.exe...`);
  try {
    const cmd = `curl.exe -s -k -X POST -H "Content-Type: application/json" -d "${JSON.stringify(body).replace(/"/g, '\\"')}" ${url}`;
    const response = execSync(cmd, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 });
    const data = JSON.parse(response);
    console.log(`flagType: ${data.flagType}`);
    console.log(`retMessage: ${data.retMessage}`);
    if (data.retData) {
      console.log(`Found ${data.retData.length} files.`);
      console.log("First 3 files in response:");
      data.retData.slice(0, 3).forEach((f, i) => {
        console.log(`  File ${i + 1}:`, {
          Id: f.Id,
          Title_: f.Title_,
          MimeType: f.MimeType,
          FilePath: f.FilePath,
          CreatedOn: f.CreatedOn
        });
      });
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

queryFiles('2024-25', '06'); // June 2024
queryFiles('2015-16', '05'); // May 2015
