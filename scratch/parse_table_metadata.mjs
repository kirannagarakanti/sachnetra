import fs from 'fs';

function main() {
  const html = fs.readFileSync('scratch/wss_detail.html', 'utf8');
  
  // Let's find all instances of anchors and get their surrounding text or the rows they are in.
  // A simple way is to match <tr> blocks or find 1T_..., 2T_... links and search backwards/forwards.
  const lines = html.split('\n');
  console.log(`Total lines: ${lines.length}`);
  
  // Let's print out lines that contain "rdocs/Wss" and their surrounding 5 lines.
  lines.forEach((line, index) => {
    if (line.includes('rdocs/Wss/')) {
      console.log(`\n--- Line ${index + 1} ---`);
      // Print from index-4 to index+4
      const start = Math.max(0, index - 4);
      const end = Math.min(lines.length - 1, index + 4);
      for (let i = start; i <= end; i++) {
        const marker = i === index ? '>> ' : '   ';
        console.log(`${marker}${i + 1}: ${lines[i].trim()}`);
      }
    }
  });
}

main();
