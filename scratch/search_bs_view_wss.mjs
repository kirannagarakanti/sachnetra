import fs from 'fs';

function main() {
  const html = fs.readFileSync('scratch/bs_view_wss.html', 'utf8');
  
  // Find lines containing BS_viewWssExtract.aspx or similar
  const lines = html.split('\n');
  console.log(`Total lines: ${lines.length}`);
  
  console.log('--- Lines containing "BS_viewWssExtract.aspx" ---');
  lines.forEach((line, index) => {
    if (line.includes('BS_viewWssExtract.aspx')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  });

  console.log('--- HTML around table tags or other listing elements ---');
  let insideTable = false;
  let tableLines = [];
  lines.forEach((line, index) => {
    if (line.includes('<table') || line.includes('class="table"')) {
      console.log(`Table start at line ${index + 1}: ${line.trim()}`);
    }
    if (line.includes('id="table') || line.includes('id="grid') || line.includes('class="grid') || line.includes('gridview') || line.includes('GridView')) {
      console.log(`Possible GridView line ${index + 1}: ${line.trim().substring(0, 150)}`);
    }
  });
  
  // Let's print out all lines containing "BS_viewWss" (case-insensitive)
  console.log('--- Lines with BS_viewWss (case insensitive) ---');
  lines.forEach((line, index) => {
    if (/BS_viewWss/i.test(line)) {
      console.log(`${index + 1}: ${line.trim().substring(0, 150)}`);
    }
  });
}

main();
