import fs from 'node:fs';
import path from 'node:path';

const scratchDir = 'scratch';
const files = fs.readdirSync(scratchDir).filter(f => f.startsWith('captured_api_') && f.endsWith('.json'));

let output = `Detailed inspection of captured JSON files:\n\n`;

for (const file of files) {
  const filePath = path.join(scratchDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let items = [];
    if (data.data && Array.isArray(data.data)) {
      items = data.data;
    } else if (Array.isArray(data)) {
      items = data;
    }
    
    if (items.length > 0) {
      const first = items[0];
      output += `- ${file}:\n`;
      output += `  Item count: ${items.length}\n`;
      output += `  First item type: ${typeof first}\n`;
      if (typeof first === 'object' && first !== null) {
        output += `  First item keys: ${Object.keys(first).join(', ')}\n`;
        output += `  First item JSON: ${JSON.stringify(first, null, 2).slice(0, 300)}\n`;
      } else {
        output += `  First item value: ${first}\n`;
      }
    } else {
      output += `- ${file}: empty or no items (top-level keys: ${Object.keys(data).join(', ')})\n`;
    }
  } catch (err) {
    output += `- ${file}: ERROR - ${err.message}\n`;
  }
  output += `\n------------------------------------\n\n`;
}

fs.writeFileSync(path.join(scratchDir, 'inspection_results_detailed.txt'), output, 'utf8');
console.log('Detailed results written to scratch/inspection_results_detailed.txt');
