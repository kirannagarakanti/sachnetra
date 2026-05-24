import { execSync } from 'child_process';
import fs from 'fs';

function run() {
  const url = 'https://webapi.grid-india.in/api/v1/menu';
  const body = {
    _source: 'GRDW'
  };
  
  console.log(`POSTing to ${url} using curl.exe...`);
  try {
    const cmd = `curl.exe -s -k -X POST -H "Content-Type: application/json" -d "${JSON.stringify(body).replace(/"/g, '\\"')}" ${url}`;
    const response = execSync(cmd, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 });
    fs.writeFileSync('scratch/posoco_menu_content.json', response);
    console.log("Saved response to scratch/posoco_menu_content.json");
    
    const data = JSON.parse(response);
    if (data.retData) {
      console.log(`Found ${data.retData.length} menu items.`);
      // Let's filter for items containing "PSP" or "Daily" or "Report"
      console.log("\nFiltering for report-related menu items:");
      
      function printItems(items) {
        for (const item of items) {
          const title = item.Title_ || item.title_ || '';
          const name = item.Name_ || item.name_ || '';
          const code = item.Code_ || item.code_ || item.MenuCode || '';
          const path = item.Path_ || item.path_ || item.UrlPath || '';
          const params = item.Params_ || item.params_ || item.QueryParam || item.FileType || '';
          
          if (title.toLowerCase().includes('psp') || 
              title.toLowerCase().includes('daily') || 
              title.toLowerCase().includes('report') ||
              name.toLowerCase().includes('psp') ||
              code.toLowerCase().includes('psp')) {
            console.log(`- Title: "${title}" | Code: "${code}" | Path: "${path}" | Params/FileType: "${JSON.stringify(item)}"`);
          }
          if (item.children) {
            printItems(item.children);
          }
          if (item.ChildMenu) {
            printItems(item.ChildMenu);
          }
        }
      }
      
      printItems(data.retData);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

run();
