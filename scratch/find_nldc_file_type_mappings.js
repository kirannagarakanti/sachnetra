import fs from 'fs';

function run() {
  const content = fs.readFileSync('scratch/react_index.js', 'utf-8');
  
  // Let's search for "Daily PSP Report" or Zn and see where it maps to a type code (e.g. F_...)
  const keywords = ['"Daily PSP Report"', 'Daily PSP Report', 'Daily PSP', 'Zn'];
  
  console.log("Searching for mappings...");
  // Let's search for occurrences of F_ in relation to daily reports
  // Find all F_ codes
  const fCodes = [...content.matchAll(/"(F_[A-Za-z0-9_]+)"/g)].map(m => m[1]);
  const uniqueFCodes = [...new Set(fCodes)];
  console.log("Unique quoted F_ codes in the bundle:", uniqueFCodes);
  
  // For each F_ code, let's print its surrounding context
  for (const f of uniqueFCodes) {
    const idx = content.indexOf(f);
    if (idx !== -1) {
      console.log(`\nContext for "${f}":`);
      const start = Math.max(0, idx - 150);
      const end = Math.min(content.length, idx + 350);
      console.log(content.slice(start, end).replace(/\n/g, ' '));
    }
  }
}

run();
