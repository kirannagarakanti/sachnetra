import fs from 'fs';

function main() {
  const html = fs.readFileSync('scratch/bs_view_wss.html', 'utf8');
  
  // Extract all script contents
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptCount = 0;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    scriptCount++;
    const js = match[1];
    
    if (js.includes('IsValidSaturday') || js.includes('changeCalStyle') || js.includes('redirectPath')) {
      console.log(`\nScript Block ${scriptCount} (Length: ${js.length}):`);
      // Print first 2000 chars of this script block
      console.log(js.substring(0, 2000));
      if (js.length > 2000) {
        console.log('... [TRUNCATED]');
      }
    }
  }
}

main();
