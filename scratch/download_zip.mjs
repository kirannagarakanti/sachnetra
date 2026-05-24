import fs from 'fs';

async function downloadZip() {
  const url = 'https://ihmcl.co.in/wp-content/uploads/2025/07/reuploadthevcwisemonthlyetcfastagreportonihmclwe.zip';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    console.log('Downloading ZIP:', url);
    const res = await fetch(url, { headers });
    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    console.log('Content-Length:', res.headers.get('content-length'));
    
    if (res.status === 200) {
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync('scratch/fastag_data.zip', buffer);
      console.log('Saved ZIP to scratch/fastag_data.zip');
    } else {
      console.log('Failed to download. Text:', await res.text());
    }
  } catch (err) {
    console.error('Error downloading:', err);
  }
}

downloadZip();
