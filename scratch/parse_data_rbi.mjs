import fs from 'fs';

function main() {
  const html = fs.readFileSync('scratch/data_rbi_root.html', 'utf8');
  
  // Extract all href values
  const hrefRegex = /href="([^"]+)"/g;
  let match;
  const links = [];
  while ((match = hrefRegex.exec(html)) !== null) {
    links.push(match[1]);
  }
  
  console.log(`Total links found: ${links.length}`);
  
  const filtered = links.filter(link => 
    link.toLowerCase().includes('wss') || 
    link.toLowerCase().includes('pdf') || 
    link.toLowerCase().includes('xls') || 
    link.toLowerCase().includes('csv') || 
    link.toLowerCase().includes('dbie') ||
    link.toLowerCase().includes('rbi')
  );
  
  console.log('Filtered Links:');
  const uniqueLinks = Array.from(new Set(filtered));
  for (const link of uniqueLinks) {
    console.log(link);
  }
}

main();
