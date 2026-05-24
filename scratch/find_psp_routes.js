import fs from 'fs';

function run() {
  const content = fs.readFileSync('scratch/react_index.js', 'utf-8');
  
  // Search for Zn="Daily PSP Report" and see what other variables are defined or how Zn is used
  const target = 'Daily PSP Report';
  let pos = 0;
  console.log("Searching for 'Daily PSP Report' usages:");
  while ((pos = content.indexOf(target, pos)) !== -1) {
    console.log(`\nUsage at index ${pos}:`);
    const start = Math.max(0, pos - 200);
    const end = Math.min(content.length, pos + 400);
    console.log(content.slice(start, end).replace(/\n/g, ' '));
    pos += target.length;
  }
}

run();
