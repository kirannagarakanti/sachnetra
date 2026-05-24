import fs from 'node:fs';
import path from 'node:path';

function checkDup(fileName) {
  const filePath = path.join('scratch', fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`${fileName} does not exist.`);
    return;
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const data = raw.data || [];
  console.log(`\nChecking duplicates in ${fileName} (total rows: ${data.length}):`);
  
  const seen = new Map();
  let dupCount = 0;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    // Composite key
    const key = `${row.BD_DT_DATE || row.SS_DATE}|${row.BD_SYMBOL || row.SS_SYMBOL}|${row.BD_CLIENT_NAME || ''}|${row.BD_BUY_SELL || ''}|${row.BD_QTY_TRD || row.SS_QTY}|${row.BD_TP_WATP || ''}`;
    if (seen.has(key)) {
      dupCount++;
      console.log(`Duplicate found!`);
      console.log(`  Row ${seen.get(key)}:`, JSON.stringify(data[seen.get(key)]));
      console.log(`  Row ${i}:`, JSON.stringify(row));
    } else {
      seen.set(key, i);
    }
  }
  console.log(`Total duplicate rows: ${dupCount}`);
}

checkDup('nse_bulk_deals_sample.json');
checkDup('nse_block_deals_sample.json');
checkDup('nse_short_selling_sample.json');
