async function run() {
  const p = 'Daily Report/PSP Report/2025-2026/June 2025';
  const url = `https://report.grid-india.in/index.php?p=${encodeURIComponent(p)}`;
  console.log(`Testing directory: ${url}`);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log(`Status: ${res.status}`);
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
}

run();
