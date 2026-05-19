import fs from 'fs';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testNsdlPost() {
  try {
    const url = 'https://www.fpi.nsdl.co.in/web/Reports/Archive.aspx';
    
    // 1. Initial GET request
    const initResp = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA }
    });
    const initHtml = await initResp.text();
    const setCookies = initResp.headers.getSetCookie();
    
    const parsedCookies = [];
    for (const cookieStr of setCookies) {
      const parts = cookieStr.split(';');
      if (parts.length > 0) {
        const nv = parts[0].trim();
        if (nv && !nv.endsWith('=')) {
          parsedCookies.push(nv);
        }
      }
    }
    const formattedCookies = parsedCookies.join('; ');

    const extractHiddenVal = (html, name) => {
      const inputRegex = /<input[^>]*>/gi;
      let m;
      while ((m = inputRegex.exec(html)) !== null) {
        const tag = m[0];
        if (new RegExp(`name\\s*=\\s*["']${name}["']`, 'i').test(tag)) {
          const valMatch = /value\s*=\s*["']([^"']*)["']/i.exec(tag);
          return valMatch ? valMatch[1] : '';
        }
      }
      return '';
    };

    const viewState = extractHiddenVal(initHtml, '__VIEWSTATE');
    const viewStateGen = extractHiddenVal(initHtml, '__VIEWSTATEGENERATOR');
    const eventValidation = extractHiddenVal(initHtml, '__EVENTVALIDATION');

    // Query 15-May-1997
    const targetDate = '15-May-1997';
    
    const bodyParams = new URLSearchParams();
    bodyParams.append('__EVENTTARGET', 'btnSubmit1');
    bodyParams.append('__EVENTARGUMENT', '');
    bodyParams.append('__VIEWSTATE', viewState);
    bodyParams.append('__VIEWSTATEGENERATOR', viewStateGen);
    bodyParams.append('__EVENTVALIDATION', eventValidation);
    bodyParams.append('txtDate', targetDate);
    bodyParams.append('hdnDate', targetDate);
    bodyParams.append('hdnFlag', '');

    const postResp = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': CHROME_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': url,
        'Origin': 'https://www.fpi.nsdl.co.in',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': formattedCookies,
      },
      body: bodyParams.toString()
    });

    const postHtml = await postResp.text();

    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let match;
    let index = 0;
    let foundTable = false;
    while ((match = tableRegex.exec(postHtml)) !== null) {
      if (index === 1) { // Main data table
        foundTable = true;
        console.log(`\nFound Table ${index} (Main Data Table) for ${targetDate}:`);
        const tableContent = match[1];
        const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let trMatch;
        let trIndex = 0;
        while ((trMatch = trRegex.exec(tableContent)) !== null && trIndex < 20) {
          const trContent = trMatch[1];
          const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
          let cellMatch;
          const cells = [];
          while ((cellMatch = cellRegex.exec(trContent)) !== null) {
            const text = cellMatch[2].replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
            cells.push(text);
          }
          if (cells.length > 0) {
            console.log(`  Row ${trIndex}: ${cells.join(' | ')}`);
          }
          trIndex++;
        }
      }
      index++;
    }
    if (!foundTable) {
      console.log(`No data table found in POST response for ${targetDate}`);
    }
  } catch (err) {
    console.error(err);
  }
}

testNsdlPost();
