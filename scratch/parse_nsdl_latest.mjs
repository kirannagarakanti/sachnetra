import fs from 'fs';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function parseNsdlRegex() {
  try {
    const url = 'https://www.fpi.nsdl.co.in/web/Reports/Latest.aspx';
    const resp = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA }
    });
    const html = await resp.text();
    
    // Save raw HTML for manual inspection if needed
    fs.writeFileSync('scratch/nsdl_latest.html', html);
    console.log(`Saved NSDL Latest.aspx HTML to scratch/nsdl_latest.html`);

    // Find table tags using regex
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let match;
    let index = 0;
    while ((match = tableRegex.exec(html)) !== null) {
      const tableContent = match[1];
      const tableTag = match[0];
      const idMatch = /id\s*=\s*["']([^"']*)["']/i.exec(tableTag);
      const tableId = idMatch ? idMatch[1] : 'No ID';
      
      console.log(`\nTable ${index}: ID = ${tableId}, Content length = ${tableContent.length}`);
      
      // Print first 5 rows
      const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch;
      let trIndex = 0;
      while ((trMatch = trRegex.exec(tableContent)) !== null && trIndex < 10) {
        const trContent = trMatch[1];
        // Extract cell contents (td or th)
        const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
        let cellMatch;
        const cells = [];
        while ((cellMatch = cellRegex.exec(trContent)) !== null) {
          // Clean HTML tags inside cells
          const text = cellMatch[2].replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
          cells.push(text);
        }
        if (cells.length > 0) {
          console.log(`  Row ${trIndex}: ${cells.join(' | ')}`);
        }
        trIndex++;
      }
      index++;
    }
  } catch (err) {
    console.error(err);
  }
}

parseNsdlRegex();
