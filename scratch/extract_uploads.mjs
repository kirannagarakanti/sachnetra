import fs from 'fs';

function run() {
  const html = fs.readFileSync('scratch/ihmcl_latest.html', 'utf8');
  const matches = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  const uploads = matches.filter(link => link.includes('wp-content/uploads/'));
  
  console.log('Uploads links:');
  for (const link of [...new Set(uploads)]) {
    const ext = link.split('.').pop().toLowerCase();
    console.log(`- [${ext}] ${link}`);
  }
}

run();
