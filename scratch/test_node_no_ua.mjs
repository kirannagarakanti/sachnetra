import fs from 'fs';

async function main() {
  const url = 'https://rbidocs.rbi.org.in/rdocs/Wss/DOCs/WSS15052026_ENC28ED88E43084D2983CC3A42889E7128.XLSX';
  console.log(`Fetching ${url} with non-browser User-Agent...`);
  
  const headers = {
    'User-Agent': 'rbi-collector/1.0.0', // Simple non-browser User-Agent
    'Accept': '*/*'
  };

  try {
    const res = await fetch(url, { headers });
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log('Headers:');
    for (const [key, val] of res.headers.entries()) {
      console.log(`  ${key}: ${val}`);
    }
    
    const buffer = await res.arrayBuffer();
    console.log(`Body length: ${buffer.byteLength}`);
    
    const snippet = Buffer.from(buffer).subarray(0, 100).toString('utf8');
    if (snippet.includes('<!DOCTYPE html>') || snippet.includes('<html>')) {
      console.log('Returned body is HTML (likely challenge page):');
      console.log(snippet);
    } else {
      console.log('Returned body is binary (likely the actual Excel file!)');
      fs.writeFileSync('scratch/rbi_wss_sample.xlsx', Buffer.from(buffer));
      console.log('Saved to scratch/rbi_wss_sample.xlsx');
    }
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

main();
