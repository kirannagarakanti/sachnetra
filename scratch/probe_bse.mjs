import fs from 'fs';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testBse() {
  const dates = ['20260520', '20260521'];
  const cats = ['', '-1'];
  const types = ['', 'C', 'P'];
  
  for (const cat of cats) {
    for (const type of types) {
      const url = `https://api.bseindia.com/BseIndiaAPI/api/AnnGetData/w?strCat=${cat}&pageno=1&strPrevDate=20260520&strToDate=20260521&strScrip=&strSearch=&strType=${type}`;
      console.log(`URL: ${url}`);
      try {
        const resp = await fetch(url, {
          headers: {
            'User-Agent': CHROME_UA,
            'Referer': 'https://www.bseindia.com/',
            'Origin': 'https://www.bseindia.com',
            'Accept': 'application/json, text/plain, */*'
          }
        });
        const text = await resp.text();
        if (text.length > 5 && text !== '{}') {
          console.log(`SUCCESS! -> ${text.slice(0, 100)}`);
          fs.writeFileSync('scratch/bse_announcements_sample.json', text);
          return;
        }
      } catch (e) {
        console.error(e.message);
      }
    }
  }
}

testBse();
