import fs from 'node:fs';

const nifty = JSON.parse(fs.readFileSync('scratch/nse_optionchain_NIFTY.json', 'utf8'));

console.log('RECORDS.DATA[0]:');
console.log(JSON.stringify(nifty.records.data[0], null, 2));

console.log('\nFILTERED.DATA[0]:');
console.log(JSON.stringify(nifty.filtered.data[0], null, 2));
