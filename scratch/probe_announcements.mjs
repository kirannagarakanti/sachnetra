import fs from 'fs';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchNse(url, cookies = '', referer = 'https://www.nseindia.com/companies-listing/corporate-filings-announcements') {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': CHROME_UA,
      'Referer': referer,
      'Cookie': cookies,
    }
  });
  const status = resp.status;
  const contentType = resp.headers.get('content-type');
  let data = null;
  if (status === 200) {
    try {
      data = await resp.json();
    } catch (e) {
      data = await resp.text();
    }
  } else {
    data = await resp.text();
  }
  return { status, contentType, data };
}

async function nseProbe() {
  console.log('--- NSE Probe ---');
  // 1. Warm-up
  const sessionResp = await fetch('https://www.nseindia.com/', { headers: { 'User-Agent': CHROME_UA } });
  const cookies = sessionResp.headers.get('set-cookie');
  console.log(`NSE Warm-up status: ${sessionResp.status}, Cookies: ${cookies ? 'YES' : 'NO'}`);

  // 2. Base endpoint
  const url1 = 'https://www.nseindia.com/api/corporate-announcements?index=equities';
  const res1 = await fetchNse(url1, cookies);
  console.log(`Base endpoint status: ${res1.status}, Content-Type: ${res1.contentType}`);
  
  if (res1.status === 200 && Array.isArray(res1.data)) {
    console.log(`Base endpoint items count: ${res1.data.length}`);
    fs.writeFileSync('scratch/nse_announcements_sample.json', JSON.stringify(res1.data, null, 2));
    
    // Distinct category/subcategory
    const categories = new Set(res1.data.map(d => d.subject)); // subject or category? We will inspect the json.
  } else {
    console.log(`Base endpoint failed. Data (start): ${typeof res1.data === 'string' ? res1.data.slice(0, 100) : '...'}`);
  }

  // 3. Date filter endpoint
  // Using a date range in recent past
  const url2 = 'https://www.nseindia.com/api/corporate-announcements?index=equities&from_date=20-05-2026&to_date=21-05-2026';
  const res2 = await fetchNse(url2, cookies);
  console.log(`Date filter endpoint status: ${res2.status}, Items: ${Array.isArray(res2.data) ? res2.data.length : 'N/A'}`);

  // 4. Symbol filter endpoint
  const url3 = 'https://www.nseindia.com/api/corporate-announcements?index=equities&symbol=RELIANCE';
  const res3 = await fetchNse(url3, cookies);
  console.log(`Symbol filter endpoint status: ${res3.status}, Items: ${Array.isArray(res3.data) ? res3.data.length : 'N/A'}`);

  // 5. Adjacent endpoints
  const adj1 = await fetchNse('https://www.nseindia.com/api/corporate-board-meetings?index=equities', cookies);
  console.log(`Board meetings endpoint status: ${adj1.status}`);
  const adj2 = await fetchNse('https://www.nseindia.com/api/corporates-corporateActions?index=equities', cookies);
  console.log(`Corporate actions endpoint status: ${adj2.status}`);
  const adj3 = await fetchNse('https://www.nseindia.com/api/corporate-financial-results?index=equities', cookies);
  console.log(`Financial results endpoint status: ${adj3.status}`);

  // Check bare fetch (no cookies/UA)
  try {
    const bareResp = await fetch(url1);
    console.log(`Bare fetch status: ${bareResp.status}`);
  } catch (e) {
    console.log(`Bare fetch error: ${e.message}`);
  }
}

async function bseProbe() {
  console.log('\n--- BSE Probe ---');
  const url = 'https://api.bseindia.com/BseIndiaAPI/api/AnnGetData/w?strCat=&pageno=1&strPrevDate=20260520&strToDate=20260521&strScrip=';
  const resp = await fetch(url, {
    headers: {
      'User-Agent': CHROME_UA,
      'Referer': 'https://www.bseindia.com/',
      'Origin': 'https://www.bseindia.com'
    }
  });
  console.log(`BSE status: ${resp.status}`);
  if (resp.status === 200) {
    try {
      const data = await resp.json();
      console.log(`BSE Data parsed. Arrays? ${Array.isArray(data)}`);
      fs.writeFileSync('scratch/bse_announcements_sample.json', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log(`BSE Data failed to parse: ${e.message}`);
    }
  }
}

async function run() {
  await nseProbe();
  await bseProbe();
}

run();
