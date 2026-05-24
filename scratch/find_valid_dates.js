import fs from 'fs';

async function checkDate(dateStr) {
  const url = 'https://report.grid-india.in/psp_report.php';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: new URLSearchParams({ selected_date: dateStr })
    });
    if (res.status !== 200) {
      return { date: dateStr, status: res.status, files: [] };
    }
    const html = await res.text();
    // Parse links matching /ReportData/...
    const matches = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    const pspFiles = matches.filter(href => href.includes('NLDC_PSP'));
    return { date: dateStr, status: 200, files: pspFiles };
  } catch (err) {
    return { date: dateStr, status: 'error', error: err.message, files: [] };
  }
}

async function run() {
  const datesToTest = [
    // Recent 2026 dates (around current time May 24, 2026)
    '2026-05-23',
    '2026-05-22',
    '2026-05-20',
    '2026-05-15',
    '2026-05-01',
    '2026-04-15',
    '2026-04-01',
    // 2025 dates (after May 2025)
    '2025-12-15',
    '2025-10-15',
    '2025-08-15',
    '2025-06-15',
    // Known valid date
    '2025-05-15',
    '2025-05-01',
    '2025-04-15'
  ];

  console.log("Checking date availability...");
  for (const date of datesToTest) {
    const result = await checkDate(date);
    console.log(`Date: ${result.date} | Status: ${result.status} | Files Found: ${result.files.length}`);
    if (result.files.length > 0) {
      for (const f of result.files) {
        console.log(`  -> ${f}`);
      }
    }
  }
}

run();
