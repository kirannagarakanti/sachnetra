import fs from 'fs';

function main() {
  const html = fs.readFileSync('scratch/bs_view_wss.html', 'utf8');
  const lines = html.split('\n');
  
  console.log('--- Lines containing "redirectPath" or "selectDay" ---');
  lines.forEach((line, index) => {
    if (line.includes('redirectPath') || line.includes('selectDay')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  });
}

main();
