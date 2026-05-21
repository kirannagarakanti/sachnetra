const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scratch/nse_announcements_sample.json', 'utf8'));

const categories = new Set(data.map(d => d.desc));
console.log('NSE Categories (desc):', Array.from(categories));

const subjects = new Set(data.map(d => d.attchmntText));
console.log('Sample Subjects:', Array.from(subjects).slice(0, 5));

// Write these out for documentation
