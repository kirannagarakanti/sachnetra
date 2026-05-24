import fs from 'fs';

async function downloadSample() {
  const url = 'https://ihmcl.co.in/wp-content/uploads/2025/04/Monthly-ETC-Data-FY-24-25-11.pdf';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    console.log('Downloading:', url);
    const res = await fetch(url, { headers });
    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    console.log('Content-Length:', res.headers.get('content-length'));
    
    if (res.status === 200) {
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync('scratch/fastag_monthly_etc_data.pdf', buffer);
      console.log('Saved PDF to scratch/fastag_monthly_etc_data.pdf');
    } else {
      console.log('Failed to download. Text:', await res.text());
    }
  } catch (err) {
    console.error('Error downloading:', err);
  }
}

downloadSample();
