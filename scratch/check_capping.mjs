import fs from 'node:fs';
import path from 'node:path';

function analyzeCapping(fileName) {
  const filePath = path.join('scratch', fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`${fileName} does not exist.`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8')).data || [];
  console.log(`\nAnalysis of ${fileName}:`);
  console.log(`Total rows: ${data.length}`);
  
  const dateCounts = {};
  for (const row of data) {
    const d = row.BD_DT_DATE;
    dateCounts[d] = (dateCounts[d] || 0) + 1;
  }
  
  console.log('Rows per date:');
  for (const [date, count] of Object.entries(dateCounts)) {
    console.log(`  ${date}: ${count}`);
  }
}

analyzeCapping('nse_bulk_deals_history_april2026.json');
analyzeCapping('nse_bulk_deals_history_may2025.json');
