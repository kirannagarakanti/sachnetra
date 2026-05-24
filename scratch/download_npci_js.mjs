import fs from 'fs';

async function downloadJs() {
  const url = 'https://www.npci.org.in/static/js/main.c7f75d3b.js';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    fs.writeFileSync('scratch/npci_main.js', text, 'utf8');
    console.log('Saved NPCI main JS bundle, length:', text.length);
  } catch (err) {
    console.error('Error fetching NPCI JS:', err);
  }
}

downloadJs();
