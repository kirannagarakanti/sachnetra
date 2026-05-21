import * as fs from 'node:fs';

const csv = fs.readFileSync('scratch/bis_ws_cbpol_india.csv', 'utf8');
const lines = csv.split('\n').filter(Boolean);

console.log('Daily (D.IN) latest 5 observations:');
const daily = lines.filter(l => l.startsWith('D,IN,')).slice(-10);
console.log(daily.join('\n'));

console.log('\nMonthly (M.IN) latest 5 observations:');
const monthly = lines.filter(l => l.startsWith('M,IN,')).slice(-10);
console.log(monthly.join('\n'));
