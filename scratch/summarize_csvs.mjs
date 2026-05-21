import * as fs from 'node:fs';
import * as path from 'node:path';

const scratchDir = 'scratch';
const files = fs.readdirSync(scratchDir).filter(f => f.startsWith('bis_ws_') && f.endsWith('.csv'));

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

let mdOutput = `# BIS India Data Inventory Summary\n\n`;

for (const file of files) {
  const filePath = path.join(scratchDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    mdOutput += `## Dataset: ${file}\nNo data found.\n\n`;
    continue;
  }
  
  const headers = parseCSVLine(lines[0]);
  const timeIdx = headers.indexOf('TIME_PERIOD');
  const valIdx = headers.indexOf('OBS_VALUE');
  
  const keyDimensions = [];
  for (let i = 0; i < headers.length; i++) {
    if (i !== timeIdx && i !== valIdx) {
      keyDimensions.push({ name: headers[i], index: i });
    }
  }
  
  const seriesMap = new Map();
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (vals.length < headers.length) continue;
    
    const keyParts = keyDimensions.map(kd => vals[kd.index]);
    const seriesKey = keyParts.join('.');
    
    if (!seriesMap.has(seriesKey)) {
      seriesMap.set(seriesKey, {
        keyParts,
        dimensionValues: Object.fromEntries(keyDimensions.map(kd => [kd.name, vals[kd.index]])),
        rows: []
      });
    }
    
    seriesMap.get(seriesKey).rows.push({
      time: vals[timeIdx],
      val: vals[valIdx]
    });
  }
  
  mdOutput += `## Dataset: ${file}\n`;
  mdOutput += `- **Headers**: \`${headers.join(', ')}\`\n`;
  mdOutput += `- **Total Rows**: ${lines.length - 1}\n`;
  mdOutput += `- **Unique Series**: ${seriesMap.size}\n\n`;
  mdOutput += `| Series Key | Dimensions | Obs (Non-NaN) | Date Range | Start/End Val |\n`;
  mdOutput += `| --- | --- | --- | --- | --- |\n`;
  
  for (const [sKey, sData] of seriesMap) {
    sData.rows.sort((a, b) => a.time.localeCompare(b.time));
    const nonNaRows = sData.rows.filter(r => r.val !== 'NaN' && r.val !== '');
    const firstRow = nonNaRows[0] || sData.rows[0];
    const lastRow = nonNaRows[nonNaRows.length - 1] || sData.rows[sData.rows.length - 1];
    
    const dimsStr = Object.entries(sData.dimensionValues)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
      
    const dateRange = firstRow && lastRow ? `${firstRow.time} to ${lastRow.time}` : 'N/A';
    const valRange = firstRow && lastRow ? `${firstRow.val} / ${lastRow.val}` : 'N/A';
    
    mdOutput += `| \`${sKey}\` | \`${dimsStr}\` | ${sData.rows.length} (${nonNaRows.length}) | ${dateRange} | ${valRange} |\n`;
  }
  mdOutput += `\n`;
}

fs.writeFileSync(path.join(scratchDir, 'csv_summary.md'), mdOutput, 'utf8');
console.log(`Saved summary to scratch/csv_summary.md`);
