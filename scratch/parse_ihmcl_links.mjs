import fs from 'fs';

async function parseLinks() {
  const fileContent = fs.readFileSync('scratch/ihmcl_latest.html', 'utf8');
  // Simple regex to find hrefs
  const matches = [...fileContent.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  
  console.log('Total links found:', matches.length);
  
  const reportLinks = matches.filter(link => 
    link.includes('.xlsx') || 
    link.includes('.xls') || 
    link.includes('.pdf') || 
    link.includes('.csv') || 
    link.includes('etc') ||
    link.includes('report')
  );
  
  console.log('Filtering report-related links:');
  const uniqueLinks = [...new Set(reportLinks)];
  for (const link of uniqueLinks) {
    console.log(link);
  }
}

async function run() {
  // First save the fetched HTML to scratch/ihmcl_latest.html
  const url = 'https://ihmcl.co.in/etc-transaction-reports/';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    fs.writeFileSync('scratch/ihmcl_latest.html', text, 'utf8');
    console.log('Saved HTML to scratch/ihmcl_latest.html');
    await parseLinks();
  } catch (err) {
    console.error('Error fetching/parsing:', err);
  }
}

run();
