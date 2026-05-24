import fs from 'fs';

function run() {
  const content = fs.readFileSync('scratch/react_index.js', 'utf-8');
  
  // Find all URLs starting with https://webapi.grid-india.in
  const matches = [...content.matchAll(/https:\/\/webapi\.grid-india\.in\/[^"'\s`]+/g)].map(m => m[0]);
  console.log("Found webapi URLs:");
  [...new Set(matches)].forEach(url => console.log(`  - ${url}`));
  
  // Find all matches for api/v1/
  const apiMatches = [...content.matchAll(/\/api\/v1\/[^"'\s`]+/g)].map(m => m[0]);
  console.log("\nFound api/v1 paths:");
  [...new Set(apiMatches)].forEach(p => console.log(`  - ${p}`));
  
  // Search for the definition of Y (the object that holds Y.getAllMenuContent)
  // Let's look for getAllMenuContent or other endpoints in the file.
  const endpointKeys = ['getAllMenuContent', 'getAllReport', 'getReport', 'getFile', 'download'];
  console.log("\nSearching for endpoint keywords:");
  for (const k of endpointKeys) {
    const idx = content.indexOf(k);
    if (idx !== -1) {
      console.log(`  - Found "${k}" at index ${idx}.`);
      const start = Math.max(0, idx - 100);
      const end = Math.min(content.length, idx + 200);
      console.log(`    Snippet: ...${content.slice(start, end).replace(/\n/g, ' ')}...`);
    }
  }
}

run();
