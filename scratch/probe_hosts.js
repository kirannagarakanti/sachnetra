// Node.js has global fetch


async function testUrl(url) {
  console.log(`\nTesting: ${url}`);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'manual'
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Headers:`);
    for (const [k, v] of res.headers.entries()) {
      console.log(`  ${k}: ${v}`);
    }
    if (res.status >= 300 && res.status < 400) {
      console.log(`Redirects to: ${res.headers.get('location')}`);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

async function run() {
  const urls = [
    'http://posoco.in',
    'https://posoco.in',
    'http://grid-india.in',
    'https://grid-india.in',
    'https://www.grid-india.in',
    'http://www.nldc.in',
    'https://www.nldc.in',
    'https://report.grid-india.in/psp_report.php'
  ];
  for (const url of urls) {
    await testUrl(url);
  }
}

run();
