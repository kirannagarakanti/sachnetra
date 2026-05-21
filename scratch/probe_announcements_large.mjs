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

async function run() {
  const sessionResp = await fetch('https://www.nseindia.com/', { headers: { 'User-Agent': CHROME_UA } });
  const cookies = sessionResp.headers.get('set-cookie');

  const url2 = 'https://www.nseindia.com/api/corporate-announcements?index=equities&from_date=20-05-2026&to_date=21-05-2026';
  const res2 = await fetchNse(url2, cookies);
  
  if (res2.status === 200 && Array.isArray(res2.data)) {
    fs.writeFileSync('scratch/nse_announcements_sample_large.json', JSON.stringify(res2.data, null, 2));
    const categories = new Set(res2.data.map(d => d.desc));
    console.log('Categories:', Array.from(categories));
  }
}

run();
