import fs from 'node:fs';
import path from 'node:path';

const files = [
  'nse_bulk_deals_sample.json',
  'nse_block_deals_sample.json',
  'nse_short_selling_sample.json',
  'nse_bulk_deals_history_april2026.json',
  'nse_bulk_deals_history_may2025.json',
  'nse_bulk_deals_weekend.json'
];

for (const file of files) {
  const filePath = path.join('scratch', file);
  if (!fs.existsSync(filePath)) {
    console.log(`File ${file} does not exist.`);
    continue;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const payload = JSON.parse(content);
  const data = payload.data || [];
  
  console.log(`\n--- Analysis of ${file} (rowCount: ${data.length}) ---`);
  if (data.length === 0) {
    console.log('No rows.');
    continue;
  }
  
  const first = data[0];
  console.log('Fields present:', Object.keys(first).join(', '));
  
  // Extract unique dates
  const dates = new Set();
  for (const row of data) {
    // Check fields for date
    const dateVal = row.BD_DT_DATE || row.CH_DATE || row.date || row.Date;
    if (dateVal) dates.add(dateVal);
  }
  
  console.log('Unique dates in payload:', Array.from(dates));
  
  // Inspect a sample row
  console.log('Sample row:', JSON.stringify(first, null, 2));
  
  // Check for duplicates
  const rowStrings = data.map(r => JSON.stringify(r));
  const uniqueRows = new Set(rowStrings);
  console.log(`Duplicate rows check: total=${data.length}, unique=${uniqueRows.size}`);
  if (data.length !== uniqueRows.size) {
    console.log('WARNING: Found duplicate rows! Printing one duplicate example:');
    const counts = {};
    for (const rs of rowStrings) {
      counts[rs] = (counts[rs] || 0) + 1;
    }
    for (const [rs, count] of Object.entries(counts)) {
      if (count > 1) {
        console.log(`  Count ${count}: ${rs}`);
        break;
      }
    }
  }
}
