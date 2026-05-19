import fs from 'fs';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function inspectNsdlArchive() {
  try {
    const url = 'https://www.fpi.nsdl.co.in/web/Reports/Archive.aspx';
    const resp = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA }
    });
    const html = await resp.text();
    fs.writeFileSync('scratch/nsdl_archive.html', html);
    console.log(`Saved NSDL Archive.aspx HTML to scratch/nsdl_archive.html`);

    // Let's find forms, postback parameters, datepickers, or dropdowns
    const inputRegex = /<input[^>]*>/gi;
    let match;
    console.log('Inputs found:');
    while ((match = inputRegex.exec(html)) !== null) {
      const tag = match[0];
      const name = /name\s*=\s*["']([^"']*)["']/i.exec(tag);
      const val = /value\s*=\s*["']([^"']*)["']/i.exec(tag);
      if (name) {
        console.log(`  Name: ${name[1]}, Value: ${val ? val[1] : '(empty)'}`);
      }
    }
    
    // Search for select/dropdowns
    const selectRegex = /<select[^>]*>([\s\S]*?)<\/select>/gi;
    let selectIndex = 0;
    while ((match = selectRegex.exec(html)) !== null) {
      console.log(`\nSelect ${selectIndex}:`);
      const options = [];
      const optionRegex = /<option[^>]*>([\s\S]*?)<\/option>/gi;
      let optMatch;
      while ((optMatch = optionRegex.exec(match[1])) !== null) {
        options.push(optMatch[1].trim());
      }
      console.log(`  Options: ${options.slice(0, 10).join(', ')} ... total ${options.length}`);
      selectIndex++;
    }
  } catch (err) {
    console.error(err);
  }
}

inspectNsdlArchive();
