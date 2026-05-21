import fs from 'fs';

function main() {
  const html = fs.readFileSync('scratch/bs_view_wss.html', 'utf8');
  const lines = html.split('\n');
  
  // Print lines 920 to 1200
  const start = 920;
  const end = 1200;
  for (let i = start - 1; i < end && i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}

main();
