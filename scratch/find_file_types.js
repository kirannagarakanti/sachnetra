import fs from 'fs';

function run() {
  const content = fs.readFileSync('scratch/react_index.js', 'utf-8');
  
  // Find all matches for F_...
  const fMatches = [...content.matchAll(/F_[A-Za-z0-9_]+/g)].map(m => m[0]);
  console.log("Found F_ constants:");
  [...new Set(fMatches)].forEach(f => console.log(`  - ${f}`));
  
  // Find all matches for SOURCE:
  const sourcePos = content.indexOf('SOURCE:');
  if (sourcePos !== -1) {
    const start = Math.max(0, sourcePos - 100);
    const end = Math.min(content.length, sourcePos + 200);
    console.log("\nFound SOURCE definition snippet:");
    console.log(content.slice(start, end));
  } else {
    // search case-insensitively or differently
    const sourcePos2 = content.indexOf('source:');
    if (sourcePos2 !== -1) {
      console.log("\nFound source definition snippet:");
      console.log(content.slice(sourcePos2 - 100, sourcePos2 + 200));
    }
  }
  
  // Search for Y object again or find out where the report page is defined
  const reportKeys = ['Daily PSP Report', 'Daily PSP', 'PSP Report'];
  for (const k of reportKeys) {
    const idx = content.indexOf(k);
    if (idx !== -1) {
      console.log(`\nFound "${k}" at index ${idx}.`);
      console.log(content.slice(idx - 150, idx + 250).replace(/\n/g, ' '));
    }
  }
}

run();
