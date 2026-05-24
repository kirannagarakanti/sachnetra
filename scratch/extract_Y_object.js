import fs from 'fs';

function run() {
  const content = fs.readFileSync('scratch/react_index.js', 'utf-8');
  const target = 'getPageMetaData:"page"';
  const pos = content.indexOf(target);
  if (pos !== -1) {
    const start = Math.max(0, pos - 150);
    const end = Math.min(content.length, pos + 500);
    console.log("Found Y object definition:");
    console.log(content.slice(start, end));
  } else {
    console.log("Could not find Y object target.");
  }
}

run();
