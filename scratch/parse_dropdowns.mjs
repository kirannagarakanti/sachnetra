import fs from 'fs';

function main() {
  const html = fs.readFileSync('scratch/bs_view_wss.html', 'utf8');
  
  // Find <select id="ddlYear"> ... </select>
  const selectRegex = /<select[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi;
  let match;
  
  while ((match = selectRegex.exec(html)) !== null) {
    const id = match[1];
    const content = match[2];
    
    if (id === 'ddlYear' || id === 'ddlMonth') {
      console.log(`\nDropdown: ${id}`);
      const optionRegex = /<option[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/gi;
      let optMatch;
      const options = [];
      while ((optMatch = optionRegex.exec(content)) !== null) {
        options.append ? null : options.push({ value: optMatch[1], text: optMatch[2].trim() });
      }
      console.log(`Total options: ${options.length}`);
      console.log('Options list:');
      options.forEach(opt => console.log(`  Value: "${opt.value}", Text: "${opt.text}"`));
    }
  }
}

main();
