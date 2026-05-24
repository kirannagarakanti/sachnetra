import { execSync } from 'child_process';
import fs from 'fs';

function run() {
  const jsFile = 'assets/index-BZchX64p.js';
  const url = `https://grid-india.in/${jsFile}`;
  console.log(`Fetching ${url} using curl.exe...`);
  try {
    const jsContent = execSync(`curl.exe -s -k ${url}`, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 50 });
    fs.writeFileSync('scratch/react_index.js', jsContent);
    console.log(`Saved JS content of length ${jsContent.length} to scratch/react_index.js`);
    
    // Search for keywords
    const keywords = ['webapi.grid-india.in', 'webapi', 'psp', 'nldc', 'report', 'daily', 'generation'];
    console.log("Searching for keywords in JS bundle:");
    for (const kw of keywords) {
      const idx = jsContent.toLowerCase().indexOf(kw.toLowerCase());
      if (idx !== -1) {
        console.log(`  - Found keyword "${kw}" around index ${idx}.`);
        // Print surrounding characters
        const start = Math.max(0, idx - 100);
        const end = Math.min(jsContent.length, idx + 200);
        console.log(`    Snippet: ...${jsContent.slice(start, end).replace(/\n/g, ' ')}...`);
      }
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

run();
