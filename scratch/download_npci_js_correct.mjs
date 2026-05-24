import fs from 'fs';

async function downloadJs() {
  const url = 'https://www.npci.org.in/static/js/main.bcb5891c.js';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.npci.org.in/product/netc/product-statistics'
  };

  try {
    console.log('Fetching JS with manual redirect check...');
    const res = await fetch(url, { headers, redirect: 'manual' });
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    if (res.status === 200) {
      const text = await res.text();
      fs.writeFileSync('scratch/npci_main_correct.js', text, 'utf8');
      console.log('Saved NPCI JS, length:', text.length);
      console.log('Snippet:', text.slice(0, 1000));
    }
  } catch (err) {
    console.error('Error fetching NPCI JS:', err);
  }
}

downloadJs();
