import fs from 'fs';

async function main() {
  const rootUrl = 'https://rbidocs.rbi.org.in/';
  const fileUrl = 'https://rbidocs.rbi.org.in/rdocs/Wss/DOCs/WSS15052026_ENC28ED88E43084D2983CC3A42889E7128.XLSX';

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  try {
    console.log(`Step 1: Fetching root of subdomain: ${rootUrl}`);
    const res1 = await fetch(rootUrl, { headers });
    console.log(`Step 1 Status: ${res1.status} ${res1.statusText}`);
    
    // Get cookies
    const cookies = [];
    for (const [key, val] of res1.headers.entries()) {
      if (key === 'set-cookie') {
        cookies.push(val.split(';')[0]);
      }
    }
    console.log('Step 1 Cookies found:', cookies);
    
    const cookieHeader = cookies.join('; ');
    const fileHeaders = {
      ...headers,
      'Cookie': cookieHeader,
      'Referer': 'https://www.rbi.org.in/'
    };
    
    console.log(`\nStep 2: Fetching file with cookies and referrer: ${fileUrl}`);
    const res2 = await fetch(fileUrl, { headers: fileHeaders });
    console.log(`Step 2 Status: ${res2.status} ${res2.statusText}`);
    
    const buffer = await res2.arrayBuffer();
    console.log(`Step 2 Body length: ${buffer.byteLength}`);
    
    // Look at first 100 bytes of body to check if it's HTML or ZIP/XLSX
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
    console.error('Test failed:', err);
  }
}

main();
