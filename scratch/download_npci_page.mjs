import fs from 'fs';

async function downloadNpci() {
  const url = 'https://www.npci.org.in/product/netc/product-statistics';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    const res = await fetch(url, { headers });
    const html = await res.text();
    fs.writeFileSync('scratch/npci_statistics.html', html, 'utf8');
    console.log('Saved NPCI stats page HTML to scratch/npci_statistics.html');
  } catch (err) {
    console.error('Error fetching NPCI:', err);
  }
}

downloadNpci();
