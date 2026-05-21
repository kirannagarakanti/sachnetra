import fs from 'node:fs';

const nifty = JSON.parse(fs.readFileSync('scratch/nse_optionchain_NIFTY.json', 'utf8'));
const reliance = JSON.parse(fs.readFileSync('scratch/nse_optionchain_RELIANCE.json', 'utf8'));

function checkMissing(data, name) {
  console.log(`\n--- Checking ${name} ---`);
  let rows = data.records.data;
  let missingCe = 0;
  let missingPe = 0;
  let nullFields = new Set();
  
  for (const r of rows) {
    if (!r.CE) {
      missingCe++;
    } else {
      for (const [k, v] of Object.entries(r.CE)) {
        if (v === null) nullFields.add(`CE.${k}`);
      }
    }
    if (!r.PE) {
      missingPe++;
    } else {
      for (const [k, v] of Object.entries(r.PE)) {
        if (v === null) nullFields.add(`PE.${k}`);
      }
    }
  }
  console.log(`Total rows: ${rows.length}`);
  console.log(`Rows missing CE: ${missingCe}`);
  console.log(`Rows missing PE: ${missingPe}`);
  console.log(`Null fields:`, Array.from(nullFields));
}

checkMissing(nifty, 'NIFTY');
checkMissing(reliance, 'RELIANCE');
