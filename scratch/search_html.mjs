import fs from 'fs';

function main() {
  const html = fs.readFileSync('scratch/wss_landing.html', 'utf8');
  
  // Find lines containing common terms
  const lines = html.split('\n');
  console.log(`Total lines: ${lines.length}`);
  
  console.log('--- Lines containing "WSS" or "Wss" or "wss" ---');
  lines.forEach((line, index) => {
    if (/wss/i.test(line)) {
      console.log(`${index + 1}: ${line.trim().substring(0, 150)}`);
    }
  });
  
  console.log('--- Lines containing "href=" or "onclick=" ---');
  let count = 0;
  lines.forEach((line, index) => {
    if ((line.includes('href=') || line.includes('onclick=')) && (/view|aspx|pdf|xls|date/i.test(line))) {
      if (count++ < 30) {
        console.log(`${index + 1}: ${line.trim().substring(0, 150)}`);
      }
    }
  });
}

main();
