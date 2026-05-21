import fs from 'fs';

async function testUA(uaName, uaValue) {
  const url = 'https://rbidocs.rbi.org.in/rdocs/Wss/DOCs/WSS15052026_ENC28ED88E43084D2983CC3A42889E7128.XLSX';
  console.log(`\nTesting UA "${uaName}": "${uaValue || '(omitted)'}"`);
  
  const headers = {};
  if (uaValue !== undefined) {
    headers['User-Agent'] = uaValue;
  }
  
  try {
    const res = await fetch(url, { headers });
    console.log(`  Status: ${res.status} ${res.statusText}`);
    console.log(`  Content-Type: ${res.headers.get('content-type')}`);
    console.log(`  Content-Length: ${res.headers.get('content-length')}`);
    
    const buffer = await res.arrayBuffer();
    const snippet = Buffer.from(buffer).subarray(0, 100).toString('utf8');
    if (snippet.includes('<!DOCTYPE html>') || snippet.includes('<html>')) {
      console.log('  Result: BLOCKED (Returned HTML challenge page)');
    } else {
      console.log('  Result: SUCCESS! (Returned binary file)');
    }
  } catch (err) {
    console.error('  Fetch failed:', err.message);
  }
}

async function main() {
  await testUA('Python urllib', 'Python-urllib/3.13');
  await testUA('Python requests', 'python-requests/2.31.0');
  await testUA('Omitted UA', undefined);
}

main();
