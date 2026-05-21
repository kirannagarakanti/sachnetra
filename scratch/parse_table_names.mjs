import fs from 'fs';

function main() {
  const html = fs.readFileSync('scratch/wss_detail.html', 'utf8');
  
  // Let's find all table rows <tr>...</tr> and see if they contain a link
  // WSS tables are typically represented as rows with columns.
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  let rowCount = 0;
  
  console.log('--- Extracted Rows with Wss Links ---');
  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowHtml = trMatch[1];
    if (rowHtml.includes('rdocs/Wss/')) {
      rowCount++;
      // Clean up HTML tags to extract readable text
      const cleanText = rowHtml
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Also extract the links in this row
      const links = [];
      const linkRegex = /href="([^"]+)"/gi;
      let linkMatch;
      while ((linkMatch = linkRegex.exec(rowHtml)) !== null) {
        links.push(linkMatch[1]);
      }
      
      console.log(`Row ${rowCount}:`);
      console.log(`  Text: ${cleanText}`);
      console.log(`  Links:`);
      links.forEach(link => console.log(`    - ${link}`));
    }
  }
}

main();
