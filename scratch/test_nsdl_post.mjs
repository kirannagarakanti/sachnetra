import fs from 'fs';

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testNsdlPost() {
  try {
    const url = 'https://www.fpi.nsdl.co.in/web/Reports/Archive.aspx';
    const initResp = await fetch(url, {
      headers: { 'User-Agent': CHROME_UA }
    });
    
    const setCookie = initResp.headers.get('set-cookie');
    const initHtml = await initResp.text();
    
    // Extract hidden inputs using regex that matches name/id and value in any order
    const extractHiddenVal = (html, name) => {
      // Find value="..." inside input tag containing name="..."
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

    console.log(`__VIEWSTATE size: ${viewState.length}`);
    console.log(`__VIEWSTATEGENERATOR: ${viewStateGen}`);
    console.log(`__EVENTVALIDATION size: ${eventValidation.length}`);

    const targetDate = '15-May-2026';
    
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
        'Referer': url,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': setCookie || '',
      },
      body: bodyParams.toString()
    });

    const postHtml = await postResp.text();
    fs.writeFileSync('scratch/nsdl_post_response.html', postHtml);
    console.log('Saved response to scratch/nsdl_post_response.html');
    
    // Check if there is an alert or script block or table
    console.log(`Contains 'dvArchiveData': ${postHtml.includes('dvArchiveData')}`);
    console.log(`Contains 'rpt': ${postHtml.includes('rpt')}`);
    console.log(`Contains 'alert': ${postHtml.includes('alert(')}`);
    
    // Search for script tags in postHtml
    const scripts = [];
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let sm;
    while ((sm = scriptRegex.exec(postHtml)) !== null) {
      scripts.push(sm[1].trim());
    }
    console.log(`Found ${scripts.length} scripts`);
    // Print short script bodies
    scripts.forEach((s, i) => {
      if (s.length < 500 && s.length > 0) {
        console.log(`Script ${i}: ${s}`);
      }
    });

  } catch (err) {
    console.error(err);
  }
}

testNsdlPost();
