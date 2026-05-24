import fs from 'fs';

function run() {
  const content = fs.readFileSync('scratch/react_index.js', 'utf-8');
  
  const keywords = ['getAllFiles', 'getAllFilePeriod', 'file/get-period'];
  for (const kw of keywords) {
    let pos = 0;
    console.log(`\nUsages of keyword: "${kw}"`);
    while ((pos = content.indexOf(kw, pos)) !== -1) {
      console.log(`  Found at index ${pos}:`);
      const start = Math.max(0, pos - 200);
      const end = Math.min(content.length, pos + 400);
      console.log(content.slice(start, end).replace(/\n/g, ' '));
      pos += kw.length;
    }
  }
}

run();
