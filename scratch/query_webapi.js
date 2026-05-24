async function run() {
  const url = 'https://webapi.grid-india.in/api/v1/file/get-period';
  const body = {
    _source: 'GRDW',
    _fileType: 'F_PG00403'
  };
  
  console.log(`POSTing to ${url} with body:`, body);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(body)
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log("Response data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

run();
