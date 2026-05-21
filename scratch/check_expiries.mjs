import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('scratch/nse_optionchain_NIFTY.json', 'utf8'));

const expiries = new Set();
for (const row of data.records.data) {
  expiries.add(row.expiryDates);
}

console.log('Unique expiryDates values in records.data:', Array.from(expiries));
