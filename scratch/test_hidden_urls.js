async function testUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log(`URL: ${url} | Status: ${res.status}`);
  } catch (err) {
    console.log(`URL: ${url} | Error: ${err.message}`);
  }
}

async function run() {
  const urls = [
    // May 28, 2025 (next day after May 27)
    'https://report.grid-india.in/ReportData/Daily%20Report/PSP%20Report/2025-2026/May%202025/28.05.25_NLDC_PSP.xls',
    'https://report.grid-india.in/ReportData/Daily%20Report/PSP%20Report/2025-2026/May%202025/28.05.25_NLDC_PSP.pdf',
    // June 15, 2025
    'https://report.grid-india.in/ReportData/Daily%20Report/PSP%20Report/2025-2026/June%202025/15.06.25_NLDC_PSP.xls',
    'https://report.grid-india.in/ReportData/Daily%20Report/PSP%20Report/2025-2026/June%202025/15.06.25_NLDC_PSP.pdf',
    // July 15, 2025
    'https://report.grid-india.in/ReportData/Daily%20Report/PSP%20Report/2025-2026/July%202025/15.07.25_NLDC_PSP.xls',
    // April 15, 2026
    'https://report.grid-india.in/ReportData/Daily%20Report/PSP%20Report/2026-2027/April%202026/15.04.26_NLDC_PSP.xls'
  ];
  console.log("Testing candidate direct download URLs...");
  for (const url of urls) {
    await testUrl(url);
  }
}

run();
