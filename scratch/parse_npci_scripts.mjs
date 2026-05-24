import fs from 'fs';

function run() {
  const html = fs.readFileSync('scratch/npci_statistics.html', 'utf8');
  
  // Find all <script src="..."> tags
  const matches = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
  console.log('Script sources:');
  for (const src of matches) {
    console.log(src);
  }

  // Look for any links or strings that look like APIs (e.g. /api/ or similar)
  // Let's also look for inline script contents
  const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  console.log('Inline script snippets:');
  for (const script of inlineScripts) {
    console.log('--- Inline Script ---');
    console.log(script.slice(0, 1000));
  }
}

run();
