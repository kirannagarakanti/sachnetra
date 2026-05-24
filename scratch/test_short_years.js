async function testFolder(p) {
  const url = `https://report.grid-india.in/index.php?p=${encodeURIComponent(p)}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log(`Folder: ${p} | Status: ${res.status}`);
  } catch (err) {
    console.log(`Folder: ${p} | Error: ${err.message}`);
  }
}

async function run() {
  const paths = [
    'Daily Report/PSP Report/2025-26',
    'Daily Report/PSP Report/2026-27',
    'Daily Report/PSP Report/2026-2027',
    'Daily Report/PSP Report/2025-2026'
  ];
  for (const p of paths) {
    await testFolder(p);
  }
}

run();
