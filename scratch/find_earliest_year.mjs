const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function findEarliestMonth() {
  const url = 'https://www.fpi.nsdl.co.in/web/Reports/Archive.aspx';
  
  // 1. Initial GET request to get viewstate
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

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Test 1999 months
  for (const month of months) {
    const targetDate = `15-${month}-1999`;
    try {
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
      const containsTable = postHtml.includes('dvArchiveData') && postHtml.includes('Reporting Date');
      console.log(`Month ${month} 1999: ${containsTable ? 'HAS DATA' : 'NO DATA'}`);
    } catch (err) {
      console.log(`Month ${month} 1999 failed:`, err.message);
    }
  }

  // Also check 1998 Dec just in case
  try {
    const targetDate = '15-Dec-1998';
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
    const containsTable = postHtml.includes('dvArchiveData') && postHtml.includes('Reporting Date');
    console.log(`Dec 1998: ${containsTable ? 'HAS DATA' : 'NO DATA'}`);
  } catch (e) {}
}

findEarliestMonth();
